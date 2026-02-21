import os
import django
import sys
from decimal import Decimal

# Set up Django environment
sys.path.append(r'c:\ac1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.tasks import process_non_escrow_payout

order_id = 'ORD-403B5662'

print(f"Manually triggering payout for order {order_id}...")
try:
    # We call it directly (not .delay) to see logs/errors here
    result = process_non_escrow_payout(order_id, is_settled=True)
    print(f"Result: {result}")
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
