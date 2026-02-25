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


@api_view(['GET'])
@permission_classes([AllowAny])
def get_market_time(request):
    """
    Returns the authoritative marketplace time (UTC)
    """
    from django.utils import timezone
    now = timezone.now()
    return Response({
        'success': True,
        'data': {
            'market_time': now.isoformat(),
            'timezone': 'UTC (Market Time)',
            'timestamp': int(now.timestamp() * 1000)
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
from shared.models import Announcement, Notification, UserActivity, IPRestriction, SystemConfiguration
from shared.serializers import (
    AnnouncementSerializer, UserActivitySerializer, 
    IPRestrictionSerializer, SystemConfigurationSerializer
)
from django.contrib.auth import get_user_model
from rest_framework.views import APIView

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

        User = get_user_model()
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

class SecuritySummaryAPIView(APIView):
    """API for security dashboard stats"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            now = timezone.now()
            day_ago = now - timezone.timedelta(days=1)
            
            # Failed logins in last 24h
            failed_logins = UserActivity.objects.filter(
                activity_type='login_failed',
                created_at__gte=day_ago
            ).count()
            
            User = get_user_model()
            # Active sessions - This is a heuristic, counting active users in last 15 mins
            active_sessions = User.objects.filter(
                last_login__gte=now - timezone.timedelta(minutes=15),
                is_active=True
            ).count()
            
            User = get_user_model()
            # 2FA Stats
            total_admins = User.objects.filter(user_type='admin').count()
            admins_with_2fa = User.objects.filter(user_type='admin', two_factor_enabled=True).count()
            
            # Blocked IPs
            blocked_ips_count = IPRestriction.objects.filter(restriction_type='blacklist').count()
            
            return Response({
                'success': True,
                'data': {
                    'failed_logins_24h': failed_logins,
                    'active_sessions': active_sessions,
                    'two_fa_enabled_ratio': f"{admins_with_2fa}/{total_admins}",
                    'blocked_ips_count': blocked_ips_count
                }
            })
        except Exception as e:
            logger.error(f"Error in SecuritySummaryAPIView: {e}")
            return Response({'error': str(e)}, status=500)

class SecurityLogsAPIView(APIView):
    """List security logs from UserActivity"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            # We want specific security-related activities
            security_types = ['login', 'logout', 'login_failed', 'password_changed', 'security_alert']
            logs = UserActivity.objects.filter(activity_type__in=security_types).order_by('-created_at')[:100]
            serializer = UserActivitySerializer(logs, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class IPRestrictionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing IP whitelists and blacklists"""
    serializer_class = IPRestrictionSerializer
    permission_classes = [IsAdminUser]
    queryset = IPRestriction.objects.all()

    def get_queryset(self):
        restriction_type = self.request.query_params.get('type')
        if restriction_type:
            return IPRestriction.objects.filter(restriction_type=restriction_type)
        return IPRestriction.objects.all()

class SecuritySettingsAPIView(APIView):
    """Manage general security settings via SystemConfiguration"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings_keys = [
            'enforce_2fa_admins', 'session_timeout', 'max_login_attempts', 
            'lockout_duration', 'password_expiry', 'audit_logging'
        ]
        configs = SystemConfiguration.objects.filter(key__in=settings_keys)
        # Create a dict of key:value
        settings_dict = {c.key: c.value for c in configs}
        
        # Ensure all keys exist with defaults if not set
        defaults = {
            'enforce_2fa_admins': 'true',
            'session_timeout': '60',
            'max_login_attempts': '5',
            'lockout_duration': '30',
            'password_expiry': '90',
            'audit_logging': 'true'
        }
        for key, val in defaults.items():
            if key not in settings_dict:
                settings_dict[key] = val
                
        return Response({
            'success': True,
            'data': settings_dict
        })

    def post(self, request):
        try:
            data = request.data
            for key, value in data.items():
                SystemConfiguration.set_value(key, value)
            return Response({'success': True, 'message': 'Settings updated'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class TwoFactorStatusAPIView(APIView):
    """Get 2FA status for all admin/staff users"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        User = get_user_model()
        admins = User.objects.filter(
            Q(user_type='admin') | Q(is_staff=True),
            is_deleted=False,
            is_active=True
        )
        data = []
        for admin in admins:
            data.append({
                'id': admin.id,
                'username': admin.username,
                'role': admin.user_type.capitalize(),
                'twoFAEnabled': admin.two_factor_enabled,
                'lastLogin': admin.last_login.strftime('%Y-%m-%d %H:%M') if admin.last_login else 'Never',
                'backupCodes': 0, # Placeholder
                'deviceTrust': 'Trusted' if admin.is_verified else 'Unknown'
            })
        return Response({
            'success': True,
            'data': data
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
