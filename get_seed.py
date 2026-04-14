import requests
import json
from requests.auth import HTTPDigestAuth

# Config
RPC_URL = "http://127.0.0.1:18082/json_rpc"
RPC_USER = "nx_vault_7Q"
RPC_PASSWORD = "F9!xQ@3Zk#M7vR2$LwA8"

def get_wallet_seed():
    print("="*60)
    print("  MONERO WALLET RECOVERY SEED (SECRET)")
    print("="*60)
    print("[*] Connecting to Wallet RPC...")

    headers = {'Content-Type': 'application/json'}
    payload = {
        "jsonrpc": "2.0",
        "id": "0",
        "method": "query_key",
        "params": {
            "key_type": "mnemonic"
        }
    }

    try:
        response = requests.post(
            RPC_URL, 
            headers=headers, 
            json=payload, 
            auth=HTTPDigestAuth(RPC_USER, RPC_PASSWORD)
        )

        if response.status_code == 200:
            result = response.json()
            if 'result' in result and 'key' in result['result']:
                seed = result['result']['key']
                print("\n[SUCCESS] Here is your 25-word Recovery Seed:")
                print("-" * 60)
                print(seed)
                print("-" * 60)
                print("\n[CRITICAL WARNING]")
                print("1. WRITE THIS DOWN on paper immediately.")
                print("2. DO NOT share this with anyone.")
                print("3. If you lose your wallet file or password, ONLY this seed can recover your funds.")
            else:
                print(f"[!] Error: Could not retrieve seed. Response: {result}")
        else:
            print(f"[!] HTTP Error: {response.status_code}")

    except Exception as e:
        print(f"[!] Connection failed: {e}")
        print("Make sure check_monero_status.py is running!")

    print("\n" + "="*60)
    input("Press Enter to close...")

if __name__ == "__main__":
    get_wallet_seed()
