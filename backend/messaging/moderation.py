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
        from .models import ModerationSetting
        from .serializers import ModerationSettingSerializer
        setting_id = request.data.get('id')
        setting = get_object_or_404(ModerationSetting, id=setting_id)
        serializer = ModerationSettingSerializer(setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def run_auto_moderation(message):
    """Run automatic moderation on a message"""
    try:
        from .models import BlockedKeyword, ModerationSetting
        content = message.content.lower() if message.content else ""
        if not content:
            return
        
        # Check if keyword detection is enabled
        keyword_setting = ModerationSetting.objects.filter(name='keyword_detection', is_enabled=True).first()
        if keyword_setting:
            blocked_keywords = BlockedKeyword.objects.all().values_list('keyword', flat=True)
            for kw in blocked_keywords:
                if kw.lower() in content:
                    message.is_flagged = True
                    message.save()
                    
                    # Notify conversation that it has a flagged message
                    conversation = message.conversation
                    conversation.save() # Triggers auto_now update
                    break
        
        # Link blocking logic if enabled
        link_setting = ModerationSetting.objects.filter(name='link_blocking', is_enabled=True).first()
        if link_setting and not message.is_flagged:
            import re
            url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
            if re.search(url_pattern, content):
                message.is_flagged = True
                message.save()
                
    except Exception as e:
        logger.error(f"Error in auto-moderation: {e}")
