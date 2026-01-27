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
            # Get all pending direct payments
            pending_payments = DirectPayment.objects.filter(
                status='pending',
                expires_at__gt=timezone.now()
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
            
            pending_addresses = PaymentAddress.objects.filter(
                status='pending',
                expires_at__gt=timezone.now()
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
            required_confs = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('BTC', 3)
            
            # Method 1: Use BTCPay Server Wallet API (if available)
            if self.btcpay_service:
                try:
                    # Get wallet transactions
                    transactions = self._get_btcpay_wallet_transactions()
                    matched_tx = self._match_btc_transaction(transactions, payment)
                    if matched_tx:
                        confs = matched_tx.get('confirmations', 0)
                        if confs >= required_confs:
                            self._confirm_payment(payment, "btcpay_wallet", confs)
                        else:
                            logger.info(f"BTC Payment detected but confirmations too low: {confs}/{required_confs}")
                            # Optionally update payment with current confirmations
                            payment.confirmations = confs
                            payment.latest_activity = timezone.now()
                            payment.save()
                        return
                except Exception as e:
                    logger.warning(f"BTCPay wallet check failed: {e}")
            
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
                    return
            except Exception as e:
                logger.warning(f"Blockstream API check failed: {e}")
            
            logger.debug(f"No matching BTC transaction found for payment {payment.id}")
            
        except Exception as e:
            logger.error(f"Error checking BTC payment: {e}")
    
    def _check_xmr_payment(self, payment: DirectPayment):
        """Check XMR payment using real Monero RPC"""
        try:
            # For XMR, we monitor the subaddress we generated (stored in order.payment_address)
            # NOT the vendor's private payout address (which we don't have view keys for)
            monitor_address = payment.order.payment_address or payment.vendor_address
            
            logger.info(f"Checking REAL XMR payment for {monitor_address}, amount: {payment.amount}")
            
            if not self.monero_service:
                logger.warning("Monero service not available")
                return
            
            from django.conf import settings
            required_confs = getattr(settings, 'REQUIRED_CONFIRMATIONS', {}).get('XMR', 10)
            
            # Use Monero RPC to check for incoming transactions
            try:
                # Get incoming transfers for the address
                incoming_transfers = self.monero_service.get_incoming_transfers(monitor_address)
                
                matched_tx = self._match_xmr_transaction(incoming_transfers, payment)
                if matched_tx:
                    confs = matched_tx.get('confirmations', 0)
                    if confs >= required_confs:
                        self._confirm_payment(payment, "monero_rpc", confs)
                    else:
                        logger.info(f"XMR Payment detected but confirmations too low: {confs}/{required_confs}")
                        payment.confirmations = confs
                        payment.latest_activity = timezone.now()
                        payment.save()
                    return
                    
            except Exception as e:
                logger.warning(f"Monero RPC check failed: {e}")
            
            logger.debug(f"No matching XMR transaction found for payment {payment.id}")
            
        except Exception as e:
            logger.error(f"Error checking XMR payment: {e}")
    
    def _get_btc_height(self):
        """Helper to get current BTC height (placeholder)"""
        # In production, cache this or get from API
        return 850000 # Placeholder
    
    def _match_xmr_transaction(self, transfers, payment):
        """Match Monero transfers to payment"""
        try:
            target_amount = float(payment.amount)
            
            # Look for transfers in the last 24 hours
            cutoff_time = timezone.now() - timedelta(hours=24)
            
            for transfer in transfers:
                try:
                    # Check if transfer is recent enough
                    # Make sure to handle timestamp correctly
                    ts = transfer.get('timestamp', 0)
                    if not ts: continue
                    
                    transfer_time = datetime.fromtimestamp(ts, tz=timezone.utc)
                    if transfer_time < cutoff_time:
                        continue
                    
                    # Check if amount matches (with 1.6% tolerance for fees/fluctuations)
                    # Amount is in atomic units (piconero)
                    transfer_amount = transfer.get('amount', 0) / 1000000000000  # Convert atomic units to XMR
                    
                    tolerance = target_amount * 0.016
                    if (target_amount - transfer_amount) <= tolerance:
                        logger.info(f"Found matching XMR transfer: {transfer.get('txid')} for {transfer_amount} XMR (Target: {target_amount})")
                        return transfer
                        
                except Exception as e:
                    logger.debug(f"Error processing XMR transfer: {e}")
                    continue
            
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
            # BlockCypher API (free tier: 200 requests/hour) - MAINNET
            url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/txs"
            
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('txs', [])
            else:
                logger.warning(f"BlockCypher API error: {response.status_code}")
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
            
            # Look for transactions in the last 24 hours
            cutoff_time = timezone.now() - timedelta(hours=24)
            
            for tx in transactions:
                try:
                    # Check if transaction is recent enough
                    tx_time = datetime.fromtimestamp(tx.get('time', 0), tz=timezone.utc)
                    if tx_time < cutoff_time:
                        continue
                    
                    # Check transaction outputs for our address
                    for output in tx.get('vout', []):
                        if output.get('scriptpubkey_address') == target_address:
                            output_amount = output.get('value', 0) / 100000000  # Convert satoshis to BTC
                            
                            # Check if amount matches (with small tolerance for fees)
                            if abs(output_amount - target_amount) < 0.00000001:  # 1 satoshi tolerance
                                logger.info(f"Found matching BTC transaction: {tx.get('txid')} for {output_amount} BTC")
                                return tx
                                
                except Exception as e:
                    logger.debug(f"Error processing transaction: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error matching BTC transaction: {e}")
            return None
    
    def _confirm_payment(self, payment, source, confirmations=None, transaction_hash=None):
        """Confirm payment and update order status"""
        try:
            with transaction.atomic():
                # Update payment status
                payment.status = 'confirmed'
                if transaction_hash:
                    payment.transaction_hash = transaction_hash
                elif not payment.transaction_hash:
                    payment.transaction_hash = f"real_tx_{payment.id}_{int(timezone.now().timestamp())}"
                
                payment.confirmed_at = timezone.now()
                payment.confirmations = confirmations or 6
                payment.save()
                
                # Update order status
                order = payment.order
                order.order_status = 'paid'
                order.payment_status = 'paid'
                order.save()
                
                # Trigger automated payout task
                try:
                    from .tasks import process_non_escrow_payout
                    process_non_escrow_payout.delay(order.order_id)
                    logger.info(f"Triggered automated payout task for order {order.order_id}")
                except Exception as e:
                    logger.error(f"Failed to trigger payout task for order {order.order_id}: {e}")
                
                logger.info(f"Payment {payment.id} confirmed via {source} with {payment.confirmations} confirmations")
                return True
                
        except Exception as e:
            logger.error(f"Error confirming payment: {e}")
            return False


# Global instance
direct_payment_monitor = DirectPaymentMonitor()
