import requests
import json
from datetime import datetime, timedelta

# BTCPay credentials
BASE_URL = "https://pay.accountzclub.com"
STORE_ID = "8wYTiCWKm47tXgi9mZe1Vf99ZKpStCXbKUJTpNumgmEC"
API_KEY = "6460c3257b528997986804a5677df63102ec7947"

headers = {
    'Authorization': f'token {API_KEY}',
    'Content-Type': 'application/json'
}

print("=== CHECKING BTCPAY WALLET TRANSACTIONS (Last 30 days) ===\n")

# Get wallet transactions
url = f"{BASE_URL}/api/v1/stores/{STORE_ID}/payment-methods/onchain/BTC/wallet/transactions"
response = requests.get(url, headers=headers, timeout=30)

if response.status_code == 200:
    transactions = response.json()
    print(f"Found {len(transactions)} transactions\n")
    
    for tx in transactions:
        tx_id = tx.get('transactionHash', 'N/A')
        timestamp = tx.get('timestamp', 'N/A')
        comment = tx.get('comment', 'N/A')
        labels = tx.get('labels', [])
        
        # Check if this is our mystery transaction
        is_mystery = 'd063d9d' in tx_id.lower() if tx_id != 'N/A' else False
        
        print(f"{'🔴 MYSTERY TX FOUND!' if is_mystery else 'TX:'} {tx_id}")
        print(f"  Timestamp: {timestamp}")
        print(f"  Comment: {comment}")
        print(f"  Labels: {labels}")
        print(f"  Full Data: {json.dumps(tx, indent=2)}")
        print()
        
else:
    print(f"Failed to get transactions: {response.status_code}")
    print(f"Response: {response.text}")

# Check for any payouts
print("\n=== CHECKING BTCPAY PAYOUTS ===\n")
url = f"{BASE_URL}/api/v1/stores/{STORE_ID}/payouts"
response = requests.get(url, headers=headers, timeout=30)

if response.status_code == 200:
    payouts = response.json()
    print(f"Found {len(payouts)} payouts\n")
    
    for payout in payouts:
        payout_id = payout.get('id', 'N/A')
        destination = payout.get('destination', 'N/A')
        amount = payout.get('amount', 'N/A')
        state = payout.get('state', 'N/A')
        
        print(f"Payout ID: {payout_id}")
        print(f"  Destination: {destination}")
        print(f"  Amount: {amount}")
        print(f"  State: {state}")
        print(f"  Full Data: {json.dumps(payout, indent=2)}")
        print()
else:
    print(f"Failed to get payouts: {response.status_code}")

# Check wallet info for any forwarding address
print("\n=== CHECKING WALLET SETTINGS ===\n")
url = f"{BASE_URL}/api/v1/stores/{STORE_ID}/payment-methods/onchain/BTC/wallet"
response = requests.get(url, headers=headers, timeout=30)

if response.status_code == 200:
    wallet = response.json()
    print(f"Wallet Balance: {wallet.get('balance', 'N/A')}")
    print(f"Full Wallet Info: {json.dumps(wallet, indent=2)}")
else:
    print(f"Failed to get wallet info: {response.status_code}")
