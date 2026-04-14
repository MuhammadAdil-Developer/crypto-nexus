import os
import django
import sys

# Set up Django environment
sys.path.append('c:/ac1/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order
from payments.models import Payout, DirectPayment

order_ids = ['ORD-58DA0BA8', 'ORD-4ABDEC43']
screenshot_ids = ['48692709-26f5-4fe0-ac1b-e291eff5afa7', '2e7e0a6d-8117-48d6-9338-be8170e3451c']

print("--- Checking Orders ---")
for oid in order_ids:
    order = Order.objects.filter(order_id=oid).first()
    if order:
        print(f"Found Order: {oid} (ID: {order.id})")
        payouts = Payout.objects.filter(order=order)
        for p in payouts:
            print(f"  Payout ID: {p.id}, Status: {p.status}")
        
        dps = DirectPayment.objects.filter(order=order)
        for dp in dps:
            print(f"  DirectPayment ID: {dp.id}, Status: {dp.status}")
    else:
        print(f"Order {oid} not found")

print("\n--- Checking Screenshot IDs ---")
for sid in screenshot_ids:
    p = Payout.objects.filter(id=sid).first()
    if p:
        print(f"Found Payout {sid} (Status: {p.status})")
    
    dp = DirectPayment.objects.filter(id=sid).first()
    if dp:
        print(f"Found DirectPayment {sid} (Status: {dp.status})")
