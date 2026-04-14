from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from shared.maintenance import MaintenanceMode
import logging

logger = logging.getLogger(__name__)

class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Middleware to check if maintenance mode is enabled and block non-admin users
    """
    
    # Paths that should always be accessible even in maintenance mode
    ALLOWED_PATHS = [
        '/api/v1/auth/login/',
        '/api/v1/auth/refresh/',
        '/api/v1/auth/captcha/', # ALLOW CAPTCHA FOR LOGIN
        '/api/v1/system/maintenance/',
        '/admin/',  # Django admin
        '/static/',
        '/media/',
    ]
    
    def process_request(self, request):
        # Check if maintenance mode is enabled
        if not MaintenanceMode.is_enabled():
            return None
        
        # Allow access to certain paths
        path = request.path
        for allowed_path in self.ALLOWED_PATHS:
            if path.startswith(allowed_path):
                return None
        
        # Allow admin users to access everything
        if request.user.is_authenticated:
            # Check if user is admin or superuser
            if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
                return None
            if request.user.is_superuser or request.user.is_staff:
                return None
        
        # Block all other requests with maintenance message
        return JsonResponse({
            'success': False,
            'maintenance_mode': True,
            'message': MaintenanceMode.get_message(),
            'error_code': 'MAINTENANCE_MODE'
        }, status=503)
