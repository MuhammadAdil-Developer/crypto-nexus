import os
import django
import sys

# Set up Django environment
sys.path.append(r'c:\ac1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order
from payments.models import DirectPayment, PaymentAddress

order_id = 'ORD-403B5662'

try:
    order = Order.objects.get(order_id=order_id)
    print(f"Order: {order.order_id}")
    print(f"  Status: {order.order_status}")
    print(f"  Payment Status: {order.payment_status}")
    print(f"  Total Amount: {order.total_amount}")
    # Handle both object and string for crypto_currency
    crypto = getattr(order.crypto_currency, 'symbol', str(order.crypto_currency))
    print(f"  Crypto: {crypto}")
    
    pa = PaymentAddress.objects.filter(order_id=order_id).first()
    if pa:
        print(f"PaymentAddress:")
        print(f"  Status: {pa.status}")
        print(f"  Address: {pa.payment_address}")
        print(f"  Expected: {pa.expected_amount}")
        print(f"  Received: {pa.received_amount}")
        print(f"  Confirmations: {pa.confirmations}")
        print(f"  TXID: {pa.transaction_hash}")
        print(f"  BTCpay ID: {getattr(pa, 'btcpay_invoice_id', 'N/A')}")
    else:
        print("PaymentAddress not found")
        
    dp = DirectPayment.objects.filter(order=order).first()
    if dp:
        print(f"DirectPayment:")
        print(f"  Status: {dp.status}")
        print(f"  Amount: {dp.amount}")
        print(f"  Platform Fee: {dp.platform_fee}")
        print(f"  Net Amount: {dp.net_amount}")
        print(f"  TXID: {dp.transaction_hash}")
        print(f"  Updated At: {dp.updated_at}")
        print(f"  Confirmed At: {dp.confirmed_at}")
    else:
        print("DirectPayment not found")

except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()

from payments.commission_models import CommissionSettings
try:
    settings = CommissionSettings.get_settings()
    print(f"\nCommissionSettings:")
    print(f"  Platform Fee Rate: {settings.platform_fee_rate}%")
    print(f"  Escrow Fee Rate: {settings.escrow_fee_rate}%")
except Exception as e:
    print(f"Error getting settings: {e}")
