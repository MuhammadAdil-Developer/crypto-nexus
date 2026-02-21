import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from users.models import User
from django.utils import timezone

print("=" * 80)
print("ADMIN & STAFF USERS IN SYSTEM")
print("=" * 80)

# Usernames to exclude from the list
EXCLUDE_USERNAMES = ['crypto_admin', 'Default', 'myuser6']

# Get all admin/staff users and exclude specific ones
admin_users = User.objects.filter(is_staff=True) | User.objects.filter(is_superuser=True)
admin_users = admin_users.exclude(username__in=EXCLUDE_USERNAMES).distinct().order_by('-is_superuser', '-is_staff', 'username')

print(f"\nTotal Admin/Staff Users: {admin_users.count()}\n")

for i, user in enumerate(admin_users, 1):
    print(f"{i}. USERNAME: {user.username}")
    print(f"   ID: {user.id}")
    print(f"   User Type: {user.user_type}")
    print(f"   Is Superuser: {'✅ YES' if user.is_superuser else '❌ No'}")
    print(f"   Is Staff: {'✅ YES' if user.is_staff else '❌ No'}")
    print(f"   Is Active: {'✅ YES' if user.is_active else '❌ No'}")
    print(f"   2FA Enabled: {'✅ YES' if user.two_factor_enabled else '❌ No'}")
    print(f"   Created At: {user.created_at}")
    print(f"   Last Login: {user.last_login if user.last_login else 'Never'}")
    print(f"   BTC Payout Address: {user.btc_payout_address or 'Not Set'}")
    print(f"   XMR Payout Address: {user.xmr_payout_address or 'Not Set'}")
    print("-" * 80)

# Also check all users who can potentially access admin
print("\n" + "=" * 80)
print("ALL USERS WHO HAVE ADMIN ACCESS")
print("=" * 80)

all_potential_admins = User.objects.filter(
    is_staff=True
) | User.objects.filter(
    is_superuser=True
) | User.objects.filter(
    user_type='admin'
)
all_potential_admins = all_potential_admins.exclude(username__in=EXCLUDE_USERNAMES).distinct()

print(f"\nTotal Potential Admin Users: {all_potential_admins.count()}\n")

for i, user in enumerate(all_potential_admins.order_by('-is_superuser', 'username'), 1):
    status = []
    if user.is_superuser:
        status.append("SUPERUSER")
    if user.is_staff:
        status.append("STAFF")
    if user.user_type == 'admin':
        status.append("ADMIN TYPE")
    
    print(f"{i}. {user.username} [{', '.join(status)}]")
    print(f"   Last Login: {user.last_login if user.last_login else 'Never logged in'}")
    print(f"   2FA: {'Enabled' if user.two_factor_enabled else 'Disabled'}")
    print(f"   Active: {'Yes' if user.is_active else 'No'}")

print("\n" + "=" * 80)
print("=" * 80)
print("=" * 80)
