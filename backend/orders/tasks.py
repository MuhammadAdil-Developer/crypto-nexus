from celery import shared_task
from django.utils import timezone
from shared.models import Notification
from users.models import User
from products.models import Product
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



