
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Dispute, DisputeMessage, DisputeTimeline
from .serializers import (
    DisputeSerializer, DisputeCreateSerializer, DisputeMessageSerializer,
    DisputeTimelineSerializer, DisputeListSerializer
)
from orders.models import Order
from shared.models import Notification
import logging

logger = logging.getLogger(__name__)


def is_admin_user(user):
    return hasattr(user, 'user_type') and user.user_type == 'admin'


def is_vendor_user(user):
    return hasattr(user, 'user_type') and user.user_type == 'vendor'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_dispute(request):
    """Create a new dispute"""
    try:
        logger.info(f"create_dispute request.data: {request.data}")
        serializer = DisputeCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Use the resolved Order instance provided by the serializer
            order = serializer.validated_data.get('resolved_order')
            
            # Check if dispute already exists for this order
            existing_dispute = Dispute.objects.filter(order=order).first()
            if existing_dispute:
                return Response({
                    'success': False,
                    'message': 'A dispute already exists for this order'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create dispute (serializer.create handles setting buyer/vendor/product)
            dispute = serializer.save()

            # Update associated refund request status if it exists
            if dispute.refund_request:
                dispute.refund_request.status = 'disputed'
                dispute.refund_request.save()
            
            # Create timeline entry
            DisputeTimeline.objects.create(
                dispute=dispute,
                action='Dispute Created',
                description=f"Buyer {request.user.username} created a dispute for order {dispute.order.id}",
                user=request.user
            )
            
            # Notify vendor
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=dispute.vendor,
                notification_type='dispute',
                title='New Dispute Created',
                message=f"A dispute has been created for your product: {dispute.product.headline}",
                data={'dispute_id': str(dispute.id), 'order_id': str(dispute.order.id)}
            )
            
            # Notify all admins using helper function (creates DB notifications for all admins + WebSocket)
            try:
                from shared.admin_notifications import send_admin_notification
                send_admin_notification(
                    notification_type='dispute',
                    title='New Dispute Requires Attention',
                    message=f"New dispute created by {request.user.username}: {dispute.title}",
                    data={'dispute_id': str(dispute.id), 'priority': dispute.priority},
                    priority='high'
                )
            except Exception as e:
                logger.error(f"Failed to notify admins about dispute: {e}")
            
            # Trigger count refresh for all relevant users
            channel_layer = get_channel_layer()
            if channel_layer:
                # Notify admins via WebSocket for UI updates (count refresh only)
                try:
                    from users.models import User
                    admins = User.objects.filter(user_type='admin', is_active=True)
                    for admin in admins:
                        async_to_sync(channel_layer.group_send)(
                            f"realtime_{admin.id}",
                            {
                                "type": "order_notification",
                                "data": {
                                    "action": "refresh_counts",
                                    "type": "dispute"
                                }
                            }
                        )
                except Exception as e:
                    logger.error(f"Failed to send count refresh to admins: {e}")
            
            return Response({
                'success': True,
                'message': 'Dispute created successfully',
                'data': DisputeSerializer(dispute).data
            }, status=status.HTTP_201_CREATED)
        
        logger.warning(f"create_dispute serializer.errors: {serializer.errors}")
        return Response({
            'success': False,
            'message': 'Invalid data',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error creating dispute: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to create dispute',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_disputes(request):
    """List disputes based on user role"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        status_filter = request.GET.get('status')
        priority_filter = request.GET.get('priority')
        category_filter = request.GET.get('category')
        
        # Base queryset
        if is_admin_user(request.user):
            # Admin can see all disputes
            queryset = Dispute.objects.all()
        elif is_vendor_user(request.user):
            # Vendor can see disputes for their products
            queryset = Dispute.objects.filter(vendor=request.user)
        else:
            # Buyer can see their own disputes
            queryset = Dispute.objects.filter(buyer=request.user)
        
        # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # Pagination
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        disputes = queryset[start:end]
        
        serializer = DisputeListSerializer(disputes, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'has_next': end < total_count,
                'has_previous': page > 1
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing disputes: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch disputes',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dispute_detail(request, dispute_id):
    """Get detailed dispute information"""
    try:
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        # Check permissions
        if not is_admin_user(request.user) and dispute.buyer != request.user and dispute.vendor != request.user:
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get dispute details
        dispute_data = DisputeSerializer(dispute).data
        
        # Get messages
        messages = DisputeMessage.objects.filter(dispute=dispute)
        if not is_admin_user(request.user):
            messages = messages.filter(is_internal=False)
        
        messages_data = DisputeMessageSerializer(messages, many=True).data
        
        # Get timeline
        timeline_data = DisputeTimelineSerializer(dispute.timeline.all(), many=True).data
        
        return Response({
            'success': True,
            'data': {
                'dispute': dispute_data,
                'messages': messages_data,
                'timeline': timeline_data
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting dispute detail: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch dispute details',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_dispute_message(request, dispute_id):
    """Send a message in dispute"""
    try:
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        # Check permissions
        if not is_admin_user(request.user) and dispute.buyer != request.user and dispute.vendor != request.user:
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        message_text = request.data.get('message', '').strip()
        is_internal = request.data.get('is_internal', False)
        attachments = request.data.get('attachments', [])
        
        if not message_text:
            return Response({
                'success': False,
                'message': 'Message cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Only admins can send internal messages
        if is_internal and not is_admin_user(request.user):
            is_internal = False
        
        message = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=message_text,
            is_internal=is_internal,
            attachments=attachments
        )
        
        # Update dispute status if needed
        if dispute.status == 'open':
            dispute.status = 'in_progress'
            dispute.save()
            
            DisputeTimeline.objects.create(
                dispute=dispute,
                action='Status Updated',
                description='Dispute status changed to In Progress',
                user=request.user
            )
        
        # Create timeline entry
        DisputeTimeline.objects.create(
            dispute=dispute,
            action='Message Sent',
            description=f"{request.user.username} sent a message",
            user=request.user
        )
        
        # Notify other parties
        from shared.admin_notifications import send_user_notification
        if dispute.buyer != request.user:
            send_user_notification(
                user=dispute.buyer,
                notification_type='dispute',
                title='New Message in Dispute',
                message=f"New message in dispute {dispute.dispute_id}",
                data={'dispute_id': str(dispute.id)}
            )
        
        if dispute.vendor != request.user:
            send_user_notification(
                user=dispute.vendor,
                notification_type='dispute',
                title='New Message in Dispute',
                message=f"New message in dispute {dispute.dispute_id}",
                data={'dispute_id': str(dispute.id)}
            )
        
        # Real-time UI updates (like unread counts) can be sent here if needed
        # But toast notifications are already handled by send_user_notification above
        
        return Response({
            'success': True,
            'message': 'Message sent successfully',
            'data': DisputeMessageSerializer(message).data
        })
        
    except Exception as e:
        logger.error(f"Error sending dispute message: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to send message',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_dispute(request, dispute_id):
    """Resolve a dispute (admin only)"""
    try:
        if not is_admin_user(request.user):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        resolution = request.data.get('resolution')
        resolution_notes = request.data.get('resolution_notes', '').strip()
        resolution_reason = request.data.get('resolution_reason', '').strip()
        winning_party = request.data.get('winning_party')
        refund_amount = request.data.get('refund_amount')
        
        # Convert refund_amount to Decimal if provided, otherwise None
        if refund_amount:
            try:
                from decimal import Decimal
                refund_amount = Decimal(str(refund_amount))
                if refund_amount <= 0:
                    refund_amount = None
            except (ValueError, TypeError):
                refund_amount = None
        else:
            refund_amount = None
        
        if not resolution:
            return Response({
                'success': False,
                'message': 'Resolution is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not resolution_reason:
            return Response({
                'success': False,
                'message': 'Resolution reason is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not winning_party:
            return Response({
                'success': False,
                'message': 'Winning party must be specified'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get order details
        order = dispute.order
        is_escrow_order = order.use_escrow if hasattr(order, 'use_escrow') else False
        
        # Check if escrow payment is confirmed before resolving
        if is_escrow_order:
            try:
                from payments.models import PaymentAddress
                payment_address = PaymentAddress.objects.get(order_id=order.order_id)
                if hasattr(payment_address, 'escrow'):
                    escrow_payment = payment_address.escrow
                    # If escrow exists but is essentially unconfirmed/created
                    if escrow_payment.status == 'created': 
                        return Response({
                            'success': False,
                            'message': 'The payment for this order is pending blockchain confirmation. Please wait for the transaction to be confirmed before proceeding.'
                        }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error checking escrow status in resolve_dispute: {e}")
        
        # Update dispute
        dispute.resolution = resolution
        dispute.resolution_notes = resolution_notes
        dispute.resolution_reason = resolution_reason
        dispute.winning_party = winning_party
        dispute.refund_amount = refund_amount
        dispute.status = 'resolved'
        dispute.resolved_at = timezone.now()
        dispute.assigned_admin = request.user
        dispute.save()
        
        # Process refunds if buyer wins AND refund_amount is provided (escrow or non-escrow)
        escrow_refund_processed = False
        refund_sent = False
        if winning_party == 'buyer' and refund_amount is not None and refund_amount > 0:
            try:
                from payments.models import PaymentAddress
                from payments.services import PaymentService
                from django.db import transaction
                from decimal import Decimal
                
                # Get escrow payment
                escrow_payment = None
                escrow_funded = False
                try:
                    payment_address = PaymentAddress.objects.get(order_id=order.order_id)
                    escrow_payment = payment_address.escrow if hasattr(payment_address, 'escrow') else None
                    if escrow_payment:
                        escrow_funded = escrow_payment.status == 'funded'
                except Exception as e:
                    logger.error(f"Error loading escrow payment for dispute {dispute.id}: {str(e)}")
                
                # Get buyer payout address
                currency = order.crypto_currency if hasattr(order, 'crypto_currency') else 'BTC'
                buyer_payout_address = None
                if currency == 'BTC':
                    buyer_payout_address = getattr(dispute.buyer, 'btc_payout_address', None)
                elif currency == 'XMR':
                    buyer_payout_address = getattr(dispute.buyer, 'xmr_payout_address', None)
                
                if not buyer_payout_address:
                    error_msg = f"Buyer {dispute.buyer.username} has no {currency} payout address for dispute {dispute.id}. Please ask buyer to set their payout address in settings."
                    logger.error(error_msg)
                    return Response({
                        'success': False,
                        'message': error_msg
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    payment_service = PaymentService()
                    refund_decimal = Decimal(str(refund_amount))
                    
                    # Check if full or partial refund
                    order_total = Decimal(str(order.total_amount)) if hasattr(order, 'total_amount') else refund_decimal
                    is_full_refund = refund_decimal >= order_total
                    
                    with transaction.atomic():
                        # Process refund for ESCROW orders
                        if is_escrow_order and (escrow_funded or escrow_payment):
                            if is_full_refund:
                                # Full refund: send everything to buyer
                                # Use escrow amount if available, otherwise use refund amount
                                if escrow_payment and escrow_funded:
                                    total_refund = escrow_payment.escrow_amount + escrow_payment.escrow_fee
                                else:
                                    total_refund = refund_decimal
                                
                                if currency == 'BTC':
                                    payout_result = payment_service.btcpay.create_payout({
                                        'destination': buyer_payout_address,
                                        'amount': str(total_refund),
                                    })
                                    tx_hash = payout_result.get('transactionHash') if payout_result else None
                                elif currency == 'XMR':
                                    destinations = [{'address': buyer_payout_address, 'amount': float(total_refund)}]
                                    monero_result = payment_service.monero.send_transaction(destinations)
                                    tx_hash = monero_result.get('tx_hash') if monero_result else None
                                else:
                                    tx_hash = None
                                
                                if tx_hash:
                                    if escrow_payment:
                                        escrow_payment.status = 'refunded'
                                        escrow_payment.released_at = timezone.now()
                                        escrow_payment.release_transaction_hash = tx_hash
                                        escrow_payment.save()
                                    escrow_refund_processed = True
                                    refund_sent = True
                                    logger.info(f"Escrow refund sent: {total_refund} {currency} to buyer {dispute.buyer.username}, tx_hash: {tx_hash}")
                                else:
                                    error_msg = f"Failed to send escrow refund for dispute {dispute.id}: No transaction hash returned from payment service"
                                    logger.error(error_msg)
                                    raise Exception(error_msg)
                            else:
                                # Partial refund: send half to buyer, half stays with vendor
                                half_amount = refund_decimal / Decimal('2')
                                
                                if currency == 'BTC':
                                    payout_result = payment_service.btcpay.create_payout({
                                        'destination': buyer_payout_address,
                                        'amount': str(half_amount),
                                    })
                                    tx_hash = payout_result.get('transactionHash') if payout_result else None
                                elif currency == 'XMR':
                                    destinations = [{'address': buyer_payout_address, 'amount': float(half_amount)}]
                                    monero_result = payment_service.monero.send_transaction(destinations)
                                    tx_hash = monero_result.get('tx_hash') if monero_result else None
                                else:
                                    tx_hash = None
                                
                                if tx_hash:
                                    # Mark escrow as partially released
                                    if escrow_payment:
                                        escrow_payment.status = 'partially_released'
                                        escrow_payment.released_at = timezone.now()
                                        escrow_payment.release_transaction_hash = tx_hash
                                        escrow_payment.save()
                                    escrow_refund_processed = True
                                    refund_sent = True
                                    logger.info(f"Partial escrow refund sent: {half_amount} {currency} to buyer {dispute.buyer.username}, tx_hash: {tx_hash}")
                                    
                                    # Release remaining to vendor
                                    vendor_payout_address = None
                                    if currency == 'BTC':
                                        from vendors.models import VendorApplication
                                        try:
                                            vendor_app = VendorApplication.objects.get(vendor_username=dispute.vendor.username)
                                            vendor_payout_address = vendor_app.btc_address
                                        except VendorApplication.DoesNotExist:
                                            pass
                                    elif currency == 'XMR':
                                        from vendors.models import VendorApplication
                                        try:
                                            vendor_app = VendorApplication.objects.get(vendor_username=dispute.vendor.username)
                                            vendor_payout_address = vendor_app.xmr_address
                                        except VendorApplication.DoesNotExist:
                                            pass
                                    
                                    if vendor_payout_address and escrow_payment:
                                        remaining = escrow_payment.escrow_amount - half_amount
                                        if currency == 'BTC':
                                            payment_service.btcpay.create_payout({
                                                'destination': vendor_payout_address,
                                                'amount': str(remaining),
                                            })
                                        elif currency == 'XMR':
                                            destinations = [{'address': vendor_payout_address, 'amount': float(remaining)}]
                                            payment_service.monero.send_transaction(destinations)
                                        
                                        escrow_payment.status = 'released'
                                        escrow_payment.save()
                                else:
                                    logger.error(f"Failed to send partial escrow refund for dispute {dispute.id}: No transaction hash returned")
                                    raise Exception(f"Failed to send partial escrow refund: No transaction hash returned")
                        
                        # Process refund for NON-ESCROW orders - send from platform wallet
                        if not is_escrow_order:
                            # For non-escrow, always send the exact refund amount from platform wallet
                            total_refund = refund_decimal
                            
                            logger.info(f"Processing non-escrow refund: {total_refund} {currency} to buyer {dispute.buyer.username}")
                            
                            if currency == 'BTC':
                                payout_result = payment_service.btcpay.create_payout({
                                    'destination': buyer_payout_address,
                                    'amount': str(total_refund),
                                })
                                tx_hash = payout_result.get('transactionHash') if payout_result else None
                            elif currency == 'XMR':
                                destinations = [{'address': buyer_payout_address, 'amount': float(total_refund)}]
                                monero_result = payment_service.monero.send_transaction(destinations)
                                tx_hash = monero_result.get('tx_hash') if monero_result else None
                            else:
                                tx_hash = None
                            
                            if tx_hash:
                                escrow_refund_processed = True
                                refund_sent = True
                                logger.info(f"Non-escrow refund sent from platform wallet: {total_refund} {currency} to buyer {dispute.buyer.username}, tx_hash: {tx_hash}")
                            else:
                                error_msg = f"Failed to send non-escrow refund for dispute {dispute.id}: No transaction hash returned from payment service"
                                logger.error(error_msg)
                                raise Exception(error_msg)
            except Exception as e:
                logger.error(f"Error processing refund for dispute {dispute.id}: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                # Return error response if refund fails - don't resolve dispute if refund fails
                return Response({
                    'success': False,
                    'message': f'Failed to process refund: {str(e)}. Please check buyer payout address and platform wallet balance.',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create timeline entry
        winning_party_text = {
            'buyer': 'Buyer',
            'vendor': 'Vendor', 
            'neutral': 'Neutral/Shared Responsibility'
        }.get(winning_party, 'Unknown')
        
        timeline_desc = f"Dispute resolved by admin {request.user.username}. Decision: {resolution}. Winner: {winning_party_text}. Reason: {resolution_reason}"
        if escrow_refund_processed or refund_sent:
            if is_escrow_order:
                timeline_desc += f" Escrow refund processed automatically."
            else:
                timeline_desc += f" Refund of {refund_amount} {order.crypto_currency if hasattr(order, 'crypto_currency') else 'BTC'} sent from platform wallet."
        
        DisputeTimeline.objects.create(
            dispute=dispute,
            action='Dispute Resolved',
            description=timeline_desc,
            user=request.user
        )
        
        # Determine notification messages based on winning party
        buyer_message = f"Your dispute {dispute.dispute_id} has been resolved"
        vendor_message = f"Dispute {dispute.dispute_id} has been resolved"
        
        if winning_party == 'buyer':
            buyer_message += " - Decision in your favor!"
            if escrow_refund_processed:
                buyer_message += f" Refund of {refund_amount} {order.crypto_currency if hasattr(order, 'crypto_currency') else 'BTC'} has been sent to your wallet."
            vendor_message = f"⚠️ DISPUTE LOST: Dispute {dispute.dispute_id} has been resolved in favor of the buyer."
            # For non-escrow disputes, send special notification to vendor
            if not is_escrow_order:
                vendor_message += f" You are required to manually refund {refund_amount} {order.crypto_currency if hasattr(order, 'crypto_currency') else 'BTC'} to the buyer's wallet. Order ID: {order.order_id}. Please process this refund immediately."
            else:
                vendor_message += f" Refund of {refund_amount} {order.crypto_currency if hasattr(order, 'crypto_currency') else 'BTC'} has been automatically processed from escrow."
        elif winning_party == 'vendor':
            buyer_message += " - Decision in favor of the vendor."
            vendor_message += " - Decision in your favor!"
            if is_escrow_order and escrow_refund_processed:
                vendor_message += " No refund was processed as the decision was in your favor."
        else:
            buyer_message += " - Shared responsibility decision."
            vendor_message += " - Shared responsibility decision."
        
        # Notify parties
        from shared.admin_notifications import send_user_notification
        send_user_notification(
            user=dispute.buyer,
            notification_type='dispute',
            title='Dispute Resolved',
            message=buyer_message,
            data={
                'dispute_id': str(dispute.id), 
                'resolution': resolution,
                'winning_party': winning_party,
                'resolution_reason': resolution_reason
            }
        )
        
        # Create special notification for vendor
        vendor_notification_type = 'dispute' # Use 'dispute' as per preference map
        vendor_notification_title = 'Dispute Resolved'
        if winning_party == 'buyer':
            vendor_notification_title = '⚠️ Dispute Lost - Action Required'
        
        send_user_notification(
            user=dispute.vendor,
            notification_type=vendor_notification_type,
            title=vendor_notification_title,
            message=vendor_message,
            data={
                'dispute_id': str(dispute.id), 
                'resolution': resolution,
                'winning_party': winning_party,
                'resolution_reason': resolution_reason,
                'order_id': order.order_id if hasattr(order, 'order_id') else None,
                'refund_amount': str(refund_amount) if refund_amount else None,
                'crypto_currency': order.crypto_currency if hasattr(order, 'crypto_currency') else 'BTC',
                'is_escrow': is_escrow_order
            }
        )
        
        # Trigger count refresh for all relevant users (already handled by send_user_notification)
        logger.info(f"Dispute {dispute.id} resolution notifications sent to both parties")
        
        return Response({
            'success': True,
            'message': 'Dispute resolved successfully',
            'data': DisputeSerializer(dispute).data
        })
        
    except Exception as e:
        logger.error(f"Error resolving dispute: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to resolve dispute',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dispute_statistics(request):
    """Get dispute statistics based on user role"""
    try:
        if is_admin_user(request.user):
            # Admin can see all dispute statistics
            stats = {
                'total_disputes': Dispute.objects.count(),
                'open_disputes': Dispute.objects.filter(status='open').count(),
                'in_progress_disputes': Dispute.objects.filter(status='in_progress').count(),
                'resolved_disputes': Dispute.objects.filter(status='resolved').count(),
                'closed_disputes': Dispute.objects.filter(status='closed').count(),
                'urgent_disputes': Dispute.objects.filter(priority='urgent').count(),
                'high_priority_disputes': Dispute.objects.filter(priority='high').count(),
                'disputes_by_category': dict(
                    Dispute.objects.values('category').annotate(count=Count('id')).values_list('category', 'count')
                ),
                'disputes_by_status': dict(
                    Dispute.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
                )
            }
        else:
            # Get user-specific dispute statistics
            if is_vendor_user(request.user):
                # Vendor statistics
                user_disputes = Dispute.objects.filter(vendor=request.user)
            else:
                # Buyer statistics
                user_disputes = Dispute.objects.filter(buyer=request.user)
            
            # Calculate win/loss statistics for resolved disputes
            resolved_disputes = user_disputes.filter(status='resolved')
            won_disputes = resolved_disputes.filter(
                Q(winning_party='buyer', buyer=request.user) | 
                Q(winning_party='vendor', vendor=request.user)
            ).count()
            lost_disputes = resolved_disputes.filter(
                Q(winning_party='buyer', vendor=request.user) | 
                Q(winning_party='vendor', buyer=request.user)
            ).count()
            neutral_disputes = resolved_disputes.filter(winning_party='neutral').count()
            
            stats = {
                'total_disputes': user_disputes.count(),
                'open_disputes': user_disputes.filter(status='open').count(),
                'in_progress_disputes': user_disputes.filter(status='in_progress').count(),
                'resolved_disputes': resolved_disputes.count(),
                'closed_disputes': user_disputes.filter(status='closed').count(),
                'urgent_disputes': user_disputes.filter(priority='urgent').count(),
                'high_priority_disputes': user_disputes.filter(priority='high').count(),
                'won_disputes': won_disputes,
                'lost_disputes': lost_disputes,
                'neutral_disputes': neutral_disputes,
                'win_rate': round((won_disputes / resolved_disputes.count() * 100) if resolved_disputes.count() > 0 else 0, 1),
                'disputes_by_category': dict(
                    user_disputes.values('category').annotate(count=Count('id')).values_list('category', 'count')
                ),
                'disputes_by_status': dict(
                    user_disputes.values('status').annotate(count=Count('id')).values_list('status', 'count')
                )
            }
        
        return Response({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"Error getting dispute statistics: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch dispute statistics',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_dispute(request, dispute_id):
    """Allow buyer to manually close a dispute if resolved"""
    try:
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        # Only buyer can close their own dispute
        if dispute.buyer != request.user:
            return Response({
                'success': False,
                'message': 'Only the buyer can close this dispute'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Can only close open or in_progress disputes
        if dispute.status not in ['open', 'in_progress']:
            return Response({
                'success': False,
                'message': 'This dispute cannot be closed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Close the dispute
        dispute.status = 'closed'
        dispute.resolution = 'dispute_dismissed'
        dispute.resolution_reason = 'Buyer manually closed the dispute (Issue Resolved)'
        dispute.resolved_at = timezone.now()
        dispute.save()
        
        # Create timeline entry
        DisputeTimeline.objects.create(
            dispute=dispute,
            action='Dispute Closed',
            description=f"Buyer {request.user.username} manually closed the dispute. Issue marked as resolved.",
            user=request.user
        )
        
        # Notify Vendor
        from shared.admin_notifications import send_user_notification
        send_user_notification(
            user=dispute.vendor,
            notification_type='dispute',
            title='Dispute Closed by Buyer',
            message=f"Dispute {dispute.dispute_id} has been closed by the buyer. The issue is resolved.",
            data={'dispute_id': str(dispute.id), 'order_id': str(dispute.order.id)}
        )
        
        # Notify Admin
        try:
            from shared.admin_notifications import send_admin_notification
            send_admin_notification(
                notification_type='dispute',
                title='Dispute Closed by Buyer',
                message=f"Dispute {dispute.dispute_id} closed by buyer {request.user.username}.",
                data={'dispute_id': str(dispute.id)},
                priority='medium'
            )
        except Exception:
            pass

        return Response({
            'success': True,
            'message': 'Dispute closed successfully',
            'data': DisputeSerializer(dispute).data
        })
        
    except Exception as e:
        logger.error(f"Error closing dispute: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to close dispute',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
