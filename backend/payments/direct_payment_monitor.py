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
            # ONLY monitor payments within the last 2 hours to avoid re-processing old orders
            window = timezone.now() - timedelta(hours=2)
            # Fetch ONLY pending/expired to avoid double-triggering confirmed/processing tasks
            payments = DirectPayment.objects.filter(
                Q(status__in=['pending', 'expired']), 
                created_at__gt=window
            ).select_related('order', 'crypto_currency', 'vendor')
            
            if not payments.exists(): return
            
            # Only log if we found something relevant to avoid log spam
            # logger.info(f"🚀 SCANNER: Monitoring {payments.count()} orders...")
            current_height = self._get_current_btc_height()

            for payment in payments:
                # CRITICAL: Always refresh from DB to avoid overwriting a status updated by a worker
                try:
                    payment.refresh_from_db()
                except Exception:
                    continue
                
                # If it's already completed or failed, skip it
                if payment.status in ['completed', 'failed']:
                    continue

                # Status rescue and triggering is now handled inside _confirm_payment
                
                if payment.crypto_currency.symbol == 'BTC':
                    self._monitor_btc_payment(payment, current_height)
                elif payment.crypto_currency.symbol == 'XMR':
                    self._monitor_xmr_payment(payment)
            
        except Exception as e:
            logger.error(f"Error in monitor loop: {e}")

    def monitor_pending_payment_addresses(self):
        """Monitor Escrow payout addresses"""
        try:
            # ONLY monitor payment addresses within the last 2 hours
            window = timezone.now() - timedelta(hours=2)
            pending_addresses = PaymentAddress.objects.filter(
                status__in=['pending', 'expired', 'processing'],
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
                invoice_data = self.btcpay_service.get_invoice_status(pa.btcpay_invoice_id)
                if invoice_data and isinstance(invoice_data, dict):
                    status_str = invoice_data.get('status')
                    logger.info(f"BTCPay Invoice {pa.btcpay_invoice_id} status: {status_str}")
                    
                    if status_str in ['Settled', 'Confirmed', 'Processing']:
                        # Determine confirmations
                        # If Settled/Confirmed, we can assume enough confs
                        # If Processing, it might be 0-conf or partial
                        confs = required_confs if status_str in ['Settled', 'Confirmed'] else 0
                        
                        # Only confirm if it's actually settled (or has enough confs)
                        # This aligns with user request for "Only on Settlement"
                        if status_str in ['Settled', 'Confirmed']:
                            self._confirm_payment(payment, f"btcpay_{status_str}", confs)
                            return
                        else:
                            # Just update confirmations but don't mark as 'paid' yet
                            self._update_confirmations_only(payment, confs)
                            return

            # 2. Blockchain Fallback (Strict Address/Amount Filter)
            # CRITICAL FIX: Use pa.payment_address (PLATFORM DEPOSIT) not payment.vendor_address (VENDOR PAYOUT)
            deposit_address = pa.payment_address
            if not deposit_address or deposit_address == "GIVEAWAY_FREE_ORDER":
                return

            transactions = self._get_blockchain_transactions(deposit_address)
            matched = self._match_btc_transaction(transactions, deposit_address, payment.amount, current_height)
            
            if matched:
                # Only mark as confirmed if confirmations >= required
                if matched['confirmations'] >= required_confs:
                    self._confirm_payment(payment, "blockchain_api", matched['confirmations'], matched['txid'], amount=matched['amount'])
                else:
                    self._update_confirmations_only(payment, matched['confirmations'], matched['txid'], amount=matched['amount'])
                
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
            # CRITICAL: Trigger if we are moving OUT of pending/expired 
            # OR if it's been in 'confirmed'/'processing' for too long without completion
            stuck_threshold = timezone.now() - timedelta(minutes=5)
            is_stuck = payment.status in ['confirmed', 'processing'] and payment.updated_at < stuck_threshold
            needs_trigger = payment.status in ['pending', 'expired'] or is_stuck
            
            if is_stuck or (payment.status != 'completed' and payment.status != 'processing'):
                 # logger.info(f"Monitoring {payment.order.order_id}: status={payment.status}, needs_trigger={needs_trigger}")
                 pass
            
            if is_stuck:
                logger.warning(f"RESCUING STUCK PAYOUT: {payment.order.order_id} (status: {payment.status}, last_update: {payment.updated_at})")
            
            with transaction.atomic():
                # CRITICAL: Re-check status inside the atomic block to prevent overwriting 'completed'
                db_payment = DirectPayment.objects.select_for_update().get(id=payment.id)
                if db_payment.status == 'completed':
                    return

                # Re-evaluate trigger needs with FRESH data
                stuck_threshold = timezone.now() - timedelta(minutes=5)
                is_stuck = db_payment.status in ['confirmed', 'processing'] and db_payment.updated_at < stuck_threshold
                actually_needs_trigger = db_payment.status in ['pending', 'expired'] or is_stuck
                
                # Use .update() for non-status-changing updates to avoid poisoning 'updated_at'
                update_data = {}
                if confirmations is not None: update_data['confirmations'] = confirmations
                # CRITICAL: Only update transaction_hash if it's currently empty.
                # Never overwrite it, as it might contain the payout hash after sending.
                if tx_hash and not db_payment.transaction_hash: 
                    update_data['transaction_hash'] = tx_hash
                if amount: update_data['amount'] = amount
                
                if actually_needs_trigger:
                    db_payment.status = 'confirmed'
                    db_payment.confirmed_at = db_payment.confirmed_at or timezone.now()
                    db_payment.updated_at = timezone.now()
                    db_payment.save(update_fields=['status', 'confirmed_at', 'updated_at'])
                    needs_trigger = True # Signal for Celery trigger below
                elif update_data:
                    DirectPayment.objects.filter(id=payment.id).update(**update_data)
                    needs_trigger = False
                else:
                    needs_trigger = False
                
                # Payment Address update (safe to save() as it's not used for payout debounce)
                pa = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
                if pa:
                    if confirmations is not None: pa.confirmations = confirmations
                    if tx_hash: pa.transaction_hash = tx_hash
                    # CRITICAL: Only set to 'paid' (which triggers toast) for completed confirmations
                    pa.status = 'paid'
                    pa.confirmed_at = timezone.now()
                    if amount: pa.received_amount = float(amount)
                    pa.save()

                # Update Order Status
                order = payment.order
                order.payment_status = 'paid'
                # Map 'pending_payment' to 'paid'
                if order.order_status in ['pending', 'pending_payment']:
                    order.order_status = 'paid'
                order.save()
                
                if needs_trigger:
                    from .tasks import process_non_escrow_payout
                    # logger.info(f"💰 TRIGGERING PAYOUT: {order.order_id} (Source: {source}, Stuck Rescue: {is_stuck})")
                    process_non_escrow_payout.delay(order.order_id, is_settled=True)
        except Exception as e:
            logger.error(f"Confirmation error: {e}")

    def _update_confirmations_only(self, payment, confirmations, tx_hash=None, amount=None):
        """Update confirmations on DB records without triggering 'paid' status/toast"""
        try:
            # Update PaymentAddress
            pa = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
            if pa:
                if confirmations is not None: pa.confirmations = confirmations
                if tx_hash: pa.transaction_hash = tx_hash
                if amount: pa.received_amount = float(amount)
                # Keep status as pending/partial to avoid premature toast
                pa.save()
            
            # Update DirectPayment
            DirectPayment.objects.filter(id=payment.id).update(
                confirmations=confirmations or 0,
                transaction_hash=tx_hash or payment.transaction_hash
            )
        except Exception as e:
            logger.error(f"Error updating confirmations: {e}")

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
