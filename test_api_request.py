import requests
import json

url = "http://88.99.143.151:8000/api/v1/payments/admin/crypto-status/"
# We need a token. Let's see if we can find one or just try a request.
# Without a token it will be 401, but we can see if it's a 500 DB error.

try:
    print(f"Testing {url} ...")
    response = requests.get(url, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Request failed: {str(e)}")
