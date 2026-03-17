from orders.models import Order
from django.db.models import Q
from orders.models import OrderStatus

order_id = "ORD-ABE18B3A"
try:
    order = Order.objects.get(order_id=order_id)
    print(f"Order: {order.order_id}")
    print(f"Status: {order.order_status}")
    print(f"Use Escrow: {order.use_escrow}")
    
    payouts = order.payouts.all()
    print(f"Payouts count: {payouts.count()}")
    for p in payouts:
        print(f"  - Payout ID: {p.id}, Status: {p.status}, Type: {p.payout_type}")
        
    direct_payments = getattr(order, 'direct_payment', None)
    if direct_payments:
        print(f"Direct Payment: Status: {direct_payments.status}")
    else:
        print("No Direct Payment")

    # Check the query logic
    pending_qs = Order.objects.filter(
        order_id=order_id,
        order_status=OrderStatus.CONFIRMED.value, 
        use_escrow=True
    ).exclude(
        Q(payouts__status__in=['completed', 'cancelled', 'failed']) | 
        Q(direct_payment__status__in=['completed', 'cancelled', 'failed'])
    )
    
    print(f"Is in pending_qs? {pending_qs.exists()}")

except Exception as e:
    print(f"Error: {e}")
