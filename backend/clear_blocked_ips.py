#!/usr/bin/env python
"""
Emergency script to list and clear blocked IPs from the database.
Run from the backend directory:
    python clear_blocked_ips.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from shared.models import IPRestriction

print("\n" + "="*60)
print("  IP RESTRICTION MANAGER")
print("="*60)

all_restrictions = IPRestriction.objects.all()
if not all_restrictions.exists():
    print("\n✅ No IP restrictions found. Database is clean.")
else:
    print(f"\n📋 Found {all_restrictions.count()} restriction(s):\n")
    for r in all_restrictions:
        print(f"  [{r.restriction_type.upper()}] {r.ip_address}")
        print(f"  └─ Label: {r.label or 'N/A'} | Active: {r.is_active} | ID: {r.id}")
        print()

    print("="*60)
    print("OPTIONS:")
    print("  1. Delete ALL restrictions (clear everything)")
    print("  2. Delete only BLACKLISTED (blocked) IPs")
    print("  3. Delete a specific IP")
    print("  4. Exit (do nothing)")
    print("="*60)

    choice = input("\nEnter your choice (1/2/3/4): ").strip()

    if choice == '1':
        count = all_restrictions.count()
        all_restrictions.delete()
        print(f"\n✅ Deleted ALL {count} restriction(s). Access restored for everyone!")

    elif choice == '2':
        blocked = IPRestriction.objects.filter(restriction_type='blacklist')
        count = blocked.count()
        blocked.delete()
        print(f"\n✅ Deleted {count} blacklisted IP(s). Blocked users can now access the site!")

    elif choice == '3':
        ip_to_delete = input("Enter the exact IP address to remove: ").strip()
        deleted, _ = IPRestriction.objects.filter(ip_address=ip_to_delete).delete()
        if deleted:
            print(f"\n✅ Removed IP: {ip_to_delete}")
        else:
            print(f"\n❌ IP not found: {ip_to_delete}")

    else:
        print("\nExiting. No changes made.")

print("\n" + "="*60)
print("  CURRENT STATE AFTER CHANGES:")
print("="*60)
remaining = IPRestriction.objects.all()
if remaining.exists():
    for r in remaining:
        print(f"  [{r.restriction_type.upper()}] {r.ip_address} | Active: {r.is_active}")
else:
    print("  ✅ No restrictions in database.")
print("="*60 + "\n")
