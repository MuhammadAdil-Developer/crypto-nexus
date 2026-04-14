"""
Two-Factor Authentication utilities using TOTP (Time-based One-Time Password)
Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
"""
import pyotp
import qrcode
import io
import base64
from django.conf import settings


def generate_totp_secret():
    """Generate a random secret for TOTP"""
    return pyotp.random_base32()


def get_totp_uri(secret, username, issuer_name="AccountzClub"):
    """Generate TOTP URI for QR code"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=username,
        issuer_name=issuer_name
    )


def generate_qr_code(uri):
    """Generate QR code image as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode()
    
    return f"data:image/png;base64,{img_base64}"


def verify_totp_token(secret, token):
    """
    Verify TOTP token
    Args:
        secret: User's TOTP secret
        token: 6-digit code from authenticator app
    Returns:
        True if valid, False otherwise
    """
    if not secret or not token:
        return False
    
    try:
        totp = pyotp.TOTP(secret)
        # Verify with tolerance (default 30 seconds window)
        # This allows for slight time differences between server and user's device
        return totp.verify(token, valid_window=1)  # Allow 30s before and after
    except Exception as e:
        print(f"Error verifying TOTP: {str(e)}")
        return False


def get_totp_token(secret):
    """Get current TOTP token (for testing purposes)"""
    if not secret:
        return None
    try:
        totp = pyotp.TOTP(secret)
        return totp.now()
    except Exception:
        return None

