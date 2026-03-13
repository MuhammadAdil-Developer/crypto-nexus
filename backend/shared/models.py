from django.db import models
import uuid
# Force sync comment
from django.utils import timezone

class BaseModel(models.Model):
    """Base model with common fields for all models"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True


class SystemConfiguration(BaseModel):
    """General system settings stored in database for persistence"""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'system_configurations'
        verbose_name_plural = 'System Configurations'

    def __str__(self):
        return self.key

    @classmethod
    def get_value(cls, key, default=None):
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set_value(cls, key, value):
        cls.objects.update_or_create(key=key, defaults={'value': str(value)})

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


class Conversation(BaseModel):
    """Conversation model for grouping messages"""
    participants = models.ManyToManyField('users.User', related_name='conversations')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, null=True, blank=True, related_name='conversations')
    last_message = models.ForeignKey('Message', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversation_last')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']

    def __str__(self):
        if self.product:
            return f"Conversation about {self.product.headline}"
        return f"Conversation between {self.participants.count()} users"


class Message(BaseModel):
    """Message model for communication"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    message_type = models.CharField(max_length=20, default='text', choices=[
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('file', 'File'),
        ('pdf', 'PDF'),
        ('document', 'Document'),
        ('system', 'System'),
    ])
    metadata = models.JSONField(default=dict, blank=True)  # For additional data like file info, file_url, file_name, file_size, etc.
    attachment = models.FileField(upload_to='message_attachments/', blank=True, null=True)  # Store file attachments
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_flagged = models.BooleanField(default=False)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.email} to {self.recipient.email}"


class Notification(BaseModel):
    """Notification model"""
    NOTIFICATION_TYPES = (
        ('order', 'Order Update'),
        ('payment', 'Payment'),
        ('message', 'Message'),
        ('system', 'System'),
        ('listing_approval', 'Listing Approval'),
        ('listing_rejection', 'Listing Rejection'),
        ('ticket_assigned', 'Ticket Assigned'),
        ('ticket_response', 'Ticket Response'),
        ('security', 'Security Alert'),
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


class Announcement(BaseModel):
    """System-wide announcements"""
    AUDIENCE_CHOICES = (
        ('all', 'All Users'),
        ('buyer', 'Buyers Only'),
        ('vendor', 'Vendors Only'),
        ('admin', 'Admins Only'),
    )

    title = models.CharField(max_length=200)
    content = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Priority for display (e.g., 'high', 'normal', 'low')
    priority = models.CharField(max_length=20, default='normal', choices=[
        ('high', 'High'),
        ('normal', 'Normal'),
        ('low', 'Low'),
    ])

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


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


class UserActivity(BaseModel):
    """Comprehensive user activity tracking model"""
    ACTIVITY_TYPES = (
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('listing_created', 'Listing Created'),
        ('listing_updated', 'Listing Updated'),
        ('listing_deleted', 'Listing Deleted'),
        ('listing_viewed', 'Listing Viewed'),
        ('search', 'Search'),
        ('order_created', 'Order Created'),
        ('order_updated', 'Order Updated'),
        ('order_cancelled', 'Order Cancelled'),
        ('order_completed', 'Order Completed'),
        ('wishlist_added', 'Wishlist Added'),
        ('wishlist_removed', 'Wishlist Removed'),
        ('settings_changed', 'Settings Changed'),
        ('transaction_viewed', 'Transaction History Viewed'),
        ('message_sent', 'Message Sent'),
        ('message_received', 'Message Received'),
        ('review_created', 'Review Created'),
        ('review_updated', 'Review Updated'),
        ('notification_viewed', 'Notification Viewed'),
        ('profile_updated', 'Profile Updated'),
        ('password_changed', 'Password Changed'),
        ('user_block', 'User Blocked'),
        ('user_unblock', 'User Unblocked'),
        ('user_report', 'User Reported'),
        ('refund_requested', 'Refund Requested'),
        ('refund_approved', 'Refund Approved'),
        ('refund_rejected', 'Refund Rejected'),
        ('dispute_opened', 'Dispute Opened'),
        ('dispute_resolved', 'Dispute Resolved'),
        ('wallet_credited', 'Wallet Credited'),
        ('wallet_withdrawn', 'Wallet Withdrawn'),
        ('vendor_refund_processed', 'Vendor Refund Processed'),
        ('login_failed', 'Failed Login Attempt'),
        ('security_alert', 'Security Alert'),
    )

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)  # Additional context data

    class Meta:
        db_table = 'user_activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} - {self.created_at}"


class UserReport(BaseModel):
    """Model for reporting users"""
    REPORT_REASONS = (
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('inappropriate_content', 'Inappropriate Content'),
        ('scam', 'Scam/Fraud'),
        ('fake_account', 'Fake Account'),
        ('other', 'Other'),
    )
    
    REPORT_STATUS = (
        ('pending', 'Pending'),
        ('reviewing', 'Under Review'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    )
    
    reporter = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='reports_made')
    reported_user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='reports_received')
    reason = models.CharField(max_length=50, choices=REPORT_REASONS)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=REPORT_STATUS, default='pending')
    admin_notes = models.TextField(blank=True)
    conversation_id = models.UUIDField(blank=True, null=True, help_text="Related conversation if report is from messaging")
    message_id = models.UUIDField(blank=True, null=True, help_text="Related message if report is from messaging")
    
    class Meta:
        db_table = 'user_reports'
        ordering = ['-created_at']
        unique_together = [['reporter', 'reported_user', 'conversation_id']]  # Prevent duplicate reports for same conversation
    
    def __str__(self):
        return f"Report by {self.reporter.username} against {self.reported_user.username}"


class UserWallet(BaseModel):
    """User wallet for internal balance tracking"""
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='wallet')
    
    # Balances per currency
    balance_btc = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    balance_xmr = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    # Total lifetime stats
    total_deposited_btc = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    total_deposited_xmr = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    total_withdrawn_btc = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    total_withdrawn_xmr = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    class Meta:
        db_table = 'user_wallets'
    
    def __str__(self):
        return f"Wallet for {self.user.username} - BTC: {self.balance_btc}, XMR: {self.balance_xmr}"
    
    def get_balance(self, currency):
        """Get balance for a specific currency"""
        if currency.upper() == 'BTC':
            return self.balance_btc
        elif currency.upper() == 'XMR':
            return self.balance_xmr
        return 0
    
    def credit(self, amount, currency):
        """Credit amount to wallet"""
        currency = currency.upper()
        if currency == 'BTC':
            self.balance_btc += amount
            self.total_deposited_btc += amount
        elif currency == 'XMR':
            self.balance_xmr += amount
            self.total_deposited_xmr += amount
        self.save()
    
    def debit(self, amount, currency):
        """Debit amount from wallet"""
        currency = currency.upper()
        if currency == 'BTC':
            if self.balance_btc < amount:
                raise ValueError(f"Insufficient BTC balance. Available: {self.balance_btc}, Required: {amount}")
            self.balance_btc -= amount
            self.total_withdrawn_btc += amount
        elif currency == 'XMR':
            if self.balance_xmr < amount:
                raise ValueError(f"Insufficient XMR balance. Available: {self.balance_xmr}, Required: {amount}")
            self.balance_xmr -= amount
            self.total_withdrawn_xmr += amount
        self.save()


class WalletTransaction(BaseModel):
    """Track all wallet transactions"""
    TRANSACTION_TYPES = [
        ('refund', 'Refund'),
        ('withdrawal', 'Withdrawal'),
        ('deposit', 'Deposit'),
        ('purchase', 'Purchase'),
        ('partial_refund', 'Partial Refund'),
        ('external_refund', 'External Refund'),
    ]
    
    wallet = models.ForeignKey(UserWallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    crypto_currency = models.CharField(max_length=10)
    
    # Related entities
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)
    refund_request = models.ForeignKey('payments.RefundRequest', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Transaction details
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'wallet_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', '-created_at']),
            models.Index(fields=['transaction_type']),
        ]
    
    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} {self.crypto_currency} - {self.created_at}"

class IPRestriction(BaseModel):
    """Manage allowed and blocked IP addresses/ranges"""
    RESTRICTION_TYPES = (
        ('whitelist', 'Whitelist'),
        ('blacklist', 'Blacklist'),
    )
    ip_address = models.CharField(max_length=100)
    restriction_type = models.CharField(max_length=20, choices=RESTRICTION_TYPES)
    reason = models.TextField(blank=True)
    label = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'ip_restrictions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.restriction_type}: {self.ip_address} ({self.label})"
