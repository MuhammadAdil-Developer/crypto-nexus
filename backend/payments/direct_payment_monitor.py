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
        """Monitor ALL payments (24h window) with stuck recovery logic"""
        try:
            # Monitor payments within the last 24 hours to ensure recovery of stalled orders.
            window = timezone.now() - timedelta(days=1)
            # Include confirmed and processing to rescue stuck tasks via _confirm_payment's is_stuck logic
            payments = DirectPayment.objects.filter(
                Q(status__in=['pending', 'expired', 'confirmed', 'processing']), 
                created_at__gt=window
            ).select_related('order', 'crypto_currency', 'vendor')
            
            if not payments.exists(): return
            
            # Group monitoring to prevent massive blocking loops
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
            # Monitor payment addresses within the last 24 hours
            window = timezone.now() - timedelta(days=1)
            pending_addresses = PaymentAddress.objects.filter(
                status__in=['pending', 'expired', 'processing', 'partial'],
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
            
            pa = PaymentAddress.objects.filter(
                Q(order_id=payment.order.order_id) | Q(linked_order_ids__contains=payment.order.order_id)
            ).first()
            if not pa: return

            # 1. BTCPay Check
            if pa.btcpay_invoice_id:
                invoice_data = self.btcpay_service.get_invoice_status(pa.btcpay_invoice_id)
                if invoice_data and isinstance(invoice_data, dict):
                    status_str = invoice_data.get('status')
                    additional_status = invoice_data.get('additionalStatus')
                    logger.info(f"BTCPay Invoice {pa.btcpay_invoice_id} status: {status_str}, additionalStatus: {additional_status}")
                    
                    # Treat 'Settled', 'Confirmed' OR 'Expired' with 'PaidLate' as a success
                    is_success = status_str in ['Settled', 'Confirmed'] or (status_str == 'Expired' and additional_status == 'PaidLate')
                    
                    if is_success:
                        # Determine confirmations
                        # If Settled/Confirmed or PaidLate, we assume enough confirmations for payout
                        confs = required_confs
                        
                        logger.info(f"✅ SUCCESS DETECTED: {pa.btcpay_invoice_id} is {status_str} (PaidLate: {additional_status == 'PaidLate'})")
                        self._confirm_payment(payment, f"btcpay_{status_str}", confs)
                        return
                    elif status_str == 'Processing':
                        # Fetch the actual amount paid so far (including unconfirmed)
                        paid_amount = self.btcpay_service.get_total_paid_amount(pa.btcpay_invoice_id)
                        # Just update confirmations and amount to hide cancel button in frontend
                        self._update_confirmations_only(payment, 0, amount=paid_amount)
                        return

            # 2. Blockchain Fallback (Strict Address/Amount Filter)
            # CRITICAL FIX: Use pa.payment_address (PLATFORM DEPOSIT) not payment.vendor_address (VENDOR PAYOUT)
            deposit_address = pa.payment_address
            if not deposit_address or deposit_address == "GIVEAWAY_FREE_ORDER":
                return

            logger.info(f"Checking blockchain fallback for {deposit_address} (Order: {payment.order.order_id})")
            transactions = self._get_blockchain_transactions(deposit_address)
            logger.info(f"Blockchain API returned {len(transactions)} transactions for {deposit_address}")
            
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
            pa = PaymentAddress.objects.filter(
                Q(order_id=payment.order.order_id) | Q(linked_order_ids__contains=payment.order.order_id)
            ).first()
            if not pa: return
            
            if not self.monero_service:
                from .services import MoneroRPCService
                self.monero_service = MoneroRPCService()

            incoming = self.monero_service.get_incoming_transfers(pa.payment_address)
            sub_index = pa.monero_subaddress_index
            matched = self._match_xmr_transaction(incoming, sub_index)
            
            if matched:
                confs = matched.get('confirmations', 0)
                # Use settings for required XMR confirmations (default 10)
                from django.conf import settings as django_settings
                req_confs = django_settings.REQUIRED_CONFIRMATIONS.get('XMR', 10)
                amount_xmr = Decimal(str(matched.get('amount', 0))) / Decimal('1000000000000')
                
                if confs >= req_confs:
                    self._confirm_payment(payment, "monero_rpc", confs, matched.get('txid'), amount=amount_xmr)
                else:
                    self._update_confirmations_only(payment, confs, matched.get('txid'), amount=amount_xmr)
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
            # NEVER auto-reset 'processing' status to avoid double-payout risk if task is slow
            stuck_threshold_rescue = timezone.now() - timedelta(minutes=15) # Increased threshold
            is_stuck = payment.status in ['confirmed', 'processing'] and payment.updated_at < stuck_threshold_rescue
            needs_trigger = payment.status in ['pending', 'expired'] or is_stuck
            
            if is_stuck or (payment.status != 'completed' and payment.status != 'processing'):
                 if is_stuck:
                     logger.warning(f"Rescuing stuck payment for order {payment.order.order_id} (Status: {payment.status})")
                 pass
            
            if is_stuck:
                logger.warning(f"RESCUING STUCK PAYOUT: {payment.order.order_id} (status: {payment.status}, last_update: {payment.updated_at})")
            
            with transaction.atomic():
                # CRITICAL: Re-check status inside the atomic block to prevent overwriting 'completed'
                db_payment = DirectPayment.objects.select_for_update().get(id=payment.id)
                if db_payment.status == 'completed':
                    return
                # Define order here for subsequent use
                order = db_payment.order
                
                # Re-evaluate trigger needs with FRESH data
                stuck_threshold = timezone.now() - timedelta(minutes=5)
                is_stuck = db_payment.status in ['confirmed', 'processing'] and db_payment.updated_at < stuck_threshold
                # ============================================================
                # CRITICAL: Payment Validation & Tolerance
                # ============================================================
                from orders.models import OrderStatus
                # Rely on order_status to understand if fulfillment occurred.
                # Do NOT trust payment_status = 'paid' here as it might be a temporary unconfirmed state.
                order_already_paid = order.order_status in [
                    OrderStatus.PAID.value, 
                    OrderStatus.CONFIRMED.value, 
                    OrderStatus.DELIVERED.value, 
                    'completed'
                ]
                credentials_delivered = order.product_credentials is not None and order.product_credentials != {}
                
                is_partial = False
                if order_already_paid or credentials_delivered:
                    logger.warning(f"⚠️ SAFETY: Order {order.order_id} already marked as PAID or credentials delivered. Skipping partial payment check.")
                    is_partial = False
                elif amount is not None:
                    # expected and received are in CRYPTO (BTC/XMR)
                    expected = Decimal(str(db_payment.amount))
                    received = Decimal(str(amount))
                    symbol = db_payment.crypto_currency.symbol
                    
                    is_partial = not self._is_within_tolerance(expected, received, symbol)
                    
                    if is_partial:
                        logger.warning(f"⚠️ PARTIAL PAYMENT: Order {order.order_id}. Expected {expected}, Received {received} {symbol}")
                    else:
                        if received < expected:
                            logger.info(f"✅ TOLERATED UNDERPAYMENT: Order {order.order_id}. Shortfall within allowed limits.")
                
                # Payment Address lookup (Needed for bulk pro-rating below)
                pa = PaymentAddress.objects.filter(
                    Q(order_id=order.order_id) | Q(linked_order_ids__contains=order.order_id)
                ).first()

                # Use .update() for non-status-changing updates to avoid poisoning 'updated_at'
                update_data = {}
                if confirmations is not None: update_data['confirmations'] = confirmations
                if amount:
                    # PRO-RATE for bulk orders so amount_received reflects this order's share
                    global_expected = Decimal(str(pa.expected_amount if pa else db_payment.amount))
                    if pa and pa.linked_order_ids and global_expected > 0:
                        order_share = order.total_amount / global_expected
                        update_data['amount_received'] = amount * order_share
                    else:
                        update_data['amount_received'] = amount
                    # We also update the DirectPayment.amount if it was 0 for some reason 
                    # (though it should have been set at creation)
                
                if needs_trigger and not is_partial:
                    db_payment.status = 'confirmed'
                    db_payment.confirmed_at = db_payment.confirmed_at or timezone.now()
                    db_payment.updated_at = timezone.now()
                    db_payment.save(update_fields=['status', 'confirmed_at', 'updated_at'])
                    needs_trigger = True # Signal for Celery trigger below
                elif is_partial:
                    db_payment.status = 'refunded' # Stop monitoring this order once we trigger refund
                    db_payment.updated_at = timezone.now()
                    db_payment.save(update_fields=['status', 'updated_at'])
                    needs_trigger = False
                elif update_data:
                    DirectPayment.objects.filter(id=payment.id).update(**update_data)
                    needs_trigger = False
                else:
                    needs_trigger = False
                
                # Payment Address update
                if pa:
                    if confirmations is not None: pa.confirmations = confirmations
                    if tx_hash: pa.transaction_hash = tx_hash
                    
                    if is_partial:
                        pa.status = 'refunded'
                        pa.confirmed_at = timezone.now()
                    else:
                        pa.status = 'paid'
                        pa.confirmed_at = timezone.now()
                    
                    if amount: pa.received_amount = Decimal(str(amount))
                    pa.save()

                # Update Order Status ONLY if not partial
                if is_partial:
                    order.payment_status = 'refunded'
                    order.order_status = 'refunded'
                    order.dispute_reason = "partial"
                    order.save()
                    
                    # Create a RefundRequest object so it shows in the buyer dashboard /refund-requests
                    from payments.models import RefundRequest
                    if not RefundRequest.objects.filter(order=order).exists():
                        RefundRequest.objects.create(
                            order=order,
                            buyer=order.buyer,
                            vendor=order.vendor,
                            amount=received, # Fix: replaced received_crypto with received
                            refund_type='partial',
                            reason="partial",
                            notes=f"Auto-refund of underpaid blockchain detection. Received: {received}",
                            status='completed',
                            vendor_decision='approved',
                            vendor_decision_at=timezone.now(),
                            vendor_decision_notes="Auto-approved by system due to partial payment.",
                            completed_at=timezone.now()
                        )
                        logger.info(f"Created RefundRequest object for order {order.order_id}")
                    
                    # Create automatic refund if refund_address exists
                    refund_addr = order.refund_address
                    if not refund_addr:
                        # Fallback to user profile payout address if still empty
                        if payment.crypto_currency.symbol == 'BTC':
                            refund_addr = order.buyer.btc_payout_address
                        elif payment.crypto_currency.symbol == 'XMR':
                            refund_addr = order.buyer.xmr_payout_address
                        
                        if refund_addr:
                            order.refund_address = refund_addr
                            order.save()
                            logger.info(f"Recovered refund address from profile for order {order.order_id}: {refund_addr}")

                    if refund_addr:
                        from payments.models import Payout
                        # Check if a refund payout already exists for this order to avoid duplicates
                        if not Payout.objects.filter(order=order, payout_type='refund').exists():
                            # Calculations in Decimals
                            fee_pct = Decimal('0.03')
                            refund_gross = received # Fix: replaced received_crypto with received
                            refund_fee = refund_gross * fee_pct
                            refund_net = refund_gross - refund_fee
                            
                            payout = Payout.objects.create(
                                order=order,
                                vendor=order.vendor,
                                buyer=order.buyer,
                                payout_type='refund',
                                crypto_currency=payment.crypto_currency,
                                gross_amount=refund_gross,
                                net_amount=refund_net,
                                platform_fee=refund_fee,
                                vendor_address=order.refund_address, # Sending to buyer's refund address
                                status='pending',
                                admin_notes=f"Auto-refund for partial payment. Expected: {expected}, Received: {received}. Fee: {refund_fee} (3%)"
                            )
                            logger.info(f"[AUTO-REFUND] AUTO-REFUND QUEUED: Order {order.order_id} for {refund_net} {order.crypto_currency} to {order.refund_address}")
                            
                            # Trigger processing immediately
                            try:
                                from .tasks import process_payout_task
                                process_payout_task.delay(str(payout.id))
                            except Exception as e:
                                logger.warning(f"Failed to trigger auto-refund task (Redis might be down, but payout created): {e}")
                else:
                    order.payment_status = 'paid'
                    # Map 'pending_payment' to 'paid' (or 'confirmed' for auto-delivery)
                    if order.order_status in ['pending', 'pending_payment']:
                        if order.product.delivery_time == 'instant_auto':
                            order.order_status = 'confirmed' # Shows as "Completed"
                            order.delivered_at = timezone.now()
                            order.product_credentials = {
                                'credentials': order.product.credentials,
                                'delivered_at': timezone.now().isoformat(),
                                'delivery_method': 'auto'
                            }
                        else:
                            order.order_status = 'paid'
                    # CRITICAL: Handle auto-delivery for orders that were already marked as 'paid' but haven't received credentials
                    # This happens when payment is accepted with tolerance (underpayment within $5)
                    elif order.order_status == 'paid' and order.product.delivery_time == 'instant_auto':
                        if not order.product_credentials or order.product_credentials == {}:
                            logger.info(f"🎁 AUTO-DELIVERY: Order {order.order_id} was paid with tolerance, delivering credentials now...")
                            order.order_status = 'confirmed'  # Mark as completed
                            order.delivered_at = timezone.now()
                            order.product_credentials = {
                                'credentials': order.product.credentials,
                                'delivered_at': timezone.now().isoformat(),
                                'delivery_method': 'auto'
                            }
                order.save()
                
                if needs_trigger and not is_partial:
                    from .tasks import process_non_escrow_payout
                    logger.info(f"💰 TRIGGERING PAYOUT: {order.order_id} (Source: {source}, Stuck Rescue: {is_stuck})")
                    process_non_escrow_payout.delay(order.order_id, is_settled=True)
        except Exception as e:
            logger.error(f"Confirmation error: {e}")

    def _update_confirmations_only(self, payment, confirmations, tx_hash=None, amount=None):
        """Update confirmations on DB records and Mark Order as Paid/Partial to hide cancel button"""
        try:
            # Update PaymentAddress
            pa = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
            order = payment.order
            needs_save_order = False

            if pa:
                if confirmations is not None: pa.confirmations = confirmations
                if tx_hash: pa.transaction_hash = tx_hash
                if amount: 
                    pa.received_amount = Decimal(str(amount))
                    
                    # Check tolerance before marking it as paid to hide the cancel button.
                    # This prevents underpayments from poisoning the state.
                    if order.payment_status == 'pending':
                        expected = Decimal(str(payment.amount))
                        received = Decimal(str(amount))
                        symbol = payment.crypto_currency.symbol
                        
                        if self._is_within_tolerance(expected, received, symbol):
                            logger.info(f"🔍 DETECTED: Order {order.order_id} valid payment detected. Updating payment_status to hide cancel button.")
                            order.payment_status = 'paid'
                            needs_save_order = True
                        else:
                            logger.info(f"🔍 DETECTED: Order {order.order_id} PARTIAL payment detected ({received} / {expected}). Waiting for confirmation to refund.")
                
                pa.save()
            
            if needs_save_order:
                order.save()
            
            # direct_payment.transaction_hash must ONLY hold the OUTBOUND VENDOR PAYOUT hash.
            # Setting it to the buyer's incoming txid poisons the record and makes the system
            # believe the vendor payout was already sent, blocking all future payout attempts.
            # The buyer's incoming txid is safely stored in payment_address.transaction_hash.
            DirectPayment.objects.filter(id=payment.id).update(
                confirmations=confirmations or 0
            )
        except Exception as e:
            logger.error(f"Error updating confirmations: {e}")

    def _is_within_tolerance(self, expected, received, symbol):
        """Standardized tolerance check: $5.00 flat OR 10% percentage cushion"""
        try:
            from .services import get_current_price_usd
            current_price = get_current_price_usd(symbol)
            
            # If price fetch fails, use a generous 20% fallback cushion for safety
            if current_price <= 0:
                logger.warning(f"⚠️ Price fetch failed for {symbol}. Using emergency 20% tolerance.")
                return received >= (expected * Decimal('0.80'))

            # Rule: $5.00 cushion OR 10% of total (whichever is more generous)
            tolerance_crypto = max(Decimal('5.00') / current_price, expected * Decimal('0.10'))
            
            return received >= (expected - tolerance_crypto)
        except Exception as e:
            logger.error(f"Tolerance check error: {e}")
            return received >= expected # Default to strict if logic fails

    def _get_current_btc_height(self):
        try:
            r = requests.get("https://mempool.space/api/blocks/tip/height", timeout=5)
            if r.status_code == 200: return int(r.text)
        except: pass
        return 0

    def _get_blockchain_transactions(self, address):
        for url in [f"https://mempool.space/api/address/{address}/txs", f"https://blockstream.info/api/address/{address}/txs"]:
            try:
                r = requests.get(url, timeout=5)
                if r.status_code == 200: return r.json()
            except: continue
        return []

    def _match_btc_transaction(self, transactions, target_address, target_amount, current_height):
        target_sat = int(float(target_amount) * 1e8)
        target_addr_norm = target_address.lower() if target_address else ""
        
        for tx in transactions:
            txid = tx.get('txid')
            for out in tx.get('vout', []):
                out_addr = out.get('scriptpubkey_address', '')
                if out_addr and out_addr.lower() == target_addr_norm:
                    val_sat = out.get('value', 0)
                    logger.info(f"Checking output to {target_address} in tx {txid}: {val_sat} sat (Target: {target_sat})")
                    
                    # Log discrepancy if it exists
                    if target_sat > 0 and abs(val_sat - target_sat) > 500:
                         logger.warning(f"Partial/Over payment detected in tx {txid}: {val_sat} vs {target_sat}")
                    
                    confs = 0
                    status = tx.get('status', {})
                    if status.get('confirmed'):
                         block_h = status.get('block_height', 0)
                         confs = max(1, current_height - block_h + 1) if current_height > 0 else 1
                    
                    return {
                        'txid': txid, 
                        'confirmations': confs,
                        'amount': Decimal(str(val_sat)) / Decimal('100000000')
                    }
        return None
        return None

    def simulate_payment_detection(self, payment_id, tx_hash=None):
        try:
            p = DirectPayment.objects.get(id=payment_id)
            self._confirm_payment(p, "manual", 1, tx_hash)
            return True
        except: return False

direct_payment_monitor = DirectPaymentMonitor()
