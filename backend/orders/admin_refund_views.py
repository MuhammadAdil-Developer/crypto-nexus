"""
Admin Refund and Dispute Management Views
"""
import logging
from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from orders.models import Order, OrderDispute
from payments.models import RefundRequest
from shared.models import Notification
from shared.utils import log_user_activity
from shared.admin_notifications import send_admin_notification
from .refund_views import process_refund_to_wallet

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_refund_requests(request):
    """Get all refund requests for admin"""
    try:
        # Check if user is admin
        if request.user.user_type != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        status_filter = request.query_params.get('status', None)
        
        refunds = RefundRequest.objects.select_related('order', 'buyer', 'vendor').all().order_by('-created_at')
        
        if status_filter:
            refunds = refunds.filter(status=status_filter)
        
        total = refunds.count()
        start = (page - 1) * limit
        end = start + limit
        refunds_page = refunds[start:end]
        
        data = []
        for refund in refunds_page:
            try:
                if not refund.order:
                    continue
                data.append({
                    'id': str(refund.id),
                    'order_id': refund.order.order_id,
                    'buyer': refund.buyer.username,
                    'vendor': refund.vendor.username,
                    'amount': str(refund.amount),
                    'crypto_currency': refund.order.crypto_currency,
                    'reason': refund.reason,
                    'refund_type': refund.refund_type,
                    'status': refund.status,
                    'vendor_decision': refund.vendor_decision,
                    'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
                    'admin_decision': refund.admin_decision,
                    'vendor_refund_required': refund.vendor_refund_required,
                    'vendor_refund_completed': refund.vendor_refund_completed,
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
        logger.error(f"Get admin refund requests error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': [],
            'total': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_disputes(request):
    """Get all disputes for admin"""
    try:
        # Check if user is admin
        if request.user.user_type != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        status_filter = request.query_params.get('status', None)
        
        disputes = OrderDispute.objects.all().order_by('-created_at')
        
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
                'buyer': dispute.initiator.username,
                'vendor': dispute.order.vendor.username,
                'reason': dispute.reason,
                'evidence': dispute.evidence,
                'status': dispute.status,
                'resolution': dispute.resolution,
                'resolution_amount': str(dispute.resolution_amount) if dispute.resolution_amount else None,
                'resolution_notes': dispute.resolution_notes,
                'resolved_by': dispute.resolved_by.username if dispute.resolved_by else None,
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
        logger.error(f"Get admin disputes error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': [],
            'total': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_refund_detail(request, refund_id):
    """Get detailed refund request information"""
    try:
        # Check if user is admin
        if request.user.user_type != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            refund = RefundRequest.objects.get(id=refund_id)
        except RefundRequest.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Refund request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        order = refund.order
        
        # Get dispute if exists
        dispute = None
        if hasattr(refund, 'dispute'):
            dispute = refund.dispute
        
        data = {
            'id': str(refund.id),
            'order_id': order.order_id,
            'order': {
                'id': str(order.id),
                'order_id': order.order_id,
                'product': order.product.headline,
                'buyer': order.buyer.username,
                'vendor': order.vendor.username,
                'total_amount': str(order.total_amount),
                'crypto_currency': order.crypto_currency,
                'use_escrow': order.use_escrow,
                'order_status': order.order_status,
            },
            'buyer': {
                'id': str(refund.buyer.id),
                'username': refund.buyer.username,
            },
            'vendor': {
                'id': str(refund.vendor.id),
                'username': refund.vendor.username,
            },
            'amount': str(refund.amount),
            'crypto_currency': order.crypto_currency,
            'refund_type': refund.refund_type,
            'reason': refund.reason,
            'notes': refund.notes,
            'status': refund.status,
            'vendor_decision': refund.vendor_decision,
            'vendor_decision_at': refund.vendor_decision_at.isoformat() if refund.vendor_decision_at else None,
            'vendor_decision_notes': refund.vendor_decision_notes,
            'vendor_decision_deadline': refund.vendor_decision_deadline.isoformat() if refund.vendor_decision_deadline else None,
            'admin_decision': refund.admin_decision,
            'admin_decision_amount': str(refund.admin_decision_amount) if refund.admin_decision_amount else None,
            'admin_decision_at': refund.admin_decision_at.isoformat() if refund.admin_decision_at else None,
            'admin_decision_notes': refund.admin_decision_notes,
            'resolved_by': refund.resolved_by.username if refund.resolved_by else None,
            'vendor_refund_required': refund.vendor_refund_required,
            'vendor_refund_deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
            'vendor_refund_completed': refund.vendor_refund_completed,
            'vendor_refund_transaction_hash': refund.vendor_refund_transaction_hash,
            'created_at': refund.created_at.isoformat(),
            'updated_at': refund.updated_at.isoformat(),
            'completed_at': refund.completed_at.isoformat() if refund.completed_at else None,
            'dispute': None
        }
        
        if dispute:
            data['dispute'] = {
                'id': str(dispute.id),
                'reason': dispute.reason,
                'evidence': dispute.evidence,
                'status': dispute.status,
                'resolution': dispute.resolution,
                'resolution_amount': str(dispute.resolution_amount) if dispute.resolution_amount else None,
                'resolution_notes': dispute.resolution_notes,
                'resolved_by': dispute.resolved_by.username if dispute.resolved_by else None,
                'resolved_at': dispute.resolved_at.isoformat() if dispute.resolved_at else None,
            }
        
        return Response({
            'success': True,
            'data': data
        })
    
    except Exception as e:
        logger.error(f"Get admin refund detail error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_force_refund(request, refund_id):
    """
    Admin forces refund if vendor doesn't comply
    - Credits buyer wallet directly
    - Marks refund as completed
    """
    try:
        # Check if user is admin
        if request.user.user_type != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can force refunds'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            refund = RefundRequest.objects.get(id=refund_id)
        except RefundRequest.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Refund request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if vendor refund is required but not completed
        if not refund.vendor_refund_required or refund.vendor_refund_completed:
            return Response({
                'success': False,
                'message': 'This refund does not require force processing'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order = refund.order
        notes = request.data.get('notes', 'Admin forced refund due to vendor non-compliance')
        
        with transaction.atomic():
            # Process refund to buyer's wallet
            refund_processed = process_refund_to_wallet(refund, order)
            
            if refund_processed:
                # Mark refund as completed
                refund.vendor_refund_completed = True
                refund.status = 'completed'
                refund.completed_at = timezone.now()
                refund.admin_decision_notes = notes
                refund.save()
                
                # Log activity
                log_user_activity(
                    user=request.user,
                    activity_type='refund_approved',
                    description=f'Admin forced refund for order {order.order_id}',
                    metadata={
                        'order_id': order.order_id,
                        'refund_id': str(refund.id),
                        'amount': str(refund.amount),
                        'reason': 'vendor_non_compliance'
                    }
                )
                
                # Notify buyer via central helper (respects preferences)
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=refund.buyer,
                    notification_type='refund',
                    title='Refund Processed by Admin',
                    message=f'Admin processed refund for order {order.order_id}. Amount credited to your wallet.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'amount': str(refund.amount),
                        'action_url': '/buyer/orders'
                    }
                )
                
                # Notify vendor via central helper (respects preferences)
                send_user_notification(
                    user=refund.vendor,
                    notification_type='refund',
                    title='Refund Processed by Admin',
                    message=f'Admin processed refund for order {order.order_id} due to non-compliance.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'action_url': '/vendor/orders'
                    }
                )
                
                return Response({
                    'success': True,
                    'message': 'Refund forced and processed successfully',
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
        logger.error(f"Admin force refund error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


