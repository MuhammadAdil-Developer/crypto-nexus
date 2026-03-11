
import os
import django
import sys
from decimal import Decimal

# Set up Django environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.services import BTCPayServerService, MoneroRPCService

def check_balances():
    print("Checking BTCPay Balance...")
    try:
        btc = BTCPayServerService()
        btc_balance = btc.get_wallet_balance()
        print(f"BTC Balance Response: {btc_balance}")
    except Exception as e:
        print(f"Error checking BTC: {e}")

    print("\nChecking Monero Balance...")
    try:
        xmr = MoneroRPCService()
        xmr_balance = xmr.get_balance()
        print(f"XMR Balance Response: {xmr_balance}")
    except Exception as e:
        print(f"Error checking XMR: {e}")

if __name__ == "__main__":
    check_balances()
