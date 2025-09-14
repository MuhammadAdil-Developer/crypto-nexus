from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from shared.models import BaseModel


class ProductCategory(models.Model):
    """Product categories for the marketplace"""
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Icon class name
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'product_categories'
        verbose_name_plural = 'Product Categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class ProductSubCategory(models.Model):
    """Product sub-categories"""
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='sub_categories', db_column='category_id')
    slug = models.SlugField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'product_subcategories'
        verbose_name_plural = 'Product Sub-Categories'
        unique_together = ['category', 'slug']
        ordering = ['sort_order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.name.lower().replace(' ', '-')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Product(BaseModel):
    """Account marketplace product model - Client Requirements"""
    
    # Basic Information
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='vendor_products')
    
    # Client Required Fields
    headline = models.CharField(max_length=200)  # Zoom Account, PIC
    listing_title = models.CharField(max_length=200, blank=True)  # Legacy field - map to headline
    website = models.CharField(max_length=200)  # Zoom.com
    account_type = models.CharField(max_length=50, choices=[
        ('messengers', 'Messengers'),
        ('streaming', 'Streaming'),
        ('gaming', 'Gaming'),
        ('social', 'Social Media'),
        ('trading', 'Trading/Exchange'),
        ('software', 'Software'),
        ('other', 'Other'),
    ])
    access_type = models.CharField(max_length=50, choices=[
        ('full_ownership', 'Full Ownership'),
        ('access', 'Access'),
        ('shared', 'Shared'),
    ])
    access_method = models.CharField(max_length=100, default='email_password')  # email:password
    account_balance = models.CharField(max_length=100, blank=True)  # $15 welcome credit
    description = models.TextField()  # Aged Zoom Account from 2021 USA IP Female blabla...
    price = models.DecimalField(max_digits=20, decimal_places=8, validators=[MinValueValidator(0)])
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(100)])
    additional_info = models.TextField(blank=True)  # Account is Shadowflagged by this and that
    delivery_time = models.CharField(max_length=50, choices=[
        ('instant_auto', 'Instant Auto-delivery'),
        ('manual_24h', 'Manual delivery within 24hrs'),
    ])
    delivery_method = models.CharField(max_length=50, default='instant')  # instant, manual
    
    # Optional Fields
    special_features = models.JSONField(default=list, db_column='special_features')  # 2FA, premium features
    region_restrictions = models.CharField(max_length=200, default='')  # US only, EU restricted
    quantity_available = models.PositiveIntegerField(default=1)
    account_age = models.CharField(max_length=100, blank=True, null=True, db_column='account_age')  # 2 years old
    main_images = models.JSONField(default=list, db_column='main_images')  # Main product images
    gallery_images = models.JSONField(default=list, db_column='gallery_images')  # Additional images
    documents = models.JSONField(default=list, db_column='documents')  # Supporting documents
    tags = models.JSONField(default=list, db_column='tags')  # Keywords/tags
    auto_delivery_script = models.TextField(default='')  # Auto-delivery script
    notes_for_buyer = models.TextField(default='')  # Special instructions
    
    # Credentials - Hidden until payment confirmed
    credentials = models.TextField(blank=True)  # testemail@test.com:testuser66:testpassword
    credentials_visible = models.BooleanField(default=False)  # Auto-set to True after payment
    
    # Escrow Settings
    escrow_enabled = models.BooleanField(default=False)  # Enable escrow for this product
    
    # Media
    main_image = models.ImageField(upload_to='products/images/', blank=True, null=True)
    
    # Status & Approval
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ], default='draft')
    
    verification_level = models.CharField(max_length=20, choices=[
        ('unverified', 'Unverified'),
        ('basic', 'Basic Verification'),
        ('premium', 'Premium Verification'),
        ('verified', 'Verified'),
    ], default='unverified')
    
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    approval_notes = models.TextField(default='')
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='approved_products')
    approved_at = models.DateTimeField(blank=True, null=True)
    
    # Rejection fields
    rejection_reason = models.TextField(default='')
    rejected_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='rejected_products')
    rejected_at = models.DateTimeField(blank=True, null=True)
    
    # Analytics
    views_count = models.PositiveIntegerField(default=0)
    favorites_count = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(5)])
    review_count = models.PositiveIntegerField(default=0)
    
    # Category (required for now)
    category = models.ForeignKey('ProductCategory', on_delete=models.CASCADE, related_name='products', db_column='category_id')
    sub_category = models.ForeignKey('ProductSubCategory', on_delete=models.SET_NULL, blank=True, null=True, related_name='products', db_column='sub_category_id')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_products'
        verbose_name_plural = 'Vendor Products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['account_type', 'status']),
            models.Index(fields=['price']),
            models.Index(fields=['rating']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.headline} - {self.vendor.username}"

    def save(self, *args, **kwargs):
        """Auto-set listing_title from headline"""
        if self.headline and not self.listing_title:
            self.listing_title = self.headline
        super().save(*args, **kwargs)

    def get_credentials_display(self):
        """Get credentials display based on payment status"""
        if self.credentials_visible:
            return self.credentials
        elif self.delivery_time == 'instant_auto':
            return "Credentials will be delivered automatically after payment confirmation"
        else:
            return "Manual delivery by seller within 24 hours"

    def increment_views(self):
        """Increment view count"""
        self.views_count += 1
        self.save(update_fields=['views_count'])

    def track_view(self, user, request=None):
        """Track a view for this product by a specific user"""
        from django.utils import timezone
        
        # Only track if user is authenticated (removed vendor restriction)
        if not user.is_authenticated:
            return False
            
        # Get or create view record (unique per user per product)
        view, created = ProductView.objects.get_or_create(
            product=self,
            user=user,
            defaults={
                'ip_address': request.META.get('REMOTE_ADDR') if request else None,
                'user_agent': request.META.get('HTTP_USER_AGENT', '') if request else '',
            }
        )
        
        # If it's a new view, increment the views_count
        if created:
            self.views_count += 1
            self.save(update_fields=['views_count'])
            return True
            
        return False

    def approve_product(self, approved_by_user):
        """Approve product listing"""
        self.status = 'approved'
        self.approved_by = approved_by_user
        self.approved_at = timezone.now()
        self.save()

    def reject_product(self, rejection_notes, rejected_by_user):
        """Reject product listing"""
        self.status = 'rejected'
        self.rejection_reason = rejection_notes
        self.rejected_by = rejected_by_user
        self.rejected_at = timezone.now()
        self.save()

    def reveal_credentials(self):
        """Reveal credentials after payment confirmation"""
        self.credentials_visible = True
        self.save(update_fields=['credentials_visible'])


class BulkUploadTemplate(BaseModel):
    """Template for bulk upload format"""
    name = models.CharField(max_length=100)
    description = models.TextField()
    template_format = models.TextField(help_text="CSV format template")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'bulk_upload_templates'

    def __str__(self):
        return self.name 


class ProductView(BaseModel):
    """Track individual product views per user"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_views')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='product_views')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_views'
        unique_together = ['product', 'user']  # One view per user per product
        indexes = [
            models.Index(fields=['product', 'user']),
            models.Index(fields=['viewed_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} viewed {self.product.headline}"
