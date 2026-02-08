import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class TicketCategory(models.TextChoices):
    ACCOUNT = 'account', 'Account'
    PAYMENT = 'payment', 'Payment'
    TECHNICAL = 'technical', 'Technical'
    GENERAL = 'general', 'General'
    VENDOR_APPLICATION = 'vendor_application', 'Vendor Application'
    ORDER_ISSUE = 'order_issue', 'Order Issue'
    LISTING = 'listing', 'Listing'


class TicketPriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class TicketStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    IN_PROGRESS = 'in_progress', 'In Progress'
    WAITING_RESPONSE = 'waiting_response', 'Waiting for Response'
    RESOLVED = 'resolved', 'Resolved'
    CLOSED = 'closed', 'Closed'


class Ticket(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_id = models.CharField(max_length=50, unique=True, blank=True)
    
    # User information
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    user_type = models.CharField(max_length=20, choices=[
        ('buyer', 'Buyer'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin')
    ])
    
    # Ticket details
    subject = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=TicketCategory.choices)
    priority = models.CharField(max_length=20, choices=TicketPriority.choices, default=TicketPriority.MEDIUM)
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN)
    
    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_tickets',
        limit_choices_to={'user_type': 'admin'}
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    response_count = models.PositiveIntegerField(default=0)
    is_urgent = models.BooleanField(default=False)
    
    def save(self, *args, **kwargs):
        if not self.ticket_id:
            # Generate ticket ID in format TICK-YYYY-XXXX
            year = timezone.now().year
            count = Ticket.objects.filter(ticket_id__startswith=f'TICK-{year}').count() + 1
            self.ticket_id = f'TICK-{year}-{count:04d}'
        
        # Auto-set urgent flag
        self.is_urgent = self.priority == TicketPriority.URGENT
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.ticket_id} - {self.subject}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['category', 'status']),
        ]


class TicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_messages')
    sender_type = models.CharField(max_length=20, choices=[
        ('buyer', 'Buyer'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin')
    ])
    
    message = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="Internal notes visible only to admins")
    
    # File attachments
    attachments = models.JSONField(default=list, blank=True, help_text="List of file URLs")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Update ticket's last_response_at and response_count
        self.ticket.last_response_at = self.created_at
        self.ticket.response_count = self.ticket.messages.count()
        
        # Update ticket status based on who replied
        if self.sender_type == 'admin':
            if self.ticket.status == TicketStatus.WAITING_RESPONSE:
                self.ticket.status = TicketStatus.IN_PROGRESS
        else:
            if self.ticket.status in [TicketStatus.OPEN, TicketStatus.IN_PROGRESS]:
                self.ticket.status = TicketStatus.WAITING_RESPONSE
        
        self.ticket.save(update_fields=['last_response_at', 'response_count', 'status'])
    
    def __str__(self):
        return f"Message {self.id} for {self.ticket.ticket_id}"
    
    class Meta:
        ordering = ['created_at']


class TicketTemplate(models.Model):
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, choices=TicketCategory.choices)
    subject = models.CharField(max_length=200)
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']
