"""
Helper functions to send notifications to admin users
"""
from django.contrib.auth import get_user_model
from shared.models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


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
        # Get all admin users
        admin_users = User.objects.filter(
            user_type='admin'
        ).exclude(is_active=False)
        
        if not admin_users.exists():
            logger.warning("No admin users found to send notification")
            return
        
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("Channel layer not available for real-time notifications")
        
        # Create notification for each admin user
        for admin_user in admin_users:
            try:
                # Create database notification
                notification = Notification.objects.create(
                    user=admin_user,
                    type=notification_type,
                    title=title,
                    message=message,
                    is_read=False,
                    data=data or {}
                )
                
                # Send real-time notification via WebSocket
                if channel_layer:
                    try:
                        # Include action_url from data if available
                        action_url = (data or {}).get('action_url', '/admin')
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{admin_user.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': str(notification.id),
                                    'type': notification_type,
                                    'title': title,
                                    'message': message,
                                    'is_read': False,
                                    'data': data or {},
                                    'action_url': action_url,  # Include action_url for navigation
                                    'created_at': notification.created_at.isoformat(),
                                    'priority': priority
                                }
                            }
                        )
                        logger.info(f"✅ Sent real-time notification to admin {admin_user.id} via WebSocket")
                    except Exception as e:
                        logger.error(f"Error sending real-time notification to admin {admin_user.id}: {e}")
                
            except Exception as e:
                logger.error(f"Error creating notification for admin {admin_user.id}: {e}")
        
        logger.info(f"Admin notification sent: {title}")
        
    except Exception as e:
        logger.error(f"Error in send_admin_notification: {e}")


def notify_admin_order_created(order):
    """Notify admin when a new order is created"""
    send_admin_notification(
        notification_type='order',
        title='New Order Created',
        message=f'Order #{order.order_id} created by {order.buyer.username} for "{order.product.headline}" - Amount: {order.total_amount} {order.crypto_currency}',
        data={
            'order_id': order.order_id,
            'buyer_username': order.buyer.username,
            'vendor_username': order.vendor.username if hasattr(order, 'vendor') else 'N/A',
            'product_id': str(order.product.id),
            'product_headline': order.product.headline,
            'amount': str(order.total_amount),
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
    send_admin_notification(
        notification_type='payment',
        title='Payment Received',
        message=f'Payment received for Order #{order.order_id} - {order.total_amount} {order.crypto_currency} from {order.buyer.username}',
        data={
            'order_id': order.order_id,
            'buyer_username': order.buyer.username,
            'amount': str(order.total_amount),
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
    from shared.models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        channel_layer = get_channel_layer()
        action_url = f'/buyer/support' if ticket.user_type == 'buyer' else f'/vendor/support'
        
        # Create notification for the ticket owner
        notification = Notification.objects.create(
            user=ticket.user,
            type='system',
            title='Ticket Response',
            message=f'Admin {admin_user.username} responded to your ticket: "{ticket.subject}"',
            is_read=False,
            data={
                'ticket_id': str(ticket.id),
                'ticket_id_display': ticket.ticket_id,
                'admin_username': admin_user.username,
                'subject': ticket.subject,
                'action_url': action_url
            }
        )
        
        # Send real-time notification
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{ticket.user.id}',
                    {
                        'type': 'order_notification',
                        'data': {
                            'id': str(notification.id),
                            'type': 'system',
                            'title': 'Ticket Response',
                            'message': f'Admin {admin_user.username} responded to your ticket: "{ticket.subject}"',
                            'is_read': False,
                            'data': {
                                'ticket_id': str(ticket.id),
                                'ticket_id_display': ticket.ticket_id,
                                'admin_username': admin_user.username,
                                'subject': ticket.subject,
                                'action_url': action_url
                            },
                            'action_url': action_url,
                            'created_at': notification.created_at.isoformat(),
                            'priority': 'normal'
                        }
                    }
                )
            except Exception as e:
                logger.error(f"Error sending real-time notification to user {ticket.user.id}: {e}")
    except Exception as e:
        logger.error(f"Error notifying user about ticket response: {e}")


def notify_user_ticket_resolved(ticket, admin_user):
    """Notify buyer/vendor when their ticket is resolved"""
    from shared.models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        channel_layer = get_channel_layer()
        action_url = f'/buyer/support' if ticket.user_type == 'buyer' else f'/vendor/support'
        
        # Create notification for the ticket owner
        notification = Notification.objects.create(
            user=ticket.user,
            type='system',
            title='Ticket Resolved',
            message=f'Your ticket "{ticket.subject}" has been resolved',
            is_read=False,
            data={
                'ticket_id': str(ticket.id),
                'ticket_id_display': ticket.ticket_id,
                'admin_username': admin_user.username,
                'subject': ticket.subject,
                'action_url': action_url
            }
        )
        
        # Send real-time notification
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{ticket.user.id}',
                    {
                        'type': 'order_notification',
                        'data': {
                            'id': str(notification.id),
                            'type': 'system',
                            'title': 'Ticket Resolved',
                            'message': f'Your ticket "{ticket.subject}" has been resolved',
                            'is_read': False,
                            'data': {
                                'ticket_id': str(ticket.id),
                                'ticket_id_display': ticket.ticket_id,
                                'admin_username': admin_user.username,
                                'subject': ticket.subject,
                                'action_url': action_url
                            },
                            'action_url': action_url,
                            'created_at': notification.created_at.isoformat(),
                            'priority': 'normal'
                        }
                    }
                )
            except Exception as e:
                logger.error(f"Error sending real-time notification to user {ticket.user.id}: {e}")
    except Exception as e:
        logger.error(f"Error notifying user about ticket resolution: {e}")


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


def notify_user_vendor_application_approved(application, admin_user):
    """Notify buyer when their vendor application is approved"""
    from shared.models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        # Get the user by vendor_username
        user = User.objects.get(username=application.vendor_username)
        
        channel_layer = get_channel_layer()
        action_url = f'/vendor/dashboard'
        
        # Create notification for the user
        notification = Notification.objects.create(
            user=user,
            type='system',
            title='Vendor Application Approved',
            message=f'Congratulations! Your vendor application for "{application.business_name}" has been approved. You can now start listing products.',
            is_read=False,
            data={
                'application_id': str(application.id),
                'business_name': application.business_name,
                'admin_username': admin_user.username,
                'action_url': action_url
            }
        )
        
        # Send real-time notification
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{user.id}',
                    {
                        'type': 'order_notification',
                        'data': {
                            'id': str(notification.id),
                            'type': 'system',
                            'title': 'Vendor Application Approved',
                            'message': f'Congratulations! Your vendor application for "{application.business_name}" has been approved. You can now start listing products.',
                            'is_read': False,
                            'data': {
                                'application_id': str(application.id),
                                'business_name': application.business_name,
                                'admin_username': admin_user.username,
                                'action_url': action_url
                            },
                            'action_url': action_url,
                            'created_at': notification.created_at.isoformat(),
                            'priority': 'normal'
                        }
                    }
                )
            except Exception as e:
                logger.error(f"Error sending real-time notification to user {user.id}: {e}")
    except User.DoesNotExist:
        logger.error(f"User with username {application.vendor_username} not found")
    except Exception as e:
        logger.error(f"Error notifying user about vendor application approval: {e}")


def notify_user_vendor_application_rejected(application, admin_user, rejection_reason=None):
    """Notify buyer when their vendor application is rejected"""
    from shared.models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        # Get the user by vendor_username
        user = User.objects.get(username=application.vendor_username)
        
        channel_layer = get_channel_layer()
        action_url = f'/vendor/apply'
        
        reason_text = f' Reason: {rejection_reason}' if rejection_reason else ''
        
        # Create notification for the user
        notification = Notification.objects.create(
            user=user,
            type='system',
            title='Vendor Application Rejected',
            message=f'Your vendor application for "{application.business_name}" has been rejected.{reason_text}',
            is_read=False,
            data={
                'application_id': str(application.id),
                'business_name': application.business_name,
                'admin_username': admin_user.username,
                'rejection_reason': rejection_reason,
                'action_url': action_url
            }
        )
        
        # Send real-time notification
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{user.id}',
                    {
                        'type': 'order_notification',
                        'data': {
                            'id': str(notification.id),
                            'type': 'system',
                            'title': 'Vendor Application Rejected',
                            'message': f'Your vendor application for "{application.business_name}" has been rejected.{reason_text}',
                            'is_read': False,
                            'data': {
                                'application_id': str(application.id),
                                'business_name': application.business_name,
                                'admin_username': admin_user.username,
                                'rejection_reason': rejection_reason,
                                'action_url': action_url
                            },
                            'action_url': action_url,
                            'created_at': notification.created_at.isoformat(),
                            'priority': 'normal'
                        }
                    }
                )
            except Exception as e:
                logger.error(f"Error sending real-time notification to user {user.id}: {e}")
    except User.DoesNotExist:
        logger.error(f"User with username {application.vendor_username} not found")
    except Exception as e:
        logger.error(f"Error notifying user about vendor application rejection: {e}")


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
    from shared.models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        channel_layer = get_channel_layer()
        
        # Notify vendor
        vendor_notification = Notification.objects.create(
            user=payout.vendor,
            type='system',
            title='New Payout Created',
            message=f'Payout for order {payout.order.order_id} has been created. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
            is_read=False,
            data={
                'payout_id': str(payout.id),
                'order_id': payout.order.order_id,
                'amount': str(payout.net_amount),
                'crypto_currency': payout.crypto_currency.symbol,
                'status': payout.status,
                'action_url': f'/vendor/payouts'
            }
        )
        
        # Notify buyer
        buyer_notification = Notification.objects.create(
            user=payout.buyer,
            type='system',
            title='Payout Created',
            message=f'Payout for order {payout.order.order_id} has been created. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
            is_read=False,
            data={
                'payout_id': str(payout.id),
                'order_id': payout.order.order_id,
                'amount': str(payout.net_amount),
                'crypto_currency': payout.crypto_currency.symbol,
                'status': payout.status,
                'action_url': f'/buyer/orders'
            }
        )
        
        # Notify admin
        send_admin_notification(
            notification_type='system',
            title='New Payout Created',
            message=f'Payout created for order {payout.order.order_id} - Vendor: {payout.vendor.username}, Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
            data={
                'payout_id': str(payout.id),
                'order_id': payout.order.order_id,
                'vendor_username': payout.vendor.username,
                'buyer_username': payout.buyer.username,
                'amount': str(payout.net_amount),
                'crypto_currency': payout.crypto_currency.symbol,
                'status': payout.status,
                'action_url': f'/admin/payouts'
            },
            priority='normal'
        )
        
        # Send real-time notifications
        if channel_layer:
            # Notify vendor
            async_to_sync(channel_layer.group_send)(
                f'realtime_{payout.vendor.id}',
                {
                    'type': 'order_notification',
                    'data': {
                        'id': str(vendor_notification.id),
                        'type': 'system',
                        'title': 'New Payout Created',
                        'message': f'Payout for order {payout.order.order_id} has been created. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
                        'is_read': False,
                        'data': {
                            'payout_id': str(payout.id),
                            'order_id': payout.order.order_id,
                            'amount': str(payout.net_amount),
                            'crypto_currency': payout.crypto_currency.symbol,
                            'status': payout.status,
                            'action_url': f'/vendor/payouts'
                        },
                        'action_url': f'/vendor/payouts',
                        'created_at': vendor_notification.created_at.isoformat(),
                        'priority': 'normal'
                    }
                }
            )
            
            # Notify buyer
            async_to_sync(channel_layer.group_send)(
                f'realtime_{payout.buyer.id}',
                {
                    'type': 'order_notification',
                    'data': {
                        'id': str(buyer_notification.id),
                        'type': 'system',
                        'title': 'Payout Created',
                        'message': f'Payout for order {payout.order.order_id} has been created. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
                        'is_read': False,
                        'data': {
                            'payout_id': str(payout.id),
                            'order_id': payout.order.order_id,
                            'amount': str(payout.net_amount),
                            'crypto_currency': payout.crypto_currency.symbol,
                            'status': payout.status,
                            'action_url': f'/buyer/orders'
                        },
                        'action_url': f'/buyer/orders',
                        'created_at': buyer_notification.created_at.isoformat(),
                        'priority': 'normal'
                    }
                }
            )
    except Exception as e:
        logger.error(f"Error notifying about payout creation: {e}")


def notify_payout_status_changed(payout, old_status, new_status):
    """Notify buyer, vendor, and admin when payout status changes"""
    from shared.models import Notification
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    try:
        channel_layer = get_channel_layer()
        status_messages = {
            'processing': 'is being processed',
            'completed': 'has been completed',
            'failed': 'has failed',
            'cancelled': 'has been cancelled'
        }
        message = status_messages.get(new_status, f'status changed to {new_status}')
        
        # Notify vendor
        vendor_notification = Notification.objects.create(
            user=payout.vendor,
            type='system',
            title='Payout Status Updated',
            message=f'Payout for order {payout.order.order_id} {message}. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
            is_read=False,
            data={
                'payout_id': str(payout.id),
                'order_id': payout.order.order_id,
                'amount': str(payout.net_amount),
                'crypto_currency': payout.crypto_currency.symbol,
                'old_status': old_status,
                'status': new_status,
                'action_url': f'/vendor/payouts'
            }
        )
        
        # Notify buyer
        buyer_notification = Notification.objects.create(
            user=payout.buyer,
            type='system',
            title='Payout Status Updated',
            message=f'Payout for order {payout.order.order_id} {message}. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
            is_read=False,
            data={
                'payout_id': str(payout.id),
                'order_id': payout.order.order_id,
                'amount': str(payout.net_amount),
                'crypto_currency': payout.crypto_currency.symbol,
                'old_status': old_status,
                'status': new_status,
                'action_url': f'/buyer/orders'
            }
        )
        
        # Notify admin
        send_admin_notification(
            notification_type='system',
            title='Payout Status Updated',
            message=f'Payout for order {payout.order.order_id} {message} - Vendor: {payout.vendor.username}, Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
            data={
                'payout_id': str(payout.id),
                'order_id': payout.order.order_id,
                'vendor_username': payout.vendor.username,
                'buyer_username': payout.buyer.username,
                'amount': str(payout.net_amount),
                'crypto_currency': payout.crypto_currency.symbol,
                'old_status': old_status,
                'status': new_status,
                'action_url': f'/admin/payouts'
            },
            priority='high' if new_status in ['completed', 'failed'] else 'normal'
        )
        
        # Send real-time notifications
        if channel_layer:
            # Notify vendor
            async_to_sync(channel_layer.group_send)(
                f'realtime_{payout.vendor.id}',
                {
                    'type': 'order_notification',
                    'data': {
                        'id': str(vendor_notification.id),
                        'type': 'system',
                        'title': 'Payout Status Updated',
                        'message': f'Payout for order {payout.order.order_id} {message}. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
                        'is_read': False,
                        'data': {
                            'payout_id': str(payout.id),
                            'order_id': payout.order.order_id,
                            'amount': str(payout.net_amount),
                            'crypto_currency': payout.crypto_currency.symbol,
                            'old_status': old_status,
                            'status': new_status,
                            'action_url': f'/vendor/payouts'
                        },
                        'action_url': f'/vendor/payouts',
                        'created_at': vendor_notification.created_at.isoformat(),
                        'priority': 'high' if new_status in ['completed', 'failed'] else 'normal'
                    }
                }
            )
            
            # Notify buyer
            async_to_sync(channel_layer.group_send)(
                f'realtime_{payout.buyer.id}',
                {
                    'type': 'order_notification',
                    'data': {
                        'id': str(buyer_notification.id),
                        'type': 'system',
                        'title': 'Payout Status Updated',
                        'message': f'Payout for order {payout.order.order_id} {message}. Amount: {payout.net_amount} {payout.crypto_currency.symbol}',
                        'is_read': False,
                        'data': {
                            'payout_id': str(payout.id),
                            'order_id': payout.order.order_id,
                            'amount': str(payout.net_amount),
                            'crypto_currency': payout.crypto_currency.symbol,
                            'old_status': old_status,
                            'status': new_status,
                            'action_url': f'/buyer/orders'
                        },
                        'action_url': f'/buyer/orders',
                        'created_at': buyer_notification.created_at.isoformat(),
                        'priority': 'high' if new_status in ['completed', 'failed'] else 'normal'
                    }
                }
            )
    except Exception as e:
        logger.error(f"Error notifying about payout status change: {e}")


