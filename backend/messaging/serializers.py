from rest_framework import serializers
from .models import Conversation, Message
from users.models import User
from products.models import Product


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'headline', 'main_image', 'price', 'vendor_username']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'recipient', 'content', 'is_read', 'message_type', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    product = ProductSerializer(read_only=True)
    last_message = MessageSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'product', 'last_message', 'is_active', 'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(recipient=request.user, is_read=False).count()
        return 0


class CreateConversationSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(write_only=True)
    recipient_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Conversation
        fields = ['product_id', 'recipient_id']
    
    def create(self, validated_data):
        product_id = validated_data.pop('product_id')
        recipient_id = validated_data.pop('recipient_id')
        
        # Get the product and recipient
        try:
            product = Product.objects.get(id=product_id)
            recipient = User.objects.get(id=recipient_id)
        except (Product.DoesNotExist, User.DoesNotExist):
            raise serializers.ValidationError("Invalid product or recipient")
        
        # Check if conversation already exists
        sender = self.context['request'].user
        existing_conversation = Conversation.objects.filter(
            participants=sender,
            participants=recipient,
            product=product
        ).first()
        
        if existing_conversation:
            return existing_conversation
        
        # Create new conversation
        conversation = Conversation.objects.create(**validated_data)
        conversation.participants.add(sender, recipient)
        conversation.product = product
        conversation.save()
        
        return conversation


class SendMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['conversation', 'content', 'message_type']
    
    def create(self, validated_data):
        request = self.context['request']
        conversation = validated_data['conversation']
        
        # Determine recipient (the other participant in the conversation)
        participants = conversation.participants.all()
        recipient = participants.exclude(id=request.user.id).first()
        
        if not recipient:
            raise serializers.ValidationError("No recipient found for this conversation")
        
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            recipient=recipient,
            content=validated_data['content'],
            message_type=validated_data.get('message_type', 'text')
        )
        
        # Update conversation's last message
        conversation.last_message = message
        conversation.save()
        
        return message
