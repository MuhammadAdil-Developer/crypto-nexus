from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order


class Command(BaseCommand):
    help = 'Fix paid orders that are missing product credentials'

    def add_arguments(self, parser):
        parser.add_argument('--order-id', type=str, help='Specific order ID to fix')
        parser.add_argument('--all', action='store_true', help='Fix all paid orders missing credentials')

    def handle(self, *args, **options):
        if options['order_id']:
            # Fix specific order
            order_id = options['order_id']
            self.stdout.write(f"Fixing credentials for order: {order_id}")
            
            try:
                order = Order.objects.get(order_id=order_id)
                self._fix_order_credentials(order)
            except Order.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"❌ Order {order_id} not found")
                )
        
        elif options['all']:
            # Fix all paid orders missing credentials
            self.stdout.write("Fixing credentials for all paid orders...")
            
            # Find all paid orders without credentials
            paid_orders = Order.objects.filter(
                order_status='paid',
                product_credentials__isnull=True
            ).exclude(product_credentials={})
            
            self.stdout.write(f"Found {paid_orders.count()} paid orders missing credentials")
            
            for order in paid_orders:
                self.stdout.write(f"\nProcessing order: {order.order_id}")
                self._fix_order_credentials(order)
        
        else:
            # Show help
            self.stdout.write("Usage:")
            self.stdout.write("  python manage.py fix_paid_orders_credentials --order-id ORD-123456")
            self.stdout.write("  python manage.py fix_paid_orders_credentials --all")
            
            # Show current status
            self.stdout.write("\nCurrent paid orders without credentials:")
            paid_orders = Order.objects.filter(
                order_status='paid',
                product_credentials__isnull=True
            ).exclude(product_credentials={})
            
            for order in paid_orders:
                self.stdout.write(f"  - Order: {order.order_id}, Product: {order.product.headline}")

    def _fix_order_credentials(self, order):
        """Fix credentials for a specific order"""
        try:
            if order.order_status != 'paid':
                self.stdout.write(f"  ⚠️  Order {order.order_id} is not paid (status: {order.order_status})")
                return
            
            if order.product_credentials:
                self.stdout.write(f"  ⚠️  Order {order.order_id} already has credentials")
                return
            
            if not order.product.credentials:
                self.stdout.write(f"  ⚠️  Product {order.product.headline} has no credentials")
                return
            
            # Set product credentials
            order.product_credentials = {
                'credentials': order.product.credentials,
                'delivered_at': timezone.now().isoformat(),
                'delivery_method': order.product.delivery_time,
                'additional_info': order.product.additional_info or '',
                'notes': order.product.notes_for_buyer or ''
            }
            order.product.credentials_visible = True
            order.product.save()
            order.save()
            
            self.stdout.write(f"  ✅ Credentials set for order {order.order_id}")
            
        except Exception as e:
            self.stdout.write(f"  ❌ Error fixing order {order.order_id}: {str(e)}")
