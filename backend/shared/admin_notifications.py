"""
Helper functions to send notifications to admin users
"""
from django.contrib.auth import get_user_model
from shared.models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

from decimal import Decimal
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


def format_crypto_amount(amount):
    """Format a crypto amount to 8 decimal places and remove trailing zeros"""
    if amount is None:
        return "0"
    try:
        # Format to 8 decimal places
        formatted = "{:.8f}".format(float(amount))
        # Remove trailing zeros and possible trailing dot
        return formatted.rstrip('0').rstrip('.') if '.' in formatted else formatted
    except (ValueError, TypeError):
        return str(amount)


def send_user_notification(
    user,
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
    priority: str = 'normal'
):
    """
    Send notification to a specific user, respecting their preferences
    """
    try:
        # Check user preferences
        preference_map = {
            'order': 'notify_new_orders',
            'order_status_changed': 'notify_new_orders',
            'order_created': 'notify_new_orders',
            'message': 'notify_messages',
            'dispute': 'notify_disputes',
            'dispute_message': 'notify_disputes',
            'dispute_resolved': 'notify_disputes',
            'dispute_lost': 'notify_disputes',
            'review': 'notify_reviews',
            'ticket_assigned': 'notify_support_tickets',
            'ticket_response': 'notify_support_tickets',
            'ticket_resolved': 'notify_support_tickets',
            'payment': 'notify_payouts',
            'payment_confirmed': 'notify_new_orders',
            'payment_received': 'notify_new_orders',
            'payment_failed': 'notify_new_orders',
            'payout_created': 'notify_payouts',
            'payout_status_changed': 'notify_payouts',
            'listing_approval': 'notify_support_tickets', # Map listing stuff to support/system if no specific toggle
            'listing_rejection': 'notify_support_tickets',
            'marketing': 'notify_marketing',
            'wishlist': 'notify_marketing',
            'refund': 'notify_disputes',
            'review_prompt': 'notify_reviews',
            'security': 'notify_login_alerts',
            'login_alert': 'notify_login_alerts',
        }

        pref_field = preference_map.get(notification_type)
        if pref_field and not getattr(user, pref_field, True):
            logger.info(f"🔕 Notification suppressed for user {user.username} (type: {notification_type}, field: {pref_field})")
            return None

        # Create database notification
        notification = Notification.objects.create(
            user=user,
            type=notification_type if notification_type in [t[0] for t in Notification.NOTIFICATION_TYPES] else 'system',
            title=title,
            message=message,
            is_read=False,
            data=data or {}
        )

        # Send real-time notification via WebSocket
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                # Use same format as admin notifications for consistency
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{user.id}',
                    {
                        'type': 'order_notification',
                        'data': {
                            'id': str(notification.id),
                            'type': notification_type,
                            'title': title,
                            'message': message,
                            'is_read': False,
                            'data': data or {},
                            'action_url': (data or {}).get('action_url', '/'),
                            'created_at': notification.created_at.isoformat(),
                            'priority': priority
                        }
                    }
                )
                logger.info(f"✅ Sent real-time notification to user {user.id}")
            except Exception as e:
                logger.error(f"Error sending real-time notification to user {user.id}: {e}")

        return notification
    except Exception as e:
        logger.error(f"Error in send_user_notification: {e}")
        return None


def notify_user_login(user, ip_address):
    """Notify user about a successful login"""
    from django.utils import timezone
    now = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    
    send_user_notification(
        user=user,
        notification_type='security',
        title='Login Alert',
        message=f'Successful login to your account from IP: {ip_address} at {now}. If this was not you, please change your password immediately.',
        data={
            'ip_address': ip_address,
            'timestamp': now,
            'action_url': '/settings'
        },
        priority='high'
    )


def send_admin_notification(
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
    priority: str = 'normal'
):
    """
    Send notification to all admin users
    
    Args:
        notification_type: Type of notification (order, payment, message, system, etc.)
        title: Notification title
        message: Notification message
        data: Additional data for the notification
        priority: Priority level (low, normal, high, urgent)
    """
    try:
        # Get all admin users - double filter for extra safety
        admin_users = User.objects.filter(
            user_type='admin',
            is_active=True
        )
        
        if not admin_users.exists():
            logger.warning("No admin users found to send notification")
            return
        
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("Channel layer not available for real-time notifications")
        
        # Create notification for each admin user
        for admin_user in admin_users:
            # Final safety check: ensure we never send admin alerts to normal users
            if admin_user.user_type != 'admin':
                continue
                
            try:
                # Create a database notification for THIS admin user
                notification = Notification.objects.create(
                    user=admin_user,
                    type=notification_type if notification_type in [t[0] for t in Notification.NOTIFICATION_TYPES] else 'system',
                    title=title,
                    message=message,
                    data=data or {}
                )
                
                # Send real-time notification
                channel_layer = get_channel_layer()
                if channel_layer:
                    try:
                        # Use strictly prefixed group name
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{admin_user.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': str(notification.id),
                                    'type': notification.type,
                                    'title': title,
                                    'message': message,
                                    'is_read': False,
                                    'data': data or {},
                                    'action_url': (data or {}).get('action_url', '/admin'),
                                    'created_at': notification.created_at.isoformat(),
                                    'priority': priority
                                }
                            }
                        )
                        logger.info(f"✅ Sent real-time notification to admin {admin_user.id} via WebSocket")
                    except Exception as e:
                        logger.error(f"Error sending real-time admin notification to admin {admin_user.id}: {e}")
            except Exception as e:
                logger.error(f"Error creating notification for admin {admin_user.id}: {e}")
        
        logger.info(f"Admin notification sent: {title}")
        
    except Exception as e:
        logger.error(f"Error in send_admin_notification: {e}")


def notify_admin_order_created(order):
    """Notify admin when a new order is created"""
    formatted_amount = format_crypto_amount(order.total_amount)
    send_admin_notification(
        notification_type='order',
        title='New Order Created',
        message=f'Order #{order.order_id} created by {order.buyer.username} for "{order.product.headline}" - Amount: {formatted_amount} {order.crypto_currency}',
        data={
            'order_id': order.order_id,
            'buyer_username': order.buyer.username,
            'vendor_username': order.vendor.username if hasattr(order, 'vendor') else 'N/A',
            'product_id': str(order.product.id),
            'product_headline': order.product.headline,
            'amount': formatted_amount,
            'crypto_currency': order.crypto_currency,
            'action_url': f'/admin/orders'
        },
        priority='high'
    )


def notify_admin_order_expired(order):
    """Notify admin when an order expires"""
    send_admin_notification(
        notification_type='order',
        title='Order Expired',
        message=f'Order #{order.order_id} from {order.buyer.username} for "{order.product.headline}" has expired due to payment timeout',
        data={
            'order_id': order.order_id,
            'buyer_username': order.buyer.username,
            'vendor_username': order.vendor.username if hasattr(order, 'vendor') else 'N/A',
            'product_id': str(order.product.id),
            'product_headline': order.product.headline,
            'action_url': f'/admin/orders'
        },
        priority='normal'
    )


def notify_admin_payment_received(order, payment):
    """Notify admin when payment is received"""
    formatted_amount = format_crypto_amount(order.total_amount)
    send_admin_notification(
        notification_type='payment',
        title='Payment Received',
        message=f'Payment received for Order #{order.order_id} - {formatted_amount} {order.crypto_currency} from {order.buyer.username}',
        data={
            'order_id': order.order_id,
            'buyer_username': order.buyer.username,
            'amount': formatted_amount,
            'crypto_currency': order.crypto_currency,
            'payment_id': str(payment.id) if hasattr(payment, 'id') else None,
            'action_url': f'/admin/orders'
        },
        priority='high'
    )


def notify_admin_payment_failed(order, error_message=None):
    """Notify admin when payment fails"""
    send_admin_notification(
        notification_type='payment',
        title='Payment Failed',
        message=f'Payment failed for Order #{order.order_id} from {order.buyer.username}. {error_message or ""}',
        data={
            'order_id': order.order_id,
            'buyer_username': order.buyer.username,
            'error': error_message,
            'action_url': f'/admin/orders'
        },
        priority='high'
    )


def notify_admin_vendor_application(application):
    """Notify admin when vendor applies"""
    send_admin_notification(
        notification_type='system',
        title='New Vendor Application',
        message=f'{application.vendor_username} has submitted a vendor application: {application.business_name}',
        data={
            'application_id': str(application.id),
            'vendor_username': application.vendor_username,
            'business_name': application.business_name,
            'email': application.email,
            'action_url': f'/admin/vendors'
        },
        priority='high'
    )


def notify_admin_product_created(product):
    """Notify admin when a new product is created"""
    send_admin_notification(
        notification_type='listing_approval',
        title='New Product Listing',
        message=f'New product "{product.headline}" created by {product.vendor.username} - Requires approval',
        data={
            'product_id': str(product.id),
            'vendor_username': product.vendor.username,
            'product_headline': product.headline,
            'action_url': f'/admin/listings'
        },
        priority='normal'
    )


def notify_admin_dispute_opened(dispute):
    """Notify admin when a dispute is opened"""
    # Dispute model has 'buyer' field, not 'opened_by'
    buyer_username = dispute.buyer.username if hasattr(dispute, 'buyer') and dispute.buyer else 'Unknown'
    dispute_title = dispute.title if hasattr(dispute, 'title') else 'Dispute'
    dispute_description = dispute.description if hasattr(dispute, 'description') else ''
    
    send_admin_notification(
        notification_type='dispute',
        title='New Dispute Opened',
        message=f'Dispute "{dispute_title}" opened for Order #{dispute.order.order_id} by {buyer_username}',
        data={
            'dispute_id': str(dispute.id),
            'order_id': dispute.order.order_id,
            'buyer_username': buyer_username,
            'title': dispute_title,
            'description': dispute_description,
            'priority': dispute.priority if hasattr(dispute, 'priority') else 'medium',
            'action_url': f'/admin/disputes'
        },
        priority='urgent'
    )


def notify_admin_dispute_resolved(dispute, resolution):
    """Notify admin when a dispute is resolved"""
    send_admin_notification(
        notification_type='dispute',
        title='Dispute Resolved',
        message=f'Dispute for Order #{dispute.order.order_id} has been resolved: {resolution}',
        data={
            'dispute_id': str(dispute.id),
            'order_id': dispute.order.order_id,
            'resolution': resolution,
            'action_url': f'/admin/disputes'
        },
        priority='normal'
    )


def notify_admin_review_submitted(review, product):
    """Notify admin when a buyer submits a review"""
    send_admin_notification(
        notification_type='system',
        title='New Review Submitted',
        message=f'{review.user.username} submitted a {review.rating}-star review for "{product.headline}"',
        data={
            'review_id': str(review.id),
            'product_id': str(product.id),
            'product_headline': product.headline,
            'buyer_username': review.user.username,
            'rating': review.rating,
            'action_url': f'/admin/listings'
        },
        priority='normal'
    )


def notify_admin_vendor_reply_to_review(review, product, vendor):
    """Notify admin when a vendor replies to a review"""
    send_admin_notification(
        notification_type='system',
        title='Vendor Replied to Review',
        message=f'{vendor.username} replied to a review for "{product.headline}"',
        data={
            'review_id': str(review.id),
            'product_id': str(product.id),
            'product_headline': product.headline,
            'vendor_username': vendor.username,
            'action_url': f'/admin/listings'
        },
        priority='normal'
    )


def notify_admin_ticket_submitted(ticket):
    """Notify admin when a buyer/vendor submits a ticket"""
    user_type = ticket.user_type or 'user'
    send_admin_notification(
        notification_type='system',
        title='New Support Ticket',
        message=f'New ticket "{ticket.subject}" submitted by {ticket.user.username} ({user_type})',
        data={
            'ticket_id': str(ticket.id),
            'ticket_id_display': ticket.ticket_id,
            'user_username': ticket.user.username,
            'user_type': user_type,
            'subject': ticket.subject,
            'priority': ticket.priority,
            'action_url': f'/admin/tickets'
        },
        priority='high' if ticket.priority in ['high', 'urgent'] else 'normal'
    )


def notify_user_ticket_response(ticket, admin_user, is_admin_response=True):
    """Notify buyer/vendor when admin responds to their ticket"""
    action_url = f'/buyer/support' if ticket.user_type == 'buyer' else f'/vendor/support'
    
    send_user_notification(
        user=ticket.user,
        notification_type='ticket_response',
        title='Ticket Response',
        message=f'Admin {admin_user.username} responded to your ticket: "{ticket.subject}"',
        data={
            'ticket_id': str(ticket.id),
            'ticket_id_display': ticket.ticket_id,
            'admin_username': admin_user.username,
            'subject': ticket.subject,
            'action_url': action_url
        }
    )


def notify_user_ticket_resolved(ticket, admin_user):
    """Notify buyer/vendor when their ticket is resolved"""
    action_url = f'/buyer/support' if ticket.user_type == 'buyer' else f'/vendor/support'
    
    send_user_notification(
        user=ticket.user,
        notification_type='ticket_response',
        title='Ticket Resolved',
        message=f'Your ticket "{ticket.subject}" has been resolved',
        data={
            'ticket_id': str(ticket.id),
            'ticket_id_display': ticket.ticket_id,
            'admin_username': admin_user.username,
            'subject': ticket.subject,
            'action_url': action_url
        }
    )


def notify_admin_suspicious_login(username, ip_address, reason, attempts=None):
    """Notify admin about suspicious login attempts (red alert)"""
    message = f'Suspicious login attempt detected for user "{username}" from IP {ip_address}. Reason: {reason}'
    if attempts:
        message += f' ({attempts} failed attempts)'
    
    send_admin_notification(
        notification_type='system',
        title='⚠️ Suspicious Login Attempt',
        message=message,
        data={
            'username': username,
            'ip_address': ip_address,
            'reason': reason,
            'attempts': attempts,
            'action_url': f'/admin/security'
        },
        priority='urgent'  # Urgent priority for security alerts
    )


def notify_admin_new_user_signup(user):
    """Notify admin when a new user signs up"""
    send_admin_notification(
        notification_type='system',
        title='New User Signup',
        message=f'New {user.user_type} registered: {user.username}',
        data={
            'user_id': str(user.id),
            'username': user.username,
            'user_type': user.user_type,
            'action_url': f'/admin/users'
        },
        priority='normal'
    )


def notify_admin_product_resubmitted(product):
    """Notify admin when a vendor resubmits a product for review"""
    send_admin_notification(
        notification_type='listing_approval',
        title='Product Resubmitted',
        message=f'Product "{product.headline}" resubmitted by {product.vendor.username} for approval',
        data={
            'product_id': str(product.id),
            'vendor_username': product.vendor.username,
            'product_headline': product.headline,
            'action_url': f'/admin/listings'
        },
        priority='normal'
    )


def notify_user_vendor_application_approved(application, admin_user, admin_notes=None):
    """Notify buyer when their vendor application is approved"""
    try:
        user = User.objects.get(username=application.vendor_username)
        message = f'Congratulations! Your vendor application for "{application.business_name}" has been approved. You can now start listing products.'
        
        if admin_notes:
            message += f'\n\nAdmin Notes: {admin_notes}'
            
        send_user_notification(
            user=user,
            notification_type='system',
            title='Vendor Application Approved',
            message=message,
            data={
                'application_id': str(application.id),
                'business_name': application.business_name,
                'admin_username': admin_user.username,
                'admin_notes': admin_notes,
                'action_url': '/vendor/dashboard'
            }
        )
    except User.DoesNotExist:
        logger.error(f"User with username {application.vendor_username} not found")


def notify_user_vendor_application_rejected(application, admin_user, rejection_reason=None):
    """Notify buyer when their vendor application is rejected"""
    import html
    try:
        user = User.objects.get(username=application.vendor_username)
        if rejection_reason:
            escaped_reason = html.escape(rejection_reason)
            message = f'Your vendor application for "{application.business_name}" has been rejected.\n\nReason: <b>{escaped_reason}</b>'
        else:
            message = f'Your vendor application for "{application.business_name}" has been rejected.'
            
        send_user_notification(
            user=user,
            notification_type='system',
            title='Vendor Application Rejected',
            message=message,
            data={
                'application_id': str(application.id),
                'business_name': application.business_name,
                'admin_username': admin_user.username,
                'rejection_reason': rejection_reason,
                'action_url': '/vendor/apply'
            }
        )
    except User.DoesNotExist:
        logger.error(f"User with username {application.vendor_username} not found")


def notify_admin_ticket_message(ticket, sender_user, message):
    """Notify admin when vendor/buyer responds to a ticket"""
    send_admin_notification(
        notification_type='system',
        title='New Ticket Message',
        message=f'{sender_user.username} ({ticket.user_type}) responded to ticket: "{ticket.subject}"',
        data={
            'ticket_id': str(ticket.id),
            'ticket_id_display': ticket.ticket_id,
            'sender_username': sender_user.username,
            'sender_type': ticket.user_type,
            'subject': ticket.subject,
            'message_id': str(message.id),
            'action_url': f'/admin/tickets/{ticket.id}'
        },
        priority='normal'
    )


def notify_payout_created(payout):
    """Notify buyer, vendor, and admin when a payout is created"""
    formatted_amount = format_crypto_amount(payout.net_amount)
    
    # Notify vendor
    send_user_notification(
        user=payout.vendor,
        notification_type='payment',
        title='New Payout Created',
        message=f'Payout for order {payout.order.order_id} has been created. Amount: {formatted_amount} {payout.crypto_currency.symbol}',
        data={
            'payout_id': str(payout.id),
            'order_id': payout.order.order_id,
            'amount': formatted_amount,
            'crypto_currency': payout.crypto_currency.symbol,
            'status': payout.status,
            'action_url': f'/vendor/payouts'
        }
    )
    
    # Notify buyer
    send_user_notification(
        user=payout.buyer,
        notification_type='payment',
        title='Payout Created',
        message=f'Payout for order {payout.order.order_id} has been created. Amount: {formatted_amount} {payout.crypto_currency.symbol}',
        data={
            'payout_id': str(payout.id),
            'order_id': payout.order.order_id,
            'amount': formatted_amount,
            'crypto_currency': payout.crypto_currency.symbol,
            'status': payout.status,
            'action_url': f'/buyer/orders'
        }
    )
    
    # Notify admin
    send_admin_notification(
        notification_type='system',
        title='New Payout Created',
        message=f'Payout created for order {payout.order.order_id} - Vendor: {payout.vendor.username}, Amount: {formatted_amount} {payout.crypto_currency.symbol}',
        data={
            'payout_id': str(payout.id),
            'order_id': payout.order.order_id,
            'vendor_username': payout.vendor.username,
            'buyer_username': payout.buyer.username,
            'amount': formatted_amount,
            'crypto_currency': payout.crypto_currency.symbol,
            'status': payout.status,
            'action_url': f'/admin/payouts'
        },
        priority='normal'
    )


def notify_payout_status_changed(payout, old_status, new_status):
    """Notify buyer, vendor, and admin when payout status changes"""
    status_messages = {
        'processing': 'is being processed',
        'completed': 'has been completed',
        'failed': 'has failed',
        'cancelled': 'has been cancelled'
    }
    
    is_refund = getattr(payout, 'payout_type', None) == 'refund'
    noun = "Refund" if is_refund else "Payout"
    
    message = status_messages.get(new_status, f'status changed to {new_status}')
    
    formatted_amount = format_crypto_amount(payout.net_amount)
    
    # Notify vendor
    vendor_msg = f'{noun} for order {payout.order.order_id} {message}. Amount: {formatted_amount} {payout.crypto_currency.symbol}'
    if is_refund:
        vendor_msg = f'Auto-refund for order {payout.order.order_id} {message}. (Refunded to Buyer)'

    send_user_notification(
        user=payout.vendor,
        notification_type='payment',
        title=f'{noun} Status Updated',
        message=vendor_msg,
        data={
            'payout_id': str(payout.id),
            'order_id': payout.order.order_id,
            'amount': formatted_amount,
            'crypto_currency': payout.crypto_currency.symbol,
            'old_status': old_status,
            'status': new_status,
            'action_url': f'/vendor/payouts'
        }
    )
    
    # Notify buyer
    buyer_msg = f'{noun} for order {payout.order.order_id} {message}. Amount: {formatted_amount} {payout.crypto_currency.symbol}'
    if not is_refund:
        # For vendor payouts, buyer usually doesn't need detailed alerts, but if we keep it:
        buyer_msg = f'Payment release for order {payout.order.order_id} {message}.' # Less specific for vendor payout

    send_user_notification(
        user=payout.buyer,
        notification_type='payment',
        title=f'{noun} Status Updated',
        message=buyer_msg,
        data={
            'payout_id': str(payout.id),
            'order_id': payout.order.order_id,
            'amount': formatted_amount,
            'crypto_currency': payout.crypto_currency.symbol,
            'old_status': old_status,
            'status': new_status,
            'action_url': f'/buyer/orders'
        }
    )
    
    # Notify admin
    send_admin_notification(
        notification_type='system',
        title=f'{noun} Status Updated',
        message=f'{noun} for order {payout.order.order_id} {message} - Vendor: {payout.vendor.username}, Amount: {formatted_amount} {payout.crypto_currency.symbol}',
        data={
            'payout_id': str(payout.id),
            'order_id': payout.order.order_id,
            'vendor_username': payout.vendor.username,
            'buyer_username': payout.buyer.username,
            'amount': formatted_amount,
            'crypto_currency': payout.crypto_currency.symbol,
            'old_status': old_status,
            'status': new_status,
            'action_url': f'/admin/payouts'
        },
        priority='high' if new_status in ['completed', 'failed'] else 'normal'
    )


def notify_user_message_deleted_by_admin(user, conversation_id):
    """Notify user when admin deletes their message"""
    send_user_notification(
        user=user,
        notification_type='security',
        title='Message Removed by Admin',
        message=f'One of your messages in a conversation has been removed by a site administrator for moderation purposes.',
        data={
            'conversation_id': conversation_id,
            'action_url': f'/buyer/messages' if user.user_type == 'buyer' else '/vendor/messages'
        },
        priority='high'
    )


def notify_user_conversation_deleted_by_admin(user, conversation_id):
    """Notify user when admin deletes an entire conversation"""
    send_user_notification(
        user=user,
        notification_type='security',
        title='Conversation Removed by Admin',
        message=f'A conversation you were participating in has been removed by a site administrator for moderation purposes.',
        data={
            'conversation_id': conversation_id,
            'action_url': f'/buyer/messages' if user.user_type == 'buyer' else '/vendor/messages'
        },
        priority='high'
    )
