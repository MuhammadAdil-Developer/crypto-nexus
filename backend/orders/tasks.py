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

logger = logging.getLogger(__name__)

@shared_task
def send_review_prompt_task(buyer_id, product_id, order_id):
    """Send review prompt notification to buyer after 3 minutes of payment confirmation"""
    try:
        buyer = User.objects.get(id=buyer_id)
        product = Product.objects.get(id=product_id)
        
        # Create database notification
        Notification.objects.create(
            user=buyer,
            type='system',
            title='Share your review',
            message=f"Please review your purchase: {product.headline}",
            data={'order_id': order_id, 'product_id': product.id}
        )
        
        # Send real-time notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'realtime_{buyer.id}',
            {
                'type': 'review_prompt',
                'data': {
                    'order_id': order_id,
                    'product_id': product.id,
                    'product_title': product.headline
                }
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
                
                # Create database notification (red/urgent)
                Notification.objects.create(
                    user=vendor,
                    type='refund',
                    title='Pending Refund Required',
                    message=f'You have a pending refund for order {order.order_id}. Please refund the buyer the order amount of {refund.amount} {order.crypto_currency}.',
                    data={
                        'refund_id': str(refund.id),
                        'order_id': order.order_id,
                        'amount': str(refund.amount),
                        'deadline': refund.vendor_refund_deadline.isoformat() if refund.vendor_refund_deadline else None,
                        'is_overdue': refund.is_vendor_refund_overdue,
                        'action_url': '/vendor/orders'
                    }
                )
                
                # Send real-time notification (red/urgent)
                if channel_layer:
                    try:
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{vendor.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'type': 'pending_refund_reminder',
                                    'title': 'Pending Refund Required',
                                    'message': f'You have a pending refund for order {order.order_id}. Please refund the buyer the order amount.',
                                    'refund_id': str(refund.id),
                                    'order_id': order.order_id,
                                    'priority': 'urgent',  # Red/urgent notification
                                    'action_url': '/vendor/orders'
                                }
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error sending real-time reminder to vendor {vendor.id}: {e}")
                
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
                
                # Notify buyer
                Notification.objects.create(
                    user=refund.buyer,
                    type='refund',
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



