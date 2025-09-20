from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Endpoints
    path('api/v1/', include('users.urls')),
    path('api/v1/products/', include('products.urls')),  # Fixed: added 'products/' prefix
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('vendors.urls')),
    path('api/v1/payments/', include('payments.urls')),  # Fixed: added 'payments/' prefix
    path('api/v1/', include('notifications.urls')),
    path('api/v1/messaging/', include('messaging.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) 