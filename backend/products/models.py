from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
import uuid
from django.utils import timezone


class ProductCategory(models.Model):
    """Enhanced product categories for crypto marketplace"""
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='subcategories')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_categories'
        verbose_name_plural = 'Product Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductSubCategory(models.Model):
    """Sub-categories for main categories"""
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    slug = models.SlugField(blank=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='subcategories_list')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_subcategories'
        verbose_name_plural = 'Product Sub-Categories'
        unique_together = ['name', 'category']
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Product(models.Model):
    """Enhanced Product model for crypto marketplace"""
    
    # Basic Information
    id = models.BigAutoField(primary_key=True)
    vendor = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='vendor_products')
    listing_title = models.CharField(max_length=200)
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE)
    sub_category = models.ForeignKey(ProductSubCategory, on_delete=models.CASCADE, blank=True, null=True)
    description = models.TextField(max_length=150)
    
    # Account/Product Details
    account_type = models.CharField(max_length=50, choices=[
        ('personal', 'Personal'),
        ('business', 'Business'),
        ('premium', 'Premium'),
        ('trial', 'Trial'),
        ('demo', 'Demo'),
        ('vip', 'VIP'),
    ])
    verification_level = models.CharField(max_length=50, choices=[
        ('unverified', 'Unverified'),
        ('email_verified', 'Email Verified'),
        ('kyc_verified', 'KYC Verified'),
        ('2fa_enabled', '2FA Enabled'),
        ('phone_verified', 'Phone Verified'),
    ])
    account_age = models.DateField(blank=True, null=True)
    access_method = models.CharField(max_length=50, choices=[
        ('username_password', 'Username + Password'),
        ('api_keys', 'API Keys'),
        ('seed_phrase', 'Seed Phrase'),
        ('software_license', 'Software License'),
        ('access_token', 'Access Token'),
    ])
    special_features = models.JSONField(default=list, blank=True)
    region_restrictions = models.CharField(max_length=200, blank=True)
    
    # Pricing & Availability
    price = models.DecimalField(max_digits=20, decimal_places=8, validators=[MinValueValidator(0)])
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    quantity_available = models.PositiveIntegerField(default=1)
    delivery_method = models.CharField(max_length=50, choices=[
        ('instant_auto', 'Instant Auto-delivery'),
        ('manual_approval', 'Manual after order approval'),
    ])
    
    # Media & Proof
    main_images = models.JSONField(default=list)  # List of image URLs
    gallery_images = models.JSONField(default=list)  # List of gallery image URLs
    documents = models.JSONField(default=list)  # List of document URLs
    
    # Additional Metadata
    tags = models.JSONField(default=list)
    auto_delivery_script = models.TextField(blank=True)
    notes_for_buyer = models.TextField(blank=True)
    
    # Status & Approval
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ], default='draft')
    
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    approval_notes = models.TextField(blank=True)
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='approved_products')
    approved_at = models.DateTimeField(blank=True, null=True)
    
    # Rejection fields
    rejection_reason = models.TextField(blank=True)
    rejected_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, blank=True, null=True, related_name='rejected_products')
    rejected_at = models.DateTimeField(blank=True, null=True)
    
    # Analytics
    views_count = models.PositiveIntegerField(default=0)
    favorites_count = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(5)])
    review_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_products'
        verbose_name_plural = 'Vendor Products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['price']),
            models.Index(fields=['rating']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.listing_title} - {self.vendor.username}"

    def get_final_price(self):
        """Calculate final price after discount"""
        if self.discount_percentage > 0:
            discount_amount = (self.price * self.discount_percentage) / 100
            return self.price - discount_amount
        return self.price

    def get_available_quantity(self):
        """Get available quantity for purchase"""
        return max(0, self.quantity_available)

    def increment_views(self):
        """Increment view count"""
        self.views_count += 1
        self.save(update_fields=['views_count'])

    def approve_product(self, approved_by_user):
        """Approve product listing"""
        self.status = 'approved'
        self.approved_by = approved_by_user
        self.approved_at = timezone.now()
        self.save()

    def reject_product(self, rejection_notes):
        """Reject product listing"""
        self.status = 'rejected'
        self.approval_notes = rejection_notes
        self.save()


class ProductImage(models.Model):
    """Product images with metadata"""
    id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_images')
    image = models.ImageField(upload_to='products/images/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_images'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.product.listing_title} - Image {self.order}"


class ProductDocument(models.Model):
    """Product documents for verification"""
    id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_documents')
    document = models.FileField(upload_to='products/documents/')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file_type = models.CharField(max_length=20)
    file_size = models.PositiveIntegerField()  # Size in bytes
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_documents'

    def __str__(self):
        return f"{self.product.listing_title} - {self.title}"


class ProductTag(models.Model):
    """Product tags for search and categorization"""
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_tags'
        ordering = ['-usage_count', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name 