"""
Refund and Dispute Flow Views
Handles buyer-initiated refunds, vendor decisions, disputes, and admin resolution
"""
import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from orders.models import Order, OrderDispute
from payments.models import RefundRequest, EscrowPayment
from shared.models import Notification, UserWallet, WalletTransaction, UserActivity
from shared.utils import log_user_activity
from shared.admin_notifications import send_admin_notification

logger = logging.getLogger(__name__)

# Vendor decision window: 48 hours
VENDOR_DECISION_DEADLINE_HOURS = 48
# Vendor refund deadline after admin decision: 7 days
VENDOR_REFUND_DEADLINE_DAYS = 7


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buyer_request_refund(request):
    """
    Buyer initiates a refund request
    - Creates refund request with status 'pending_vendor'
    - Sets vendor decision deadline (48 hours)
    - Notifies vendor and admin in real-time
    """
    try:
        order_id = request.data.get('order_id')
        refund_type = request.data.get('refund_type', 'full')
        amount = request.data.get('amount')
        reason = request.data.get('reason')
        notes = request.data.get('notes', '')
        
        # Validation
        if not order_id or not reason:
            return Response({
                'success': False,
                'message': 'order_id and reason are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get order
        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({
                'success': False,
                'message': f'Order {order_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify buyer ownership
        if order.buyer != request.user:
            return Response({
                'success': False,
                'message': 'You can only request refunds for your own orders'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if order is eligible for refund
        if order.order_status not in ['paid', 'delivered', 'confirmed', 'processing']:
            return Response({
                'success': False,
                'message': f'Cannot refund orders with status: {order.order_status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if refund already exists
        if hasattr(order, 'refund_request'):
            existing_refund = order.refund_request
            if existing_refund.status in ['pending_vendor', 'pending_admin', 'vendor_approved', 'disputed']:
                return Response({
                    'success': False,
                    'message': f'A refund request already exists for this order (Status: {existing_refund.get_status_display()})'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate refund type and amount
        if refund_type == 'partial':
            if not amount:
                return Response({
                    'success': False,
                    'message': 'Amount is required for partial refunds'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                refund_amount = Decimal(str(amount))
                order_amount = Decimal(str(order.total_amount))
                
                if refund_amount <= 0 or refund_amount > order_amount:
                    return Response({
                        'success': False,
                        'message': f'Refund amount must be between 0 and {order_amount}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({
                    'success': False,
                    'message': 'Invalid amount format'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            refund_amount = Decimal(str(order.total_amount))
        
        # Create refund request
        with transaction.atomic():
            refund = RefundRequest.objects.create(
                order=order,
                buyer=request.user,
                vendor=order.vendor,
                amount=refund_amount,
                refund_type=refund_type,
                reason=reason,
                notes=notes,
                status='pending_vendor',
                vendor_decision_deadline=timezone.now() + timedelta(hours=VENDOR_DECISION_DEADLINE_HOURS)
            )
            
            # Log activity
            log_user_activity(
                user=request.user,
                activity_type='refund_requested',
                description=f'Requested {refund_type} refund for order {order.order_id}',
                metadata={
                    'order_id': order.order_id,
                    'refund_id': str(refund.id),
                    'amount': str(refund_amount),
                    'refund_type': refund_type
                }
            )
            
            # Notify vendor (real-time)
            Notification.objects.create(
                user=order.vendor,
                type='refund',
                title='New Refund Request',
                message=f'Buyer {request.user.username} requested a {refund_type} refund for order {order.order_id}',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'buyer_username': request.user.username,
                    'amount': str(refund_amount),
                    'reason': reason,
                    'action_url': '/vendor/orders'
                }
            )
            
            # Send real-time notification to vendor
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f'realtime_{order.vendor.id}',
                        {
                            'type': 'order_notification',
                            'data': {
                                'type': 'refund_request',
                                'title': 'New Refund Request',
                                'message': f'Buyer {request.user.username} requested a {refund_type} refund for order {order.order_id}',
                                'refund_id': str(refund.id),
                                'order_id': order.order_id,
                                'priority': 'high',
                                'action_url': '/vendor/orders'
                            }
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending real-time notification to vendor: {e}")
            
            # Notify admin (real-time)
            send_admin_notification(
                notification_type='refund',
                title='New Refund Request',
                message=f'Buyer {request.user.username} requested a {refund_type} refund for order {order.order_id} from vendor {order.vendor.username}',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'buyer_username': request.user.username,
                    'vendor_username': order.vendor.username,
                    'amount': str(refund_amount),
                    'action_url': '/admin/refunds'
                },
                priority='normal'
            )
        
        return Response({
            'success': True,
            'message': 'Refund request submitted successfully',
            'refund': {
                'id': str(refund.id),
                'order_id': order.order_id,
                'amount': str(refund.amount),
                'refund_type': refund.refund_type,
                'status': refund.status,
                'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                'created_at': refund.created_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        logger.error(f"Buyer refund request error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_refund_requests(request):
    """Get buyer's refund requests"""
    try:
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))
        status_filter = request.query_params.get('status', None)
        
        refunds = RefundRequest.objects.filter(buyer=request.user).order_by('-created_at')
        
        if status_filter:
            refunds = refunds.filter(status=status_filter)
        
        total = refunds.count()
        start = (page - 1) * limit
        end = start + limit
        refunds_page = refunds[start:end]
        
        data = []
        for refund in refunds_page:
            data.append({
                'id': str(refund.id),
                'order_id': refund.order.order_id,
                'vendor': refund.vendor.username,
                'amount': str(refund.amount),
                'crypto_currency': refund.order.crypto_currency,
                'reason': refund.reason,
                'refund_type': refund.refund_type,
                'status': refund.status,
                'vendor_decision': refund.vendor_decision,
                'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                'created_at': refund.created_at.isoformat(),
                'updated_at': refund.updated_at.isoformat(),
            })
        
        return Response({
            'success': True,
            'data': data,
            'total': total,
            'page': page,
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"Get buyer refunds error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': [],
            'total': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_approve_refund(request, refund_id):
    """
    Vendor approves refund request
    - Status changes to 'vendor_approved'
    - Process refund to buyer's wallet (escrow or non-escrow)
    - Notify buyer and admin
    """
    try:
        try:
            refund = RefundRequest.objects.get(id=refund_id)
        except RefundRequest.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Refund request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify vendor ownership
        if refund.vendor != request.user:
            return Response({
                'success': False,
                'message': 'You can only approve refunds for your own orders'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check status
        if refund.status != 'pending_vendor':
            return Response({
                'success': False,
                'message': f'Refund request is not pending vendor approval. Current status: {refund.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order = refund.order
        notes = request.data.get('notes', '')
        payment_source = request.data.get('payment_source', 'platform')
        transaction_hash = request.data.get('transaction_hash', '').strip()
        external_wallet_address = request.data.get('external_wallet_address', '').strip()

        if payment_source not in ['platform', 'external']:
            return Response({
                'success': False,
                'message': 'Invalid payment source. Choose "platform" or "external".'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if payment_source == 'external':
            if not transaction_hash:
                return Response({
                    'success': False,
                    'message': 'Transaction hash is required when using external wallet.'
                }, status=status.HTTP_400_BAD_REQUEST)
            if not external_wallet_address:
                return Response({
                    'success': False,
                    'message': 'Please provide the wallet address used for the external refund.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Update refund status
            refund.status = 'vendor_approved'
            refund.vendor_decision = 'approved'
            refund.vendor_decision_at = timezone.now()
            refund.vendor_decision_notes = notes
            refund.vendor_payment_source = payment_source
            refund.vendor_external_wallet_address = external_wallet_address or None
            if transaction_hash:
                refund.vendor_refund_transaction_hash = transaction_hash
            refund.save()
            
            # Process refund to buyer's wallet
            refund_processed = process_refund_to_wallet(refund, order)
            
            if refund_processed:
                refund.status = 'completed'
                refund.completed_at = timezone.now()
                refund.save()
                
                # Log activity
                log_user_activity(
                    user=request.user,
                    activity_type='refund_approved',
                    description=f'Approved refund for order {order.order_id}',
                    metadata={
                        'order_id': order.order_id,
                        'refund_id': str(refund.id),
                        'amount': str(refund.amount)
                    }
                )
                
                # Notify buyer
                Notification.objects.create(
                    user=refund.buyer,
                    type='refund',
                    title='Refund Approved',
                    message=f'Your refund request for order {order.order_id} has been approved by the vendor. Amount credited to your wallet.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'amount': str(refund.amount),
                        'action_url': '/buyer/orders'
                    }
                )
                
                # Real-time notification to buyer
                channel_layer = get_channel_layer()
                if channel_layer:
                    try:
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{refund.buyer.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'type': 'refund_approved',
                                    'title': 'Refund Approved',
                                    'message': f'Your refund for order {order.order_id} has been approved. Amount credited to wallet.',
                                    'refund_id': str(refund.id),
                                    'order_id': order.order_id,
                                    'priority': 'normal',
                                    'action_url': '/buyer/orders'
                                }
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error sending real-time notification to buyer: {e}")
                
                # Notify admin
                send_admin_notification(
                    notification_type='refund',
                    title='Refund Approved by Vendor',
                    message=f'Vendor {request.user.username} approved refund for order {order.order_id}',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'action_url': '/admin/refunds'
                    },
                    priority='normal'
                )
                
                return Response({
                    'success': True,
                    'message': 'Refund approved and processed successfully',
                    'refund': {
                        'id': str(refund.id),
                        'status': refund.status,
                        'amount': str(refund.amount)
                    }
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to process refund to wallet'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.error(f"Vendor approve refund error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_reject_refund(request, refund_id):
    """
    Vendor rejects refund request
    - Status changes to 'vendor_rejected'
    - Buyer can now open a dispute
    - Notify buyer and admin
    """
    try:
        try:
            refund = RefundRequest.objects.get(id=refund_id)
        except RefundRequest.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Refund request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify vendor ownership
        if refund.vendor != request.user:
            return Response({
                'success': False,
                'message': 'You can only reject refunds for your own orders'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check status
        if refund.status != 'pending_vendor':
            return Response({
                'success': False,
                'message': f'Refund request is not pending vendor approval. Current status: {refund.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order = refund.order
        rejection_reason = request.data.get('rejection_reason', '')
        
        with transaction.atomic():
            # Update refund status
            refund.status = 'vendor_rejected'
            refund.vendor_decision = 'rejected'
            refund.vendor_decision_at = timezone.now()
            refund.vendor_decision_notes = rejection_reason
            refund.rejection_reason = rejection_reason
            refund.save()
            
            # Log activity
            log_user_activity(
                user=request.user,
                activity_type='refund_rejected',
                description=f'Rejected refund for order {order.order_id}',
                metadata={
                    'order_id': order.order_id,
                    'refund_id': str(refund.id),
                    'rejection_reason': rejection_reason
                }
            )
            
            # Notify buyer
            Notification.objects.create(
                user=refund.buyer,
                type='refund',
                title='Refund Request Rejected',
                message=f'Your refund request for order {order.order_id} has been rejected by the vendor. You can open a dispute if needed.',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'rejection_reason': rejection_reason,
                    'action_url': '/buyer/orders'
                }
            )
            
            # Real-time notification to buyer
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f'realtime_{refund.buyer.id}',
                        {
                            'type': 'order_notification',
                            'data': {
                                'type': 'refund_rejected',
                                'title': 'Refund Request Rejected',
                                'message': f'Your refund for order {order.order_id} was rejected. You can open a dispute.',
                                'refund_id': str(refund.id),
                                'order_id': order.order_id,
                                'priority': 'normal',
                                'action_url': '/buyer/orders'
                            }
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending real-time notification to buyer: {e}")
            
            # Notify admin
            send_admin_notification(
                notification_type='refund',
                title='Refund Rejected by Vendor',
                message=f'Vendor {request.user.username} rejected refund for order {order.order_id}',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'action_url': '/admin/refunds'
                },
                priority='normal'
            )
        
        return Response({
            'success': True,
            'message': 'Refund request rejected',
            'refund': {
                'id': str(refund.id),
                'status': refund.status
            }
        })
    
    except Exception as e:
        logger.error(f"Vendor reject refund error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_refund_requests(request):
    """Get vendor's refund requests"""
    try:
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))
        status_filter = request.query_params.get('status', None)
        
        refunds = RefundRequest.objects.filter(vendor=request.user).order_by('-created_at')
        
        if status_filter:
            refunds = refunds.filter(status=status_filter)
        
        total = refunds.count()
        start = (page - 1) * limit
        end = start + limit
        refunds_page = refunds[start:end]
        
        data = []
        for refund in refunds_page:
            data.append({
                'id': str(refund.id),
                'order_id': refund.order.order_id,
                'buyer': refund.buyer.username,
                'buyer_btc_payout_address': getattr(refund.buyer, 'btc_payout_address', None),
                'buyer_xmr_payout_address': getattr(refund.buyer, 'xmr_payout_address', None),
                'amount': str(refund.amount),
                'crypto_currency': refund.order.crypto_currency,
                'reason': refund.reason,
                'refund_type': refund.refund_type,
                'status': refund.status,
                'vendor_decision': refund.vendor_decision,
                'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                'vendor_refund_required': refund.vendor_refund_required,
                'vendor_refund_deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
                'vendor_payment_source': refund.vendor_payment_source,
                'vendor_refund_transaction_hash': refund.vendor_refund_transaction_hash,
                'vendor_external_wallet_address': refund.vendor_external_wallet_address,
                'created_at': refund.created_at.isoformat(),
                'updated_at': refund.updated_at.isoformat(),
            })
        
        return Response({
            'success': True,
            'data': data,
            'total': total,
            'page': page,
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"Get vendor refunds error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': [],
            'total': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_pending_refunds(request):
    """Get vendor's pending refunds that require action"""
    try:
        # Refunds requiring vendor decision
        pending_decision = RefundRequest.objects.filter(
            vendor=request.user,
            status='pending_vendor'
        ).order_by('vendor_decision_deadline')
        
        # Refunds requiring vendor to process (after admin decision)
        pending_refund = RefundRequest.objects.filter(
            vendor=request.user,
            vendor_refund_required=True,
            vendor_refund_completed=False
        ).order_by('vendor_refund_deadline')
        
        data = {
            'pending_decision': [],
            'pending_refund': []
        }
        
        for refund in pending_decision:
            data['pending_decision'].append({
                'id': str(refund.id),
                'order_id': refund.order.order_id,
                'buyer': refund.buyer.username,
                'buyer_btc_payout_address': getattr(refund.buyer, 'btc_payout_address', None),
                'buyer_xmr_payout_address': getattr(refund.buyer, 'xmr_payout_address', None),
                'amount': str(refund.amount),
                'reason': refund.reason,
                'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                'is_overdue': refund.is_vendor_decision_overdue
            })
        
        for refund in pending_refund:
            data['pending_refund'].append({
                'id': str(refund.id),
                'order_id': refund.order.order_id,
                'buyer': refund.buyer.username,
                'buyer_btc_payout_address': getattr(refund.buyer, 'btc_payout_address', None),
                'buyer_xmr_payout_address': getattr(refund.buyer, 'xmr_payout_address', None),
                'amount': str(refund.amount),
                'vendor_refund_deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
                'is_overdue': refund.is_vendor_refund_overdue
            })
        
        return Response({
            'success': True,
            'data': data
        })
    
    except Exception as e:
        logger.error(f"Get vendor pending refunds error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': {'pending_decision': [], 'pending_refund': []}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def process_refund_to_wallet(refund, order):
    """
    Process refund to buyer's wallet
    Handles both escrow and non-escrow orders
    """
    try:
        # Get or create buyer wallet
        wallet, created = UserWallet.objects.get_or_create(user=refund.buyer)
        
        # Determine refund amount
        refund_amount = refund.amount
        currency = order.crypto_currency
        
        # For escrow orders: Release from escrow
        if order.use_escrow:
            try:
                from payments.models import PaymentAddress
                payment_address = PaymentAddress.objects.get(order_id=order.order_id)
                if hasattr(payment_address, 'escrow'):
                    escrow = payment_address.escrow
                    if escrow.status == 'funded':
                        # Mark escrow as refunded
                        escrow.status = 'refunded'
                        escrow.save()
                        
                        # Credit buyer wallet
                        wallet.credit(refund_amount, currency)
                        
                        # Create wallet transaction
                        WalletTransaction.objects.create(
                            wallet=wallet,
                            transaction_type='refund',
                            amount=refund_amount,
                            crypto_currency=currency,
                            order=order,
                            refund_request=refund,
                            notes=f'Refund from escrow for order {order.order_id}'
                        )
                        
                        logger.info(f"Refund processed from escrow: {refund_amount} {currency} to buyer {refund.buyer.username}")
                        return True
            except Exception as e:
                logger.error(f"Error processing escrow refund: {e}")
                return False
        
        # For non-escrow orders: Credit wallet directly
        # (Vendor has already received payment, so we credit from platform funds)
        wallet.credit(refund_amount, currency)
        
        # Create wallet transaction
        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type='refund',
            amount=refund_amount,
            crypto_currency=currency,
            order=order,
            refund_request=refund,
            notes=f'Refund for order {order.order_id}'
        )
        
        logger.info(f"Refund processed to wallet: {refund_amount} {currency} to buyer {refund.buyer.username}")
        return True
    
    except Exception as e:
        logger.error(f"Error processing refund to wallet: {e}")
        return False


