import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('C:\\workspace\\crypto-nexus\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import Payout, DirectPayment, PaymentAddress
from orders.models import Order

def check_fees():
    print(f"\n=== CHECKING FEES ON RECENT ORDERS ===\n")
    
    orders = Order.objects.all().order_by('-created_at')[:5]
    
    for order in orders:
        print(f"Order: {order.order_id} | Status: {order.order_status} | Escrow: {order.use_escrow}")
        
        try:
            pa = PaymentAddress.objects.get(order_id=order.order_id)
            print(f"  PaymentAddress: Received={pa.received_amount}, Status={pa.status}")
        except:
            print(f"  ❌ No PaymentAddress")

        # Check Payout (Escrow)
        payouts = Payout.objects.filter(order=order)
        for p in payouts:
            print(f"  Payout ({p.payout_type}): Status={p.status}")
            print(f"    Gross: {p.gross_amount}")
            print(f"    Platform Fee: {p.platform_fee}")
            print(f"    Escrow Fee: {p.escrow_fee}")
            print(f"    Net Amount: {p.net_amount}")
            if p.gross_amount > 0:
                print(f"    Total Fee %: {((p.gross_amount - p.net_amount) / p.gross_amount) * 100}%")

        # Check DirectPayment (Non-Escrow)
        try:
            dp = DirectPayment.objects.get(order=order)
            print(f"  DirectPayment: Status={dp.status}")
            print(f"    Amount: {dp.amount}")
            print(f"    Platform Fee: {dp.platform_fee}")
            print(f"    Net Amount: {dp.net_amount}")
            if dp.amount > 0:
                print(f"    Fee %: {((dp.amount - dp.net_amount) / dp.amount) * 100}%")
        except DirectPayment.DoesNotExist:
            pass
            
        print("-" * 50)

if __name__ == "__main__":
    check_fees()
