import os
import sys
import django
from django.utils import timezone

backend_path = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment
from orders.models import Order

order_id = 'ORD-0AE8D555'

try:
    order = Order.objects.get(order_id=order_id)
    dp = DirectPayment.objects.filter(order=order).first()
    
    if dp:
        crypto = dp.crypto_currency.symbol.lower()
        # Create a manual payout hash to satisfy idempotency guards
        manual_hash = f"{crypto}_payout_manual_fix_{timezone.now().strftime('%Y%m%d%H%M%S')}"
        
        print(f"Force updating {order_id}:")
        print(f"  Old Status: {dp.status}")
        print(f"  Old Hash: {dp.transaction_hash}")
        
        dp.status = 'completed'
        dp.transaction_hash = manual_hash
        dp.confirmed_at = dp.confirmed_at or timezone.now()
        dp.updated_at = timezone.now()
        dp.save()
        
        print(f"  New Status: {dp.status}")
        print(f"  New Hash: {dp.transaction_hash}")
        print(f"  ✅ Order {order_id} successfully forced to completed.")
    else:
        print(f"  ⚠️ No DirectPayment record found for {order_id}")

except Order.DoesNotExist:
    print(f"  ❌ Order {order_id} not found.")
except Exception as e:
    print(f"  ❌ Error: {e}")
