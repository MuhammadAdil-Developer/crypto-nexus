from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
import logging

from .models import User
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserUpdateSerializer,
    AdminUserUpdateSerializer,
    AdminUserUpdateSerializer,
    PayoutAddressSerializer,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .captcha_validator import CaptchaValidator

logger = logging.getLogger(__name__)


class IsAdminUser(BasePermission):
    """
    Custom permission class to check if user is admin
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check if user is active and NOT deleted
        if not request.user.is_active or getattr(request.user, 'is_deleted', False):
            return False
        
        # Check if user has admin user_type or is superuser/staff
        if (hasattr(request.user, 'user_type') and request.user.user_type == 'admin') or \
           request.user.is_superuser or \
           request.user.is_staff:
            return True
        
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
def user_registration(request):
    """User registration endpoint - username + password only"""
    try:
        # Store request data in a variable to avoid multiple reads
        request_data = request.data
        print(f"🔍 Registration request data: {request_data}")  # Debug log
        
        # Check if this is an admin creating a user (bypass captcha)
        is_admin_creation = False
        if request.user.is_authenticated:
            if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
                is_admin_creation = True
        
        # Validate captcha token (skip for admin-created users)
        if not is_admin_creation:
            captcha_token = request_data.get('captcha_token')
            print(f"🔍 Registration captcha token: {captcha_token}")  # Debug log
            
            if captcha_token:
                captcha_result = CaptchaValidator.validate_captcha_token(
                    captcha_token, 
                    'register-captcha'
                )
                print(f"🔍 Captcha validation result: {captcha_result}")  # Debug log
                
                if not captcha_result['success']:
                    return Response({
                        'success': False,
                        'message': captcha_result['message'],
                        'error_code': 'CAPTCHA_VALIDATION_FAILED'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'success': False,
                    'message': 'Captcha verification is required',
                    'error_code': 'CAPTCHA_REQUIRED'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # For admin-created users, allow setting user_type from request
        if is_admin_creation and 'user_type' in request_data:
            # Create user directly with user_type
            try:
                username = request_data.get('username')
                password = request_data.get('password')
                user_type = request_data.get('user_type', 'buyer')
                
                if not username or not password:
                    return Response({
                        'success': False,
                        'message': 'Username and password are required',
                        'errors': {'username': 'required', 'password': 'required'}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if username already exists
                if User.objects.filter(username=username).exists():
                    return Response({
                        'success': False,
                        'message': 'Username already exists',
                        'errors': {'username': 'Username already exists'}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create user
                user = User.objects.create_user(username=username, password=password, user_type=user_type)
                
                # Don't generate tokens for admin-created users
                user_data = UserSerializer(user).data
                
                return Response({
                    'success': True,
                    'message': 'Registration successful',
                    'data': user_data
                })
            except Exception as e:
                return Response({
                    'success': False,
                    'message': 'Registration failed',
                    'errors': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normal user registration
        serializer = UserRegistrationSerializer(data=request_data)
        
        if serializer.is_valid():
                user = serializer.save()
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                
                # Serialize user data
                user_data = UserSerializer(user).data
                
                response_data = {
                    'user': user_data,
                    'tokens': {
                        'access': access_token,
                        'refresh': refresh_token
                    }
                }
                
                # Notify admin about new user signup
                try:
                    from shared.admin_notifications import notify_admin_new_user_signup
                    notify_admin_new_user_signup(user)
                except Exception as _:
                    pass
                
                return Response({
                    'success': True,
                'message': 'Registration successful',
                    'data': response_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Registration failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Registration failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """User login endpoint - username + password only"""
    try:
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 Request content type: {request.content_type}")
        
        # Store request data in a variable to avoid multiple reads
        request_data = request.data
        print(f"🔍 Login request data: {request_data}")  # Debug log
        
        # Always require CAPTCHA for login (client requirement)
        captcha_token = request_data.get('captcha_token')
        username = request_data.get('username', '')
        
        from shared.utils import get_client_ip
        client_ip = get_client_ip(request) or ''
        
        # Check failed login attempts
        from django.core.cache import cache
        failed_attempts_key = f"failed_login_attempts_{client_ip}_{username}"
        failed_attempts = cache.get(failed_attempts_key, 0)
        
        print(f"🔍 Failed attempts: {failed_attempts}")
        
        # Get dynamic max attempts from SystemConfiguration
        from shared.models import SystemConfiguration
        max_attempts_str = SystemConfiguration.get_value('max_login_attempts', '5')
        try:
            max_attempts = int(max_attempts_str)
        except ValueError:
            max_attempts = 5
            
        if failed_attempts >= max_attempts:
            return Response({
                'success': False,
                'message': f'Maximum login attempts exceeded. Your account is locked for {SystemConfiguration.get_value("lockout_duration", "30")} minutes.',
                'error_code': 'MAX_ATTEMPTS_EXCEEDED'
            }, status=status.HTTP_423_LOCKED)
        
        # Check if this is a 2FA verification (session_token present means first step already passed)
        session_token = request_data.get('session_token')
        is_2fa_verification = bool(session_token and request_data.get('two_factor_code'))
        
        # Only validate CAPTCHA if it's not a 2FA verification step
        if not is_2fa_verification:
            # Always require CAPTCHA token for login (first step)
            if not captcha_token:
                return Response({
                    'success': False,
                    'message': 'Security verification is required to continue',
                    'error_code': 'CAPTCHA_REQUIRED',
                    'captcha_required': True
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate CAPTCHA token
            site_key = 'admin-login-captcha' if '/admin' in request.path else 'login-captcha'
            captcha_result = CaptchaValidator.validate_captcha_token(
                captcha_token, 
                site_key
            )
            print(f"🔍 Captcha validation result: {captcha_result}")  # Debug log
            
            if not captcha_result['success']:
                return Response({
                    'success': False,
                    'message': captcha_result['message'],
                    'error_code': 'CAPTCHA_VALIDATION_FAILED',
                    'captcha_required': True
                }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = UserLoginSerializer(data=request_data)
        
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            # First, try to get user to check if account exists and is active
            try:
                user = User.objects.get(username=username, is_deleted=False)
                
                # Check if user is inactive (banned)
                if not user.is_active:
                    # Increment failed attempts
                    new_failed_attempts = failed_attempts + 1
                    cache.set(failed_attempts_key, new_failed_attempts, 900)  # 15 minutes
                    return Response({
                        'success': False,
                        'message': 'Your account has been suspended due to suspicious activity. Please contact admin support.',
                        'error_code': 'ACCOUNT_DEACTIVATED',
                        'captcha_required': False
                    }, status=status.HTTP_400_BAD_REQUEST)
                
            except User.DoesNotExist:
                # User doesn't exist, fall through to password check which will return invalid credentials
                user = None
            
            # Now authenticate the password
            if not user or not user.check_password(password):
                # Increment failed attempts
                new_failed_attempts = failed_attempts + 1
                
                # Log failed activity
                try:
                    from shared.utils import log_user_activity
                    log_user_activity(
                        user=user if user else None,
                        activity_type='login_failed',
                        description=f"Failed login attempt for username: {username}. Total failures: {new_failed_attempts}",
                        request=request
                    )
                except Exception as e:
                    logger.error(f"Error logging failed activity: {e}")

                # Get lockout duration from settings
                lockout_duration_str = SystemConfiguration.get_value('lockout_duration', '30')
                try:
                    lockout_duration_mins = int(lockout_duration_str)
                except ValueError:
                    lockout_duration_mins = 30
                
                # Update cache with dynamic expiry
                cache.set(failed_attempts_key, new_failed_attempts, lockout_duration_mins * 60)

                # Notify admin if suspicious activity (e.g., reaching max attempts)
                if new_failed_attempts >= max_attempts:
                    try:
                        from shared.admin_notifications import notify_admin_suspicious_login
                        reason = f"Multiple failed login attempts ({new_failed_attempts})"
                        notify_admin_suspicious_login(
                            username=username,
                            ip_address=client_ip,
                            reason=reason,
                            attempts=new_failed_attempts
                        )
                    except Exception as e:
                        logger.error(f"Error notifying admin about suspicious login: {e}")
                
                return Response({
                    'success': False,
                    'message': 'Invalid username or password.',
                    'error_code': 'INVALID_CREDENTIALS',
                    'captcha_required': False  # Don't require CAPTCHA again since it was already provided
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if 2FA is enabled for this user
            two_factor_code = request_data.get('two_factor_code')
            
            if user.two_factor_enabled:
                # If 2FA code is not provided, request it
                if not two_factor_code:
                    # Generate a temporary session token for 2FA verification
                    import secrets
                    import hashlib
                    import time
                    
                    temp_session_token = secrets.token_urlsafe(32)
                    session_key = f"2fa_session_{hashlib.sha256(f'{user.id}_{time.time()}'.encode()).hexdigest()}"
                    
                    # Store user ID and timestamp in cache for 2FA verification (5 minutes expiry)
                    cache.set(session_key, {
                        'user_id': str(user.id),
                        'username': user.username,
                        'timestamp': time.time()
                    }, timeout=300)
                    
                    return Response({
                        'success': False,
                        'message': 'Two-factor authentication is required',
                        'error_code': '2FA_REQUIRED',
                        'requires_2fa': True,
                        'session_token': session_key,
                        'captcha_required': False
                    }, status=status.HTTP_200_OK)  # 200 OK because credentials are correct
                
                # Verify 2FA code
                session_key = request_data.get('session_token', '')
                session_data = cache.get(session_key)
                
                if not session_data or str(session_data.get('user_id')) != str(user.id):
                    return Response({
                        'success': False,
                        'message': 'Invalid or expired 2FA session. Please login again.',
                        'error_code': 'INVALID_2FA_SESSION',
                        'captcha_required': False
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Verify TOTP code using authenticator app
                from .two_factor import verify_totp_token
                
                # Get user's TOTP secret
                if not user.two_factor_secret:
                    return Response({
                        'success': False,
                        'message': '2FA is enabled but no secret found. Please disable and re-enable 2FA.',
                        'error_code': 'INVALID_2FA_SETUP',
                        'captcha_required': False
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Verify TOTP token
                if not verify_totp_token(user.two_factor_secret, two_factor_code):
                    # Increment failed attempts for 2FA
                    new_failed_attempts = failed_attempts + 1
                    cache.set(failed_attempts_key, new_failed_attempts, 900)
                    return Response({
                        'success': False,
                        'message': 'Invalid 2FA code. Please try again.',
                        'error_code': 'INVALID_2FA_CODE',
                        'requires_2fa': True,
                        'session_token': session_key,
                        'captcha_required': False
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Clear the 2FA session
                cache.delete(session_key)
            
            # Generate tokens with expiration based on remember_me
            remember_me = request_data.get('remember_me', False)
            
            # Set token expiration based on remember_me
            from datetime import timedelta
            from rest_framework_simplejwt.tokens import RefreshToken
            
            # Create custom token with expiration
            refresh = RefreshToken.for_user(user)
            
            if remember_me:
                # 20 days for remember me
                refresh.set_exp(lifetime=timedelta(days=20))
                refresh.access_token.set_exp(lifetime=timedelta(days=20))
            else:
                # 6 days default
                refresh.set_exp(lifetime=timedelta(days=6))
                refresh.access_token.set_exp(lifetime=timedelta(days=6))
            
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Clear failed attempts on successful login
            cache.delete(failed_attempts_key)
            
            # Update last login
            user.save()
            
            # Log login activity
            try:
                from shared.utils import log_user_activity
                from shared.admin_notifications import notify_user_login
                
                log_user_activity(
                    user=user,
                    activity_type='login',
                    description=f'User logged in: {user.username}',
                    request=request,
                    metadata={'ip_address': client_ip}
                )
                
            except Exception as e:
                print(f"⚠️ Error logging login activity/notification: {e}")
                pass  # Don't fail login if logging fails
            
            # Serialize user data
            user_data = UserSerializer(user).data
            
            response_data = {
                'user': user_data,
                'tokens': {
                    'access': access_token,
                    'refresh': refresh_token
                }
            }
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'data': response_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid input data. Please check your username and password.',
                'error_code': 'VALIDATION_ERROR',
                'errors': serializer.errors,
                'captcha_required': False
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        import traceback
        print(f"❌ Login error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        return Response({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.',
            'error_code': 'INTERNAL_ERROR',
            'captcha_required': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout endpoint"""
    try:
        # Log logout activity
        try:
            from shared.utils import log_user_activity
            log_user_activity(
                user=request.user,
                activity_type='logout',
                description=f'User logged out: {request.user.username}',
                request=request
            )
        except Exception:
            pass  # Don't fail logout if logging fails
        
        # In a real implementation, you might want to blacklist the token
        return Response({
            'success': True,
            'message': 'Logout successful'
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Logout failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile - no PII"""
    try:
        user_data = UserSerializer(request.user).data
        return Response({
            'success': True,
            'data': user_data
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to get profile',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_legal(request):
    """Permanently accept ToS and Privacy Policy"""
    try:
        user = request.user
        user.legal_accepted = True
        user.save(update_fields=['legal_accepted'])
        
        return Response({
            'success': True,
            'message': 'Terms of Service and Privacy Policy accepted.'
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to accept legal documents.',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_profile(request):
    """Update user profile - limited fields only"""
    try:
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            user_data = UserSerializer(request.user).data
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': user_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Update failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Update failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def payout_addresses(request):
    """Get or update payout (withdrawal) addresses for the current user"""
    try:
        if request.method == 'GET':
            serializer = PayoutAddressSerializer(request.user)
            return Response({
                'success': True,
                'data': serializer.data
            })
        
        serializer = PayoutAddressSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Payout addresses updated successfully',
                'data': serializer.data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid payout address data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to update payout addresses',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    try:
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                'success': False,
                'message': 'Both current and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify current password
        if not request.user.check_password(current_password):
            return Response({
                'success': False,
                'message': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password
        if len(new_password) < 8:
            return Response({
                'success': False,
                'message': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        request.user.set_password(new_password)
        request.user.save()
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to change password',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def recover_account(request):
    """Recover account using recovery phrase"""
    try:
        recovery_phrase = request.data.get('recovery_phrase')
        new_password = request.data.get('new_password')
        username = request.data.get('username')
        
        if not recovery_phrase or not new_password or not username:
            return Response({
                'success': False,
                'message': 'Username, recovery phrase, and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user with matching username and recovery phrase
        try:
            user = User.objects.get(username=username, recovery_phrase=recovery_phrase, is_deleted=False)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invalid username or recovery phrase.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        # Log activity
        try:
            from shared.utils import log_user_activity
            log_user_activity(
                user=user,
                activity_type='password_recovered',
                description=f'Account password recovered using phrase: {user.username}',
                request=request
            )
        except Exception:
            pass
            
        return Response({
            'success': True,
            'message': 'Password reset successful. You can now login with your new password.'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Recovery failed',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_detail(request, user_id):
    """Get detailed information about a specific user (admin only)"""
    try:
        from django.shortcuts import get_object_or_404
        from django.apps import apps
        
        User = apps.get_model('users', 'User')
        Order = apps.get_model('orders', 'Order')
        
        user = get_object_or_404(User, id=user_id)
        user_data = UserSerializer(user).data
        
        # Add basic info not in serializer
        user_data['email'] = user.email
        user_data['last_login'] = user.last_login
        
        # Calculate Total Orders (as buyer)
        user_orders = Order.objects.filter(buyer=user)
        
        # Calculate Total Spent (BTC)
        # We only count orders that are not cancelled
        valid_orders = user_orders.exclude(order_status='cancelled')
        user_data['total_orders'] = valid_orders.count()
        
        total_spent_btc = 0.0
        
        for order in valid_orders:
            try:
                # Assuming total_amount is safe to cast or has been cleaned
                if hasattr(order, 'crypto_currency') and order.crypto_currency == 'BTC':
                    total_spent_btc += float(order.total_amount)
                elif hasattr(order, 'crypto_currency') and order.crypto_currency == 'XMR':
                    # Optional: Convert XMR to BTC or just ignore if only BTC required
                    # For now only summing BTC as requested "Total Spent ... BTC"
                    pass
            except (ValueError, TypeError):
                continue
                
        user_data['total_spent'] = total_spent_btc
        
        return Response({
            'success': True,
            'message': 'User details retrieved successfully',
            'data': user_data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to retrieve user details',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_user(request, user_id):
    """Update user information (admin only)"""
    try:
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, id=user_id)
        
        if str(user.id) == str(request.user.id):
            # Check if attempting to deactivate or change role
            if 'is_active' in request.data and request.data.get('is_active') is False:
                return Response({
                    'success': False,
                    'message': 'You cannot suspend your own administrative account.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'user_type' in request.data and request.data.get('user_type') != 'admin':
                return Response({
                    'success': False,
                    'message': 'You cannot change your own administrative role.'
                }, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            user_data = UserSerializer(user).data
            
            return Response({
                'success': True,
                'message': 'User updated successfully',
                'data': user_data
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to update user',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_user(request, user_id):
    """Soft delete a user (admin only)"""
    try:
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, id=user_id)
        
        if str(user.id) == str(request.user.id):
            return Response({
                'success': False,
                'message': 'You cannot delete your own administrative account.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user.is_deleted = True
        user.is_active = False
        user.save()
        
        return Response({
            'success': True,
            'message': 'User deleted successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to delete user',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def verify_user(request, user_id):
    """Verify a user account or unban user (admin only)"""
    try:
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, id=user_id)
        
        # If user is banned (is_active=False), unban them and verify
        if not user.is_active:
            user.is_active = True
            user.is_verified = True
        else:
            # Otherwise just verify
            user.is_verified = True
        
        user.save()
        
        return Response({
            'success': True,
            'message': 'User verified successfully' if user.is_verified else 'User unbanned successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to verify user',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reset_password(request, user_id):
    """Reset user password (admin only)"""
    try:
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, id=user_id)
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({
                'success': False,
                'message': 'New password is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate password
        if len(new_password) < 8:
            return Response({
                'success': False,
                'message': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        return Response({
            'success': True,
            'message': 'Password reset successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to reset password',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_activity(request, user_id):
    """Get comprehensive user activity (login, logout, orders, listings, search, wishlist, etc.)"""
    try:
        from django.shortcuts import get_object_or_404
        from shared.models import Order, UserActivity, Message, Notification
        from products.models import Product, ProductView, ProductReview
        from wishlist.models import Wishlist
        from datetime import datetime
        
        user = get_object_or_404(User, id=user_id)
        
        activities = []
        
        # Get all UserActivity records
        user_activities = UserActivity.objects.filter(user=user).order_by('-created_at')[:200]
        for activity in user_activities:
            activities.append({
                'id': str(activity.id),
                'type': activity.activity_type,
                'description': activity.description,
                'created_at': activity.created_at.isoformat(),
                'metadata': activity.metadata
            })
        
        # Get orders
        if user.user_type == 'buyer':
            orders = Order.objects.filter(buyer=user).order_by('-created_at')[:50]
        elif user.user_type == 'vendor':
            orders = Order.objects.filter(vendor=user).order_by('-created_at')[:50]
        else:
            orders = []
        
        for order in orders:
            activities.append({
                'id': str(order.id),
                'type': 'order_created',
                'description': f"Order #{getattr(order, 'order_id', order.id)} created - Status: {getattr(order, 'order_status', 'pending')}",
                'created_at': order.created_at.isoformat() if hasattr(order, 'created_at') and order.created_at else datetime.now().isoformat(),
                'metadata': {
                    'order_id': str(getattr(order, 'order_id', order.id)),
                    'status': getattr(order, 'order_status', 'pending'),
                    'amount': str(getattr(order, 'total_amount', 0))
                }
            })
        
        # Get listings (products)
        if user.user_type == 'vendor':
            products = Product.objects.filter(vendor=user).order_by('-created_at')[:50]
            for product in products:
                activities.append({
                    'id': str(product.id),
                    'type': 'listing_created',
                    'description': f"Listing created: {product.headline or 'Untitled'}",
                    'created_at': product.created_at.isoformat() if hasattr(product, 'created_at') and product.created_at else datetime.now().isoformat(),
                    'metadata': {'product_id': product.id, 'headline': product.headline}
                })
        
        # Get listing views
        product_views = ProductView.objects.filter(user=user).order_by('-viewed_at')[:50]
        for view in product_views:
            activities.append({
                'id': str(view.id),
                'type': 'listing_viewed',
                'description': f"Viewed listing: {view.product.headline if hasattr(view.product, 'headline') else 'Unknown'}",
                'created_at': view.viewed_at.isoformat() if hasattr(view, 'viewed_at') and view.viewed_at else datetime.now().isoformat(),
                'metadata': {'product_id': view.product.id}
            })
        
        # Get wishlist activities
        wishlist_items = Wishlist.objects.filter(user=user).order_by('-created_at')[:50]
        for item in wishlist_items:
            activities.append({
                'id': str(item.id),
                'type': 'wishlist_added',
                'description': f"Added to wishlist: {item.product.headline if hasattr(item.product, 'headline') else 'Unknown'}",
                'created_at': item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else datetime.now().isoformat(),
                'metadata': {'product_id': item.product.id}
            })
        
        # Get messages
        sent_messages = Message.objects.filter(sender=user).order_by('-created_at')[:50]
        for msg in sent_messages:
            activities.append({
                'id': str(msg.id),
                'type': 'message_sent',
                'description': f"Sent message to {msg.recipient.username if hasattr(msg.recipient, 'username') else 'user'}",
                'created_at': msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else datetime.now().isoformat(),
                'metadata': {'recipient_id': str(msg.recipient.id)}
            })
        
        received_messages = Message.objects.filter(recipient=user).order_by('-created_at')[:50]
        for msg in received_messages:
            activities.append({
                'id': str(msg.id),
                'type': 'message_received',
                'description': f"Received message from {msg.sender.username if hasattr(msg.sender, 'username') else 'user'}",
                'created_at': msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else datetime.now().isoformat(),
                'metadata': {'sender_id': str(msg.sender.id)}
            })
        
        # Get reviews
        reviews = ProductReview.objects.filter(user=user).order_by('-created_at')[:50]
        for review in reviews:
            activities.append({
                'id': str(review.id),
                'type': 'review_created',
                'description': f"Created review for product: {review.product.headline if hasattr(review.product, 'headline') else 'Unknown'}",
                'created_at': review.created_at.isoformat() if hasattr(review, 'created_at') and review.created_at else datetime.now().isoformat(),
                'metadata': {'product_id': review.product.id, 'rating': review.rating}
            })
        
        # Get notification views
        notifications = Notification.objects.filter(user=user).order_by('-created_at')[:50]
        for notif in notifications:
            activities.append({
                'id': str(notif.id),
                'type': 'notification_viewed' if notif.is_read else 'notification_received',
                'description': f"Notification: {notif.title}",
                'created_at': notif.created_at.isoformat() if hasattr(notif, 'created_at') and notif.created_at else datetime.now().isoformat(),
                'metadata': {'notification_type': notif.type}
            })
        
        # Add account creation
        activities.append({
            'id': 'account_created',
            'type': 'account_created',
            'description': f"Account created: {user.date_joined.strftime('%Y-%m-%d %H:%M:%S')}",
            'created_at': user.date_joined.isoformat(),
            'metadata': {}
        })
        
        # Sort all activities by date
        activities.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response({
            'success': True,
            'message': 'User activity retrieved successfully',
            'data': {
                'activities': activities[:200],  # Limit to 200 most recent
                'total_count': len(activities)
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error in user_activity: {e}")
        print(traceback.format_exc())
        return Response({
            'success': False,
            'message': 'Failed to retrieve user activity',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all users (admin only)"""
    # Check if user is admin
    if not hasattr(request.user, 'user_type') or request.user.user_type != 'admin':
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.',
            'errors': 'You do not have permission to perform this action.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from django.db.models import Count, Q
        from django.apps import apps
        
        # Get Order model
        Order = apps.get_model('orders', 'Order')
        
        # Get query parameters
        from shared.utils.security import get_safe_int
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
        search = request.GET.get('search', '')
        user_type = request.GET.get('user_type', '')
        status_filter = request.GET.get('status', '')
        
        # Build queryset with optimized order counts
        queryset = User.objects.filter(is_deleted=False).annotate(
            buyer_order_count=Count('buyer_orders', filter=~Q(buyer_orders__order_status='cancelled'), distinct=True),
            vendor_order_count=Count('vendor_orders_new', filter=~Q(vendor_orders_new__order_status='cancelled'), distinct=True)
        )
        
        # Apply filters
        if search:
            queryset = queryset.filter(username__icontains=search)
        
        if user_type:
            queryset = queryset.filter(user_type=user_type)
            
        if status_filter:
            if status_filter == 'active':
                queryset = queryset.filter(is_verified=True, is_active=True)
            elif status_filter == 'banned':
                queryset = queryset.filter(is_active=False)
            elif status_filter == 'pending':
                queryset = queryset.filter(is_verified=False, is_active=True)
        
        # Order by creation date
        queryset = queryset.order_by('-date_joined')
        
        # Paginate results
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_data = queryset[start:end]
        
        # Get overall stats (unfiltered)
        VendorApplication = apps.get_model('vendors', 'VendorApplication')
        global_stats = {
            'total_users': User.objects.filter(is_deleted=False).count(),
            'active_users': User.objects.filter(is_deleted=False, is_verified=True, is_active=True).count(),
            'vendors': VendorApplication.objects.filter(status='approved', vendor_username__in=User.objects.filter(is_active=True, is_deleted=False).values_list('username', flat=True)).count(),
            'banned_users': User.objects.filter(is_deleted=False, is_active=False).count()
        }
        
        # Serialize data
        serializer = UserSerializer(paginated_data, many=True)
        
        response_data = {
            'users': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size,
                'has_next': end < total_count,
                'has_previous': page > 1
            },
            'stats': global_stats
        }
        
        return Response({
            'success': True,
            'message': 'Users retrieved successfully',
            'data': response_data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to retrieve users',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """Enable two-factor authentication for the user using TOTP"""
    try:
        from .two_factor import generate_totp_secret, get_totp_uri, generate_qr_code
        
        # Generate TOTP secret if not already exists
        if not request.user.two_factor_secret:
            secret = generate_totp_secret()
            request.user.two_factor_secret = secret
            request.user.two_factor_enabled = True
            request.user.save()
        else:
            secret = request.user.two_factor_secret
        
        # Generate TOTP URI for QR code
        totp_uri = get_totp_uri(
            secret=secret,
            username=request.user.username,
            issuer_name="AccountzClub"
        )
        
        # Generate QR code
        qr_code_image = generate_qr_code(totp_uri)
        
        return Response({
            'success': True,
            'message': 'Two-factor authentication setup',
            'data': {
                'secret': secret,  # Backup code if QR scan fails
                'qr_code': qr_code_image,  # Base64 encoded QR code image
                'uri': totp_uri,  # TOTP URI for manual entry
                'message': 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)'
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error enabling 2FA: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'success': False,
            'message': 'Failed to enable two-factor authentication',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """Disable two-factor authentication for the user"""
    try:
        from django.core.cache import cache
        password = request.data.get('password', '')
        
        # Verify password
        if not password or not request.user.check_password(password):
            return Response({
                'success': False,
                'message': 'Password is incorrect',
                'error_code': 'INVALID_PASSWORD'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Disable 2FA and clear secret
        request.user.two_factor_enabled = False
        request.user.two_factor_secret = None
        request.user.save()
        
        return Response({
            'success': True,
            'message': 'Two-factor authentication disabled successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to disable two-factor authentication',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def login_as_user(request, user_id):
    """Login as another user (admin only) - generates tokens for the target user"""
    try:
        from django.shortcuts import get_object_or_404
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Get target user
        target_user = get_object_or_404(User, id=user_id, is_deleted=False)
        
        # Generate tokens for target user
        refresh = RefreshToken.for_user(target_user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Serialize user data
        user_data = UserSerializer(target_user).data
        
        # Log activity
        try:
            from shared.utils import log_user_activity
            log_user_activity(
                user=request.user,
                activity_type='login',
                description=f'Admin {request.user.username} logged in as user {target_user.username}',
                request=request,
                metadata={'target_user_id': str(target_user.id), 'target_username': target_user.username}
            )
        except Exception:
            pass
        
        return Response({
            'success': True,
            'message': f'Logged in as {target_user.username}',
            'data': {
                'user': user_data,
                'tokens': {
                    'access': access_token,
                    'refresh': refresh_token
                }
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to login as user',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 