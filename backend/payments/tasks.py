from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging

from .services import PayoutService, get_btc_estimated_miner_fee_btc, PaymentService
from .models import DirectPayment
from .direct_payment_monitor import direct_payment_monitor

logger = logging.getLogger(__name__)


@shared_task
def auto_release_escrow_payouts():
    """Task to check for escrow payments that need auto-release"""
    try:
        from .models import EscrowPayment
        from orders.models import Order
        
        # Find all funded escrows with auto_release enabled that have passed the deadline
        overdue_escrows = EscrowPayment.objects.filter(
            status='funded',
            auto_release_enabled=True,
            auto_release_at__lte=timezone.now()
        )
        
        for escrow in overdue_escrows:
            try:
                # Release funds to vendor
                logger.info(f"Auto-releasing escrow for order {escrow.payment_address.order_id}")
                from .tasks import release_escrow_task
                release_escrow_task.apply_async(args=[escrow.payment_address.order_id, 'system'])
            except Exception as e:
                logger.error(f"Error auto-releasing escrow {escrow.id}: {str(e)}")
                
        return f"Processed {overdue_escrows.count()} overdue escrows"
    except Exception as e:
        logger.error(f"Error in auto_release_escrow_payouts: {str(e)}")
        return str(e)


@shared_task
def check_direct_payment_status():
    """Check status of all pending direct and subaddress payments"""
    try:
        # Check direct vendor payments
        direct_payment_monitor.monitor_pending_direct_payments()
        
        # Check escrow/subaddress payments
        direct_payment_monitor.monitor_pending_payment_addresses()
        
        return "Monitored all pending crypto payments"
    except Exception as e:
        logger.error(f"Error in check_direct_payment_status: {str(e)}")
        return str(e)


@shared_task
def create_escrow_payout(order_id: str):
    """Task to initialize escrow payout record when payment is confirmed"""
    try:
        from orders.models import Order
        from .models import EscrowPayment, PaymentAddress
        
        order = Order.objects.get(order_id=order_id)
        payment_address = PaymentAddress.objects.get(order_id=order_id)
        
        # Create escrow payment record
        escrow, created = EscrowPayment.objects.get_or_create(
            payment_address=payment_address,
            defaults={
                'buyer': order.buyer,
                'vendor': order.vendor,
                'escrow_amount': payment_address.received_amount,
                'escrow_fee': payment_address.received_amount * Decimal('0.02'), # 2% escrow fee
                'status': 'funded', # Since we created it after payment was confirmed
                'auto_release_at': timezone.now() + timedelta(days=7)
            }
        )
        
        logger.info(f"Escrow record created/updated for order {order_id}")
        return f"Escrow created for order {order_id}"
    except Exception as e:
        logger.error(f"Error creating escrow payout for order {order_id}: {str(e)}")
        return str(e)


@shared_task
def release_escrow_task(order_id: str, released_by_id: str = None):
    """Task to process escrow release to vendor"""
    try:
        from orders.models import Order
        from .services import PayoutService
        
        payout_service = PayoutService()
        result = payout_service.release_escrow_to_vendor(order_id, released_by_id)
        
        if result.get('success'):
            logger.info(f"Escrow released successfully for order {order_id}")
        else:
            logger.error(f"Failed to release escrow for order {order_id}: {result.get('error')}")
            
        return result
    except Exception as e:
        logger.error(f"Error in release_escrow_task for order {order_id}: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task(bind=True, max_retries=12, default_retry_delay=300)  # Retry up to 12 times, 5 min apart
def process_non_escrow_payout(self, order_id: str):
    """Process non-escrow order payout - calculate fees and send to vendor"""
    try:
        from orders.models import Order
        from .models import DirectPayment, PaymentAddress
        
        order = Order.objects.get(order_id=order_id)
        
        # Get payment address
        try:
            payment_address = PaymentAddress.objects.get(order_id=order_id)
        except PaymentAddress.DoesNotExist:
            logger.error(f"Payment address not found for order {order_id}")
            return f"Payment address not found for order {order_id}"
            
        # Get vendor payout address from profile
        vendor = order.product.vendor
        crypto_symbol = payment_address.crypto_currency.symbol
        vendor_payout_address = None
        
        if crypto_symbol == 'BTC':
            vendor_payout_address = vendor.btc_payout_address
        elif crypto_symbol == 'XMR':
            vendor_payout_address = vendor.xmr_payout_address
            
        if not vendor_payout_address:
            logger.error(f"Vendor {vendor.username} has no {crypto_symbol} payout address configured.")
            
        # Get or create direct payment
        direct_payment, created = DirectPayment.objects.get_or_create(
            order=order,
            defaults={
                'vendor': vendor,
                'buyer': order.buyer,
                'crypto_currency': payment_address.crypto_currency,
                'amount': payment_address.received_amount or payment_address.expected_amount,
                'vendor_address': vendor_payout_address or "MISSING_ADDRESS",
                'status': 'pending'
            }
        )
        
        # If address was missing originally but now exists, update it
        if direct_payment.vendor_address == "MISSING_ADDRESS" and vendor_payout_address:
            direct_payment.vendor_address = vendor_payout_address
            direct_payment.save()

        if not vendor_payout_address or vendor_payout_address == "MISSING_ADDRESS":
             return f"Vendor {vendor.username} has no {crypto_symbol} payout address. Payout held."
        
        # Only process if not already completed or permanently failed
        if direct_payment.status in ['completed', 'processing']:
            logger.info(f"Direct payment for order {order_id} already processed")
            return f"Direct payment for order {order_id} already processed"
        if direct_payment.status == 'failed':
            logger.info(f"Direct payment for order {order_id} already marked failed (e.g. dust), skipping")
            return f"Direct payment for order {order_id} already failed, skipping"
        
        # Mark as processing
        direct_payment.status = 'processing'
        direct_payment.save()
        
        # Calculate fees
        from .commission_models import CommissionSettings, VendorFee
        commission_settings = CommissionSettings.get_settings()
        
        # Check for vendor-specific commission rate
        vendor_custom_rate = VendorFee.get_vendor_fee(vendor)
        if vendor_custom_rate is not None:
            platform_fee_rate = vendor_custom_rate / Decimal('100')
        else:
            platform_fee_rate = commission_settings.platform_fee_rate / Decimal('100')
            
        escrow_fee_rate = Decimal('0') # No escrow fee for direct orders
        
        amount = direct_payment.amount
        platform_fee = amount * platform_fee_rate
        escrow_fee = amount * escrow_fee_rate
        
        # Check if platform_fee is dust (approx 600 sats)
        # If it is dust, we MUST sweep the whole amount to the vendor to avoid "not enough funds" / dusty change error
        # 0.00000600 BTC is safe margin for dust
        dust_threshold = Decimal('0.00000600')
        if platform_fee > 0 and platform_fee < dust_threshold:
            logger.info(f"Platform fee {platform_fee} is below dust threshold {dust_threshold}. Sweeping entire amount to vendor.")
            platform_fee = Decimal('0')
        
        # Calculate net amount before miner fees
        net_amount = amount - platform_fee - escrow_fee
        
        # ALWAYS use live API fee for BTC - never hardcode
        if crypto_symbol == 'BTC':
            fee_btc = get_btc_estimated_miner_fee_btc()
            if fee_btc is None:
                logger.error("⚠️ WARNING: mempool.space API failed for BTC fee, using minimal fallback 0.00002 BTC")
                estimated_miner_fee = Decimal('0.00002')  # Minimal fallback ONLY when API fails
            else:
                estimated_miner_fee = fee_btc
                logger.info(f"✅ Using API BTC fee: {estimated_miner_fee} BTC")
        else:
            # XMR fees are tiny and stable (~0.0001 XMR), no API needed
            estimated_miner_fee = Decimal('0.0001')
        min_vendor_receive = Decimal('0.00001')
        
        if net_amount - estimated_miner_fee < min_vendor_receive:
            # Reduce platform fee to ensure vendor gets reasonable amount
            original_platform_fee = platform_fee
            # Calculate max platform fee that leaves vendor with reasonable amount
            max_platform_fee = amount - escrow_fee - estimated_miner_fee - min_vendor_receive
            if max_platform_fee < Decimal('0'):
                max_platform_fee = Decimal('0')
            platform_fee = min(platform_fee, max_platform_fee)
            net_amount = amount - platform_fee - escrow_fee
            
            if platform_fee < original_platform_fee:
                logger.warning(f"REDUCED PLATFORM FEE for small transaction: Original={original_platform_fee}, Adjusted={platform_fee}")
                logger.warning(f"Reason: Net amount {net_amount} - estimated miner fee {estimated_miner_fee} would leave vendor with less than {min_vendor_receive}")
        
        logger.info(f"Final calculation: Gross={amount}, Platform Fee={platform_fee}, Escrow Fee={escrow_fee}, Net={net_amount}")
        logger.info(f"Estimated miner fee: {estimated_miner_fee} (will be deducted by BTCPay from net amount)")
        logger.info(f"Expected vendor receive: {net_amount - estimated_miner_fee} (after miner fees)")
        
        # Update direct payment with fees
        direct_payment.platform_fee = platform_fee
        direct_payment.escrow_fee = escrow_fee
        direct_payment.net_amount = net_amount
        direct_payment.transaction_hash = payment_address.transaction_hash
        direct_payment.confirmed_at = payment_address.confirmed_at or timezone.now()
        direct_payment.save()
        
        logger.info(f"--- FEE CALCULATION FOR ORDER {order_id} ---")
        logger.info(f"Gross Amount: {amount} {crypto_symbol}")
        logger.info(f"Commission Rate: {platform_fee_rate * 100}%")
        logger.info(f"Platform Fee: {platform_fee} {crypto_symbol} ({platform_fee_rate * 100}% of gross)")
        logger.info(f"Escrow Fee: {escrow_fee} {crypto_symbol}")
        logger.info(f"NET AMOUNT TO VENDOR (before miner fees): {net_amount} {crypto_symbol}")
        logger.info(f"Estimated miner fee: {estimated_miner_fee} {crypto_symbol} (~$0.50-2.50 USD)")
        logger.info(f"EXPECTED VENDOR RECEIVE (after miner fees): {net_amount - estimated_miner_fee} {crypto_symbol}")
        
        # USD equivalent from rates API (no hardcoded prices)
        svc = PaymentService()
        btc_price = svc.get_fiat_to_crypto_rate('BTC', 'USD') or Decimal('98000')
        xmr_price = svc.get_fiat_to_crypto_rate('XMR', 'USD') or Decimal('165')
        price = btc_price if crypto_symbol == 'BTC' else xmr_price
        
        logger.info(f"USD Equivalents (approx):")
        logger.info(f"  Gross: ${amount * price:.2f} USD")
        logger.info(f"  Platform Fee: ${platform_fee * price:.2f} USD")
        logger.info(f"  Net (before miner fees): ${net_amount * price:.2f} USD")
        logger.info(f"  Expected vendor receive: ${(net_amount - estimated_miner_fee) * price:.2f} USD")
        logger.info(f"VENDOR PAYOUT ADDRESS: {vendor_payout_address}")
        logger.info(f"-------------------------------------------")
        
        # Dust check: if miner fee >= net_amount, vendor would receive <= 0 — never retry
        expected_vendor_receive = net_amount - estimated_miner_fee
        if expected_vendor_receive <= 0:
            direct_payment.status = 'failed'
            direct_payment.save()
            logger.error(
                f"DUST PAYOUT SKIPPED (no retries): order {order_id}. "
                f"Net={net_amount} {crypto_symbol}, miner_fee~{estimated_miner_fee} → vendor would receive {expected_vendor_receive}. "
                f"Order amount is below minimum (fee exceeds payout). Refund buyer or add wallet balance and retry manually."
            )
            return (
                f"Dust payout impossible for order {order_id}: net {net_amount} - fee ~{estimated_miner_fee} ≤ 0. "
                f"Marked failed. Refund buyer or top up BTCPay wallet and retry manually."
            )
        
        # Send to vendor
        payout_service = PayoutService()
        success = payout_service._send_direct_payment_to_vendor(direct_payment, net_amount)
        
        if success:
            logger.info(f"Successfully processed non-escrow payout for order {order_id}")
            return f"Non-escrow payout processed for order {order_id}"
        else:
            # Payout failed - trigger retry if attempts remaining
            direct_payment.status = 'pending'  # Reset to pending for retry
            direct_payment.save()
            
            logger.warning(f"Payout failed for order {order_id}. Retry {self.request.retries + 1}/{self.max_retries}")
            
            # If we still have retries left, schedule a retry
            if self.request.retries < self.max_retries:
                raise self.retry(exc=Exception(f"Payout failed, retrying in 5 minutes"))
            else:
                # All retries exhausted - mark as failed for manual intervention
                direct_payment.status = 'failed'
                direct_payment.save()
                logger.error(f"All retries exhausted for order {order_id}. Manual intervention required.")
                return f"Failed to send payout to vendor for order {order_id} after {self.max_retries} retries"
            
    except Order.DoesNotExist:
        logger.error(f"Order not found: {order_id}")
        return f"Order not found: {order_id}"
    except Exception as e:
        logger.error(f"Error processing non-escrow payout for order {order_id}: {str(e)}")
        
        # For unexpected errors, also retry
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=300)
        else:
            return f"Error processing non-escrow payout: {str(e)}"