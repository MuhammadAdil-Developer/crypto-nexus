import os
import django
import requests
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from django.conf import settings
from payments.services import BTCPayServerService

def check_settings():
    service = BTCPayServerService()
    print(f"Checking BTCPay Store Settings for: {service.store_id}")
    
    try:
        # Get Store Info
        response = requests.get(
            f"{service.base_url}/api/v1/stores/{service.store_id}",
            headers=service.headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("\n=== STORE SETTINGS ===")
            print(f"Name: {data.get('name')}")
            print(f"Website: {data.get('website')}")
            print(f"SpeedPolicy: {data.get('speedPolicy')}")
            # Check for forwarding or similar policies if visible in API
            # Standard BTCPay API doesn't expose 'forwarding' easily in basic store endpoint,
            # but let's see if there are plugins or specific settings.
            print(f"Additional Config: {json.dumps(data, indent=2)}")

        else:
            print(f"Failed to get store info: {response.status_code}")
            
        # Check On-Chain Payment Methods (might show forwarding address?)
        response = requests.get(
            f"{service.base_url}/api/v1/stores/{service.store_id}/payment-methods/onchain/BTC",
            headers=service.headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("\n=== BTC ON-CHAIN SETTINGS ===")
            print(f"Enabled: {data.get('enabled')}")
            print(f"Derivation Scheme: {data.get('derivationScheme')}")
            print(f"Label: {data.get('label')}")
            print(f"Payment Method: {json.dumps(data, indent=2)}")
        else:
            print(f"Failed to get BTC settings: {response.status_code}")
            
    except Exception as e:
        print(f"Error checking settings: {e}")

if __name__ == "__main__":
    check_settings()
