import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import PaymentAddress, DirectPayment, Payout
from users.models import User

# The mystery destination address
mystery_address = "bc1qlfej2kjh62flgl4tu3k9pqkpnxz7ced7rvnpww"

print(f"=== INVESTIGATING DESTINATION ADDRESS ===\n")
print(f"Address: {mystery_address}\n")

# 1. Check if it's in PaymentAddress (buyer deposits)
print("1. Checking PaymentAddress (buyer deposits)...")
pa_matches = PaymentAddress.objects.filter(payment_address__icontains=mystery_address)
if pa_matches.exists():
    for pa in pa_matches:
        print(f"  ✅ FOUND in PaymentAddress!")
        print(f"     Order: {pa.order_id}")
        print(f"     Status: {pa.status}")
        print(f"     Created: {pa.created_at}")
else:
    print("  ❌ NOT FOUND in PaymentAddress")

# 2. Check if it's a vendor address
print("\n2. Checking User/Vendor BTC addresses...")
vendor_matches = User.objects.filter(
    user_type='vendor',
    btc_payout_address__icontains=mystery_address
)
if vendor_matches.exists():
    for v in vendor_matches:
        print(f"  ✅ FOUND in Vendor User!")
        print(f"     Vendor: {v.username}")
else:
    print("  ❌ NOT FOUND in Vendor records")

# 3. Check if it's in DirectPayment vendor_address
print("\n3. Checking DirectPayment vendor addresses...")
dp_matches = DirectPayment.objects.filter(vendor_address__icontains=mystery_address)
if dp_matches.exists():
    for dp in dp_matches:
        print(f"  ✅ FOUND in DirectPayment!")
        print(f"     Order: {dp.order_id}")
        print(f"     Vendor: {dp.vendor.username}")
        print(f"     Amount: {dp.amount}")
        print(f"     Status: {dp.status}")
else:
    print("  ❌ NOT FOUND in DirectPayment")

# 4. Check if it's in Payout vendor_address
print("\n4. Checking Payout vendor addresses...")
payout_matches = Payout.objects.filter(vendor_address__icontains=mystery_address)
if payout_matches.exists():
    for p in payout_matches:
        print(f"  ✅ FOUND in Payout!")
        print(f"     Order: {p.order_id}")
        print(f"     Vendor: {p.vendor.username if p.vendor else 'N/A'}")
        print(f"     Amount: {p.net_amount}")
        print(f"     Status: {p.status}")
else:
    print("  ❌ NOT FOUND in Payout")

# 5. Check BTCPay API to see if it's a wallet address
print("\n5. Checking if address belongs to BTCPay wallet...")
try:
    from payments.services import BTCPayServerService
    btcpay = BTCPayServerService()
    
    # Get UTXOs to see if this address appears
    wallet_url = f"{btcpay.base_url}/api/v1/stores/{btcpay.store_id}/payment-methods/onchain/BTC/wallet/utxos"
    response = requests.get(wallet_url, headers=btcpay.headers, timeout=10)
    
    if response.status_code == 200:
        utxos = response.json()
        found_in_wallet = False
        for utxo in utxos:
            if utxo.get('address') == mystery_address:
                found_in_wallet = True
                print(f"  ✅ ADDRESS IS IN BTCPAY WALLET!")
                print(f"     This is your own wallet address (change/consolidation)")
                print(f"     UTXO: {utxo}")
                break
        
        if not found_in_wallet:
            print(f"  ❌ Address NOT in current BTCPay wallet UTXOs")
            print(f"     This could be:")
            print(f"     - An external address (THEFT)")
            print(f"     - A spent change address")
            print(f"     - A vendor withdrawal")
    else:
        print(f"  ⚠️ Failed to check BTCPay wallet: {response.status_code}")
except Exception as e:
    print(f"  ⚠️ Error checking BTCPay: {e}")

# 6. Trace where the funds went NEXT
print("\n6. Checking if funds were spent from this address...")
try:
    # Check if the output was spent
    tx_url = f"https://mempool.space/api/address/{mystery_address}/txs"
    response = requests.get(tx_url, timeout=10)
    
    if response.status_code == 200:
        txs = response.json()
        print(f"  Found {len(txs)} transactions involving this address")
        
        # Find transactions AFTER our mystery TX
        mystery_time = 1771254601
        spending_txs = [tx for tx in txs if tx.get('status', {}).get('block_time', 0) > mystery_time]
        
        if spending_txs:
            print(f"\n  ⚠️ FUNDS WERE SPENT {len(spending_txs)} time(s) after consolidation:")
            for i, tx in enumerate(spending_txs[:3]):  # Show first 3
                print(f"    TX #{i+1}: {tx.get('txid')}")
                print(f"    Time: {tx.get('status', {}).get('block_time')}")
                # Check outputs to see where it went
                for vout in tx.get('vout', []):
                    addr = vout.get('scriptpubkey_address', 'N/A')
                    val = vout.get('value', 0) / 100000000
                    if addr != mystery_address:  # Show where it went (not change back)
                        print(f"    → Sent to: {addr} ({val} BTC)")
        else:
            print(f"  ✅ Funds are STILL at this address (unspent)")
except Exception as e:
    print(f"  ⚠️ Error tracing funds: {e}")

print("\n" + "="*60)
print("CONCLUSION:")
print("="*60)
