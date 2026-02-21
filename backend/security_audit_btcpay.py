import requests
import json
from datetime import datetime

# BTCPay credentials
BASE_URL = "https://pay.accountzclub.com"
STORE_ID = "8wYTiCWKm47tXgi9mZe1Vf99ZKpStCXbKUJTpNumgmEC"
API_KEY = "6460c3257b528997986804a5677df63102ec7947"

headers = {
    'Authorization': f'token {API_KEY}',
    'Content-Type': 'application/json'
}

print("=== SECURITY AUDIT: BTCPay Access & Configuration ===\n")

# 1. Check Store Settings
print("1. Checking Store Settings...")
store_url = f"{BASE_URL}/api/v1/stores/{STORE_ID}"
response = requests.get(store_url, headers=headers, timeout=10)
if response.status_code == 200:
    store = response.json()
    print(f"  Store Name: {store.get('name')}")
    print(f"  Speed Policy: {store.get('speedPolicy')}")
    print(f"\n  Full Store Config:")
    print(json.dumps(store, indent=2))
else:
    print(f"  ❌ Failed: {response.status_code}")

# 2. Check Payment Methods (look for forwarding)
print("\n2. Checking BTC Payment Method Configuration...")
pm_url = f"{BASE_URL}/api/v1/stores/{STORE_ID}/payment-methods/onchain/BTC"
response = requests.get(pm_url, headers=headers, timeout=10)
if response.status_code == 200:
    pm = response.json()
    print(f"  Enabled: {pm.get('enabled')}")
    print(f"\n  Full Payment Method Config:")
    print(json.dumps(pm, indent=2))
    
    # Check for any suspicious settings
    if 'accountKeyPath' in pm:
        print(f"\n  ⚠️ Account Key Path: {pm.get('accountKeyPath')}")
else:
    print(f"  ❌ Failed: {response.status_code}")

# 3. Check for Pull Payments (auto-withdrawals)
print("\n3. Checking for Pull Payments / Auto-Withdrawals...")
pp_url = f"{BASE_URL}/api/v1/stores/{STORE_ID}/pull-payments"
response = requests.get(pp_url, headers=headers, timeout=10)
if response.status_code == 200:
    pull_payments = response.json()
    if pull_payments:
        print(f"  🚨 FOUND {len(pull_payments)} Pull Payments!")
        for pp in pull_payments:
            print(f"\n  Pull Payment ID: {pp.get('id')}")
            print(f"  Name: {pp.get('name')}")
            print(f"  Amount: {pp.get('amount')}")
            print(f"  Currency: {pp.get('currency')}")
            print(f"  Created: {pp.get('startsAt')}")
            print(json.dumps(pp, indent=2))
    else:
        print(f"  ✅ No pull payments configured")
else:
    print(f"  Info: {response.status_code} (might not have permission)")

# 4. Check wallet info for any suspicious settings
print("\n4. Checking Wallet Configuration...")
wallet_url = f"{BASE_URL}/api/v1/stores/{STORE_ID}/payment-methods/onchain/BTC/wallet"
response = requests.get(wallet_url, headers=headers, timeout=10)
if response.status_code == 200:
    wallet = response.json()
    print(f"  Balance: {wallet.get('balance')} BTC")
    print(f"\n  Full Wallet Info:")
    print(json.dumps(wallet, indent=2))
else:
    print(f"  ❌ Failed: {response.status_code}")

print("\n" + "="*60)
print("ACTION ITEMS:")
print("="*60)
print("1. Review the configurations above for any forwarding/automation")
print("2. Check BTCPay web interface: Stores → Settings → Wallet")
print("3. Look for 'Automated Payouts' or 'Forwarding' settings")
print("4. Check who has access: Server Settings → Users")
print("5. Review API keys: Stores → Settings → Access Tokens")
print("6. Change your BTCPay API key immediately if compromise suspected")
