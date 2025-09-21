import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from shared.models import Conversation, Message
from .serializers import MessageSerializer

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
            
        except Exception as e:
            print(f"WebSocket authentication error: {e}")
            self.scope['user'] = AnonymousUser()

    async def disconnect(self, close_code):
        # Leave conversation group
        await self.channel_layer.group_discard(
            self.conversation_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'chat_message':
                message_content = text_data_json.get('message', '')
                if message_content.strip():
                    # Save message to database
                    message_data = await self.save_message(message_content)
                    
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

    async def chat_message(self, event):
        message_data = event['message_data']
        
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
            'data': event['data']
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
            
            # Update conversation's last message
            conversation.last_message = message
            conversation.save()
            
            # If this is the first message and conversation has a product, create product reference
            if is_first_message and conversation.product:
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
                
                # Serialize both messages
                message_serializer = MessageSerializer(message)
                product_serializer = MessageSerializer(product_message)
                return {
                    'user_message': message_serializer.data,
                    'product_reference': product_serializer.data
                }
            
            # Serialize message
            serializer = MessageSerializer(message)
            return serializer.data
            
        except Conversation.DoesNotExist:
            return None

    async def send_conversation_info(self):
        """Send conversation information to the connected user"""
        try:
            conversation_data = await self.get_conversation_data()
            await self.send(text_data=json.dumps({
                'type': 'conversation_info',
                'data': conversation_data
            }))
        except Exception as e:
            print(f"Error sending conversation info: {e}")

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
