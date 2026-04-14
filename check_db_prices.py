import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cryptonexus.settings")
django.setup()

from shared.models import CryptoCurrency

def check_db_prices():
    print("--- Database Crypto Prices ---")
    cryptos = CryptoCurrency.objects.all()
    print(f"{'Symbol':<10} | {'Price':<20} | {'Updated At'}")
    print("-" * 50)
    for c in cryptos:
        print(f"{c.symbol:<10} | {c.current_price:<20.8f} | {c.updated_at}")

if __name__ == "__main__":
    check_db_prices()
