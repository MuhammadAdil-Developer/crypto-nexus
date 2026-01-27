from rest_framework import serializers
from shared.models import Conversation, Message
from users.models import User
from products.models import Product


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type']


class ProductSerializer(serializers.ModelSerializer):
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    id = serializers.CharField(read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'headline', 'main_image', 'price', 'vendor_username']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    id = serializers.CharField(read_only=True)
    conversation = serializers.CharField(read_only=True)
    is_sender = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'recipient', 'content', 'is_read', 'message_type', 'metadata', 'created_at', 'is_sender', 'other_participant', 'attachment_url']
        read_only_fields = ['id', 'created_at']
    
    def get_attachment_url(self, obj):
        """Get the full URL for the attachment if it exists"""
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None
    
    def get_is_sender(self, obj):
        """Check if the current user is the sender of this message"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.sender.id == request.user.id
        return False
    
    def get_other_participant(self, obj):
        """Get the other participant (not the current user) in the conversation"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Get the other participant from the conversation
            other_participants = obj.conversation.participants.exclude(id=request.user.id)
            if other_participants.exists():
                other_user = other_participants.first()
                return {
                    'id': str(other_user.id),
                    'username': other_user.username,
                    'user_type': getattr(other_user, 'user_type', 'buyer')  # Default to buyer if no user_type
                }
        return None


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


    product_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    recipient_id = serializers.CharField(write_only=True)
    
    class Meta:
        model = Conversation
        fields = ['product_id', 'recipient_id']
    
    def create(self, validated_data):
        product_id = validated_data.get('product_id')
        recipient_id = validated_data.get('recipient_id')
        
        # Use Django ORM to get the recipient
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid recipient")
            
        product = None
        if product_id:
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError("Invalid product")
        
        # Check if conversation already exists using Django ORM
        sender = self.context['request'].user
        
        if product:
            existing_conversation = Conversation.objects.filter(
                product_id=product.id
            ).filter(participants=sender).filter(participants=recipient).first()
        else:
            # For non-product conversations, find one between these two exactly
            existing_conversation = Conversation.objects.filter(
                product__isnull=True
            ).filter(participants=sender).filter(participants=recipient).first()
        
        if existing_conversation:
            return existing_conversation
        
        # Create new conversation using Django ORM
        conversation = Conversation.objects.create(product=product)
        conversation.participants.add(sender, recipient)
        conversation.save()
        
        return conversation


class SendMessageSerializer(serializers.ModelSerializer):
    attachment = serializers.FileField(required=False, allow_null=True)
    content = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Message
        fields = ['conversation', 'content', 'message_type', 'attachment']
    
    def create(self, validated_data):
        request = self.context['request']
        conversation = validated_data['conversation']
        attachment = validated_data.pop('attachment', None)
        
        # Determine recipient (the other participant in the conversation)
        participants = conversation.participants.all()
        recipient = participants.exclude(id=request.user.id).first()
        
        if not recipient:
            raise serializers.ValidationError("No recipient found for this conversation")
        
        # Determine message type based on attachment
        message_type = validated_data.get('message_type', 'text')
        metadata = {}
        
        if attachment:
            # Determine file type
            file_name = attachment.name
            file_size = attachment.size
            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
            
            # Set message type based on file extension
            if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                message_type = 'image'
            elif file_ext in ['mp4', 'avi', 'mov', 'webm']:
                message_type = 'video'
            elif file_ext == 'pdf':
                message_type = 'pdf'
            elif file_ext in ['doc', 'docx', 'txt', 'rtf']:
                message_type = 'document'
            else:
                message_type = 'file'
            
            # Store file metadata
            metadata = {
                'file_name': file_name,
                'file_size': file_size,
                'file_type': file_ext,
                'file_url': None  # Will be set after saving
            }
        
        # Content is optional when sending attachments
        content = validated_data.get('content', '') or ''
        
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            recipient=recipient,
            content=content,
            message_type=message_type,
            attachment=attachment,
            metadata=metadata
        )
        
        # Update metadata with file URL if attachment exists
        if attachment:
            # Get the full URL for the attachment
            file_url = request.build_absolute_uri(message.attachment.url)
            message.metadata['file_url'] = file_url
            message.save()
        
        # Update conversation's last message
        conversation.last_message = message
        conversation.save()
        
        return message

