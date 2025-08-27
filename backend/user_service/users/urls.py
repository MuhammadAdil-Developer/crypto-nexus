from django.urls import path
from . import views

urlpatterns = [
    # User profile endpoints
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/change-password/', views.change_password, name='change_password'),
    path('profile/change-email/', views.change_email, name='change_email'),
    
    # User management endpoints (admin only)
    path('users/', views.list_users, name='list_users'),
    path('users/<uuid:user_id>/', views.user_detail, name='user_detail'),
    path('users/<uuid:user_id>/update/', views.admin_update_user, name='admin_update_user'),
    path('users/<uuid:user_id>/delete/', views.delete_user, name='delete_user'),
    path('users/<uuid:user_id>/verify/', views.verify_user, name='verify_user'),
    
    # Search and statistics
    path('search/', views.search_users, name='search_users'),
    path('stats/', views.user_stats, name='user_stats'),
] 