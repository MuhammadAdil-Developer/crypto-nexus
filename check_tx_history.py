import requests
import json
from requests.auth import HTTPDigestAuth

RPC_URL = 'http://127.0.0.1:18082/json_rpc'
RPC_USER = 'monerouser'
RPC_PASSWORD = 'moneropass123'

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
            json=payload,
            auth=HTTPDigestAuth(RPC_USER, RPC_PASSWORD),
            timeout=30
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def check_outgoing():
    # tx_id from user's logs
    tx_id = "32b8f3519e6b65991808dd1e4a482c6dde604f55107ee7ef89610ae673ba4cba"
    
    print(f"Checking status for TX: {tx_id}")
    
    # Check if it is in the wallet history
    res = make_rpc_call("get_transfer_by_txid", {"txid": tx_id})
    
    if "result" in res and "transfer" in res["result"]:
        t = res["result"]["transfer"]
        print(f"Found in wallet history!")
        print(f"Status: {t.get('type')}")
        print(f"Amount: {t.get('amount') / 1e12} XMR")
        print(f"Confirmations: {t.get('confirmations')}")
        print(f"Destination: {t.get('address')}")
    else:
        print("Not found in wallet history via get_transfer_by_txid.")
        # Try general transfers
        res = make_rpc_call("get_transfers", {"out": True})
        if "result" in res and "out" in res["result"]:
            found = False
            for t in res["result"]["out"]:
                if t["txid"] == tx_id:
                    print(f"Found in 'out' transfers!")
                    print(f"Amount: {t['amount'] / 1e12} XMR")
                    print(f"Confirmations: {t['confirmations']}")
                    found = True
                    break
            if not found:
                print("TX not found in outgoing transfers.")
        else:
            print("Could not retrieve outgoing transfers.")

if __name__ == "__main__":
    check_outgoing()
