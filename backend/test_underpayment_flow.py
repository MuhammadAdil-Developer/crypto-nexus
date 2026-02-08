
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
    print("\n--- Starting Underpayment & Refund System Test ---\n")
    User = get_user_model()

    # 1. Setup Test Data
    print("1. Setting up test data (Buyer, Vendor, Product)...")
    
    # Create or get users
    buyer, _ = User.objects.get_or_create(username="test_buyer", defaults={'email': 'buyer@test.com'})
    vendor, _ = User.objects.get_or_create(username="test_vendor", defaults={'email': 'vendor@test.com', 'user_type': 'vendor'})
    
    # Create dummy product
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

    # Ensure Crypto exists
    crypto, _ = CryptoCurrency.objects.get_or_create(symbol="BTC", defaults={'name': 'Bitcoin'})

    # 2. Create Order with Refund Address
    print("2. Creating Order with Refund Address 'buyer_refund_wallet_123'...")
    order = Order.objects.create(
        buyer=buyer,
        vendor=vendor,
        product=product,
        quantity=1,
        unit_price=Decimal('0.005'), # Added unit_price
        total_amount=Decimal('0.005'), # Expected 0.005 BTC
        crypto_currency="BTC",
        refund_address="buyer_refund_wallet_123", # <--- CRITICAL
        order_status="pending_payment",
        payment_status="pending"
    )


    # 3. Create Payment Address (Platform Deposit Address)
    pa = PaymentAddress.objects.create(
        order_id=order.order_id,
        payment_address="platform_wallet_abc",
        crypto_currency=crypto,
        expected_amount=Decimal('0.005'),
        expires_at=timezone.now() + timedelta(hours=1)
    )

    # 4. Create DirectPayment Record (Vendor Payout placeholder)
    # The monitor uses this record to track the transaction state
    payment = DirectPayment.objects.create(
        order=order,
        vendor=vendor,
        buyer=buyer,
        amount=Decimal('0.005'), # Expected Amount
        amount_received=Decimal('0.00000000'), 
        crypto_currency=crypto,
        vendor_address="vendor_wallet_xyz",
        status='pending',
        expires_at=timezone.now() + timedelta(hours=1)
    )

    print(f"   Order ID: {order.order_id}")
    print(f"   Expected Amount: {payment.amount} BTC")

    # 5. Simulate Partial Payment Trigger
    received_amount = Decimal('0.003') # <--- UNDERPAYMENT (0.003 < 0.005)
    print(f"\n3. Simulating Blockchain Confirmation of {received_amount} BTC (Underpayment)...")

    monitor = DirectPaymentMonitor()
    
    # Manually trigger the confirmation logic with the partial amount
    # This simulates what happens when the blockchain scanner finds a matching transaction
    monitor._confirm_payment(
        payment=payment, 
        source="test_script", 
        confirmations=1, 
        tx_hash="tx_hash_test_123", 
        amount=received_amount
    )

    # 6. Verify Results
    print("\n4. Verifying Results...")
    
    # Refresh objects from DB
    order.refresh_from_db()
    payment.refresh_from_db()
    pa.refresh_from_db()

    print(f"   Order Status: {order.order_status} (Expected: pending_payment)")
    print(f"   Payment Status: {order.payment_status} (Expected: partial)")
    
    if order.payment_status == 'partial':
        print("   [SUCCESS] Order correctly marked as Partial.")
    else:
        print(f"   [FAILURE] Order status is {order.payment_status}")

    # Check for Refund Payout
    refund_payout = Payout.objects.filter(order=order, payout_type='refund').first()
    
    if refund_payout:
        print(f"   [SUCCESS] Refund Payout created!")
        print(f"      - Payout ID: {refund_payout.id}")
        print(f"      - Amount: {refund_payout.gross_amount}")
        print(f"      - Target Address: {refund_payout.vendor_address} (Should be buyer's refund address)")
        print(f"      - Status: {refund_payout.status}")
        
        if refund_payout.vendor_address == "buyer_refund_wallet_123":
             print("   [SUCCESS] Refund address matches buyer's address.")
        else:
             print("   [FAILURE] Refund sent to wrong address.")
             
    else:
        print("   [FAILURE] No Refund Payout created.")

    print("\n--- Test Complete ---")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"[CRASH] Test Crashed: {e}")
        import traceback
        traceback.print_exc()

