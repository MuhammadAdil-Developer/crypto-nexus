from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging

from .services import PayoutService
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


@shared_task
def process_non_escrow_payout(order_id: str):
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
        
        # Only process if not already completed
        if direct_payment.status in ['completed', 'processing']:
            logger.info(f"Direct payment for order {order_id} already processed")
            return f"Direct payment for order {order_id} already processed"
        
        # Mark as processing
        direct_payment.status = 'processing'
        direct_payment.save()
        
        # Calculate fees
        from .commission_models import CommissionSettings, VendorFee
        commission_settings = CommissionSettings.get_settings()
        
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
        
        # We no longer need manual fee reserve as BTCPay subtracts miner fees automatically
        net_amount = amount - platform_fee - escrow_fee
        
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
        logger.info(f"Platform Fee: {platform_fee}")
        logger.info(f"Escrow Fee: {escrow_fee}")
        logger.info(f"NET AMOUNT TO VENDOR (Miner fees will be subtracted by BTCPay): {net_amount}")
        logger.info(f"VENDOR PAYOUT ADDRESS: {vendor_payout_address}")
        logger.info(f"-------------------------------------------")
        
        # Send to vendor
        payout_service = PayoutService()
        success = payout_service._send_direct_payment_to_vendor(direct_payment, net_amount)
        
        if success:
            logger.info(f"Successfully processed non-escrow payout for order {order_id}")
            return f"Non-escrow payout processed for order {order_id}"
        else:
            logger.error(f"Failed to send payout to vendor for order {order_id}. Manual intervention may be required.")
            return f"Failed to send payout to vendor for order {order_id}"
            
    except Order.DoesNotExist:
        logger.error(f"Order not found: {order_id}")
        return f"Order not found: {order_id}"
    except Exception as e:
        logger.error(f"Error processing non-escrow payout for order {order_id}: {str(e)}")
        return f"Error processing non-escrow payout: {str(e)}"