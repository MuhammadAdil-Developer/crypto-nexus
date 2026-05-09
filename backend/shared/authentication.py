"""
Custom authentication that supports both cookie-based and header-based JWT authentication
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import authentication, exceptions


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks cookies as well as Authorization header
    """

    def authenticate(self, request):
        # First try to get token from cookies
        access_token = request.COOKIES.get('ac_access_token')

        if not access_token:
            # Fall back to Authorization header
            access_token = self.get_header(request)

        if not access_token:
            return None  # No authentication attempted

        try:
            validated_token = self.get_validated_token(access_token)
        except exceptions.ValidationError:
            return None  # Invalid token, try next auth method

        return (self.get_user(validated_token), validated_token)


class RefreshTokenCookieAuthentication(authentication.BaseAuthentication):
    """
    Authenticate using refresh token from cookie for token refresh endpoint
    """

    def authenticate(self, request):
        refresh_token = request.COOKIES.get('ac_refresh_token')
        if refresh_token:
            return (None, {'refresh_token': refresh_token})
        return None