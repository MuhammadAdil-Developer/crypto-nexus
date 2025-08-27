from rest_framework import serializers
from .models import (
    CryptoCurrency, Category, Product, Order, OrderItem,
    Review, VendorApplication, Message, Notification, Payment, Dispute
)


class CryptoCurrencySerializer(serializers.ModelSerializer):
    """Cryptocurrency serializer"""
    class Meta:
        model = CryptoCurrency
        fields = [
            'id', 'name', 'symbol', 'logo_url', 'current_price',
            'market_cap', 'volume_24h', 'price_change_24h', 'is_active'
        ]


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer"""
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'icon', 'parent', 'parent_name',
            'slug', 'is_featured', 'is_active'
        ]


class ProductSerializer(serializers.ModelSerializer):
    """Product serializer"""
    vendor_name = serializers.CharField(source='vendor.get_full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    crypto_symbol = serializers.CharField(source='crypto_currency.symbol', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'vendor', 'vendor_name', 'category', 'category_name',
            'name', 'description', 'price', 'crypto_currency', 'crypto_symbol',
            'stock_quantity', 'images', 'tags', 'is_featured', 'is_approved',
            'rating', 'review_count', 'slug', 'created_at'
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'created_at']


class ProductDetailSerializer(ProductSerializer):
    """Detailed product serializer with vendor and category details"""
    category = CategorySerializer(read_only=True)
    crypto_currency = CryptoCurrencySerializer(read_only=True)


class OrderItemSerializer(serializers.ModelSerializer):
    """Order item serializer"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'quantity', 'unit_price', 'total_price'
        ]
    
    def get_product_image(self, obj):
        if obj.product.images:
            return obj.product.images[0] if isinstance(obj.product.images, list) else obj.product.images
        return None


class OrderSerializer(serializers.ModelSerializer):
    """Order serializer"""
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.get_full_name', read_only=True)
    crypto_symbol = serializers.CharField(source='crypto_currency.symbol', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_name', 'vendor', 'vendor_name', 'status',
            'total_amount', 'crypto_currency', 'crypto_symbol', 'shipping_address',
            'tracking_number', 'estimated_delivery', 'notes', 'items', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OrderDetailSerializer(OrderSerializer):
    """Detailed order serializer with buyer and vendor details"""
    buyer = None  # Will be set by users app serializer
    vendor = None  # Will be set by users app serializer
    crypto_currency = CryptoCurrencySerializer(read_only=True)


class ReviewSerializer(serializers.ModelSerializer):
    """Review serializer"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'product', 'user', 'user_name', 'rating', 'comment',
            'images', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReviewDetailSerializer(ReviewSerializer):
    """Detailed review serializer with user details"""
    user = None  # Will be set by users app serializer


class VendorApplicationSerializer(serializers.ModelSerializer):
    """Vendor application serializer"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = VendorApplication
        fields = [
            'id', 'user', 'user_name', 'business_name', 'business_description',
            'business_address', 'business_license', 'tax_id', 'bank_account',
            'status', 'admin_notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class VendorApplicationDetailSerializer(VendorApplicationSerializer):
    """Detailed vendor application serializer with user details"""
    user = None  # Will be set by users app serializer


class MessageSerializer(serializers.ModelSerializer):
    """Message serializer"""
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'subject', 'content', 'is_read', 'parent_message', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MessageDetailSerializer(MessageSerializer):
    """Detailed message serializer with user details"""
    sender = None  # Will be set by users app serializer
    recipient = None  # Will be set by users app serializer


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'type', 'title', 'message', 'is_read',
            'data', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationDetailSerializer(NotificationSerializer):
    """Detailed notification serializer with user details"""
    user = None  # Will be set by users app serializer


class PaymentSerializer(serializers.ModelSerializer):
    """Payment serializer"""
    crypto_symbol = serializers.CharField(source='crypto_currency.symbol', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'amount', 'crypto_currency', 'crypto_symbol',
            'payment_method', 'status', 'transaction_hash', 'payment_date',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentDetailSerializer(PaymentSerializer):
    """Detailed payment serializer with order details"""
    order = None  # Will be set by orders app serializer
    crypto_currency = CryptoCurrencySerializer(read_only=True)


class DisputeSerializer(serializers.ModelSerializer):
    """Dispute serializer"""
    initiator_name = serializers.CharField(source='initiator.get_full_name', read_only=True)
    
    class Meta:
        model = Dispute
        fields = [
            'id', 'order', 'initiator', 'initiator_name', 'reason',
            'status', 'admin_notes', 'resolution', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DisputeDetailSerializer(DisputeSerializer):
    """Detailed dispute serializer with user details"""
    initiator = None  # Will be set by users app serializer 