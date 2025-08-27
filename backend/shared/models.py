from django.db import models
import uuid


class BaseModel(models.Model):
    """Base model with common fields for all models"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True


class CryptoCurrency(BaseModel):
    """Cryptocurrency model for supported currencies"""
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=10, unique=True)
    logo_url = models.URLField(blank=True, null=True)
    current_price = models.DecimalField(max_digits=20, decimal_places=8)
    market_cap = models.DecimalField(max_digits=20, decimal_places=2)
    volume_24h = models.DecimalField(max_digits=20, decimal_places=2)
    price_change_24h = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'crypto_currencies'
        verbose_name_plural = 'Cryptocurrencies'

    def __str__(self):
        return f"{self.name} ({self.symbol})"


class Category(BaseModel):
    """Product categories"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True)
    slug = models.SlugField(unique=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Product(BaseModel):
    """Product model for marketplace"""
    vendor = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=20, decimal_places=8)
    crypto_currency = models.ForeignKey(CryptoCurrency, on_delete=models.CASCADE)
    stock_quantity = models.PositiveIntegerField(default=0)
    images = models.JSONField(default=list)  # List of image URLs
    tags = models.JSONField(default=list)  # List of tags
    is_featured = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    review_count = models.PositiveIntegerField(default=0)
    slug = models.SlugField(unique=True)

    class Meta:
        db_table = 'products'

    def __str__(self):
        return self.name


class Order(BaseModel):
    """Order model"""
    ORDER_STATUS = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    )

    buyer = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='orders')
    vendor = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='vendor_orders')
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending')
    total_amount = models.DecimalField(max_digits=20, decimal_places=8)
    crypto_currency = models.ForeignKey(CryptoCurrency, on_delete=models.CASCADE)
    shipping_address = models.JSONField()
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_delivery = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'orders'

    def __str__(self):
        return f"Order {self.id} - {self.buyer.email}"


class OrderItem(BaseModel):
    """Order items"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=20, decimal_places=8)
    total_price = models.DecimalField(max_digits=20, decimal_places=8)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"


class Review(BaseModel):
    """Product reviews"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField()
    images = models.JSONField(default=list)

    class Meta:
        db_table = 'reviews'
        unique_together = ['product', 'user']

    def __str__(self):
        return f"Review by {self.user.email} for {self.product.name}"


class VendorApplication(BaseModel):
    """Vendor application model"""
    APPLICATION_STATUS = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    business_name = models.CharField(max_length=200)
    business_description = models.TextField()
    business_address = models.JSONField()
    business_license = models.URLField()
    tax_id = models.CharField(max_length=100)
    bank_account = models.JSONField()
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS, default='pending')
    admin_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'vendor_applications'

    def __str__(self):
        return f"Application by {self.user.email}"


class Message(BaseModel):
    """Message model for communication"""
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    parent_message = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True)

    class Meta:
        db_table = 'messages'

    def __str__(self):
        return f"Message from {self.sender.email} to {self.recipient.email}"


class Notification(BaseModel):
    """Notification model"""
    NOTIFICATION_TYPES = (
        ('order', 'Order Update'),
        ('payment', 'Payment'),
        ('message', 'Message'),
        ('system', 'System'),
    )

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    data = models.JSONField(default=dict)  # Additional data for the notification

    class Meta:
        db_table = 'notifications'

    def __str__(self):
        return f"Notification for {self.user.email}: {self.title}"


class Payment(BaseModel):
    """Payment model"""
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )

    PAYMENT_METHODS = (
        ('crypto', 'Cryptocurrency'),
        ('fiat', 'Fiat Currency'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    crypto_currency = models.ForeignKey(CryptoCurrency, on_delete=models.CASCADE)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    payment_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id}"


class Dispute(BaseModel):
    """Dispute model for order issues"""
    DISPUTE_STATUS = (
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='disputes')
    initiator = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='initiated_disputes')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=DISPUTE_STATUS, default='open')
    admin_notes = models.TextField(blank=True)
    resolution = models.TextField(blank=True)

    class Meta:
        db_table = 'disputes'

    def __str__(self):
        return f"Dispute for Order {self.order.id}" 