import os
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment, Payout, PaymentAddress
from orders.models import Order

def investigate():
    print("Investigating huge payout...")
    
    cutoff = timezone.now() - timedelta(days=2)
    min_amount = Decimal("0.001")
    
    print(f"Checking payouts > {min_amount} BTC/XMR since {cutoff}...")
    
    # Check DirectPayments
    dps = DirectPayment.objects.filter(updated_at__gte=cutoff, amount__gte=min_amount).exclude(status='pending')
    print(f"Found {dps.count()} DirectPayments:")
    for dp in dps:
        print(f"  DP {dp.id}: Order {dp.order_id}, Amount: {dp.amount}, Net: {dp.net_amount}, Fee: {dp.platform_fee}, Status: {dp.status}, Hash: {dp.transaction_hash}, Address: {dp.vendor_address}")

    # Check Payouts
    payouts = Payout.objects.filter(updated_at__gte=cutoff, net_amount__gte=min_amount).exclude(status='pending')
    print(f"Found {payouts.count()} Payouts:")
    for p in payouts:
        print(f"  Payout {p.id}: Order {p.order_id}, Net: {p.net_amount}, Fee: {p.platform_fee}, Type: {p.payout_type}, Status: {p.status}, Hash: {p.transaction_hash}, Address: {p.vendor_address}")

    # Check if any payout matches the hash fragment d063d9d anywhere
    print("\nSearching specifically for hash fragment 'd063d9d' inside ANY transaction hash field...")
    dps_hash = DirectPayment.objects.filter(transaction_hash__contains="d063d9d")
    for dp in dps_hash:
        print(f"  MATCH DP: {dp.id}, Order: {dp.order_id}, Hash: {dp.transaction_hash}")
        
    payouts_hash = Payout.objects.filter(transaction_hash__contains="d063d9d")
    for p in payouts_hash:        
        print(f"  MATCH Payout: {p.id}, Order: {p.order_id}, Hash: {p.transaction_hash}")

    # Check PaymentAddress
    pa_hash = PaymentAddress.objects.filter(transaction_hash__contains="d063d9d")
    for pa in pa_hash:
        print(f"  MATCH PaymentAddress (Buyer Tx): Order: {pa.order_id}, Hash: {pa.transaction_hash}")

if __name__ == "__main__":
    investigate()
