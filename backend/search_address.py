import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from users.models import User
from payments.models import PaymentAddress, Payout, DirectPayment

search_address = "bc1qlfej2kjh62flgl4tu3k9pqkpnxz7ced7rvnpww"

print("=" * 80)
print(f"SEARCHING FOR ADDRESS: {search_address}")
print("=" * 80)

found = False

# 1. Check Users (Vendors/Buyers payout addresses)
print("\n1. Checking Users Table (btc_payout_address)...")
users = User.objects.filter(btc_payout_address__icontains=search_address)
if users.exists():
    found = True
    for user in users:
        print(f"  ✅ FOUND in User: {user.username} (Type: {user.user_type})")
else:
    print("  ❌ Not found in Users")

# 2. Check PaymentAddress (Buyer deposit addresses)
print("\n2. Checking PaymentAddress Table...")
pas = PaymentAddress.objects.filter(payment_address__icontains=search_address)
if pas.exists():
    found = True
    for pa in pas:
        print(f"  ✅ FOUND in PaymentAddress: Order ID {pa.order_id} (Status: {pa.status})")
else:
    print("  ❌ Not found in PaymentAddress")

# 3. Check Payouts (Vendor payout destination)
print("\n3. Checking Payout Table...")
payouts = Payout.objects.filter(vendor_address__icontains=search_address)
if payouts.exists():
    found = True
    for p in payouts:
        print(f"  ✅ FOUND in Payout: Order ID {p.order_id} (Amount: {p.net_amount})")
else:
    print("  ❌ Not found in Payouts")

# 4. Check DirectPayment (Vendor destination)
print("\n4. Checking DirectPayment Table...")
dps = DirectPayment.objects.filter(vendor_address__icontains=search_address)
if dps.exists():
    found = True
    for dp in dps:
        print(f"  ✅ FOUND in DirectPayment: Order ID {dp.order_id}")
else:
    print("  ❌ Not found in DirectPayment")

# 5. Check Order refund_address
print("\n5. Checking Order (refund_address)...")
from orders.models import Order
orders = Order.objects.filter(refund_address__icontains=search_address)
if orders.exists():
    found = True
    for o in orders:
        print(f"  ✅ FOUND in Order: {o.order_id} (Buyer Refund Address)")
else:
    print("  ❌ Not found in Order refund addresses")

print("\n" + "=" * 80)
if not found:
    print("Final Result: 🚨 address pure system me KISI BHI record se match nahi karta.")
else:
    print("Final Result: ⚠️ Address system me mil gaya hai (details upar hain).")
print("=" * 80)
