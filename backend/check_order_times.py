from orders.models import Order
from payments.models import PaymentAddress
from django.utils import timezone

order_id = 'ORD-A52498E7'

try:
    order = Order.objects.get(order_id=order_id)
    pa = PaymentAddress.objects.filter(order_id=order_id).first()
    
    # Check if DirectPayment model exists and what it says
    from payments.models import DirectPayment
    dp = DirectPayment.objects.filter(order=order).first()
    
    print("-" * 50)
    print(f"ORDER CREATED:    {order.created_at}")
    print(f"ORDER EXPIRES:    {getattr(order, 'expires_at', 'No expires_at field')}")
    print(f"ORDER STATUS:     {order.order_status}")
    print(f"PAYMENT STATUS:   {order.payment_status}")
    
    if pa:
        print(f"PA DETECTED:      {pa.created_at}") # Time initial entry created
        print(f"PA UPDATED:       {pa.updated_at}")
        print(f"PA STATUS:        {pa.status}")
    
    if dp:
        print(f"DP EXPIRES:       {getattr(dp, 'expires_at', 'No DP expires_at')}")
        print(f"DP STATUS:        {dp.status}")
        
    print("-" * 50)

except Exception as e:
    print(f"Error: {e}")
