import requests
from requests.auth import HTTPDigestAuth
import json

url = "http://88.99.143.151:18082/json_rpc"
user = "monerouser"
password = "moneropass123"

def test_monero():
    payload = {
        "jsonrpc": "2.0",
        "id": "0",
        "method": "get_height"
    }
    
    auth = HTTPDigestAuth(user, password)
    
    try:
        print(f"Testing Monero RPC at {url}...")
        response = requests.post(
            url,
            json=payload,
            auth=auth,
            timeout=5
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request failed: {str(e)}")

if __name__ == "__main__":
    test_monero()
