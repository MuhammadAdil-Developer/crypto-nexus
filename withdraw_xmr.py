import requests
import json
import requests.auth

# RPC Settings (matching PaymentService defaults)
# Change these if your config is different
RPC_URL = 'http://127.0.0.1:18082/json_rpc'
RPC_USER = 'nx_vault_7Q'
RPC_PASSWORD = 'F9!xQ@3Zk#M7vR2$LwA8'

def make_rpc_call(method, params=None):
    payload = {
        "jsonrpc": "2.0",
        "id": "0",
        "method": method,
        "params": params or {}
    }
    
    try:
        response = requests.post(
            RPC_URL,
            data=json.dumps(payload),
            headers={'content-type': 'application/json'},
            auth=requests.auth.HTTPDigestAuth(RPC_USER, RPC_PASSWORD),
            timeout=30
        )
        if response.status_code != 200:
            print(f"Error: Status code {response.status_code}")
            print(response.text)
            return None
        return response.json()
    except Exception as e:
        print(f"Error connecting to Monero RPC: {e}")
        return None

def get_balance():
    res = make_rpc_call("get_balance", {"account_index": 0})
    if res and 'result' in res:
        balance = res['result']['balance'] / 1e12
        unlocked = res['result']['unlocked_balance'] / 1e12
        return balance, unlocked
    return 0.0, 0.0

def withdraw():
    print("\n" + "="*50)
    print("   MONERO ADMIN WALLET - WITHDRAWAL UTILITY")
    print("="*50)
    
    try:
        balance, unlocked = get_balance()
    except Exception:
        print("Could not connect to Monero RPC. Make sure monero-wallet-rpc is running.")
        return

    print(f"Total Portfolio Balance: {balance:.12f} XMR")
    print(f"Available (Unlocked):    {unlocked:.12f} XMR")
    print("-" * 50)
    
    if unlocked <= 0:
        print("Notice: No unlocked balance available to withdraw at this moment.")
        print("Note: Incoming funds require ~10 confirmations (approx 20 mins) to unlock.")
        return

    dest_address = input("\nEnter destination XMR address: ").strip()
    if not dest_address:
        print("Error: Destination address is required.")
        return
        
    amount_str = input(f"Enter amount to withdraw (Max {unlocked:.4f} XMR): ").strip()
    try:
        amount = float(amount_str)
        if amount <= 0:
            print("Error: Amount must be positive.")
            return
        if amount > unlocked:
            print(f"Error: Insufficient unlocked balance (Max: {unlocked} XMR)")
            return
    except ValueError:
        print("Error: Invalid number format.")
        return

    # Atomic units (12 decimals)
    atomic_amount = int(round(amount * 1e12))
    
    print("\n" + "!"*50)
    print(f"CONFIRMATION REQUIRED")
    print(f"Sending: {amount:.12f} XMR")
    print(f"To:      {dest_address}")
    print("!"*50)
    
    confirm = input("\nType 'CONFIRM' to execute transaction: ").strip()
    
    if confirm != 'CONFIRM':
        print("Transaction aborted.")
        return

    params = {
        'destinations': [{'amount': atomic_amount, 'address': dest_address}],
        'priority': 1,
        'ring_size': 16,
        'get_tx_key': True
    }
    
    print("\nSending transaction... please wait...")
    res = make_rpc_call("transfer", params)
    
    if res and 'result' in res:
        tx_hash = res['result']['tx_hash']
        fee = res['result']['fee'] / 1e12
        print("\n" + "SUCCESS" + "!"*43)
        print(f"Transaction Hash: {tx_hash}")
        print(f"Network Fee:      {fee:.12f} XMR")
        print("!"*50)
        print("\nWait for 1 confirmation for it to show in the receiver's wallet.")
    else:
        print("\n" + "FAILED" + "!"*44)
        if res and 'error' in res:
            print(f"Error Message: {res['error'].get('message', 'Unknown error')}")
        else:
            print("Unknown response from Monero RPC.")
        print("!"*50)

if __name__ == "__main__":
    withdraw()
