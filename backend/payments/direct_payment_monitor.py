"""
Direct Payment Monitoring Service
"""

import logging
import requests
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from datetime import datetime, timedelta

from .models import DirectPayment, PaymentAddress
from orders.models import Order
from shared.models import CryptoCurrency

logger = logging.getLogger(__name__)

class DirectPaymentMonitor:
    def __init__(self):
        self.btcpay_service = None
        self.monero_service = None
        self._initialize_services()
    
    def _initialize_services(self):
        try:
            from .services import BTCPayServerService, MoneroRPCService
            self.btcpay_service = BTCPayServerService()
            self.monero_service = MoneroRPCService()
        except Exception as e:
            logger.error(f"Failed to initialize crypto services: {e}")

    def monitor_pending_direct_payments(self):
        """Monitor ALL payments (15d window) with ultra-strict logic"""
        try:
            window = timezone.now() - timedelta(days=15)
            # Fetch ALL matching status to rescue stuck ones
            payments = DirectPayment.objects.filter(
                Q(status__in=['pending', 'expired', 'confirmed', 'processing']), 
                created_at__gt=window
            ).select_related('order', 'crypto_currency', 'vendor')
            
            if not payments.exists(): return
            
            logger.info(f"🚀 SCANNER: Monitoring {payments.count()} orders...")
            current_height = self._get_current_btc_height()

            for payment in payments:
                # Rescue stuck 'processing' status after 20 mins
                if payment.status == 'processing' and payment.updated_at < timezone.now() - timedelta(minutes=20):
                    logger.warning(f"⚠️ RESCUING STUCK: {payment.order.order_id}")
                    # Confirmation logic will naturally reset status to 'payout_ready' if we call it
                
                if payment.crypto_currency.symbol == 'BTC':
                    self._monitor_btc_payment(payment, current_height)
                elif payment.crypto_currency.symbol == 'XMR':
                    self._monitor_xmr_payment(payment)
            
        except Exception as e:
            logger.error(f"Error in monitor loop: {e}")

    def monitor_pending_payment_addresses(self):
        """Monitor Escrow payout addresses"""
        try:
            window = timezone.now() - timedelta(days=15)
            pending_addresses = PaymentAddress.objects.filter(
                status__in=['pending', 'expired'],
                created_at__gt=window
            )
            for pa in pending_addresses:
                try:
                    from .services import PaymentService
                    PaymentService().check_payment_status(pa.order_id)
                except: pass
        except Exception as e:
            logger.error(f"Error in address monitor: {e}")

    def _monitor_btc_payment(self, payment, current_height):
        try:
            from django.conf import settings
            required_confs = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('BTC', 1)
            
            pa = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
            if not pa: return

            # 1. BTCPay Check
            if pa.btcpay_invoice_id:
                status = self.btcpay_service.get_invoice_status(pa.btcpay_invoice_id)
                if status in ['Settled', 'Confirmed', 'Processing']:
                    confs = required_confs if status != 'Processing' else 1
                    self._confirm_payment(payment, f"btcpay_{status}", confs)
                    return

            # 2. Blockchain Fallback (Strict Address/Amount Filter)
            transactions = self._get_blockchain_transactions(payment.vendor_address)
            matched = self._match_btc_transaction(transactions, payment.vendor_address, payment.amount, current_height)
            if matched:
                self._confirm_payment(payment, "blockchain_api", matched['confirmations'], matched['txid'], amount=matched['amount'])
                
        except Exception as e:
            logger.error(f"BTC Monitor error: {e}")

    def _monitor_xmr_payment(self, payment):
        try:
            from .models import PaymentAddress
            pa = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
            if not pa: return
            
            if not self.monero_service:
                from .services import MoneroRPCService
                self.monero_service = MoneroRPCService()

            incoming = self.monero_service.get_incoming_transfers(pa.payment_address)
            sub_index = pa.monero_subaddress_index
            matched = self._match_xmr_transaction(incoming, sub_index)
            
            if matched:
                confs = matched.get('confirmations', 0)
                amount_xmr = Decimal(str(matched.get('amount', 0))) / Decimal('1000000000000')
                self._confirm_payment(payment, "monero_rpc", confs, matched.get('txid'), amount=amount_xmr)
        except Exception as e:
            logger.error(f"XMR Monitor error: {e}")

    def _match_xmr_transaction(self, transfers, expected_subaddr_index):
        if not transfers: return None
        for t in transfers:
            t_idx_obj = t.get('subaddr_index')
            t_idx = t_idx_obj.get('minor') if isinstance(t_idx_obj, dict) else t_idx_obj
            if expected_subaddr_index is not None and str(t_idx) == str(expected_subaddr_index):
                return t
        return None

    def _confirm_payment(self, payment, source, confirmations=None, tx_hash=None, amount=None):
        try:
            # CRITICAL: Only trigger if we are moving OUT of pending/expired
            # If it's already processing/completed, we've already done our job.
            needs_trigger = payment.status in ['pending', 'expired']
            
            with transaction.atomic():
                # Update confirmations and amount
                if confirmations is not None: payment.confirmations = confirmations
                if tx_hash: payment.transaction_hash = tx_hash
                if amount: payment.amount = amount
                
                if needs_trigger:
                    payment.status = 'processing'
                    payment.confirmed_at = timezone.now()
                
                payment.save()
                
                pa = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
                if pa:
                    if confirmations is not None: pa.confirmations = confirmations
                    if tx_hash: pa.transaction_hash = tx_hash
                    pa.status = 'paid'
                    pa.confirmed_at = timezone.now()
                    if amount: pa.received_amount = float(amount)
                    pa.save()

                order = payment.order
                order.payment_status = 'paid'
                if order.order_status == 'pending':
                    order.order_status = 'completed'
                order.save()
                
                if needs_trigger:
                    from .tasks import process_non_escrow_payout
                    logger.info(f"💰 INITIAL TRIGGER: {order.order_id} ({source})")
                    process_non_escrow_payout.delay(order.order_id)
        except Exception as e:
            logger.error(f"Confirmation error: {e}")

    def _get_current_btc_height(self):
        try:
            r = requests.get("https://mempool.space/api/blocks/tip/height", timeout=5)
            if r.status_code == 200: return int(r.text)
        except: pass
        return 0

    def _get_blockchain_transactions(self, address):
        for url in [f"https://mempool.space/api/address/{address}/txs", f"https://blockstream.info/api/address/{address}/txs"]:
            try:
                r = requests.get(url, timeout=10)
                if r.status_code == 200: return r.json()
            except: continue
        return []

    def _match_btc_transaction(self, transactions, target_address, target_amount, current_height):
        target_sat = int(float(target_amount) * 1e8)
        for tx in transactions:
            for out in tx.get('vout', []):
                if out.get('scriptpubkey_address') == target_address:
                    val_sat = out.get('value', 0)
                    # Use STRICT amount match if amount > 0
                    if target_sat > 0 and abs(val_sat - target_sat) > 100:
                        continue # Skip if more than 100 sats difference
                        
                    confs = 0
                    status = tx.get('status', {})
                    if status.get('confirmed'):
                        block_h = status.get('block_height', 0)
                        confs = max(1, current_height - block_h + 1) if current_height > 0 else 1
                    return {
                        'txid': tx.get('txid'), 
                        'confirmations': confs,
                        'amount': Decimal(str(val_sat)) / Decimal('100000000')
                    }
        return None

    def simulate_payment_detection(self, payment_id, tx_hash=None):
        try:
            p = DirectPayment.objects.get(id=payment_id)
            self._confirm_payment(p, "manual", 1, tx_hash)
            return True
        except: return False

direct_payment_monitor = DirectPaymentMonitor()
