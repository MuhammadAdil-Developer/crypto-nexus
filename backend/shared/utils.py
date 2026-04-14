from django.contrib.auth import get_user_model
from django.db import transaction
import logging
import re

User = get_user_model()
logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Get the real client IP address from the request.
    Respects Cloudflare and standard proxy headers before falling back to REMOTE_ADDR.
    """
    if not request:
        return None
        
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip

    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
        
    return request.META.get('REMOTE_ADDR')


def clean_crypto_address(address):
    """Strip URI prefixes and query params from crypto addresses"""
    if not address:
        return address
    
    address = address.strip()
    if address.lower().startswith('bitcoin:'):
        address = address[8:].split('?')[0]
    elif address.lower().startswith('monero:'):
        address = address[7:].split('?')[0]
    
    return address


def validate_btc_address(address):
    """
    Validate Bitcoin address format.
    Supports Legacy (1...), P2SH (3...), and Segwit (bc1...).
    """
    if not address:
        return True
    
    address = clean_crypto_address(address)
    
    # Legacy (1...) and P2SH (3...): 26-35 chars, base58 (no 0, O, I, l)
    legacy_p2sh_regex = r'^[13][1-9A-HJ-NP-Za-km-z]{25,34}$'
    # Segwit (bc1...): bech32 chars, variable length
    bech32_regex = r'^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$'
    
    return bool(re.match(legacy_p2sh_regex, address)) or bool(re.match(bech32_regex, address))


def validate_xmr_address(address):
    """
    Validate Monero address format.
    Supports Standard (4...), Integrated (4...), and Subaddress (8...).
    Also supports Stagenet (5...) and Testnet (9...).
    """
    if not address:
        return True
    
    address = clean_crypto_address(address)
    
    # Monero addresses are Base58 encoded
    # Standard/Subaddress/Stagenet/Testnet: 95 characters
    # Integrated: 106 characters
    # Starting characters: 4 (Mainnet), 8 (Subaddress), 5 (Stagenet), 9 (Testnet)
    # Using [a-zA-Z0-9] for more permissive validation while keeping start char and length
    xmr_regex = r'^[4589][a-zA-Z0-9]{94,110}$'
    
    # Be slightly more permissive with length (95 to 110) to account for potential new formats
    return bool(re.match(xmr_regex, address))


def is_admin_user(user):
    """Check if user is an admin"""
    if not user.is_authenticated or not user.is_active or getattr(user, 'is_deleted', False):
        return False
    return user.user_type == 'admin'


def is_vendor_user(user):
    """Check if user is a vendor"""
    if not user.is_authenticated or not user.is_active or getattr(user, 'is_deleted', False):
        return False
    return user.user_type == 'vendor'


def is_buyer_user(user):
    """Check if user is a buyer"""
    if not user.is_authenticated or not user.is_active or getattr(user, 'is_deleted', False):
        return False
    return user.user_type == 'buyer'


def get_user_type(user):
    """Get user type string"""
    if not user.is_authenticated:
        return None
    return user.user_type


def log_user_activity(user, activity_type, description, request=None, metadata=None):
    """Log user activity to database in a separate transaction"""
    try:
        from shared.models import UserActivity
        
        # Use a separate transaction to avoid breaking the parent transaction
        # if the user_activities table doesn't exist or other errors occur
        try:
            with transaction.atomic():
                activity = UserActivity.objects.create(
                    user=user,
                    activity_type=activity_type,
                    description=description,
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                    metadata=metadata or {}
                )
                return activity
        except Exception as e:
            # Log error but never let it propagate - activity logging should not fail requests
            logger.warning(f"Failed to log user activity: {e}")
            return None
    except Exception as e:
        logger.warning(f"Failed to log user activity (import error): {e}")
        return None
