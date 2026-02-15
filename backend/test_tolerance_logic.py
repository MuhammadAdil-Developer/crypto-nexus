
import os
import sys
import django
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cryptonexus.settings")
django.setup()

from django.contrib.auth import get_user_model
from orders.models import Order
from products.models import Product, ProductCategory
from payments.models import DirectPayment, PaymentAddress, Payout
from payments.direct_payment_monitor import DirectPaymentMonitor
from shared.models import CryptoCurrency

def run_test():
    print("\n--- Starting Underpayment & Tolerance System Test ---\n")
    User = get_user_model()

    # 1. Setup Test Data
    print("1. Setting up test data...")
    
    buyer, _ = User.objects.get_or_create(username="test_buyer", defaults={'email': 'buyer@test.com'})
    vendor, _ = User.objects.get_or_create(username="test_vendor", defaults={'email': 'vendor@test.com', 'user_type': 'vendor'})
    
    category, _ = ProductCategory.objects.get_or_create(name="Test Category", defaults={'slug': 'test-category'})
    product, _ = Product.objects.get_or_create(
        headline="Test Product",
        defaults={
            'vendor': vendor,
            'category': category,
            'price': Decimal('100.00'),
            'delivery_time': 'instant_auto',
            'quantity_available': 10,
            'status': 'approved'
        }
    )

    # Mock BTC Price at $100,000 for easy math
    crypto, _ = CryptoCurrency.objects.get_or_create(symbol="BTC", defaults={'name': 'Bitcoin', 'current_price': Decimal('100000.00')})
    crypto.current_price = Decimal('100000.00')
    crypto.save()

    # Case A: Shortfall within $4 tolerance (Accepted)
    print("\nCase A: Testing shortfall within $4 tolerance ($3.00 shortfall)...")
    expected_amount = Decimal('0.001') # $100.00
    received_amount = Decimal('0.00097') # $97.00 ($3 shortfall)
    
    order_a = Order.objects.create(
        buyer=buyer, vendor=vendor, product=product, quantity=1,
        unit_price=expected_amount, total_amount=expected_amount,
        crypto_currency="BTC", refund_address="buyer_wallet",
        order_status="pending_payment", payment_status="pending"
    )
    
    pa_a = PaymentAddress.objects.create(
        order_id=order_a.order_id, payment_address="addr_a",
        crypto_currency=crypto, expected_amount=expected_amount,
        expires_at=timezone.now() + timedelta(hours=1)
    )
    
    payment_a = DirectPayment.objects.create(
        order=order_a, vendor=vendor, buyer=buyer,
        amount=expected_amount, crypto_currency=crypto,
        vendor_address="vendor_wallet", status='pending',
        expires_at=timezone.now() + timedelta(hours=1)
    )

    monitor = DirectPaymentMonitor()
    monitor._confirm_payment(payment=payment_a, source="test", confirmations=1, tx_hash="tx_a", amount=received_amount)

    order_a.refresh_from_db()
    print(f"   Order A STATUS: {order_a.order_status} (Expected: confirmed)")
    print(f"   Payment A STATUS: {order_a.payment_status} (Expected: paid)")
    
    # Case B: Shortfall outside $4 tolerance (Refunded)
    print("\nCase B: Testing shortfall outside $4 tolerance ($5.00 shortfall)...")
    expected_amount = Decimal('0.001') # $100.00
    received_amount = Decimal('0.00095') # $95.00 ($5 shortfall)
    
    order_b = Order.objects.create(
        buyer=buyer, vendor=vendor, product=product, quantity=1,
        unit_price=expected_amount, total_amount=expected_amount,
        crypto_currency="BTC", refund_address="buyer_wallet",
        order_status="pending_payment", payment_status="pending"
    )
    
    pa_b = PaymentAddress.objects.create(
        order_id=order_b.order_id, payment_address="addr_b",
        crypto_currency=crypto, expected_amount=expected_amount,
        expires_at=timezone.now() + timedelta(hours=1)
    )
    
    payment_b = DirectPayment.objects.create(
        order=order_b, vendor=vendor, buyer=buyer,
        amount=expected_amount, crypto_currency=crypto,
        vendor_address="vendor_wallet", status='pending',
        expires_at=timezone.now() + timedelta(hours=1)
    )

    monitor._confirm_payment(payment=payment_b, source="test", confirmations=1, tx_hash="tx_b", amount=received_amount)

    order_b.refresh_from_db()
    print(f"   Order B STATUS: {order_b.order_status} (Expected: refunded)")
    print(f"   Payment B STATUS: {order_b.payment_status} (Expected: refunded)")

    print("\n--- Test Complete ---")

if __name__ == "__main__":
    run_test()
