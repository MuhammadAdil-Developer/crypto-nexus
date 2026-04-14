import hashlib
import hmac
import time
import json
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


class CaptchaValidator:
    """
    Custom captcha validation for CircleCaptcha implementation
    """
    
    @staticmethod
    def _verify_token_signature(token):
        """
        Verify HMAC signature of captcha token to prevent forgery.
        Expected format: prefix_timestamp_random_signature
        """
        try:
            # Extract signature (last part after final underscore)
            parts = token.rsplit('_', 1)
            if len(parts) != 2:
                return False
            
            token_without_sig = parts[0]
            provided_signature = parts[1]
            
            # Generate expected signature using SECRET_KEY
            secret = settings.SECRET_KEY.encode()
            expected_signature = hmac.new(
                secret,
                token_without_sig.encode(),
                hashlib.sha256
            ).hexdigest()[:16]  # Use first 16 chars for brevity
            
            # Constant-time comparison to prevent timing attacks
            return hmac.compare_digest(expected_signature, provided_signature)
            
        except Exception as e:
            print(f"❌ Signature verification error: {e}")
            return False
    
    @staticmethod
    def validate_captcha_token(token, site_key=None):
        """
        Validate captcha token with HMAC signature verification.
        
        Args:
            token (str): The captcha token to validate (must include HMAC signature)
            site_key (str): Optional site key for additional validation
            
        Returns:
            dict: Validation result with success status and message
        """
        try:
            print(f"🔍 Validating captcha token: {token[:50]}...")  # Debug log (truncated)
            
            if not token:
                print("❌ No token provided")  # Debug log
                return {
                    'success': False,
                    'message': 'Captcha token is required'
                }
            
            # CRITICAL SECURITY FIX: Verify cryptographic signature first
            if not CaptchaValidator._verify_token_signature(token):
                print("❌ Invalid token signature - possible forgery attempt")
                return {
                    'success': False,
                    'message': 'Invalid captcha token signature'
                }
            
            # Parse token format: captcha_{timestamp}_{random_string}_signature
            if not (token.startswith('captcha_') or token.startswith('rocket_captcha_') or token.startswith('math_captcha_')):
                print("❌ Invalid token format")  # Debug log
                return {
                    'success': False,
                    'message': 'Invalid captcha token format'
                }
            
            # Extract timestamp and validate
            try:
                # Remove signature before parsing
                token_without_sig = token.rsplit('_', 1)[0]
                parts = token_without_sig.split('_')
                timestamp = None
                
                # Dynamic timestamp finder: look for the first part that is a long digit string
                for part in parts:
                    if part.isdigit() and len(part) > 8: # timestamp is usually huge
                        timestamp = int(part)
                        break
                
                if timestamp is None:
                    # Fallback for specific known formats
                    if token.startswith('math_captcha_') or token.startswith('rocket_captcha_'):
                         if len(parts) >= 4 and parts[2].isdigit():
                            timestamp = int(parts[2])
                    elif len(parts) >= 3 and parts[1].isdigit():
                        timestamp = int(parts[1])
                
                if timestamp is None:
                    print(f"❌ Could not extract timestamp from {token}") 
                    return {
                        'success': False,
                        'message': 'Invalid captcha token structure'
                    }

                current_time = int(time.time() * 1000)  # Convert to milliseconds to match frontend
                
                print(f"🔍 Token timestamp: {timestamp}, Current time: {current_time}")  # Debug log
                
                # Check if token is not too old (5 minutes max)
                if current_time - timestamp > 300000:  # 5 minutes in milliseconds
                    print("❌ Token expired")  # Debug log
                    return {
                        'success': False,
                        'message': 'Captcha token has expired'
                    }
                
                # Check if token is not from the future (allow 1 minute tolerance)
                if timestamp > current_time + 60000:  # 1 minute in milliseconds
                    print("❌ Token from future")  # Debug log
                    return {
                        'success': False,
                        'message': 'Invalid captcha token timestamp'
                    }
                
            except (ValueError, IndexError):
                print("❌ Token parsing error")  # Debug log
                return {
                    'success': False,
                    'message': 'Invalid captcha token format'
                }
            
            # Check if token was already used (prevent replay attacks)
            cache_key = f"captcha_used_{hashlib.sha256(token.encode()).hexdigest()}"
            if cache.get(cache_key):
                print("❌ Token already used")  # Debug log
                return {
                    'success': False,
                    'message': 'Captcha token has already been used'
                }
            
            # Mark token as used (expires in 10 minutes)
            cache.set(cache_key, True, timeout=600)
            print("✅ Token marked as used")  # Debug log
            
            # Additional validation based on site key
            if site_key:
                if site_key not in ['login-captcha', 'admin-login-captcha', 'register-captcha']:
                    print(f"❌ Invalid site key: {site_key}")  # Debug log
                    return {
                        'success': False,
                        'message': 'Invalid site key for captcha'
                    }
            
            print("✅ Captcha validation successful")  # Debug log
            return {
                'success': True,
                'message': 'Captcha validation successful'
            }
            
        except Exception as e:
            print(f"❌ Captcha validation error: {str(e)}")  # Debug log
            return {
                'success': False,
                'message': f'Captcha validation error: {str(e)}'
            }
    
    @staticmethod
    def generate_captcha_challenge():
        """
        Generate a new captcha challenge (for future use)
        """
        timestamp = int(time.time())
        challenge_id = hashlib.md5(f"{timestamp}_{time.time()}".encode()).hexdigest()[:8]
        
        return {
            'challenge_id': challenge_id,
            'timestamp': timestamp,
            'expires_at': timestamp + 300  # 5 minutes
        }
    
    @staticmethod
    def verify_captcha_challenge(challenge_id, user_response):
        """
        Verify captcha challenge response (for future use)
        """
        try:
            cache_key = f"captcha_challenge_{challenge_id}"
            challenge_data = cache.get(cache_key)
            
            if not challenge_data:
                return {
                    'success': False,
                    'message': 'Captcha challenge not found or expired'
                }
            
            # Verify response logic here
            # For now, we'll just check if response is not empty
            if not user_response:
                return {
                    'success': False,
                    'message': 'Captcha response is required'
                }
            
            # Clear challenge after verification
            cache.delete(cache_key)
            
            return {
                'success': True,
                'message': 'Captcha challenge verified successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Captcha challenge verification error: {str(e)}'
            }


def validate_captcha_middleware(view_func):
    """
    Decorator to validate captcha token for authentication endpoints
    """
    def wrapper(request, *args, **kwargs):
        # Only validate captcha for POST requests to auth endpoints
        if request.method == 'POST':
            request_data = request.data
            captcha_token = request_data.get('captcha_token')
            
            if captcha_token:
                validation_result = CaptchaValidator.validate_captcha_token(
                    captcha_token, 
                    request_data.get('site_key')
                )
                
                if not validation_result['success']:
                    from rest_framework.response import Response
                    from rest_framework import status
                    return Response({
                        'success': False,
                        'message': validation_result['message'],
                        'error_code': 'CAPTCHA_VALIDATION_FAILED'
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper
