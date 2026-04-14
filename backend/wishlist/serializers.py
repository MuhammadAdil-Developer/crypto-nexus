from rest_framework import serializers
from .models import Wishlist, WishlistNotification
from products.serializers import ProductSerializer


class WishlistSerializer(serializers.ModelSerializer):
    product_data = ProductSerializer(source='product', read_only=True)
    vendor_username = serializers.CharField(source='product.vendor.username', read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_data', 'vendor_username', 'created_at']
        read_only_fields = ['id', 'created_at']


class WishlistNotificationSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.headline', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=8, read_only=True)
    
    class Meta:
        model = WishlistNotification
        fields = ['id', 'product', 'product_title', 'product_price', 'notification_type', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class WishlistStatsSerializer(serializers.Serializer):
    total_items = serializers.IntegerField()
    in_stock_items = serializers.IntegerField()
    out_of_stock_items = serializers.IntegerField()
    price_drops = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=10, decimal_places=8)


