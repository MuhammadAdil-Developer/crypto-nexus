from django.db import models
import uuid


class CommissionSettings(models.Model):
    """Global commission settings for the platform"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Global commission rates
    platform_fee_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=5.00, 
        help_text="Platform commission rate (%)"
    )
    escrow_fee_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=1.00, 
        help_text="Escrow fee rate (%)"
    )
    
    # Category-based rates
    streaming_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=5.00, 
        help_text="Streaming services commission rate (%)"
    )
    software_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=4.00, 
        help_text="Software & tools commission rate (%)"
    )
    gaming_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=6.00, 
        help_text="Gaming commission rate (%)"
    )
    services_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=7.00, 
        help_text="Digital services commission rate (%)"
    )
    
    # Settings
    default_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=5.00, 
        help_text="Default commission rate for new vendors (%)"
    )
    min_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=3.00, 
        help_text="Minimum allowed commission rate (%)"
    )
    max_commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=15.00, 
        help_text="Maximum allowed commission rate (%)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Commission Settings"
        verbose_name_plural = "Commission Settings"
    
    def __str__(self):
        return f"Commission Settings (Platform: {self.platform_fee_rate}%, Escrow: {self.escrow_fee_rate}%)"
    
    @classmethod
    def get_settings(cls):
        """Get the current commission settings, create default if none exist"""
        settings, created = cls.objects.get_or_create(
            defaults={
                'platform_fee_rate': 5.00,
                'escrow_fee_rate': 1.00,
                'streaming_commission_rate': 5.00,
                'software_commission_rate': 4.00,
                'gaming_commission_rate': 6.00,
                'services_commission_rate': 7.00,
                'default_commission_rate': 5.00,
                'min_commission_rate': 3.00,
                'max_commission_rate': 15.00,
            }
        )
        return settings

