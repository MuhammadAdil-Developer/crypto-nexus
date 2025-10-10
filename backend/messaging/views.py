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
    conversation = get_object_or_404(
        Conversation.objects.filter(participants=request.user),
        id=conversation_id
    )
    
    Message.objects.filter(
        conversation=conversation,
        recipient=request.user
    ).update(is_read=True)
    
    return Response({'status': 'Messages marked as read'})


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
        
        # Get conversations where user is a participant
        conversations = Conversation.objects.filter(
            participants=user
        ).prefetch_related('participants', 'product').order_by('-updated_at')[:2]
        
        recent_messages = []
        for conv in conversations:
            # Get the other participant (buyer)
            other_participant = conv.participants.exclude(id=user.id).first()
            
            # Get the last message
            last_message = conv.messages.order_by('-created_at').first()
            
            if other_participant and last_message:
                recent_messages.append({
                    'id': conv.id,
                    'buyer': other_participant.username,
                    'product': conv.product.title if conv.product else 'Product',
                    'lastMessage': last_message.content,
                    'time': get_time_ago(last_message.created_at),
                    'unread': conv.unread_count > 0
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
    """Get recent activity including new messages for buyer home page"""
    try:
        user = request.user
        
        # Get recent messages from vendors
        conversations = Conversation.objects.filter(
            participants=user
        ).prefetch_related('participants', 'product').order_by('-updated_at')[:3]
        
        recent_activities = []
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
                    'status': 'info'
                })
        
        return Response(recent_activities)
        
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