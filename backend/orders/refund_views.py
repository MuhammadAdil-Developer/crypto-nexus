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
from shared.models import Notification, UserActivity
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
        
        # Check if refund already exists (using filter instead of hasattr)
        existing_refund = RefundRequest.objects.filter(
            order=order,
            buyer=request.user
        ).exclude(status__in=['vendor_rejected', 'admin_rejected', 'completed']).first()
        
        if existing_refund:
            if existing_refund.status in ['pending_vendor', 'pending_admin', 'disputed']:
                return Response({
                    'success': False,
                    'message': 'You already have a pending refund request for this order. Please wait until the vendor approves it or open a dispute if the estimated time is up.'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif existing_refund.status == 'vendor_approved':
                return Response({
                    'success': False,
                    'message': 'A refund request for this order has already been approved.'
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
            
            # Notify vendor via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=order.vendor,
                notification_type='refund',
                title='New Refund Request',
                message=f'Buyer {request.user.username} requested a {refund_type} refund for order {order.order_id}',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'buyer_username': request.user.username,
                    'amount': str(refund_amount),
                    'reason': reason,
                    'action_url': '/vendor/orders'
                },
                priority='high'
            )
            
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
        
        refunds = RefundRequest.objects.select_related('order', 'buyer', 'vendor').filter(buyer=request.user).order_by('-created_at')
        
        if status_filter:
            refunds = refunds.filter(status=status_filter)
        
        total = refunds.count()
        start = (page - 1) * limit
        end = start + limit
        refunds_page = refunds[start:end]
        
        data = []
        for refund in refunds_page:
            try:
                # Ensure order exists before accessing
                if not refund.order:
                    continue
                    
                data.append({
                    'id': str(refund.id),
                    'order_id': refund.order.order_id,
                    'order_pk': str(refund.order.id),
                    'vendor': refund.vendor.username,
                    'amount': str(refund.amount),
                    'crypto_currency': refund.order.crypto_currency,
                    'reason': refund.reason,
                    'refund_type': refund.refund_type,
                    'status': refund.status,
                    'vendor_decision': refund.vendor_decision,
                    'vendor_decision_notes': refund.vendor_decision_notes,
                    'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                    'vendor_refund_required': refund.vendor_refund_required,
                    'vendor_refund_deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
                    'vendor_refund_completed': refund.vendor_refund_completed,
                    'created_at': refund.created_at.isoformat(),
                    'updated_at': refund.updated_at.isoformat(),
                })
            except Order.DoesNotExist:
                logger.warning(f"RefundRequest {refund.id} refers to a non-existent order.")
                continue
            except AttributeError as e:
                logger.warning(f"Missing attributes for RefundRequest {refund.id}: {str(e)}")
                continue
        
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
        refund_now = request.data.get('refund_now', False)  # Check if vendor wants automatic refund

        if payment_source not in ['platform', 'external']:
            return Response({
                'success': False,
                'message': 'Invalid payment source. Choose "platform" or "external".'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Determine if this is an escrow order where funds are still held by the platform
        escrow_payment = None
        escrow_funded = False
        if order.use_escrow:
            try:
                from payments.models import PaymentAddress
                payment_address = PaymentAddress.objects.get(order_id=order.order_id)
                if hasattr(payment_address, 'escrow'):
                    escrow_payment = payment_address.escrow
                    escrow_funded = escrow_payment.status == 'funded'
                    
                    # Check if payment is still pending confirmation
                    if escrow_payment.status == 'created':
                        return Response({
                            'success': False,
                            'message': 'The payment for this order is pending blockchain confirmation. Please wait for the transaction to be confirmed before proceeding.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                        
            except Exception as e:
                logger.error(f"Error loading escrow payment for refund: {e}")

        # --- CASE 1: Escrow still held by platform (admin wallet sends refund) ---
        # Process automatic refund if refund_now is true OR if escrow is funded
        if (order.use_escrow and refund_now) or escrow_funded:
            # In this case the vendor is NOT sending coins. Platform (admin) sends refund from escrow.
            # Force payment_source to platform and ignore vendor wallet fields.
            
            # If refund_now is true but escrow_payment is None or not funded, try to get it
            if refund_now and (not escrow_payment or not escrow_funded):
                try:
                    from payments.models import PaymentAddress
                    payment_address = PaymentAddress.objects.get(order_id=order.order_id)
                    if hasattr(payment_address, 'escrow'):
                        escrow_payment = payment_address.escrow
                        escrow_funded = escrow_payment.status == 'funded'
                except Exception as e:
                    logger.error(f"Error loading escrow payment for refund_now: {e}")
            
            if order.crypto_currency == 'BTC':
                buyer_payout_address = getattr(refund.buyer, 'btc_payout_address', None)
            elif order.crypto_currency == 'XMR':
                buyer_payout_address = getattr(refund.buyer, 'xmr_payout_address', None)
            else:
                buyer_payout_address = None

            if not buyer_payout_address:
                return Response({
                    'success': False,
                    'message': f'Buyer has not set a {order.crypto_currency} payout address. Please ask buyer to set their payout address in settings.'
                }, status=status.HTTP_400_BAD_REQUEST)

            from payments.services import PaymentService

            with transaction.atomic():
                try:
                    payment_service = PaymentService()
                    # Refund full escrow amount + escrow fee (buyer gets everything back)
                    # If escrow_payment exists, use it; otherwise calculate from order
                    if escrow_payment and escrow_funded:
                        total_refund_amount = escrow_payment.escrow_amount + escrow_payment.escrow_fee
                    else:
                        # Fallback: use refund amount from the refund request
                        total_refund_amount = refund.amount
                    real_tx_hash = None

                    if order.crypto_currency == 'BTC':
                        payout_result = payment_service.btcpay.create_payout({
                            'destination': buyer_payout_address,
                            'amount': str(total_refund_amount),
                        })
                        if not payout_result or not payout_result.get('transactionHash'):
                            logger.error(f"Failed to send REAL BTC escrow refund: {payout_result}")
                            return Response({
                                'success': False,
                                'message': 'Failed to send escrow refund from platform BTC wallet (insufficient funds or network error).'
                            }, status=status.HTTP_400_BAD_REQUEST)
                        real_tx_hash = payout_result.get('transactionHash')
                    elif order.crypto_currency == 'XMR':
                        # Convert to atomic units (pico-monero)
                        amount_atomic = int(float(total_refund_amount) * 1e12)
                        destinations = [{
                            'address': buyer_payout_address,
                            'amount': amount_atomic,
                        }]
                        monero_result = payment_service.monero.send_transaction(destinations)
                        if not monero_result or not monero_result.get('tx_hash'):
                            logger.error(f"Failed to send REAL XMR escrow refund: {monero_result}")
                            return Response({
                                'success': False,
                                'message': 'Failed to send escrow refund from platform XMR wallet (insufficient funds or network error).'
                            }, status=status.HTTP_400_BAD_REQUEST)
                        real_tx_hash = monero_result.get('tx_hash')

                    # Mark escrow as refunded (if escrow_payment exists)
                    if escrow_payment:
                        escrow_payment.status = 'refunded'
                        escrow_payment.released_at = timezone.now()
                        escrow_payment.release_transaction_hash = real_tx_hash
                        escrow_payment.save()

                    # Mark refund/order as completed
                    refund.status = 'completed'
                    refund.vendor_decision = 'approved'
                    refund.vendor_decision_at = timezone.now()
                    refund.vendor_decision_notes = notes
                    refund.vendor_payment_source = 'platform'
                    refund.vendor_refund_transaction_hash = real_tx_hash
                    refund.completed_at = timezone.now()
                    refund.save()

                    order.order_status = 'refunded'
                    order.save()

                    # Log activity
                    log_user_activity(
                        user=request.user,
                        activity_type='refund_approved',
                        description=f'Approved escrow refund for order {order.order_id}',
                        metadata={
                            'order_id': order.order_id,
                            'refund_id': str(refund.id),
                            'amount': str(refund.amount),
                            'transaction_hash': real_tx_hash
                        }
                    )
                    
                    # Notify buyer via central helper (respects preferences)
                    from shared.admin_notifications import send_user_notification
                    send_user_notification(
                        user=refund.buyer,
                        notification_type='refund',
                        title='Refund Approved',
                        message=f'Your refund request for order {order.order_id} has been approved. {refund.amount} {order.crypto_currency} has been sent to your wallet.',
                        data={
                            'order_id': order.order_id,
                            'refund_id': str(refund.id),
                            'amount': str(refund.amount),
                            'action_url': '/buyer/orders'
                        }
                    )
                    
                    # Return success response - escrow refund processed
                    return Response({
                        'success': True,
                        'message': f'Escrow refund processed successfully. {refund.amount} {order.crypto_currency} sent to buyer\'s wallet.',
                        'data': {
                            'refund_id': str(refund.id),
                            'order_id': order.order_id,
                            'amount': str(refund.amount),
                            'transaction_hash': real_tx_hash
                        }
                    })

                except Exception as e:
                    logger.error(f"Error processing escrow refund payout: {e}")
                    return Response({
                        'success': False,
                        'message': 'Failed to process escrow refund from platform wallet. Please try again later.'
                    }, status=status.HTTP_400_BAD_REQUEST)

        # --- CASE 2: Non-escrow or escrow already released (vendor sends refund from their wallet) ---
        else:
            # Get buyer's payout address
            if order.crypto_currency == 'BTC':
                buyer_payout_address = getattr(refund.buyer, 'btc_payout_address', None)
            elif order.crypto_currency == 'XMR':
                buyer_payout_address = getattr(refund.buyer, 'xmr_payout_address', None)
            else:
                buyer_payout_address = None

            if not buyer_payout_address:
                return Response({
                    'success': False,
                    'message': f'Buyer has not set a {order.crypto_currency} payout address. Please ask buyer to set their payout address in settings.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get vendor's wallet address from VendorApplication
            from vendors.models import VendorApplication
            try:
                vendor_app = VendorApplication.objects.get(vendor_username=refund.vendor.username)
                if order.crypto_currency == 'BTC':
                    vendor_wallet_address = vendor_app.btc_address
                elif order.crypto_currency == 'XMR':
                    vendor_wallet_address = vendor_app.xmr_address
                else:
                    vendor_wallet_address = None

                if not vendor_wallet_address:
                    return Response({
                        'success': False,
                        'message': f'Vendor has not set a {order.crypto_currency} wallet address in their application. Please contact admin.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except VendorApplication.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Vendor application not found. Please contact admin.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # For external wallet: vendor must send manually FROM external address TO buyer
            if payment_source == 'external':
                if not external_wallet_address:
                    return Response({
                        'success': False,
                        'message': 'Please provide the external wallet address you will use for the refund.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if not transaction_hash:
                    return Response({
                        'success': False,
                        'message': f'Transaction hash is required. Please send {refund.amount} {order.crypto_currency} manually from your external wallet address ({external_wallet_address}) to buyer\'s address ({buyer_payout_address}) and provide the transaction hash here.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Vendor sent manually from external wallet - record the tx hash
                with transaction.atomic():
                    refund.status = 'completed'
                    refund.vendor_decision = 'approved'
                    refund.vendor_decision_at = timezone.now()
                    refund.vendor_decision_notes = notes
                    refund.vendor_payment_source = 'external'
                    refund.vendor_external_wallet_address = external_wallet_address
                    refund.vendor_refund_transaction_hash = transaction_hash
                    refund.completed_at = timezone.now()
                    refund.save()

                    order.order_status = 'refunded'
                    order.save()

            # For platform wallet (vendor's payout wallet address): vendor must send manually FROM their wallet TO buyer
            else:  # payment_source == 'platform'
                # Vendor must send manually from their payout wallet address (from VendorApplication)
                # We cannot send from vendor's wallet because we don't control it
                if not transaction_hash:
                    return Response({
                        'success': False,
                        'message': f'Transaction hash is required. Please send {refund.amount} {order.crypto_currency} manually from your payout wallet address ({vendor_wallet_address}) to buyer\'s address ({buyer_payout_address}) and provide the transaction hash here.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Vendor sent manually from their payout wallet address - record the tx hash
                with transaction.atomic():
                    refund.status = 'completed'
                    refund.vendor_decision = 'approved'
                    refund.vendor_decision_at = timezone.now()
                    refund.vendor_decision_notes = notes
                    refund.vendor_payment_source = 'platform'
                    refund.vendor_external_wallet_address = vendor_wallet_address  # Store vendor's payout wallet address
                    refund.vendor_refund_transaction_hash = transaction_hash
                    refund.completed_at = timezone.now()
                    refund.save()

                    order.order_status = 'refunded'
                    order.save()
        
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
        
        # Notify buyer via central helper (respects preferences)
        from shared.admin_notifications import send_user_notification
        send_user_notification(
            user=refund.buyer,
            notification_type='refund',
            title='Refund Approved',
            message=f'Your refund request for order {order.order_id} has been approved by the vendor. The refund has been sent to your payout wallet.',
            data={
                'refund_id': str(refund.id),
                'order_id': order.order_id,
                'amount': str(refund.amount),
                'action_url': '/buyer/orders'
            }
        )
        
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
            
            # Notify buyer via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=refund.buyer,
                notification_type='refund',
                title='Refund Request Rejected',
                message=f'Your refund request for order {order.order_id} has been rejected by the vendor. You can open a dispute if needed.',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'rejection_reason': rejection_reason,
                    'action_url': '/buyer/orders'
                }
            )
            
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
        
        refunds = RefundRequest.objects.select_related('order', 'buyer', 'vendor', 'order__product').filter(vendor=request.user).order_by('-created_at')
        
        if status_filter:
            refunds = refunds.filter(status=status_filter)
        
        total = refunds.count()
        start = (page - 1) * limit
        end = start + limit
        refunds_page = refunds[start:end]
        
        data = []
        for refund in refunds_page:
            try:
                # Get order details for product and buyer IDs
                order = refund.order
                if not order:
                    continue
                    
                product_id = str(order.product.id) if order.product else None
                buyer_id = str(order.buyer.id) if order.buyer else None
                
                data.append({
                    'id': str(refund.id),
                    'order_id': order.order_id,
                    'buyer': refund.buyer.username,
                    'buyer_id': buyer_id,
                    'product_id': product_id,
                    'buyer_btc_payout_address': getattr(refund.buyer, 'btc_payout_address', None),
                    'buyer_xmr_payout_address': getattr(refund.buyer, 'xmr_payout_address', None),
                    'amount': str(refund.amount),
                    'crypto_currency': order.crypto_currency,
                    'reason': refund.reason,
                    'refund_type': refund.refund_type,
                    'status': refund.status,
                    'use_escrow': order.use_escrow,  # Add escrow status
                    'vendor_decision': refund.vendor_decision,
                    'vendor_decision_notes': refund.vendor_decision_notes,
                    'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                    'vendor_refund_required': refund.vendor_refund_required,
                    'vendor_refund_deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
                    'vendor_payment_source': refund.vendor_payment_source,
                    'vendor_refund_transaction_hash': refund.vendor_refund_transaction_hash,
                    'vendor_external_wallet_address': refund.vendor_external_wallet_address,
                    'created_at': refund.created_at.isoformat(),
                    'updated_at': refund.updated_at.isoformat(),
                })
            except (Order.DoesNotExist, AttributeError):
                continue
        
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


def process_refund_to_wallet(refund, order, payment_source='platform', buyer_payout_address=None, transaction_hash=None):
    """
    Process a REFUND that is paid by the platform wallet directly to the buyer's
    external blockchain wallet (no internal wallet is used).

    This helper is currently used for:
    - Admin partial refunds from dispute resolution (platform pays from its own wallet)
    """
    try:
        from payments.services import PaymentService

        refund_amount = refund.amount
        currency = order.crypto_currency

        # Determine buyer payout address if not provided
        if not buyer_payout_address:
            if currency == 'BTC':
                buyer_payout_address = getattr(refund.buyer, 'btc_payout_address', None)
            elif currency == 'XMR':
                buyer_payout_address = getattr(refund.buyer, 'xmr_payout_address', None)

        if not buyer_payout_address:
            logger.error(f"Buyer {refund.buyer.username} has no {currency} payout address set. Cannot send real refund.")
            return False

        payment_service = PaymentService()
        real_tx_hash = None

        if currency == 'BTC':
            payout_result = payment_service.btcpay.create_payout({
                'destination': buyer_payout_address,
                'amount': str(refund_amount),
            })
            if not payout_result or not payout_result.get('transactionHash'):
                logger.error(f"Failed to send REAL BTC refund: {payout_result}")
                return False
            real_tx_hash = payout_result.get('transactionHash')
        elif currency == 'XMR':
            # Convert to atomic units (pico-monero)
            amount_atomic = int(float(refund_amount) * 1e12)
            destinations = [{
                'address': buyer_payout_address,
                'amount': amount_atomic,
            }]
            monero_result = payment_service.monero.send_transaction(destinations)
            if not monero_result or not monero_result.get('tx_hash'):
                logger.error(f"Failed to send REAL XMR refund: {monero_result}")
                return False
            real_tx_hash = monero_result.get('tx_hash')

        # Store blockchain tx hash on refund record for audit
        try:
            refund.transaction_hash = real_tx_hash
            refund.save(update_fields=['transaction_hash', 'updated_at'])
        except Exception as e:
            logger.error(f"Failed to save refund transaction hash: {e}")

        logger.info(f"REAL refund sent by platform: {refund_amount} {currency} to buyer {refund.buyer.username} at {buyer_payout_address}, tx_hash: {real_tx_hash}")
        return True
    
    except Exception as e:
        logger.error(f"Error processing refund to wallet: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

