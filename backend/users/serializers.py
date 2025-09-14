from rest_framework import serializers
from .models import User


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
            
            # Create user
            user = User.objects.create_user(**validated_data)
            return user
        except Exception as e:
            raise serializers.ValidationError(f"Error creating user: {str(e)}")


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login - username + password only"""
    username = serializers.CharField()
    password = serializers.CharField() 


class UserSerializer(serializers.ModelSerializer):
    """User serializer for basic user information - no PII"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'user_type', 'is_verified', 
            'two_factor_enabled', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information - limited fields"""
    
    class Meta:
        model = User
        fields = ['user_type', 'is_verified', 'two_factor_enabled']
        read_only_fields = ['id', 'username', 'date_joined'] 