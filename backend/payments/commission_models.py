from django.db import models
from django.conf import settings
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
    
    # Auto-sweep configuration (Cold Storage / Profit Forwarding)
    auto_sweep_enabled = models.BooleanField(
        default=False, 
        help_text="Automatically forward platform profits to personal wallets"
    )
    auto_sweep_btc_address = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Personal BTC address for auto-sweep"
    )
    auto_sweep_xmr_address = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Personal XMR address for auto-sweep"
    )
    auto_sweep_time = models.TimeField(
        default="17:00", 
        help_text="Daily time to perform the sweep (Local time)"
    )
    auto_sweep_whatsapp_number = models.CharField(
        max_length=20, 
        default="+923188802535", 
        help_text="WhatsApp number for notifications"
    )
    auto_sweep_min_buffer = models.DecimalField(
        max_digits=20, 
        decimal_places=8, 
        default=0.00005, 
        help_text="Minimum BTC buffer to keep in hot wallet for fees"
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
        """Get the current commission settings, create default if none exist. 
        Uses a constant UUID to ensure only one record ever exists."""
        SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
        settings, created = cls.objects.get_or_create(
            id=SETTINGS_ID,
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


class VendorFee(models.Model):
    """Vendor-specific commission fee overrides"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vendor_fee',
        limit_choices_to={'user_type': 'vendor'}
    )
    
    # Custom commission rate for this vendor (overrides default)
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Custom commission rate (%) for this vendor. If null, uses default platform rate."
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_vendor_fees',
        limit_choices_to={'user_type': 'admin'}
    )
    
    class Meta:
        verbose_name = "Vendor Fee"
        verbose_name_plural = "Vendor Fees"
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Vendor Fee for {self.vendor.username}: {self.commission_rate}%" if self.commission_rate else f"Vendor Fee for {self.vendor.username}: Default"
    
    @classmethod
    def get_vendor_fee(cls, vendor):
        """Get vendor-specific fee or return None to use default"""
        try:
            vendor_fee = cls.objects.get(vendor=vendor)
            return vendor_fee.commission_rate
        except cls.DoesNotExist:
            return None

