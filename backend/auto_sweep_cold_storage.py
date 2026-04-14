"""
HOT WALLET AUTO-SWEEP SYSTEM
Automatically transfer excess funds to cold storage
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from decimal import Decimal
from payments.services import BTCPayServerService
from django.conf import settings

# CONFIGURATION
HOT_WALLET_MAX_BALANCE = Decimal('0.05')  # Keep max 0.05 BTC in hot wallet
COLD_WALLET_ADDRESS = "YOUR_COLD_WALLET_ADDRESS_HERE"  # Set this!
MIN_SWEEP_AMOUNT = Decimal('0.01')  # Only sweep if excess > 0.01 BTC


def auto_sweep_to_cold_storage():
    """
    Check hot wallet balance and sweep excess to cold storage
    """
    print("=" * 80)
    print("AUTO-SWEEP TO COLD STORAGE")
    print("=" * 80)
    
    try:
        btcpay = BTCPayServerService()
        
        # Get current balance
        balance_info = btcpay.get_wallet_balance()
        current_balance = Decimal(balance_info.get('balance', 0))
        
        print(f"\nCurrent Hot Wallet Balance: {current_balance} BTC")
        print(f"Maximum Allowed: {HOT_WALLET_MAX_BALANCE} BTC")
        
        if current_balance > HOT_WALLET_MAX_BALANCE:
            excess = current_balance - HOT_WALLET_MAX_BALANCE
            
            print(f"Excess Amount: {excess} BTC")
            
            if excess >= MIN_SWEEP_AMOUNT:
                print(f"\n⚠️ SWEEPING {excess} BTC to cold storage...")
                print(f"Cold Wallet: {COLD_WALLET_ADDRESS}")
                
                # TODO: Implement actual sweep
                # For now, just alert (implement after cold wallet setup)
                print("\n📧 EMAIL ALERT: Manual sweep required")
                print(f"   Amount: {excess} BTC")
                print(f"   Reason: Hot wallet balance exceeds {HOT_WALLET_MAX_BALANCE} BTC")
                
                # In production, you would:
                # 1. Create transaction to cold wallet
                # 2. Send via BTCPay API
                # 3. Log the sweep
                # 4. Send confirmation email
            else:
                print(f"\nℹ️ Excess {excess} BTC below minimum sweep amount {MIN_SWEEP_AMOUNT} BTC")
        else:
            print("\n✅ Balance within safe limits - no sweep needed")
    
    except Exception as e:
        print(f"\n❌ Error during sweep check: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 80)


if __name__ == "__main__":
    auto_sweep_to_cold_storage()
