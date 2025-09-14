from django.db import models
from django.conf import settings
from shared.models import BaseModel
from products.models import Product
from users.models import User
from payments.models import PaymentStatus
import uuid
from enum import Enum


class OrderStatus(Enum):
    """Order status enumeration"""
    PENDING_PAYMENT = 'pending_payment'
    PAYMENT_RECEIVED = 'payment_received'
    PROCESSING = 'processing'
    PAID = 'paid'
    DELIVERED = 'delivered'
    CONFIRMED = 'confirmed'
    DISPUTED = 'disputed'
    CANCELLED = 'cancelled'
    REFUNDED = 'refunded'


class Order(BaseModel):
    """Order model for managing product orders"""
    
    # Order identification
    order_id = models.CharField(max_length=50, unique=True)
    
    # User relationships
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='buyer_orders')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendor_orders_new')
    
    # Product information
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    quantity = models.PositiveIntegerField(default=1)
    
    # Pricing
    unit_price = models.DecimalField(max_digits=20, decimal_places=8)  # For crypto amounts
    total_amount = models.DecimalField(max_digits=20, decimal_places=8)
    crypto_currency = models.CharField(max_length=10, choices=[
        ('BTC', 'Bitcoin'),
        ('XMR', 'Monero'),
    ])
    
    # Payment details
    payment_address = models.CharField(max_length=255, blank=True)
    payment_status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name) for status in PaymentStatus],
        default=PaymentStatus.PENDING.value
    )
    
    # Order status
    order_status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name) for status in OrderStatus],
        default=OrderStatus.PENDING_PAYMENT.value
    )
    
    # Escrow and dispute
    use_escrow = models.BooleanField(default=False)
    escrow_fee = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    dispute_opened = models.BooleanField(default=False)
    dispute_reason = models.TextField(blank=True)
    
    # Timestamps
    payment_expires_at = models.DateTimeField(null=True, blank=True)
    payment_confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    dispute_opened_at = models.DateTimeField(null=True, blank=True)
    
    # Product delivery
    product_credentials = models.JSONField(default=dict, blank=True)  # Store delivered credentials
    
    class Meta:
        ordering = ['-created_at']
        db_table = 'marketplace_orders'
    
    def __str__(self):
        return f"Order {self.order_id} - {self.product.headline}"
    
    def save(self, *args, **kwargs):
        # Auto-generate order_id if not set
        if not self.order_id:
            self.order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        
        # Auto-calculate total amount
        if not self.total_amount:
            self.total_amount = self.unit_price * self.quantity
        super().save(*args, **kwargs)
    
    @property
    def is_payment_expired(self):
        """Check if payment has expired"""
        if self.payment_expires_at:
            from django.utils import timezone
            return timezone.now() > self.payment_expires_at
        return False
    
    @property
    def can_dispute(self):
        """Check if user can still dispute"""
        if self.delivered_at:
            from django.utils import timezone
            from datetime import timedelta
            # 48 hours from delivery
            dispute_deadline = self.delivered_at + timedelta(hours=48)
            return timezone.now() <= dispute_deadline
        return False


class OrderDispute(BaseModel):
    """Model for handling order disputes"""
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='dispute')
    
    # Dispute details
    reason = models.TextField()
    evidence = models.JSONField(default=dict)  # Store evidence from both parties
    
    # Resolution
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_disputes')
    resolution = models.CharField(max_length=20, choices=[
        ('buyer_wins', 'Buyer Wins'),
        ('vendor_wins', 'Vendor Wins'),
        ('partial_refund', 'Partial Refund'),
    ], blank=True)
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'marketplace_order_disputes'
    
    def __str__(self):
        return f"Dispute for Order {self.order.order_id}" 