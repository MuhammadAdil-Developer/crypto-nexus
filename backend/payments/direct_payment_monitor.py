"""
Direct Payment Monitoring Service

This service monitors vendor wallet addresses for incoming payments
and automatically updates order status when payments are detected.
"""

import logging
import requests
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from datetime import datetime, timedelta

from .models import DirectPayment
from orders.models import Order
from shared.models import CryptoCurrency

logger = logging.getLogger(__name__)


class DirectPaymentMonitor:
    """Monitor vendor wallets for direct payments"""
    
    def __init__(self):
        self.btcpay_service = None
        self.monero_service = None
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize crypto services"""
        try:
            from .services import BTCPayServerService, MoneroRPCService
            self.btcpay_service = BTCPayServerService()
            self.monero_service = MoneroRPCService()
        except Exception as e:
            logger.error(f"Failed to initialize crypto services: {e}")
    
    def monitor_pending_direct_payments(self):
        """Monitor all pending direct payments for incoming transactions"""
        try:
            # Get all pending direct payments OR confirmed XMR payments that need more confirmations
            from django.conf import settings
            xmr_req = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('XMR', 1)
            
            pending_payments = DirectPayment.objects.filter(
                Q(status='pending', expires_at__gt=timezone.now()) |
                Q(status='confirmed', crypto_currency__symbol='XMR', confirmations__lt=xmr_req)
            ).select_related('order', 'crypto_currency', 'vendor')
            
            logger.info(f"Monitoring {pending_payments.count()} pending direct payments")
            
            for payment in pending_payments:
                try:
                    self._check_payment_status(payment)
                except Exception as e:
                    logger.error(f"Error checking payment {payment.id}: {e}")
                    continue
            
            # Check for expired payments
            self._handle_expired_payments()
            
        except Exception as e:
            logger.error(f"Error in monitor_pending_direct_payments: {e}")

    def monitor_pending_payment_addresses(self):
        """Monitor all pending PaymentAddress records (Escrow orders, etc.)"""
        try:
            from .models import PaymentAddress
            from .services import PaymentService
            
            from django.conf import settings
            xmr_req = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('XMR', 1)

            pending_addresses = PaymentAddress.objects.filter(
                Q(status='pending', expires_at__gt=timezone.now()) |
                Q(status='paid', crypto_currency__symbol='XMR', confirmations__lt=xmr_req)
            )
            
            logger.info(f"Monitoring {pending_addresses.count()} general payment addresses")
            
            payment_service = PaymentService()
            for addr in pending_addresses:
                try:
                    # check_payment_status performs RPC check and updates Order
                    payment_service.check_payment_status(addr.order_id)
                except Exception as e:
                    logger.error(f"Error checking address {addr.id}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in monitor_pending_payment_addresses: {e}")
    
    def _check_payment_status(self, payment: DirectPayment):
        """Check if a specific direct payment has been received"""
        try:
            if payment.crypto_currency.symbol == 'BTC':
                self._check_btc_payment(payment)
            elif payment.crypto_currency.symbol == 'XMR':
                self._check_xmr_payment(payment)
            else:
                logger.warning(f"Unsupported crypto currency: {payment.crypto_currency.symbol}")
                
        except Exception as e:
            logger.error(f"Error checking payment status for {payment.id}: {e}")
    
    def _check_btc_payment(self, payment: DirectPayment):
        """Check BTC payment using real blockchain monitoring"""
        try:
            logger.info(f"Checking REAL BTC payment for {payment.vendor_address}, amount: {payment.amount}")
            
            from django.conf import settings
            required_confs = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('BTC', 1)
            
            # NEW METHOD 0: Check BTCPay Invoice Status Directly (Most Reliable)
            try:
                from .models import PaymentAddress
                payment_addr = PaymentAddress.objects.filter(order_id=payment.order.order_id).first()
                if payment_addr and payment_addr.btcpay_invoice_id:
                    logger.info(f"🔎 Checking BTCPay Invoice {payment_addr.btcpay_invoice_id} for Order {payment.order.order_id}")
                    invoice_status = self.btcpay_service.get_invoice_status(payment_addr.btcpay_invoice_id)
                    
                    # Log internal status for debugging
                    logger.info(f"   BTCPay Status: {invoice_status}")
                    
                    if invoice_status in ['Settled', 'Confirmed', 'Processing']:
                        # Determine confirmations
                        confs = 1 if invoice_status == 'Processing' else required_confs
                        logger.info(f"✅ BTCPay Invoice {invoice_status}! Triggering payout.")
                        self._confirm_payment(payment, "btcpay_invoice_api", confs)
                        return
            except Exception as e:
                logger.warning(f"BTCPay Invoice status check failed: {e}")

            # Method 1: Use BTCPay Server Wallet API (Legacy fallback)
            
            # Method 2: Use external blockchain API (BlockCypher/Blockstream)
            try:
                transactions = self._get_blockchain_transactions(payment.vendor_address)
                matched_tx = self._match_btc_transaction(transactions, payment)
                if matched_tx:
                    confs = matched_tx.get('confirmations', 0)
                    if confs >= required_confs:
                        self._confirm_payment(payment, "blockchain_api", confs)
                    else:
                        logger.info(f"BTC Payment detected but confirmations too low: {confs}/{required_confs}")
                        payment.confirmations = confs
                        payment.latest_activity = timezone.now()
                        payment.save()
                        # Trigger fee calculation early
                        self._trigger_processing(payment, confs)
                    return
            except Exception as e:
                logger.warning(f"Blockchain API check failed: {e}")
            
            # Method 3: Use Blockstream API (free, reliable)
            try:
                transactions = self._get_blockstream_transactions(payment.vendor_address)
                matched_tx = self._match_btc_transaction(transactions, payment)
                if matched_tx:
                    # Blockstream API usually returns 'status': {'confirmed': true, 'block_height': ...}
                    # We might need to calculate confirmations if not explicit
                    confs = 0
                    if matched_tx.get('status', {}).get('confirmed'):
                        # Calculate confs if block_height available
                        block_height = matched_tx.get('status', {}).get('block_height')
                        current_height = self._get_btc_height()
                        if block_height and current_height:
                             confs = current_height - block_height + 1
                        else:
                             confs = 1 # At least 1 if confirmed
                    
                    if confs >= required_confs:
                        self._confirm_payment(payment, "blockstream_api", confs)
                    else:
                        logger.info(f"BTC Payment detected but confirmations too low: {confs}/{required_confs}")
                        payment.confirmations = confs
                        payment.latest_activity = timezone.now()
                        payment.save()
                        # Trigger fee calculation early
                        self._trigger_processing(payment, confs)
                    return
            except Exception as e:
                logger.warning(f"Blockstream API check failed: {e}")
            
            logger.debug(f"No matching BTC transaction found for payment {payment.id}")
            
        except Exception as e:
            logger.error(f"Error checking BTC payment: {e}")
    
    def _check_xmr_payment(self, payment: DirectPayment):
        """Check XMR payment using real Monero RPC"""
        try:
            # For non-escrow XMR orders, payment actually comes to our subaddress first
            # Then we forward it to vendor. Check PaymentAddress table for the actual receiving address.
            from .models import PaymentAddress
            
            try:
                payment_addr_record = PaymentAddress.objects.get(order_id=payment.order.order_id)
                monitor_address = payment_addr_record.payment_address
                expected_amount = payment_addr_record.expected_amount
                subaddress_index = payment_addr_record.monero_subaddress_index
                
                logger.info(f"Checking REAL XMR payment for order {payment.order.order_id}")
                logger.info(f"  → Subaddress: {monitor_address}")
                logger.info(f"  → Subaddress Index: {subaddress_index}")
                logger.info(f"  → Expected Amount: {expected_amount} XMR")
                
            except PaymentAddress.DoesNotExist:
                # Fallback to vendor address (shouldn't happen for proper non-escrow orders)
                monitor_address = payment.vendor_address
                expected_amount = float(payment.amount)
                subaddress_index = None
                logger.warning(f"PaymentAddress not found for order {payment.order.order_id}, using vendor address")
            
            if not self.monero_service:
                logger.warning("Monero service not available")
                return
            
            from django.conf import settings
            required_confs = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('XMR', 1)
            
            # Use Monero RPC to check for incoming transactions
            try:
                # Get incoming transfers for the address
                incoming_transfers = self.monero_service.get_incoming_transfers(monitor_address)
                
                matched_tx = self._match_xmr_transaction(incoming_transfers, payment, expected_subaddr_index=subaddress_index)
                if matched_tx:
                    confs = matched_tx.get('confirmations', 0)
                    tx_hash = matched_tx.get('txid', '')
                    
                    logger.info(f"✅ XMR Payment FOUND for order {payment.order.order_id}!")
                    logger.info(f"  → TX: {tx_hash}")
                    logger.info(f"  → Confirmations: {confs}/{required_confs}")
                    
                    # Update payment confirmations
                    payment.confirmations = confs
                    payment.transaction_hash = tx_hash
                    payment.latest_activity = timezone.now()
                    
                    if confs >= required_confs:
                        logger.info(f"Triggering payout for order {payment.order.order_id} ({confs} confirmations)")
                        self._confirm_payment(payment, "monero_rpc", confs, tx_hash)
                    else:
                        logger.info(f"Waiting for more confirmations: {confs}/{required_confs}")
                        payment.save()
                        # Trigger fee calculation early
                        self._trigger_processing(payment, confs)
                    return
                else:
                    logger.info(f"No matching XMR transaction found for order {payment.order.order_id} in {len(incoming_transfers)} transfers.")
                    
            except Exception as e:
                logger.warning(f"Monero RPC check failed: {e}")

            
            logger.debug(f"No matching XMR transaction found for payment {payment.id}")
            
        except Exception as e:
            logger.error(f"Error checking XMR payment: {e}")
    
    def _get_btc_height(self):
        """Helper to get current BTC height (placeholder)"""
        # In production, cache this or get from API
        return 850000 # Placeholder
    
    def _match_xmr_transaction(self, transfers, payment, expected_subaddr_index=None):
        """Match Monero transfers to payment"""
        try:
            target_amount = float(payment.amount)
            
            # Look for transfers in the last 7 days (increased from 24h for old orders)
            cutoff_time = timezone.now() - timedelta(days=7)
            
            for transfer in transfers:
                try:
                    txid = transfer.get('txid')
                    ts = transfer.get('timestamp', 0)
                    
                    # Use current time for mempool transactions (ts=0)
                    if ts == 0:
                        transfer_time = timezone.now()
                    else:
                        transfer_time = datetime.fromtimestamp(ts, tz=timezone.utc)
                    
                    # LOG every transfer we examine for debugging
                    logger.info(f"   🔎 Examining XMR TX {txid[:10]}... (Index: {transfer.get('subaddr_index')}, Time: {transfer_time})")

                    # CHECK 1: Match by Subaddress Index (Preferred/Safe)
                    # For subaddress index matches, IGNORE cutoff_time (if it's the right index, it belongs to this order)
                    if expected_subaddr_index is not None:
                        transfer_subaddr_index = transfer.get('subaddr_index', {})
                        # subaddr_index from RPC is typically {'major': 0, 'minor': N}
                        minor_index = transfer_subaddr_index.get('minor') if isinstance(transfer_subaddr_index, dict) else transfer_subaddr_index
                        
                        if str(minor_index) == str(expected_subaddr_index):
                            logger.info(f"✅ MATCH FOUND! Subaddress Index {expected_subaddr_index} matches TX {txid}")
                            return transfer

                    # For fallback matching (amount-based), keep the cutoff check to avoid duplicates
                    if transfer_time < cutoff_time:
                        continue
                    
                    # CHECK 2: Match by Amount (Fallback)
                    transfer_amount = Decimal(str(transfer.get('amount', 0))) / Decimal('1000000000000')
                    
                    if target_amount > 0:
                        target = Decimal(str(target_amount))
                        tolerance = target * Decimal('0.016')
                        if abs(target - transfer_amount) <= tolerance:
                            logger.info(f"✅ Found matching XMR transfer by Amount: {txid} for {transfer_amount} XMR")
                            return transfer
                        
                except Exception as e:
                    logger.debug(f"Error processing XMR transfer {transfer.get('txid')}: {e}")
                    continue
            
            # If we got here, no transfer matched
            if transfers:
                logger.info(f"No match found in {len(transfers)} transfers for subaddr index {expected_subaddr_index}")
                for i, t in enumerate(transfers[:5]): # Log first 5 for debugging
                    t_amt = t.get('amount', 0) / 1e12
                    t_idx = t.get('subaddr_index', {}).get('minor') if isinstance(t.get('subaddr_index'), dict) else t.get('subaddr_index')
                    logger.info(f"  Transfer {i}: TX={t.get('txid')[:10]}, Amt={t_amt}, Index={t_idx}")
            
            return None
            
        except Exception as e:
            logger.error(f"Error matching XMR transaction: {e}")
            return None
    
    def _handle_expired_payments(self):
        """Mark expired payments as expired"""
        try:
            expired_payments = DirectPayment.objects.filter(
                status='pending',
                expires_at__lte=timezone.now()
            )
            
            for payment in expired_payments:
                payment.status = 'expired'
                payment.save()
                
                # Update order status to expired
                order = payment.order
                order.order_status = 'expired'
                order.payment_status = 'expired'
                order.save()
                
                logger.info(f"Marked payment {payment.id} as expired")
                
        except Exception as e:
            logger.error(f"Error handling expired payments: {e}")
    
    def simulate_payment_detection(self, payment_id: str, transaction_hash: str = None):
        """Simulate payment detection for testing purposes"""
        try:
            payment = DirectPayment.objects.get(id=payment_id)
            
            if payment.status != 'pending':
                logger.warning(f"Payment {payment_id} is not pending")
                return False
            
            with transaction.atomic():
                # Update payment status
                payment.status = 'confirmed'
                payment.transaction_hash = transaction_hash or f"sim_tx_{payment_id}_{int(timezone.now().timestamp())}"
                payment.confirmed_at = timezone.now()
                payment.confirmations = 6  # Simulate confirmed transaction
                payment.save()
                
                # Update order status
                order = payment.order
                order.order_status = 'paid'
                order.payment_status = 'paid'
                order.save()
                
                # Calculate fees and create fee tracking record
                self._calculate_and_track_fees(payment)
                
                logger.info(f"Simulated payment detection for {payment_id}")
                return True
                
        except DirectPayment.DoesNotExist:
            logger.error(f"Payment {payment_id} not found")
            return False
        except Exception as e:
            logger.error(f"Error simulating payment detection: {e}")
            return False
    
    def _calculate_and_track_fees(self, payment: DirectPayment):
        """Calculate and track fees for direct payments"""
        try:
            # Calculate platform fee (5% of payment amount)
            platform_fee_rate = Decimal('0.05')  # 5%
            platform_fee = payment.amount * platform_fee_rate
            
            # Calculate escrow fee (1% of payment amount) - even for direct payments
            escrow_fee_rate = Decimal('0.01')  # 1%
            escrow_fee = payment.amount * escrow_fee_rate
            
            # Net amount to vendor (after fees)
            net_amount = payment.amount - platform_fee - escrow_fee
            
            # Store fee information in payment record
            # We'll add these fields to the DirectPayment model
            payment.platform_fee = platform_fee
            payment.escrow_fee = escrow_fee
            payment.net_amount = net_amount
            payment.save()
            
            logger.info(f"Calculated fees for payment {payment.id}: "
                       f"Platform: {platform_fee}, Escrow: {escrow_fee}, Net: {net_amount}")
            
            # TODO: Create a fee tracking record for admin reporting
            # This could be a separate model to track all fees collected
            
        except Exception as e:
            logger.error(f"Error calculating fees: {e}")
    
    def get_direct_payment_stats(self):
        """Get statistics for direct payments"""
        try:
            from django.db.models import Sum, Count, Q
            
            stats = DirectPayment.objects.aggregate(
                total_pending=Count('id', filter=Q(status='pending')),
                total_confirmed=Count('id', filter=Q(status='confirmed')),
                total_failed=Count('id', filter=Q(status='failed')),
                total_expired=Count('id', filter=Q(status='expired')),
                total_amount_confirmed=Sum('amount', filter=Q(status='confirmed')),
                total_fees_collected=Sum('platform_fee', filter=Q(status='confirmed')),
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting direct payment stats: {e}")
            return {}
    
    def _get_btcpay_wallet_transactions(self):
        """Get transactions from BTCPay Server wallet"""
        try:
            if not self.btcpay_service:
                return []
            
            # Use BTCPay Server API to get wallet transactions
            # This would need to be implemented in BTCPayServerService
            logger.debug("Getting BTCPay wallet transactions")
            return []
            
        except Exception as e:
            logger.error(f"Error getting BTCPay transactions: {e}")
            return []
    
    def _get_blockchain_transactions(self, address):
        """Get transactions from BlockCypher API"""
        try:
            # Try BlockCypher first
            url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/txs"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    return data.get('txs', [])
            except:
                pass
                
            # FALLBACK: mempool.space (very reliable)
            logger.info(f"BlockCypher failed, trying mempool.space fallback for {address}")
            url = f"https://mempool.space/api/address/{address}/txs"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    return response.json()
            except Exception as e:
                logger.error(f"Mempool.space fallback also failed: {e}")
            
            return []
                
        except Exception as e:
            logger.error(f"Error getting BlockCypher transactions: {e}")
            return []
    
    def _get_blockstream_transactions(self, address):
        """Get transactions from Blockstream API (free, reliable)"""
        try:
            # Blockstream API (free, reliable) - MAINNET
            url = f"https://blockstream.info/api/address/{address}/txs"
            
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Blockstream API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting Blockstream transactions: {e}")
            return []
    
    def _match_btc_transaction(self, transactions, payment):
        """Match blockchain transactions to payment"""
        try:
            target_amount = float(payment.amount)
            target_address = payment.vendor_address
            
            # Look for transactions in the last 7 days (increased from 24h)
            cutoff_time = timezone.now() - timedelta(days=7)
            
            logger.info(f"🔎 Matching BTC tx for {target_address} (Target: {target_amount} BTC)")
            
            for tx in transactions:
                try:
                    # Handle different API timestamp formats
                    # BlockCypher uses 'time', Blockstream uses 'status' -> 'block_time'
                    raw_time = tx.get('time') or tx.get('status', {}).get('block_time')
                    if raw_time is None:
                        # If no time, assume it's unconfirmed (mempool) - always match
                        tx_time = timezone.now()
                    else:
                        tx_time = datetime.fromtimestamp(float(raw_time), tz=timezone.utc)
                    
                    if tx_time < cutoff_time:
                        continue
                    
                    # Check transaction outputs for our address
                    # BlockCypher puts addresses in 'addresses' or 'outputs'
                    # Blockstream puts addresses in 'vout' -> 'scriptpubkey_address'
                    
                    # Check Blockstream format (vout)
                    found_match = False
                    for output in tx.get('vout', []):
                        if output.get('scriptpubkey_address') == target_address:
                            # Blockstream value is in Satoshis
                            output_amount = Decimal(str(output.get('value', 0))) / Decimal('100000000')
                            
                            # Check if amount matches (with small tolerance)
                            if abs(float(output_amount) - target_amount) < 0.00000001:
                                logger.info(f"✅ Found matching BTC transaction (Blockstream): {tx.get('txid')} for {output_amount} BTC")
                                found_match = True
                                break
                    
                    if found_match:
                        return tx
                        
                    # Check BlockCypher format (outputs)
                    for output in tx.get('outputs', []):
                        if target_address in output.get('addresses', []):
                            # BlockCypher value is in Satoshis
                            output_amount = Decimal(str(output.get('value', 0))) / Decimal('100000000')
                            if abs(float(output_amount) - target_amount) < 0.00000001:
                                logger.info(f"✅ Found matching BTC transaction (BlockCypher): {tx.get('hash')} for {output_amount} BTC")
                                return tx
                                
                except Exception as e:
                    logger.debug(f"Error processing individual BTC transaction: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error in _match_btc_transaction: {e}")
            return None
    
    def _confirm_payment(self, payment, source, confirmations=None, transaction_hash=None):
        """Confirm payment and update order status"""
        try:
            with transaction.atomic():
                # CRITICAL: Update payment amount from PaymentAddress.received_amount
                # DirectPayment is created with expected_amount, but we need actual received_amount
                from .models import PaymentAddress
                try:
                    payment_addr = PaymentAddress.objects.get(order_id=payment.order.order_id)
                    if payment_addr.received_amount and payment_addr.received_amount > 0:
                        logger.info(f"Updating DirectPayment amount: {payment.amount} → {payment_addr.received_amount}")
                        payment.amount = payment_addr.received_amount
                    else:
                        logger.warning(f"PaymentAddress.received_amount is {payment_addr.received_amount}, keeping DirectPayment.amount as is")
                except PaymentAddress.DoesNotExist:
                    logger.warning(f"PaymentAddress not found for order {payment.order.order_id}, using existing DirectPayment.amount")
                
                # Update payment status
                payment.status = 'confirmed'
                if transaction_hash:
                    payment.transaction_hash = transaction_hash
                elif not payment.transaction_hash:
                    payment.transaction_hash = f"real_tx_{payment.id}_{int(timezone.now().timestamp())}"
                
                payment.confirmed_at = timezone.now()
                payment.confirmations = confirmations or 1
                payment.save()
                
                logger.info(f"✅ Payment confirmed: {payment.amount} {payment.crypto_currency.symbol} (TX: {payment.transaction_hash})")
                
                # Update order status
                order = payment.order
                order.order_status = 'paid'
                order.payment_status = 'paid'
                order.save()
                
                # CRITICAL: Calculate fees and trigger payout using the standard service
                # This ensures consistent fee calculation across all detection methods
                try:
                    from .services import PaymentService
                    svc = PaymentService()
                    # We need the PaymentAddress object for the webhook processor
                    from .models import PaymentAddress
                    payment_addr = PaymentAddress.objects.get(order_id=order.order_id)
                    
                    # Update PaymentAddress received_amount and confirmations if not already done
                    if not payment_addr.received_amount or payment_addr.received_amount == 0:
                        payment_addr.received_amount = payment.amount
                    if transaction_hash:
                        payment_addr.transaction_hash = transaction_hash
                    payment_addr.confirmations = confirmations or 1
                    if payment_addr.status != 'paid':
                        payment_addr.status = 'paid'
                        payment_addr.confirmed_at = timezone.now()
                    payment_addr.save()
                    
                    # Call the central webhook processor which handles fee calculation and payout task triggering
                    svc._process_direct_payment_webhook(payment_addr)
                    logger.info(f"🚀 Triggered central webhook processor for order {order.order_id}")
                except Exception as e:
                    logger.error(f"Failed to trigger central webhook processor for order {order.order_id}: {e}")
                    # Fallback: Trigger payout task directly if processor fails
                    try:
                        from .tasks import process_non_escrow_payout
                        process_non_escrow_payout.delay(order.order_id)
                        logger.info(f"🚀 Triggered automated payout task fallback for order {order.order_id}")
                    except Exception as task_e:
                        logger.error(f"Failed to trigger fallback payout task: {task_e}")
                
                logger.info(f"Payment {payment.id} processed via monitor ({source})")
                return True
                
        except Exception as e:
            logger.error(f"Error confirming payment: {e}")
            return False

    def _trigger_processing(self, payment, confirmations):
        """Helper to trigger fee calculation without full confirmation"""
        try:
            from .services import PaymentService
            svc = PaymentService()
            from .models import PaymentAddress
            payment_addr = PaymentAddress.objects.get(order_id=payment.order.order_id)
            
            # Update PaymentAddress with latest info
            if not payment_addr.received_amount or payment_addr.received_amount == 0:
                 payment_addr.received_amount = payment.amount
            payment_addr.confirmations = confirmations
            payment_addr.save()
            
            # Call processor (it will STOP before payout task if confs too low, but will SAVE FEES)
            svc._process_direct_payment_webhook(payment_addr)
        except Exception as e:
            logger.error(f"Failed to trigger early processing: {e}")


# Global instance
direct_payment_monitor = DirectPaymentMonitor()
