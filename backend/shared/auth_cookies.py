"""
Authentication cookie utilities
Provides httpOnly cookie handling for secure token storage
"""
from django.http import JsonResponse
from datetime import timedelta


def set_auth_cookies(response, access_token, refresh_token, remember_me=False):
    """
    Set httpOnly authentication cookies in the response

    Args:
        response: Django response object
        access_token: JWT access token string
        refresh_token: JWT refresh token string
        remember_me: If True, extended cookie expiry (20 days), else default (6 days)
    """
    # Set expiry based on remember_me
    max_age = 20 * 24 * 60 * 60 if remember_me else 6 * 24 * 60 * 60  # 20 days or 6 days

    # Set access token cookie (httpOnly for security)
    response.set_cookie(
        'ac_access_token',
        access_token,
        max_age=max_age,
        httponly=True,
        secure=True,  # Only send over HTTPS
        samesite='Strict',
        path='/'
    )

    # Set refresh token cookie
    response.set_cookie(
        'ac_refresh_token',
        refresh_token,
        max_age=max_age,
        httponly=True,
        secure=True,
        samesite='Strict',
        path='/'
    )

    return response


def clear_auth_cookies(response):
    """
    Clear authentication cookies (for logout)
    """
    response.delete_cookie('ac_access_token', path='/')
    response.delete_cookie('ac_refresh_token', path='/')
    return response