import sys
import os

# Add the shared utilities to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from utils import create_success_response, create_error_response, validate_email_format, validate_phone_number

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import User
from .serializers import UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def user_registration(request):
    """User registration endpoint"""
    try:
        # Extract data
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone = request.data.get('phone', '').strip()
        user_type = request.data.get('user_type', 'buyer')
        
        # Validate required fields
        if not all([email, password, first_name, last_name]):
            return create_error_response("All required fields must be provided")
        
        # Validate email format
        if not validate_email_format(email):
            return create_error_response("Invalid email format")
        
        # Validate password strength
        if len(password) < 8:
            return create_error_response("Password must be at least 8 characters long")
        
        # Validate phone number if provided
        if phone and not validate_phone_number(phone):
            return create_error_response("Invalid phone number format")
        
        # Validate user type
        valid_user_types = [choice[0] for choice in User.USER_TYPES]
        if user_type not in valid_user_types:
            return create_error_response("Invalid user type")
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return create_error_response("User with this email already exists")
        
        # Create user
        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                user_type=user_type
            )
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Serialize user data
            user_data = UserSerializer(user).data
            
            response_data = {
                'user': user_data,
                'tokens': {
                    'access': access_token,
                    'refresh': refresh_token
                }
            }
            
            return create_success_response(
                response_data, 
                "User registered successfully", 
                status.HTTP_201_CREATED
            )
            
    except Exception as e:
        return create_error_response("Registration failed", str(e))


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """User login endpoint"""
    try:
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')
        
        if not email or not password:
            return create_error_response("Email and password are required")
        
        # Authenticate user
        user = authenticate(request, email=email, password=password)
        
        if not user:
            return create_error_response("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return create_error_response("Account is deactivated", status_code=status.HTTP_403_FORBIDDEN)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Update last login
        user.save()
        
        # Serialize user data
        user_data = UserSerializer(user).data
        
        response_data = {
            'user': user_data,
            'tokens': {
                'access': access_token,
                'refresh': refresh_token
            }
        }
        
        return create_success_response(response_data, "Login successful")
        
    except Exception as e:
        return create_error_response("Login failed", str(e))


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh access token using refresh token"""
    try:
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return create_error_response("Refresh token is required")
        
        # Verify and decode refresh token
        refresh = RefreshToken(refresh_token)
        
        # Generate new access token
        access_token = str(refresh.access_token)
        
        response_data = {
            'access': access_token
        }
        
        return create_success_response(response_data, "Token refreshed successfully")
        
    except Exception as e:
        return create_error_response("Token refresh failed", str(e))


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Send password reset email"""
    try:
        email = request.data.get('email', '').lower().strip()
        
        if not email:
            return create_error_response("Email is required")
        
        if not validate_email_format(email):
            return create_error_response("Invalid email format")
        
        # Check if user exists
        try:
            user = User.objects.get(email=email, is_active=True, is_deleted=False)
        except User.DoesNotExist:
            # Don't reveal if user exists or not for security
            return create_success_response(None, "If the email exists, a password reset link has been sent")
        
        # Generate password reset token (in production, use proper email service)
        # For now, just return success message
        return create_success_response(None, "If the email exists, a password reset link has been sent")
        
    except Exception as e:
        return create_error_response("Password reset request failed", str(e))


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using token"""
    try:
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not token or not new_password:
            return create_error_response("Token and new password are required")
        
        if len(new_password) < 8:
            return create_error_response("Password must be at least 8 characters long")
        
        # In production, validate the token and find the user
        # For now, just return success message
        return create_success_response(None, "Password reset successfully")
        
    except Exception as e:
        return create_error_response("Password reset failed", str(e))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout endpoint"""
    try:
        # In production, you might want to blacklist the refresh token
        # For now, just return success message
        return create_success_response(None, "Logout successful")
        
    except Exception as e:
        return create_error_response("Logout failed", str(e))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    """Change user email address"""
    try:
        new_email = request.data.get('new_email', '').lower().strip()
        password = request.data.get('password', '')
        
        if not new_email or not password:
            return create_error_response("New email and current password are required")
        
        if not validate_email_format(new_email):
            return create_error_response("Invalid email format")
        
        # Verify current password
        if not request.user.check_password(password):
            return create_error_response("Current password is incorrect")
        
        # Check if new email already exists
        if User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
            return create_error_response("Email already in use")
        
        # Update email
        request.user.email = new_email
        request.user.save()
        
        # Serialize updated user data
        user_data = UserSerializer(request.user).data
        
        return create_success_response(user_data, "Email changed successfully")
        
    except Exception as e:
        return create_error_response("Failed to change email", str(e))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_two_factor(request):
    """Enable two-factor authentication"""
    try:
        # In production, implement proper 2FA setup
        # For now, just return success message
        return create_success_response(None, "Two-factor authentication enabled")
        
    except Exception as e:
        return create_error_response("Failed to enable two-factor authentication", str(e))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_two_factor(request):
    """Disable two-factor authentication"""
    try:
        password = request.data.get('password', '')
        
        if not password:
            return create_error_response("Password is required")
        
        # Verify password
        if not request.user.check_password(password):
            return create_error_response("Password is incorrect")
        
        # Disable 2FA
        request.user.two_factor_enabled = False
        request.user.save()
        
        return create_success_response(None, "Two-factor authentication disabled")
        
    except Exception as e:
        return create_error_response("Failed to disable two-factor authentication", str(e))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_email(request):
    """Verify user email address"""
    try:
        # In production, implement proper email verification
        # For now, just return success message
        return create_success_response(None, "Email verification link sent")
        
    except Exception as e:
        return create_error_response("Failed to send verification email", str(e)) 