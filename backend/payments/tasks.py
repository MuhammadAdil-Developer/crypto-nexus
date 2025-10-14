from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from .services import PayoutService
from .models import DirectPayment
from .direct_payment_monitor import direct_payment_monitor

logger = logging.getLogger(__name__)


@shared_task
def auto_release_escrow_payouts():
    """Auto-release escrow payouts that are older than 7 days"""
    try:
        payout_service = PayoutService()
        released_count = payout_service.auto_release_escrow_payouts()
        
        logger.info(f"Auto-release task completed: {released_count} payouts released")
        return f"Released {released_count} escrow payouts"
        
    except Exception as e:
        logger.error(f"Auto-release task error: {str(e)}")
        return f"Error in auto-release: {str(e)}"


@shared_task
def check_direct_payment_status():
    """Check status of pending direct payments"""
    try:
        # Use the direct payment monitor service
        direct_payment_monitor.monitor_pending_direct_payments()
        
        # Get count of pending payments for logging
        pending_count = DirectPayment.objects.filter(
            status='pending',
            expires_at__gt=timezone.now()
        ).count()
        
        logger.info(f"Direct payment monitoring completed. {pending_count} payments still pending")
        return f"Monitored direct payments. {pending_count} still pending"
        
    except Exception as e:
        logger.error(f"Direct payment check error: {str(e)}")
        return f"Error checking direct payments: {str(e)}"


@shared_task
def simulate_direct_payment_detection(payment_id: str, transaction_hash: str = None):
    """Simulate payment detection for testing purposes"""
    try:
        success = direct_payment_monitor.simulate_payment_detection(payment_id, transaction_hash)
        
        if success:
            logger.info(f"Successfully simulated payment detection for {payment_id}")
            return f"Payment {payment_id} marked as confirmed"
        else:
            logger.warning(f"Failed to simulate payment detection for {payment_id}")
            return f"Failed to simulate payment for {payment_id}"
            
    except Exception as e:
        logger.error(f"Error simulating payment detection: {str(e)}")
        return f"Error simulating payment: {str(e)}"


@shared_task
def cleanup_expired_payments():
    """Clean up expired payment addresses and direct payments"""
    try:
        from .models import PaymentAddress
        
        # Clean up expired payment addresses
        expired_addresses = PaymentAddress.objects.filter(
            expires_at__lt=timezone.now(),
            status='pending'
        )
        
        expired_count = expired_addresses.count()
        expired_addresses.update(status='expired')
        
        # Clean up expired direct payments
        expired_direct = DirectPayment.objects.filter(
            expires_at__lt=timezone.now(),
            status='pending'
        )
        
        direct_count = expired_direct.count()
        expired_direct.update(status='expired')
        
        total_cleaned = expired_count + direct_count
        
        logger.info(f"Cleanup task completed: {expired_count} payment addresses and {direct_count} direct payments expired")
        return f"Cleaned up {total_cleaned} expired payments"
        
    except Exception as e:
        logger.error(f"Cleanup task error: {str(e)}")
        return f"Error in cleanup: {str(e)}"


@shared_task
def create_escrow_payout(order_id: str):
    """Update escrow payout status when order is paid (payout already exists from order creation)"""
    try:
        payout_service = PayoutService()
        success = payout_service.create_escrow_payout(order_id)
        
        if success:
            logger.info(f"Escrow payout created for order {order_id}")
            return f"Escrow payout created for order {order_id}"
        else:
            logger.warning(f"Failed to create escrow payout for order {order_id}")
            return f"Failed to create escrow payout for order {order_id}"
            
    except Exception as e:
        logger.error(f"Error creating escrow payout for order {order_id}: {str(e)}")
        return f"Error creating escrow payout: {str(e)}"
