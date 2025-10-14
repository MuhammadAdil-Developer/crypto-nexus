"""
Test script to verify commission rates are being used correctly
Run: python manage.py shell < test_commission_rates.py
"""

from payments.commission_models import CommissionSettings
from orders.models import Order
from payments.models import EscrowPayment, DirectPayment, Payout
from decimal import Decimal

print("=" * 60)
print("COMMISSION RATE TEST")
print("=" * 60)

# 1. Check current commission settings
print("\n1. Current Commission Settings:")
print("-" * 60)
settings = CommissionSettings.get_settings()
print(f"Platform Fee Rate: {settings.platform_fee_rate}%")
print(f"Escrow Fee Rate: {settings.escrow_fee_rate}%")
print(f"Default Commission Rate: {settings.default_commission_rate}%")
print(f"Min Commission Rate: {settings.min_commission_rate}%")
print(f"Max Commission Rate: {settings.max_commission_rate}%")

# 2. Check recent escrow payments
print("\n2. Recent Escrow Payments:")
print("-" * 60)
recent_escrows = EscrowPayment.objects.all().order_by('-created_at')[:5]
if recent_escrows:
    for escrow in recent_escrows:
        print(f"\nOrder: {escrow.payment_address.order_id}")
        print(f"  Amount: {escrow.escrow_amount} {escrow.payment_address.crypto_currency.symbol}")
        print(f"  Escrow Fee: {escrow.escrow_fee} {escrow.payment_address.crypto_currency.symbol}")
        print(f"  Fee Rate: {(escrow.escrow_fee / escrow.escrow_amount * 100):.2f}%")
else:
    print("No escrow payments found")

# 3. Check recent direct payments
print("\n3. Recent Direct Payments:")
print("-" * 60)
recent_direct = DirectPayment.objects.all().order_by('-created_at')[:5]
if recent_direct:
    for dp in recent_direct:
        print(f"\nOrder: {dp.order.order_id}")
        print(f"  Amount: {dp.amount} {dp.crypto_currency.symbol}")
        print(f"  Platform Fee: {dp.platform_fee} {dp.crypto_currency.symbol}")
        print(f"  Escrow Fee: {dp.escrow_fee} {dp.crypto_currency.symbol}")
        print(f"  Net Amount: {dp.net_amount} {dp.crypto_currency.symbol}")
        print(f"  Platform Fee Rate: {(dp.platform_fee / dp.amount * 100):.2f}%")
        print(f"  Escrow Fee Rate: {(dp.escrow_fee / dp.amount * 100):.2f}%")
        print(f"  Total Fee Rate: {((dp.platform_fee + dp.escrow_fee) / dp.amount * 100):.2f}%")
else:
    print("No direct payments found")

# 4. Check recent payouts
print("\n4. Recent Payouts:")
print("-" * 60)
recent_payouts = Payout.objects.all().order_by('-created_at')[:5]
if recent_payouts:
    for payout in recent_payouts:
        print(f"\nOrder: {payout.order.order_id}")
        print(f"  Type: {payout.payout_type}")
        print(f"  Gross Amount: {payout.gross_amount} {payout.crypto_currency.symbol}")
        print(f"  Platform Fee: {payout.platform_fee} {payout.crypto_currency.symbol}")
        print(f"  Escrow Fee: {payout.escrow_fee} {payout.crypto_currency.symbol}")
        print(f"  Net Amount: {payout.net_amount} {payout.crypto_currency.symbol}")
        if payout.gross_amount > 0:
            print(f"  Platform Fee Rate: {(payout.platform_fee / payout.gross_amount * 100):.2f}%")
            print(f"  Total Fee Rate: {((payout.platform_fee + payout.escrow_fee) / payout.gross_amount * 100):.2f}%")
else:
    print("No payouts found")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)

