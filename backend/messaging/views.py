from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from shared.models import Conversation, Message
import logging

logger = logging.getLogger(__name__)
from .serializers import (
    ConversationSerializer, 
    MessageSerializer, 
    CreateConversationSerializer,
    SendMessageSerializer
)

from .moderation import run_auto_moderation
from products.models import Product
from users.models import User


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateConversationSerializer
        return ConversationSerializer
    
    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user,
            is_active=True
        ).prefetch_related('participants', 'product', 'last_message')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            conversation = serializer.save()
            response_serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    
    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user,
            is_active=True
        ).prefetch_related('participants', 'product', 'last_message')


class MessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SendMessageSerializer
        return MessageSerializer
    
    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_id')
        
        # Check if user is admin - admins can access any conversation's messages
        is_admin = hasattr(self.request.user, 'user_type') and self.request.user.user_type == 'admin'
        
        if is_admin:
            # Admin can access messages from any conversation
            return Message.objects.filter(
                conversation_id=conversation_id
            ).select_related('sender', 'recipient')
        else:
            # Regular users can only access messages from conversations they're part of
            return Message.objects.filter(
                conversation_id=conversation_id,
                conversation__participants=self.request.user
            ).select_related('sender', 'recipient')
    
    def list(self, request, *args, **kwargs):
        # Mark messages as read when fetching
        queryset = self.get_queryset()
        queryset.filter(recipient=request.user).update(is_read=True)
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        conversation_id = self.kwargs.get('conversation_id')
        conversation = get_object_or_404(
            Conversation.objects.filter(participants=request.user),
            id=conversation_id
        )
        
        # Check if conversation is locked
        if not conversation.is_active:
            return Response(
                {'error': 'This conversation has been locked'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user is blocked
        recipient = conversation.participants.exclude(id=request.user.id).first()
        if recipient and request.user.blocked_users.filter(id=recipient.id).exists():
            return Response(
                {'error': 'You have blocked this user'},
                status=status.HTTP_403_FORBIDDEN
            )
        if recipient and recipient.blocked_users.filter(id=request.user.id).exists():
            return Response(
                {'error': 'This user has blocked you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            message = serializer.save()
            
            # Run auto-moderation
            run_auto_moderation(message)
            
            # Serialize message for real-time delivery (must be done before using it)
            response_serializer = MessageSerializer(message, context={'request': request})
            
            # Update conversation's last_message and updated_at
            conversation.last_message = message
            conversation.save()
            
            # Create notification for recipient
            from shared.admin_notifications import send_user_notification
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            product_title = conversation.product.headline if conversation.product else 'a product'
            send_user_notification(
                user=message.recipient,
                notification_type='message',
                title='New message',
                message=f"{request.user.username} sent you a message about {product_title}: {message.content[:100] if message.content else 'a file'}",
                data={
                    'conversation_id': str(conversation.id),
                    'sender_username': request.user.username,
                    'product_id': str(conversation.product.id) if conversation.product else None,
                    'product_title': product_title,
                    'action_url': f'/buyer/messages' if message.recipient.user_type == 'buyer' else f'/vendor/messages'
                }
            )
            
            # Send real-time notification and update counts
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    # Send message via WebSocket to conversation group for real-time delivery
                    async_to_sync(channel_layer.group_send)(
                        f'chat_{conversation.id}',
                        {
                            'type': 'chat_message',
                            'data': response_serializer.data
                        }
                    )
                    
                    # Send conversation update to both participants for real-time list update
                    for participant in conversation.participants.all():
                        # Get updated conversation data
                        from .serializers import ConversationSerializer
                        from django.test import RequestFactory
                        factory = RequestFactory()
                        mock_request = factory.get('/')
                        mock_request.user = participant
                        conv_serializer = ConversationSerializer(conversation, context={'request': mock_request})
                        
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{participant.id}',
                            {
                                'type': 'conversation_updated',
                                'data': {
                                    'conversation': conv_serializer.data,
                                    'action': 'message_sent',
                                    'message_id': str(message.id)
                                }
                            }
                        )
                    
                    # Update unread count for recipient
                    unread_count = Conversation.objects.filter(
                        participants=message.recipient,
                        is_active=True,
                        messages__recipient=message.recipient,
                        messages__is_read=False
                    ).distinct().count()
                    
                    async_to_sync(channel_layer.group_send)(
                        f'realtime_{message.recipient.id}',
                        {
                            'type': 'unread_count_update',
                            'data': {
                                'unread_count': unread_count
                            }
                        }
                    )
                    
                    # Trigger count refresh for all users (admin/vendor/buyer) when message is created
                    # This ensures sidebar counts update in real-time
                    try:
                        # Send a custom notification to trigger count refresh
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{message.recipient.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': f'count_refresh_msg_{message.id}',
                                    'type': 'system',
                                    'title': 'Count Refresh',
                                    'message': 'Message count updated',
                                    'is_read': False,
                                    'data': {
                                        'action': 'refresh_counts',
                                        'type': 'message'
                                    },
                                    'action_url': '',
                                    'created_at': message.created_at.isoformat(),
                                    'priority': 'low'
                                }
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error sending count refresh notification: {e}")
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error sending real-time message notification: {e}")
            
            response_serializer = MessageSerializer(message, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product_conversation(request):
    """Create a conversation for a specific product"""
    product_id = request.data.get('product_id')
    recipient_id = request.data.get('recipient_id')
    refund_id = request.data.get('refund_id')  # Optional: for refund-specific conversations
    dispute_id = request.data.get('dispute_id')  # Optional: for dispute-specific conversations
    
    if not product_id or not recipient_id:
        return Response(
            {'error': 'product_id and recipient_id are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Use Django ORM to get the product and recipient
    try:
        product = Product.objects.get(id=product_id)
        recipient = User.objects.get(id=recipient_id)
    except (Product.DoesNotExist, User.DoesNotExist):
        return Response(
            {'error': 'Invalid product or recipient'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if conversation already exists using Django ORM
    sender = request.user
    
    # If refund_id or dispute_id is provided, always create a new conversation
    # Otherwise, check for existing conversation
    if refund_id or dispute_id:
        # For refunds/disputes, always create a new conversation to keep them separate
        conversation = Conversation.objects.create(product=product)
        conversation.participants.add(sender, recipient)
        conversation.save()
        
        # Create product reference message immediately with refund/dispute context

        if refund_id:
            # Get refund details for the message
            try:
                from payments.models import RefundRequest
                refund = RefundRequest.objects.get(id=refund_id)
                product_info = {
                    'product_id': str(product.id),
                    'product_title': product.headline,
                    'product_price': str(product.price),
                    'product_image': str(product.main_image) if product.main_image else None,
                    'vendor_username': product.vendor.username,
                    'vendor_id': str(product.vendor.id),
                    'refund_id': refund_id,
                    'order_id': refund.order.order_id if refund.order else None
                }
                content = f"🔄 **Refund Request Chat**\n📦 **Product:** {product.headline}\n💰 **Price:** ${product.price}\n📋 **Order:** {refund.order.order_id if refund.order else 'N/A'}\n👤 **Vendor:** {product.vendor.username}"
            except Exception:
                # Fallback if refund not found - still include product details
                product_info = {
                    'product_id': str(product.id),
                    'product_title': product.headline,
                    'product_price': str(product.price),
                    'product_image': str(product.main_image) if product.main_image else None,
                    'vendor_username': product.vendor.username,
                    'vendor_id': str(product.vendor.id),
                    'refund_id': refund_id
                }
                content = f"🔄 **Refund Request Chat**\n📦 **Product:** {product.headline}\n💰 **Price:** ${product.price}\n👤 **Vendor:** {product.vendor.username}"
        elif dispute_id:
            # Get dispute details for the message
            try:
                from orders.models import OrderDispute
                dispute = OrderDispute.objects.get(id=dispute_id)
                product_info = {
                    'product_id': str(product.id),
                    'product_title': product.headline,
                    'product_price': str(product.price),
                    'product_image': str(product.main_image) if product.main_image else None,
                    'vendor_username': product.vendor.username,
                    'vendor_id': str(product.vendor.id),
                    'dispute_id': dispute_id,
                    'order_id': dispute.order.order_id if dispute.order else None
                }
                content = f"⚖️ **Dispute Chat**\n📦 **Product:** {product.headline}\n💰 **Price:** ${product.price}\n📋 **Order:** {dispute.order.order_id if dispute.order else 'N/A'}\n👤 **Vendor:** {product.vendor.username}"
            except Exception:
                # Fallback if dispute not found - still include product details
                product_info = {
                    'product_id': str(product.id),
                    'product_title': product.headline,
                    'product_price': str(product.price),
                    'product_image': str(product.main_image) if product.main_image else None,
                    'vendor_username': product.vendor.username,
                    'vendor_id': str(product.vendor.id),
                    'dispute_id': dispute_id
                }
                content = f"⚖️ **Dispute Chat**\n📦 **Product:** {product.headline}\n💰 **Price:** ${product.price}\n👤 **Vendor:** {product.vendor.username}"
        else:
            # Regular product reference (shouldn't reach here, but just in case)
            product_info = {
                'product_id': str(product.id),
                'product_title': product.headline,
                'product_price': str(product.price),
                'product_image': str(product.main_image) if product.main_image else None,
                'vendor_username': product.vendor.username,
                'vendor_id': str(product.vendor.id)
            }
            content = f"💬 **Discussing:** {product.headline}\n💰 **Price:** ${product.price}\n👤 **Vendor:** {product.vendor.username}"
        
        # Create the product reference message
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            recipient=recipient,
            content=content,
            message_type='product_reference',
            metadata=product_info
        )
        if hasattr(message, 'is_flagged'):
            message.is_flagged = False
            message.save()
    else:
        # For regular product conversations, check if one already exists
        # STRICT CHECK: Must match product AND exact participants (sender & recipient)
        # We try to find a regular thread, avoiding ones that were created specifically for refunds/disputes
        existing_conversations = Conversation.objects.filter(
            product_id=product.id
        ).filter(participants=sender).filter(participants=recipient).order_by('-updated_at')

        # Try to find a conversation that doesn't have a refund/dispute reference
        # This is a heuristic since we don't have a 'type' field, but we check if the first message 
        # (usually the reference message) has refund/dispute metadata
        existing_conversation = None
        for conv in existing_conversations:
            # Check if this conversation is a specialized one
            # Look at the product reference messages in this conversation
            try:
                ref_msg = Message.objects.filter(conversation=conv, message_type='product_reference').first()
                if ref_msg and not (ref_msg.metadata.get('refund_id') or ref_msg.metadata.get('dispute_id')):
                    existing_conversation = conv
                    break
            except Exception:
                # Fallback to just using the first one if check fails
                existing_conversation = conv
                break
        
        # If no regular conversation found, but we found ANY, we could still fall back
        # but the safest is to let it create a new one if it's strictly a new order thread
        if not existing_conversation and existing_conversations.exists():
            # If all found were refund/dispute related, it's better to create a fresh regular one
            pass # Let it create below
        elif existing_conversation:
            serializer = ConversationSerializer(existing_conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Create new conversation if none exists
        conversation = Conversation.objects.create(product=product)
        conversation.participants.add(sender, recipient)
        conversation.save()


        # Construct product info metadata
        product_info = {
            'product_id': str(product.id),
            'product_title': product.headline,
            'product_price': str(product.price),
            'product_image': str(product.main_image) if product.main_image else None,
            'vendor_username': product.vendor.username,
            'vendor_id': str(product.vendor.id)
        }
        
        content = f"💬 **Discussing:** {product.headline}\n💰 **Price:** ${product.price}\n👤 **Vendor:** {product.vendor.username}"
        
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            recipient=recipient,
            content=content,
            message_type='product_reference',
            metadata=product_info
        )
        if hasattr(message, 'is_flagged'):
            message.is_flagged = False
            message.save()
    
    serializer = ConversationSerializer(conversation, context={'request': request})
    # Include refund_id/dispute_id in response so frontend can track it
    response_data = serializer.data
    if refund_id:
        response_data['refund_id'] = refund_id
    if dispute_id:
        response_data['dispute_id'] = dispute_id
    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_by_product(request, product_id):
    """Get conversation for a specific product"""
    try:
        # Use Django ORM to get the product - this handles the ID conversion properly
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user is admin - admins can access any conversation
    is_admin = hasattr(request.user, 'user_type') and request.user.user_type == 'admin'
    
    # Use Django ORM to find conversation
    if is_admin:
        # Admin can access any conversation for this product
        conversation = Conversation.objects.filter(
            product_id=product.id,
            is_active=True
        ).first()
    else:
        # Regular users can only access conversations they're part of
        conversation = Conversation.objects.filter(
            product_id=product.id,
            participants=request.user,
            is_active=True
        ).first()
    
    if not conversation:
        return Response(
            {'error': 'No conversation found for this product'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ConversationSerializer(conversation, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_read(request, conversation_id):
    """Mark all messages in a conversation as read"""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    
    conversation = get_object_or_404(
        Conversation.objects.filter(participants=request.user),
        id=conversation_id
    )
    
    Message.objects.filter(
        conversation=conversation,
        recipient=request.user
    ).update(is_read=True)
    
    # Get updated unread count for user
    unread_count = Message.objects.filter(
        recipient=request.user,
        is_read=False
    ).count()
    
    # Send real-time update to user
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f'realtime_{request.user.id}',
            {
                'type': 'unread_count_update',
                'data': {
                    'unread_count': unread_count
                }
            }
        )
    
    return Response({'status': 'Messages marked as read', 'unread_count': unread_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_message(request, message_id):
    """Report a message"""
    try:
        message = Message.objects.get(id=message_id)
        
        # Check if user is participant in the conversation
        if request.user not in message.conversation.participants.all():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Create a report (you might want to create a Report model for this)
        # For now, we'll just mark the message as reported
        message.metadata = message.metadata or {}
        message.metadata['reported'] = True
        message.metadata['reported_by'] = str(request.user.id)
        message.metadata['reported_at'] = timezone.now().isoformat()
        message.save()
        
        return Response({'status': 'Message reported successfully'})
        
    except Message.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def edit_message(request, message_id):
    """Edit a message"""
    try:
        message = Message.objects.get(id=message_id)
        
        # Check if user is the sender
        if message.sender != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if message is too old (e.g., 24 hours)
        time_diff = timezone.now() - message.created_at
        if time_diff.total_seconds() > 86400:  # 24 hours
            return Response({'error': 'Message too old to edit'}, status=status.HTTP_400_BAD_REQUEST)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Content cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        message.content = content
        message.metadata = message.metadata or {}
        message.metadata['edited'] = True
        message.metadata['edited_at'] = timezone.now().isoformat()
        message.save()
        
        # Send real-time update to conversation participants
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            serializer = MessageSerializer(message, context={'request': request})
            # Send to conversation group (for users connected to this chat)
            async_to_sync(channel_layer.group_send)(
                f'chat_{message.conversation.id}',
                {
                    'type': 'message_edited',
                    'data': {
                        'message': serializer.data,
                        'conversation_id': str(message.conversation.id)
                    }
                }
            )
            # Also send to each participant's real-time channel (for users not in chat)
            for participant in message.conversation.participants.all():
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{participant.id}',
                    {
                        'type': 'message_edited',
                        'data': {
                            'message': serializer.data,
                            'conversation_id': str(message.conversation.id)
                        }
                    }
                )
        
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)
        
    except Message.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """Delete a message"""
    try:
        message = Message.objects.get(id=message_id)
        
        # Check if user is the sender
        if message.sender != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if message is too old (e.g., 1 hour)
        time_diff = timezone.now() - message.created_at
        if time_diff.total_seconds() > 3600:  # 1 hour
            return Response({'error': 'Message too old to delete'}, status=status.HTTP_400_BAD_REQUEST)
        
        conversation_id = str(message.conversation.id)
        message_id = str(message.id)
        message.delete()
        
        # Send real-time update to conversation participants
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            # Send to conversation group
            async_to_sync(channel_layer.group_send)(
                f'chat_{conversation_id}',
                {
                    'type': 'message_deleted',
                    'data': {
                        'message_id': message_id,
                        'conversation_id': conversation_id
                    }
                }
            )
            # Also send to each participant's real-time channel
            conversation = message.conversation
            for participant in conversation.participants.all():
                async_to_sync(channel_layer.group_send)(
                    f'realtime_{participant.id}',
                    {
                        'type': 'message_deleted',
                        'data': {
                            'message_id': message_id,
                            'conversation_id': conversation_id
                        }
                    }
                )
        
        return Response({'status': 'Message deleted successfully'})
        
    except Message.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_messages(request):
    """Get recent messages for vendor home page"""
    try:
        user = request.user
        
        # Get conversations where user is a participant - at least 3 messages
        conversations = Conversation.objects.filter(
            participants=user
        ).prefetch_related('participants', 'product').order_by('-updated_at')[:3]
        
        recent_messages = []
        for conv in conversations:
            # Get the other participant (buyer)
            other_participant = conv.participants.exclude(id=user.id).first()
            
            # Get the last message
            last_message = conv.messages.order_by('-created_at').first()
            
            # Calculate unread count for this conversation
            unread_count = conv.messages.filter(recipient=user, is_read=False).count()
            
            if other_participant and last_message:
                recent_messages.append({
                    'id': str(conv.id),
                    'buyer': other_participant.username,
                    'product': conv.product.headline if conv.product and conv.product.headline else 'Product',
                    'lastMessage': last_message.content,
                    'time': get_time_ago(last_message.created_at),
                    'unread': unread_count > 0
                })
        
        return Response(recent_messages)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """Get unread message count for buyer home page"""
    try:
        user = request.user
        
        # Get total unread count by counting unread messages
        conversations = Conversation.objects.filter(participants=user)
        total_unread = 0
        
        for conversation in conversations:
            # Count unread messages in each conversation
            unread_messages = Message.objects.filter(
                conversation=conversation,
                sender__isnull=False,  # Not system messages
                is_read=False,
                recipient=user
            ).count()
            total_unread += unread_messages
        
        return Response({'unread_count': total_unread})
        
    except Exception as e:
        print(f"Error in get_unread_count: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_activity(request):
    """Get recent activity including new messages and order notifications for buyer home page"""
    try:
        user = request.user
        from shared.models import Notification
        
        recent_activities = []
        
        # Get recent order notifications (order_created, payment_confirmed, payment_received)
        order_notifications = Notification.objects.filter(
            user=user,
            type='order'
        ).order_by('-created_at')[:10]
        
        for notif in order_notifications:
            activity_status = 'info'
            if 'Payment Confirmed' in notif.title or 'Payment Received' in notif.title:
                activity_status = 'success'
            elif 'Order Created' in notif.title or 'New Order' in notif.title:
                activity_status = 'warning'
            elif 'Payment Failed' in notif.title or 'Payment Expired' in notif.title or 'Order Expired' in notif.title:
                activity_status = 'error'
            
            recent_activities.append({
                'id': f"order_{notif.id}",
                'type': 'order',
                'title': notif.title,
                'description': notif.message,
                'time': get_time_ago(notif.created_at),
                'status': activity_status,
                'timestamp': notif.created_at.isoformat(),  # For sorting
                'data': notif.data if hasattr(notif, 'data') else {}
            })
        
        # Get recent review reply notifications
        review_notifications = Notification.objects.filter(
            user=user,
            type='message',
            title__icontains='reply'
        ).order_by('-created_at')[:10]
        
        for notif in review_notifications:
            recent_activities.append({
                'id': f"review_{notif.id}",
                'type': 'review_reply',
                'title': notif.title,
                'description': notif.message,
                'time': get_time_ago(notif.created_at),
                'status': 'info',
                'timestamp': notif.created_at.isoformat(),
                'data': notif.data if hasattr(notif, 'data') else {}
            })
        
        # Get recent messages from vendors
        conversations = Conversation.objects.filter(
            participants=user
        ).prefetch_related('participants', 'product', 'messages').order_by('-updated_at')[:10]
        
        for conv in conversations:
            # Get the other participant (vendor)
            vendor = conv.participants.exclude(id=user.id).first()
            
            # Get the last message
            last_message = conv.messages.order_by('-created_at').first()
            
            if vendor and last_message and last_message.sender != user:
                recent_activities.append({
                    'id': f"msg_{conv.id}",
                    'type': 'message',
                    'title': 'New message from vendor',
                    'description': f"{vendor.username} replied to your inquiry about {conv.product.headline if conv.product else 'product'}",
                    'time': get_time_ago(last_message.created_at),
                    'status': 'info',
                    'timestamp': last_message.created_at.isoformat()  # For sorting
                })
        
        # Sort all activities by timestamp (most recent first)
        recent_activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Return activities (can be less than 3 if not enough)
        return Response(recent_activities[:3], status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_recent_activity: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_time_ago(timestamp):
    """Helper function to get time ago string"""
    now = timezone.now()
    diff = now - timestamp
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} min ago"
    else:
        return "Just now"


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_conversations_admin(request):
    """Get all conversations for admin (admin only)"""
    from shared.utils import is_admin_user
    
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all active conversations with related data
    conversations = Conversation.objects.filter(
        is_active=True
    ).prefetch_related(
        'participants', 
        'product', 
        'last_message',
        'messages'
    ).order_by('-updated_at')
    
    # Serialize the conversations
    serializer = ConversationSerializer(conversations, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lock_conversation(request, conversation_id):
    """Lock or unlock a conversation. Admins can lock any conversation; participants can lock their own.
    Sends realtime event to all participants so clients can disable typing and show locked UI."""
    try:
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # Permission: admin or participant
        is_admin = hasattr(request.user, 'user_type') and request.user.user_type == 'admin'
        if not is_admin and request.user not in conversation.participants.all():
            return Response({'error': 'Not authorized'}, status=403)

        # Determine lock action; default True (lock)
        lock_flag = request.data.get('lock', True)
        # Normalize boolean-like values
        if isinstance(lock_flag, str):
            lock_flag = lock_flag.lower() not in ['false', '0', 'no', 'off']

        # When locked, is_active should be False (but conversation is NOT removed)
        conversation.is_active = False if lock_flag else True
        conversation.save()

        # Notify participants via DB notification and channel layer
        try:
            from shared.models import Notification
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            from .serializers import ConversationSerializer
            from django.test import RequestFactory

            channel_layer = get_channel_layer()
            participants = conversation.participants.all()
            factory = RequestFactory()
            
            for p in participants:
                try:
                    from shared.admin_notifications import send_user_notification
                    send_user_notification(
                        user=p,
                        notification_type='message',
                        title='Conversation locked' if lock_flag else 'Conversation unlocked',
                        message=(f'An admin locked this conversation.' if is_admin and lock_flag else
                                 f'An admin unlocked this conversation.' if is_admin and not lock_flag else
                                 f'Conversation updated'),
                        data={'conversation_id': str(conversation.id), 'is_active': conversation.is_active}
                    )
                except Exception:
                    pass

                if channel_layer:
                    try:
                        # Get updated conversation data for real-time list update
                        mock_request = factory.get('/')
                        mock_request.user = p
                        conv_serializer = ConversationSerializer(conversation, context={'request': mock_request})
                        
                        # Send conversation locked event
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{p.id}',
                            {
                                'type': 'conversation_locked',
                                'data': {
                                    'conversation_id': str(conversation.id),
                                    'is_active': conversation.is_active,
                                    'locked_by_admin': is_admin
                                }
                            }
                        )
                        
                        # Send conversation update to move blocked chat to top
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{p.id}',
                            {
                                'type': 'conversation_updated',
                                'data': {
                                    'conversation': conv_serializer.data,
                                    'action': 'conversation_locked' if lock_flag else 'conversation_unlocked'
                                }
                            }
                        )
                    except Exception:
                        pass
        except Exception:
            # don't fail the request on notification errors
            pass

        return Response({'success': True, 'conversation_id': str(conversation.id), 'is_active': conversation.is_active})
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error locking conversation {conversation_id}: {e}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_user(request, user_id):
    """Block a user"""
    try:
        user_to_block = get_object_or_404(User, id=user_id, is_deleted=False)
        
        if user_to_block == request.user:
            return Response({'error': 'Cannot block yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add to blocked users
        request.user.blocked_users.add(user_to_block)
        
        # Log activity
        from shared.utils import log_user_activity
        log_user_activity(
            user=request.user,
            activity_type='user_block',
            description=f'User {request.user.username} blocked {user_to_block.username}',
            metadata={'blocked_user_id': str(user_to_block.id), 'blocked_username': user_to_block.username}
        )
        
        return Response({'success': True, 'message': f'User {user_to_block.username} has been blocked'})
    except Exception as e:
        logger.error(f"Error blocking user {user_id}: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):
    """Unblock a user"""
    try:
        user_to_unblock = get_object_or_404(User, id=user_id, is_deleted=False)
        
        # Remove from blocked users
        request.user.blocked_users.remove(user_to_unblock)
        
        # Log activity
        from shared.utils import log_user_activity
        log_user_activity(
            user=request.user,
            activity_type='user_unblock',
            description=f'User {request.user.username} unblocked {user_to_unblock.username}',
            metadata={'unblocked_user_id': str(user_to_unblock.id), 'unblocked_username': user_to_unblock.username}
        )
        
        return Response({'success': True, 'message': f'User {user_to_unblock.username} has been unblocked'})
    except Exception as e:
        logger.error(f"Error unblocking user {user_id}: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blocked_users(request):
    """Get list of blocked users"""
    try:
        blocked_users = request.user.blocked_users.filter(is_deleted=False).values('id', 'username')
        return Response({'success': True, 'data': list(blocked_users)})
    except Exception as e:
        logger.error(f"Error getting blocked users: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_user(request):
    """Report a user"""
    try:
        from shared.models import UserReport, Notification
        from shared.utils import log_user_activity
        
        reported_user_id = request.data.get('reported_user_id')
        reason = request.data.get('reason')
        description = request.data.get('description', '')
        conversation_id = request.data.get('conversation_id')
        message_id = request.data.get('message_id')
        
        if not reported_user_id or not reason:
            return Response(
                {'error': 'reported_user_id and reason are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reported_user = get_object_or_404(User, id=reported_user_id, is_deleted=False)
        
        if reported_user == request.user:
            return Response({'error': 'Cannot report yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already reported for this conversation
        if conversation_id:
            existing_report = UserReport.objects.filter(
                reporter=request.user,
                reported_user=reported_user,
                conversation_id=conversation_id,
                status='pending'
            ).first()
            if existing_report:
                return Response(
                    {'error': 'You have already reported this user for this conversation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create report
        report = UserReport.objects.create(
            reporter=request.user,
            reported_user=reported_user,
            reason=reason,
            description=description,
            conversation_id=conversation_id,
            message_id=message_id
        )
        
        # Notify all admins via central helper
        try:
            from shared.admin_notifications import send_admin_notification
            send_admin_notification(
                notification_type='dispute',
                title='User Report Submitted',
                message=f'{request.user.username} reported {reported_user.username} for: {reason}. {description[:100]}',
                data={
                    'report_id': str(report.id),
                    'reporter_id': str(request.user.id),
                    'reported_user_id': str(reported_user.id),
                    'reason': reason,
                    'conversation_id': str(conversation_id) if conversation_id else None,
                    'message_id': str(message_id) if message_id else None,
                },
                priority='normal'
            )
        except Exception as e:
            logger.error(f"Failed to notify admins about user report: {e}")
        
        # Log activity
        log_user_activity(
            user=request.user,
            activity_type='user_report',
            description=f'User {request.user.username} reported {reported_user.username}',
            metadata={
                'reported_user_id': str(reported_user.id),
                'reported_username': reported_user.username,
                'reason': reason,
                'report_id': str(report.id)
            }
        )
        
        return Response({
            'success': True,
            'message': 'User reported successfully. Admin has been notified.',
            'report_id': str(report.id)
        })
    except Exception as e:
        logger.error(f"Error reporting user: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_attachments(request, user_id):
    """Get all attachments from messages with a specific user"""
    try:
        other_user = get_object_or_404(User, id=user_id, is_deleted=False)
        
        # Get all conversations between current user and other user
        conversations = Conversation.objects.filter(
            participants=request.user
        ).filter(participants=other_user)
        
        # Get all messages with attachments from these conversations
        attachments = []
        for conv in conversations:
            messages = Message.objects.filter(
                conversation=conv
            ).exclude(attachment='').exclude(attachment__isnull=True)
            
            for msg in messages:
                if msg.attachment:
                    attachments.append({
                        'id': str(msg.id),
                        'message_id': str(msg.id),
                        'file_name': msg.metadata.get('file_name', msg.attachment.name),
                        'file_url': request.build_absolute_uri(msg.attachment.url),
                        'file_size': msg.metadata.get('file_size', 0),
                        'file_type': msg.message_type,
                        'created_at': msg.created_at.isoformat(),
                        'sender': {
                            'id': str(msg.sender.id),
                            'username': msg.sender.username
                        }
                    })
        
        # Sort by created_at descending
        attachments.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response({
            'success': True,
            'data': attachments,
            'count': len(attachments)
        })
    except Exception as e:
        logger.error(f"Error getting user attachments: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_user(request):
    """Report a user"""
    try:
        from shared.models import UserReport
        
        reported_user_id = request.data.get('reported_user_id')
        reason = request.data.get('reason')
        description = request.data.get('description')
        conversation_id = request.data.get('conversation_id')
        message_id = request.data.get('message_id')
        
        if not reported_user_id or not reason:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
            
        reported_user = User.objects.get(id=reported_user_id)
        
        # Check if already reported
        existing_report = UserReport.objects.filter(
            reporter=request.user,
            reported_user=reported_user,
            conversation_id=conversation_id,
            status='pending'
        ).first()
        
        if existing_report:
             return Response({'message': 'You have already reported this user for this conversation'})

        UserReport.objects.create(
            reporter=request.user,
            reported_user=reported_user,
            reason=reason,
            description=description,
            conversation_id=conversation_id,
            message_id=message_id
        )
        
        return Response({'message': 'User reported successfully'})
        
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_reports(request):
    """Get all user reports (Admin only)"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        from shared.models import UserReport
        
        filter_status = request.query_params.get('filter', 'all')
        queryset = UserReport.objects.all().select_related('reporter', 'reported_user').order_by('-created_at')
        
        if filter_status and filter_status != 'all':
            queryset = queryset.filter(status=filter_status)
            
        reports = queryset
        
        data = []
        for report in reports:
            data.append({
                'id': str(report.id),
                'reporter': report.reporter.username,
                'reported_user': report.reported_user.username,
                'reason': report.get_reason_display(),
                'description': report.description,
                'status': report.status,
                'admin_notes': report.admin_notes,
                'created_at': report.created_at.isoformat(),
                'conversation_id': str(report.conversation_id) if report.conversation_id else None
            })
            
        return Response({'data': data})
        
    except Exception as e:
        print(f"Error fetching user reports: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_report_status(request, report_id):
    """Update report status (Admin only)"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        from shared.models import UserReport
        report = UserReport.objects.get(id=report_id)
        
        status_val = request.data.get('status')
        admin_notes = request.data.get('admin_notes')
        
        if status_val:
            report.status = status_val
        if admin_notes is not None:
             report.admin_notes = admin_notes
            
        report.save()
        
        return Response({'message': 'Report updated successfully'})
        
    except UserReport.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)