import os
import django
import sys
from django.utils import timezone
from datetime import timedelta

# Set up Django environment
sys.path.append(r'c:\ac1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment

print("Checking for other stuck payments...")
stuck_threshold = timezone.now() - timedelta(hours=1)
stuck_payments = DirectPayment.objects.filter(
    status__in=['confirmed', 'processing'],
    updated_at__lt=stuck_threshold
)

if stuck_payments.exists():
    print(f"Found {stuck_payments.count()} potentially stuck payments:")
    for dp in stuck_payments:
        print(f"  Order: {dp.order.order_id} | Status: {dp.status} | Updated At: {dp.updated_at}")
else:
    print("No other stuck payments found (last 1 hour).")
