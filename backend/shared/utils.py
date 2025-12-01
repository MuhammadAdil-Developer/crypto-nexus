from django.contrib.auth import get_user_model
from django.db import transaction
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


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
