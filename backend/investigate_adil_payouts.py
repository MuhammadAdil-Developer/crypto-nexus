from payments.models import Payout, DirectPayment
from users.models import User
from decimal import Decimal

def run():
    vendor = User.objects.get(username='adil123')
    print(f"Investigating for vendor: {vendor.username} ({vendor.id})")
    
    excluded_order_status = ['cancelled', 'refunded', 'disputed']
    excluded_payout_status = ['failed', 'cancelled', 'refunded']
    
    # Check Payouts (Escrow)
    payouts = Payout.objects.filter(
        vendor=vendor
    ).exclude(
        status__in=excluded_payout_status
    ).exclude(
        order__order_status__in=excluded_order_status
    )
    
    print(f"\nFound {payouts.count()} active Payout records:")
    for p in payouts:
        print(f"  - Payout {p.id} | Order: {p.order.order_id} | Status: {p.status} | Order Status: {p.order.order_status}")
        if p.status.lower() != 'completed':
            print(f"    *** This is PENDING release ***")

    # Check Direct Payments
    directs = DirectPayment.objects.filter(
        vendor=vendor
    ).exclude(
        status__in=excluded_payout_status
    ).exclude(
        order__order_status__in=excluded_order_status
    )
    
    print(f"\nFound {directs.count()} active DirectPayment records:")
    for d in directs:
        print(f"  - DirectPayment {d.id} | Order: {d.order.order_id} | Status: {d.status} | Order Status: {d.order.order_status} | Amount: {d.amount}")
        if d.status.lower() != 'completed':
            print(f"    *** This is PENDING release ***")

if __name__ == "__main__":
    run()
