from django.urls import path
from . import auth_views

urlpatterns = [
    # Authentication endpoints
    path('register/', auth_views.user_registration, name='user_registration'),
    path('login/', auth_views.user_login, name='user_login'),
    path('logout/', auth_views.logout, name='logout'),
    path('refresh/', auth_views.refresh_token, name='refresh_token'),
    
    # Password management
    path('forgot-password/', auth_views.forgot_password, name='forgot_password'),
    path('reset-password/', auth_views.reset_password, name='reset_password'),
    
    # Account security
    path('change-email/', auth_views.change_email, name='change_email'),
    path('enable-2fa/', auth_views.enable_two_factor, name='enable_two_factor'),
    path('disable-2fa/', auth_views.disable_two_factor, name='disable_two_factor'),
    path('verify-email/', auth_views.verify_email, name='verify_email'),
] 