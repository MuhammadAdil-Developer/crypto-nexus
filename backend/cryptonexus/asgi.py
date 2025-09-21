import os
from django.core.asgi import get_asgi_application

# Set Django settings module before importing Django models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')

# Initialize Django ASGI application
django_asgi_app = get_asgi_application()

# Import after Django is configured
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from messaging.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})
