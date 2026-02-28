from django.db import models
from django.conf import settings
from shared.models import BaseModel, CryptoCurrency
import uuid
from enum import Enum


class RefundRequest(BaseModel):
    """Model for tracking buyer-initiated refund requests with vendor decision window and dispute flow"""
    
    REFUND_TYPES = [
        ('full', 'Full Refund'),
        ('partial', 'Partial Refund'),
    ]
    
    STATUSES = [
        ('pending_vendor', 'Pending Vendor Approval'),
        ('pending_admin', 'Pending Admin Review'),
        ('vendor_approved', 'Vendor Approved'),
        ('vendor_rejected', 'Vendor Rejected'),
        ('disputed', 'Disputed'),
        ('admin_approved', 'Admin Approved'),
        ('admin_rejected', 'Admin Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='refund_request')
    
    # Buyer initiates, vendor responds
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_refund_requests')
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_refund_requests')
    
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    refund_type = models.CharField(max_length=20, choices=REFUND_TYPES, default='full')
    reason = models.TextField()  # Changed from CharField to TextField
    notes = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUSES, default='pending_vendor', db_index=True)
    
    # Vendor decision
    vendor_decision = models.CharField(max_length=20, choices=[('approved', 'Approved'), ('rejected', 'Rejected')], blank=True, null=True)
    vendor_decision_at = models.DateTimeField(blank=True, null=True)
    vendor_decision_notes = models.TextField(blank=True)
    vendor_decision_deadline = models.DateTimeField(blank=True, null=True)  # e.g., 48 hours from creation
    
    # Admin decision (for disputes)
    admin_decision = models.CharField(max_length=20, choices=[
        ('buyer_wins', 'Buyer Wins'),
        ('vendor_wins', 'Vendor Wins'),
        ('partial_refund', 'Partial Refund')
    ], blank=True, null=True)
    admin_decision_amount = models.DecimalField(max_digits=20, decimal_places=8, blank=True, null=True)
    admin_decision_at = models.DateTimeField(blank=True, null=True)
    admin_decision_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_refunds')
    
    # Vendor refund processing (when admin favors buyer)
    vendor_refund_required = models.BooleanField(default=False)
    vendor_refund_deadline = models.DateTimeField(blank=True, null=True)
    vendor_refund_completed = models.BooleanField(default=False)
    vendor_refund_transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    vendor_payment_source = models.CharField(
        max_length=20,
        choices=[('platform', 'Platform Wallet'), ('external', 'External Wallet')],
        blank=True,
        null=True
    )
    vendor_external_wallet_address = models.CharField(max_length=255, blank=True, null=True)
    last_reminder_sent = models.DateTimeField(blank=True, null=True)
    
    # Legacy fields for backward compatibility
    rejection_reason = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        db_table = 'refund_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', '-created_at']),
            models.Index(fields=['buyer', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['order']),
            models.Index(fields=['vendor_refund_required', 'vendor_refund_completed']),
            models.Index(fields=['vendor_decision_deadline']),
        ]
    
    def __str__(self):
        return f"Refund {self.refund_type} - Order {self.order.order_id} - {self.status}"
    
    @property
    def is_vendor_decision_overdue(self):
        """Check if vendor decision deadline has passed"""
        if self.vendor_decision_deadline:
            from django.utils import timezone
            return timezone.now() > self.vendor_decision_deadline and self.status == 'pending_vendor'
        return False
    
    @property
    def is_vendor_refund_overdue(self):
        """Check if vendor refund deadline has passed"""
        if self.vendor_refund_deadline and self.vendor_refund_required:
            from django.utils import timezone
            return timezone.now() > self.vendor_refund_deadline and not self.vendor_refund_completed
        return False

class PaymentStatus(Enum):
    """Payment status enumeration"""
    PENDING = 'pending'
    PARTIAL = 'partial'
    PAID = 'paid'
    OVERPAID = 'overpaid'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'
    REFUNDED = 'refunded'


class PaymentAddress(BaseModel):
    """Model for storing unique payment addresses per order"""
    
    PAYMENT_TYPES = [
        ('wallet', 'Crypto Wallet'),
        ('buy', 'Buy with Card'),
        ('exchange', 'Exchange Transfer'),
    ]
    
    order_id = models.CharField(max_length=100, unique=True)
    crypto_currency = models.ForeignKey(CryptoCurrency, on_delete=models.CASCADE)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='wallet')
    
    # BTCPay Server fields
    btcpay_invoice_id = models.CharField(max_length=100, blank=True, null=True)
    btcpay_checkout_link = models.URLField(blank=True, null=True)
    
    # Crypto addresses
    payment_address = models.CharField(max_length=255)
    expected_amount = models.DecimalField(max_digits=20, decimal_places=8)
    received_amount = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    linked_order_ids = models.JSONField(default=list, blank=True, help_text="List of order IDs covered by this payment in case of bulk purchase")
    
    # Monero specific fields
    monero_subaddress_index = models.IntegerField(blank=True, null=True)
    monero_payment_id = models.CharField(max_length=64, blank=True, null=True)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('partial', 'Partial Payment'),
        ('paid', 'Fully Paid'),
        ('overpaid', 'Overpaid'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ], default='pending')
    
    expires_at = models.DateTimeField()
    confirmed_at = models.DateTimeField(blank=True, null=True, db_index=True)
    
    # Transaction details
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    confirmations = models.IntegerField(default=0)
    required_confirmations = models.IntegerField(default=1)
    
    class Meta:
        db_table = 'payment_addresses'
        indexes = [
            models.Index(fields=['order_id']),
            models.Index(fields=['payment_address']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Payment {self.order_id} - {self.crypto_currency.symbol}"


class EscrowPayment(BaseModel):
    """Model for escrow payments"""
    
    ESCROW_STATUS = [
        ('created', 'Created'),
        ('funded', 'Funded'),
        ('disputed', 'Disputed'),
        ('released', 'Released to Vendor'),
        ('refunded', 'Refunded to Buyer'),
        ('cancelled', 'Cancelled'),
    ]
    
    payment_address = models.ForeignKey(PaymentAddress, on_delete=models.CASCADE, related_name='escrows')
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='escrow_payment', null=True, blank=True)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_escrows')
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_escrows')
    
    escrow_amount = models.DecimalField(max_digits=20, decimal_places=8)
    escrow_fee = models.DecimalField(max_digits=20, decimal_places=8)
    
    status = models.CharField(max_length=20, choices=ESCROW_STATUS, default='created')
    
    # Auto-release configuration
    auto_release_enabled = models.BooleanField(default=True)
    auto_release_days = models.IntegerField(default=2)
    auto_release_at = models.DateTimeField(blank=True, null=True)
    
    # Release/refund details
    released_at = models.DateTimeField(blank=True, null=True)
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='released_escrows')
    release_transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    
    # Dispute handling
    dispute_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'escrow_payments'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['auto_release_at']),
        ]

    def __str__(self):
        return f"Escrow {self.payment_address.order_id} - {self.status}"


class Payout(BaseModel):
    """Model for tracking vendor payouts"""
    
    PAYOUT_TYPES = [
        ('escrow', 'Escrow Release'),
        ('direct', 'Direct Payment'),
        ('refund', 'Partial Payment Refund'),
        ('manual', 'Manual Admin Payout'),
    ]
    
    PAYOUT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='payouts', null=True, blank=True)
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payouts', null=True, blank=True)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_payouts', null=True, blank=True)
    
    payout_type = models.CharField(max_length=10, choices=PAYOUT_TYPES)
    crypto_currency = models.ForeignKey('shared.CryptoCurrency', on_delete=models.CASCADE)
    
    # Amount details
    gross_amount = models.DecimalField(max_digits=20, decimal_places=8)  # Total amount before fees
    net_amount = models.DecimalField(max_digits=20, decimal_places=8)    # Amount to vendor after fees
    platform_fee = models.DecimalField(max_digits=20, decimal_places=8)  # Our commission
    escrow_fee = models.DecimalField(max_digits=20, decimal_places=8, default=0)  # Escrow fee if applicable
    
    # Payment details
    vendor_address = models.CharField(max_length=255)  # Vendor's wallet address
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=PAYOUT_STATUS, default='pending')
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    # Admin actions
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payouts')
    admin_notes = models.TextField(blank=True)
    
    # Auto-release for escrow
    auto_release_enabled = models.BooleanField(default=True)
    auto_release_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'payouts'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['payout_type']),
            models.Index(fields=['auto_release_at']),
            models.Index(fields=['vendor', 'status']),
        ]
    
    def __str__(self):
        return f"Payout {self.order.order_id} - {self.net_amount} {self.crypto_currency.symbol}"


class DirectPayment(BaseModel):
    """Model for tracking direct payments to vendor addresses"""
    
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
        ('refunded', 'Refunded'),
        ('partial', 'Partial Payment'),
        # Keeping 'confirmed' for internal logic compatibility
        ('confirmed', 'Confirmed'),
    ]
    
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='direct_payment')
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='direct_payments')
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_direct_payments')
    
    crypto_currency = models.ForeignKey('shared.CryptoCurrency', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=20, decimal_places=8) # Expected
    amount_received = models.DecimalField(max_digits=20, decimal_places=8, default=0) # Actual
    
    # Fee tracking
    platform_fee = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    escrow_fee = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    net_amount = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    vendor_address = models.CharField(max_length=255)  # Vendor's wallet address
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    confirmations = models.IntegerField(default=0)
    
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField()  # Payment expiration time
    
    class Meta:
        db_table = 'direct_payments'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['vendor_address']),
        ]
    
    def __str__(self):
        return f"Direct Payment {self.order.order_id} - {self.amount} {self.crypto_currency.symbol}"


class PaymentWebhook(BaseModel):
    """Model for storing payment webhooks from BTCPay/Monero"""
    
    WEBHOOK_TYPES = [
        ('btcpay', 'BTCPay Server'),
        ('monero', 'Monero RPC'),
        ('manual', 'Manual Update'),
    ]
    
    payment_address = models.ForeignKey(PaymentAddress, on_delete=models.CASCADE, related_name='webhooks')
    webhook_type = models.CharField(max_length=20, choices=WEBHOOK_TYPES)
    
    # Webhook data
    external_id = models.CharField(max_length=255)  # BTCPay invoice ID or Monero txid
    delivery_id = models.CharField(max_length=255, blank=True, null=True)  # BTCPay delivery ID for deduplication
    raw_data = models.JSONField()
    processed = models.BooleanField(default=False)
    
    # Transaction details from webhook
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    amount_received = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    confirmations = models.IntegerField(default=0)
    
    error_message = models.TextField(blank=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'payment_webhooks'
        indexes = [
            models.Index(fields=['external_id']),
            models.Index(fields=['processed']),
            models.Index(fields=['webhook_type']),
        ]

    def __str__(self):
        return f"Webhook {self.webhook_type} - {self.external_id}"


class PaymentMethod(BaseModel):
    """Model for storing accepted payment methods per vendor"""
    
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_methods')
    crypto_currency = models.ForeignKey(CryptoCurrency, on_delete=models.CASCADE)
    
    enabled = models.BooleanField(default=True)
    escrow_enabled = models.BooleanField(default=True)
    auto_accept_threshold = models.DecimalField(max_digits=20, decimal_places=8, blank=True, null=True)
    
    # Fee configuration
    payment_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    escrow_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=2)
    
    class Meta:
        db_table = 'payment_methods'
        unique_together = ['vendor', 'crypto_currency']

    def __str__(self):
        return f"{self.vendor.username} - {self.crypto_currency.symbol}"


class BlockchainTransaction(BaseModel):
    """Model for tracking blockchain transactions"""
    
    payment_address = models.ForeignKey(PaymentAddress, on_delete=models.CASCADE, related_name='transactions')
    
    transaction_hash = models.CharField(max_length=255, unique=True)
    block_height = models.IntegerField(blank=True, null=True)
    confirmations = models.IntegerField(default=0)
    
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    fee = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    confirmed = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    
    # Raw transaction data
    raw_transaction = models.JSONField(blank=True, null=True)
    
    class Meta:
        db_table = 'blockchain_transactions'
        indexes = [
            models.Index(fields=['transaction_hash']),
            models.Index(fields=['confirmed']),
            models.Index(fields=['block_height']),
        ]

    def __str__(self):
        return f"TX {self.transaction_hash[:8]}... - {self.amount}" 