from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.user_registration, name='user_registration'),
    path('auth/login/', views.user_login, name='user_login'),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/refresh/', views.refresh_token, name='refresh_token'),
    
    # User profile endpoints
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/change-password/', views.change_password, name='change_password'),
    
    # Admin endpoints
    path('users/', views.list_users, name='list_users'),
] 