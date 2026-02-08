from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from shared.maintenance import MaintenanceMode
from users.views import IsAdminUser
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_maintenance_status(request):
    """
    Public endpoint to check if maintenance mode is active
    """
    is_enabled = MaintenanceMode.is_enabled()
    
    # Check if current user is admin
    is_admin = False
    if request.user.is_authenticated:
        is_admin = (
            (hasattr(request.user, 'user_type') and request.user.user_type == 'admin') or
            request.user.is_superuser or
            request.user.is_staff
        )
    
    return Response({
        'success': True,
        'data': {
            'maintenance_mode': is_enabled,
            'message': MaintenanceMode.get_message() if is_enabled else None,
            'is_admin': is_admin,
            'can_access': is_admin or not is_enabled
        }
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def manage_maintenance_mode(request):
    """
    Admin endpoint to get/set maintenance mode
    GET: Get current maintenance status
    POST: Update maintenance mode (enable/disable)
    """
    if request.method == 'GET':
        return Response({
            'success': True,
            'data': {
                'enabled': MaintenanceMode.is_enabled(),
                'message': MaintenanceMode.get_message()
            }
        })
    
    elif request.method == 'POST':
        enabled = request.data.get('enabled', False)
        message = request.data.get('message', "We're currently performing scheduled maintenance. We'll be back shortly!")
        
        if enabled:
            MaintenanceMode.enable(message)
            logger.info(f"Maintenance mode enabled by {request.user.username}")
        else:
            MaintenanceMode.disable()
            logger.info(f"Maintenance mode disabled by {request.user.username}")
        
        return Response({
            'success': True,
            'message': f"Maintenance mode {'enabled' if enabled else 'disabled'} successfully",
            'data': {
                'enabled': MaintenanceMode.is_enabled(),
                'message': MaintenanceMode.get_message() if enabled else None
            }
        })


from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q
from shared.models import Announcement, Notification
from shared.serializers import AnnouncementSerializer
from users.models import User

class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing announcements.
    Admins can CRUD all.
    Regular users can only list active ones targeted at them.
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()

        # If admin, return all
        if hasattr(user, 'user_type') and user.user_type == 'admin':
            return Announcement.objects.all()
        if user.is_superuser:
            return Announcement.objects.all()

        # Build query for regular users
        query = Q(is_active=True) & (Q(end_date__isnull=True) | Q(end_date__gte=now))
        
        # Audience filter
        audience_query = Q(audience='all')
        if hasattr(user, 'user_type'):
            if user.user_type == 'buyer':
                audience_query |= Q(audience='buyer')
            elif user.user_type == 'vendor':
                audience_query |= Q(audience='vendor')
            
        return Announcement.objects.filter(query & audience_query)

    def perform_create(self, serializer):
        user = self.request.user
        if not ((hasattr(user, 'user_type') and user.user_type == 'admin') or user.is_superuser):
            raise permissions.PermissionDenied("Only admins can create announcements")
        serializer.save(created_by=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class AdminCommunicationView(viewsets.ViewSet):
    """
    Admin endpoints for communications
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'])
    def send_bulk_notification(self, request):
        """
        Send a notification to a specific group of users
        """
        title = request.data.get('title')
        message = request.data.get('message')
        target_group = request.data.get('target_group')  # 'all', 'buyers', 'vendors'
        notif_type = request.data.get('type', 'system')

        if not all([title, message, target_group]):
            return Response({'error': 'Missing required fields (title, message, target_group)'}, status=status.HTTP_400_BAD_REQUEST)

        users_to_notify = User.objects.none()
        
        if target_group == 'all':
            users_to_notify = User.objects.filter(is_active=True)
        elif target_group == 'buyers':
            users_to_notify = User.objects.filter(user_type='buyer', is_active=True)
        elif target_group == 'vendors':
            users_to_notify = User.objects.filter(user_type='vendor', is_active=True)
        else:
            return Response({'error': 'Invalid target group'}, status=status.HTTP_400_BAD_REQUEST)

        count = users_to_notify.count()
        if count == 0:
             return Response({
                'success': True, 
                'message': 'No users found in the target group.'
            })

        # Create notifications in bulk
        notifications = [
            Notification(
                user=user,
                type=notif_type,
                title=title,
                message=message,
                data={'is_bulk': True}
            ) for user in users_to_notify
        ]
        
        Notification.objects.bulk_create(notifications)
        
        return Response({
            'success': True, 
            'message': f'Notification sent to {count} users'
        })

def handler404(request, exception=None):
    """
    Custom 404 handler to return JSON instead of HTML
    """
    response_data = {
        'success': False,
        'message': 'The requested resource was not found on this server.',
        'error_code': 'not_found'
    }
    return JsonResponse(response_data, status=404)


def handler500(request):
    """
    Custom 500 handler to return JSON instead of HTML
    """
    response_data = {
        'success': False,
        'message': 'An internal server error occurred. Our team has been notified.',
        'error_code': 'internal_server_error'
    }
    return JsonResponse(response_data, status=500)
