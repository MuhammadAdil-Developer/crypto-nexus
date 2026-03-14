import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order, OrderStatus
from django.db.models import Sum, Q, Count

def check():
    print("--- ORDER STATS ---")
    total_orders = Order.objects.count()
    print(f"Total Orders: {total_orders}")
    
    statuses = Order.objects.values('order_status').annotate(count=Count('id'))
    for s in statuses:
        print(f"Status '{s['order_status']}': {s['count']}")
        
    active_escrow_orders = Order.objects.filter(use_escrow=True).exclude(
        order_status__in=[
            'cancelled', 'refunded', 'pending_payment', 'completed', 'expired'
        ]
    ).exclude(
        Q(order_status='confirmed') &
        (Q(payouts__status='completed') | Q(direct_payment__status='completed'))
    ).distinct()
    
    print(f"Active Escrow Orders Count: {active_escrow_orders.count()}")
    for o in active_escrow_orders:
        print(f"  [{o.order_id}] {o.crypto_currency} {o.total_amount} - Status: {o.order_status}")
    
    # IMPORTANT: .order_by() is required to clear default ordering and group correctly by crypto_currency
    totals = active_escrow_orders.values('crypto_currency').annotate(total=Sum('total_amount')).order_by()
    print(f"\nCalculated Totals: {list(totals)}")

    print("\n--- PENDING RELEASES ---")
    pending_qs = Order.objects.filter(
        order_status=OrderStatus.CONFIRMED.value, 
        use_escrow=True
    ).exclude(
        Q(payouts__status='completed') | 
        Q(direct_payment__status='completed')
    ).distinct()
    print(f"Pending Releases: {pending_qs.count()}")
    for o in pending_qs:
        print(f"  [{o.order_id}]")

    print("\n--- AUTO-RELEASE ---")
    auto_qs = Order.objects.filter(order_status=OrderStatus.DELIVERED.value, use_escrow=True)
    print(f"Auto-Release: {auto_qs.count()}")
    for o in auto_qs:
        print(f"  [{o.order_id}]")

    print("\n--- DISPUTED ---")
    disputed_qs = Order.objects.filter(order_status=OrderStatus.DISPUTED.value)
    print(f"Disputed: {disputed_qs.count()}")
    for o in disputed_qs:
        print(f"  [{o.order_id}]")

if __name__ == "__main__":
    check()
