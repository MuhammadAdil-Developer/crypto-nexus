from decimal import Decimal, InvalidOperation
import logging

logger = logging.getLogger(__name__)

def get_safe_int(val, default=1, min_val=None, max_val=None):
    """
    Safely parse an integer from a string/value.
    Prevents errors like 'invalid literal for int()' leaking to users.
    """
    try:
        if val is None:
            return default
        res = int(float(val)) # handles '1.0' as well
        if min_val is not None and res < min_val:
            return min_val
        if max_val is not None and res > max_val:
            return max_val
        return res
    except (ValueError, TypeError, OverflowError):
        return default

def get_safe_decimal(val, default=None):
    """
    Safely parse a decimal from a string/value.
    """
    try:
        if val is None or val == '':
            return default
        return Decimal(str(val))
    except (ValueError, TypeError, InvalidOperation, OverflowError):
        return default

def clean_error_response(e, message="An internal server error occurred"):
    """
    Returns a generic error message for the user while logging the real error.
    Used to prevent sensitive information leak via error messages.
    """
    from django.conf import settings
    
    error_str = str(e)
    # Always log the full error
    logger.error(f"SECURITY_ERROR_TRAPPED: {error_str}", exc_info=True)
    
    response_data = {
        'success': False,
        'message': message,
    }
    
    # Only reveal errors if DEBUG is True
    if settings.DEBUG:
        response_data['errors'] = error_str
        
    return response_data
