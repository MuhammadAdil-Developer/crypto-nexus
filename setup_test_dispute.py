
import os
import django
import uuid
from django.utils import timezone
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User
from products.models import Product
from orders.models import Order
from payments.models import RefundRequest

def setup_test_data():
    # 1. Get or create a buyer and vendor
    buyer, _ = User.objects.get_or_create(username='test_buyer', defaults={'user_type': 'buyer', 'email': 'buyer@example.com'})
    vendor, _ = User.objects.get_or_create(username='test_vendor', defaults={'user_type': 'vendor', 'email': 'vendor@example.com'})
    
    if _:
        buyer.set_password('password123')
        buyer.save()
        vendor.set_password('password123')
        vendor.save()

    # 2. Get or create a product
    product, _ = Product.objects.get_or_create(
        vendor=vendor,
        defaults={
            'headline': 'Test Product for Dispute',
            'listing_title': 'Test Product',
            'price': Decimal('0.001'),
            'category': 'Digital',
            'is_active': True
        }
    )

    # 3. Create an Order
    order = Order.objects.create(
        buyer=buyer,
        vendor=vendor,
        product=product,
        order_id=f"TEST-{uuid.uuid4().hex[:6].upper()}",
        order_status='paid',
        payment_status='paid',
        total_amount=Decimal('0.001'),
        crypto_currency='BTC',
        quantity=1
    )

    # 4. Create a Rejected Refund Request
    refund = RefundRequest.objects.create(
        order=order,
        buyer=buyer,
        vendor=vendor,
        amount=order.total_amount,
        reason="Testing escalation fix",
        refund_type='full',
        status='vendor_rejected',
        vendor_decision='rejected',
        vendor_decision_notes="I will not refund this!",
        vendor_decision_deadline=timezone.now()
    )

    print(f"✅ Setup Complete!")
    print(f"Order ID (UUID): {order.id}")
    print(f"Order Display ID: {order.order_id}")
    print(f"Refund ID: {refund.id}")
    print(f"\nLogin as '{buyer.username}' with password 'password123'")
    print(f"Go to: /buyer/refund-requests")

if __name__ == "__main__":
    setup_test_data()
