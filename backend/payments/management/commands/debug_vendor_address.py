from django.core.management.base import BaseCommand
from vendors.models import VendorApplication
from users.models import User
from payments.models import Payout
from orders.models import Order
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Debug vendor address lookup issue'

    def add_arguments(self, parser):
        parser.add_argument('--vendor', type=str, help='Vendor username to debug')

    def handle(self, *args, **options):
        vendor_username = options.get('vendor', 'crypto_buyer')
        
        self.stdout.write(f"=== Debugging vendor address for: {vendor_username} ===")
        
        try:
            # Check vendor application
            vendor_app = VendorApplication.objects.get(vendor_username=vendor_username)
            self.stdout.write(f"✅ Found vendor application:")
            self.stdout.write(f"   Business Name: {vendor_app.business_name}")
            self.stdout.write(f"   BTC Address: {vendor_app.btc_address}")
            self.stdout.write(f"   XMR Address: {vendor_app.xmr_address}")
            
            # Check user
            user = User.objects.get(username=vendor_username)
            self.stdout.write(f"✅ Found user: {user.username} (type: {user.user_type})")
            
            # Check recent payouts for this vendor
            payouts = Payout.objects.filter(vendor=user)
            self.stdout.write(f"✅ Found {payouts.count()} payouts for this vendor:")
            
            for payout in payouts[:3]:
                self.stdout.write(f"   Payout ID: {payout.id}")
                self.stdout.write(f"   Vendor Address: {payout.vendor_address}")
                self.stdout.write(f"   Crypto: {payout.crypto_currency.symbol}")
                self.stdout.write(f"   Amount: {payout.net_amount}")
                self.stdout.write("   ---")
            
            # Check if there's a mismatch
            if vendor_app.btc_address and payouts.exists():
                latest_payout = payouts.first()
                if latest_payout.vendor_address != vendor_app.btc_address:
                    self.stdout.write(self.style.WARNING(f"⚠️  MISMATCH DETECTED!"))
                    self.stdout.write(f"   Vendor App BTC: {vendor_app.btc_address}")
                    self.stdout.write(f"   Payout Address: {latest_payout.vendor_address}")
                else:
                    self.stdout.write(self.style.SUCCESS("✅ Addresses match!"))
                    
        except VendorApplication.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Vendor application not found for: {vendor_username}"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ User not found: {vendor_username}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
