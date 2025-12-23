"""
Direct test of payout with proper settings loaded
"""
import os
import sys
import django

# Setup Django with proper path
backend_path = r'c:\workspace\crypto-nexus\backend'
sys.path.insert(0, backend_path)
os.chdir(backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')

# Initialize Django
django.setup()

# Now test payout
from payments.tasks import process_non_escrow_payout
from django.conf import settings

print("=== SETTINGS CHECK ===")
print(f"BTCPAY_SERVER_URL: {settings.BTCPAY_SERVER_URL}")
print(f"BTCPAY_STORE_ID: {settings.BTCPAY_STORE_ID}")
print(f"BTCPAY_API_KEY: {settings.BTCPAY_API_KEY[:20]}...")
print("=====================\n")

# Test payout
order_id = input("Enter Order ID (e.g., ORD-73C10EF4): ").strip()
if order_id:
    print(f"\nProcessing payout for: {order_id}")
    result = process_non_escrow_payout(order_id)
    print(f"\nResult: {result}")
else:
    print("No order ID provided")
