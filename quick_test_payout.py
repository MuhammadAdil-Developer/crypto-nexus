"""
Quick Payout Test Script
Run this to quickly test the payout fix
"""
import os
import sys
import django

# Setup Django
backend_path = r'c:\workspace\crypto-nexus\backend'
sys.path.insert(0, backend_path)
os.chdir(backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order
from payments.models import DirectPayment, PaymentAddress
from payments.commission_models import CommissionSettings
from payments.tasks import process_non_escrow_payout
from decimal import Decimal

print("=" * 60)
print("PAYOUT FEE FIX - QUICK TEST")
print("=" * 60)

# 1. Check Commission Settings
print("\n1. CHECKING COMMISSION SETTINGS:")
print("-" * 60)
settings = CommissionSettings.get_settings()
print(f"Platform Fee Rate: {settings.platform_fee_rate}%")
print(f"Escrow Fee Rate: {settings.escrow_fee_rate}%")

# 2. Find recent paid orders
print("\n2. FINDING RECENT PAID ORDERS (Non-Escrow):")
print("-" * 60)
recent_orders = Order.objects.filter(
    payment_status='paid',
    use_escrow=False
).order_by('-created_at')[:5]

if not recent_orders.exists():
    print("❌ No paid non-escrow orders found!")
    print("   Create a test order first or check escrow orders.")
else:
    print(f"Found {recent_orders.count()} recent paid orders:\n")
    for i, order in enumerate(recent_orders, 1):
        try:
            payment_addr = PaymentAddress.objects.get(order_id=order.order_id)
            direct_payment = DirectPayment.objects.filter(order=order).first()
            
            print(f"{i}. Order ID: {order.order_id}")
            print(f"   Amount: {payment_addr.received_amount or payment_addr.expected_amount} {payment_addr.crypto_currency.symbol}")
            print(f"   Status: {order.payment_status}")
            print(f"   Payout Status: {direct_payment.status if direct_payment else 'Not created'}")
            if direct_payment:
                print(f"   Platform Fee: {direct_payment.platform_fee} {payment_addr.crypto_currency.symbol}")
                print(f"   Net Amount: {direct_payment.net_amount} {payment_addr.crypto_currency.symbol}")
            print()
        except Exception as e:
            print(f"   Error: {e}\n")

# 3. Test payout for specific order
print("\n3. TEST PAYOUT:")
print("-" * 60)
order_id = input("Enter Order ID to test (or press Enter to skip): ").strip()

if order_id:
    try:
        order = Order.objects.get(order_id=order_id)
        payment_addr = PaymentAddress.objects.get(order_id=order_id)
        
        print(f"\nTesting payout for: {order_id}")
        print(f"Amount: {payment_addr.received_amount or payment_addr.expected_amount} {payment_addr.crypto_currency.symbol}")
        
        # Calculate expected fees
        amount = payment_addr.received_amount or payment_addr.expected_amount
        platform_fee_rate = settings.platform_fee_rate / Decimal('100')
        expected_platform_fee = amount * platform_fee_rate
        expected_net = amount - expected_platform_fee
        
        print(f"\nExpected Calculation:")
        print(f"  Gross: {amount} {payment_addr.crypto_currency.symbol}")
        print(f"  Platform Fee ({settings.platform_fee_rate}%): {expected_platform_fee} {payment_addr.crypto_currency.symbol}")
        print(f"  Net (before miner fees): {expected_net} {payment_addr.crypto_currency.symbol}")
        
        # Trigger payout
        confirm = input("\nProceed with payout? (yes/no): ").strip().lower()
        if confirm == 'yes':
            print("\nTriggering payout...")
            result = process_non_escrow_payout(order_id)
            print(f"\nResult: {result}")
            
            # Check result
            direct_payment = DirectPayment.objects.filter(order=order).first()
            if direct_payment:
                print(f"\n✅ Payout Details:")
                print(f"  Platform Fee: {direct_payment.platform_fee} {payment_addr.crypto_currency.symbol}")
                print(f"  Net Amount: {direct_payment.net_amount} {payment_addr.crypto_currency.symbol}")
                print(f"  Status: {direct_payment.status}")
                
                # Verify fee percentage
                actual_fee_percent = (direct_payment.platform_fee / amount * 100) if amount > 0 else 0
                print(f"\n  Fee Percentage: {actual_fee_percent:.2f}%")
                
                if actual_fee_percent > 20:
                    print(f"  ⚠️  WARNING: Fee percentage seems too high!")
                else:
                    print(f"  ✅ Fee percentage looks correct!")
        else:
            print("Skipped.")
    except Order.DoesNotExist:
        print(f"❌ Order {order_id} not found!")
    except Exception as e:
        print(f"❌ Error: {e}")
else:
    print("Skipped.")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
print("\n💡 TIP: Check Django logs for detailed fee calculation breakdown")
print("   Look for: '--- FEE CALCULATION FOR ORDER ---'")
