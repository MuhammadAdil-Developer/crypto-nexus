from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from vendors.models import VendorApplication

User = get_user_model()


class Command(BaseCommand):
    help = 'Test vendor address update functionality'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Vendor username to test')
        parser.add_argument('--btc-address', type=str, help='BTC address to set')
        parser.add_argument('--xmr-address', type=str, help='XMR address to set')

    def handle(self, *args, **options):
        username = options['username']
        btc_address = options.get('btc_address', '')
        xmr_address = options.get('xmr_address', '')
        
        if not username:
            self.stdout.write("Usage:")
            self.stdout.write("  python manage.py test_vendor_address_update --username vendor123 --btc-address bc1q... --xmr-address 4...")
            return
        
        try:
            # Get or create user
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'user_type': 'vendor',
                    'is_verified': True
                }
            )
            
            if created:
                self.stdout.write(f"Created user: {username}")
            else:
                self.stdout.write(f"Found user: {username}")
            
            # Get or create vendor application
            vendor_app, created = VendorApplication.objects.get_or_create(
                vendor_username=username,
                defaults={
                    'business_name': username,
                    'vendor_username': username,
                    'status': 'approved'
                }
            )
            
            if created:
                self.stdout.write(f"Created vendor application for: {username}")
            else:
                self.stdout.write(f"Found vendor application for: {username}")
            
            # Update addresses
            if btc_address:
                vendor_app.btc_address = btc_address
                self.stdout.write(f"Set BTC address: {btc_address}")
            
            if xmr_address:
                vendor_app.xmr_address = xmr_address
                self.stdout.write(f"Set XMR address: {xmr_address}")
            
            vendor_app.save()
            
            self.stdout.write(
                self.style.SUCCESS(f"✅ Vendor addresses updated successfully!")
            )
            
            # Show current addresses
            self.stdout.write(f"\nCurrent addresses for {username}:")
            self.stdout.write(f"  BTC: {vendor_app.btc_address or 'Not set'}")
            self.stdout.write(f"  XMR: {vendor_app.xmr_address or 'Not set'}")
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Error: {str(e)}")
            )
