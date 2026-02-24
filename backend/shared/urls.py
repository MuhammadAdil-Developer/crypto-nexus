from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'announcements', views.AnnouncementViewSet, basename='announcements')
router.register(r'communications', views.AdminCommunicationView, basename='communications')
router.register(r'ip-restrictions', views.IPRestrictionViewSet, basename='ip-restrictions')

urlpatterns = [
    # Public maintenance status check
    path('maintenance/status/', views.check_maintenance_status, name='maintenance_status'),
    
    # Authoritative marketplace time
    path('market-time/', views.get_market_time, name='get_market_time'),
    
    # Security Endpoints
    path('security/summary/', views.SecuritySummaryAPIView.as_view(), name='security_summary'),
    path('security/logs/', views.SecurityLogsAPIView.as_view(), name='security_logs'),
    path('security/settings/', views.SecuritySettingsAPIView.as_view(), name='security_settings'),
    path('security/2fa-status/', views.TwoFactorStatusAPIView.as_view(), name='security_2fa_status'),
    
    # Admin-only maintenance mode management
    path('maintenance/manage/', views.manage_maintenance_mode, name='manage_maintenance'),
    
    # New Router urls
    path('', include(router.urls)),
]
