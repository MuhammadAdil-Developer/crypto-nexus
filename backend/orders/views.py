from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import Order, OrderDispute, OrderStatus
from .serializers import (
    OrderSerializer, CreateOrderSerializer, UpdateOrderStatusSerializer,
    OrderDisputeSerializer
)
from payments.services import BTCPayServerService, MoneroRPCService
from payments.models import PaymentStatus, PaymentAddress, RefundRequest
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from payments.models import RefundRequest
from django.db.models import Sum

import logging

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for order management"""
    
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter orders based on user role"""
        user = self.request.user
        
        if user.is_staff or user.user_type == 'admin':  # Admin can see all orders
            return Order.objects.all()
        elif user.user_type == 'vendor':  # Vendor can see their orders
            return Order.objects.filter(vendor=user)
        else:  # Buyer can see their orders
            return Order.objects.filter(buyer=user)
    
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
        
        # Generate payment address using PaymentService
        try:
            from payments.services import PaymentService
            payment_service = PaymentService()
            
            payment_address = payment_service.create_payment_address(
                order_id=order.order_id,
                crypto_currency=order.crypto_currency,
                amount=order.total_amount,
                payment_type='wallet',
                use_escrow=order.use_escrow
            )
            
            # Update order with payment address
            order.payment_address = payment_address.payment_address
            order.payment_expires_at = payment_address.expires_at
            order.save()
            
            logger.info(f"Order {order.order_id} created successfully with payment address")
            
        except Exception as e:
            logger.error(f"Payment address generation failed for order {order.order_id}: {str(e)}")
            # Order is still created but without payment address
            # This will be handled by the frontend
        
        # Create notifications for buyer, vendor, and admin
        try:
            from shared.models import Notification
            from shared.admin_notifications import notify_admin_order_created
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            # Notify admin
            notify_admin_order_created(order)
            
            # Notification for buyer
            Notification.objects.create(
                user=order.buyer,
                type='order',
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
            Notification.objects.create(
                user=order.vendor,
                type='order',
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
                    # Send to buyer
                    async_to_sync(channel_layer.group_send)(
                        f'realtime_{order.buyer.id}',
                        {
                            'type': 'order_notification',
                            'data': {
                                'order_id': order.order_id,
                                'type': 'order_created',
                                'title': 'Order Created',
                                'message': f'Your order {order.order_id} for "{order.product.headline}" has been created. Payment pending.',
                                'product_headline': order.product.headline
                            }
                        }
                    )
                    
                    # Send to vendor
                    async_to_sync(channel_layer.group_send)(
                        f'realtime_{order.vendor.id}',
                        {
                            'type': 'order_notification',
                            'data': {
                                'order_id': order.order_id,
                                'type': 'order_created',
                                'title': 'New Order Received',
                                'message': f'New order {order.order_id} from {order.buyer.username} for "{order.product.headline}". Payment pending.',
                                'buyer_username': order.buyer.username,
                                'product_headline': order.product.headline,
                                'count_refresh': True  # Trigger count refresh
                            }
                        }
                    )
                    
                    # Trigger count refresh for all users (admin/vendor/buyer) when order is created
                    # Send count refresh notifications to buyer, vendor, and all admins
                    try:
                        # Send to buyer
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.buyer.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': f'count_refresh_order_{order.id}',
                                    'type': 'system',
                                    'title': 'Count Refresh',
                                    'message': 'Order count updated',
                                    'is_read': False,
                                    'data': {
                                        'action': 'refresh_counts',
                                        'type': 'order'
                                    },
                                    'action_url': '',
                                    'created_at': order.created_at.isoformat(),
                                    'priority': 'low'
                                }
                            }
                        )
                        
                        # Send to vendor
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.vendor.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': f'count_refresh_order_{order.id}',
                                    'type': 'system',
                                    'title': 'Count Refresh',
                                    'message': 'Order count updated',
                                    'is_read': False,
                                    'data': {
                                        'action': 'refresh_counts',
                                        'type': 'order'
                                    },
                                    'action_url': '',
                                    'created_at': order.created_at.isoformat(),
                                    'priority': 'low'
                                }
                            }
                        )
                        
                        # Send to all admins
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        admin_users = User.objects.filter(user_type='admin', is_active=True)
                        for admin_user in admin_users:
                            async_to_sync(channel_layer.group_send)(
                                f'realtime_{admin_user.id}',
                                {
                                    'type': 'order_notification',
                                    'data': {
                                        'id': f'count_refresh_order_{order.id}',
                                        'type': 'system',
                                        'title': 'Count Refresh',
                                        'message': 'Order count updated',
                                        'is_read': False,
                                        'data': {
                                            'action': 'refresh_counts',
                                            'type': 'order'
                                        },
                                        'action_url': '',
                                        'created_at': order.created_at.isoformat(),
                                        'priority': 'low'
                                    }
                                }
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
        
        if order.order_status != OrderStatus.PAID.value:
            return Response(
                {"error": "Order must be paid before delivery"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order status
        order.order_status = OrderStatus.DELIVERED.value
        order.delivered_at = timezone.now()
        order.product_credentials = request.data.get('credentials', {})
        order.save()
        
        return Response({"message": "Product delivered successfully"})
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Buyer confirms receipt and releases payment to vendor"""
        order = self.get_object()
        
        # Allow confirmation if order is paid and has credentials (for digital products)
        # Or if order is delivered (for physical products)
        if order.order_status == OrderStatus.PAID.value:
            # For paid orders, check if credentials are available
            if not order.product_credentials:
                return Response(
                    {"error": "Product credentials not available yet"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif order.order_status == OrderStatus.DELIVERED.value:
            # For delivered orders, allow confirmation
            pass
        else:
            return Response(
                {"error": "Order must be paid (with credentials) or delivered before confirmation"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order status
        order.order_status = OrderStatus.CONFIRMED.value
        order.confirmed_at = timezone.now()
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
                    order = Order.objects.get(order_id=order_id)
                else:
                    return Response(
                        {"error": "Order not found"},
                        status=status.HTTP_404_NOT_FOUND
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
                from shared.admin_notifications import notify_admin_order_expired
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                
                # Notify admin
                notify_admin_order_expired(order)
                
                # Notification for buyer
                Notification.objects.create(
                    user=order.buyer,
                    type='order',
                    title='Order Expired',
                    message=f'Your order {order.order_id} for "{order.product.headline}" has expired because payment was not completed within the time limit. You can create a new order.',
                    data={
                        'order_id': order.order_id,
                        'product_id': str(order.product.id),
                        'product_headline': order.product.headline,
                        'action_url': f'/buyer/orders'
                    }
                )
                
                # Notification for vendor
                Notification.objects.create(
                    user=order.vendor,
                    type='order',
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
                
                # Send real-time notifications
                try:
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        # Send to buyer
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.buyer.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'order_id': order.order_id,
                                    'type': 'order_expired',
                                    'title': 'Order Expired',
                                    'message': f'Your order {order.order_id} for "{order.product.headline}" has expired because payment was not completed within the time limit.',
                                    'product_headline': order.product.headline
                                }
                            }
                        )
                        
                        # Send to vendor
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.vendor.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'order_id': order.order_id,
                                    'type': 'order_expired',
                                    'title': 'Order Expired',
                                    'message': f'Order {order.order_id} from {order.buyer.username} for "{order.product.headline}" has expired because the buyer did not complete payment within the time limit.',
                                    'buyer_username': order.buyer.username,
                                    'product_headline': order.product.headline
                                }
                            }
                        )
                except Exception as e:
                    logger.error(f"Failed to send real-time expiration notifications: {str(e)}")
                
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

    @action(detail=False, methods=['get'])
    def admin_dashboard(self, request):
        """Admin dashboard with order statistics"""
        if not (request.user.is_staff or request.user.user_type == 'admin'):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get order statistics
        total_orders = Order.objects.count()
        pending_payments = Order.objects.filter(
            order_status=OrderStatus.PENDING_PAYMENT.value
        ).count()
        paid_orders = Order.objects.filter(
            order_status=OrderStatus.PAID.value
        ).count()
        disputed_orders = Order.objects.filter(
            order_status=OrderStatus.DISPUTED.value
        ).count()
        
        # Recent orders
        recent_orders = Order.objects.order_by('-created_at')[:10]
        
        return Response({
            'statistics': {
                'total_orders': total_orders,
                'pending_payments': pending_payments,
                'paid_orders': paid_orders,
                'disputed_orders': disputed_orders,
            },
            'recent_orders': OrderSerializer(recent_orders, many=True).data
        })
    
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
            
            # Update order status to paid
            order.order_status = OrderStatus.PAID.value
            order.payment_status = 'paid'
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
            
            # Send admin notification
            try:
                from shared.models import Notification
                Notification.objects.create(
                    user_id=1,
                    type='refund',
                    title='New Refund Request',
                    message=f'Vendor {request.user.username} requested a {refund_type} refund for order {order.order_id}',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': str(order.id),
                        'vendor_username': request.user.username,
                        'amount': str(refund_amount),
                        'action_url': '/admin/refunds'
                    }
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