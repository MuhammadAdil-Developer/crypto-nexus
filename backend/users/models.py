from django.contrib.auth.models import AbstractUser
from django.db import models
from shared.models import BaseModel
from django.utils import timezone


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
    is_on_vacation = models.BooleanField(default=False)
    vacation_mode_until = models.DateTimeField(blank=True, null=True)
    vacation_mode_note = models.CharField(max_length=255, blank=True, default='')
    
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

    def is_vacation_mode_active(self):
        if not self.is_on_vacation:
            return False
        if self.vacation_mode_until and timezone.now() > self.vacation_mode_until:
            return False
        return True

    class Meta:
        db_table = 'users' 