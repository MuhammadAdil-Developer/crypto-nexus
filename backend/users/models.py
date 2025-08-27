from django.contrib.auth.models import AbstractUser
from django.db import models
from shared.models import BaseModel


class User(AbstractUser, BaseModel):
    USER_TYPES = [
        ('buyer', 'Buyer'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin'),
    ]
    
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)  # Make username required
    phone = models.CharField(max_length=25, blank=True, null=True)  # Increased from 20 to 25
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    user_type = models.CharField(max_length=10, choices=USER_TYPES, default='buyer')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def __str__(self):
        return self.email

    class Meta:
        db_table = 'users' 