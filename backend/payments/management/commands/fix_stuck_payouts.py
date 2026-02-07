"""
Management command to fix stuck payouts and direct payments
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from payments.models import Payout, DirectPayment
from payments.services import PayoutService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix stuck payouts and direct payments that should be completed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=2,
            help='Process payouts/payments older than X days (default: 2)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        days_threshold = options['days']
        
        cutoff_time = timezone.now() - timedelta(days=days_threshold)
        
        self.stdout.write(self.style.WARNING(f"\n{'DRY RUN - ' if dry_run else ''}Fixing stuck payouts older than {days_threshold} days..."))
        self.stdout.write(f"Cutoff time: {cutoff_time}\n")
        
        # Fix stuck Payouts (Escrow)
        stuck_payouts = Payout.objects.filter(
            created_at__lt=cutoff_time,
            status__in=['pending', 'ready', 'processing']
        ).exclude(
            order__order_status__in=['cancelled', 'refunded', 'disputed']
        ).exclude(
            payout_type='refund'  # Don't auto-complete refunds
        )
        
        self.stdout.write(f"\nFound {stuck_payouts.count()} stuck Payouts (Escrow)")
        
        for payout in stuck_payouts:
            age_days = (timezone.now() - payout.created_at).days
            self.stdout.write(
                f"  - Payout {payout.id} | Order: {payout.order.order_id} | "
                f"Status: {payout.status} | Age: {age_days} days | "
                f"Amount: {payout.gross_amount} {payout.crypto_currency.symbol}"
            )
            
            if not dry_run:
                # Mark as completed
                payout.status = 'completed'
                payout.completed_at = timezone.now()
                payout.save()
                self.stdout.write(self.style.SUCCESS(f"    ✓ Marked as completed"))
        
        # Fix stuck DirectPayments
        stuck_direct = DirectPayment.objects.filter(
            created_at__lt=cutoff_time,
            status__in=['pending', 'confirmed', 'processing']
        ).exclude(
            order__order_status__in=['cancelled', 'refunded', 'disputed']
        )
        
        self.stdout.write(f"\nFound {stuck_direct.count()} stuck DirectPayments")
        
        for payment in stuck_direct:
            age_days = (timezone.now() - payment.created_at).days
            self.stdout.write(
                f"  - DirectPayment {payment.id} | Order: {payment.order.order_id} | "
                f"Status: {payment.status} | Age: {age_days} days | "
                f"Amount: {payment.amount} {payment.crypto_currency.symbol}"
            )
            
            if not dry_run:
                # Mark as completed
                payment.status = 'completed'
                payment.completed_at = timezone.now()
                payment.save()
                self.stdout.write(self.style.SUCCESS(f"    ✓ Marked as completed"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n⚠️  This was a DRY RUN. No changes were made."))
            self.stdout.write("Run without --dry-run to apply fixes.\n")
        else:
            total_fixed = stuck_payouts.count() + stuck_direct.count()
            self.stdout.write(self.style.SUCCESS(f"\n✅ Fixed {total_fixed} stuck payments!\n"))
