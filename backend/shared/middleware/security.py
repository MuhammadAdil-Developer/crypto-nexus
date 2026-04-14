import re
import logging
from django.http import HttpResponseForbidden, HttpResponsePermanentRedirect, HttpResponse
from django.conf import settings

logger = logging.getLogger(__name__)

BLOCKED_IP_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background-color: #06090f;
            color: #e6edf3;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }}
        .glow {{
            position: fixed;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(248, 81, 73, 0.08) 0%, transparent 70%);
            filter: blur(60px);
            pointer-events: none;
        }}
        .glow-1 {{ top: -100px; left: -100px; }}
        .glow-2 {{ bottom: -100px; right: -100px; background: radial-gradient(circle, rgba(88, 166, 255, 0.05) 0%, transparent 70%); }}
        .container {{
            text-align: center;
            background: rgba(13, 17, 23, 0.85);
            padding: 3rem 2.5rem;
            border-radius: 20px;
            border: 1px solid #21262d;
            box-shadow: 0 25px 80px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.05);
            max-width: 480px;
            width: 90%;
            position: relative;
            z-index: 10;
            backdrop-filter: blur(20px);
            animation: fadeIn 0.5s ease;
        }}
        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(20px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        .icon-wrap {{
            width: 80px;
            height: 80px;
            background: rgba(248, 81, 73, 0.1);
            border: 1px solid rgba(248, 81, 73, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }}
        .icon-wrap svg {{
            width: 38px;
            height: 38px;
            color: #f85149;
            stroke: #f85149;
        }}
        h1 {{
            font-size: 1.75rem;
            margin-bottom: 0.75rem;
            color: #fff;
            font-weight: 700;
            letter-spacing: -0.02em;
        }}
        .subtitle {{
            color: #8b949e;
            line-height: 1.7;
            margin-bottom: 2rem;
            font-size: 0.95rem;
        }}
        .ip-row {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 10px;
            padding: 0.75rem 1rem;
            margin-bottom: 2rem;
        }}
        .ip-label {{
            color: #484f58;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        .ip-value {{
            font-family: 'Fira Code', 'Courier New', monospace;
            color: #58a6ff;
            font-weight: 600;
            font-size: 0.95rem;
        }}
        .footer {{
            font-size: 0.8rem;
            color: #30363d;
            border-top: 1px solid #21262d;
            padding-top: 1.25rem;
        }}
        .error-code {{
            display: inline-block;
            background: rgba(248, 81, 73, 0.08);
            color: #f85149;
            border: 1px solid rgba(248, 81, 73, 0.2);
            border-radius: 6px;
            padding: 0.2rem 0.6rem;
            font-size: 0.75rem;
            font-family: monospace;
            margin-bottom: 1rem;
        }}
    </style>
</head>
<body>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
    <div class="container">
        <div class="icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
        </div>
        <div class="error-code">ERROR 403 — IP BLOCKED</div>
        <h1>Access Restricted</h1>
        <p class="subtitle">
            Your IP address has been blocked by our security administrators.
            If you believe this is an error, please contact support.
        </p>
        <div class="ip-row">
            <span class="ip-label">Your IP</span>
            <span class="ip-value">{client_ip}</span>
        </div>
        <div class="footer">
            &copy; 2026 CryptoNexus &bull; Security System
        </div>
    </div>
</body>
</html>"""


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
            if getattr(settings, 'SITE_URL', '').startswith('https://'):
                return HttpResponsePermanentRedirect(f"https://{request.get_host()}{request.get_full_path()}")

        # 3. Block direct IP access in production (Cloudflare bypass prevention)
        if not settings.DEBUG:
            host = request.get_host().split(':')[0]
            if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', host):
                return HttpResponseForbidden("Direct IP access is prohibited.")

        # 4. Check IP Restrictions (Blacklist)
        client_ip = self._get_client_ip(request)

        if client_ip:
            try:
                from shared.models import IPRestriction
                is_blocked = IPRestriction.objects.filter(
                    ip_address=client_ip,
                    restriction_type='blacklist',
                    is_active=True
                ).exists()

                if is_blocked:
                    logger.warning(f"Blocked IP attempted access: {client_ip} -> {path}")
                    accept_header = request.META.get('HTTP_ACCEPT', '')
                    if 'text/html' in accept_header:
                        html = BLOCKED_IP_HTML.format(client_ip=client_ip)
                        return HttpResponse(html, status=403, content_type='text/html')
                    # JSON response for API clients
                    from django.http import JsonResponse
                    return JsonResponse({
                        'success': False,
                        'error': 'access_denied',
                        'message': f'Your IP ({client_ip}) has been blocked by administrators.'
                    }, status=403)

            except Exception as e:
                # Never block all requests if DB check fails
                logger.error(f"IP restriction check failed: {e}")

        response = self.get_response(request)
        self._add_security_headers(response)
        return response

    def _get_client_ip(self, request):
        """Get the real client IP, respecting Cloudflare and proxy headers."""
        # Cloudflare real IP (most reliable when behind CF)
        cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
        if cf_ip:
            return cf_ip.strip()
        # Standard proxy header
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        # Direct connection
        return request.META.get('REMOTE_ADDR', '').strip()

    def _add_security_headers(self, response):
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-XSS-Protection'] = '1; mode=block'
        response['X-Frame-Options'] = 'SAMEORIGIN'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        response.headers.pop('Server', None)
        response.headers.pop('X-Powered-By', None)
        return response
