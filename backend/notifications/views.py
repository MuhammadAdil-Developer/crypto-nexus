from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from shared.models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """List notifications for the authenticated user (supports pagination and filters)."""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        unread_only = request.GET.get('unread_only', '').lower() in ['1', 'true', 'yes']
        search = (request.GET.get('search') or '').strip()
        type_filter = (request.GET.get('type') or '').strip()  # order, payment, message, system
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        ordering = request.GET.get('ordering', '-created_at')

        qs = Notification.objects.filter(user=request.user)
        if unread_only:
            qs = qs.filter(is_read=False)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(message__icontains=search))
        if type_filter in ['order', 'payment', 'message', 'system', 'listing_approval', 'listing_rejection']:
            qs = qs.filter(type=type_filter)
        if date_from:
            df = parse_date(date_from)
            if df:
                qs = qs.filter(created_at__date__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                qs = qs.filter(created_at__date__lte=dt)

        if ordering not in ['created_at', '-created_at']:
            ordering = '-created_at'
        qs = qs.order_by(ordering)

        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        data = [
            {
                'id': str(n.id),
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'is_read': n.is_read,
                'data': n.data,
                'created_at': n.created_at.isoformat(),
            }
            for n in items
        ]

        return Response({
            'success': True,
            'message': 'Notifications retrieved successfully',
            'data': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return Response({'success': False, 'message': 'Failed to retrieve notifications', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Get unread notifications count for the authenticated user."""
    try:
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'success': True, 'message': 'Unread count retrieved', 'data': {'unread_count': count}})
    except Exception as e:
        return Response({'success': False, 'message': 'Failed to retrieve unread count', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all notifications as read for the authenticated user."""
    try:
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'success': True, 'message': 'All notifications marked as read', 'updated': updated})
    except Exception as e:
        return Response({'success': False, 'message': 'Failed to mark notifications as read', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a single notification as read."""
    try:
        notification = get_object_or_404(Notification, id=notification_id, user=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response({'success': True, 'message': 'Notification marked as read'})
    except Exception as e:
        return Response({'success': False, 'message': 'Failed to mark notification as read', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_notifications(request):
    """Get the most recent notifications (default 10) for quick bell icon view."""
    try:
        limit = int(request.GET.get('limit', 10))
        items = Notification.objects.filter(user=request.user).order_by('-created_at')[:limit]
        data = [
            {
                'id': str(n.id),
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'is_read': n.is_read,
                'data': n.data,
                'created_at': n.created_at.isoformat(),
            }
            for n in items
        ]
        unread = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'success': True, 'message': 'Recent notifications retrieved', 'data': data, 'unread_count': unread})
    except Exception as e:
        return Response({'success': False, 'message': 'Failed to retrieve recent notifications', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



