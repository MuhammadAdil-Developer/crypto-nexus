from django.contrib.auth.models import AbstractUser
from django.db import models
from shared.models import BaseModel


class User(AbstractUser, BaseModel):
    USER_TYPES = [
        ('buyer', 'Buyer'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin'),
    ]
    
    # Remove email field - only username + password
    username = models.CharField(max_length=150, unique=True)
    # User Profile Information
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    
    # Keep only essential fields
    is_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True, null=True, help_text="TOTP secret for 2FA")
    recovery_phrase = models.CharField(max_length=255, blank=True, null=True, help_text="BIP39 Mnemonic phrase for account recovery")
    user_type = models.CharField(max_length=10, choices=USER_TYPES, default='buyer')
    legal_accepted = models.BooleanField(default=False)  # Track ToS/Privacy acceptance
    
    # Vendor-specific fields
    escrow_enabled = models.BooleanField(default=False)  # Enable escrow for all vendor products
    non_escrow_blocked = models.BooleanField(default=False)  # Admin can block vendor from creating non-escrow listings
    
    # Buyer payout addresses
    btc_payout_address = models.CharField(max_length=120, blank=True, null=True)
    xmr_payout_address = models.CharField(max_length=120, blank=True, null=True)
    
    # Blocked users - users that this user has blocked
    blocked_users = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='blocked_by')

    # Notification Preferences
    notify_new_orders = models.BooleanField(default=True)
    notify_messages = models.BooleanField(default=True)
    notify_disputes = models.BooleanField(default=True)
    notify_reviews = models.BooleanField(default=True)
    notify_support_tickets = models.BooleanField(default=True)
    notify_payouts = models.BooleanField(default=True)
    notify_marketing = models.BooleanField(default=False)
    notify_login_alerts = models.BooleanField(default=True)

    # Make username the primary field for authentication
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []  # No additional required fields

    def __str__(self):
        return self.username

    class Meta:
        db_table = 'users' 