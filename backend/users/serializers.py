from rest_framework import serializers
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(max_length=100)  # Remove source mapping
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'confirm_password', 
            'full_name', 'phone'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError("Username already exists")
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError("Email already exists")
        
        return attrs
    
    def create(self, validated_data):
        try:
            # Remove confirm_password first
            validated_data.pop('confirm_password', None)
            
            # Get full_name and set it as first_name
            full_name = validated_data.pop('full_name', '')
            validated_data['first_name'] = full_name
            validated_data['last_name'] = ''
            
            # Set default user_type to 'buyer'
            validated_data['user_type'] = 'buyer'
            
            # Create user
            user = User.objects.create_user(**validated_data)
            return user
        except Exception as e:
            raise serializers.ValidationError(f"Error creating user: {str(e)}")


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField() 


class UserSerializer(serializers.ModelSerializer):
    """User serializer for basic user information"""
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'user_type',
            'phone', 'profile_picture', 'is_verified', 'date_joined', 'is_superuser'
        ]
        read_only_fields = ['id', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer for admin operations"""
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'user_type',
            'phone', 'profile_picture', 'date_of_birth', 'is_verified',
            'two_factor_enabled', 'is_active', 'date_joined', 'last_login', 'is_superuser'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login'] 