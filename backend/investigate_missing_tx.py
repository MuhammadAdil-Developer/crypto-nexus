import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, Payout, PaymentAddress
from orders.models import Order
from django.utils import timezone
from datetime import timedelta

def investigate_missing_tx():
    print("=== INVESTIGATING MYSTERY TRANSACTION ===\n")
    
    # The mystery TX amount you mentioned
    mystery_amount = Decimal("0.00492429")
    
    print(f"Searching for amount ~{mystery_amount} BTC...")
    
    # Check all recent transactions (last 7 days)
    cutoff = timezone.now() - timedelta(days=7)
    
    # Check DirectPayments
    print("\n--- ALL DirectPayments (last 7 days) ---")
    dps = DirectPayment.objects.filter(created_at__gte=cutoff).order_by('-created_at')
    for dp in dps:
        print(f"Order: {dp.order_id}")
        print(f"  Amount: {dp.amount} {dp.crypto_currency.symbol}")
        print(f"  Amount Received: {dp.amount_received}")
        print(f"  Net: {dp.net_amount}")
        print(f"  Platform Fee: {dp.platform_fee}")
        print(f"  Status: {dp.status}")
        print(f"  TX Hash: {dp.transaction_hash}")
        print(f"  Vendor: {dp.vendor.username}")
        print(f"  Vendor Address: {dp.vendor_address}")
        print(f"  Created: {dp.created_at}")
        print()
    
    # Check Payouts
    print("\n--- ALL Payouts (last 7 days) ---")
    payouts = Payout.objects.filter(created_at__gte=cutoff).order_by('-created_at')
    for p in payouts:
        print(f"Order: {p.order_id}")
        print(f"  Type: {p.payout_type}")
        print(f"  Gross: {p.gross_amount}")
        print(f"  Net: {p.net_amount}")
        print(f"  Platform Fee: {p.platform_fee}")
        print(f"  Status: {p.status}")
        print(f"  TX Hash: {p.transaction_hash}")
        print(f"  Vendor: {p.vendor.username if p.vendor else 'N/A'}")
        print(f"  Vendor Address: {p.vendor_address}")
        print(f"  Created: {p.created_at}")
        print()
    
    # Check PaymentAddresses (incoming payments)
    print("\n--- ALL PaymentAddresses (last 7 days) ---")
    pas = PaymentAddress.objects.filter(created_at__gte=cutoff).order_by('-created_at')
    for pa in pas:
        print(f"Order: {pa.order_id}")
        print(f"  Expected: {pa.expected_amount}")
        print(f"  Received: {pa.received_amount}")
        print(f"  Status: {pa.status}")
        print(f"  TX Hash (Buyer): {pa.transaction_hash}")
        print(f"  Address: {pa.payment_address}")
        print(f"  Created: {pa.created_at}")
        print()
    
    # Check for amounts close to mystery amount (within 10%)
    print(f"\n--- Amounts close to {mystery_amount} ±10% ---")
    min_amt = mystery_amount * Decimal("0.9")
    max_amt = mystery_amount * Decimal("1.1")
    
    close_dps = DirectPayment.objects.filter(
        created_at__gte=cutoff,
        net_amount__range=(min_amt, max_amt)
    )
    for dp in close_dps:
        print(f"DirectPayment Match: Order {dp.order_id}, Net: {dp.net_amount}")
    
    close_payouts = Payout.objects.filter(
        created_at__gte=cutoff,
        net_amount__range=(min_amt, max_amt)
    )
    for p in close_payouts:
        print(f"Payout Match: Order {p.order_id}, Net: {p.net_amount}")

if __name__ == "__main__":
    investigate_missing_tx()
