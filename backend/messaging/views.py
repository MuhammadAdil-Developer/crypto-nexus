from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from shared.models import Conversation, Message
from .serializers import (
    ConversationSerializer, 
    MessageSerializer, 
    CreateConversationSerializer,
    SendMessageSerializer
)
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


class ConversationDetailView(generics.RetrieveAPIView):
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
        
        serializer = self.get_serializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            message = serializer.save()
            
            # Create notification for recipient
            from shared.models import Notification
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            product_title = conversation.product.headline if conversation.product else 'a product'
            Notification.objects.create(
                user=message.recipient,
                type='message',
                title='New message',
                message=f"{request.user.username} sent you a message about {product_title}: {message.content[:100]}",
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
                    # Send notification to recipient
                    async_to_sync(channel_layer.group_send)(
                        f'realtime_{message.recipient.id}',
                        {
                            'type': 'order_notification',
                            'data': {
                                'id': f'msg_{conversation.id}_{message.id}',
                                'type': 'message',
                                'title': 'New message',
                                'message': f"{request.user.username} sent you a message about {product_title}: {message.content[:100]}",
                                'is_read': False,
                                'data': {
                                    'conversation_id': str(conversation.id),
                                    'sender_username': request.user.username,
                                    'product_id': str(conversation.product.id) if conversation.product else None,
                                    'product_title': product_title,
                                    'action_url': f'/buyer/messages' if message.recipient.user_type == 'buyer' else f'/vendor/messages'
                                },
                                'action_url': f'/buyer/messages' if message.recipient.user_type == 'buyer' else f'/vendor/messages',
                                'created_at': message.created_at.isoformat(),
                                'priority': 'normal'
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
    existing_conversation = Conversation.objects.filter(
        product_id=product.id
    ).filter(participants=sender).filter(participants=recipient).first()
    
    if existing_conversation:
        serializer = ConversationSerializer(existing_conversation, context={'request': request})
        return Response(serializer.data)
    
    # Create new conversation using Django ORM
    conversation = Conversation.objects.create(product=product)
    conversation.participants.add(sender, recipient)
    conversation.save()
    
    serializer = ConversationSerializer(conversation, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        
        message.delete()
        
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

        # When locked, is_active should be False
        conversation.is_active = not bool(lock_flag) == False and (not bool(lock_flag)) if False else (not lock_flag)
        # Simpler: if lock_flag True -> set is_active False; if lock_flag False -> set is_active True
        conversation.is_active = False if lock_flag else True
        conversation.save()

        # Notify participants via DB notification and channel layer
        try:
            from shared.models import Notification
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            participants = conversation.participants.all()
            for p in participants:
                try:
                    Notification.objects.create(
                        user=p,
                        type='system',
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