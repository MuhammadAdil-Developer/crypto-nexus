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
                vendor_orders = Order.objects.filter(product__vendor=obj.vendor).exclude(order_status='cancelled')
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
        
        # Capture highlight status at the time of order creation
        # We also check if the highlight has expired
        is_currently_highlighted = False
        if product.is_highlighted and product.highlighted_until:
             from django.utils import timezone
             is_currently_highlighted = timezone.now() < product.highlighted_until
        
        # Update validated_data with escrow decision, giveaway status, and highlight tracking
        validated_data['use_escrow'] = use_escrow
        validated_data['is_giveaway'] = product.is_giveaway
        validated_data['was_highlighted_at_order'] = is_currently_highlighted
        
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


class AdminDashboardOrderSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for admin dashboard's 'Recent Orders' list.
    Maintains nested structure for UI compatibility but only includes essential fields.
    """
    buyer = serializers.SerializerMethodField()
    vendor = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    order_status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'buyer', 'vendor', 'product',
            'quantity', 'total_amount', 'crypto_currency', 'payment_status',
            'order_status', 'order_status_display', 'created_at'
        ]

    def get_order_status_display(self, obj):
        status = obj.order_status
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
        if status == 'paid' and obj.product and obj.product.delivery_time == 'instant_auto':
            return "Completed"
        return status_map.get(status, status.replace('_', ' ').capitalize())

    def get_buyer(self, obj):
        if obj.buyer:
            return {'username': obj.buyer.username}
        return {'username': 'Unknown'}

    def get_vendor(self, obj):
        if obj.vendor:
            return {'username': obj.vendor.username}
        return {'username': 'Unknown'}

    def get_product(self, obj):
        if obj.product:
            return {
                'headline': obj.product.headline,
                'delivery_time': obj.product.delivery_time,
                'delivery_method': obj.product.delivery_method
            }
        return {'headline': 'Deleted Product'}


class OrderListSerializer(serializers.ModelSerializer):
    """
    Full-detail serializer for order lists used by Vendor/Buyer order pages.
    Includes all product and vendor info needed for the order detail modal.
    """
    buyer = serializers.SerializerMethodField()
    vendor = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    order_status_display = serializers.SerializerMethodField()
    product_credentials = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'buyer', 'vendor', 'product', 'quantity',
            'unit_price', 'total_amount', 'crypto_currency', 'payment_address',
            'payment_status', 'order_status', 'order_status_display', 'is_giveaway',
            'use_escrow', 'escrow_fee', 'refund_address',
            'dispute_opened', 'dispute_reason', 'dispute_opened_at',
            'payment_expires_at', 'delivered_at', 'confirmed_at',
            'product_credentials', 'created_at', 'updated_at'
        ]

    def get_order_status_display(self, obj):
        status = obj.order_status
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
        if status == 'paid' and obj.product and obj.product.delivery_time == 'instant_auto':
            return "Completed"
        return status_map.get(status, status.replace('_', ' ').capitalize())

    def get_product_credentials(self, obj):
        """Only expose credentials to the buyer of this order"""
        request = self.context.get('request')
        user = request.user if request else None
        order_is_paid = obj.order_status in ['paid', 'delivered', 'confirmed', 'completed']
        is_buyer = user and obj.buyer and user.id == obj.buyer.id
        is_admin = user and (user.is_staff or getattr(user, 'user_type', '') == 'admin')
        if (is_buyer or is_admin) and order_is_paid:
            return obj.product_credentials
        return None

    def get_buyer(self, obj):
        if obj.buyer:
            return {
                'id': str(obj.buyer.id),
                'username': obj.buyer.username,
                'email': obj.buyer.email,
            }
        return {'username': 'Unknown'}

    def get_vendor(self, obj):
        if obj.vendor:
            try:
                from orders.models import Order as OrderModel
                vendor = obj.vendor
                completed_orders = OrderModel.objects.filter(
                    vendor=vendor,
                    order_status__in=['delivered', 'confirmed', 'completed']
                ).count()
                total_orders = OrderModel.objects.filter(
                    vendor=vendor
                ).exclude(order_status='cancelled').count()
                completion_rate = round((completed_orders / total_orders * 100), 1) if total_orders > 0 else 100.0
                return {
                    'id': str(vendor.id),
                    'username': vendor.username,
                    'is_verified': vendor.is_verified,
                    'rating': float(getattr(vendor, 'rating', 0) or 0),
                    'total_sales': completed_orders,
                    'completion_rate': completion_rate,
                    'date_joined': vendor.date_joined.isoformat() if vendor.date_joined else None,
                }
            except Exception:
                return {'username': obj.vendor.username, 'rating': 0, 'total_sales': 0, 'completion_rate': 100.0}
        return {'username': 'Unknown'}

    def get_product(self, obj):
        if obj.product:
            p = obj.product
            main_image = None
            try:
                if p.main_image:
                    main_image = p.main_image.url
                elif p.main_images and isinstance(p.main_images, list) and p.main_images:
                    from django.core.files.storage import default_storage
                    main_image = default_storage.url(p.main_images[0])
            except Exception:
                pass
            return {
                'id': p.id,
                'headline': p.headline,
                'website': p.website,
                'account_type': p.account_type,
                'access_type': p.access_type,
                'account_balance': p.account_balance,
                'description': p.description,
                'additional_info': p.additional_info,
                'delivery_time': p.delivery_time,
                'delivery_method': p.delivery_method,
                'price': float(p.price),
                'rating': float(p.rating),
                'review_count': p.review_count,
                'notes_for_buyer': p.notes_for_buyer,
                'main_image': main_image,
                'category_name': p.category.name if p.category else 'N/A',
                # These two fields are needed by the frontend modal to trigger vendor stats API
                'vendor_username': p.vendor.username if p.vendor else None,
                'vendor': {
                    'id': str(p.vendor.id) if p.vendor else None,
                    'username': p.vendor.username if p.vendor else None,
                    'email': p.vendor.email if p.vendor else None,
                } if p.vendor else None,
            }
        return {'headline': 'Deleted'}



class AdminOrderListSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for admin orders list.
    Includes full details for modal view while optimizing query performance.
    """
    buyer = serializers.SerializerMethodField()
    vendor = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    order_status_display = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()
    dispute_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'buyer', 'vendor', 'product', 'quantity',
            'unit_price', 'total_amount', 'crypto_currency', 'payment_address', 
            'payment_status', 'payment_status_display', 'order_status', 'order_status_display', 
            'use_escrow', 'escrow_fee', 'refund_address',
            'dispute_opened', 'dispute_reason', 'dispute_opened_at', 'dispute_details',
            'payment_expires_at', 'delivered_at', 'confirmed_at',
            'is_giveaway', 'created_at', 'updated_at'
        ]

    def get_order_status_display(self, obj):
        status = obj.order_status
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
        if status == 'paid' and obj.product and obj.product.delivery_time == 'instant_auto':
            return "Completed"
        return status_map.get(status, status.replace('_', ' ').capitalize())

    def get_payment_status_display(self, obj):
        from payments.models import PaymentStatus
        status = obj.payment_status
        # Handle cases where status might be the enum member or its value
        try:
            return dict(PaymentStatus.__members__).get(status, str(status).replace('_', ' ').capitalize())
        except:
            return str(status).replace('_', ' ').capitalize()

    def get_dispute_details(self, obj):
        dispute = obj.refund_disputes.first()
        if dispute:
            return {
                'status': dispute.status,
                'reason': dispute.reason,
                'resolution': dispute.resolution,
                'resolution_notes': dispute.resolution_notes,
                'resolved_at': dispute.resolved_at.isoformat() if dispute.resolved_at else None,
                'evidence_count': len(dispute.evidence) if isinstance(dispute.evidence, dict) else 0
            }
        return None

    def get_buyer(self, obj):
        if obj.buyer:
            return {
                'id': str(obj.buyer.id),
                'username': obj.buyer.username,
                'email': obj.buyer.email,
                'user_type': obj.buyer.user_type,
                'is_verified': obj.buyer.is_verified,
                'date_joined': obj.buyer.date_joined.isoformat() if obj.buyer.date_joined else None,
                'last_login': obj.buyer.last_login.isoformat() if obj.buyer.last_login else None
            }
        return {'username': 'Unknown'}

    def get_vendor(self, obj):
        if obj.vendor:
            return {
                'id': str(obj.vendor.id),
                'username': obj.vendor.username,
                'email': obj.vendor.email,
                'user_type': obj.vendor.user_type,
                'is_verified': obj.vendor.is_verified,
                'date_joined': obj.vendor.date_joined.isoformat() if obj.vendor.date_joined else None,
                'last_login': obj.vendor.last_login.isoformat() if obj.vendor.last_login else None
            }
        return {'username': 'Unknown'}

    def get_product(self, obj):
        if obj.product:
            return {
                'id': obj.product.id,
                'headline': obj.product.headline,
                'website': obj.product.website,
                'account_type': obj.product.account_type,
                'access_type': obj.product.access_type,
                'account_balance': obj.product.account_balance,
                'description': obj.product.description,
                'additional_info': obj.product.additional_info,
                'delivery_time': obj.product.delivery_time,
                'delivery_method': obj.product.delivery_method,
                'price': float(obj.product.price),
                'rating': float(obj.product.rating),
                'category_name': obj.product.category.name if obj.product.category else 'N/A',
                'main_image': obj.product.main_image.url if obj.product.main_image else None
            }
        return {'headline': 'Deleted'}


 