from django.db import models
from django.conf import settings
from shared.models import BaseModel, CryptoCurrency
import uuid
from enum import Enum


class PaymentStatus(Enum):
    """Payment status enumeration"""
    PENDING = 'pending'
    PARTIAL = 'partial'
    PAID = 'paid'
    OVERPAID = 'overpaid'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'


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
    ], default='pending')
    
    expires_at = models.DateTimeField()
    confirmed_at = models.DateTimeField(blank=True, null=True)
    
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
    
    payment_address = models.OneToOneField(PaymentAddress, on_delete=models.CASCADE, related_name='escrow')
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_escrows')
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_escrows')
    
    escrow_amount = models.DecimalField(max_digits=20, decimal_places=8)
    escrow_fee = models.DecimalField(max_digits=20, decimal_places=8)
    
    status = models.CharField(max_length=20, choices=ESCROW_STATUS, default='created')
    
    # Auto-release configuration
    auto_release_enabled = models.BooleanField(default=True)
    auto_release_days = models.IntegerField(default=7)
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