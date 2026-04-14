from django.db import models
from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import Payout, DirectPayment, AdminWithdrawal, EscrowPayment
from payments.commission_models import CommissionSettings
from payments.services import PaymentService
from shared.whatsapp_service import WhatsAppService
from shared.models import CryptoCurrency
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Performs daily profit sweep to admin personal wallets'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting daily profit sweep...'))
        
        settings = CommissionSettings.get_settings()
        if not settings.auto_sweep_enabled:
            self.stdout.write(self.style.WARNING('Auto-sweep is disabled in settings. Skipping.'))
            return

        ps = PaymentService()
        wa = WhatsAppService()
        
        # We sweep BTC and XMR if addresses are provided
        cryptos_to_sweep = []
        if settings.auto_sweep_btc_address:
            cryptos_to_sweep.append(('BTC', settings.auto_sweep_btc_address))
        if settings.auto_sweep_xmr_address:
            cryptos_to_sweep.append(('XMR', settings.auto_sweep_xmr_address))

        if not cryptos_to_sweep:
            self.stdout.write(self.style.WARNING('No sweep addresses configured. Skipping.'))
            return

        for symbol, destination in cryptos_to_sweep:
            try:
                self.process_sweep(ps, wa, settings, symbol, destination)
            except Exception as e:
                logger.error(f"Error sweeping {symbol}: {e}")
                self.stdout.write(self.style.ERROR(f"Error sweeping {symbol}: {e}"))

    def process_sweep(self, ps, wa, settings, symbol, destination):
        self.stdout.write(f"Processing sweep for {symbol}...")
        
        # 1. Calculate Wallet Reality
        balances = ps.get_realtime_balances()
        wallet_balance = balances.get(symbol, Decimal('0'))
        
        # 2. Calculate Vendor Obligations (Must NOT touch)
        # a) Pending Payouts
        pending_payouts_sum = Payout.objects.filter(
            crypto_currency__symbol=symbol, 
            status__in=['pending', 'processing', 'failed']
        ).aggregate(sum=models.Sum('net_amount'))['sum'] or Decimal('0')
        
        # b) Active Escrows (Gross amount held in wallet)
        # EscrowPayment links to PaymentAddress which has received amount
        from django.db.models import Sum
        active_escrows_sum = EscrowPayment.objects.filter(
            status__in=['active', 'disputed'],
            payment_address__crypto_currency__symbol=symbol
        ).aggregate(sum=Sum('payment_address__received_amount'))['sum'] or Decimal('0')
        
        total_vendor_obligations = pending_payouts_sum + active_escrows_sum
        
        # 3. Calculate Maximum Safe Available
        # Buffer for transaction fees
        buffer = settings.auto_sweep_min_buffer if symbol == 'BTC' else Decimal('0.001')
        
        max_safe_available = max(Decimal('0'), wallet_balance - total_vendor_obligations - buffer)
        
        if max_safe_available <= 0:
            self.stdout.write(self.style.WARNING(f"Insufficient sweepable balance for {symbol} (Wallet: {wallet_balance}, Owed: {total_vendor_obligations}, Buffer: {buffer})"))
            return
            
        # 3.5. Ensure Admin profit is at least ~$50
        # Convert crypto amount to USD dynamically using existing live API fetcher
        try:
            usd_rate = ps.get_fiat_to_crypto_rate(symbol, 'USD')
            usd_value = max_safe_available * usd_rate
            
            if usd_value < Decimal('50'):
                self.stdout.write(self.style.WARNING(
                    f"Skipping {symbol} sweep: Admin profit is only ${usd_value:.2f} (Minimum required: $50.00)"
                ))
                return
            
            self.stdout.write(f"Admin profit for {symbol} is ${usd_value:.2f} (Meets $50 threshold)")
        except Exception as e:
            logger.error(f"Failed to get exact USD rate for {symbol}, proceeding with manual fallback. Error: {e}")
            self.stdout.write(self.style.WARNING(f"Warning: USD Rate check failed for {symbol}"))

        # 4. Perform ACTUAL BROADCAST
        self.stdout.write(self.style.SUCCESS(f"Broadcasting {max_safe_available} {symbol} to {destination}..."))
        
        actual_tx_hash = None
        if symbol == 'BTC':
            payout_data = {'destination': destination, 'amount': str(max_safe_available)}
            result = ps.btcpay.create_payout(payout_data)
            if result and result.get('transactionHash'):
                actual_tx_hash = result.get('transactionHash')
        elif symbol == 'XMR':
            atomic_amount = int(max_safe_available * Decimal('1000000000000'))
            result = ps.monero.send_transaction([{'address': destination, 'amount': atomic_amount}])
            if result and result.get('tx_hash'):
                actual_tx_hash = result.get('tx_hash')

        if not actual_tx_hash:
            raise Exception(f"Broadcast failed for {symbol}. Check wallet balance/connectivity.")

        # 5. Log as Admin Withdrawal (Self-attributed to a system/admin user)
        # Finding an admin user to attribute this to (ideally the superuser or first admin)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        system_admin = User.objects.filter(user_type='admin', is_superuser=True).first() or \
                       User.objects.filter(user_type='admin').first()
        
        crypto_obj = CryptoCurrency.objects.get(symbol=symbol)
        AdminWithdrawal.objects.create(
            admin=system_admin,
            amount=max_safe_available,
            crypto_currency=crypto_obj,
            ip_address='127.0.0.1',
            transaction_hash=actual_tx_hash,
            destination_address=destination,
            notes=f"DAILY AUTO-SWEEP: Collected platform earnings.",
            user_agent="SYSTEM_CRON_AUTO_SWEEP"
        )
        
        # 6. Notify via WhatsApp
        msg = f"✅ PROFT SWEEP SUCCESSFUL!\n\nSymbol: {symbol}\nAmount: {max_safe_available}\nTX: {actual_tx_hash[:10]}...\nDestination: {destination[:10]}..."
        wa.send_message(settings.auto_sweep_whatsapp_number, msg)
        
        self.stdout.write(self.style.SUCCESS(f"Sweep completed for {symbol}! TX: {actual_tx_hash}"))
