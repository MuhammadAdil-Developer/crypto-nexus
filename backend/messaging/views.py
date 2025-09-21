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
        return Message.objects.filter(
            conversation_id=conversation_id,
            conversation__participants=self.request.user
        ).select_related('sender', 'recipient')
    
    def list(self, request, *args, **kwargs):
        # Mark messages as read when fetching
        queryset = self.get_queryset()
        queryset.filter(recipient=request.user).update(is_read=True)
        
        serializer = self.get_serializer(queryset, many=True)
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
            response_serializer = MessageSerializer(message)
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
    
    # Use Django ORM to find conversation
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
        
        serializer = MessageSerializer(message)
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