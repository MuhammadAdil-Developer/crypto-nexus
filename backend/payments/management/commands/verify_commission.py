"""
Management command to verify and fix commission settings
"""
from django.core.management.base import BaseCommand
from payments.commission_models import CommissionSettings, VendorFee
from payments.models import DirectPayment
from orders.models import Order
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Verify commission settings and check recent payments for platform fee deduction'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== COMMISSION SETTINGS VERIFICATION ===\n'))
        
        # 1. Check CommissionSettings
        settings = CommissionSettings.get_settings()
        self.stdout.write(f"Platform Fee Rate: {settings.platform_fee_rate}%")
        self.stdout.write(f"Escrow Fee Rate: {settings.escrow_fee_rate}%")
        self.stdout.write(f"Default Commission Rate: {settings.default_commission_rate}%")
        self.stdout.write(f"Min Commission Rate: {settings.min_commission_rate}%")
        self.stdout.write(f"Max Commission Rate: {settings.max_commission_rate}%")
        
        # Check if platform_fee_rate is 0 (THIS IS THE PROBLEM!)
        if settings.platform_fee_rate == 0:
            self.stdout.write(self.style.ERROR('\n❌ CRITICAL: Platform fee rate is 0%!'))
            self.stdout.write(self.style.WARNING('Fixing: Setting platform_fee_rate to 5%...'))
            settings.platform_fee_rate = Decimal('5.00')
            settings.save()
            self.stdout.write(self.style.SUCCESS('✅ Fixed: Platform fee rate set to 5%'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Platform fee rate is properly set: {settings.platform_fee_rate}%'))
        
        # 2. Check VendorFee overrides
        self.stdout.write(self.style.SUCCESS('\n=== VENDOR FEE OVERRIDES ===\n'))
        vendor_fees = VendorFee.objects.all()
        if vendor_fees.exists():
            for vf in vendor_fees:
                rate = vf.commission_rate if vf.commission_rate else settings.platform_fee_rate
                self.stdout.write(f"Vendor: {vf.vendor.username} - Rate: {rate}%")
        else:
            self.stdout.write("No vendor-specific fee overrides found (using default platform rate)")
        
        # 3. Check recent DirectPayments
        self.stdout.write(self.style.SUCCESS('\n=== RECENT DIRECT PAYMENTS (Last 10) ===\n'))
        recent_payments = DirectPayment.objects.select_related('order', 'vendor').order_by('-created_at')[:10]
        
        issues_found = 0
        for dp in recent_payments:
            self.stdout.write(f"\nOrder: {dp.order.order_id}")
            self.stdout.write(f"  Vendor: {dp.vendor.username}")
            self.stdout.write(f"  Amount (received): {dp.amount} {dp.crypto_currency.symbol}")
            self.stdout.write(f"  Platform Fee: {dp.platform_fee} {dp.crypto_currency.symbol}")
            self.stdout.write(f"  Escrow Fee: {dp.escrow_fee} {dp.crypto_currency.symbol}")
            self.stdout.write(f"  Net Amount: {dp.net_amount} {dp.crypto_currency.symbol}")
            self.stdout.write(f"  Status: {dp.status}")
            
            # Verify platform fee was calculated
            if dp.platform_fee == 0:
                self.stdout.write(self.style.ERROR(f"  ❌ ISSUE: Platform fee is 0! Should be ~{dp.amount * settings.platform_fee_rate / 100}"))
                issues_found += 1
                
                # Calculate what it should be
                vendor_custom_rate = VendorFee.get_vendor_fee(dp.vendor)
                if vendor_custom_rate is not None:
                    platform_fee_rate = vendor_custom_rate / Decimal('100')
                else:
                    platform_fee_rate = settings.platform_fee_rate / Decimal('100')
                
                expected_platform_fee = dp.amount * platform_fee_rate
                expected_net = dp.amount - expected_platform_fee - dp.escrow_fee
                
                self.stdout.write(self.style.WARNING(f"  Expected platform fee: {expected_platform_fee} {dp.crypto_currency.symbol}"))
                self.stdout.write(self.style.WARNING(f"  Expected net amount: {expected_net} {dp.crypto_currency.symbol}"))
                
                # Ask if we should fix it
                if dp.status == 'pending':
                    self.stdout.write(self.style.WARNING(f"  This payment is PENDING - we can fix it before sending!"))
                    fix = input("  Fix this payment? (yes/no): ")
                    if fix.lower() == 'yes':
                        dp.platform_fee = expected_platform_fee
                        dp.net_amount = expected_net
                        dp.save()
                        self.stdout.write(self.style.SUCCESS(f"  ✅ FIXED: Updated platform_fee to {expected_platform_fee}"))
            else:
                # Verify calculation is correct
                expected_net = dp.amount - dp.platform_fee - dp.escrow_fee
                if abs(dp.net_amount - expected_net) > Decimal('0.00000001'):
                    self.stdout.write(self.style.ERROR(f"  ❌ ISSUE: net_amount calculation is wrong!"))
                    self.stdout.write(self.style.ERROR(f"     Current: {dp.net_amount}, Expected: {expected_net}"))
                    issues_found += 1
                else:
                    self.stdout.write(self.style.SUCCESS(f"  ✅ Platform fee correctly deducted"))
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== SUMMARY ===\n'))
        if issues_found == 0:
            self.stdout.write(self.style.SUCCESS('✅ All payments have platform fee correctly deducted!'))
        else:
            self.stdout.write(self.style.ERROR(f'❌ Found {issues_found} payments with issues'))
            self.stdout.write(self.style.WARNING('Run this command again to fix pending payments'))
        
        self.stdout.write(self.style.SUCCESS('\n=== VERIFICATION COMPLETE ===\n'))
