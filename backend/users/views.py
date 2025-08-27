from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction

from .models import User
from .serializers import (
    UserSerializer, UserDetailSerializer, 
    UserRegistrationSerializer, UserLoginSerializer
)


class IsAdminOrSuperUser(BasePermission):
    """
    Custom permission class to check if user is admin or superuser
    Works with JWT authentication
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is superuser (Django's built-in field)
        if request.user.is_superuser:
            return True
        
        # Check if user has admin user_type
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            return True
        
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
def user_registration(request):
    """User registration endpoint"""
    try:
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            with transaction.atomic():
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
                    'message': 'User registered successfully',
                    'data': response_data
                }, status=status.HTTP_201_CREATED)
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
    """User login endpoint"""
    try:
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            # Authenticate user
            user = authenticate(request, email=email, password=password)
            
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
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh access token using refresh token"""
    try:
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify and decode refresh token
        refresh = RefreshToken(refresh_token)
        
        # Generate new access token
        access_token = str(refresh.access_token)
        
        return Response({
            'success': True,
            'message': 'Token refreshed successfully',
            'data': {
                'access': access_token
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Token refresh failed',
            'errors': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user's profile"""
    try:
        serializer = UserSerializer(request.user)
        return Response({
            'success': True,
            'message': 'Profile retrieved successfully',
            'data': serializer.data
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to retrieve profile',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user's profile"""
    try:
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': serializer.data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to update profile',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    try:
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                'success': False,
                'message': 'Both current and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify current password
        if not request.user.check_password(current_password):
            return Response({
                'success': False,
                'message': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password
        if len(new_password) < 8:
            return Response({
                'success': False,
                'message': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        request.user.set_password(new_password)
        request.user.save()
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to change password',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout endpoint"""
    try:
        # In production, you might want to blacklist the refresh token
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
@permission_classes([IsAdminOrSuperUser])
def list_users(request):
    """List all users (admin only)"""
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
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        
        # Order by creation date
        queryset = queryset.order_by('-created_at')
        
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