import os
import django
import sys

# Set up Django environment
sys.path.append(r'c:\ac1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.direct_payment_monitor import direct_payment_monitor

print("Starting direct payment monitor scan...")
direct_payment_monitor.monitor_pending_direct_payments()
print("Scan complete.")
