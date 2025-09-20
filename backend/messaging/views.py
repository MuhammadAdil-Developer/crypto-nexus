from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Conversation, Message
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
    
    try:
        product = Product.objects.get(id=product_id)
        recipient = User.objects.get(id=recipient_id)
    except (Product.DoesNotExist, User.DoesNotExist):
        return Response(
            {'error': 'Invalid product or recipient'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if conversation already exists
    sender = request.user
    existing_conversation = Conversation.objects.filter(
        participants=sender,
        participants=recipient,
        product=product
    ).first()
    
    if existing_conversation:
        serializer = ConversationSerializer(existing_conversation, context={'request': request})
        return Response(serializer.data)
    
    # Create new conversation
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
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    conversation = Conversation.objects.filter(
        participants=request.user,
        product=product,
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