from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Endpoints
    path('api/v1/system/', include('shared.urls')),  # System/Maintenance endpoints - Moved up for priority
    path('api/v1/', include('users.urls')),
    path('api/v1/products/', include('products.urls')),  # Fixed: added 'products/' prefix
    path('api/v1/', include('orders.urls')),
    path('api/v1/vendors/', include('vendors.urls')),  # Fixed: added 'vendors/' prefix
    path('api/v1/payments/', include('payments.urls')),  # Fixed: added 'payments/' prefix
    path('api/v1/', include('notifications.urls')),
    path('api/v1/messaging/', include('messaging.urls')),
    path('api/v1/disputes/', include('disputes.urls')),
    path('api/v1/tickets/', include('tickets.urls')),
    path('api/v1/wishlist/', include('wishlist.urls')),
    path('api/v1/', include('admin.urls')),
    path('api/v1/content/', include('content.urls')),
]

# Serve media and static files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # Manual serving for production if no separate static server (like Nginx) is configured
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    ]

# Custom Error Handlers
handler404 = 'shared.views.handler404'
handler500 = 'shared.views.handler500'