from rest_framework import serializers
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
    vendor = UserSerializer(read_only=True)
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
            'order_status_display', 'use_escrow', 'escrow_fee', 'dispute_opened',
            'dispute_reason', 'payment_expires_at', 'delivered_at', 'confirmed_at',
            'dispute_opened_at', 'product_credentials', 'is_payment_expired',
            'can_dispute', 'dispute', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_id', 'created_at', 'updated_at', 'is_payment_expired',
            'can_dispute', 'dispute'
        ]
    
    def get_order_status_display(self, obj):
        """Get human-readable order status"""
        return dict(OrderStatus.__members__).get(obj.order_status, obj.order_status)
    
    def get_payment_status_display(self, obj):
        """Get human-readable payment status"""
        from payments.models import PaymentStatus
        return dict(PaymentStatus.__members__).get(obj.payment_status, obj.payment_status)
    
    def get_product_credentials(self, obj):
        """Get product credentials only for paid orders"""
        if obj.order_status == 'paid' and obj.product_credentials:
            return obj.product_credentials
        return None


class CreateOrderSerializer(serializers.ModelSerializer):
    """Serializer for creating new orders"""
    
    class Meta:
        model = Order
        fields = [
            'product', 'quantity', 'crypto_currency', 'use_escrow'
        ]
    
    def validate(self, data):
        """Validate order data"""
        product = data['product']
        quantity = data['quantity']
        
        # Check if product is available
        if product.status != 'approved':
            raise serializers.ValidationError("Product is not available for purchase")
        
        # Check if enough quantity is available
        if product.quantity_available < quantity:
            raise serializers.ValidationError(f"Only {product.quantity_available} units available")
        
        # Set unit price from product
        data['unit_price'] = product.price
        
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
        
        # Update validated_data with escrow decision
        validated_data['use_escrow'] = use_escrow
        
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