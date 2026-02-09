import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from shared.models import Conversation, Message


User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.conversation_group_name = f'chat_{self.conversation_id}'
        
        # Authenticate user from token
        await self.authenticate_user()
        
        # Check if user is authenticated
        if self.scope['user'] == AnonymousUser():
            await self.close()
            return
        
        # Check if user is part of this conversation
        if not await self.is_user_in_conversation():
            await self.close()
            return
        
        # Join conversation group
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send conversation info
        await self.send_conversation_info()

    @database_sync_to_async
    def authenticate_user(self):
        """Authenticate user from JWT token in query parameters"""
        try:
            # Get token from query parameters
            query_string = self.scope['query_string'].decode()
            token = None
            
            for param in query_string.split('&'):
                if param.startswith('token='):
                    token = param.split('=')[1]
                    break
            
            if not token:
                self.scope['user'] = AnonymousUser()
                return
            
            # Validate token and get user
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            self.scope['user'] = user
            
        except Exception:
            self.scope['user'] = AnonymousUser()

    async def disconnect(self, close_code):
        # Leave conversation group
        await self.channel_layer.group_discard(
            self.conversation_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        message_data = None
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'chat_message':
                message_content = text_data_json.get('message', '')
                
                if message_content.strip():
                    # Save message to database
                    message_data = await self.save_message(message_content)
                    
                    if not message_data:
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Failed to save message'
                        }))
                        return
                    
            # Send real-time notifications after message is saved ONLY if user preferences allow it
            if message_data and getattr(self, 'notification_sent', True):
                # Get conversation and recipient for notifications
                conversation_data = await self.get_conversation_for_notifications()
                if conversation_data:
                    await self.send_realtime_notifications_async(conversation_data, message_data)
            
            # Send message update to the chat group (ALWAYS, regardless of notification preferences)
            if message_data:
                # Check if this is the first message with product reference
                if isinstance(message_data, dict) and 'user_message' in message_data:
                    # Send both user message and product reference
                    await self.channel_layer.group_send(
                        self.conversation_group_name,
                        {
                            'type': 'chat_message',
                            'message_data': message_data['user_message']
                        }
                    )
                    await self.channel_layer.group_send(
                        self.conversation_group_name,
                        {
                            'type': 'product_reference',
                            'message_data': message_data['product_reference']
                        }
                    )
                else:
                    # Send regular message
                    await self.channel_layer.group_send(
                        self.conversation_group_name,
                        {
                            'type': 'chat_message',
                            'message_data': message_data
                        }
                    )
            
            elif message_type == 'typing':
                # Broadcast typing indicator
                await self.channel_layer.group_send(
                    self.conversation_group_name,
                    {
                        'type': 'typing',
                        'user_id': str(self.scope['user'].id),
                        'username': self.scope['user'].username,
                        'is_typing': text_data_json.get('is_typing', False)
                    }
                )
            
            elif message_type == 'mark_read':
                # Mark messages as read
                await self.mark_messages_read()
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON data'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing message: {str(e)}'
            }))

    async def chat_message(self, event):
        # Handle both 'data' and 'message_data' keys for compatibility
        message_data = event.get('data') or event.get('message_data')
        
        if not message_data:
            return
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'data': message_data
        }))

    async def product_reference(self, event):
        message_data = event['message_data']
        
        # Send product reference to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'product_reference',
            'data': message_data
        }))

    async def typing(self, event):
        # Don't send typing indicator to the user who is typing
        if str(self.scope['user'].id) != event['user_id']:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))

    async def conversation_info(self, event):
        await self.send(text_data=json.dumps({
            'type': 'conversation_info',
            'data': event.get('data', {})
        }))
    
    async def conversation_updated(self, event):
        """Handle conversation update events (for real-time list updates)"""
        # This event is sent to realtime_{user_id} groups, not chat groups
        # So we don't need to handle it here, but we'll add it to prevent errors
        pass
    
    async def message_edited(self, event):
        """Handle message edit events"""
        # Handle both data structures: {message: {...}, conversation_id: ...} or direct message object
        event_data = event.get('data', {})
        message_data = event_data.get('message') or event_data
        
        if message_data:
            await self.send(text_data=json.dumps({
                'type': 'message_edited',
                'data': {
                    'message': message_data,
                    'conversation_id': event_data.get('conversation_id') or message_data.get('conversation')
                }
            }))
    
    async def message_deleted(self, event):
        """Handle message delete events"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'data': event.get('data', {})
        }))

    @database_sync_to_async
    def is_user_in_conversation(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return self.scope['user'] in conversation.participants.all()
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            
            # Determine recipient (the other participant)
            participants = conversation.participants.all()
            recipient = participants.exclude(id=self.scope['user'].id).first()
            
            if not recipient:
                return None
            
            # Check if this is the first message in the conversation
            is_first_message = not conversation.messages.exists()
            
            # Create message
            message = Message.objects.create(
                conversation=conversation,
                sender=self.scope['user'],
                recipient=recipient,
                content=content,
                message_type='text'
            )
            if hasattr(message, 'is_flagged'):
                message.is_flagged = False
                message.save()
            
            # Run auto-moderation
            try:
                from .moderation import run_auto_moderation
                run_auto_moderation(message)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error in auto-moderation: {e}")
            
            # Update conversation's last message
            conversation.last_message = message
            conversation.save()
            
            # Create notification for recipient via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            product_title = conversation.product.headline if conversation.product else 'a product'
            notification = send_user_notification(
                user=recipient,
                notification_type='message',
                title='New message',
                message=f"{self.scope['user'].username} sent you a message about {product_title}: {content[:100]}",
                data={
                    'conversation_id': str(conversation.id),
                    'sender_username': self.scope['user'].username,
                    'product_id': str(conversation.product.id) if conversation.product else None,
                    'product_title': product_title,
                    'action_url': f'/buyer/messages' if recipient.user_type == 'buyer' else f'/vendor/messages'
                }
            )
            
            # Store if notification was created for async WS notification check
            self.notification_sent = notification is not None
            
            # If this is the first message and conversation has a product, create product reference
            # But only if one doesn't already exist (for refunds/disputes, it's created when conversation is created)
            if is_first_message and conversation.product:
                # Check if product reference message already exists
                existing_ref = conversation.messages.filter(message_type='product_reference').first()
                if not existing_ref:
                    product = conversation.product
                    product_info = {
                        'product_id': product.id,
                        'product_title': product.headline,
                        'product_price': str(product.price),
                        'product_image': str(product.main_image) if product.main_image else None,
                        'vendor_username': product.vendor.username,
                        'vendor_id': str(product.vendor.id)
                    }
                    
                    # Create product reference message
                    product_message = Message.objects.create(
                        conversation=conversation,
                        sender=self.scope['user'],
                        recipient=recipient,
                        content=f"💬 **Discussing:** {product.headline}\n💰 **Price:** ${product.price}\n👤 **Vendor:** {product.vendor.username}",
                        message_type='product_reference',
                        metadata=product_info
                    )
                    if hasattr(product_message, 'is_flagged'):
                        product_message.is_flagged = False
                        product_message.save()
                
                # Serialize both messages with context for is_sender field
                # Create a mock request object for the serializer
                from .serializers import MessageSerializer
                mock_request = type('MockRequest', (), {
                    'user': self.scope['user'],
                    'is_authenticated': True
                })()
                message_serializer = MessageSerializer(message, context={'request': mock_request})
                product_serializer = MessageSerializer(product_message, context={'request': mock_request})
                return {
                    'user_message': message_serializer.data,
                    'product_reference': product_serializer.data
                }
            
            # Serialize message with context for is_sender field
            # Create a mock request object for the serializer
            from .serializers import MessageSerializer
            mock_request = type('MockRequest', (), {
                'user': self.scope['user'],
                'is_authenticated': True
            })()
            serializer = MessageSerializer(message, context={'request': mock_request})
            return serializer.data
            
        except Conversation.DoesNotExist:
            return None

    async def send_realtime_notifications_async(self, conversation_data, message_data):
        """Send real-time notifications to users (async version)"""
        try:
            conversation = conversation_data['conversation']
            recipient = conversation_data['recipient']
            
            # Get the actual message object from the database
            message = await self.get_latest_message(conversation)
            if not message:
                return
            
            # Send notification to recipient
            await self.channel_layer.group_send(
                f'realtime_{recipient.id}',
                {
                    'type': 'new_message_notification',
                    'data': {
                        'conversation_id': str(conversation.id),
                        'sender_username': message.sender.username,
                        'message_content': message.content,
                        'product_title': conversation.product.headline if conversation.product else None,
                        'timestamp': message.created_at.isoformat()
                    }
                }
            )
            
            # Send unread count update to recipient
            unread_count = await self.get_unread_count(conversation, recipient)
            
            await self.channel_layer.group_send(
                f'realtime_{recipient.id}',
                {
                    'type': 'unread_count_update',
                    'data': {
                        'unread_count': unread_count
                    }
                }
            )
            
            # Send recent messages update to recipient (for vendor overview)
            recent_messages = await self.get_recent_messages_for_user(recipient)
            await self.channel_layer.group_send(
                f'realtime_{recipient.id}',
                {
                    'type': 'recent_messages_update',
                    'data': recent_messages
                }
            )
                
        except Exception:
            pass

    @database_sync_to_async
    def get_latest_message(self, conversation):
        """Get the latest message from conversation"""
        try:
            return conversation.messages.select_related('sender').order_by('-created_at').first()
        except Exception:
            return None

    @database_sync_to_async
    def get_unread_count(self, conversation, recipient):
        """Get unread count for recipient in conversation"""
        try:
            return conversation.messages.filter(
                recipient=recipient,
                is_read=False
            ).count()
        except Exception:
            return 0

    @database_sync_to_async
    def get_conversation_for_notifications(self):
        """Get conversation data for real-time notifications"""
        try:
            conversation = Conversation.objects.select_related('product').get(id=self.conversation_id)
            participants = conversation.participants.all()
            recipient = participants.exclude(id=self.scope['user'].id).first()
            
            if recipient:
                return {
                    'conversation': conversation,
                    'recipient': recipient
                }
            return None
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def get_recent_messages_for_user(self, user):
        """Get recent messages for user (vendor overview)"""
        try:
            conversations = Conversation.objects.filter(
                participants=user
            ).prefetch_related('participants', 'product', 'messages').order_by('-updated_at')[:2]
            
            recent_messages = []
            for conv in conversations:
                # Get other participant
                other_participant = None
                for participant in conv.participants.all():
                    if participant.id != user.id:
                        other_participant = participant
                        break
                
                # Get last message
                last_message = None
                for message in conv.messages.all().order_by('-created_at'):
                    last_message = message
                    break
                
                if other_participant and last_message:
                    # Calculate unread count for this conversation
                    unread_count = conv.messages.filter(
                        recipient=user,
                        is_read=False
                    ).count()
                    
                    recent_messages.append({
                        'id': str(conv.id),
                        'buyer': other_participant.username,
                        'product': conv.product.headline if conv.product else 'Product',
                        'lastMessage': last_message.content,
                        'time': self.get_time_ago(last_message.created_at),
                        'unread': unread_count > 0
                    })
            
            return recent_messages
        except Exception:
            return []

    def get_time_ago(self, timestamp):
        """Helper function to get time ago string"""
        from django.utils import timezone
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

    async def send_conversation_info(self):
        """Send conversation information to the connected user"""
        try:
            conversation_data = await self.get_conversation_data()
            await self.send(text_data=json.dumps({
                'type': 'conversation_info',
                'data': conversation_data
            }))
        except Exception as e:
            pass

    @database_sync_to_async
    def get_conversation_data(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return {
                'id': str(conversation.id),
                'product': {
                    'id': conversation.product.id if conversation.product else None,
                    'title': conversation.product.headline if conversation.product else None,
                    'image': str(conversation.product.main_image) if conversation.product and conversation.product.main_image else None,
                } if conversation.product else None,
                'participants': [
                    {
                        'id': str(p.id),
                        'username': p.username,
                        'email': p.email
                    } for p in conversation.participants.all()
                ]
            }
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def mark_messages_read(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            Message.objects.filter(
                conversation=conversation,
                recipient=self.scope['user']
            ).update(is_read=True)
        except Conversation.DoesNotExist:
            pass


class RealtimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.user_group_name = f'realtime_{self.user_id}'
        
        # Authenticate user
        if not await self.authenticate_user():
            await self.close()
            return
        
        # Join user group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        # Join global presence group
        await self.channel_layer.group_add(
            'presence',
            self.channel_name
        )
        
        await self.accept()
        
        # Mark user as online and broadcast
        await self.toggle_presence(True)

    async def disconnect(self, close_code):
        # Leave user group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
        
        # Leave global presence group
        await self.channel_layer.group_discard(
            'presence',
            self.channel_name
        )
        
        # Mark user as offline and broadcast
        if hasattr(self, 'user_id'):
            await self.toggle_presence(False)

    async def toggle_presence(self, is_online):
        """Broadcast user presence change to all participants and store in Redis"""
        try:
            # 1. Update Redis (for initial load state)
            from django.core.cache import cache
            cache_key = f"user_online_{self.user_id}"
            if is_online:
                # Store for 5 minutes, will be refreshed by ping/pong if implemented
                # For now, just set it on connect
                cache.set(cache_key, True, timeout=300) 
            else:
                cache.delete(cache_key)

            # 2. Broadcast to global presence group
            await self.channel_layer.group_send(
                'presence',
                {
                    'type': 'user_presence',
                    'data': {
                        'user_id': self.user_id,
                        'is_online': is_online
                    }
                }
            )
        except Exception as e:
            logger.error(f"Presence error: {e}")

    async def user_presence(self, event):
        """Handle incoming presence events and send to client"""
        await self.send(text_data=json.dumps({
            'type': 'user_presence',
            'data': event['data']
        }))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def authenticate_user(self):
        """Authenticate user using JWT token from query parameters"""
        try:
            query_string = self.scope['query_string'].decode()
            token = None
            
            # Extract token from query parameters
            for param in query_string.split('&'):
                if param.startswith('token='):
                    token = param.split('=')[1]
                    break
            
            if not token:
                return False
            
            # Validate token
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            # Verify user ID matches
            if str(user_id) != self.user_id:
                return False
            
            # Set user in scope (using async database call)
            user = await self.get_user_by_id(user_id)
            if user:
                self.scope['user'] = user
                return True
            else:
                return False
            
        except Exception:
            return False

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        """Get user by ID using sync database call"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    # Message handlers
    async def new_message_notification(self, event):
        """Send new message notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'new_message_notification',
            'data': event['data']
        }))

    async def unread_count_update(self, event):
        """Send unread count update to user"""
        await self.send(text_data=json.dumps({
            'type': 'unread_count_update',
            'payload': event['data']
        }))

    async def recent_messages_update(self, event):
        """Send recent messages update to user"""
        await self.send(text_data=json.dumps({
            'type': 'recent_messages_update',
            'payload': event['data']
        }))

    async def review_prompt(self, event):
        """Prompt buyer to leave a review"""
        await self.send(text_data=json.dumps({
            'type': 'review_prompt',
            'payload': event['data']
        }))

    async def new_review(self, event):
        """Notify vendor of a new review"""
        await self.send(text_data=json.dumps({
            'type': 'new_review',
            'payload': event['data']
        }))

    async def vendor_invitation(self, event):
        """Notify buyer of vendor invitation"""
        await self.send(text_data=json.dumps({
            'type': 'vendor_invitation',
            'payload': event['data']
        }))

    async def order_notification(self, event):
        """Notify user of order updates"""
        await self.send(text_data=json.dumps({
            'type': 'order_notification',
            'data': event['data']
        }))
    
    async def conversation_updated(self, event):
        """Handle conversation update events (for real-time list updates)"""
        await self.send(text_data=json.dumps({
            'type': 'conversation_updated',
            'data': event.get('data', {})
        }))
    
    async def conversation_locked(self, event):
        """Handle conversation locked/unlocked events"""
        await self.send(text_data=json.dumps({
            'type': 'conversation_locked',
            'data': event.get('data', {})
        }))
    
    async def message_edited(self, event):
        """Handle message edit events"""
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'data': event.get('data', {})
        }))
    
    async def message_deleted(self, event):
        """Handle message delete events"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'data': event.get('data', {})
        }))