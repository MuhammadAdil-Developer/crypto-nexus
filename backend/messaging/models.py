from django.db import models
from shared.models import BaseModel


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
        ('file', 'File'),
        ('system', 'System'),
    ])
    metadata = models.JSONField(default=dict, blank=True)  # For additional data like file info, etc.

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.email} to {self.recipient.email}"