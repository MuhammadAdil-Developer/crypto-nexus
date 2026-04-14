# This file contains the RefundRequest model to be added to payments/models.py

# Add this code to the end of payments/models.py:

"""
from django.db import models
from django.conf import settings
import uuid

class RefundRequest(models.Model):
    \"\"\"Model for tracking vendor refund requests\"\"\"
    
    REFUND_TYPES = [
        ('full', 'Full Refund'),
        ('partial', 'Partial Refund'),
    ]
    
    STATUSES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='refunds')
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='refund_requests')
    
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    refund_type = models.CharField(max_length=20, choices=REFUND_TYPES, default='full')
    reason = models.CharField(max_length=255)
    notes = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUSES, default='pending', db_index=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    transaction_hash = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        db_table = 'refund_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['order']),
        ]
    
    def __str__(self):
        return f"Refund {self.refund_type} - Order {self.order.order_id} - {self.status}"
"""
