from django.urls import path
from . import views, captcha_views

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.user_registration, name='user_registration'),
    path('auth/login/', views.user_login, name='user_login'),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/recover/', views.recover_account, name='recover_account'),
    
    # User profile endpoints
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/payout/', views.payout_addresses, name='payout_addresses'),
    path('profile/change-password/', views.change_password, name='change_password'),
    path('profile/accept-legal/', views.accept_legal, name='accept_legal'),
    
    # Admin endpoints
    path('users/', views.list_users, name='list_users'),
    path('users/<uuid:user_id>/', views.user_detail, name='user_detail'),
    path('users/<uuid:user_id>/update/', views.admin_update_user, name='admin_update_user'),
    path('users/<uuid:user_id>/delete/', views.delete_user, name='delete_user'),
    path('users/<uuid:user_id>/verify/', views.verify_user, name='verify_user'),
    path('users/<uuid:user_id>/reset-password/', views.admin_reset_password, name='admin_reset_password'),
    path('users/<uuid:user_id>/activity/', views.user_activity, name='user_activity'),
    path('users/<uuid:user_id>/login-as/', views.login_as_user, name='login_as_user'),
    
    # 2FA endpoints
    path('auth/enable-2fa/', views.enable_2fa, name='enable_2fa'),
    path('auth/disable-2fa/', views.disable_2fa, name='disable_2fa'),
    
    # Captcha endpoints
    path('auth/captcha/challenge/', captcha_views.get_captcha_challenge, name='captcha_challenge'),
    path('auth/captcha/verify/', captcha_views.verify_captcha_challenge, name='captcha_verify'),
]