from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone

from .models import User
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, 
    UserSerializer, UserUpdateSerializer
)
from .captcha_validator import CaptchaValidator


class IsAdminUser(BasePermission):
    """
    Custom permission class to check if user is admin
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has admin user_type
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            return True
        
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
def user_registration(request):
    """User registration endpoint - username + password only"""
    try:
        # Store request data in a variable to avoid multiple reads
        request_data = request.data
        print(f"🔍 Registration request data: {request_data}")  # Debug log
        
        # Validate captcha token
        captcha_token = request_data.get('captcha_token')
        print(f"🔍 Registration captcha token: {captcha_token}")  # Debug log
        
        if captcha_token:
            captcha_result = CaptchaValidator.validate_captcha_token(
                captcha_token, 
                'register-captcha'
            )
            print(f"🔍 Captcha validation result: {captcha_result}")  # Debug log
            
            if not captcha_result['success']:
                return Response({
                    'success': False,
                    'message': captcha_result['message'],
                    'error_code': 'CAPTCHA_VALIDATION_FAILED'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                'success': False,
                'message': 'Captcha verification is required',
                'error_code': 'CAPTCHA_REQUIRED'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = UserRegistrationSerializer(data=request_data)
        
        if serializer.is_valid():
                user = serializer.save()
                
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
                
                return Response({
                    'success': True,
                'message': 'Registration successful',
                    'data': response_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Registration failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Registration failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """User login endpoint - username + password only"""
    try:
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 Request content type: {request.content_type}")
        
        # Store request data in a variable to avoid multiple reads
        request_data = request.data
        print(f"🔍 Login request data: {request_data}")  # Debug log
        
        # Always require CAPTCHA for login (client requirement)
        captcha_token = request_data.get('captcha_token')
        username = request_data.get('username', '')
        client_ip = request.META.get('REMOTE_ADDR', '')
        
        # Check failed login attempts in last 15 minutes
        from django.core.cache import cache
        failed_attempts_key = f"failed_login_attempts_{client_ip}_{username}"
        failed_attempts = cache.get(failed_attempts_key, 0)
        
        print(f"🔍 Failed attempts: {failed_attempts}")
        
        # Always require CAPTCHA token for login
        if not captcha_token:
            return Response({
                'success': False,
                'message': 'Security verification is required to continue',
                'error_code': 'CAPTCHA_REQUIRED',
                'captcha_required': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate CAPTCHA token
        site_key = 'admin-login-captcha' if '/admin' in request.path else 'login-captcha'
        captcha_result = CaptchaValidator.validate_captcha_token(
            captcha_token, 
            site_key
        )
        print(f"🔍 Captcha validation result: {captcha_result}")  # Debug log
        
        if not captcha_result['success']:
            return Response({
                'success': False,
                'message': captcha_result['message'],
                'error_code': 'CAPTCHA_VALIDATION_FAILED',
                'captcha_required': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = UserLoginSerializer(data=request_data)
        
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            # Authenticate user
            user = authenticate(request, username=username, password=password)
            
            if not user:
                # Increment failed attempts
                new_failed_attempts = failed_attempts + 1
                cache.set(failed_attempts_key, new_failed_attempts, 900)  # 15 minutes
                return Response({
                    'success': False,
                    'message': 'Invalid username or password.',
                    'error_code': 'INVALID_CREDENTIALS',
                    'captcha_required': False  # Don't require CAPTCHA again since it was already provided
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not user.is_active:
                return Response({
                    'success': False,
                    'message': 'Account is deactivated. Please contact support.',
                    'error_code': 'ACCOUNT_DEACTIVATED',
                    'captcha_required': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Clear failed attempts on successful login
            cache.delete(failed_attempts_key)
            
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
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'data': response_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid input data. Please check your username and password.',
                'error_code': 'VALIDATION_ERROR',
                'errors': serializer.errors,
                'captcha_required': False
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        import traceback
        print(f"❌ Login error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        return Response({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.',
            'error_code': 'INTERNAL_ERROR',
            'captcha_required': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout endpoint"""
    try:
        # In a real implementation, you might want to blacklist the token
        return Response({
            'success': True,
            'message': 'Logout successful'
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Logout failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile - no PII"""
    try:
        user_data = UserSerializer(request.user).data
        return Response({
            'success': True,
            'data': user_data
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to get profile',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update user profile - limited fields only"""
    try:
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            user_data = UserSerializer(request.user).data
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': user_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Update failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Update failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all users (admin only)"""
    # Check if user is admin
    if not hasattr(request.user, 'user_type') or request.user.user_type != 'admin':
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.',
            'errors': 'You do not have permission to perform this action.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get query parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        search = request.GET.get('search', '')
        user_type = request.GET.get('user_type', '')
        
        # Build queryset
        queryset = User.objects.filter(is_deleted=False)
        
        # Apply filters
        if search:
            queryset = queryset.filter(username__icontains=search)
        
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        
        # Order by creation date
        queryset = queryset.order_by('-date_joined')
        
        # Paginate results
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_data = queryset[start:end]
        
        # Serialize data
        serializer = UserSerializer(paginated_data, many=True)
        
        response_data = {
            'users': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size,
                'has_next': end < total_count,
                'has_previous': page > 1
            }
        }
        
        return Response({
            'success': True,
            'message': 'Users retrieved successfully',
            'data': response_data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to retrieve users',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 