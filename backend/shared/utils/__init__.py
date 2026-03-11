# Shared utilities package
# Import from security submodule (in shared/utils/)
from .security import get_safe_int, get_safe_decimal, clean_error_response

# Import from parent utils.py module (in shared/)
# Use importlib to avoid circular imports
import importlib.util
import sys
from pathlib import Path

# Load shared/utils.py directly
utils_file = Path(__file__).parent.parent / 'utils.py'
spec = importlib.util.spec_from_file_location("shared_utils_module", utils_file)
shared_utils = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared_utils)

# Re-export functions from utils.py
clean_crypto_address = shared_utils.clean_crypto_address
validate_btc_address = shared_utils.validate_btc_address
validate_xmr_address = shared_utils.validate_xmr_address
is_admin_user = shared_utils.is_admin_user
is_vendor_user = shared_utils.is_vendor_user
is_buyer_user = shared_utils.is_buyer_user
get_user_type = shared_utils.get_user_type
log_user_activity = shared_utils.log_user_activity
get_client_ip = shared_utils.get_client_ip

__all__ = [
    # From security.py
    'get_safe_int', 
    'get_safe_decimal', 
    'clean_error_response',
    # From utils.py
    'clean_crypto_address',
    'validate_btc_address',
    'validate_xmr_address',
    'is_admin_user',
    'is_vendor_user',
    'get_user_type',
    'log_user_activity',
    'get_client_ip'
]
