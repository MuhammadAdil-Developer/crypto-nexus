import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, Payout

print("--- Stuck Payouts Check ---")
stuck_ids = ['22003d5f-5d8f-49df-b922-d029107727b2', '4e4a5aad-7007-457c-839a-55691fb14ad9']

for pid in stuck_ids:
    try:
        dp = DirectPayment.objects.get(id=pid)
        print(f"ID: {pid}")
        print(f"  Order: {dp.order.order_id}")
        print(f"  Status: {dp.status}")
        print(f"  TX Hash: {dp.transaction_hash}")
        print(f"  Amount: {dp.amount}")
        print(f"  Net Amount: {dp.net_amount}")
        print(f"  Updated At: {dp.updated_at}")
        print(f"  Created At: {dp.created_at}")
        print("-" * 20)
    except Exception as e:
        print(f"Error finding {pid}: {e}")

print("\n--- Other Processing Payouts ---")
others = DirectPayment.objects.filter(status='processing').order_by('-created_at')[:5]
for dp in others:
    print(f"Order: {dp.order.order_id} | Status: {dp.status} | Updated: {dp.updated_at} | TX: {dp.transaction_hash}")
