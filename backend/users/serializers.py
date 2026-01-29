from rest_framework import serializers
from .models import User
from shared.utils import validate_btc_address, validate_xmr_address, clean_crypto_address


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration - username + password only"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'confirm_password']
    
    def validate(self, attrs):

        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError("Username already exists")
        
        return attrs
    
    def create(self, validated_data):
        try:
            # Remove confirm_password
            validated_data.pop('confirm_password', None)
            
            # Set default user_type to 'buyer'
            validated_data['user_type'] = 'buyer'
            
            # Auto-approve users on registration
            validated_data['is_verified'] = True
            
            # Generate recovery phrase
            from .utils import generate_mnemonic
            validated_data['recovery_phrase'] = generate_mnemonic()
            
            # Create user
            user = User.objects.create_user(**validated_data)
            
            # Log registration activity
            try:
                from shared.utils import log_user_activity
                log_user_activity(
                    user=user,
                    activity_type='account_created',
                    description=f'User account created: {user.username}',
                    request=self.context.get('request'),
                    metadata={'user_type': user.user_type}
                )
            except Exception:
                pass  # Don't fail registration if logging fails
            
            return user
        except Exception as e:
            raise serializers.ValidationError(f"Error creating user: {str(e)}")


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login - username + password only"""
    username = serializers.CharField()
    password = serializers.CharField()
    remember_me = serializers.BooleanField(default=False, required=False) 


class UserSerializer(serializers.ModelSerializer):
    """User serializer for basic user information - no PII"""
    total_orders = serializers.SerializerMethodField()

    def get_total_orders(self, obj):
        # Check if already annotated for performance
        if hasattr(obj, 'buyer_order_count') and hasattr(obj, 'vendor_order_count'):
            return obj.buyer_order_count + obj.vendor_order_count
        
        # Fallback for individual lookups
        if obj.user_type == 'vendor':
            return getattr(obj, 'vendor_orders_new', obj.vendor_orders_new.get_queryset() if hasattr(obj, 'vendor_orders_new') else None).count() if hasattr(obj, 'vendor_orders_new') else 0
        return getattr(obj, 'buyer_orders', obj.buyer_orders.get_queryset() if hasattr(obj, 'buyer_orders') else None).count() if hasattr(obj, 'buyer_orders') else 0
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'user_type', 'is_verified', 
            'two_factor_enabled', 'is_active', 'date_joined',
            'btc_payout_address', 'xmr_payout_address', 'non_escrow_blocked', 'escrow_enabled',
            'total_orders', 'notify_new_orders', 'notify_messages', 'notify_disputes',
            'notify_reviews', 'notify_support_tickets', 'notify_payouts', 'notify_marketing', 'notify_login_alerts',
            'recovery_phrase', 'profile_picture', 'legal_accepted'
        ]
        read_only_fields = ['id', 'date_joined']
        extra_kwargs = {
            'two_factor_secret': {'write_only': True}  # Never expose secret in API
        }


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information - limited fields"""
    
    class Meta:
        model = User
        fields = [
            'two_factor_enabled', 'btc_payout_address', 'xmr_payout_address',
            'notify_new_orders', 'notify_messages', 'notify_disputes',
            'notify_reviews', 'notify_support_tickets', 'notify_payouts', 'notify_marketing', 'notify_login_alerts',
            'profile_picture'
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'user_type', 'is_verified']

    def validate_btc_payout_address(self, value):
        if value:
            value = clean_crypto_address(value)
            if not validate_btc_address(value):
                raise serializers.ValidationError("Invalid Bitcoin address format")
        return value

    def validate_xmr_payout_address(self, value):
        if value:
            value = clean_crypto_address(value)
            if not validate_xmr_address(value):
                raise serializers.ValidationError("Invalid Monero address format")
        return value


class PayoutAddressSerializer(serializers.ModelSerializer):
    """Serializer for updating buyer payout addresses"""
    
    class Meta:
        model = User
        fields = ['btc_payout_address', 'xmr_payout_address']

    def validate_btc_payout_address(self, value):
        if value:
            value = clean_crypto_address(value)
            if not validate_btc_address(value):
                raise serializers.ValidationError("Invalid Bitcoin address format")
        return value

    def validate_xmr_payout_address(self, value):
        if value:
            value = clean_crypto_address(value)
            if not validate_xmr_address(value):
                raise serializers.ValidationError("Invalid Monero address format")
        return value


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin to update user information with more fields"""
    
    class Meta:
        model = User
        fields = ['username', 'user_type', 'is_verified', 'two_factor_enabled', 'is_active', 'non_escrow_blocked', 'escrow_enabled']
        read_only_fields = ['id', 'date_joined'] 