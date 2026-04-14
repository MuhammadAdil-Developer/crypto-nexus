import os
import django
import sys
from decimal import Decimal

# Set up Django environment
sys.path.append(r'c:\ac1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order
from payments.commission_models import VendorFee, CommissionSettings

order_id = 'ORD-403B5662'

try:
    order = Order.objects.get(order_id=order_id)
    vendor = order.vendor
    print(f"Vendor: {vendor.username}")
    
    custom_fee = VendorFee.get_vendor_fee(vendor)
    print(f"Custom Fee for Vendor: {custom_fee}")
    
    settings = CommissionSettings.get_settings()
    print(f"Default Platform Fee: {settings.platform_fee_rate}%")
    
except Exception as e:
    print(f"Error: {e}")
