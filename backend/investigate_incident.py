import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, Payout, PaymentAddress, PaymentWebhook
from orders.models import Order

def investigate():
    tx_fragment = "d063d9d"
    amount_btc = Decimal("0.00492429")
    
    print(f"Searching for transaction hash starting with {tx_fragment}...")
    
    # Check DirectPayment
    dps = DirectPayment.objects.filter(transaction_hash__startswith=tx_fragment)
    if dps.exists():
        print(f"Found {dps.count()} DirectPayment records:")
        for dp in dps:
            print(f"  - ID: {dp.id}, Order: {dp.order_id}, Amount: {dp.amount}, Net: {dp.net_amount}, Status: {dp.status}, Vendor: {dp.vendor.username}, Address: {dp.vendor_address}")

    # Check Payout
    payouts = Payout.objects.filter(transaction_hash__startswith=tx_fragment)
    if payouts.exists():
        print(f"Found {payouts.count()} Payout records:")
        for p in payouts:
            print(f"  - ID: {p.id}, Order: {p.order_id}, Amount: {p.net_amount}, Status: {p.status}, Vendor: {p.vendor.username}, Address: {p.vendor_address}, Type: {p.payout_type}")

    # Check PaymentAddress (incoming)
    addrs = PaymentAddress.objects.filter(transaction_hash__startswith=tx_fragment)
    if addrs.exists():
        print(f"Found {addrs.count()} PaymentAddress records (Incoming):")
        for a in addrs:
            print(f"  - Order: {a.order_id}, Amount: {a.received_amount}, Status: {a.status}")

    print("-" * 30)
    print(f"Searching for amount {amount_btc} (approx)...")
    
    # Range search for amount to account for fees or minor differences
    min_amount = amount_btc * Decimal("0.99")
    max_amount = amount_btc * Decimal("1.01")

    payouts_by_amount = Payout.objects.filter(net_amount__range=(min_amount, max_amount))
    for p in payouts_by_amount:
         print(f"  Payout Match: ID: {p.id}, Order: {p.order_id}, Amount: {p.net_amount}, Hash: {p.transaction_hash}")

    dps_by_amount = DirectPayment.objects.filter(net_amount__range=(min_amount, max_amount))
    for dp in dps_by_amount:
         print(f"  DirectPayment Match: ID: {dp.id}, Order: {dp.order_id}, Amount: {dp.net_amount}, Hash: {dp.transaction_hash}")

    print("-" * 30)
    print("Checking recent payouts (last 5 created)...")
    recent_payouts = Payout.objects.order_by('-created_at')[:5]
    for p in recent_payouts:
        print(f"  - {p.created_at}: ID: {p.id}, Order: {p.order_id}, Amount: {p.net_amount}, Type: {p.payout_type}, Status: {p.status}, Hash: {p.transaction_hash}")

if __name__ == "__main__":
    investigate()
