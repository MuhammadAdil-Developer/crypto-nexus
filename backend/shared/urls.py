from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'announcements', views.AnnouncementViewSet, basename='announcements')
router.register(r'communications', views.AdminCommunicationView, basename='communications')

urlpatterns = [
    # Public maintenance status check
    path('maintenance/status/', views.check_maintenance_status, name='maintenance_status'),
    
    # Authoritative marketplace time
    path('market-time/', views.get_market_time, name='get_market_time'),
    
    # Admin-only maintenance mode management
    path('maintenance/manage/', views.manage_maintenance_mode, name='manage_maintenance'),
    
    # New Router urls
    path('', include(router.urls)),
]
