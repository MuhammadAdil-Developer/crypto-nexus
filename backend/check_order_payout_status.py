import os
import sys
import django

backend_path = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, Payout, EscrowPayment, PaymentAddress
from orders.models import Order

order_id = 'ORD-A4D82795'

try:
    order = Order.objects.get(order_id=order_id)
    print(f"Order: {order_id}")
    print(f"  Payment Status: {order.payment_status}")
    print(f"  Order Status: {order.order_status}")
    print(f"  Use Escrow: {getattr(order, 'use_escrow', 'N/A')}")
    
    # Check DirectPayment
    dp = DirectPayment.objects.filter(order=order).first()
    if dp:
        print(f"DirectPayment:")
        print(f"  Status: {dp.status}")
        print(f"  TX Hash: {dp.transaction_hash}")
    else:
        print("DirectPayment: Not found")
        
    # Check Payouts
    payouts = Payout.objects.filter(order=order)
    if payouts.exists():
        print("Payouts:")
        for po in payouts:
            print(f"  Type: {po.payout_type}, Status: {po.status}, TX: {po.transaction_hash}")
    else:
        print("Payouts: Not found")
        
    # Check Escrow
    if hasattr(order, 'escrow_payment'):
        escrow = order.escrow_payment
        print(f"EscrowPayment:")
        print(f"  Status: {escrow.status}")
    else:
        # Try finding by payment address link
        pa = PaymentAddress.objects.filter(order_id=order_id).first()
        if pa:
            escrow = EscrowPayment.objects.filter(payment_address=pa).first()
            if escrow:
                print(f"EscrowPayment (found via PaymentAddress):")
                print(f"  Status: {escrow.status}")
            else:
                print("EscrowPayment: Not found")
        else:
            print("EscrowPayment: No PaymentAddress found")

except Order.DoesNotExist:
    print(f"Order {order_id} not found.")
except Exception as e:
    print(f"Error: {e}")
