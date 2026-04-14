import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.commission_models import CommissionSettings
from payments.models import AdminWithdrawal

def check_withdrawal():
    # 1. Check current sweep settings
    settings = CommissionSettings.get_settings()
    print(f"Current Auto-Sweep BTC Address in Settings: {settings.auto_sweep_btc_address}")
    
    # 2. Check for the specific withdrawal
    txid = "8cdaaf48b318d2014388708df9576ec5c3fb07e15d6f5f9fb8813be500043407"
    try:
        withdrawal = AdminWithdrawal.objects.get(transaction_hash=txid)
        print(f"Found withdrawal record for TXID: {txid}")
        print(f"Amount: {withdrawal.amount} {withdrawal.crypto_currency.symbol}")
        print(f"Destination Address in Log: {withdrawal.destination_address}")
        print(f"Date: {withdrawal.created_at}")
        print(f"Notes: {withdrawal.notes}")
        
        target_addy = "bc1qefg3avcsp8pnwkja5tmvy6ujawyw7396jsd7ld"
        if withdrawal.destination_address == target_addy:
            print(f"MATCH: The withdrawal went to the address you provided: {target_addy}")
        else:
            print(f"MISMATCH: The withdrawal went to a DIFFERENT address: {withdrawal.destination_address}")
            
    except AdminWithdrawal.DoesNotExist:
        print(f"No withdrawal record found for TXID: {txid} in the AdminWithdrawal table.")

if __name__ == "__main__":
    check_withdrawal()
