from rest_framework import serializers
from django.conf import settings
from django.shortcuts import get_object_or_404
from .models import Dispute, DisputeMessage, DisputeTimeline
from products.serializers import ProductSerializer
from orders.models import Order
from orders.serializers import OrderSerializer


class DisputeSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    assigned_admin_username = serializers.CharField(source='assigned_admin.username', read_only=True)
    order_data = OrderSerializer(source='order', read_only=True)
    product_data = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = Dispute
        fields = [
            'id', 'dispute_id', 'order', 'product', 'buyer', 'vendor',
            'title', 'description', 'category', 'priority', 'status',
            'resolution', 'resolution_notes', 'resolution_reason', 'winning_party', 'refund_amount',
            'assigned_admin', 'created_at', 'updated_at', 'resolved_at',
            'evidence_files', 'buyer_username', 'vendor_username',
            'assigned_admin_username', 'order_data', 'product_data'
        ]
        read_only_fields = ['dispute_id', 'created_at', 'updated_at']


class DisputeCreateSerializer(serializers.ModelSerializer):
    # Accept UUID string for order, resolve manually
    order = serializers.UUIDField(write_only=True)

    class Meta:
        model = Dispute
        fields = [
            'order', 'title', 'description', 'category', 'priority',
            'evidence_files', 'refund_request'
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        order_id = attrs.get('order')
        order = get_object_or_404(Order, id=order_id)
        
        if request and hasattr(request, 'user'):
            # 1. Ownership check
            if order.buyer != request.user:
                raise serializers.ValidationError({
                    'order': 'You can only create disputes for your own orders.'
                })
            
            # 2. Escrow check - Non-escrow deals cannot be disputed
            if not order.use_escrow:
                raise serializers.ValidationError({
                    'order': 'Disputes are only available for escrow-protected deals.'
                })
                
            # 3. Time limit check - Normally 72 hours (3 days)
            # Use delivered_at if available, otherwise confirmed_at, otherwise created_at
            base_time = order.delivered_at or order.confirmed_at or order.created_at
            if base_time:
                from django.utils import timezone
                from datetime import timedelta
                
                # Ensure base_time is a datetime object
                if isinstance(base_time, str):
                    from django.utils.dateparse import parse_datetime
                    base_time = parse_datetime(base_time)
                
                if base_time:
                    # Check if more than 72 hours have passed
                    if timezone.now() > base_time + timedelta(hours=72):
                        raise serializers.ValidationError({
                            'order': 'The dispute window for this order has expired (72 hours limit).'
                        })

            # 4. Active dispute check
            if hasattr(order, 'dispute') and order.dispute:
                raise serializers.ValidationError({
                    'order': 'A dispute already exists for this order.'
                })

        # Attach resolved order for use in create()
        attrs['resolved_order'] = order
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        order = validated_data.pop('resolved_order')
        # Remove write-only field
        validated_data.pop('order', None)

        dispute = Dispute.objects.create(
            order=order,
            product=order.product,
            buyer=request.user if request else None,
            vendor=order.vendor,
            title=validated_data.get('title', ''),
            description=validated_data.get('description', ''),
            category=validated_data.get('category', ''),
            priority=validated_data.get('priority', 'medium'),
            evidence_files=validated_data.get('evidence_files', []),
            refund_request=validated_data.get('refund_request')
        )
        return dispute


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_type = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeMessage
        fields = [
            'id', 'dispute', 'sender', 'message', 'is_internal',
            'attachments', 'created_at', 'sender_username', 'sender_type'
        ]
        read_only_fields = ['created_at']
    
    def get_sender_type(self, obj):
        if hasattr(obj.sender, 'user_type'):
            return obj.sender.user_type
        return 'user'


class DisputeTimelineSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = DisputeTimeline
        fields = ['id', 'dispute', 'action', 'description', 'user', 'created_at', 'user_username']
        read_only_fields = ['created_at']


class DisputeListSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    assigned_admin_username = serializers.CharField(source='assigned_admin.username', read_only=True)
    product_title = serializers.CharField(source='product.headline', read_only=True)
    order_id = serializers.CharField(source='order.id', read_only=True)
    order_data = OrderSerializer(source='order', read_only=True)
    product_data = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = Dispute
        fields = [
            'id', 'dispute_id', 'order', 'product', 'title', 'description', 'category', 'priority', 'status',
            'resolution', 'resolution_notes', 'resolution_reason', 'winning_party', 'refund_amount', 
            'buyer_username', 'vendor_username', 'assigned_admin_username', 'product_title', 'order_id', 
            'order_data', 'product_data', 'created_at', 'updated_at', 'resolved_at', 'evidence_files'
        ]

