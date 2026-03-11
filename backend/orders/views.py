from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import Order, OrderDispute, OrderStatus
from .serializers import (
    OrderSerializer, CreateOrderSerializer, UpdateOrderStatusSerializer,
    OrderDisputeSerializer, AdminDashboardOrderSerializer, OrderListSerializer
)
from django.core.cache import cache
from payments.services import BTCPayServerService, MoneroRPCService
from payments.models import PaymentStatus, PaymentAddress, RefundRequest
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from payments.models import RefundRequest
from django.db.models import Sum

import logging
import time

logger = logging.getLogger(__name__)


from rest_framework.pagination import PageNumberPagination

class LargeResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 10000

class CachedCountPagination(LargeResultsSetPagination):
    """Optimized pagination that caches the total count to speed up large table listings"""
    def paginate_queryset(self, queryset, request, view=None):
        # We cache the total count for 60 seconds to avoid heavy COUNT(*) queries
        cache_key = f"count_cache_{queryset.model._meta.db_table}_{request.user.id}"
        cached_count = cache.get(cache_key)
        
        if cached_count is not None:
            self.display_page_controls = True
            self.request = request
            # Manually set the count on the paginator
            from django.core.paginator import Paginator
            class FastPaginator(Paginator):
                @property
                def count(self):
                    return cached_count
            
            page_size = self.get_page_size(request)
            if not page_size:
                return None
                
            paginator = FastPaginator(queryset, page_size)
            page_number = request.query_params.get(self.page_query_param, 1)
            
            try:
                self.page = paginator.page(page_number)
            except Exception:
                return None
                
            return list(self.page)
            
        # If not cached, do normal pagination but save the count
        result = super().paginate_queryset(queryset, request, view)
        if hasattr(self, 'page') and self.page is not None:
            cache.set(cache_key, self.page.paginator.count, 60)
        return result


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    pagination_class = CachedCountPagination
    
    def get_serializer_class(self):
        """Return different serializers for different actions"""
        if self.action in ['list', 'orders_page_aggregated']:
            return OrderListSerializer
        if self.action == 'create':
            return CreateOrderSerializer
        if self.action == 'update' or self.action == 'partial_update':
            return UpdateOrderStatusSerializer
        return OrderSerializer    
    def get_queryset(self):
        """Filter orders with SMART deferring (only skips heavy JSON fields)"""
        user = self.request.user
        
        # Deferring ONLY the heavy fields that slow down lists
        # This fixes the N+1 problem while keeping the query fast
        base_qs = Order.objects.select_related('buyer', 'vendor', 'product').defer(
            'product_credentials'
        ).order_by('-created_at')
        
        if user.is_staff or user.user_type == 'admin':
            return base_qs
        elif user.user_type == 'vendor':
            return base_qs.filter(vendor=user)
        else:
            return base_qs.filter(buyer=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return CreateOrderSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateOrderStatusSerializer
        return OrderSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new order and generate payment address"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create order
        order = serializer.save()
        
        # GIVEAWAY LOGIC: If total amount is 0, mark as COMPLETED immediately but don't auto-deliver
        if order.total_amount == 0:
            from django.utils import timezone
            # Mark as CONFIRMED and paid so it counts in sales immediately
            # But don't set delivered_at - vendor needs to manually deliver credentials
            # Note: Frontend will display this as "Completed" for giveaway orders
            order.order_status = OrderStatus.CONFIRMED.value  # CONFIRMED status for giveaway orders (shows as Completed in UI)
            order.payment_status = 'paid'
            order.payment_confirmed_at = timezone.now()
            order.confirmed_at = timezone.now()
            # DON'T set delivered_at here - let vendor deliver manually
            # delivered_at will be set when vendor delivers credentials
            
            # Auto-fill credentials ONLY if it's instant auto delivery
            if order.product.delivery_time == 'instant_auto' and order.product.credentials:
                order.product_credentials = {
                    'credentials': order.product.credentials,
                    'delivered_at': timezone.now().isoformat(),
                    'delivery_method': 'instant_auto',
                    'notes': 'Giveaway success! Enjoy your account.'
                }
                # Only set delivered_at for instant auto delivery
                order.delivered_at = timezone.now()
            # For manual delivery, credentials will be empty and delivered_at will be null
            # This allows vendor to see "Deliver Account" button
            
            order.save()
            logger.info(f"Giveaway order {order.order_id} marked as COMPLETED - waiting for manual delivery")
            
            # Prepare giveaway response
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
        
        # Prepare response (Moved to end to allow notifications to run)
        response_data = OrderSerializer(order).data
        
        try:
            from shared.models import Notification
            from shared.admin_notifications import notify_admin_order_created, send_user_notification
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            # Notify admin
            notify_admin_order_created(order)
            
            # Notification for buyer
            send_user_notification(
                user=order.buyer,
                notification_type='order',
                title='Order Created',
                message=f'Your order {order.order_id} for "{order.product.headline}" has been created. Payment pending.',
                data={
                    'order_id': order.order_id,
                    'product_id': str(order.product.id),
                    'product_headline': order.product.headline,
                    'action_url': f'/buyer/orders'
                }
            )
            
            # Notification for vendor
            send_user_notification(
                user=order.vendor,
                notification_type='order',
                title='New Order Received',
                message=f'New order {order.order_id} from {order.buyer.username} for "{order.product.headline}". Payment pending.',
                data={
                    'order_id': order.order_id,
                    'buyer_username': order.buyer.username,
                    'product_id': str(order.product.id),
                    'product_headline': order.product.headline,
                    'action_url': f'/vendor/orders'
                }
            )
            
            # Send real-time notifications
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Trigger count refresh for relevant users (buyer and vendor)
                    # We rely on send_user_notification and notify_admin_order_created for actual alerts
                    # These manual group_sends are only for the 'refresh_counts' UI trigger
                    try:
                        # Send hidden refresh trigger to buyer
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.buyer.id}',
                            {'type': 'order_notification', 'data': {'action': 'refresh_counts', 'type': 'order', 'hidden': True}}
                        )
                        
                        # Send hidden refresh trigger to vendor
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.vendor.id}',
                            {'type': 'order_notification', 'data': {'action': 'refresh_counts', 'type': 'order', 'hidden': True}}
                        )
                    except Exception as e:
                        logger.error(f"Error sending count refresh notification: {e}")
            except Exception as e:
                logger.error(f"Failed to send real-time notifications: {str(e)}")
                
            logger.info(f"Notifications created for order {order.order_id}")
        except Exception as e:
            logger.error(f"Failed to create notifications for order {order.order_id}: {str(e)}")
        
        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel order and release product"""
        order = self.get_object()
        
        if order.order_status != OrderStatus.PENDING_PAYMENT.value:
            return Response(
                {"error": "Cannot cancel order in current status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Release product quantity
        product = order.product
        product.quantity_available += order.quantity
        if product.status == 'reserved':
            product.status = 'approved'
        product.save()
        
        # Cancel order
        order.order_status = OrderStatus.CANCELLED.value
        order.save()
        
        return Response({"message": "Order cancelled successfully"})
    
    @action(detail=True, methods=['post'])
    def deliver(self, request, pk=None):
        """Deliver product to buyer"""
        order = self.get_object()

        # Allow delivery when:
        # - Normal orders: status must be PAID or CONFIRMED (if marked as completed manually)
        # - Also allow if already DELIVERED or COMPLETED (to update credentials)
        allowed_statuses = [
            OrderStatus.PAID.value, 
            OrderStatus.CONFIRMED.value, 
            OrderStatus.PROCESSING.value,
            OrderStatus.DELIVERED.value,
            'completed' # Legacy/External status support
        ]

        if order.order_status not in allowed_statuses:
            return Response(
                {"error": f"Order cannot be delivered in current status: {order.order_status}. It must be Paid or Processing."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order status
        order.order_status = OrderStatus.DELIVERED.value
        order.delivered_at = timezone.now()
        order.product_credentials = request.data.get('credentials', {})
        order.save()

        # Create notification for buyer
        try:
            from shared.models import Notification
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            Notification.objects.create(
                user=order.buyer,
                type='order',
                title='Product Delivered!',
                message=f'Credentials for "{order.product.headline}" are now available in your order details.',
                data={
                    'order_id': order.order_id,
                    'type': 'order_update',
                    'status': 'delivered'
                }
            )

            # Real-time alert
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{order.buyer.id}',
                    {
                        'type': 'notification',
                        'data': {
                            'title': 'Product Delivered!',
                            'message': f'Credentials for "{order.product.headline}" are now available.'
                        }
                    }
                )
        except Exception as e:
            logger.error(f"Error notifying buyer about delivery: {e}")
            
        return Response({"message": "Order delivered successfully"})

    @action(detail=True, methods=['post'])
    def delete_order(self, request, pk=None):
        """Admin only: delete order permanently and notify participants"""
        # Improved permission check
        is_admin = request.user.user_type == 'admin' or request.user.is_staff
        if not is_admin:
            return Response({'error': 'Unauthorized: Administrator access required'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            order = self.get_object()
        except Exception as e:
            return Response({'error': f'Order not found: {str(e)}'}, status=status.HTTP_404_NOT_FOUND)
            
        reason = request.data.get('reason', '')
        order_id = order.order_id
        
        # Notify buyer and vendor before deletion
        try:
            from shared.models import Notification
            reason_text = f" Reason: {reason}" if reason else ""
            
            # Notify buyer
            Notification.objects.create(
                user=order.buyer,
                type='system',
                title="Order Deleted by Admin",
                message=f"Administrator has deleted your order #{order.order_id}.{reason_text}",
                data={'order_id': order.order_id, 'reason': reason}
            )
            
            # Notify vendor
            Notification.objects.create(
                user=order.vendor,
                type='system',
                title="Order Deleted by Admin",
                message=f"Administrator has deleted order #{order.order_id} involving your product.{reason_text}",
                data={'order_id': order.order_id, 'reason': reason}
            )
        except Exception as e:
            logger.error(f"Error notifying participants about order deletion {order_id}: {e}")
            # Continue with deletion even if notification fails
            
        # Delete the order
        try:
            order.delete()
        except Exception as e:
            logger.error(f"Error deleting order {order_id}: {e}")
            return Response({'error': f'Database error during deletion: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': f'Order {order_id} deleted successfully and participants notified'
        })
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Buyer confirms receipt and releases payment to vendor"""
        order = self.get_object()
        
        # Allow confirmation if order is paid and has credentials (for digital products)
        # Or if order is delivered (for physical products)
        if order.order_status == OrderStatus.PAID.value:
            # For paid orders, check if credentials are available
            # Fix: Allow confirmation without credentials if it's manual delivery
            is_manual = order.product.delivery_method == 'manual' or order.product.delivery_time == 'manual_24h'
            if not order.product_credentials and not is_manual:
                return Response(
                    {"error": "Product credentials not available yet"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif order.order_status == OrderStatus.DELIVERED.value:
            # For delivered orders, allow confirmation
            pass
        elif order.order_status == OrderStatus.DISPUTED.value:
            # Allow confirming disputed orders (Buyer resolves in favor of vendor)
            pass
        else:
            return Response(
                {"error": "Order must be paid (with credentials) or delivered before confirmation"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order status
        order.order_status = OrderStatus.CONFIRMED.value
        order.confirmed_at = timezone.now()
        
        # Auto-resolve dispute if open (Buyer decided to confirm/release)
        if order.dispute_opened:
            try:
                # Use filter().first() to avoid crash if related_name issue (though OneToOne or related_name='dispute' usually works)
                # Model definition says related_name='refund_disputes', but logic in resolve_dispute used order.dispute
                # Let's check model definition again in memory or assume order.dispute works if defined.
                # Actually, earlier view_file of models.py showed related_name='refund_disputes' on order field in OrderDispute.
                # But resolve_dispute used order.dispute.
                # Let's use safe approach: matches = OrderDispute.objects.filter(order=order)
                disputes = OrderDispute.objects.filter(order=order, status__in=['open', 'investigating'])
                for dispute in disputes:
                    dispute.status = 'resolved'
                    dispute.resolution = 'vendor_wins'
                    dispute.resolution_notes = 'Automatically resolved via buyer confirmation'
                    dispute.resolved_at = timezone.now()
                    dispute.save()
            except Exception as e:
                logger.error(f"Failed to auto-resolve dispute for order {order.order_id}: {e}")
                
        order.save()
        
        # Release payment to vendor if escrow was used
        if order.use_escrow:
            try:
                from payments.services import PayoutService
                
                # First ensure escrow payout exists
                payout_service = PayoutService()
                payout_created = payout_service.create_escrow_payout(order.order_id)
                
                if payout_created:
                    # Find the payout and process it immediately
                    from payments.models import Payout
                    payout = Payout.objects.filter(
                        order__order_id=order.order_id,
                        status__in=['pending', 'ready']
                    ).first()
                    
                    if payout:
                        # Process the payout immediately (same as admin release)
                        success = payout_service.process_escrow_payout(payout.id, request.user)
                        if success:
                            logger.info(f"Escrow payout processed immediately for order {order.order_id}")
                        else:
                            logger.error(f"Failed to process escrow payout for order {order.order_id}")
                    else:
                        logger.error(f"Payout not found for order {order.order_id}")
                else:
                    logger.error(f"Failed to create escrow payout for order {order.order_id}")
                    
            except Exception as e:
                logger.error(f"Failed to process escrow payout for order {order.order_id}: {str(e)}")
                # Order is still confirmed, but payment release failed
                # This should be handled by admin or retry mechanism
        
        return Response({"message": "Order confirmed successfully"})
    
    @action(detail=True, methods=['post'])
    def dispute(self, request, pk=None):
        """Open dispute for order"""
        order = self.get_object()
        
        if not order.can_dispute:
            return Response(
                {"error": "Dispute period has expired (48 hours from delivery)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if order.dispute_opened:
            return Response(
                {"error": "Dispute already opened for this order"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create dispute
        dispute_data = {
            'order': order,
            'reason': request.data.get('reason', ''),
            'evidence': request.data.get('evidence', {})
        }
        
        dispute = OrderDispute.objects.create(**dispute_data)
        
        # Update order
        order.dispute_opened = True
        order.dispute_opened_at = timezone.now()
        order.order_status = OrderStatus.DISPUTED.value
        order.save()
        
        return Response(
            OrderDisputeSerializer(dispute).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def resolve_dispute(self, request, pk=None):
        """Admin resolves dispute"""
        order = self.get_object()
        
        if not order.dispute_opened:
            return Response(
                {"error": "No dispute found for this order"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resolution = request.data.get('resolution')
        notes = request.data.get('notes', '')
        
        if resolution not in ['buyer_wins', 'vendor_wins', 'partial_refund']:
            return Response(
                {"error": "Invalid resolution"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update dispute
        dispute = order.dispute
        dispute.resolution = resolution
        dispute.resolution_notes = notes
        dispute.resolved_by = request.user
        dispute.resolved_at = timezone.now()
        dispute.save()
        
        # Update order based on resolution
        if resolution == 'buyer_wins':
            order.order_status = OrderStatus.REFUNDED.value
        elif resolution == 'vendor_wins':
            order.order_status = OrderStatus.CONFIRMED.value
            order.confirmed_at = timezone.now()
        
        order.save()
        
        return Response({"message": "Dispute resolved successfully"})
    
    @action(detail=True, methods=['post'], url_path='expire_order')
    def expire_order(self, request, pk=None):
        """Expire an order due to payment timeout - AGGRESSIVE: Accepts order from URL"""
        try:
            # Get order by primary key (ID) from URL
            try:
                order = Order.objects.get(id=pk)
            except Order.DoesNotExist:
                # Fallback: try to get by order_id from request data
                order_id = request.data.get('order_id')
                if order_id:
                    try:
                        order = Order.objects.get(order_id=order_id)
                    except Order.DoesNotExist:
                        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
                else:
                    return Response(
                        {"error": "Order not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # SECURITY FIX: Ensure requestor has permission
            is_admin = hasattr(request.user, 'user_type') and request.user.user_type == 'admin'
            if order.buyer != request.user and order.vendor != request.user and not is_admin:
                 return Response(
                    {'error': 'Permission denied.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # AGGRESSIVE: Allow expiration even if status is not exactly PENDING_PAYMENT
            # Check if order is in any pending state
            is_pending = (
                order.order_status == OrderStatus.PENDING_PAYMENT.value or
                order.order_status == OrderStatus.PENDING.value or
                (order.payment_status in ['pending', 'pending_payment'])
            )
            
            if not is_pending and order.order_status != OrderStatus.CANCELLED.value:
                # If already cancelled, just return success
                if order.order_status == OrderStatus.CANCELLED.value:
                    return Response({
                        "message": "Order already expired",
                        "order": OrderSerializer(order).data
                    })
                return Response(
                    {"error": f"Order is not in pending state. Current status: {order.order_status}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update order status to cancelled/expired
            order.order_status = OrderStatus.CANCELLED.value
            order.payment_status = 'expired'
            order.save()
            
            # Release product quantity
            product = order.product
            product.quantity_available += order.quantity
            if product.status == 'reserved':
                product.status = 'approved'
            product.save()
            
            # Create notifications for buyer, vendor, and admin
            try:
                from shared.models import Notification
                from shared.admin_notifications import notify_admin_order_expired, send_user_notification
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                
                # Notify admin
                notify_admin_order_expired(order)
                
                # Notification for buyer
                # Notify buyer
                send_user_notification(
                    user=order.buyer,
                    notification_type='order_status_changed',
                    title='Order Expired',
                    message=f'Your order {order.order_id} for "{order.product.headline}" has expired because payment was not completed within the time limit. You can create a new order.',
                    data={
                        'order_id': order.order_id,
                        'product_id': str(order.product.id),
                        'product_headline': order.product.headline,
                        'action_url': f'/buyer/orders'
                    }
                )
                
                # Notify vendor
                send_user_notification(
                    user=order.vendor,
                    notification_type='order_status_changed',
                    title='Order Expired',
                    message=f'Order {order.order_id} from {order.buyer.username} for "{order.product.headline}" has expired because the buyer did not complete payment within the time limit.',
                    data={
                        'order_id': order.order_id,
                        'buyer_username': order.buyer.username,
                        'product_id': str(order.product.id),
                        'product_headline': order.product.headline,
                        'action_url': f'/vendor/orders'
                    }
                )
                
                logger.info(f"Order expiration notifications created for order {order.order_id}")
            except Exception as e:
                logger.error(f"Failed to create expiration notifications for order {order.order_id}: {str(e)}")
            
            logger.info(f"Order {order.order_id} expired successfully")
            
            return Response({
                'success': True,
                'message': 'Order expired successfully',
                'order_id': order.order_id
            })
            
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error expiring order: {str(e)}")
            return Response(
                {"error": "Failed to expire order"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def find_by_payment_address(self, request):
        """Find order by payment address (for payment testing)"""
        payment_address = request.data.get('address', '').strip()
        
        if not payment_address:
            return Response(
                {"error": "Payment address is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find payment address first
            payment_addr = PaymentAddress.objects.filter(payment_address=payment_address).first()
            
            if not payment_addr:
                return Response(
                    {"error": "Payment address not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Find order by order_id from payment address
            order = Order.objects.filter(order_id=payment_addr.order_id).first()
            
            if not order:
                return Response(
                    {"error": "Order not found for this payment address"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(OrderSerializer(order).data)
            
        except Exception as e:
            logger.error(f"Error finding order by payment address: {str(e)}")
            return Response(
                {"error": "Failed to find order"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_admin_stats(self, days_range=30):
        """Helper to get comprehensive admin statistics with PARALLEL execution"""
        from django.apps import apps
        from django.db.models import Sum, Count, Q
        from concurrent.futures import ThreadPoolExecutor
        from django.db import connection
        
        User = apps.get_model('users', 'User')
        VendorApplication = apps.get_model('vendors', 'VendorApplication')
        Product = apps.get_model('products', 'Product')
        
        now = timezone.now()
        start_total = time.time()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        last_month_start = today_start - timedelta(days=30)
        prev_month_start = last_month_start - timedelta(days=30)

        def run_query(func, label=""):
            q_start = time.time()
            try:
                res = func()
                from django.db import close_old_connections
                close_old_connections()
                duration = time.time() - q_start
                logger.info(f"[PERF] Dashboard Query {label}: {duration:.4f}s")
                return res
            except Exception as e:
                logger.error(f"[PERF] Dashboard Query {label} FAILED: {str(e)}")
                from django.db import close_old_connections
                close_old_connections()
                return {}

        with ThreadPoolExecutor(max_workers=5) as executor:
            # 1. User Stats
            f1 = executor.submit(run_query, lambda: User.objects.filter(is_deleted=False).aggregate(
                total=Count('id'),
                total_buyers=Count('id', filter=Q(user_type='buyer')),
                total_vendors=Count('id', filter=Q(user_type='vendor')),
                last_month=Count('id', filter=Q(date_joined__gte=last_month_start)),
                prev_month=Count('id', filter=Q(date_joined__gte=prev_month_start, date_joined__lt=last_month_start))
            ))
            
            # 2. Vendor Stats
            f2 = executor.submit(run_query, lambda: VendorApplication.objects.aggregate(
                active=Count('id', filter=Q(status='approved')),
                last_month=Count('id', filter=Q(status='approved', updated_at__gte=last_month_start)),
                prev_month=Count('id', filter=Q(status='approved', updated_at__gte=prev_month_start, updated_at__lt=last_month_start))
            ))

            # 3. Listing Stats
            f3 = executor.submit(run_query, lambda: Product.objects.filter(is_deleted=False).aggregate(
                live=Count('id', filter=Q(status='approved', is_active=True)),
                last_month=Count('id', filter=Q(status='approved', created_at__gte=last_month_start)),
                prev_month=Count('id', filter=Q(status='approved', created_at__gte=prev_month_start, created_at__lt=last_month_start))
            ))

            # 4. Order Stats
            f4 = executor.submit(run_query, lambda: Order.objects.aggregate(
                total=Count('id'),
                today=Count('id', filter=Q(created_at__gte=today_start)),
                yesterday=Count('id', filter=Q(created_at__gte=yesterday_start, created_at__lt=today_start)),
                completed_today=Count('id', filter=Q(
                    Q(order_status__in=[OrderStatus.PAID.value, OrderStatus.DELIVERED.value, OrderStatus.CONFIRMED.value]) |
                    Q(payment_status='paid'),
                    created_at__gte=today_start
                )),
                disputed=Count('id', filter=Q(order_status=OrderStatus.DISPUTED.value)),
                pending_payments=Count('id', filter=Q(
                    Q(order_status=OrderStatus.PENDING_PAYMENT.value) |
                    Q(payment_status='pending') |
                    (Q(use_escrow=True) & ~Q(order_status__in=[
                        OrderStatus.CONFIRMED.value, OrderStatus.CANCELLED.value, OrderStatus.REFUNDED.value, OrderStatus.PAID.value
                    ]))
                ))
            ), "Orders")

            # 5. Escrow Volume (Highly Optimized SQL-only version)
            from payments.models import Payout, DirectPayment
            
            def get_escrow_volume():
                try:
                    # Orders in system but payout not finished
                    # Only calculate on the currency we care about
                    active_escrow_orders = Order.objects.filter(use_escrow=True).exclude(
                        order_status__in=[OrderStatus.CANCELLED.value, OrderStatus.REFUNDED.value, OrderStatus.PENDING_PAYMENT.value]
                    ).exclude(
                        Q(order_status=OrderStatus.CONFIRMED.value) &
                        (Q(payouts__status='completed') | Q(direct_payment__status='completed'))
                    ).distinct()
                    
                    totals = list(active_escrow_orders.values('crypto_currency').annotate(total=Sum('total_amount')))
                    return totals
                except:
                    return []

            f5 = executor.submit(run_query, get_escrow_volume, "EscrowVol")

            # 6. Escrow Pipeline Counts (Optimized SQL-only version)
            def get_pipeline_counts():
                try:
                    # Pending Releases
                    pending_releases = Order.objects.filter(
                        order_status=OrderStatus.CONFIRMED.value, 
                        use_escrow=True
                    ).exclude(
                        Q(payouts__status='completed') | 
                        Q(direct_payment__status='completed')
                    ).distinct().count()
                    
                    # Auto-Release
                    auto_release = Order.objects.filter(order_status=OrderStatus.DELIVERED.value, use_escrow=True).count()
                    
                    return {'pending': pending_releases, 'auto': auto_release}
                except:
                    return {'pending': 0, 'auto': 0}

            f6 = executor.submit(run_query, get_pipeline_counts, "Pipeline")

            user_stats = f1.result()
            vendor_stats = f2.result()
            listing_stats = f3.result()
            order_stats_agg = f4.result()
            escrow_totals = f5.result()
            pipeline_counts = f6.result()

        logger.info(f"[PERF] Dashboard parallel block took: {time.time() - start_total:.4f}s")

        # Growth calculations
        user_growth = ((user_stats.get('last_month', 0) - user_stats.get('prev_month', 0)) / user_stats.get('prev_month', 1)) * 100 if user_stats.get('prev_month', 0) > 0 else 100
        vendor_growth = ((vendor_stats.get('last_month', 0) - vendor_stats.get('prev_month', 0)) / vendor_stats.get('prev_month', 1)) * 100 if vendor_stats.get('prev_month', 0) > 0 else 100
        listing_growth = ((listing_stats.get('last_month', 0) - listing_stats.get('prev_month', 0)) / listing_stats.get('prev_month', 1)) * 100 if listing_stats.get('prev_month', 0) > 0 else 100
        order_growth_daily = ((order_stats_agg.get('today', 0) - order_stats_agg.get('yesterday', 0)) / order_stats_agg.get('yesterday', 1)) * 100 if order_stats_agg.get('yesterday', 0) > 0 else 100

        total_escrow_btc = next((float(t['total'] or 0) for t in escrow_totals if t['crypto_currency'] == 'BTC'), 0.0)
        total_escrow_xmr = next((float(t['total'] or 0) for t in escrow_totals if t['crypto_currency'] == 'XMR'), 0.0)

        return {
            'statistics': {
                'users': {'total': user_stats.get('total', 0), 'buyers': user_stats.get('total_buyers', 0), 'vendors': user_stats.get('total_vendors', 0), 'growth_pct': round(user_growth, 1)},
                'vendors': {'total': vendor_stats.get('active', 0), 'growth_pct': round(vendor_growth, 1)},
                'listings': {'total': listing_stats.get('live', 0), 'growth_pct': round(listing_growth, 1)},
                'orders': {'today': order_stats_agg.get('today', 0), 'yesterday': order_stats_agg.get('yesterday', 0), 'growth_pct': round(order_growth_daily, 1)},
                'total_orders': order_stats_agg.get('total', 0),
                'paid_orders': order_stats_agg.get('completed_today', 0),
                'pending_payments': order_stats_agg.get('pending_payments', 0),
                'disputed_orders': order_stats_agg.get('disputed', 0)
            },
            'escrow_stats': {
                'btc_total': total_escrow_btc,
                'xmr_total': total_escrow_xmr,
                'pending_releases': pipeline_counts.get('pending', 0),
                'auto_release_orders': pipeline_counts.get('auto', 0),
                'disputed_orders': order_stats_agg.get('disputed', 0)
            }
        }

    @action(detail=False, methods=['get'])
    def admin_dashboard(self, request):
        """Admin dashboard with comprehensive statistics (optimized with caching)"""
        if not (request.user.is_staff or request.user.user_type == 'admin'):
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            full_start = time.time()
            from django.apps import apps
            from django.db.models import Sum, Count, F
            from django.db.models.functions import TruncDate
            
            # 1. Cache with Bypass support (300s TTL for production)
            days_range = int(request.query_params.get('days', 30))
            if days_range not in [7, 30, 90]: days_range = 30
            
            force_refresh = request.query_params.get('refresh') == 'true'
            
            cache_key = f"admin_dashboard_realtime_{days_range}"
            if not force_refresh:
                cached_data = cache.get(cache_key)
                if cached_data:
                    # Add live orders to cached stats for freshness
                    recent_orders = self.get_queryset()[:6]
                    cached_data['recent_orders'] = AdminDashboardOrderSerializer(recent_orders, many=True).data
                    return Response(cached_data)

            # Get stats from helper if cache expired
            all_stats = self._get_admin_stats(days_range)
            
            # 3. Chart Data (Parallelized for Speed)
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            chart_start_date = today_start - timedelta(days=days_range - 1)
            
            from concurrent.futures import ThreadPoolExecutor
            from django.db import connection

            def get_daily_counts(model_class, date_field):
                q_start = time.time()
                try:
                    res = model_class.objects.filter(**{f"{date_field}__gte": chart_start_date}).annotate(
                        date=TruncDate(date_field)
                    ).values('date').annotate(count=Count('id')).order_by('date')
                    res_list = list(res)
                    from django.db import close_old_connections
                    close_old_connections()
                    logger.info(f"[PERF] Chart Query {model_class.__name__}: {time.time() - q_start:.4f}s")
                    return res_list
                except Exception as e:
                    logger.error(f"[PERF] Chart Query {model_class.__name__} FAILED: {str(e)}")
                    from django.db import close_old_connections
                    close_old_connections()
                    return []

            User = apps.get_model('users', 'User')
            Product = apps.get_model('products', 'Product')

            with ThreadPoolExecutor(max_workers=3) as executor:
                f_orders = executor.submit(get_daily_counts, Order, 'created_at')
                f_users = executor.submit(get_daily_counts, User, 'date_joined')
                f_products = executor.submit(get_daily_counts, Product, 'created_at')
                
                order_dict = {str(s['date']): s['count'] for s in f_orders.result()}
                user_dict = {str(s['date']): s['count'] for s in f_users.result()}
                product_dict = {str(s['date']): s['count'] for s in f_products.result()}
            
            logger.info(f"[PERF] Dashboard chart block took: {time.time() - full_start:.4f}s")
            
            chart_data = []
            for i in range(days_range - 1, -1, -1):
                date_str = (today_start - timedelta(days=i)).strftime('%Y-%m-%d')
                chart_data.append({
                    'date': date_str,
                    'orders': order_dict.get(date_str, 0),
                    'users': user_dict.get(date_str, 0),
                    'listings': product_dict.get(date_str, 0)
                })
            
            # Prepare Full Response & Save to 5-minute cache
            full_response = {
                **all_stats,
                'chart_data': chart_data,
            }
            cache.set(cache_key, full_response, 300)
            
            # 6. Recent Orders (Live & Optimized)
            recent_orders = self.get_queryset()[:6]
            full_response['recent_orders'] = AdminDashboardOrderSerializer(recent_orders, many=True).data
            
            total_duration = time.time() - full_start
            logger.info(f"[PERF] Dashboard total processing time: {total_duration:.4f}s")
            full_response['execution_time'] = f"{total_duration:.4f}s"
            
            return Response(full_response)
        except Exception as e:
            logger.error(f"Error generating admin dashboard: {str(e)}")
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['get'])
    def orders_page_aggregated(self, request):
        """Aggregated endpoint for Admin Orders page: stats + orders list (optimized with cache)"""
        if not (request.user.is_staff or request.user.user_type == 'admin'):
            return Response({"error": "Admin access required"}, status=403)
            
        try:
            # 1. Get stats (Small 15s debounce for performance)
            cache_key = 'admin_orders_stats_realtime_debu'
            all_stats = cache.get(cache_key)
            if not all_stats:
                all_stats = self._get_admin_stats(30)
                cache.set(cache_key, all_stats, 15)
            
            # 2. Get filtered/paginated orders
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                response = self.get_paginated_response(serializer.data)
                response.data['statistics_summary'] = all_stats.get('statistics', {})
                response.data['escrow_summary'] = all_stats.get('escrow_stats', {})
                return response

            serializer = self.get_serializer(queryset, many=True)
            return Response({
                **all_stats,
                'results': serializer.data
            })
        except Exception as e:
            logger.error(f"Error in orders_page_aggregated: {str(e)}")
            return Response({"error": str(e)}, status=500)
    
    def _get_payment_service(self, crypto_currency):
        """Get appropriate payment service"""
        if crypto_currency == 'BTC':
            return BTCPayServerService()
        elif crypto_currency == 'XMR':
            return MoneroRPCService()
        return None 
    
    @action(detail=True, methods=['post'])
    def confirm_payment_success(self, request, pk=None):
        """Handle payment success and reveal credentials"""
        from shared.admin_notifications import notify_admin_payment_received
        try:
            order = self.get_object()
            
            # Update order status - using premium status labels
            order.payment_status = 'paid'
            if order.product.delivery_time == 'instant_auto':
                order.order_status = OrderStatus.CONFIRMED.value # Shows as "Completed"
            else:
                order.order_status = OrderStatus.PAID.value
            order.payment_confirmed_at = timezone.now()
            order.save()
            
            # Notify admin about payment received
            try:
                notify_admin_payment_received(order, order)
            except Exception as e:
                logger.error(f"Failed to notify admin about payment: {e}")
            
            # Handle credentials based on escrow status
            if order.use_escrow:
                if order.product.credentials:
                    order.product_credentials = {
                        'credentials': order.product.credentials,
                        'delivered_at': timezone.now().isoformat(),
                        'delivery_method': order.product.delivery_time,
                        'additional_info': order.product.additional_info or '',
                        'notes': order.product.notes_for_buyer or '',
                        'escrow_status': 'Payment held in escrow until buyer confirmation'
                    }
                    order.save()
                    order.product.credentials_visible = True
                    order.product.save()
                
                logger.info(f"Payment confirmed for escrow order {order.order_id} - credentials revealed, payment held")
                
                response_data = {
                    'success': True,
                    'message': 'Payment confirmed and credentials delivered. Payment held in escrow until you confirm receipt.',
                    'order_id': order.order_id,
                    'credentials': order.product_credentials,
                    'order_status': order.order_status,
                    'escrow_enabled': True
                }

            else:
                if order.product.credentials:
                    order.product_credentials = {
                        'credentials': order.product.credentials,
                        'delivered_at': timezone.now().isoformat(),
                        'delivery_method': order.product.delivery_time,
                        'additional_info': order.product.additional_info or '',
                        'notes': order.product.notes_for_buyer or ''
                    }
                    order.save()
                    order.product.credentials_visible = True
                    order.product.save()
                
                logger.info(f"Payment confirmed and credentials revealed for non-escrow order {order.order_id}")
                
                response_data = {
                    'success': True,
                    'message': 'Payment confirmed and credentials delivered',
                    'order_id': order.order_id,
                    'credentials': order.product_credentials,
                    'order_status': order.order_status,
                    'escrow_enabled': False
                }

            # Return success response
            return Response(response_data)

        except Order.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            logger.error(f"Payment confirmation error: {str(e)}")
            return Response(
                {'success': False, 'error': 'Failed to confirm payment'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        finally:
            # After response prep, schedule review prompt in ~3 minutes for buyer using Celery
            try:
                from .tasks import send_review_prompt_task
                send_review_prompt_task.apply_async(
                    args=[order.buyer.id, order.product.id, order.order_id],
                    countdown=60  # 1 minute delay
                )
                logger.info(f"Scheduled review prompt for order {order.order_id} in 3 minutes")
            except Exception as e:
                logger.error(f"Failed to schedule review prompt for order {order.order_id}: {str(e)}")


    @action(detail=False, methods=['post'])
    def test_review_notification(self, request):
        """Test endpoint to manually trigger review notification"""
        try:
            order_id = request.data.get('order_id')
            if not order_id:
                return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            order = Order.objects.get(order_id=order_id)
            
            # Schedule review prompt immediately (no delay for testing)
            from .tasks import send_review_prompt_task
            send_review_prompt_task.apply_async(
                args=[order.buyer.id, order.product.id, order.order_id],
                countdown=5  # 5 seconds delay for testing
            )
            
            return Response({
                'success': True,
                'message': f'Review notification scheduled for order {order_id}',
                'buyer_id': order.buyer.id,
                'product_id': order.product.id
            })
            
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error testing review notification: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def get_credentials(self, request, pk=None):
        """Get credentials for a paid order"""
        try:
            order = self.get_object()
            
            # Check if user has permission to view credentials
            if request.user != order.buyer and request.user != order.vendor:
                return Response(
                    {'success': False, 'error': 'Permission denied'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if order is paid
            if order.order_status != OrderStatus.PAID.value:
                return Response(
                    {'success': False, 'error': 'Order not paid yet'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'success': True,
                'credentials': order.product_credentials,
                'order_status': order.order_status,
                'delivered_at': order.payment_confirmed_at
            })
            
        except Order.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Get credentials error: {str(e)}")
            return Response(
                {'success': False, 'error': 'Failed to get credentials'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RefundRequestAPIView(APIView):
    """Create a refund request (vendor initiates)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
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
            
            # Get order - IMPORTANT: Use correct field name
            # Try both order_id (string) and id (UUID) depending on your model
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                try:
                    order = Order.objects.get(id=order_id)
                except Order.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': f'Order {order_id} not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify vendor ownership
            if order.vendor != request.user:
                return Response({
                    'success': False,
                    'message': 'You can only request refunds for your own orders'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if order is completed or processing
            if order.order_status not in ['completed', 'paid', 'processing', 'delivered']:
                return Response({
                    'success': False,
                    'message': f'Cannot refund orders with status: {order.order_status}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate refund type and amount
            if refund_type == 'partial':
                if not amount:
                    return Response({
                        'success': False,
                        'message': 'Amount is required for partial refunds'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    refund_amount = float(amount)
                    order_amount = float(order.total_amount)
                    
                    if refund_amount <= 0 or refund_amount > order_amount:
                        return Response({
                            'success': False,
                            'message': f'Refund amount must be between 0 and {order_amount}'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except ValueError:
                    return Response({
                        'success': False,
                        'message': 'Invalid amount format'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                refund_amount = order.total_amount
            
            # Check for duplicate pending refund
            existing_refund = RefundRequest.objects.filter(
                order=order,
                status__in=['pending', 'approved']
            ).first()
            
            if existing_refund:
                return Response({
                    'success': False,
                    'message': f'A refund request already exists for this order (Status: {existing_refund.status})'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create refund request - Use order object, NOT order_id
            refund = RefundRequest.objects.create(
                order=order,  # ✅ Pass ORDER OBJECT, not order_id string
                vendor=request.user,
                amount=refund_amount,
                refund_type=refund_type,
                reason=reason,
                notes=notes,
                status='pending'
            )
            
            # Send admin notification via central helper
            try:
                from shared.admin_notifications import send_admin_notification
                send_admin_notification(
                    notification_type='refund',
                    title='New Refund Request',
                    message=f'Vendor {request.user.username} requested a {refund_type} refund for order {order.order_id}',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': str(order.id),
                        'vendor_username': request.user.username,
                        'amount': str(refund_amount),
                        'action_url': '/admin/refunds'
                    },
                    priority='normal'
                )
            except Exception as e:
                logger.error(f"Failed to send admin notification for refund: {str(e)}")
            
            return Response({
                'success': True,
                'message': 'Refund request submitted successfully',
                'refund': {
                    'id': str(refund.id),
                    'order_id': str(order.id),
                    'amount': str(refund.amount),
                    'refund_type': refund.refund_type,
                    'status': refund.status,
                    'created_at': refund.created_at.isoformat()
                }
            }, status=status.HTTP_201_CREATED)
        
        except Order.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Refund request error: {str(e)}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorRefundsAPIView(APIView):
    """Get vendor's refund requests"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 10))
            status_filter = request.query_params.get('status', None)
            
            # Filter refunds for this vendor
            refunds = RefundRequest.objects.filter(vendor=request.user).order_by('-created_at')
            
            if status_filter:
                refunds = refunds.filter(status=status_filter)
            
            # Pagination
            total = refunds.count()
            start = (page - 1) * limit
            end = start + limit
            refunds_page = refunds[start:end]
            
            data = []
            for refund in refunds_page:
                data.append({
                    'id': str(refund.id),
                    'order_id': refund.order.order_id,
                    'buyer': refund.order.buyer.username,
                    'amount': str(refund.amount),
                    'crypto_currency': str(refund.order.crypto_currency),
                    'reason': refund.reason,
                    'refund_type': refund.refund_type,
                    'status': refund.status,
                    'created_at': refund.created_at.isoformat(),
                    'updated_at': refund.updated_at.isoformat(),
                    'completed_at': refund.completed_at.isoformat() if refund.completed_at else None
                })
            
            return Response({
                'success': True,
                'data': data,
                'total': total
            })
        
        except Exception as e:
            logger.error(f"Get vendor refunds error: {str(e)}")
            return Response({
                'success': False,
                'message': str(e),
                'data': [],
                'total': 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorRefundStatsAPIView(APIView):
    """Get vendor's refund statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            refunds = RefundRequest.objects.filter(vendor=request.user)
            
            total_refunds = refunds.count()
            pending_refunds = refunds.filter(status='pending').count()
            completed_refunds = refunds.filter(status='completed').count()
            
            total_refunded = refunds.filter(
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            return Response({
                'success': True,
                'total_refunds': total_refunds,
                'pending_refunds': pending_refunds,
                'completed_refunds': completed_refunds,
                'total_refunded_amount': str(total_refunded)
            })
        
        except Exception as e:
            logger.error(f"Get refund stats error: {str(e)}")
            return Response({
                'success': False,
                'total_refunds': 0,
                'pending_refunds': 0,
                'completed_refunds': 0,
                'total_refunded_amount': '0'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)