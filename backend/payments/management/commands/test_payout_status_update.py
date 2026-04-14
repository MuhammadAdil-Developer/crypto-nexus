from django.core.management.base import BaseCommand
from orders.models import Order
from payments.models import Payout, PaymentAddress
from payments.services import PayoutService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test payout status update when order becomes paid'

    def add_arguments(self, parser):
        parser.add_argument('--order-id', type=str, help='Order ID to test')

    def handle(self, *args, **options):
        order_id = options.get('order_id')
        
        if not order_id:
            self.stdout.write("Usage:")
            self.stdout.write("  python manage.py test_payout_status_update --order-id ORD-XXXXX")
            return
        
        try:
            # Get order
            order = Order.objects.get(order_id=order_id)
            self.stdout.write(f"Found order: {order.order_id}")
            self.stdout.write(f"  Order Status: {order.order_status}")
            self.stdout.write(f"  Payment Status: {order.payment_status}")
            self.stdout.write(f"  Use Escrow: {order.use_escrow}")
            
            if not order.use_escrow:
                self.stdout.write(self.style.WARNING("Order is not an escrow order. Skipping."))
                return
            
            # Check payout
            payout = Payout.objects.filter(order=order, payout_type='escrow').first()
            if not payout:
                self.stdout.write(self.style.ERROR("No escrow payout found for this order."))
                return
            
            self.stdout.write(f"Found payout: {payout.id}")
            self.stdout.write(f"  Payout Status: {payout.status}")
            self.stdout.write(f"  Created: {payout.requested_at}")
            
            # Check payment address
            try:
                payment_address = PaymentAddress.objects.get(order_id=order_id)
                self.stdout.write(f"Found payment address: {payment_address.id}")
                self.stdout.write(f"  Payment Address Status: {payment_address.status}")
                self.stdout.write(f"  Expected Amount: {payment_address.expected_amount}")
                self.stdout.write(f"  Received Amount: {payment_address.received_amount}")
                
                # Test payout status update
                if payment_address.status == 'paid':
                    self.stdout.write(self.style.SUCCESS("Payment is confirmed. Testing payout status update..."))
                    
                    payout_service = PayoutService()
                    success = payout_service.create_escrow_payout(order_id)
                    
                    if success:
                        # Refresh payout from database
                        payout.refresh_from_db()
                        self.stdout.write(self.style.SUCCESS(f"✅ Payout status updated to: {payout.status}"))
                    else:
                        self.stdout.write(self.style.ERROR("❌ Failed to update payout status"))
                else:
                    self.stdout.write(self.style.WARNING(f"Payment not confirmed yet. Status: {payment_address.status}"))
                    
            except PaymentAddress.DoesNotExist:
                self.stdout.write(self.style.ERROR("No payment address found for this order."))
                
        except Order.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Order with ID {order_id} not found."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
