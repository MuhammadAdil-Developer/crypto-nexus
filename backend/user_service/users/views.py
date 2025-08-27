import sys
import os

# Add the shared utilities to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from utils import create_success_response, create_error_response, paginate_queryset, check_permission

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import User
from .serializers import UserSerializer, UserDetailSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user's profile"""
    try:
        serializer = UserSerializer(request.user)
        return create_success_response(serializer.data, "Profile retrieved successfully")
    except Exception as e:
        return create_error_response("Failed to retrieve profile", str(e))


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user's profile"""
    try:
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return create_success_response(serializer.data, "Profile updated successfully")
        else:
            return create_error_response("Invalid data", serializer.errors)
            
    except Exception as e:
        return create_error_response("Failed to update profile", str(e))


@api_view(['GET'])
@permission_classes([IsAdminUser])
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
        paginated_data = paginate_queryset(queryset, page, page_size)
        
        # Serialize data
        serializer = UserSerializer(paginated_data['data'], many=True)
        
        response_data = {
            'users': serializer.data,
            'pagination': paginated_data['pagination']
        }
        
        return create_success_response(response_data, "Users retrieved successfully")
        
    except Exception as e:
        return create_error_response("Failed to retrieve users", str(e))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_detail(request, user_id):
    """Get detailed information about a specific user (admin only)"""
    try:
        user = get_object_or_404(User, id=user_id, is_deleted=False)
        serializer = UserDetailSerializer(user)
        return create_success_response(serializer.data, "User details retrieved successfully")
        
    except Exception as e:
        return create_error_response("Failed to retrieve user details", str(e))


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_user(request, user_id):
    """Update user information (admin only)"""
    try:
        user = get_object_or_404(User, id=user_id, is_deleted=False)
        serializer = UserDetailSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return create_success_response(serializer.data, "User updated successfully")
        else:
            return create_error_response("Invalid data", serializer.errors)
            
    except Exception as e:
        return create_error_response("Failed to update user", str(e))


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_user(request, user_id):
    """Soft delete a user (admin only)"""
    try:
        user = get_object_or_404(User, id=user_id, is_deleted=False)
        user.is_deleted = True
        user.is_active = False
        user.save()
        
        return create_success_response(None, "User deleted successfully")
        
    except Exception as e:
        return create_error_response("Failed to delete user", str(e))


@api_view(['POST'])
@permission_classes([IsAdminUser])
def verify_user(request, user_id):
    """Verify a user account (admin only)"""
    try:
        user = get_object_or_404(User, id=user_id, is_deleted=False)
        user.is_verified = True
        user.save()
        
        return create_success_response(None, "User verified successfully")
        
    except Exception as e:
        return create_error_response("Failed to verify user", str(e))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """Search users by name or email (authenticated users)"""
    try:
        search = request.GET.get('q', '')
        if not search or len(search) < 2:
            return create_error_response("Search query must be at least 2 characters long")
        
        # Limit search to basic user info for security
        users = User.objects.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search),
            is_active=True,
            is_deleted=False
        )[:10]  # Limit results
        
        serializer = UserSerializer(users, many=True)
        return create_success_response(serializer.data, "Search completed successfully")
        
    except Exception as e:
        return create_error_response("Search failed", str(e))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    try:
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return create_error_response("Both current and new password are required")
        
        # Verify current password
        if not request.user.check_password(current_password):
            return create_error_response("Current password is incorrect")
        
        # Validate new password
        if len(new_password) < 8:
            return create_error_response("New password must be at least 8 characters long")
        
        # Set new password
        request.user.set_password(new_password)
        request.user.save()
        
        return create_success_response(None, "Password changed successfully")
        
    except Exception as e:
        return create_error_response("Failed to change password", str(e))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """Get user statistics (admin only)"""
    try:
        if not check_permission(request.user.user_type, 'admin'):
            return create_error_response("Insufficient permissions", status_code=status.HTTP_403_FORBIDDEN)
        
        total_users = User.objects.filter(is_deleted=False).count()
        active_users = User.objects.filter(is_active=True, is_deleted=False).count()
        verified_users = User.objects.filter(is_verified=True, is_deleted=False).count()
        
        user_type_counts = {}
        for user_type, _ in User.USER_TYPES:
            user_type_counts[user_type] = User.objects.filter(
                user_type=user_type, 
                is_deleted=False
            ).count()
        
        stats = {
            'total_users': total_users,
            'active_users': active_users,
            'verified_users': verified_users,
            'user_type_breakdown': user_type_counts
        }
        
        return create_success_response(stats, "User statistics retrieved successfully")
        
    except Exception as e:
        return create_error_response("Failed to retrieve user statistics", str(e)) 