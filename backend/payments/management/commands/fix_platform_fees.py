"""
Management command to fix pending direct payments with zero platform fee
"""
from django.core.management.base import BaseCommand
from payments.models import DirectPayment
from payments.commission_models import CommissionSettings, VendorFee
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix pending direct payments with zero platform fee'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== FIXING PENDING DIRECT PAYMENTS ===\n'))
        
        # Get commission settings
        settings = CommissionSettings.get_settings()
        
        # Find all pending/confirmed direct payments with platform_fee = 0
        payments_to_fix = DirectPayment.objects.filter(
            platform_fee=0,
            status__in=['pending', 'confirmed']
        ).select_related('order', 'vendor', 'crypto_currency')
        
        self.stdout.write(f"Found {payments_to_fix.count()} payments with platform_fee = 0")
        
        fixed_count = 0
        for dp in payments_to_fix:
            try:
                # Get vendor-specific rate or use default
                vendor_custom_rate = VendorFee.get_vendor_fee(dp.vendor)
                if vendor_custom_rate is not None:
                    platform_fee_rate = vendor_custom_rate / Decimal('100')
                    rate_display = f"{vendor_custom_rate}% (vendor-specific)"
                else:
                    platform_fee_rate = settings.platform_fee_rate / Decimal('100')
                    rate_display = f"{settings.platform_fee_rate}% (platform default)"
                
                # Calculate fees
                platform_fee = dp.amount * platform_fee_rate
                escrow_fee = Decimal('0')  # Direct payments don't have escrow fee
                net_amount = dp.amount - platform_fee - escrow_fee
                
                self.stdout.write(f"\nOrder: {dp.order.order_id}")
                self.stdout.write(f"  Vendor: {dp.vendor.username}")
                self.stdout.write(f"  Amount: {dp.amount} {dp.crypto_currency.symbol}")
                self.stdout.write(f"  Rate: {rate_display}")
                self.stdout.write(f"  OLD: platform_fee={dp.platform_fee}, net_amount={dp.net_amount}")
                self.stdout.write(f"  NEW: platform_fee={platform_fee}, net_amount={net_amount}")
                
                # Update
                dp.platform_fee = platform_fee
                dp.escrow_fee = escrow_fee
                dp.net_amount = net_amount
                dp.save()
                
                self.stdout.write(self.style.SUCCESS(f"  ✅ FIXED"))
                fixed_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ❌ ERROR: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f'\n=== SUMMARY ==='))
        self.stdout.write(self.style.SUCCESS(f'Fixed {fixed_count} payments'))
        self.stdout.write(self.style.SUCCESS(f'\n=== DONE ===\n'))
