import os
import django
import sys

# Setup Django environment
sys.path.append('C:\\workspace\\crypto-nexus\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, PaymentAddress
from orders.models import Order
from django.utils import timezone

def check_recent_orders():
    print(f"\n=== CHECKING RECENT ORDERS AND PAYOUTS ===\n")
    
    # Get last 10 direct orders
    orders = Order.objects.filter(use_escrow=False).order_by('-created_at')[:10]
    
    for order in orders:
        print(f"Order: {order.order_id} | Status: {order.order_status} | Created: {order.created_at}")
        
        try:
            pa = PaymentAddress.objects.get(order_id=order.order_id)
            print(f"  PaymentAddress: Status={pa.status}, Confirmations={pa.confirmations}, Required={pa.required_confirmations}")
            print(f"  Received: {pa.received_amount}, Expected: {pa.expected_amount}")
        except PaymentAddress.DoesNotExist:
            print(f"  ❌ PaymentAddress NOT FOUND")
            
        try:
            dp = DirectPayment.objects.get(order=order)
            print(f"  DirectPayment: Status={dp.status}, Platform Fee={dp.platform_fee}, Net Amount={dp.net_amount}")
            print(f"  Created at: {dp.created_at}, Confirmed at: {dp.confirmed_at}")
        except DirectPayment.DoesNotExist:
            print(f"  ❌ DirectPayment NOT FOUND")
        
        print("-" * 50)

if __name__ == "__main__":
    check_recent_orders()
