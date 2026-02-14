from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import random
import uuid
from django.core.cache import cache
from .captcha_validator import CaptchaValidator
import time
import hmac
import hashlib
from django.conf import settings

@api_view(['GET'])
@permission_classes([AllowAny])
def get_captcha_challenge(request):
    """
    Generate a new captcha challenge.
    Returns a challenge_id and a randomized target position for the sliding captcha.
    """
    challenge_id = str(uuid.uuid4())
    # Target position between 20% and 80% to ensure it's always slidable
    target_x = round(random.uniform(20, 80), 2)
    
    # Store in cache for 5 minutes
    cache.set(f"captcha_challenge_{challenge_id}", target_x, timeout=300)
    
    return Response({
        'success': True,
        'data': {
            'challenge_id': challenge_id,
            'target_x': target_x,
            'instruction': 'Slide the rocket to the target zone'
        }
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_captcha_challenge(request):
    """
    Verify the user's captcha solution and return a signed token.
    """
    challenge_id = request.data.get('challenge_id')
    user_x = request.data.get('user_x')
    
    if not challenge_id or user_x is None:
        return Response({
            'success': False,
            'message': 'Challenge ID and position are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    target_x = cache.get(f"captcha_challenge_{challenge_id}")
    
    if target_x is None:
        return Response({
            'success': False,
            'message': 'Challenge expired or not found'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user's position is within 5% tolerance
    try:
        user_x_float = float(user_x)
        if abs(user_x_float - target_x) <= 7.0: # 7% tolerance
            # Success! Generate a signed token
            timestamp = int(time.time() * 1000)
            random_str = uuid.uuid4().hex[:8]
            token_base = f"rocket_captcha_{timestamp}_{random_str}"
            
            # Generate HMAC signature
            secret = settings.SECRET_KEY.encode()
            signature = hmac.new(
                secret,
                token_base.encode(),
                hashlib.sha256
            ).hexdigest()[:16]
            
            signed_token = f"{token_base}_{signature}"
            
            # Remove challenge from cache
            cache.delete(f"captcha_challenge_{challenge_id}")
            
            return Response({
                'success': True,
                'message': 'Verification successful',
                'captcha_token': signed_token
            })
        else:
            return Response({
                'success': False,
                'message': 'Verification failed. Please try again.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except (ValueError, TypeError):
        return Response({
            'success': False,
            'message': 'Invalid position value'
        }, status=status.HTTP_400_BAD_REQUEST)
