from django.db import models
from shared.models import BaseModel

class BlockedKeyword(BaseModel):
    """Keywords that are blocked or flagged in messages"""
    keyword = models.CharField(max_length=100, unique=True)
    
    class Meta:
        db_table = 'blocked_keywords'
        ordering = ['keyword']

    def __str__(self):
        return self.keyword

class ModerationSetting(BaseModel):
    """Settings for automatic content moderation"""
    name = models.CharField(max_length=100, unique=True) # e.g., 'keyword_detection', 'link_blocking'
    label = models.CharField(max_length=200) # e.g., 'Keyword Detection'
    description = models.TextField(blank=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'moderation_settings'
        ordering = ['label']

    def __str__(self):
        return self.label