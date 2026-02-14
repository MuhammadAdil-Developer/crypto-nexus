"""
Dispute Views
Handles buyer opening disputes and admin resolution
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
from payments.models import RefundRequest
from shared.models import Notification, UserActivity
from shared.utils import log_user_activity
from shared.admin_notifications import send_admin_notification
from .refund_views import process_refund_to_wallet, VENDOR_REFUND_DEADLINE_DAYS

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buyer_open_dispute(request):
    """
    Buyer opens a dispute after vendor rejects refund
    - Creates dispute linked to refund request
    - Status changes to 'disputed'
    - Admin becomes decision maker
    - Notifies admin in real-time (urgent)
    """
    try:
        refund_id = request.data.get('refund_id')
        reason = request.data.get('reason')
        evidence = request.data.get('evidence', {})  # JSON field for evidence
        
        # Validation
        if not refund_id or not reason:
            return Response({
                'success': False,
                'message': 'refund_id and reason are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get refund request
        try:
            refund = RefundRequest.objects.get(id=refund_id)
        except RefundRequest.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Refund request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify buyer ownership
        if refund.buyer != request.user:
            return Response({
                'success': False,
                'message': 'You can only open disputes for your own refund requests'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if refund was rejected
        if refund.status != 'vendor_rejected':
            return Response({
                'success': False,
                'message': f'Can only open dispute for rejected refunds. Current status: {refund.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if dispute already exists
        if hasattr(refund, 'dispute'):
            return Response({
                'success': False,
                'message': 'A dispute already exists for this refund request'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order = refund.order
        
        # Check if order is confirmed - cannot dispute confirmed orders
        if order.order_status == 'confirmed' or order.order_status == 'completed':
            return Response({
                'success': False,
                'message': 'Cannot open dispute for confirmed/completed orders. Please contact the vendor directly for any issues.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Create dispute
            dispute = OrderDispute.objects.create(
                order=order,
                refund_request=refund,
                initiator=request.user,
                reason=reason,
                evidence=evidence,
                status='open'
            )
            
            # Update refund status
            refund.status = 'disputed'
            refund.save()
            
            # Update order status
            order.dispute_opened = True
            order.dispute_opened_at = timezone.now()
            order.save()
            
            # Log activity
            log_user_activity(
                user=request.user,
                activity_type='dispute_opened',
                description=f'Opened dispute for order {order.order_id}',
                metadata={
                    'order_id': order.order_id,
                    'refund_id': str(refund.id),
                    'dispute_id': str(dispute.id)
                }
            )
            
            # Notify admin (urgent, real-time)
            send_admin_notification(
                notification_type='dispute',
                title='New Dispute Opened',
                message=f'Buyer {request.user.username} opened a dispute for order {order.order_id}',
                data={
                    'dispute_id': str(dispute.id),
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'buyer_username': request.user.username,
                    'vendor_username': refund.vendor.username,
                    'reason': reason,
                    'action_url': '/admin/disputes'
                },
                priority='urgent'
            )
            
            # Notify vendor via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=refund.vendor,
                notification_type='dispute',
                title='Dispute Opened',
                message=f'Buyer {request.user.username} opened a dispute for order {order.order_id}',
                data={
                    'dispute_id': str(dispute.id),
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'action_url': '/vendor/orders'
                },
                priority='high'
            )
            

        
        return Response({
            'success': True,
            'message': 'Dispute opened successfully',
            'dispute': {
                'id': str(dispute.id),
                'order_id': order.order_id,
                'status': dispute.status,
                'created_at': dispute.created_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        logger.error(f"Buyer open dispute error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_disputes(request):
    """Get buyer's disputes"""
    try:
        from shared.utils.security import get_safe_int
        page = get_safe_int(request.query_params.get('page'), default=1, min_val=1)
        limit = get_safe_int(request.query_params.get('limit'), default=10, min_val=1, max_val=100)
        status_filter = request.query_params.get('status', None)
        
        disputes = OrderDispute.objects.filter(initiator=request.user).order_by('-created_at')
        
        if status_filter:
            disputes = disputes.filter(status=status_filter)
        
        total = disputes.count()
        start = (page - 1) * limit
        end = start + limit
        disputes_page = disputes[start:end]
        
        data = []
        for dispute in disputes_page:
            data.append({
                'id': str(dispute.id),
                'order_id': dispute.order.order_id,
                'refund_id': str(dispute.refund_request.id) if dispute.refund_request else None,
                'reason': dispute.reason,
                'status': dispute.status,
                'resolution': dispute.resolution,
                'resolution_amount': str(dispute.resolution_amount) if dispute.resolution_amount else None,
                'resolved_at': dispute.resolved_at.isoformat() if dispute.resolved_at else None,
                'created_at': dispute.created_at.isoformat(),
            })
        
        return Response({
            'success': True,
            'data': data,
            'total': total,
            'page': page,
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"Get buyer disputes error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': [],
            'total': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_resolve_dispute(request, dispute_id):
    """
    Admin resolves dispute
    - Can choose: buyer_wins, vendor_wins, or partial_refund
    - If buyer_wins: Vendor must refund (with daily reminders)
    - If vendor_wins: No refund, vendor keeps money
    - If partial_refund: Custom amount to buyer wallet
    """
    try:
        from users.models import User
        
        # Check if user is admin
        if request.user.user_type != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can resolve disputes'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get dispute
        try:
            dispute = OrderDispute.objects.get(id=dispute_id)
        except OrderDispute.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Dispute not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check status
        if dispute.status == 'resolved':
            return Response({
                'success': False,
                'message': 'Dispute is already resolved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        resolution = request.data.get('resolution')  # buyer_wins, vendor_wins, partial_refund
        resolution_amount = request.data.get('resolution_amount')
        resolution_notes = request.data.get('resolution_notes', '')
        
        # Validation
        if resolution not in ['buyer_wins', 'vendor_wins', 'partial_refund']:
            return Response({
                'success': False,
                'message': 'Invalid resolution. Must be: buyer_wins, vendor_wins, or partial_refund'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if resolution == 'partial_refund' and not resolution_amount:
            return Response({
                'success': False,
                'message': 'resolution_amount is required for partial refund'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        refund = dispute.refund_request
        order = dispute.order
        
        with transaction.atomic():
            # Update dispute
            dispute.status = 'resolved'
            dispute.resolution = resolution
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
            dispute.resolution_notes = resolution_notes
            
            if resolution == 'partial_refund':
                dispute.resolution_amount = Decimal(str(resolution_amount))
                if dispute.resolution_amount <= 0 or dispute.resolution_amount > refund.amount:
                    return Response({
                        'success': False,
                        'message': f'Partial refund amount must be between 0 and {refund.amount}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            dispute.save()
            
            # Update refund request
            refund.admin_decision = resolution
            refund.admin_decision_at = timezone.now()
            refund.admin_decision_notes = resolution_notes
            refund.resolved_by = request.user
            
            if resolution == 'buyer_wins':
                # Vendor must refund
                refund.status = 'admin_approved'
                refund.vendor_refund_required = True
                refund.vendor_refund_deadline = timezone.now() + timedelta(days=VENDOR_REFUND_DEADLINE_DAYS)
                refund.admin_decision_amount = refund.amount
                refund.save()
                
                # Notify vendor via central helper (respects preferences)
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=refund.vendor,
                    notification_type='dispute',
                    title='Dispute Resolved - Refund Required',
                    message=f'Admin resolved dispute in buyer\'s favor for order {order.order_id}. You must refund {refund.amount} {order.crypto_currency} to the buyer.',
                    data={
                        'dispute_id': str(dispute.id),
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'amount': str(refund.amount),
                        'deadline': refund.vendor_refund_deadline.isoformat(),
                        'action_url': '/vendor/orders'
                    },
                    priority='urgent'
                )
                
                # Notify buyer via central helper (respects preferences)
                send_user_notification(
                    user=refund.buyer,
                    notification_type='dispute',
                    title='Dispute Resolved in Your Favor',
                    message=f'Admin resolved dispute in your favor for order {order.order_id}. Vendor will process refund.',
                    data={
                        'dispute_id': str(dispute.id),
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'action_url': '/buyer/orders'
                    }
                )
            
            elif resolution == 'vendor_wins':
                # Vendor keeps money, no refund
                refund.status = 'admin_rejected'
                refund.save()
                
                # Notify vendor via central helper (respects preferences)
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=refund.vendor,
                    notification_type='dispute',
                    title='Dispute Resolved in Your Favor',
                    message=f'Admin resolved dispute in your favor for order {order.order_id}. No refund required.',
                    data={
                        'dispute_id': str(dispute.id),
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'action_url': '/vendor/orders'
                    }
                )
                
                # Notify buyer via central helper (respects preferences)
                send_user_notification(
                    user=refund.buyer,
                    notification_type='dispute',
                    title='Dispute Resolved - Vendor Wins',
                    message=f'Admin resolved dispute in vendor\'s favor for order {order.order_id}. No refund will be issued.',
                    data={
                        'dispute_id': str(dispute.id),
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'action_url': '/buyer/orders'
                    }
                )
            
            elif resolution == 'partial_refund':
                # Partial refund to buyer wallet
                refund.status = 'admin_approved'
                refund.admin_decision_amount = Decimal(str(resolution_amount))
                refund.save()
                
                # Process partial refund to wallet
                partial_refund = RefundRequest(
                    order=order,
                    buyer=refund.buyer,
                    vendor=refund.vendor,
                    amount=Decimal(str(resolution_amount)),
                    refund_type='partial',
                    reason='Partial refund from dispute resolution',
                    status='vendor_approved'
                )
                process_refund_to_wallet(partial_refund, order)
                
                # Update refund status to completed
                refund.status = 'completed'
                refund.completed_at = timezone.now()
                refund.save()
                
                # Notify parties via central helper (respects preferences)
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=refund.buyer,
                    notification_type='dispute',
                    title='Dispute Resolved - Partial Refund',
                    message=f'Admin resolved dispute with partial refund of {resolution_amount} {order.crypto_currency} for order {order.order_id}. Amount credited to wallet.',
                    data={
                        'dispute_id': str(dispute.id),
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'amount': str(resolution_amount),
                        'action_url': '/buyer/orders'
                    }
                )
                
                send_user_notification(
                    user=refund.vendor,
                    notification_type='dispute',
                    title='Dispute Resolved - Partial Refund',
                    message=f'Admin resolved dispute with partial refund of {resolution_amount} {order.crypto_currency} for order {order.order_id}.',
                    data={
                        'dispute_id': str(dispute.id),
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'action_url': '/vendor/orders'
                    }
                )
            
            # Log activity
            log_user_activity(
                user=request.user,
                activity_type='dispute_resolved',
                description=f'Resolved dispute for order {order.order_id} - {resolution}',
                metadata={
                    'order_id': order.order_id,
                    'dispute_id': str(dispute.id),
                    'refund_id': str(refund.id),
                    'resolution': resolution,
                    'resolution_amount': str(resolution_amount) if resolution_amount else None
                }
            )
        
        return Response({
            'success': True,
            'message': f'Dispute resolved: {resolution}',
            'dispute': {
                'id': str(dispute.id),
                'resolution': dispute.resolution,
                'resolution_amount': str(dispute.resolution_amount) if dispute.resolution_amount else None,
                'resolved_at': dispute.resolved_at.isoformat()
            }
        })
    
    except Exception as e:
        logger.error(f"Admin resolve dispute error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_process_refund(request, refund_id):
    """
    Vendor processes refund after admin decision in buyer's favor
    - Vendor confirms refund transaction
    - Amount credited to buyer's wallet
    - Refund marked as completed
    """
    try:
        # Get refund request
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
                'message': 'You can only process refunds for your own orders'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if refund is required
        if not refund.vendor_refund_required or refund.vendor_refund_completed:
            return Response({
                'success': False,
                'message': 'This refund does not require vendor processing or is already completed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        transaction_hash = request.data.get('transaction_hash', '').strip()
        notes = request.data.get('notes', '')
        payment_source = request.data.get('payment_source', 'platform')
        external_wallet_address = request.data.get('external_wallet_address', '').strip()

        if payment_source not in ['platform', 'external']:
            return Response({
                'success': False,
                'message': 'Invalid payment source. Choose \"platform\" or \"external\".'
            }, status=status.HTTP_400_BAD_REQUEST)

        order = refund.order

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
                refund.vendor_refund_completed = True
                refund.vendor_refund_transaction_hash = transaction_hash
                refund.vendor_payment_source = 'external'
                refund.vendor_external_wallet_address = external_wallet_address
                refund.status = 'completed'
                refund.vendor_decision_notes = notes or refund.vendor_decision_notes
                refund.completed_at = timezone.now()
                refund.save()

                # Update order status to refunded
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
                refund.vendor_refund_completed = True
                refund.vendor_refund_transaction_hash = transaction_hash
                refund.vendor_payment_source = 'platform'
                refund.vendor_external_wallet_address = vendor_wallet_address  # Store vendor's payout wallet address
                refund.status = 'completed'
                refund.vendor_decision_notes = notes or refund.vendor_decision_notes
                refund.completed_at = timezone.now()
                refund.save()

                # Update order status to refunded
                order.order_status = 'refunded'
                order.save()
            
            # Log activity
            log_user_activity(
                user=request.user,
                activity_type='vendor_refund_processed',
                description=f'Processed refund for order {order.order_id}',
                metadata={
                    'order_id': order.order_id,
                    'refund_id': str(refund.id),
                    'amount': str(refund.amount),
                    'transaction_hash': transaction_hash
                }
            )
            
            # Notify buyer via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=refund.buyer,
                notification_type='refund',
                title='Refund Processed',
                message=f'Vendor processed refund for order {order.order_id}. The refund has been sent to your payout wallet.',
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
                title='Vendor Processed Refund',
                message=f'Vendor {request.user.username} processed refund for order {order.order_id}',
                data={
                    'refund_id': str(refund.id),
                    'order_id': order.order_id,
                    'action_url': '/admin/refunds'
                },
                priority='normal'
            )
        
        return Response({
            'success': True,
            'message': 'Refund processed successfully',
            'refund': {
                'id': str(refund.id),
                'status': refund.status,
                'amount': str(refund.amount)
            }
        })
    
    except Exception as e:
        logger.error(f"Vendor process refund error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)