from django.db import models
from django.conf import settings
from django.utils import timezone

class VendorApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('under_review', 'Under Review'),
    ]
    
    CATEGORY_CHOICES = [
        ('Electronics & Tech', 'Electronics & Tech'),
        ('Digital Goods & Software', 'Digital Goods & Software'),
        ('Streaming Accounts', 'Streaming Accounts'),
        ('Gaming Accounts', 'Gaming Accounts'),
        ('Educational Services', 'Educational Services'),
        ('VPN & Security', 'VPN & Security'),
        ('Design & Creative', 'Design & Creative'),
        ('Business Tools', 'Business Tools'),
        ('Other', 'Other'),
    ]
    
    BUSINESS_TYPE_CHOICES = [
        ('individual', 'Individual/Sole Proprietor'),
        ('partnership', 'Partnership'),
        ('corporation', 'Corporation'),
        ('llc', 'Limited Liability Company (LLC)'),
        ('other', 'Other'),
    ]
    
    YEARS_CHOICES = [
        ('less-than-1', 'Less than 1 year'),
        ('1-2', '1-2 years'),
        ('3-5', '3-5 years'),
        ('5-10', '5-10 years'),
        ('more-than-10', 'More than 10 years'),
    ]
    
    PAYMENT_CHOICES = [
        ('btc', 'Bitcoin (BTC)'),
        ('xmr', 'Monero (XMR)'),
        ('both', 'Both BTC & XMR'),
        ('escrow', 'Escrow Only'),
    ]
    
    # Basic Info
    business_name = models.CharField(max_length=200)
    vendor_username = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    contact = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    social_media = models.CharField(max_length=200, blank=True, null=True)
    
    # Store Info
    store_description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    sub_category = models.CharField(max_length=100, blank=True, null=True)
    business_type = models.CharField(max_length=20, choices=BUSINESS_TYPE_CHOICES, blank=True, null=True)
    years_in_business = models.CharField(max_length=20, choices=YEARS_CHOICES, blank=True, null=True)
    target_market = models.TextField(blank=True, null=True)
    business_plan = models.TextField(blank=True, null=True)
    
    # Payment Info
    btc_address = models.CharField(max_length=100, blank=True, null=True)
    xmr_address = models.CharField(max_length=100, blank=True, null=True)
    preferred_payment = models.CharField(max_length=20, choices=PAYMENT_CHOICES, blank=True, null=True)
    
    # Business Details
    business_address = models.TextField(blank=True, null=True)
    business_license = models.CharField(max_length=100, blank=True, null=True)
    tax_id = models.CharField(max_length=100, blank=True, null=True)
    insurance = models.CharField(max_length=100, blank=True, null=True)
    
    # Documents
    documents = models.FileField(upload_to='vendor_applications/documents/', blank=True, null=True)  # Single file upload
    logo = models.ImageField(upload_to='vendor_applications/logos/', blank=True, null=True)  # Logo image
    images = models.ImageField(upload_to='vendor_applications/images/', blank=True, null=True)  # Additional images
    
    # Application Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Vendor Application'
        verbose_name_plural = 'Vendor Applications'
    
    def __str__(self):
        return f"{self.business_name} - {self.vendor_username} ({self.status})"
    
    @property
    def is_pending(self):
        return self.status == 'pending'
    
    @property
    def is_approved(self):
        return self.status == 'approved'
    
    @property
    def is_rejected(self):
        return self.status == 'rejected' 