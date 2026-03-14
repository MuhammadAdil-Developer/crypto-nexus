import os
import sys
import django
from django.utils import timezone

backend_path = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order
from payments.models import Payout, DirectPayment

order_ids = ['ORD-836A09AA', 'ORD-762B87E0']

for order_id in order_ids:
    print(f"\nProcessing {order_id}...")
    try:
        order = Order.objects.get(order_id=order_id)
        
        # Check Payout model
        payouts = Payout.objects.filter(order=order)
        for payout in payouts:
            old_status = payout.status
            payout.status = 'completed'
            if not getattr(payout, 'processed_at', None):
                try: payout.processed_at = timezone.now()
                except: pass
            payout.save()
            print(f"  ✅ Updated Payout {payout.id}: {old_status} -> {payout.status}")
            
        # Check DirectPayment model
        direct_payments = DirectPayment.objects.filter(order=order)
        for dp in direct_payments:
            old_status = dp.status
            dp.status = 'completed'
            if not dp.confirmed_at:
                dp.confirmed_at = timezone.now()
            dp.save()
            print(f"  ✅ Updated DirectPayment {dp.id}: {old_status} -> {dp.status}")
            
        if not payouts.exists() and not direct_payments.exists():
            print(f"  ⚠️ No Payout or DirectPayment records found for order {order_id}")
            
    except Order.DoesNotExist:
        print(f"  ❌ Order {order_id} not found.")
    except Exception as e:
        print(f"  ❌ Error processing {order_id}: {e}")

print("\nDone.")
