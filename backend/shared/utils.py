from django.contrib.auth import get_user_model

User = get_user_model()


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
