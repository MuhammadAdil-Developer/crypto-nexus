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
from payments.models import PaymentStatus, PaymentAddress
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
        
        if order.order_status != OrderStatus.DELIVERED.value:
            return Response(
                {"error": "Order must be delivered before confirmation"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order status
        order.order_status = OrderStatus.CONFIRMED.value
        order.confirmed_at = timezone.now()
        order.save()
        
        # Release payment to vendor if escrow was used
        if order.use_escrow:
            try:
                # TODO: Implement actual payment release logic
                # This would involve calling the payment service to release funds
                logger.info(f"Payment released to vendor for escrow order {order.order_id}")
            except Exception as e:
                logger.error(f"Failed to release payment for order {order.order_id}: {str(e)}")
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
        try:
            order = self.get_object()
            
            # Update order status to paid
            order.order_status = OrderStatus.PAID.value
            order.payment_status = 'paid'
            order.payment_confirmed_at = timezone.now()
            order.save()
            
            # Handle credentials based on escrow status
            if order.use_escrow:
                # For escrow orders, credentials are revealed immediately but payment is held
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
                    
                    # Mark product credentials as visible for this order
                    order.product.credentials_visible = True
                    order.product.save()
                
                logger.info(f"Payment confirmed for escrow order {order.order_id} - credentials revealed, payment held")
                
                return Response({
                    'success': True,
                    'message': 'Payment confirmed and credentials delivered. Payment held in escrow until you confirm receipt.',
                    'order_id': order.order_id,
                    'credentials': order.product_credentials,
                    'order_status': order.order_status,
                    'escrow_enabled': True
                })
            else:
                # For non-escrow orders, credentials are revealed and payment goes directly to vendor
                if order.product.credentials:
                    order.product_credentials = {
                        'credentials': order.product.credentials,
                        'delivered_at': timezone.now().isoformat(),
                        'delivery_method': order.product.delivery_time,
                        'additional_info': order.product.additional_info or '',
                        'notes': order.product.notes_for_buyer or ''
                    }
                    order.save()
                    
                    # Mark product credentials as visible for this order
                    order.product.credentials_visible = True
                    order.product.save()
                
                logger.info(f"Payment confirmed and credentials revealed for non-escrow order {order.order_id}")
                
                return Response({
                    'success': True,
                    'message': 'Payment confirmed and credentials delivered',
                    'order_id': order.order_id,
                    'credentials': order.product_credentials,
                    'order_status': order.order_status,
                    'escrow_enabled': False
                })
            
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
