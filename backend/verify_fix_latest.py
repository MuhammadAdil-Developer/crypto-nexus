import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.insert(0, '/root/crypto-nexus/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import PaymentAddress, DirectPayment
from payments.tasks import process_non_escrow_payout

ORDER_ID = 'ORD-0F24303B'

print(f"--- DIAGNOSTIC FOR {ORDER_ID} ---")

try:
    pa = PaymentAddress.objects.get(order_id=ORDER_ID)
    print(f"PaymentAddress: Status={pa.status}, Confs={pa.confirmations}, Received={pa.received_amount}, Expected={pa.expected_amount}")
except PaymentAddress.DoesNotExist:
    print("CRITICAL: PaymentAddress not found!")
    pa = None

try:
    dp = DirectPayment.objects.get(order__order_id=ORDER_ID)
    print(f"DirectPayment: Status={dp.status}, Amount={dp.amount}, Net={dp.net_amount}, Confs={dp.confirmations}")
    
    if pa and dp:
        if dp.amount == 0 and pa.received_amount > 0:
            print("!!! DETECTED 0 AMOUNT BUG !!!")
            print(f"Fixing amount: {dp.amount} -> {pa.received_amount}")
            dp.amount = pa.received_amount
            dp.save()
            print("Fixed saved.")
            
            # Re-trigger payout
            print("Triggering payout task...")
            process_non_escrow_payout.delay(ORDER_ID)
            print("Task triggered.")
        elif dp.amount > 0:
             print("Amount appears correct.")
             if dp.status != 'completed' and dp.confirmations >= 5:
                 print("Payment confirmed but not completed. Triggering payout task just in case...")
                 process_non_escrow_payout.delay(ORDER_ID)
                 print("Task triggered.")

except DirectPayment.DoesNotExist:
    print("CRITICAL: DirectPayment record NOT FOUND!")
    # Potential fix: create it if missing? 
    # For now just reporting.

print("--- END DIAGNOSTIC ---")
