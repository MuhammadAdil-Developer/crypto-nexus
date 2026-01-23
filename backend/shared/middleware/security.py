import re
from django.http import HttpResponseForbidden, HttpResponsePermanentRedirect
from django.conf import settings

class SecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.sensitive_patterns = [
            re.compile(r'\.env', re.IGNORECASE),
            re.compile(r'\.git', re.IGNORECASE),
            re.compile(r'\.aws', re.IGNORECASE),
            re.compile(r'docker-compose', re.IGNORECASE),
            re.compile(r'Procfile', re.IGNORECASE),
        ]

    def __call__(self, request):
        # 1. Block access to sensitive files
        path = request.path_info
        for pattern in self.sensitive_patterns:
            if pattern.search(path):
                return HttpResponseForbidden("Access Denied")

        # 2. Force HTTPS in production (if configured)
        if not settings.DEBUG and not request.is_secure() and not request.headers.get('X-Forwarded-Proto') == 'https':
            # Check if SITE_URL starts with https
            if getattr(settings, 'SITE_URL', '').startswith('https://'):
                return HttpResponsePermanentRedirect(f"https://{request.get_host()}{request.get_full_path()}")

        response = self.get_response(request)

        # 3. Add Security Headers
        self._add_security_headers(response)

        return response

    def _add_security_headers(self, response):
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # XSS Protection (Browser usually handles this, but good to have)
        response['X-XSS-Protection'] = '1; mode=block'

        # Prevent clickjacking
        response['X-Frame-Options'] = 'SAMEORIGIN'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Strict Transport Security (HSTS) - 1 year
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
            
        # SECURITY: Remove tech stack fingerprints
        if 'Server' in response:
            del response['Server']
        if 'X-Powered-By' in response:
            del response['X-Powered-By']
        
        return response
