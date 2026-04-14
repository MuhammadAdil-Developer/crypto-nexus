from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def blocked_keywords_list_create(request):
    """List or create blocked keywords (Admin only)"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    from .models import BlockedKeyword
    from .serializers import BlockedKeywordSerializer
    if request.method == 'GET':
        keywords = BlockedKeyword.objects.all()
        serializer = BlockedKeywordSerializer(keywords, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = BlockedKeywordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_blocked_keyword(request, keyword_id):
    """Delete a blocked keyword (Admin only)"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    from .models import BlockedKeyword
    keyword = get_object_or_404(BlockedKeyword, id=keyword_id)
    keyword.delete()
    return Response({'message': 'Keyword deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def moderation_settings_list_update(request):
    """List or update moderation settings (Admin only)"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    from .models import ModerationSetting
    from .serializers import ModerationSettingSerializer
    try:
        if request.method == 'GET':
            # Ensure default settings exist
            defaults = [
                {'name': 'keyword_detection', 'label': 'Keyword Detection', 'description': 'Automatically flag messages containing blocked keywords'},
                {'name': 'spam_detection', 'label': 'Spam Detection', 'description': 'Flag repeated messages and potential spam content'},
                {'name': 'link_blocking', 'label': 'Link Blocking', 'description': 'Block or flag external links in messages'}
            ]
            for d in defaults:
                ModerationSetting.objects.get_or_create(name=d['name'], defaults={'label': d['label'], 'description': d['description']})
                
            settings = ModerationSetting.objects.all()
            serializer = ModerationSettingSerializer(settings, many=True)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            setting_id = request.data.get('id')
            setting = get_object_or_404(ModerationSetting, id=setting_id)
            serializer = ModerationSettingSerializer(setting, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in moderation settings: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def run_auto_moderation(message):
    """Run automatic moderation on a message"""
    print(f"\n[DEBUG] Starting moderation for message: {message.id}")
    try:
        from .models import BlockedKeyword, ModerationSetting
        content = message.content.lower() if message.content else ""
        print(f"[DEBUG] Message content: '{content}'")
        
        if not content:
            print("[DEBUG] No content to moderate.")
            return
        
        # Check if keyword detection is enabled
        keyword_setting = ModerationSetting.objects.filter(name='keyword_detection').first()
        if keyword_setting:
            is_enabled = keyword_setting.is_enabled
            print(f"[DEBUG] Keyword Detection Setting Found: name={keyword_setting.name}, is_enabled={is_enabled}")
        else:
            print("[DEBUG] Keyword Detection Setting NOT FOUND in database.")
            is_enabled = False

        if is_enabled:
            blocked_keywords = list(BlockedKeyword.objects.all().values_list('keyword', flat=True))
            print(f"[DEBUG] Found {len(blocked_keywords)} blocked keywords: {blocked_keywords}")
            
            for kw in blocked_keywords:
                search_kw = kw.lower()
                if search_kw in content:
                    print(f"[DEBUG] MATCH FOUND! Keyword: '{kw}' is in content.")
                    logger.info(f"MODERATION: Flagging message {message.id} due to keyword '{kw}'")
                    message.is_flagged = True
                    message.save()
                    
                    # Notify conversation that it has a flagged message
                    conversation = message.conversation
                    conversation.save() # Triggers auto_now update
                    
                    # Notify admin
                    try:
                        from shared.admin_notifications import send_admin_notification
                        send_admin_notification(
                            notification_type='security',
                            title='Auto-Moderation: Keyword Detected',
                            message=f"Message {message.id} flagged for keyword: {kw}",
                            data={'message_id': str(message.id), 'keyword': kw},
                            priority='high'
                        )
                    except Exception as e:
                        logger.error(f"Failed to notify admin of flagged message: {e}")
                        
                    print("[DEBUG] Message flagged and saved successfully.")
                    break
        else:
            print("[DEBUG] Skipping keyword check because it is DISABLED.")
            logger.info("MODERATION: Keyword detection is DISABLED in settings.")
        
        # Link blocking logic if enabled
        link_setting = ModerationSetting.objects.filter(name='link_blocking').first()
        link_enabled = link_setting.is_enabled if link_setting else False
        print(f"[DEBUG] Link Blocking Setting: {link_enabled}")

        if link_enabled and not message.is_flagged:
            import re
            url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
            if re.search(url_pattern, content):
                print("[DEBUG] URL MATCH FOUND! Flagging message.")
                logger.info(f"MODERATION: Flagging message {message.id} due to link detection.")
                message.is_flagged = True
                message.save()
                
                # Notify admin
                try:
                    from shared.admin_notifications import send_admin_notification
                    send_admin_notification(
                        notification_type='security',
                        title='Auto-Moderation: Link Detected',
                        message=f"Message {message.id} flagged for link/URL",
                        data={'message_id': str(message.id)},
                        priority='medium'
                    )
                except Exception:
                    pass
                
    except Exception as e:
        print(f"[DEBUG] EXCEPTION in moderation: {e}")
        logger.error(f"Error in auto-moderation: {e}")
    print("[DEBUG] Moderation check finished.\n")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_flagged_messages(request):
    """Get all flagged messages for admin review"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from shared.models import Message
        from .serializers import MessageSerializer
        
        # Get all flagged messages, ordered by newest first
        flagged_messages = Message.objects.filter(is_flagged=True).order_by('-created_at')
        
        serializer = MessageSerializer(flagged_messages, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'count': len(serializer.data),
            'data': serializer.data
        })
    except Exception as e:
        logger.error(f"Error fetching flagged messages: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_flagged_message(request, message_id):
    """Resolve a flagged message (unflag or keep flagged)"""
    if not (hasattr(request.user, 'user_type') and request.user.user_type == 'admin'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from shared.models import Message
        message = get_object_or_404(Message.objects.select_related('conversation', 'sender'), id=message_id)
        
        action = request.data.get('action') # 'unflag' or 'confirm'
        
        if action == 'unflag':
            message.is_flagged = False
            message.save()
            return Response({'success': True, 'message': 'Message unflagged'})
        elif action == 'confirm':
            # 1. Lock the conversation (So no more messages can be sent)
            conversation = message.conversation
            conversation.is_active = False
            conversation.save()
            
            # 2. Send real-time "locked" event to participants
            try:
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f'chat_{conversation.id}',
                        {
                            'type': 'conversation_locked',
                            'data': {
                                'conversation_id': str(conversation.id),
                                'is_active': False,
                                'locked_by_admin': True
                            }
                        }
                    )
            except Exception as e:
                logger.error(f"Error sending lock event: {e}")

            # 3. Send a formal warning notification to the sender
            try:
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=message.sender,
                    notification_type='security',
                    title='Security Warning: Content Policy Violation',
                    message="One of your messages was flagged by the moderation system. This conversation has been locked. Please follow our community rules.",
                    data={'conversation_id': str(conversation.id), 'message_id': str(message.id)}
                )
            except Exception as e:
                logger.error(f"Error sending warning: {e}")

            return Response({
                'success': True, 
                'message': 'Message flag confirmed. Conversation locked and user warned.'
            })
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error resolving flagged message: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

