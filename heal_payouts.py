import os
import sys
import django
from django.utils import timezone

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment

print("--- HEALING STUCK PAYOUTS ---")

# Targeted healing for payouts with hashes that are stuck
stuck_payouts = DirectPayment.objects.filter(
    status__in=['processing', 'confirmed'],
    transaction_hash__isnull=False
).exclude(transaction_hash='')

count = 0
for dp in stuck_payouts:
    print(f"Healing Order {dp.order.order_id} (Current status: {dp.status}, Hash: {dp.transaction_hash[:10]}...)")
    dp.status = 'completed'
    dp.updated_at = timezone.now()
    dp.save(update_fields=['status', 'updated_at'])
    count += 1

print(f"\n✅ Total payouts healed: {count}")
