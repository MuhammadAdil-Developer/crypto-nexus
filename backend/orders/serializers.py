from rest_framework import serializers
from django.db.models import Avg
from .models import Order, OrderDispute, OrderStatus
from products.serializers import ProductSerializer
from users.serializers import UserSerializer


class OrderDisputeSerializer(serializers.ModelSerializer):
    """Serializer for order disputes"""
    
    class Meta:
        model = OrderDispute
        fields = [
            'id', 'reason', 'evidence', 'resolved_by', 'resolution',
            'resolution_notes', 'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for orders"""
    
    # Related data
    product = ProductSerializer(read_only=True)
    buyer = UserSerializer(read_only=True)
    vendor = serializers.SerializerMethodField()  # Custom vendor serializer
    dispute = OrderDisputeSerializer(read_only=True)
    
    # Computed fields
    is_payment_expired = serializers.ReadOnlyField()
    can_dispute = serializers.ReadOnlyField()
    
    # Status display
    order_status_display = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()
    
    # Credentials - only show for paid orders
    product_credentials = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'buyer', 'vendor', 'product', 'quantity',
            'unit_price', 'total_amount', 'crypto_currency', 'payment_address',
            'payment_status', 'payment_status_display', 'order_status', 
            'order_status_display', 'use_escrow', 'escrow_fee', 'refund_address',
            'dispute_opened', 'dispute_reason', 'payment_expires_at', 'delivered_at',
            'confirmed_at', 'dispute_opened_at', 'product_credentials',
            'is_payment_expired', 'can_dispute', 'dispute', 'is_giveaway',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_id', 'created_at', 'updated_at', 'is_payment_expired',
            'can_dispute', 'dispute'
        ]
    
    def get_order_status_display(self, obj):
        """Get human-readable order status with premium labels"""
        status = obj.order_status
        
        # Define high-end status mapping
        status_map = {
            'pending_payment': 'Pending Payment',
            'payment_received': 'Payment Received',
            'processing': 'Processing',
            'paid': 'Paid',
            'delivered': 'Completed',
            'confirmed': 'Completed',
            'disputed': 'Disputed',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded',
            'partial': 'Partial Payment',
        }
        
        # CRITICAL REQ: Auto-delivery orders show as 'Completed' as soon as payment is confirmed (paid)
        if status == 'paid' and obj.product and obj.product.delivery_time == 'instant_auto':
            return "Completed"
            
        return status_map.get(status, status.replace('_', ' ').capitalize())
    
    def get_payment_status_display(self, obj):
        """Get human-readable payment status"""
        from payments.models import PaymentStatus
        return dict(PaymentStatus.__members__).get(obj.payment_status, obj.payment_status)
    
    def get_vendor(self, obj):
        """Get vendor information with statistics"""
        if obj.vendor:
            # Get basic vendor info
            vendor_data = {
                'id': obj.vendor.id,
                'username': obj.vendor.username,
                'user_type': obj.vendor.user_type,
                'is_verified': obj.vendor.is_verified,
                'date_joined': obj.vendor.date_joined,
            }
            
            # Calculate vendor statistics
            try:
                from products.models import Product
                from orders.models import Order
                
                # Get vendor's products
                vendor_products = Product.objects.filter(vendor=obj.vendor, status='approved')
                total_products = vendor_products.count()
                
                # Calculate total sales from COMPLETED ORDERS (not product count)
                # Include both regular and giveaway orders - giveaway orders are marked as 'paid' immediately
                vendor_orders = Order.objects.filter(product__vendor=obj.vendor)
                total_orders = vendor_orders.count()
                # Count all completed orders including giveaways (which have 'paid' status)
                completed_orders = vendor_orders.filter(
                    order_status__in=['completed', 'delivered', 'confirmed', 'paid']
                ).count()
                completion_rate = round((completed_orders / total_orders * 100) if total_orders > 0 else 100, 1)
                
                # Calculate average rating from products
                avg_rating = vendor_products.aggregate(avg=Avg('rating'))['avg'] or 0
                
                vendor_data.update({
                    'total_sales': completed_orders,  # Real sales count from orders
                    'completion_rate': completion_rate,
                    'rating': round(float(avg_rating), 1)
                })
            except Exception:
                # Fallback values if calculation fails
                vendor_data.update({
                    'total_sales': 0,
                    'completion_rate': 100,
                    'rating': 0
                })
            
            return vendor_data
        return None

    def get_product_credentials(self, obj):
        """Get product credentials for paid, confirmed, and delivered orders"""
        valid_statuses = ['paid', 'confirmed', 'delivered', 'completed']
        if obj.product_credentials and obj.order_status in valid_statuses:
            return obj.product_credentials
        return None


class CreateOrderSerializer(serializers.ModelSerializer):
    """Serializer for creating new orders"""
    
    class Meta:
        model = Order
        fields = [
            'product', 'quantity', 'crypto_currency', 'refund_address'
        ]
        extra_kwargs = {
            'refund_address': {'required': True, 'allow_blank': False}
        }
    
    def validate(self, data):
        """Validate order data"""
        product = data['product']
        quantity = data['quantity']
        crypto_currency = data['crypto_currency']
        
        # Check if product is available
        # Allow 'reserved' status to pass through for specific error handling below, or block unapproved/rejected/deleted
        if product.status not in ['approved', 'reserved']:
            raise serializers.ValidationError("Product is not available for purchase")
        
        # Check if enough quantity is available - Specific Out of Stock Message
        if product.quantity_available < quantity or product.status == 'reserved':
             raise serializers.ValidationError("This account is out of stock kindly talk with vender")
        
        # Convert USD price to Crypto amount
        # We store the crypto amount in unit_price as per model intention
        from decimal import Decimal
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            from payments.services import PaymentService
            payment_service = PaymentService()
            rate = payment_service.get_fiat_to_crypto_rate(crypto_currency, 'USD')
            
            if rate and rate > 0:
                # rate is price of 1 crypto in USD. e.g. 100,000 USD for 1 BTC
                # crypto_price = usd_price / rate
                data['unit_price'] = product.price / rate
            else:
                # Fallback rates
                fallbacks = {'BTC': Decimal('100000'), 'XMR': Decimal('170')}
                data['unit_price'] = product.price / fallbacks.get(crypto_currency, Decimal('1'))
        except Exception as e:
            logger.error(f"Error converting price to crypto: {e}")
            fallbacks = {'BTC': Decimal('100000'), 'XMR': Decimal('170')}
            data['unit_price'] = product.price / fallbacks.get(crypto_currency, Decimal('1'))
        
        return data
    
    def create(self, validated_data):
        """Create order and reserve product"""
        product = validated_data['product']
        quantity = validated_data['quantity']
        
        # Determine escrow usage based on rules:
        # 1. If vendor has escrow disabled in profile AND product has escrow disabled -> no escrow
        # 2. If vendor has escrow enabled in profile -> use escrow (product setting ignored)
        # 3. If vendor has escrow disabled but product has escrow enabled -> use escrow
        vendor_escrow_enabled = product.vendor.escrow_enabled
        product_escrow_enabled = product.escrow_enabled
        
        # Apply escrow rules
        if vendor_escrow_enabled:
            # Vendor has escrow enabled globally - all products use escrow
            use_escrow = True
        elif product_escrow_enabled:
            # Vendor has escrow disabled but this specific product has escrow enabled
            use_escrow = True
        else:
            # Both vendor and product have escrow disabled - no escrow
            use_escrow = False
        
        # Update validated_data with escrow decision and giveaway status
        validated_data['use_escrow'] = use_escrow
        validated_data['is_giveaway'] = product.is_giveaway
        
        # Reserve product quantity
        product.quantity_available -= quantity
        if product.quantity_available == 0:
            product.status = 'reserved'
        product.save()
        
        # Create order
        order = Order.objects.create(
            buyer=self.context['request'].user,
            vendor=product.vendor,
            **validated_data
        )
        
        return order


class UpdateOrderStatusSerializer(serializers.ModelSerializer):
    """Serializer for updating order status"""
    
    class Meta:
        model = Order
        fields = ['order_status']
    
    def validate_order_status(self, value):
        """Validate status transition"""
        current_status = self.instance.order_status
        
        # Define allowed transitions
        allowed_transitions = {
            'pending_payment': ['payment_received', 'cancelled'],
            'payment_received': ['paid', 'cancelled'],
            'paid': ['delivered', 'disputed'],
            'delivered': ['confirmed', 'disputed'],
            'disputed': ['confirmed', 'refunded'],
        }
        
        if value not in allowed_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Cannot transition from {current_status} to {value}"
            )
        
        return value 