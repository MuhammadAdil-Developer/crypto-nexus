"""
Manual trigger script for processing non-escrow payouts
Run this after payment is confirmed to send funds to vendor

Usage:
    python trigger_payout.py ORD-XXXXX
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.tasks import process_non_escrow_payout

if len(sys.argv) < 2:
    print("Usage: python trigger_payout.py ORDER_ID")
    print("Example: python trigger_payout.py ORD-E0016E8A")
    sys.exit(1)

order_id = sys.argv[1]
print(f"Triggering payout for order: {order_id}")

# Trigger the payout task
result = process_non_escrow_payout.delay(order_id)
print(f"Task triggered: {result.id}")
print("Check Celery logs for processing status")
