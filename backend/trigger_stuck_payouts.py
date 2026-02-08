import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('C:\\workspace\\crypto-nexus\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, PaymentAddress
from orders.models import Order
from payments.tasks import process_non_escrow_payout

def fix_and_payout():
    print(f"\n=== FIXING STUCK PAYOUTS ===\n")
    
    # Target orders that are 'paid' but DirectPayment is still 'confirmed' (stuck)
    stuck_orders = Order.objects.filter(
        order_status='paid', 
        use_escrow=False
    )
    
    fixed_count = 0
    for order in stuck_orders:
        try:
            dp = DirectPayment.objects.get(order=order)
            if dp.status == 'confirmed':
                print(f"Order {order.order_id}: Stuck in 'confirmed' status.")
                
                # 1. Update PaymentAddress confirmation to 3 (Required)
                try:
                    pa = PaymentAddress.objects.get(order_id=order.order_id)
                    pa.confirmations = 3
                    pa.save()
                    print(f"  ✅ Updated PaymentAddress confirmations to 3")
                except PaymentAddress.DoesNotExist:
                    print(f"  ⚠️ PaymentAddress not found for {order.order_id}")
                    continue
                
                # 2. Trigger payout task
                print(f"  🚀 Triggering process_non_escrow_payout for {order.order_id}...")
                process_non_escrow_payout.delay(order.order_id)
                fixed_count += 1
        except DirectPayment.DoesNotExist:
            continue

    print(f"\n=== SUMMARY ===")
    print(f"Fixed and triggered {fixed_count} payouts.")

if __name__ == "__main__":
    fix_and_payout()
