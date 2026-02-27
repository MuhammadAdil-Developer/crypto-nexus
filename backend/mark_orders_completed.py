import os
import django
import sys

# Set up Django environment
sys.path.append('c:/ac1/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment
from orders.models import Order
from django.utils import timezone

order_ids = ['ORD-A4D82795', 'ORD-0AE8D555']

for oid in order_ids:
    try:
        order = Order.objects.get(order_id=oid)
        print(f"Processing Order: {oid} (ID: {order.id})")
        
        # Update DirectPayment
        dp = DirectPayment.objects.filter(order=order).first()
        if dp:
            print(f"  Current DirectPayment status: {dp.status}")
            dp.status = 'completed'
            if not dp.confirmed_at:
                dp.confirmed_at = timezone.now()
            dp.updated_at = timezone.now()
            dp.save()
            print(f"  ✅ DirectPayment marked as completed.")
        else:
            print(f"  ⚠️ No DirectPayment record found for {oid}")
            
        # Update Order payment status if needed
        if order.payment_status != 'paid':
            order.payment_status = 'paid'
            order.save()
            print(f"  ✅ Order payment_status updated to 'paid'.")
            
    except Order.DoesNotExist:
        print(f"  ❌ Order {oid} not found.")
    except Exception as e:
        print(f"  ❌ Error processing {oid}: {str(e)}")

print("\nDone.")
