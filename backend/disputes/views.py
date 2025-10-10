from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Dispute, DisputeMessage, DisputeTimeline
from .serializers import (
    DisputeSerializer, DisputeCreateSerializer, DisputeMessageSerializer,
    DisputeTimelineSerializer, DisputeListSerializer
)
from orders.models import Order
from shared.models import Notification
import logging

logger = logging.getLogger(__name__)


def is_admin_user(user):
    return hasattr(user, 'user_type') and user.user_type == 'admin'


def is_vendor_user(user):
    return hasattr(user, 'user_type') and user.user_type == 'vendor'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_dispute(request):
    """Create a new dispute"""
    try:
        logger.info(f"create_dispute request.data: {request.data}")
        serializer = DisputeCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Use the resolved Order instance provided by the serializer
            order = serializer.validated_data.get('resolved_order')
            
            # Check if dispute already exists for this order
            existing_dispute = Dispute.objects.filter(order=order).first()
            if existing_dispute:
                return Response({
                    'success': False,
                    'message': 'A dispute already exists for this order'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create dispute (serializer.create handles setting buyer/vendor/product)
            dispute = serializer.save()
            
            # Create timeline entry
            DisputeTimeline.objects.create(
                dispute=dispute,
                action='Dispute Created',
                description=f"Buyer {request.user.username} created a dispute for order {dispute.order.id}",
                user=request.user
            )
            
            # Notify vendor
            Notification.objects.create(
                user=dispute.vendor,
                type='dispute',
                title='New Dispute Created',
                message=f"A dispute has been created for your product: {dispute.product.headline}",
                data={'dispute_id': str(dispute.id), 'order_id': str(dispute.order.id)}
            )
            
            # Notify all admins
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admins = User.objects.filter(user_type='admin')
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    type='dispute',
                    title='New Dispute Requires Attention',
                    message=f"New dispute created by {request.user.username}: {dispute.title}",
                    data={'dispute_id': str(dispute.id), 'priority': dispute.priority}
                )
            
            # Send real-time notifications
            channel_layer = get_channel_layer()
            
            # Notify vendor via WebSocket
            async_to_sync(channel_layer.group_send)(
                f"user_{dispute.vendor.id}",
                {
                    "type": "new_dispute",
                    "payload": {
                        "dispute_id": str(dispute.id),
                        "buyer_username": request.user.username,
                        "order_id": str(dispute.order.id),
                        "title": dispute.title,
                        "priority": dispute.priority
                    }
                }
            )
            
            # Notify admins via WebSocket
            for admin in admins:
                async_to_sync(channel_layer.group_send)(
                    f"user_{admin.id}",
                    {
                        "type": "new_dispute",
                        "payload": {
                            "dispute_id": str(dispute.id),
                            "buyer_username": request.user.username,
                            "order_id": str(dispute.order.id),
                            "title": dispute.title,
                            "priority": dispute.priority
                        }
                    }
                )
            
            return Response({
                'success': True,
                'message': 'Dispute created successfully',
                'data': DisputeSerializer(dispute).data
            }, status=status.HTTP_201_CREATED)
        
        logger.warning(f"create_dispute serializer.errors: {serializer.errors}")
        return Response({
            'success': False,
            'message': 'Invalid data',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error creating dispute: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to create dispute',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_disputes(request):
    """List disputes based on user role"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        status_filter = request.GET.get('status')
        priority_filter = request.GET.get('priority')
        category_filter = request.GET.get('category')
        
        # Base queryset
        if is_admin_user(request.user):
            # Admin can see all disputes
            queryset = Dispute.objects.all()
        elif is_vendor_user(request.user):
            # Vendor can see disputes for their products
            queryset = Dispute.objects.filter(vendor=request.user)
        else:
            # Buyer can see their own disputes
            queryset = Dispute.objects.filter(buyer=request.user)
        
        # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # Pagination
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        disputes = queryset[start:end]
        
        serializer = DisputeListSerializer(disputes, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'has_next': end < total_count,
                'has_previous': page > 1
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing disputes: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch disputes',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dispute_detail(request, dispute_id):
    """Get detailed dispute information"""
    try:
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        # Check permissions
        if not is_admin_user(request.user) and dispute.buyer != request.user and dispute.vendor != request.user:
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get dispute details
        dispute_data = DisputeSerializer(dispute).data
        
        # Get messages
        messages = DisputeMessage.objects.filter(dispute=dispute)
        if not is_admin_user(request.user):
            messages = messages.filter(is_internal=False)
        
        messages_data = DisputeMessageSerializer(messages, many=True).data
        
        # Get timeline
        timeline_data = DisputeTimelineSerializer(dispute.timeline.all(), many=True).data
        
        return Response({
            'success': True,
            'data': {
                'dispute': dispute_data,
                'messages': messages_data,
                'timeline': timeline_data
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting dispute detail: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch dispute details',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_dispute_message(request, dispute_id):
    """Send a message in dispute"""
    try:
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        # Check permissions
        if not is_admin_user(request.user) and dispute.buyer != request.user and dispute.vendor != request.user:
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        message_text = request.data.get('message', '').strip()
        is_internal = request.data.get('is_internal', False)
        attachments = request.data.get('attachments', [])
        
        if not message_text:
            return Response({
                'success': False,
                'message': 'Message cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Only admins can send internal messages
        if is_internal and not is_admin_user(request.user):
            is_internal = False
        
        message = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=message_text,
            is_internal=is_internal,
            attachments=attachments
        )
        
        # Update dispute status if needed
        if dispute.status == 'open':
            dispute.status = 'in_progress'
            dispute.save()
            
            DisputeTimeline.objects.create(
                dispute=dispute,
                action='Status Updated',
                description='Dispute status changed to In Progress',
                user=request.user
            )
        
        # Create timeline entry
        DisputeTimeline.objects.create(
            dispute=dispute,
            action='Message Sent',
            description=f"{request.user.username} sent a message",
            user=request.user
        )
        
        # Notify other parties
        if dispute.buyer != request.user:
            Notification.objects.create(
                user=dispute.buyer,
                type='dispute_message',
                title='New Message in Dispute',
                message=f"New message in dispute {dispute.dispute_id}",
                data={'dispute_id': str(dispute.id)}
            )
        
        if dispute.vendor != request.user:
            Notification.objects.create(
                user=dispute.vendor,
                type='dispute_message',
                title='New Message in Dispute',
                message=f"New message in dispute {dispute.dispute_id}",
                data={'dispute_id': str(dispute.id)}
            )
        
        # Send real-time notifications
        channel_layer = get_channel_layer()
        
        # Notify other parties via WebSocket
        if dispute.buyer != request.user:
            async_to_sync(channel_layer.group_send)(
                f"user_{dispute.buyer.id}",
                {
                    "type": "dispute_message",
                    "payload": {
                        "dispute_id": str(dispute.id),
                        "sender_username": request.user.username,
                        "message_preview": message_text[:100]
                    }
                }
            )
        
        if dispute.vendor != request.user:
            async_to_sync(channel_layer.group_send)(
                f"user_{dispute.vendor.id}",
                {
                    "type": "dispute_message",
                    "payload": {
                        "dispute_id": str(dispute.id),
                        "sender_username": request.user.username,
                        "message_preview": message_text[:100]
                    }
                }
            )
        
        return Response({
            'success': True,
            'message': 'Message sent successfully',
            'data': DisputeMessageSerializer(message).data
        })
        
    except Exception as e:
        logger.error(f"Error sending dispute message: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to send message',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_dispute(request, dispute_id):
    """Resolve a dispute (admin only)"""
    try:
        if not is_admin_user(request.user):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        resolution = request.data.get('resolution')
        resolution_notes = request.data.get('resolution_notes', '').strip()
        resolution_reason = request.data.get('resolution_reason', '').strip()
        winning_party = request.data.get('winning_party')
        refund_amount = request.data.get('refund_amount')
        
        if not resolution:
            return Response({
                'success': False,
                'message': 'Resolution is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not resolution_reason:
            return Response({
                'success': False,
                'message': 'Resolution reason is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not winning_party:
            return Response({
                'success': False,
                'message': 'Winning party must be specified'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update dispute
        dispute.resolution = resolution
        dispute.resolution_notes = resolution_notes
        dispute.resolution_reason = resolution_reason
        dispute.winning_party = winning_party
        dispute.refund_amount = refund_amount
        dispute.status = 'resolved'
        dispute.resolved_at = timezone.now()
        dispute.assigned_admin = request.user
        dispute.save()
        
        # Create timeline entry
        winning_party_text = {
            'buyer': 'Buyer',
            'vendor': 'Vendor', 
            'neutral': 'Neutral/Shared Responsibility'
        }.get(winning_party, 'Unknown')
        
        DisputeTimeline.objects.create(
            dispute=dispute,
            action='Dispute Resolved',
            description=f"Dispute resolved by admin {request.user.username}. Decision: {resolution}. Winner: {winning_party_text}. Reason: {resolution_reason}",
            user=request.user
        )
        
        # Determine notification messages based on winning party
        buyer_message = f"Your dispute {dispute.dispute_id} has been resolved"
        vendor_message = f"Dispute {dispute.dispute_id} has been resolved"
        
        if winning_party == 'buyer':
            buyer_message += " - Decision in your favor!"
            vendor_message += " - Decision in favor of the buyer."
        elif winning_party == 'vendor':
            buyer_message += " - Decision in favor of the vendor."
            vendor_message += " - Decision in your favor!"
        else:
            buyer_message += " - Shared responsibility decision."
            vendor_message += " - Shared responsibility decision."
        
        # Notify parties
        Notification.objects.create(
            user=dispute.buyer,
            type='dispute_resolved',
            title='Dispute Resolved',
            message=buyer_message,
            data={
                'dispute_id': str(dispute.id), 
                'resolution': resolution,
                'winning_party': winning_party,
                'resolution_reason': resolution_reason
            }
        )
        
        Notification.objects.create(
            user=dispute.vendor,
            type='dispute_resolved',
            title='Dispute Resolved',
            message=vendor_message,
            data={
                'dispute_id': str(dispute.id), 
                'resolution': resolution,
                'winning_party': winning_party,
                'resolution_reason': resolution_reason
            }
        )
        
        # Send real-time notifications
        channel_layer = get_channel_layer()
        
        # Notify buyer via WebSocket
        async_to_sync(channel_layer.group_send)(
            f"user_{dispute.buyer.id}",
            {
                "type": "dispute_resolved",
                "payload": {
                    "dispute_id": str(dispute.id),
                    "resolution": resolution,
                    "resolution_notes": resolution_notes,
                    "resolution_reason": resolution_reason,
                    "winning_party": winning_party,
                    "message": buyer_message
                }
            }
        )
        
        # Notify vendor via WebSocket
        async_to_sync(channel_layer.group_send)(
            f"user_{dispute.vendor.id}",
            {
                "type": "dispute_resolved",
                "payload": {
                    "dispute_id": str(dispute.id),
                    "resolution": resolution,
                    "resolution_notes": resolution_notes,
                    "resolution_reason": resolution_reason,
                    "winning_party": winning_party,
                    "message": vendor_message
                }
            }
        )
        
        return Response({
            'success': True,
            'message': 'Dispute resolved successfully',
            'data': DisputeSerializer(dispute).data
        })
        
    except Exception as e:
        logger.error(f"Error resolving dispute: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to resolve dispute',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dispute_statistics(request):
    """Get dispute statistics based on user role"""
    try:
        if is_admin_user(request.user):
            # Admin can see all dispute statistics
            stats = {
                'total_disputes': Dispute.objects.count(),
                'open_disputes': Dispute.objects.filter(status='open').count(),
                'in_progress_disputes': Dispute.objects.filter(status='in_progress').count(),
                'resolved_disputes': Dispute.objects.filter(status='resolved').count(),
                'closed_disputes': Dispute.objects.filter(status='closed').count(),
                'urgent_disputes': Dispute.objects.filter(priority='urgent').count(),
                'high_priority_disputes': Dispute.objects.filter(priority='high').count(),
                'disputes_by_category': dict(
                    Dispute.objects.values('category').annotate(count=Count('id')).values_list('category', 'count')
                ),
                'disputes_by_status': dict(
                    Dispute.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
                )
            }
        else:
            # Get user-specific dispute statistics
            if is_vendor_user(request.user):
                # Vendor statistics
                user_disputes = Dispute.objects.filter(vendor=request.user)
            else:
                # Buyer statistics
                user_disputes = Dispute.objects.filter(buyer=request.user)
            
            # Calculate win/loss statistics for resolved disputes
            resolved_disputes = user_disputes.filter(status='resolved')
            won_disputes = resolved_disputes.filter(
                Q(winning_party='buyer', buyer=request.user) | 
                Q(winning_party='vendor', vendor=request.user)
            ).count()
            lost_disputes = resolved_disputes.filter(
                Q(winning_party='buyer', vendor=request.user) | 
                Q(winning_party='vendor', buyer=request.user)
            ).count()
            neutral_disputes = resolved_disputes.filter(winning_party='neutral').count()
            
            stats = {
                'total_disputes': user_disputes.count(),
                'open_disputes': user_disputes.filter(status='open').count(),
                'in_progress_disputes': user_disputes.filter(status='in_progress').count(),
                'resolved_disputes': resolved_disputes.count(),
                'closed_disputes': user_disputes.filter(status='closed').count(),
                'urgent_disputes': user_disputes.filter(priority='urgent').count(),
                'high_priority_disputes': user_disputes.filter(priority='high').count(),
                'won_disputes': won_disputes,
                'lost_disputes': lost_disputes,
                'neutral_disputes': neutral_disputes,
                'win_rate': round((won_disputes / resolved_disputes.count() * 100) if resolved_disputes.count() > 0 else 0, 1),
                'disputes_by_category': dict(
                    user_disputes.values('category').annotate(count=Count('id')).values_list('category', 'count')
                ),
                'disputes_by_status': dict(
                    user_disputes.values('status').annotate(count=Count('id')).values_list('status', 'count')
                )
            }
        
        return Response({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"Error getting dispute statistics: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch dispute statistics',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
