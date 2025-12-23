import os
import django
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import PaymentAddress
from orders.models import Order

order_id = 'ORD-49DC28D3'
pa = PaymentAddress.objects.filter(order_id=order_id).first()
if pa:
    print(f"--- PaymentAddress Info ---")
    print(f"Order ID: {pa.order_id}")
    print(f"Expected: {pa.expected_amount}")
    print(f"Received: {pa.received_amount}")
    print(f"Status: {pa.status}")
    print(f"Crypto: {pa.crypto_currency.symbol}")
    print(f"Subaddress Index: {pa.monero_subaddress_index}")
    
    order = Order.objects.filter(order_id=order_id).first()
    if order:
        print(f"\n--- Order Info ---")
        print(f"Order Status: {order.order_status}")
        print(f"Payment Status: {order.payment_status}")
else:
    print(f"Order {order_id} not found in PaymentAddress")
