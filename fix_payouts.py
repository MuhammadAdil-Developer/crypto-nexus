import os
import django
import sys
from decimal import Decimal

# Set up Django environment
sys.path.append('c:/ac1/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order, OrderStatus
from payments.models import Payout, DirectPayment

order_ids = ['ORD-58DA0BA8', 'ORD-4ABDEC43']
target_status = 'completed'

print(f"--- Fixing Payouts for orders: {order_ids} ---")

for oid in order_ids:
    order = Order.objects.filter(order_id=oid).first()
    if order:
        print(f"\nProcessing Order: {oid}")
        
        # 1. Update DirectPayment status
        dps = DirectPayment.objects.filter(order=order)
        for dp in dps:
            old_status = dp.status
            dp.status = target_status
            dp.save()
            print(f"  Updated DirectPayment {dp.id}: {old_status} -> {dp.status}")

        # 2. Update Payout status if exists
        payouts = Payout.objects.filter(order=order)
        for p in payouts:
            old_payout_status = p.status
            p.status = target_status
            if not p.processed_at:
                from django.utils import timezone
                p.processed_at = timezone.now()
                p.completed_at = timezone.now()
            p.save()
            print(f"  Updated Payout {p.id}: {old_payout_status} -> {p.status}")
        
        # 3. If no payouts exist, maybe create one? 
        # But generally for direct payments, DirectPayment record is the main tracker for the vendor.
        # If user wants them "marked as complete", DirectPayment status is high priority.

        # 4. Update Order status to indicate payment is done
        # Usually from pending_payment -> paying/paid/processing
        if order.order_status in ['pending', 'pending_payment']:
            old_order_status = order.order_status
            order.order_status = OrderStatus.PAID.value
            order.payment_status = 'paid'
            order.save()
            print(f"  Updated Order {oid} Status: {old_order_status} -> {order.order_status}")
    else:
        print(f"Order {oid} not found")

print("\n--- Done ---")
