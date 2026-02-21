import requests
import json

# The mystery transaction
tx_hash = "d063d9d50d73933c8abe2f87d059c17c3ccd0b9977e59a5edaa893cbd457f003"

print(f"=== TRACING MYSTERY TRANSACTION ===\n")
print(f"TX Hash: {tx_hash}")
print(f"Amount: -0.00492429 BTC (~$336)\n")

# Check blockchain explorers
for api_url in [
    f"https://mempool.space/api/tx/{tx_hash}",
    f"https://blockstream.info/api/tx/{tx_hash}"
]:
    try:
        print(f"Checking {api_url}...")
        response = requests.get(api_url, timeout=10)
        
        if response.status_code == 200:
            tx_data = response.json()
            print(f"\n✅ Transaction found!\n")
            print(json.dumps(tx_data, indent=2))
            
            # Extract outputs (where the money went)
            print(f"\n=== OUTPUTS (Where money was sent) ===\n")
            for i, vout in enumerate(tx_data.get('vout', [])):
                address = vout.get('scriptpubkey_address', 'N/A')
                value_sat = vout.get('value', 0)
                value_btc = value_sat / 100000000
                print(f"Output #{i}:")
                print(f"  Address: {address}")
                print(f"  Amount: {value_btc} BTC (${value_btc * 68000:.2f} USD if $68k/BTC)")
                print()
            
            # Extract inputs (where money came from)
            print(f"\n=== INPUTS (Source addresses) ===\n")
            for i, vin in enumerate(tx_data.get('vin', [])):
                prev_out = vin.get('prevout', {})
                address = prev_out.get('scriptpubkey_address', 'N/A')
                value_sat = prev_out.get('value', 0)
                value_btc = value_sat / 100000000
                print(f"Input #{i}:")
                print(f"  Address: {address}")
                print(f"  Amount: {value_btc} BTC")
                print()
            
            break
    except Exception as e:
        print(f"Error: {e}")
        continue
