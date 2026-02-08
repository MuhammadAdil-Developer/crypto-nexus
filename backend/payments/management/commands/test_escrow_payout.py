from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order
from payments.models import PaymentAddress, EscrowPayment, Payout
from shared.models import CryptoCurrency
from decimal import Decimal


class Command(BaseCommand):
    help = 'Test escrow payout creation for existing paid orders'

    def add_arguments(self, parser):
        parser.add_argument('--order-id', type=str, help='Specific order ID to test')
        parser.add_argument('--all', action='store_true', help='Test all paid escrow orders')

    def handle(self, *args, **options):
        from payments.services import PayoutService
        
        payout_service = PayoutService()
        
        if options['order_id']:
            # Test specific order
            order_id = options['order_id']
            self.stdout.write(f"Testing escrow payout creation for order: {order_id}")
            
            try:
                success = payout_service.create_escrow_payout(order_id)
                if success:
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ Escrow payout created successfully for order {order_id}")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"❌ Failed to create escrow payout for order {order_id}")
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"❌ Error creating escrow payout: {str(e)}")
                )
        
        elif options['all']:
            # Test all paid escrow orders
            self.stdout.write("Testing escrow payout creation for all paid escrow orders...")
            
            # Find all paid orders with escrow enabled
            paid_escrow_orders = Order.objects.filter(
                use_escrow=True,
                payment_status='paid'
            )
            
            self.stdout.write(f"Found {paid_escrow_orders.count()} paid escrow orders")
            
            for order in paid_escrow_orders:
                self.stdout.write(f"\nProcessing order: {order.order_id}")
                
                # Check if payout already exists
                existing_payout = Payout.objects.filter(order=order, payout_type='escrow').first()
                if existing_payout:
                    self.stdout.write(f"  ⚠️  Payout already exists (ID: {existing_payout.id})")
                    continue
                
                try:
                    success = payout_service.create_escrow_payout(order.order_id)
                    if success:
                        self.stdout.write(f"  ✅ Escrow payout created successfully")
                    else:
                        self.stdout.write(f"  ❌ Failed to create escrow payout")
                except Exception as e:
                    self.stdout.write(f"  ❌ Error: {str(e)}")
        
        else:
            # Show help
            self.stdout.write("Usage:")
            self.stdout.write("  python manage.py test_escrow_payout --order-id ORD-123456")
            self.stdout.write("  python manage.py test_escrow_payout --all")
            
            # Show current escrow payouts
            self.stdout.write("\nCurrent escrow payouts:")
            payouts = Payout.objects.filter(payout_type='escrow')
            for payout in payouts:
                self.stdout.write(f"  - Order: {payout.order.order_id}, Status: {payout.status}, Amount: {payout.net_amount} {payout.crypto_currency.symbol}")
