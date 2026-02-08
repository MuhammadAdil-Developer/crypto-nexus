import os
import django
import sys
from decimal import Decimal

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
sys.path.append(os.path.join(os.getcwd(), 'backend'))
django.setup()

from payments.models import DirectPayment, Payout
from orders.models import Order

def investigate_zeros():
    print("Investigating Confirmed/Completed DirectPayment records with zero fees/net...")
    
    # Get direct payments with zero platform fee and net amount but positive amount
    zeros = DirectPayment.objects.filter(
        status__in=['confirmed', 'completed', 'paid'],
        platform_fee=0, 
        net_amount=0, 
        amount__gt=0
    ).select_related('order', 'vendor', 'crypto_currency')
    
    print(f"Found {zeros.count()} confirmed/paid records with zeros.")
    
    for dp in zeros[:20]:
        print(f"\nOrder: {dp.order.order_id}")
        print(f"  Vendor: {dp.vendor.username}")
        print(f"  Status: {dp.status}")
        print(f"  Amount (Expected): {dp.amount}")
        print(f"  Amount Received: {dp.amount_received}")
        print(f"  Platform Fee: {dp.platform_fee}")
        print(f"  Net Amount: {dp.net_amount}")
        print(f"  Currency: {dp.crypto_currency.symbol} (ID: {dp.crypto_currency.id})")
        
        # Check if there is a Payout record for this order
        payouts = Payout.objects.filter(order=dp.order)
        if payouts.exists():
            print(f"  WARNING: Found {payouts.count()} Payout records for this order!")
            for p in payouts:
                print(f"    Payout ID: {p.id}, Status: {p.status}, Gross: {p.gross_amount}, Fee: {p.platform_fee}, Net: {p.net_amount}")
        else:
            print("  No Payout record found.")

if __name__ == "__main__":
    investigate_zeros()
