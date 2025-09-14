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
        serializer = UserRegistrationSerializer(data=request.data)
        
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
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            # Authenticate user
            user = authenticate(request, username=username, password=password)
            
            if not user:
                return Response({
                    'success': False,
                    'message': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if not user.is_active:
                return Response({
                    'success': False,
                    'message': 'Account is deactivated'
                }, status=status.HTTP_403_FORBIDDEN)
            
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
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'data': response_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Login failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Login failed',
            'errors': str(e)
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