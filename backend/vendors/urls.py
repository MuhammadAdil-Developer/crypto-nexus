from django.urls import path
from . import views

urlpatterns = [
    # Vendor application endpoints
    path('applications/', views.list_applications, name='list_applications'),
    path('applications/create/', views.create_application, name='create_application'),
    path('applications/<int:application_id>/approve/', views.approve_application, name='approve_application'),
    path('applications/<int:application_id>/reject/', views.reject_application, name='reject_application'),
    path('applications/check/<str:username>/', views.check_application_status, name='check_application_status'),
    
    # Public approved vendors
    path('approved/', views.list_approved_vendors, name='list_approved_vendors'),
    
    # Vendor statistics
    path('statistics/<str:vendor_username>/', views.get_vendor_statistics, name='get_vendor_statistics'),
    
    # Admin invite vendor
    path('invite/', views.invite_vendor, name='invite_vendor'),
] 