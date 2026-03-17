from django.db.models import Q
from orders.models import Order
from payments.models import Payout, DirectPayment, EscrowPayment, PaymentAddress
import json

def debug_order(order_id):
    print(f"--- Debugging {order_id} ---")
    order = Order.objects.filter(order_id=order_id).first()
    if not order:
        print("Order not found in DB.")
        return

    print(f"Order ID: {order.order_id}")
    print(f"Status: {order.order_status}")
    print(f"Use Escrow: {order.use_escrow}")
    
    # Check related Payouts
    payouts = Payout.objects.filter(Q(order=order) | Q(order__order_id=order_id))
    print(f"Payouts Count: {payouts.count()}")
    for p in payouts:
        print(f"  - Payout ID: {p.id}, Status: {p.status}, Type: {p.payout_type}")

    # Check related DirectPayments
    dps = DirectPayment.objects.filter(order=order)
    print(f"DirectPayments Count: {dps.count()}")
    for d in dps:
        print(f"  - DP ID: {d.id}, Status: {d.status}")

    # Check related EscrowPayments
    eps = EscrowPayment.objects.filter(order=order)
    print(f"EscrowPayments Count: {eps.count()}")
    for e in eps:
        print(f"  - EP ID: {e.id}, Status: {e.status}")

    # Check PaymentAddresses
    pas = PaymentAddress.objects.filter(order_id=order_id)
    print(f"PaymentAddresses Count: {pas.count()}")
    for pa in pas:
        print(f"  - PA ID: {pa.id}, Status: {pa.status}, Addr: {pa.payment_address}")
        # Check Escrows via PaymentAddress
        ep_pa = EscrowPayment.objects.filter(payment_address=pa)
        for e in ep_pa:
             print(f"    - EP via PA ID: {e.id}, Status: {e.status}")

    # Global search for string in payouts
    print("--- Global Search in Payouts ---")
    all_bad = Payout.objects.filter(Q(admin_notes__icontains=order_id))
    for p in all_bad:
        print(f"  - Found in Admin Notes: Payout ID {p.id}, Status {p.status}")

debug_order("ORD-ABE18B3A")
