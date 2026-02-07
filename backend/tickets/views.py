from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Ticket, TicketMessage, TicketTemplate
from .serializers import (
    TicketSerializer, TicketCreateSerializer, TicketMessageSerializer,
    TicketStatisticsSerializer, TicketTemplateSerializer
)
from shared.utils import is_admin_user, is_vendor_user

logger = logging.getLogger(__name__)


class TicketListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TicketCreateSerializer
        return TicketSerializer
    
    def perform_create(self, serializer):
        """Create ticket and notify admin"""
        ticket = serializer.save()
        # Notify admin about new ticket
        try:
            from shared.admin_notifications import notify_admin_ticket_submitted
            notify_admin_ticket_submitted(ticket)
        except Exception as e:
            logger.error(f"Error notifying admin about ticket: {e}")
        return ticket
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins can see all tickets
        if is_admin_user(user):
            queryset = Ticket.objects.all()
        else:
            # Users can only see their own tickets
            queryset = Ticket.objects.filter(user=user)
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        priority_filter = self.request.query_params.get('priority')
        category_filter = self.request.query_params.get('category')
        assigned_filter = self.request.query_params.get('assigned_to')
        search = self.request.query_params.get('search')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if assigned_filter:
            if assigned_filter == 'unassigned':
                queryset = queryset.filter(assigned_to__isnull=True)
            else:
                queryset = queryset.filter(assigned_to=assigned_filter)
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(description__icontains=search) |
                Q(ticket_id__icontains=search) |
                Q(user__username__icontains=search)
            )
        
        return queryset.select_related('user', 'assigned_to').order_by('-created_at')


class TicketDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if is_admin_user(user):
            return Ticket.objects.all()
        else:
            return Ticket.objects.filter(user=user)


class TicketMessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketMessageSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        ticket_id = self.kwargs['pk']
        user = self.request.user
        
        # Check if user has access to this ticket
        try:
            if is_admin_user(user):
                ticket = Ticket.objects.get(id=ticket_id)
            else:
                ticket = Ticket.objects.get(id=ticket_id, user=user)
        except Ticket.DoesNotExist:
            return TicketMessage.objects.none()
        
        # Filter internal messages for non-admin users
        queryset = TicketMessage.objects.filter(ticket=ticket)
        if not is_admin_user(user):
            queryset = queryset.filter(is_internal=False)
        
        return queryset.select_related('sender').order_by('created_at')
    
    def create(self, request, *args, **kwargs):
        ticket_id = self.kwargs['pk']
        user = request.user
        
        try:
            if is_admin_user(user):
                ticket = Ticket.objects.get(id=ticket_id)
            else:
                ticket = Ticket.objects.get(id=ticket_id, user=user)
        except Ticket.DoesNotExist:
            return Response(
                {'error': 'Ticket not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Handle file uploads
        attachments = []
        if request.FILES:
            for key, file in request.FILES.items():
                if key.startswith('attachment_'):
                    # Here you would typically save the file and get its URL
                    # For now, we'll just store the filename
                    attachments.append(file.name)
        
        # Handle boolean conversion more robustly
        is_internal = request.data.get('is_internal', False)
        if isinstance(is_internal, str):
            is_internal = is_internal.lower() == 'true'
        
        data = {
            'message': request.data.get('message'),
            'is_internal': is_internal,
            'attachments': attachments
        }
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            # Create the message with the ticket
            message = serializer.save(ticket=ticket)
            
            # Notify based on who sent the message and trigger count updates
            if is_admin_user(user) and not is_internal:
                # Admin responded - notify the ticket owner (buyer/vendor)
                try:
                    from shared.admin_notifications import notify_user_ticket_response
                    notify_user_ticket_response(ticket, user, is_admin_response=True)
                except Exception as e:
                    logger.error(f"Error notifying user about ticket response: {e}")
            elif not is_internal:
                # Vendor/Buyer responded - notify admin
                try:
                    from shared.admin_notifications import notify_admin_ticket_message
                    notify_admin_ticket_message(ticket, user, message)
                except Exception as e:
                    logger.error(f"Error notifying admin about ticket message: {e}")
            
            # Trigger count refresh and notification via central helper
            try:
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=ticket.user,
                    notification_type='ticket_response',
                    title='Ticket Message',
                    message=f'New message in ticket: "{ticket.subject}"',
                    data={
                        'id': f'ticket_msg_{message.id}',
                        'ticket_id': str(ticket.id),
                        'ticket_id_display': ticket.ticket_id,
                        'action_url': f'/buyer/support' if ticket.user_type == 'buyer' else f'/vendor/support'
                    },
                    priority='normal'
                )
            except Exception as e:
                logger.error(f"Error sending ticket notification: {e}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # Log validation errors for debugging
        logger.error(f"TicketMessage validation errors: {serializer.errors}")
        logger.error(f"Data being validated: {data}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_ticket_status(request, pk):
    """Update ticket status (admin only)"""
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        ticket = Ticket.objects.get(id=pk)
        
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'error': 'Status is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update timestamps based on status
        now = timezone.now()
        if new_status == 'resolved':
            ticket.resolved_at = now
            # Notify user that their ticket is resolved
            try:
                from shared.admin_notifications import notify_user_ticket_resolved
                notify_user_ticket_resolved(ticket, request.user)
            except Exception as e:
                logger.error(f"Error notifying user about ticket resolution: {e}")
        elif new_status == 'closed':
            ticket.closed_at = now
        
        ticket.status = new_status
        ticket.save()
        
        return Response({'message': 'Ticket status updated successfully'})
    except Ticket.DoesNotExist:
        return Response(
            {'error': 'Ticket not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to update ticket status'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def assign_ticket(request, pk):
    """Assign ticket to admin (admin only)"""
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        ticket = Ticket.objects.get(id=pk)
    except Ticket.DoesNotExist:
        return Response(
            {'error': 'Ticket not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    assigned_to_id = request.data.get('assigned_to')
    
    if assigned_to_id:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Fetch user via ID first
            try:
                assigned_user = User.objects.get(id=assigned_to_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Selected admin user not found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user is admin
            if getattr(assigned_user, 'user_type', '') != 'admin' and not assigned_user.is_superuser:
                 return Response(
                    {'error': 'Selected user is not an admin'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            old_assigned = ticket.assigned_to
            ticket.assigned_to = assigned_user
            ticket.save()
            
            # Notify assigned admin via central helper
            try:
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=assigned_user,
                    notification_type='ticket_assigned',
                    title='Ticket Assigned',
                    message=f'You have been assigned to ticket #{ticket.ticket_id}: {ticket.subject}',
                    data={
                        'ticket_id': str(ticket.id),
                        'ticket_id_display': ticket.ticket_id,
                        'action_url': '/admin/tickets'
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send assignment notification to admin: {e}")
            
            # Notify ticket opener via central helper
            try:
                send_user_notification(
                    user=ticket.user,
                    notification_type='ticket_response',
                    title='Ticket Assigned',
                    message=f'Your ticket #{ticket.ticket_id} has been assigned to an admin for review',
                    data={
                        'ticket_id': str(ticket.id),
                        'ticket_id_display': ticket.ticket_id,
                        'action_url': f'/buyer/support' if ticket.user_type == 'buyer' else f'/vendor/support'
                    }
                )
            except Exception as e:
                 logger.error(f"Failed to send assignment notification to user: {e}")
            
            return Response({'message': 'Ticket assigned successfully'})
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to assign ticket'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        ticket.assigned_to = None
        ticket.save()
        return Response({'message': 'Ticket unassigned successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_ticket(request, pk):
    """Close ticket (admin or ticket owner)"""
    try:
        ticket = Ticket.objects.get(id=pk)
        
        # Allow admin or ticket owner to close the ticket
        if not is_admin_user(request.user) and ticket.user != request.user:
            return Response(
                {'error': 'You can only close your own tickets'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        ticket.status = 'closed'
        ticket.closed_at = timezone.now()
        ticket.save()
        
        return Response({'message': 'Ticket closed successfully'})
    except Ticket.DoesNotExist:
        return Response(
            {'error': 'Ticket not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to close ticket'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reopen_ticket(request, pk):
    """Reopen a closed ticket (admin only)"""
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        ticket = Ticket.objects.get(id=pk)
        
        if ticket.status != 'closed':
            return Response(
                {'error': 'Ticket is not closed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ticket.status = 'open'
        ticket.closed_at = None
        ticket.save()
        
        return Response({'message': 'Ticket reopened successfully'})
    except Ticket.DoesNotExist:
        return Response(
            {'error': 'Ticket not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to reopen ticket'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_users(request):
    """Get list of admin users for ticket assignment"""
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_users = User.objects.filter(
            user_type='admin',
            is_active=True,
            is_deleted=False
        ).values('id', 'username')
        
        return Response({
            'success': True,
            'data': list(admin_users)
        })
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve admin users'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ticket_statistics(request):
    \"\"\"Get ticket statistics\"\"\"
    try:
        user = request.user
        
        if is_admin_user(user):
            # Admin sees all tickets
            tickets = Ticket.objects.all()
        else:
            # Users see only their tickets
            tickets = Ticket.objects.filter(user=user)
        
        # Calculate statistics
        total_tickets = tickets.count()
        open_tickets = tickets.filter(status='open').count()
        in_progress_tickets = tickets.filter(status='in_progress').count()
        resolved_tickets = tickets.filter(status='resolved').count()
        closed_tickets = tickets.filter(status='closed').count()
        waiting_response_tickets = tickets.filter(status='waiting_response').count()
        urgent_tickets = tickets.filter(priority='urgent').count()
        high_priority_tickets = tickets.filter(priority='high').count()
        
        # Tickets by category
        tickets_by_category = dict(
            tickets.values('category').annotate(count=Count('id')).values_list('category', 'count')
        )
        
        # Tickets by status
        tickets_by_status = dict(
            tickets.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        
        # Calculate average response time (for admin only)
        avg_response_time = 0
        if is_admin_user(user):
            # Calculate average time between ticket creation and first admin response
            tickets_with_responses = tickets.filter(
                messages__sender__user_type='admin'
            ).distinct()
            
            if tickets_with_responses.exists():
                total_time = 0
                count = 0
                for ticket in tickets_with_responses:
                    first_admin_message = ticket.messages.filter(
                        sender__user_type='admin'
                    ).order_by('created_at').first()
                    
                    if first_admin_message:
                        response_time = (first_admin_message.created_at - ticket.created_at).total_seconds() / 3600  # hours
                        total_time += response_time
                        count += 1
                
                if count > 0:
                    avg_response_time = round(total_time / count, 1)
        
        stats = {
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'in_progress_tickets': in_progress_tickets,
            'resolved_tickets': resolved_tickets,
            'closed_tickets': closed_tickets,
            'waiting_response_tickets': waiting_response_tickets,
            'urgent_tickets': urgent_tickets,
            'high_priority_tickets': high_priority_tickets,
            'tickets_by_category': tickets_by_category,
            'tickets_by_status': tickets_by_status,
            'avg_response_time': avg_response_time
        }
        
        return Response(stats)
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve ticket statistics'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TicketTemplateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketTemplateSerializer
    queryset = TicketTemplate.objects.filter(is_active=True)


class TicketTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketTemplateSerializer
    queryset = TicketTemplate.objects.all()
