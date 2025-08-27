import jwt
import hashlib
import secrets
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.response import Response


def generate_jwt_token(user_id: str, user_type: str, expires_in: int = 3600) -> str:
    """Generate JWT token for user authentication"""
    payload = {
        'user_id': str(user_id),
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(seconds=expires_in),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def generate_secure_password(length: int = 12) -> str:
    """Generate a secure random password"""
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(characters) for _ in range(length))
    return password


def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed_password


def generate_api_key() -> str:
    """Generate a secure API key"""
    return secrets.token_urlsafe(32)


def validate_email_format(email: str) -> bool:
    """Validate email format"""
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format (basic validation)"""
    import re
    # Basic phone validation - can be customized based on requirements
    phone_pattern = re.compile(r'^\+?1?\d{9,15}$')
    return bool(phone_pattern.match(phone))


def create_success_response(data: Any = None, message: str = "Success", status_code: int = status.HTTP_200_OK) -> Response:
    """Create a standardized success response"""
    response_data = {
        'success': True,
        'message': message,
        'data': data
    }
    return Response(response_data, status=status_code)


def create_error_response(message: str, errors: Any = None, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    """Create a standardized error response"""
    response_data = {
        'success': False,
        'message': message,
        'errors': errors
    }
    return Response(response_data, status=status_code)


def paginate_queryset(queryset, page: int = 1, page_size: int = 20):
    """Paginate queryset with metadata"""
    total_count = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    paginated_data = queryset[start:end]
    
    return {
        'data': paginated_data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_count': total_count,
            'total_pages': (total_count + page_size - 1) // page_size,
            'has_next': end < total_count,
            'has_previous': page > 1
        }
    }


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS"""
    import html
    return html.escape(text.strip())


def generate_slug(text: str) -> str:
    """Generate URL-friendly slug from text"""
    import re
    import unicodedata
    
    # Normalize unicode characters
    text = unicodedata.normalize('NFKD', text)
    
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    
    return slug.strip('-')


def calculate_crypto_price(amount: float, from_currency: str, to_currency: str, exchange_rates: Dict[str, float]) -> float:
    """Calculate crypto price conversion"""
    if from_currency == to_currency:
        return amount
    
    if from_currency in exchange_rates and to_currency in exchange_rates:
        # Convert to USD first, then to target currency
        usd_amount = amount / exchange_rates[from_currency]
        return usd_amount * exchange_rates[to_currency]
    
    return amount


def validate_crypto_address(address: str, currency: str) -> bool:
    """Validate cryptocurrency address format"""
    # This is a basic validation - in production, use proper validation libraries
    if currency.upper() == 'BTC':
        # Bitcoin address validation (basic)
        return len(address) >= 26 and len(address) <= 35
    elif currency.upper() == 'ETH':
        # Ethereum address validation (basic)
        return len(address) == 42 and address.startswith('0x')
    elif currency.upper() == 'LTC':
        # Litecoin address validation (basic)
        return len(address) >= 26 and len(address) <= 35
    
    return True  # Default to True for unknown currencies


def format_crypto_amount(amount: float, currency: str, decimals: int = 8) -> str:
    """Format cryptocurrency amount with proper decimal places"""
    if currency.upper() in ['BTC', 'LTC']:
        return f"{amount:.8f}"
    elif currency.upper() == 'ETH':
        return f"{amount:.18f}"
    else:
        return f"{amount:.{decimals}f}"


def calculate_commission(amount: float, commission_rate: float = 0.025) -> float:
    """Calculate platform commission (default 2.5%)"""
    return amount * commission_rate


def generate_tracking_number() -> str:
    """Generate unique tracking number for orders"""
    import time
    timestamp = int(time.time())
    random_part = secrets.token_hex(4).upper()
    return f"CN{timestamp}{random_part}"


def validate_json_data(data: Any) -> bool:
    """Validate if data can be serialized to JSON"""
    try:
        import json
        json.dumps(data)
        return True
    except (TypeError, ValueError):
        return False


def get_user_type_from_token(request) -> Optional[str]:
    """Extract user type from JWT token in request"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_jwt_token(token)
    
    if payload:
        return payload.get('user_type')
    
    return None


def check_permission(user_type: str, required_type: str) -> bool:
    """Check if user has required permission level"""
    permission_hierarchy = {
        'buyer': 1,
        'vendor': 2,
        'admin': 3
    }
    
    user_level = permission_hierarchy.get(user_type, 0)
    required_level = permission_hierarchy.get(required_type, 0)
    
    return user_level >= required_level


def log_activity(user_id: str, action: str, details: Dict[str, Any] = None):
    """Log user activity for audit purposes"""
    # In production, this would write to a logging service or database
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'user_id': user_id,
        'action': action,
        'details': details or {},
        'ip_address': None,  # Would be extracted from request in production
        'user_agent': None   # Would be extracted from request in production
    }
    
    # For now, just print to console - replace with proper logging
    print(f"Activity Log: {log_entry}")


def rate_limit_key(user_id: str, action: str) -> str:
    """Generate rate limiting key for Redis"""
    return f"rate_limit:{user_id}:{action}"


def is_rate_limited(user_id: str, action: str, max_attempts: int = 10, window_seconds: int = 3600) -> bool:
    """Check if user is rate limited for specific action"""
    # This would integrate with Redis in production
    # For now, return False (not rate limited)
    return False 