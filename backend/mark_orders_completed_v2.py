import os
import sys
import django

# Get the absolute path of the backend directory
backend_path = os.path.abspath(os.path.dirname(__file__))

# Clean up sys.path to avoid duplicate/conflicting paths (common on Windows)
# The ImproperlyConfigured error happens when 'users' is found in multiple places.
clean_path = []
for p in sys.path:
    if p.lower().rstrip('\\/') != backend_path.lower().rstrip('\\/'):
        clean_path.append(p)
sys.path = [backend_path] + clean_path

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
try:
    django.setup()
except Exception as e:
    print(f"Failed to setup Django: {e}")
    # Fallback to manual setup if still failing
    from django.conf import settings
    if not settings.configured:
        print("Attempting manual settings configuration...")
    sys.exit(1)

from payments.models import DirectPayment
from orders.models import Order
from django.utils import timezone

order_ids = ['ORD-A4D82795', 'ORD-0AE8D555']

print(f"Starting manual payout status update for: {order_ids}")

for oid in order_ids:
    try:
        order = Order.objects.get(order_id=oid)
        print(f"Processing Order: {oid}")
        
        # Update DirectPayment
        dp = DirectPayment.objects.filter(order=order).first()
        if dp:
            print(f"  Current status: {dp.status}")
            dp.status = 'completed'
            if not dp.confirmed_at:
                dp.confirmed_at = timezone.now()
            dp.updated_at = timezone.now()
            dp.save()
            print(f"  ✅ DirectPayment marked as completed.")
        else:
            print(f"  ⚠️ No DirectPayment record found for {oid}")
            
        # Update Order payment status
        if order.payment_status != 'paid':
            order.payment_status = 'paid'
            order.save()
            print(f"  ✅ Order payment_status updated to 'paid'.")
            
    except Order.DoesNotExist:
        print(f"  ❌ Order {oid} not found.")
    except Exception as e:
        print(f"  ❌ Error processing {oid}: {str(e)}")

print("\nDone.")
