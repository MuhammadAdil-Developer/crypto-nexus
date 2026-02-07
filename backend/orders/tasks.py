from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from shared.models import Notification
from users.models import User
from products.models import Product
from payments.models import RefundRequest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

from .models import Order, OrderStatus

logger = logging.getLogger(__name__)


@shared_task
def auto_cancel_expired_orders_task():
    """
    Task to automatically cancel orders where payment has expired.
    Runs periodically to free up product stock.
    """
    try:
        from django.utils import timezone
        
        # Find orders that are pending or partial payment and have expired
        expired_orders = Order.objects.filter(
            order_status__in=['pending_payment', 'pending'],
            payment_status__in=['pending', 'pending_payment', 'partial'],
            payment_expires_at__lt=timezone.now()
        )
        
        cancelled_count = 0
        
        for order in expired_orders:
            try:
                # Cancel order
                order.order_status = 'cancelled'
                order.payment_status = 'expired'
                order.save()
                
                # Release product quantity
                product = order.product
                product.quantity_available += order.quantity
                if product.status == 'reserved':
                    product.status = 'approved'
                product.save()
                
                # Create notifications
                try:
                    from shared.admin_notifications import notify_admin_order_expired, send_user_notification
                    
                    # Notify admin
                    notify_admin_order_expired(order)
                    
                    # Notify buyer
                    send_user_notification(
                        user=order.buyer,
                        notification_type='order_status_changed',
                        title='Order Expired',
                        message=f'Your order {order.order_id} for "{order.product.headline}" has expired because payment was not completed within the time limit.',
                        data={
                            'order_id': order.order_id,
                            'action_url': f'/buyer/orders'
                        }
                    )
                    
                    # Notify vendor
                    send_user_notification(
                        user=order.vendor,
                        notification_type='order_status_changed',
                        title='Order Expired',
                        message=f'Order {order.order_id} from {order.buyer.username} has expired due to non-payment.',
                        data={
                            'order_id': order.order_id,
                            'action_url': f'/vendor/orders'
                        }
                    )
                except Exception as e:
                    logger.error(f"Error sending expiration notifications for {order.order_id}: {e}")
                
                cancelled_count += 1
                logger.info(f"Auto-cancelled expired order {order.order_id}")
                
            except Exception as e:
                logger.error(f"Error processing expired order {order.order_id}: {e}")
                continue
                
        return f"Successfully auto-cancelled {cancelled_count} expired orders"
        
    except Exception as e:
        logger.error(f"Error in auto_cancel_expired_orders_task: {e}")
        return f"Error auto-cancelling orders: {str(e)}"


@shared_task
def send_review_prompt_task(buyer_id, product_id, order_id):
    """Send review prompt notification to buyer after 3 minutes of payment confirmation"""
    try:
        buyer = User.objects.get(id=buyer_id)
        product = Product.objects.get(id=product_id)
        
        # Send notification via central helper (respects preferences)
        from shared.admin_notifications import send_user_notification
        send_user_notification(
            user=buyer,
            notification_type='review_prompt',
            title='Share your review',
            message=f"Please review your purchase: {product.headline}",
            data={
                'order_id': order_id, 
                'product_id': str(product.id),
                'product_title': product.headline,
                'action_url': f'/buyer/orders'
            }
        )
        
        logger.info(f"Review prompt sent to buyer {buyer.username} for order {order_id}")
        return f"Review prompt sent successfully for order {order_id}"
        
    except User.DoesNotExist:
        logger.error(f"Buyer with id {buyer_id} not found")
        return f"Buyer with id {buyer_id} not found"
    except Product.DoesNotExist:
        logger.error(f"Product with id {product_id} not found")
        return f"Product with id {product_id} not found"
    except Exception as e:
        logger.error(f"Failed to send review prompt for order {order_id}: {str(e)}")
        return f"Failed to send review prompt: {str(e)}"


@shared_task
def send_daily_refund_reminders():
    """
    Send daily red-colored notifications to vendors with pending refunds
    Runs daily to remind vendors to process refunds after admin decision
    """
    try:
        # Get all refunds that require vendor action and are not completed
        pending_refunds = RefundRequest.objects.filter(
            vendor_refund_required=True,
            vendor_refund_completed=False
        )
        
        sent_count = 0
        channel_layer = get_channel_layer()
        
        for refund in pending_refunds:
            try:
                order = refund.order
                vendor = refund.vendor
                
                # Check if we already sent a reminder today
                if refund.last_reminder_sent:
                    last_reminder_date = refund.last_reminder_sent.date()
                    today = timezone.now().date()
                    if last_reminder_date == today:
                        continue  # Skip if already sent today
                
                # Send notification via central helper (respects preferences)
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=vendor,
                    notification_type='refund',
                    title='Pending Refund Required',
                    message=f'You have a pending refund for order {order.order_id}. Please refund the buyer the order amount of {refund.amount} {order.crypto_currency}.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'amount': str(refund.amount),
                        'deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
                        'is_overdue': refund.is_vendor_refund_overdue,
                        'action_url': '/vendor/orders'
                    },
                    priority='high'
                )
                
                # Update last reminder sent timestamp
                refund.last_reminder_sent = timezone.now()
                refund.save(update_fields=['last_reminder_sent'])
                
                sent_count += 1
                logger.info(f"Sent daily refund reminder to vendor {vendor.username} for refund {refund.id}")
                
            except Exception as e:
                logger.error(f"Error sending reminder for refund {refund.id}: {e}")
                continue
        
        logger.info(f"Daily refund reminders sent: {sent_count} reminders")
        return f"Sent {sent_count} daily refund reminders"
    
    except Exception as e:
        logger.error(f"Error in send_daily_refund_reminders task: {e}")
        return f"Error sending daily refund reminders: {str(e)}"


@shared_task
def check_vendor_decision_deadlines():
    """
    Check for refund requests where vendor decision deadline has passed
    Auto-escalate to admin if vendor doesn't respond within deadline
    """
    try:
        # Get refunds where vendor decision deadline has passed
        overdue_refunds = RefundRequest.objects.filter(
            status='pending_vendor',
            vendor_decision_deadline__lt=timezone.now()
        )
        
        escalated_count = 0
        
        for refund in overdue_refunds:
            try:
                # Auto-escalate to admin
                refund.status = 'pending_admin'
                refund.save()
                
                # Notify admin
                from shared.admin_notifications import send_admin_notification
                send_admin_notification(
                    notification_type='refund',
                    title='Refund Auto-Escalated to Admin',
                    message=f'Refund request for order {refund.order.order_id} auto-escalated to admin due to vendor non-response.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': refund.order.order_id,
                        'action_url': '/admin/refunds'
                    },
                    priority='high'
                )
                
                # Notify buyer via central helper (respects preferences)
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=refund.buyer,
                    notification_type='refund',
                    title='Refund Escalated to Admin',
                    message=f'Your refund request for order {refund.order.order_id} has been escalated to admin for review.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': refund.order.order_id,
                        'action_url': '/buyer/orders'
                    }
                )
                
                escalated_count += 1
                logger.info(f"Auto-escalated refund {refund.id} to admin")
                
            except Exception as e:
                logger.error(f"Error escalating refund {refund.id}: {e}")
                continue
        
        logger.info(f"Auto-escalated {escalated_count} refund requests to admin")
        return f"Auto-escalated {escalated_count} refund requests"
    
    except Exception as e:
        logger.error(f"Error in check_vendor_decision_deadlines task: {e}")
        return f"Error checking vendor decision deadlines: {str(e)}"



