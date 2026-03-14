from rest_framework import serializers
from shared.models import Conversation, Message

from users.models import User
from products.models import Product


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    is_online = serializers.SerializerMethodField()
    
    profile_picture = serializers.ImageField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_picture', 'user_type', 'is_online']
    
    def get_is_online(self, obj):
        from django.core.cache import cache
        return cache.get(f"user_online_{obj.id}", False)


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
    
    reply_to = serializers.CharField(required=False, allow_null=True)
    reply_to_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'recipient', 'content', 'is_read', 'message_type', 'metadata', 'created_at', 'is_sender', 'other_participant', 'attachment_url', 'is_flagged', 'reply_to', 'reply_to_details', 'is_deleted']
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        """Clean up raw message content for professional display (handles old data)"""
        data = super().to_representation(instance)
        if data.get('is_deleted'):
            data['content'] = "This message was deleted"
            data['message_type'] = 'system'
            # Clear attachment for deleted messages to prevent reuse/viewing
            data['attachment_url'] = None
            data['metadata'] = data.get('metadata', {})
            data['metadata']['is_deleted'] = True
            return data

        # Detect and clean old messy format: "💬 **Discussing:** ... 💰 **Price:** ... 👤 **Vendor:** ..."
        # Only do this for messages that look like our old product reference template
        # Detect and clean old messy format OR new format with too many decimals
        content = data.get('content') or ""
        if content and (('Discussing:' in content or 'Price:' in content) or 'PRODUCT INQUIRY:' in content):
            # Step 1: Strip all markdown and emojis for a clean base
            clean_text = content.replace('💬', '').replace('💰', '').replace('👤', '').replace('**', '').strip()
            
            try:
                # Step 2: Try to extract Title and Price for a premium label
                if 'Price:' in clean_text or 'PRICE:' in clean_text:
                    price_marker = 'Price:' if 'Price:' in clean_text else 'PRICE:'
                    parts = clean_text.split(price_marker)
                    title = parts[0].replace('Discussing:', '').replace('PRODUCT INQUIRY:', '').replace(':', '').strip()
                    # Get price, stopping before Vendor label
                    price_and_vendor = parts[1]
                    raw_price = price_and_vendor.split('Vendor:')[0].replace('$', '').replace(':', '').strip()
                    data['content'] = f"PRODUCT INQUIRY: {title} | PRICE: ${float(raw_price):.2f}"
                else:
                    data['content'] = clean_text
            except Exception:
                data['content'] = clean_text
        
        return data
    
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
    
    def get_reply_to_details(self, obj):
        """Get summarized details of the message being replied to"""
        if obj.reply_to:
            is_deleted = getattr(obj.reply_to, 'is_deleted', False)
            return {
                'id': str(obj.reply_to.id),
                'content': "This message was deleted" if is_deleted else obj.reply_to.content,
                'message_type': 'system' if is_deleted else obj.reply_to.message_type,
                'sender_username': obj.reply_to.sender.username,
                'is_deleted': is_deleted
            }
        return None

    def get_other_participant(self, obj):
        """Get the other participant (not the current user) in the conversation"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Get the other participant from the conversation
            other_participants = obj.conversation.participants.exclude(id=request.user.id)
            if other_participants.exists():
                other_user = other_participants.first()
                from django.core.cache import cache
                if other_user.user_type == 'admin':
                    return {
                        'id': str(other_user.id),
                        'username': 'Support Agent',
                        'user_type': 'admin',
                        'profile_picture': None,
                        'is_online': cache.get(f"user_online_{other_user.id}", False)
                    }
                return {
                    'id': str(other_user.id),
                    'username': other_user.username,
                    'user_type': getattr(other_user, 'user_type', 'buyer'),
                    'profile_picture': other_user.profile_picture.url if other_user.profile_picture else None,
                    'is_online': cache.get(f"user_online_{other_user.id}", False)
                }
        return None


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    product = ProductSerializer(read_only=True)
    last_message = MessageSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    is_admin_chat = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'product', 'last_message', 'is_active', 'unread_count', 'is_admin_chat', 'other_participant', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(recipient=request.user, is_read=False).count()
        return 0

    def get_is_admin_chat(self, obj):
        """Check if any participant is an admin"""
        return obj.participants.filter(user_type='admin').exists()

    def get_other_participant(self, obj):
        """Get the other participant with admin anonymization"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other_participants = obj.participants.exclude(id=request.user.id)
            if other_participants.exists():
                other_user = other_participants.first()
                from django.core.cache import cache
                if other_user.user_type == 'admin':
                    return {
                        'id': str(other_user.id),
                        'username': 'Support Agent',
                        'user_type': 'admin',
                        'profile_picture': None,
                        'is_online': cache.get(f"user_online_{other_user.id}", False)
                    }
                profile_picture_url = None
                if other_user.profile_picture:
                    if request:
                        profile_picture_url = request.build_absolute_uri(other_user.profile_picture.url)
                    else:
                        profile_picture_url = other_user.profile_picture.url

                from django.core.cache import cache
                return {
                    'id': str(other_user.id),
                    'username': other_user.username,
                    'user_type': getattr(other_user, 'user_type', 'buyer'),
                    'profile_picture': profile_picture_url,
                    'is_online': cache.get(f"user_online_{other_user.id}", False)
                }
        return None


class CreateConversationSerializer(serializers.ModelSerializer):
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
        fields = ['conversation', 'content', 'message_type', 'attachment', 'reply_to']
    
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
            metadata=metadata,
            reply_to=validated_data.get('reply_to')
        )
        
        # Explicitly set is_flagged if the field exists
        if hasattr(message, 'is_flagged'):
            message.is_flagged = False
            message.save()
            
        # Run auto-moderation
        try:
            from .moderation import run_auto_moderation
            run_auto_moderation(message)
        except ImportError:
            pass # Avoid circular imports if still occurring
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error in auto-moderation: {e}")
        
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


from .models import BlockedKeyword, ModerationSetting

class BlockedKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedKeyword
        fields = ['id', 'keyword', 'created_at']

class ModerationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModerationSetting
        fields = ['id', 'name', 'label', 'description', 'is_enabled', 'updated_at']
