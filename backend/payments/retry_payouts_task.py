from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@shared_task
def retry_pending_monero_payouts():
    """Check for pending Monero payouts and retry if funds are now unlocked"""
    try:
        from .models import DirectPayment
        from .services import PayoutService
        
        # Find all pending Monero payouts
        pending_payouts = DirectPayment.objects.filter(
            status='pending',
            crypto_currency__symbol='XMR'
        ).select_related('order', 'vendor', 'crypto_currency')
        
        logger.info(f"Found {pending_payouts.count()} pending Monero payouts to retry")
        
        payout_service = PayoutService()
        retried_count = 0
        
        for direct_payment in pending_payouts:
            try:
                # Try to send the payout again
                logger.info(f"Retrying payout for order {direct_payment.order.order_id}")
                
                success = payout_service._send_direct_payment_to_vendor(
                    direct_payment, 
                    direct_payment.net_amount
                )
                
                if success:
                    retried_count += 1
                    logger.info(f"Successfully sent pending payout for order {direct_payment.order.order_id}")
                else:
                    logger.warning(f"Payout still pending for {direct_payment.order.order_id} - funds may still be locked")
                    
            except Exception as e:
                logger.error(f"Error retrying payout for {direct_payment.order.order_id}: {str(e)}")
        
        return f"Retried {pending_payouts.count()} pending payouts, {retried_count} succeeded"
        
    except Exception as e:
        logger.error(f"Error in retry_pending_monero_payouts: {str(e)}")
        return str(e)
