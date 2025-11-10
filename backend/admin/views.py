"""
Admin-specific views for counts and statistics
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from shared.utils import is_admin_user
import logging

from orders.models import Order
from products.models import Product
from disputes.models import Dispute
from tickets.models import Ticket
from vendors.models import VendorApplication
from shared.models import Conversation, Message

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_counts(request):
    """Get real-time counts for admin sidebar badges"""
    try:
        if not is_admin_user(request.user):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get counts for each section
        # Users: All non-admin users
        users_count = User.objects.filter(is_deleted=False).exclude(user_type='admin').count()
        
        # Vendors: Pending vendor applications
        from vendors.models import VendorApplication
        vendors_count = VendorApplication.objects.filter(status='pending').count()
        
        # Listings: Pending approval products
        listings_count = Product.objects.filter(is_deleted=False, status='pending_approval').count()
        
        # Orders: New orders, payment failed, or payment paid (recent orders that need attention)
        from orders.models import OrderStatus
        from payments.models import PaymentStatus
        from django.utils import timezone
        from datetime import timedelta
        # Count orders created in last 24 hours, payment failed, or payment paid in last 24 hours
        orders_count = Order.objects.filter(
            Q(created_at__gte=timezone.now() - timedelta(days=1)) |  # New orders
            Q(payment_status='failed') |  # Payment failed
            Q(payment_status=PaymentStatus.PAID.value, updated_at__gte=timezone.now() - timedelta(days=1))  # Payment paid (recent)
        ).count()
        
        # Disputes: Open disputes
        disputes_count = Dispute.objects.filter(status='open').count()
        
        # Messages: Unread conversations (conversations with unread messages)
        messages_count = Conversation.objects.filter(
            messages__is_read=False
        ).distinct().count()
        
        # Tickets: Open and in-progress tickets
        tickets_count = Ticket.objects.filter(status__in=['open', 'in_progress']).count()
        
        # Payouts: Pending payouts
        from payments.models import Payout
        payouts_count = Payout.objects.filter(status='pending').count()
        
        # Commissions: TODO - Implement when commission system is added
        commissions_count = 0
        
        counts = {
            'users': users_count,
            'vendors': vendors_count,
            'listings': listings_count,
            'orders': orders_count,
            'disputes': disputes_count,
            'messages': messages_count,
            'tickets': tickets_count,
            'payouts': payouts_count,
            'commissions': commissions_count,
        }
        
        return Response({
            'success': True,
            'data': counts
        })
    except Exception as e:
        logger.error(f"Error fetching admin counts: {e}")
        return Response({
            'success': False,
            'message': 'Failed to fetch counts',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_counts(request):
    """Get real-time counts for vendor sidebar badges"""
    try:
        # Check if user is a vendor
        if not hasattr(request.user, 'user_type') or request.user.user_type != 'vendor':
            return Response({
                'success': False,
                'message': 'Vendor access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        vendor_user = request.user
        
        # Listings: Pending approval or rejected (resubmitted)
        listings_count = Product.objects.filter(
            vendor=vendor_user,
            is_deleted=False,
            status__in=['pending_approval', 'rejected']
        ).count()
        
        # Orders: New orders or orders with status changes (recent activity)
        from orders.models import OrderStatus
        from payments.models import PaymentStatus
        from django.utils import timezone
        from datetime import timedelta
        # Count orders that need attention: new orders, payment status changes, or order status changes in last 24 hours
        orders_count = Order.objects.filter(
            vendor=vendor_user,
            is_deleted=False
        ).filter(
            Q(created_at__gte=timezone.now() - timedelta(days=1)) |  # New orders created in last 24 hours
            Q(updated_at__gte=timezone.now() - timedelta(days=1), payment_status__in=[PaymentStatus.PAID.value, 'failed']) |  # Payment status changed (paid/failed) in last 24 hours
            Q(updated_at__gte=timezone.now() - timedelta(days=1), order_status__in=[OrderStatus.PROCESSING.value, OrderStatus.CONFIRMED.value, OrderStatus.DELIVERED.value])  # Order status changed in last 24 hours
        ).distinct().count()
        
        # Messages: Unread messages (ANY new message, not just new conversations)
        from shared.models import Message
        messages_count = Message.objects.filter(
            recipient=vendor_user,
            is_read=False
        ).count()
        
        # Reviews: New reviews (reviews created in last 7 days, or unread notification reviews)
        from products.models import ProductReview
        from django.utils import timezone
        from datetime import timedelta
        reviews_count = ProductReview.objects.filter(
            product__vendor=vendor_user,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        # Disputes: Open disputes or disputes with admin decisions
        disputes_count = Dispute.objects.filter(
            vendor=vendor_user,
            status='open'
        ).count()
        
        # Tickets: Tickets with new messages (tickets with messages in last 24 hours)
        from tickets.models import TicketMessage
        from django.utils import timezone
        from datetime import timedelta
        tickets_count = Ticket.objects.filter(
            user=vendor_user,
            messages__created_at__gte=timezone.now() - timedelta(days=1)
        ).distinct().count()
        
        # Payouts: Pending payouts or payouts with status changes
        from payments.models import Payout
        from django.utils import timezone
        from datetime import timedelta
        payouts_count = Payout.objects.filter(
            Q(status='pending') |  # Pending payouts
            Q(updated_at__gte=timezone.now() - timedelta(days=1))  # Recently updated payouts
        ).count()
        
        counts = {
            'listings': listings_count,
            'orders': orders_count,
            'messages': messages_count,
            'reviews': reviews_count,
            'disputes': disputes_count,
            'tickets': tickets_count,
            'payouts': payouts_count,
        }
        
        return Response({
            'success': True,
            'data': counts
        })
    except Exception as e:
        logger.error(f"Error fetching vendor counts: {e}")
        return Response({
            'success': False,
            'message': 'Failed to fetch counts',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_counts(request):
    """Get real-time counts for buyer sidebar badges"""
    try:
        # Check if user is a buyer
        if not hasattr(request.user, 'user_type') or request.user.user_type != 'buyer':
            return Response({
                'success': False,
                'message': 'Buyer access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        buyer_user = request.user
        
        # Messages: Unread messages (ANY new message, not just new conversations)
        messages_count = Message.objects.filter(
            recipient=buyer_user,
            is_read=False
        ).count()
        
        # Orders: New orders, payment paid, payment failed, or status changes (recent activity)
        from orders.models import OrderStatus
        from payments.models import PaymentStatus
        from django.utils import timezone
        from datetime import timedelta
        # Count orders that need attention: new orders, payment status changes, or order status changes in last 24 hours
        orders_count = Order.objects.filter(
            buyer=buyer_user,
            is_deleted=False
        ).filter(
            Q(created_at__gte=timezone.now() - timedelta(days=1)) |  # New orders created in last 24 hours
            Q(updated_at__gte=timezone.now() - timedelta(days=1), payment_status__in=[PaymentStatus.PAID.value, 'failed']) |  # Payment status changed (paid/failed) in last 24 hours
            Q(updated_at__gte=timezone.now() - timedelta(days=1), order_status__in=[OrderStatus.PROCESSING.value, OrderStatus.CONFIRMED.value, OrderStatus.DELIVERED.value])  # Order status changed in last 24 hours
        ).distinct().count()
        
        # Support: Tickets with admin responses (tickets with messages from admin in last 24 hours)
        from tickets.models import TicketMessage
        tickets_count = Ticket.objects.filter(
            user=buyer_user,
            messages__sender__user_type='admin',
            messages__created_at__gte=timezone.now() - timedelta(days=1)
        ).distinct().count()
        
        counts = {
            'messages': messages_count,
            'orders': orders_count,
            'support': tickets_count,
        }
        
        return Response({
            'success': True,
            'data': counts
        })
    except Exception as e:
        logger.error(f"Error fetching buyer counts: {e}")
        return Response({
            'success': False,
            'message': 'Failed to fetch counts',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

