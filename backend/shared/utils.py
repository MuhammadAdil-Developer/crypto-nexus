from django.contrib.auth import get_user_model
from django.db import transaction
import logging
import re

User = get_user_model()
logger = logging.getLogger(__name__)


def validate_btc_address(address):
    """
    Validate Bitcoin address format.
    Supports Legacy (1...), P2SH (3...), and Segwit (bc1...).
    """
    if not address:
        return True
    
    # Legacy (1...) and P2SH (3...): 26-35 chars, base58 (no 0, O, I, l)
    legacy_p2sh_regex = r'^[13][1-9A-HJ-NP-Za-km-z]{25,34}$'
    # Segwit (bc1...): bech32 chars, variable length
    bech32_regex = r'^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$'
    
    return bool(re.match(legacy_p2sh_regex, address)) or bool(re.match(bech32_regex, address))


def validate_xmr_address(address):
    """
    Validate Monero address format.
    Supports Standard (4...), Integrated (4...), and Subaddress (8...).
    """
    if not address:
        return True
    
    # Simple check for Monero address structure
    # Standard: 95 chars, starts with 4
    # Integrated: 106 chars, starts with 4
    # Subaddress: 95 chars, starts with 8
    xmr_regex = r'^[48][1-9A-HJ-NP-Za-km-z]{94,105}$'
    
    return bool(re.match(xmr_regex, address))


def is_admin_user(user):
    """Check if user is an admin"""
    return user.is_authenticated and user.user_type == 'admin'


def is_vendor_user(user):
    """Check if user is a vendor"""
    return user.is_authenticated and user.user_type == 'vendor'


def is_buyer_user(user):
    """Check if user is a buyer"""
    return user.is_authenticated and user.user_type == 'buyer'


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
                    ip_address=request.META.get('REMOTE_ADDR') if request else None,
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
