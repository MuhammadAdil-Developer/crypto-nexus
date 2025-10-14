"""
Management command to manually run direct payment monitoring
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.direct_payment_monitor import direct_payment_monitor
from payments.models import DirectPayment


class Command(BaseCommand):
    help = 'Manually run direct payment monitoring'

    def add_arguments(self, parser):
        parser.add_argument(
            '--simulate',
            action='store_true',
            help='Simulate payment detection for testing'
        )
        parser.add_argument(
            '--payment-id',
            type=str,
            help='Payment ID to simulate (required with --simulate)'
        )

    def handle(self, *args, **options):
        if options['simulate']:
            self.simulate_payment(options)
        else:
            self.run_monitoring()

    def run_monitoring(self):
        """Run the direct payment monitoring"""
        self.stdout.write(self.style.SUCCESS('=== Running Direct Payment Monitoring ==='))
        
        # Check pending payments first
        pending_count = DirectPayment.objects.filter(
            status='pending',
            expires_at__gt=timezone.now()
        ).count()
        
        self.stdout.write(f"Found {pending_count} pending direct payments")
        
        if pending_count == 0:
            self.stdout.write(self.style.WARNING('No pending payments to monitor'))
            return
        
        # Run monitoring
        try:
            direct_payment_monitor.monitor_pending_direct_payments()
            self.stdout.write(self.style.SUCCESS('✅ Monitoring completed successfully'))
            
            # Check results
            updated_count = DirectPayment.objects.filter(status='confirmed').count()
            self.stdout.write(f"Total confirmed payments: {updated_count}")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Monitoring failed: {e}'))

    def simulate_payment(self, options):
        """Simulate payment detection"""
        payment_id = options.get('payment_id')
        
        if not payment_id:
            self.stdout.write(self.style.ERROR('--payment-id is required with --simulate'))
            return
        
        self.stdout.write(f'Simulating payment detection for payment {payment_id}...')
        
        try:
            success = direct_payment_monitor.simulate_payment_detection(payment_id, "test_tx_123")
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'✅ Payment {payment_id} marked as confirmed'))
                
                # Show updated details
                payment = DirectPayment.objects.get(id=payment_id)
                self.stdout.write(f"""
Updated Payment Details:
- Status: {payment.status}
- Transaction Hash: {payment.transaction_hash}
- Platform Fee: {payment.platform_fee} {payment.crypto_currency.symbol}
- Escrow Fee: {payment.escrow_fee} {payment.crypto_currency.symbol}
- Net Amount: {payment.net_amount} {payment.crypto_currency.symbol}
""")
            else:
                self.stdout.write(self.style.ERROR(f'❌ Failed to simulate payment detection'))
                
        except DirectPayment.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Payment {payment_id} not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))


