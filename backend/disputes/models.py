from django.db import models
from django.conf import settings
from django.utils import timezone
from products.models import Product
from orders.models import Order
import uuid


class DisputeStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    IN_PROGRESS = 'in_progress', 'In Progress'
    RESOLVED = 'resolved', 'Resolved'
    CLOSED = 'closed', 'Closed'
    ESCALATED = 'escalated', 'Escalated'


class DisputePriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class DisputeCategory(models.TextChoices):
    PRODUCT_NOT_RECEIVED = 'product_not_received', 'Product Not Received'
    PRODUCT_DEFECTIVE = 'product_defective', 'Product Defective'
    PRODUCT_NOT_AS_DESCRIBED = 'product_not_as_described', 'Product Not As Described'
    VENDOR_NOT_RESPONSIVE = 'vendor_not_responsive', 'Vendor Not Responsive'
    PAYMENT_ISSUE = 'payment_issue', 'Payment Issue'
    DELIVERY_ISSUE = 'delivery_issue', 'Delivery Issue'
    OTHER = 'other', 'Other'


class DisputeResolution(models.TextChoices):
    PENDING = 'pending', 'Pending'
    REFUND_FULL = 'refund_full', 'Full Refund to Buyer'
    REFUND_PARTIAL = 'refund_partial', 'Partial Refund to Buyer'
    REFUND_TO_VENDOR = 'refund_to_vendor', 'Payment to Vendor'
    PRODUCT_REPLACEMENT = 'product_replacement', 'Product Replacement'
    DISPUTE_DISMISSED = 'dispute_dismissed', 'Dispute Dismissed'
    FAVOR_BUYER = 'favor_buyer', 'Decision in Favor of Buyer'
    FAVOR_VENDOR = 'favor_vendor', 'Decision in Favor of Vendor'
    MUTUAL_RESOLUTION = 'mutual_resolution', 'Mutual Resolution'


class Dispute(models.Model):
    # Basic Information
    id = models.AutoField(primary_key=True)
    dispute_id = models.CharField(max_length=50, unique=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='disputes')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='disputes')
    
    # Parties involved
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_disputes')
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_disputes')
    
    # Dispute Details
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=DisputeCategory.choices)
    priority = models.CharField(max_length=20, choices=DisputePriority.choices, default=DisputePriority.MEDIUM)
    status = models.CharField(max_length=20, choices=DisputeStatus.choices, default=DisputeStatus.OPEN)
    
    # Resolution
    resolution = models.CharField(max_length=50, choices=DisputeResolution.choices, default=DisputeResolution.PENDING)
    resolution_notes = models.TextField(blank=True, null=True)
    resolution_reason = models.TextField(blank=True, null=True, help_text="Detailed explanation of why this decision was made")
    winning_party = models.CharField(max_length=20, choices=[
        ('buyer', 'Buyer'),
        ('vendor', 'Vendor'),
        ('neutral', 'Neutral/Shared Responsibility')
    ], blank=True, null=True, help_text="Which party the admin decided in favor of")
    refund_amount = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True, help_text="Refund amount in BTC")
    
    # Admin Assignment
    assigned_admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_disputes')
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Evidence
    evidence_files = models.JSONField(default=list, blank=True, help_text="List of file URLs uploaded as evidence")
    
    def save(self, *args, **kwargs):
        if not self.dispute_id:
            self.dispute_id = f"DISP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Dispute {self.dispute_id} - {self.title}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['assigned_admin', 'status']),
        ]


class DisputeMessage(models.Model):
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dispute_messages')
    message = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="Internal admin notes not visible to parties")
    attachments = models.JSONField(default=list, blank=True, help_text="List of file URLs")
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message in {self.dispute.dispute_id} by {self.sender.username}"


class DisputeTimeline(models.Model):
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='timeline')
    action = models.CharField(max_length=100)
    description = models.TextField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dispute_actions')
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.action} - {self.dispute.dispute_id}"

