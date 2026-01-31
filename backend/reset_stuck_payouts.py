import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.models import DirectPayment

stuck_payouts = DirectPayment.objects.filter(status='processing')
for dp in stuck_payouts:
    print(f"Resetting stuck payout for order {dp.order_id} (status: processing -> confirmed)")
    dp.status = 'confirmed'
    dp.save()

print(f"Done. Reset {stuck_payouts.count()} payouts.")
