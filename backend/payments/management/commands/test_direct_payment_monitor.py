"""
Management command to test direct payment monitoring
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from payments.models import DirectPayment
from payments.direct_payment_monitor import direct_payment_monitor


class Command(BaseCommand):
    help = 'Test direct payment monitoring system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=['list', 'simulate', 'monitor', 'stats'],
            default='list',
            help='Action to perform'
        )
        parser.add_argument(
            '--payment-id',
            type=str,
            help='Payment ID for simulation'
        )
        parser.add_argument(
            '--tx-hash',
            type=str,
            help='Transaction hash for simulation'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'list':
            self.list_pending_payments()
        elif action == 'simulate':
            self.simulate_payment_detection(options)
        elif action == 'monitor':
            self.run_monitoring()
        elif action == 'stats':
            self.show_stats()

    def list_pending_payments(self):
        """List all pending direct payments"""
        self.stdout.write(self.style.SUCCESS('=== Pending Direct Payments ==='))
        
        pending_payments = DirectPayment.objects.filter(
            status='pending',
            expires_at__gt=timezone.now()
        ).select_related('order', 'vendor', 'crypto_currency')
        
        if not pending_payments.exists():
            self.stdout.write(self.style.WARNING('No pending direct payments found'))
            return
        
        for payment in pending_payments:
            self.stdout.write(f"""
Payment ID: {payment.id}
Order ID: {payment.order.order_id}
Vendor: {payment.vendor.username}
Amount: {payment.amount} {payment.crypto_currency.symbol}
Address: {payment.vendor_address}
Created: {payment.created_at}
Expires: {payment.expires_at}
Status: {payment.status}
---""")

    def simulate_payment_detection(self, options):
        """Simulate payment detection"""
        payment_id = options.get('payment_id')
        tx_hash = options.get('tx_hash')
        
        if not payment_id:
            self.stdout.write(self.style.ERROR('--payment-id is required for simulation'))
            return
        
        self.stdout.write(f'Simulating payment detection for payment {payment_id}...')
        
        success = direct_payment_monitor.simulate_payment_detection(payment_id, tx_hash)
        
        if success:
            self.stdout.write(self.style.SUCCESS(f'✅ Payment {payment_id} marked as confirmed'))
            
            # Show updated payment details
            try:
                payment = DirectPayment.objects.get(id=payment_id)
                self.stdout.write(f"""
Updated Payment Details:
- Status: {payment.status}
- Transaction Hash: {payment.transaction_hash}
- Confirmed At: {payment.confirmed_at}
- Platform Fee: {payment.platform_fee} {payment.crypto_currency.symbol}
- Escrow Fee: {payment.escrow_fee} {payment.crypto_currency.symbol}
- Net Amount: {payment.net_amount} {payment.crypto_currency.symbol}
""")
            except DirectPayment.DoesNotExist:
                self.stdout.write(self.style.ERROR('Payment not found after update'))
        else:
            self.stdout.write(self.style.ERROR(f'❌ Failed to simulate payment detection for {payment_id}'))

    def run_monitoring(self):
        """Run the monitoring process"""
        self.stdout.write('Running direct payment monitoring...')
        
        try:
            direct_payment_monitor.monitor_pending_direct_payments()
            self.stdout.write(self.style.SUCCESS('✅ Monitoring completed successfully'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Monitoring failed: {e}'))

    def show_stats(self):
        """Show direct payment statistics"""
        self.stdout.write(self.style.SUCCESS('=== Direct Payment Statistics ==='))
        
        try:
            stats = direct_payment_monitor.get_direct_payment_stats()
            
            self.stdout.write(f"""
Total Pending: {stats.get('total_pending', 0)}
Total Confirmed: {stats.get('total_confirmed', 0)}
Total Failed: {stats.get('total_failed', 0)}
Total Expired: {stats.get('total_expired', 0)}
Total Amount Confirmed: {stats.get('total_amount_confirmed', 0)}
Total Fees Collected: {stats.get('total_fees_collected', 0)}
""")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to get stats: {e}'))

