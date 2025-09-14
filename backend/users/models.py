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
    
    # Remove all PII fields
    # email = models.EmailField(unique=True)  # REMOVED
    # phone = models.CharField(max_length=25, blank=True, null=True)  # REMOVED
    # profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)  # REMOVED
    # date_of_birth = models.DateField(blank=True, null=True)  # REMOVED
    # first_name = models.CharField(max_length=150, blank=True)  # REMOVED
    # last_name = models.CharField(max_length=150, blank=True)  # REMOVED
    
    # Keep only essential fields
    is_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    user_type = models.CharField(max_length=10, choices=USER_TYPES, default='buyer')
    
    # Vendor-specific fields
    escrow_enabled = models.BooleanField(default=False)  # Enable escrow for all vendor products

    # Make username the primary field for authentication
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []  # No additional required fields

    def __str__(self):
        return self.username

    class Meta:
        db_table = 'users' 