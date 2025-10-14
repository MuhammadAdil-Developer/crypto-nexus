from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from decimal import Decimal
import json
import logging
from django.utils import timezone

from .services import PaymentService, EscrowService, PayoutService
from .mock_services import get_payment_service
from .models import PaymentAddress, EscrowPayment, Payout, DirectPayment
from .direct_payment_monitor import direct_payment_monitor
from shared.models import CryptoCurrency

logger = logging.getLogger(__name__)


class CreatePaymentAddressView(APIView):
    """API for creating payment addresses"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data
            
            # Validate required fields
            required_fields = ['order_id', 'crypto_currency', 'amount']
            for field in required_fields:
                if field not in data:
                    return Response(
                        {'error': f'{field} is required'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            order_id = data['order_id']
            crypto_currency = data['crypto_currency']
            amount = Decimal(str(data['amount']))
            payment_type = data.get('payment_type', 'wallet')
            use_escrow = data.get('use_escrow', False)
            
            # Validate and ensure crypto currency exists
            try:
                crypto_currency_obj = CryptoCurrency.objects.get(symbol=crypto_currency)
            except CryptoCurrency.DoesNotExist:
                # Create the cryptocurrency record if it doesn't exist
                if crypto_currency == 'BTC':
                    crypto_currency_obj = CryptoCurrency.objects.create(
                        name='Bitcoin',
                        symbol='BTC',
                        logo_url='https://cryptologos.cc/logos/bitcoin-btc-logo.png',
                        current_price=50000.00,
                        market_cap=1000000000000.00,
                        volume_24h=50000000000.00,
                        price_change_24h=0.00,
                        is_active=True
                    )
                elif crypto_currency == 'XMR':
                    crypto_currency_obj = CryptoCurrency.objects.create(
                        name='Monero',
                        symbol='XMR',
                        logo_url='https://cryptologos.cc/logos/monero-xmr-logo.png',
                        current_price=150.00,
                        market_cap=30000000000.00,
                        volume_24h=500000000.00,
                        price_change_24h=0.00,
                        is_active=True
                    )
                else:
                    return Response(
                        {'error': 'Unsupported cryptocurrency'}, 
                    status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create payment address
            payment_service = PaymentService()
            payment_address = payment_service.create_payment_address(
                order_id=order_id,
                crypto_currency=crypto_currency,
                amount=amount,
                payment_type=payment_type,
                use_escrow=use_escrow
            )
            
            # Prepare response
            response_data = {
                'order_id': payment_address.order_id,
                'payment_address': payment_address.payment_address,
                'expected_amount': str(payment_address.expected_amount),
                'crypto_currency': payment_address.crypto_currency.symbol,
                'payment_type': payment_address.payment_type,
                'status': payment_address.status,
                'expires_at': payment_address.expires_at.isoformat(),
                'required_confirmations': payment_address.required_confirmations
            }
            
            # Add BTCPay specific fields
            if payment_address.btcpay_invoice_id:
                response_data['btcpay_invoice_id'] = payment_address.btcpay_invoice_id
                response_data['btcpay_checkout_link'] = payment_address.btcpay_checkout_link
            
            # Add Monero specific fields
            if payment_address.monero_subaddress_index:
                response_data['monero_subaddress_index'] = payment_address.monero_subaddress_index
            
            # Add escrow info
            if hasattr(payment_address, 'escrow'):
                response_data['escrow'] = {
                    'enabled': True,
                    'status': payment_address.escrow.status,
                    'escrow_amount': str(payment_address.escrow.escrow_amount),
                    'escrow_fee': str(payment_address.escrow.escrow_fee),
                    'auto_release_days': payment_address.escrow.auto_release_days
                }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Payment address creation error: {str(e)}")
            return Response(
                {'error': 'Failed to create payment address'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentStatusView(APIView):
    """API for checking payment status"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, order_id):
        try:
            payment_service = PaymentService()
            status_data = payment_service.check_payment_status(order_id)
            
            if 'error' in status_data:
                return Response(status_data, status=status.HTTP_404_NOT_FOUND)
            
            return Response(status_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Payment status check error: {str(e)}")
            return Response(
                {'error': 'Failed to check payment status'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, order_id):
        """Manual payment confirmation for testing"""
        try:
            from orders.models import Order, OrderStatus
            
            # Get the order
            order = Order.objects.get(order_id=order_id)
            
            # Update order status to PAID (not PROCESSING)
            order.order_status = OrderStatus.PAID.value
            order.payment_status = 'paid'
            order.payment_confirmed_at = timezone.now()
            order.save()
            
            # Update payment address status (if it exists)
            payment_service = PaymentService()
            payment_address = payment_service.get_payment_address(order_id)
            if payment_address:
                payment_address.status = 'paid'
                payment_address.confirmed_at = timezone.now()
                payment_address.save()
                logger.info(f"Payment address status updated for order {order_id}")
            else:
                logger.warning(f"No payment address found for order {order_id}, but order status updated")
            
            logger.info(f"Order {order_id} manually confirmed as paid")
            
            # Schedule review prompt for buyer
            try:
                from orders.tasks import send_review_prompt_task
                send_review_prompt_task.apply_async(
                    args=[order.buyer.id, order.product.id, order.order_id],
                    countdown=60  # 1 minute delay
                )
                logger.info(f"Scheduled review prompt for order {order.order_id} in 3 minutes")
            except Exception as e:
                logger.error(f"Failed to schedule review prompt for order {order.order_id}: {str(e)}")
            
            return Response({
                'message': 'Payment confirmed successfully',
                'order_id': order_id,
                'status': 'paid',
                'order_status': 'paid'
            })
            
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Manual payment confirmation error: {str(e)}")
            return Response(
                {'error': 'Failed to confirm payment'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EscrowActionView(APIView):
    """API for escrow actions (release, dispute)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, order_id):
        try:
            action = request.data.get('action')
            
            if action == 'release':
                payment_service = PaymentService()
                success = payment_service.release_escrow(
                    order_id=order_id,
                    released_by_user_id=request.user.id
                )
                
                if success:
                    return Response({'message': 'Escrow released successfully'})
                else:
                    return Response(
                        {'error': 'Failed to release escrow'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            elif action == 'dispute':
                reason = request.data.get('reason', '')
                escrow_service = EscrowService()
                success = escrow_service.dispute_escrow(order_id, reason)
                
                if success:
                    return Response({'message': 'Escrow disputed successfully'})
                else:
                    return Response(
                        {'error': 'Failed to dispute escrow'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            else:
                return Response(
                    {'error': 'Invalid action'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Escrow action error: {str(e)}")
            return Response(
                {'error': 'Failed to process escrow action'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class BTCPayWebhookView(APIView):
    """Webhook endpoint for BTCPay Server"""
    authentication_classes = []
    permission_classes = []
    
    def get(self, request):
        """Handle GET requests (webhook testing from BTCPay)"""
        logger.info("BTCPay webhook endpoint reached via GET request (webhook test)")
        return Response({
            'status': 'ok',
            'message': 'BTCPay webhook endpoint is working',
            'timestamp': timezone.now().isoformat()
        })
    
    def post(self, request):
        try:
            # Get webhook signature
            signature = request.headers.get('BTCPay-Sig')
            if not signature:
                return Response({'error': 'Missing signature'}, status=400)
            
            # Verify webhook signature
            payment_service = PaymentService()
            payload = request.body.decode('utf-8')
            
            if not payment_service.btcpay.verify_webhook(payload, signature):
                logger.warning("Invalid BTCPay webhook signature")
                return Response({'error': 'Invalid signature'}, status=401)
            
            logger.info(f"BTCPay webhook received and verified with signature: {signature}")
            
            # Process webhook
            webhook_data = json.loads(payload)
            success = payment_service.process_payment_webhook('btcpay', webhook_data)
            
            if success:
                return Response({'status': 'success'})
            else:
                return Response({'error': 'Processing failed'}, status=500)
                
        except Exception as e:
            logger.error(f"BTCPay webhook error: {str(e)}")
            return Response({'error': 'Internal error'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class MoneroWebhookView(APIView):
    """Webhook endpoint for Monero notifications"""
    authentication_classes = []
    permission_classes = []
    
    def post(self, request):
        try:
            webhook_data = request.data
            payment_service = PaymentService()
            success = payment_service.process_payment_webhook('monero', webhook_data)
            
            if success:
                return Response({'status': 'success'})
            else:
                return Response({'error': 'Processing failed'}, status=500)
                
        except Exception as e:
            logger.error(f"Monero webhook error: {str(e)}")
            return Response({'error': 'Internal error'}, status=500)


class SupportedCurrenciesView(APIView):
    """API for getting supported cryptocurrencies"""
    
    def get(self, request):
        try:
            currencies = CryptoCurrency.objects.filter(is_active=True).values(
                'symbol', 'name', 'decimals', 'network'
            )
            
            return Response({
                'supported_currencies': list(currencies)
            })
            
        except Exception as e:
            logger.error(f"Supported currencies error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch supported currencies'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminEscrowView(APIView):
    """Admin API for escrow management"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all escrow payments with filtering"""
        try:
            escrow_status = request.query_params.get('status')
            
            escrows = EscrowPayment.objects.select_related(
                'payment_address', 'buyer', 'vendor'
            ).all()
            
            if escrow_status:
                escrows = escrows.filter(status=escrow_status)
            
            escrow_data = []
            for escrow in escrows:
                escrow_data.append({
                    'id': escrow.id,
                    'order_id': escrow.payment_address.order_id,
                    'buyer': escrow.buyer.username,
                    'vendor': escrow.vendor.username,
                    'escrow_amount': str(escrow.escrow_amount),
                    'escrow_fee': str(escrow.escrow_fee),
                    'status': escrow.status,
                    'created_at': escrow.created_at.isoformat(),
                    'auto_release_at': escrow.auto_release_at.isoformat() if escrow.auto_release_at else None,
                    'dispute_reason': escrow.dispute_reason
                })
            
            return Response({
                'escrows': escrow_data,
                'total': len(escrow_data)
            })
            
        except Exception as e:
            logger.error(f"Admin escrow view error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch escrow data'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request, escrow_id):
        """Admin escrow actions"""
        try:
            action = request.data.get('action')
            admin_notes = request.data.get('admin_notes', '')
            
            escrow = EscrowPayment.objects.get(id=escrow_id)
            
            if action == 'release':
                escrow.status = 'released'
                escrow.released_at = timezone.now()
                escrow.released_by = request.user
                escrow.admin_notes = admin_notes
                escrow.save()
                
                return Response({'message': 'Escrow released by admin'})
                
            elif action == 'refund':
                escrow.status = 'refunded'
                escrow.released_at = timezone.now()
                escrow.released_by = request.user
                escrow.admin_notes = admin_notes
                escrow.save()
                
                return Response({'message': 'Escrow refunded by admin'})
                
            else:
                return Response(
                    {'error': 'Invalid action'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except EscrowPayment.DoesNotExist:
            return Response(
                {'error': 'Escrow not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Admin escrow action error: {str(e)}")
            return Response(
                {'error': 'Failed to process admin action'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentAnalyticsView(APIView):
    """API for payment analytics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get payment statistics
            total_payments = PaymentAddress.objects.count()
            successful_payments = PaymentAddress.objects.filter(status='paid').count()
            pending_payments = PaymentAddress.objects.filter(status='pending').count()
            
            # Get escrow statistics
            total_escrows = EscrowPayment.objects.count()
            active_escrows = EscrowPayment.objects.filter(status='funded').count()
            disputed_escrows = EscrowPayment.objects.filter(status='disputed').count()
            
            # Calculate success rate
            success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 0
            
            analytics_data = {
                'payments': {
                    'total': total_payments,
                    'successful': successful_payments,
                    'pending': pending_payments,
                    'success_rate': round(success_rate, 2)
                },
                'escrows': {
                    'total': total_escrows,
                    'active': active_escrows,
                    'disputed': disputed_escrows
                }
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            logger.error(f"Payment analytics error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch analytics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 


class AdminPayoutView(APIView):
    """Admin API for managing payouts"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all payouts with filtering"""
        try:
            from .models import Payout, DirectPayment
            
            # Get query parameters
            payout_type = request.query_params.get('type', 'all')  # escrow, direct, all
            status_filter = request.query_params.get('status', 'all')
            search = request.query_params.get('search', '')
            
            # Build queryset
            if payout_type == 'escrow':
                queryset = Payout.objects.select_related(
                    'order', 'vendor', 'buyer', 'crypto_currency'
                ).filter(payout_type='escrow')
            elif payout_type == 'direct':
                queryset = DirectPayment.objects.select_related(
                    'order', 'vendor', 'buyer', 'crypto_currency'
                )
            else:
                # Get both types
                payouts = Payout.objects.select_related(
                    'order', 'vendor', 'buyer', 'crypto_currency'
                )
                direct_payments = DirectPayment.objects.select_related(
                    'order', 'vendor', 'buyer', 'crypto_currency'
                )
                
                # Combine and format data
                payout_data = []
                
                for payout in payouts:
                    # Calculate commission percentages
                    platform_fee_rate = 0
                    escrow_fee_rate = 0
                    if payout.gross_amount > 0:
                        platform_fee_rate = (payout.platform_fee / payout.gross_amount) * 100
                        escrow_fee_rate = (payout.escrow_fee / payout.gross_amount) * 100
                    
                    payout_data.append({
                        'id': payout.id,
                        'type': 'escrow',
                        'order_id': payout.order.order_id,
                        'vendor_name': payout.vendor.username,
                        'buyer_name': payout.buyer.username,
                        'crypto_currency': payout.crypto_currency.symbol,
                        'amount': str(payout.net_amount),
                        'gross_amount': str(payout.gross_amount),
                        'platform_fee': str(payout.platform_fee),
                        'escrow_fee': str(payout.escrow_fee),
                        'platform_fee_rate': round(platform_fee_rate, 2),  # Add percentage
                        'escrow_fee_rate': round(escrow_fee_rate, 2),      # Add percentage
                        'vendor_address': payout.vendor_address,
                        'transaction_hash': payout.transaction_hash,
                        'status': payout.status,
                        'payment_status': payout.order.payment_status,  # Add payment status
                        'order_status': payout.order.order_status,      # Add order status
                        'requested_at': payout.requested_at,
                        'processed_at': payout.processed_at,
                        'completed_at': payout.completed_at,
                        'auto_release_at': payout.auto_release_at,
                    })
                
                for direct in direct_payments:
                    payout_data.append({
                        'id': direct.id,
                        'type': 'direct',
                        'order_id': direct.order.order_id,
                        'vendor_name': direct.vendor.username,
                        'buyer_name': direct.buyer.username,
                        'crypto_currency': direct.crypto_currency.symbol,
                        'amount': str(direct.amount),
                        'vendor_address': direct.vendor_address,
                        'transaction_hash': direct.transaction_hash,
                        'status': direct.status,
                        'payment_status': direct.order.payment_status,  # Add payment status
                        'order_status': direct.order.order_status,      # Add order status
                        'created_at': direct.created_at,
                        'confirmed_at': direct.confirmed_at,
                        'expires_at': direct.expires_at,
                    })
                
                return Response({
                    'success': True,
                    'data': payout_data
                })
            
            # Apply status filter
            if status_filter != 'all':
                if payout_type == 'escrow':
                    queryset = queryset.filter(status=status_filter)
                else:
                    queryset = queryset.filter(status=status_filter)
            
            # Apply search filter
            if search:
                if payout_type == 'escrow':
                    queryset = queryset.filter(
                        Q(vendor__username__icontains=search) |
                        Q(order__order_id__icontains=search)
                    )
                else:
                    queryset = queryset.filter(
                        Q(vendor__username__icontains=search) |
                        Q(order__order_id__icontains=search)
                    )
            
            # Format data based on type
            if payout_type == 'escrow':
                data = []
                for payout in queryset:
                    data.append({
                        'id': payout.id,
                        'type': 'escrow',
                        'order_id': payout.order.order_id,
                        'vendor_name': payout.vendor.username,
                        'buyer_name': payout.buyer.username,
                        'crypto_currency': payout.crypto_currency.symbol,
                        'amount': str(payout.net_amount),
                        'gross_amount': str(payout.gross_amount),
                        'platform_fee': str(payout.platform_fee),
                        'escrow_fee': str(payout.escrow_fee),
                        'vendor_address': payout.vendor_address,
                        'transaction_hash': payout.transaction_hash,
                        'status': payout.status,
                        'requested_at': payout.requested_at,
                        'processed_at': payout.processed_at,
                        'completed_at': payout.completed_at,
                        'auto_release_at': payout.auto_release_at,
                    })
            else:
                data = []
                for direct in queryset:
                    data.append({
                        'id': direct.id,
                        'type': 'direct',
                        'order_id': direct.order.order_id,
                        'vendor_name': direct.vendor.username,
                        'buyer_name': direct.buyer.username,
                        'crypto_currency': direct.crypto_currency.symbol,
                        'amount': str(direct.amount),
                        'vendor_address': direct.vendor_address,
                        'transaction_hash': direct.transaction_hash,
                        'status': direct.status,
                        'created_at': direct.created_at,
                        'confirmed_at': direct.confirmed_at,
                        'expires_at': direct.expires_at,
                    })
            
            return Response({
                'success': True,
                'data': data
            })
            
        except Exception as e:
            logger.error(f"Admin payout list error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch payouts'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Process payout action (release, cancel, etc.)"""
        try:
            payout_id = request.data.get('payout_id')
            action = request.data.get('action')  # release, cancel
            notes = request.data.get('notes', '')
            
            if not payout_id or not action:
                return Response(
                    {'error': 'Missing required fields'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            payout_service = PayoutService()
            
            if action == 'release':
                success = payout_service.process_escrow_payout(payout_id, request.user)
                if success:
                    return Response({
                        'success': True,
                        'message': 'Payout released successfully'
                    })
                else:
                    return Response(
                        {'error': 'Failed to release payout. Check logs for details.'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            elif action == 'cancel':
                # Cancel payout logic
                from .models import Payout
                payout = Payout.objects.get(id=payout_id)
                payout.status = 'cancelled'
                payout.admin_notes = notes
                payout.save()
                
                return Response({
                    'success': True,
                    'message': 'Payout cancelled'
                })
            
            else:
                return Response(
                    {'error': 'Invalid action'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Admin payout action error: {str(e)}")
            return Response(
                {'error': 'Failed to process payout action'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PayoutStatsView(APIView):
    """API for payout statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get payout statistics"""
        try:
            from .models import Payout, DirectPayment
            from django.db.models import Sum, Count
            
            # Escrow payout stats
            escrow_stats = Payout.objects.aggregate(
                total_pending=Count('id', filter=Q(status='pending')),
                total_processing=Count('id', filter=Q(status='processing')),
                total_completed=Count('id', filter=Q(status='completed')),
                total_failed=Count('id', filter=Q(status='failed')),
                total_amount_pending=Sum('net_amount', filter=Q(status='pending')),
                total_amount_completed=Sum('net_amount', filter=Q(status='completed')),
            )
            
            # Direct payment stats
            direct_stats = DirectPayment.objects.aggregate(
                total_pending=Count('id', filter=Q(status='pending')),
                total_confirmed=Count('id', filter=Q(status='confirmed')),
                total_failed=Count('id', filter=Q(status='failed')),
                total_expired=Count('id', filter=Q(status='expired')),
                total_amount_confirmed=Sum('amount', filter=Q(status='confirmed')),
            )
            
            return Response({
                'success': True,
                'data': {
                    'escrow': escrow_stats,
                    'direct': direct_stats,
                }
            })
            
        except Exception as e:
            logger.error(f"Payout stats error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch payout stats'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CreateEscrowPayoutView(APIView):
    """API for manually creating escrow payouts (for testing)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create escrow payout for a specific order"""
        try:
            order_id = request.data.get('order_id')
            if not order_id:
                return Response(
                    {'error': 'order_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from payments.services import PayoutService
            from payments.tasks import create_escrow_payout
            
            # Create escrow payout asynchronously
            task = create_escrow_payout.apply_async(args=[order_id])
            
            return Response({
                'success': True,
                'message': f'Escrow payout creation queued for order {order_id}',
                'task_id': task.id
            })
            
        except Exception as e:
            logger.error(f"Create escrow payout error: {str(e)}")
            return Response(
                {'error': 'Failed to create escrow payout'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VendorPayoutsView(APIView):
    """API view for vendor to view their payouts and earnings"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get vendor's payouts and pending earnings"""
        try:
            vendor = request.user
            
            # Get all payouts for this vendor
            payouts = Payout.objects.filter(vendor=vendor).order_by('-created_at')
            direct_payments = DirectPayment.objects.filter(vendor=vendor).order_by('-created_at')
            
            # Convert to API format
            payout_data = []
            
            # Process escrow payouts
            for payout in payouts:
                # Calculate commission percentages
                platform_fee_rate = 0
                escrow_fee_rate = 0
                if payout.gross_amount > 0:
                    platform_fee_rate = (payout.platform_fee / payout.gross_amount) * 100
                    escrow_fee_rate = (payout.escrow_fee / payout.gross_amount) * 100
                
                payout_data.append({
                    'id': str(payout.id),
                    'amount': f"{payout.net_amount} {payout.crypto_currency.symbol}",
                    'usdAmount': f"${payout.net_amount * 40000:.2f}",  # Mock USD conversion
                    'address': payout.vendor_address,
                    'method': payout.crypto_currency.symbol,
                    'status': payout.status.title(),
                    'date': payout.created_at.strftime('%Y-%m-%d'),
                    'txHash': payout.transaction_hash,
                    'order_id': payout.order.order_id,
                    'type': 'escrow',
                    'gross_amount': str(payout.gross_amount),
                    'platform_fee': str(payout.platform_fee),
                    'escrow_fee': str(payout.escrow_fee),
                    'platform_fee_rate': round(platform_fee_rate, 2),
                    'escrow_fee_rate': round(escrow_fee_rate, 2),
                })
            
            # Process direct payments
            for payment in direct_payments:
                payout_data.append({
                    'id': str(payment.id),
                    'amount': f"{payment.amount} {payment.crypto_currency.symbol}",
                    'usdAmount': f"${payment.amount * 40000:.2f}",  # Mock USD conversion
                    'address': payment.vendor_address,
                    'method': payment.crypto_currency.symbol,
                    'status': payment.status.title(),
                    'date': payment.created_at.strftime('%Y-%m-%d'),
                    'txHash': payment.transaction_hash,
                    'order_id': payment.order.order_id,
                    'type': 'direct'
                })
            
            # Calculate pending earnings
            pending_btc = Decimal('0')
            pending_xmr = Decimal('0')
            btc_orders = 0
            xmr_orders = 0
            
            # Get pending escrow payouts
            pending_escrow = Payout.objects.filter(
                vendor=vendor,
                status__in=['pending', 'ready']
            )
            
            for payout in pending_escrow:
                if payout.crypto_currency.symbol == 'BTC':
                    pending_btc += payout.net_amount
                    btc_orders += 1
                elif payout.crypto_currency.symbol == 'XMR':
                    pending_xmr += payout.net_amount
                    xmr_orders += 1
            
            # Get pending direct payments
            pending_direct = DirectPayment.objects.filter(
                vendor=vendor,
                status='pending'
            )
            
            for payment in pending_direct:
                if payment.crypto_currency.symbol == 'BTC':
                    pending_btc += payment.amount
                    btc_orders += 1
                elif payment.crypto_currency.symbol == 'XMR':
                    pending_xmr += payment.amount
                    xmr_orders += 1
            
            # Calculate total USD value
            btc_usd = float(pending_btc) * 40000  # Mock BTC price
            xmr_usd = float(pending_xmr) * 2000   # Mock XMR price
            total_usd = btc_usd + xmr_usd
            
            pending_earnings = {
                'btc': {
                    'amount': str(pending_btc),
                    'usd': f"${btc_usd:.2f}",
                    'orders': btc_orders
                },
                'xmr': {
                    'amount': str(pending_xmr),
                    'usd': f"${xmr_usd:.2f}",
                    'orders': xmr_orders
                },
                'total': {
                    'usd': f"${total_usd:.2f}",
                    'orders': btc_orders + xmr_orders
                }
            }
            
            return Response({
                'success': True,
                'data': payout_data,
                'pending_earnings': pending_earnings
            })
            
        except Exception as e:
            logger.error(f"Vendor payouts error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch vendor payouts'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TransactionHistoryView(APIView):
    """API view for comprehensive transaction history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all transaction history for admin view"""
        try:
            # Get all transactions from different sources
            transactions = []
            
            # Get all payouts (escrow and direct)
            payouts = Payout.objects.all().order_by('-created_at')
            direct_payments = DirectPayment.objects.all().order_by('-created_at')
            
            # Process escrow payouts
            for payout in payouts:
                transactions.append({
                    'id': str(payout.id),
                    'type': 'escrow_payout',
                    'description': f'Escrow payout to {payout.vendor.username}',
                    'amount': f"{payout.net_amount} {payout.crypto_currency.symbol}",
                    'usd_amount': f"${float(payout.net_amount) * 40000:.2f}",
                    'from_address': 'Admin Wallet',
                    'to_address': payout.vendor_address,
                    'transaction_hash': payout.transaction_hash,
                    'status': payout.status,
                    'timestamp': payout.created_at,
                    'order_id': payout.order.order_id,
                    'vendor_name': payout.vendor.username,
                    'buyer_name': payout.buyer.username,
                    'crypto_symbol': payout.crypto_currency.symbol,
                    'fee': f"{payout.platform_fee} {payout.crypto_currency.symbol}"
                })
            
            # Process direct payments
            for payment in direct_payments:
                transactions.append({
                    'id': str(payment.id),
                    'type': 'direct_payment',
                    'description': f'Direct payment from {payment.buyer.username} to {payment.vendor.username}',
                    'amount': f"{payment.amount} {payment.crypto_currency.symbol}",
                    'usd_amount': f"${float(payment.amount) * 40000:.2f}",
                    'from_address': 'Buyer Wallet',
                    'to_address': payment.vendor_address,
                    'transaction_hash': payment.transaction_hash,
                    'status': payment.status,
                    'timestamp': payment.created_at,
                    'order_id': payment.order.order_id,
                    'vendor_name': payment.vendor.username,
                    'buyer_name': payment.buyer.username,
                    'crypto_symbol': payment.crypto_currency.symbol,
                    'fee': '0.00000000'
                })
            
            # Get payment addresses (incoming payments)
            payment_addresses = PaymentAddress.objects.filter(
                status__in=['paid', 'overpaid']
            ).order_by('-confirmed_at')
            
            for payment_addr in payment_addresses:
                transactions.append({
                    'id': f"payment_{payment_addr.id}",
                    'type': 'incoming_payment',
                    'description': f'Payment received for order {payment_addr.order_id}',
                    'amount': f"{payment_addr.received_amount} {payment_addr.crypto_currency.symbol}",
                    'usd_amount': f"${float(payment_addr.received_amount) * 40000:.2f}",
                    'from_address': 'External',
                    'to_address': payment_addr.payment_address,
                    'transaction_hash': payment_addr.transaction_hash,
                    'status': 'confirmed',
                    'timestamp': payment_addr.confirmed_at or payment_addr.created_at,
                    'order_id': payment_addr.order_id,
                    'vendor_name': 'N/A',
                    'buyer_name': 'N/A',
                    'crypto_symbol': payment_addr.crypto_currency.symbol,
                    'fee': '0.00000000'
                })
            
            # Sort by timestamp (newest first)
            transactions.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return Response({
                'success': True,
                'data': transactions,
                'total': len(transactions)
            })
            
        except Exception as e:
            logger.error(f"Transaction history error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch transaction history'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BuyerTransactionHistoryView(APIView):
    """API view for buyer's transaction history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get buyer's transaction history"""
        try:
            buyer = request.user
            transactions = []
            
            # Get buyer's orders and related payments
            from orders.models import Order
            orders = Order.objects.filter(buyer=buyer).order_by('-created_at')
            
            for order in orders:
                # Add order payment transactions
                if order.payment_address:
                    # Get the actual PaymentAddress object
                    try:
                        from payments.models import PaymentAddress
                        payment_addr = PaymentAddress.objects.get(order_id=order.order_id)
                        
                        transactions.append({
                            'id': f"order_payment_{order.id}",
                            'type': 'payment',
                            'description': f'Payment for order {order.order_id}',
                            'amount': f"{payment_addr.received_amount} {payment_addr.crypto_currency.symbol}",
                            'usd_amount': f"${float(payment_addr.received_amount) * 40000:.2f}",
                            'from_address': 'Your Wallet',
                            'to_address': payment_addr.payment_address,
                            'transaction_hash': payment_addr.transaction_hash,
                            'status': payment_addr.status,
                            'timestamp': payment_addr.confirmed_at or order.created_at,
                            'order_id': order.order_id,
                            'vendor_name': order.product.vendor.username,
                            'crypto_symbol': payment_addr.crypto_currency.symbol
                        })
                    except PaymentAddress.DoesNotExist:
                        # Skip if no payment address found
                        continue
                
                # Add escrow release transactions if buyer confirmed
                if order.use_escrow and order.order_status in ['confirmed', 'completed']:
                    payouts = Payout.objects.filter(order=order)
                    for payout in payouts:
                        transactions.append({
                            'id': f"escrow_release_{payout.id}",
                            'type': 'escrow_release',
                            'description': f'Escrow released for order {order.order_id}',
                            'amount': f"{payout.net_amount} {payout.crypto_currency.symbol}",
                            'usd_amount': f"${float(payout.net_amount) * 40000:.2f}",
                            'from_address': 'Admin Escrow',
                            'to_address': payout.vendor_address,
                            'transaction_hash': payout.transaction_hash,
                            'status': payout.status,
                            'timestamp': payout.processed_at or payout.created_at,
                            'order_id': order.order_id,
                            'vendor_name': payout.vendor.username,
                            'crypto_symbol': payout.crypto_currency.symbol
                        })
            
            # Sort by timestamp (newest first)
            transactions.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return Response({
                'success': True,
                'data': transactions,
                'total': len(transactions)
            })
            
        except Exception as e:
            logger.error(f"Buyer transaction history error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch buyer transaction history'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VendorTransactionHistoryView(APIView):
    """API view for vendor's transaction history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get vendor's transaction history"""
        try:
            vendor = request.user
            transactions = []
            
            # Get vendor's payouts
            payouts = Payout.objects.filter(vendor=vendor).order_by('-created_at')
            for payout in payouts:
                transactions.append({
                    'id': f"payout_{payout.id}",
                    'type': 'payout',
                    'description': f'Payout received for order {payout.order.order_id}',
                    'amount': f"{payout.net_amount} {payout.crypto_currency.symbol}",
                    'usd_amount': f"${float(payout.net_amount) * 40000:.2f}",
                    'from_address': 'Admin Wallet' if payout.payout_type == 'escrow' else 'Buyer Wallet',
                    'to_address': payout.vendor_address,
                    'transaction_hash': payout.transaction_hash,
                    'status': payout.status,
                    'timestamp': payout.processed_at or payout.created_at,
                    'order_id': payout.order.order_id,
                    'buyer_name': payout.buyer.username,
                    'crypto_symbol': payout.crypto_currency.symbol,
                    'payout_type': payout.payout_type
                })
            
            # Get vendor's direct payments
            direct_payments = DirectPayment.objects.filter(vendor=vendor).order_by('-created_at')
            for payment in direct_payments:
                transactions.append({
                    'id': f"direct_{payment.id}",
                    'type': 'direct_payment',
                    'description': f'Direct payment from buyer for order {payment.order.order_id}',
                    'amount': f"{payment.amount} {payment.crypto_currency.symbol}",
                    'usd_amount': f"${float(payment.amount) * 40000:.2f}",
                    'from_address': 'Buyer Wallet',
                    'to_address': payment.vendor_address,
                    'transaction_hash': payment.transaction_hash,
                    'status': payment.status,
                    'timestamp': payment.created_at,
                    'order_id': payment.order.order_id,
                    'buyer_name': payment.buyer.username,
                    'crypto_symbol': payment.crypto_currency.symbol,
                    'payout_type': 'direct'
                })
            
            # Sort by timestamp (newest first)
            transactions.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return Response({
                'success': True,
                'data': transactions,
                'total': len(transactions)
            })
            
        except Exception as e:
            logger.error(f"Vendor transaction history error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch vendor transaction history'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DirectPaymentMonitorView(APIView):
    """API view for direct payment monitoring and testing"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """Simulate payment detection for testing"""
        try:
            payment_id = request.data.get('payment_id')
            transaction_hash = request.data.get('transaction_hash')
            
            if not payment_id:
                return Response(
                    {'error': 'payment_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Simulate payment detection
            success = direct_payment_monitor.simulate_payment_detection(payment_id, transaction_hash)
            
            if success:
                return Response({
                    'success': True,
                    'message': f'Payment {payment_id} marked as confirmed',
                    'payment_id': payment_id,
                    'transaction_hash': transaction_hash
                })
            else:
                return Response(
                    {'error': f'Failed to simulate payment detection for {payment_id}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Direct payment monitor error: {str(e)}")
            return Response(
                {'error': 'Failed to simulate payment detection'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request):
        """Get direct payment monitoring statistics"""
        try:
            stats = direct_payment_monitor.get_direct_payment_stats()
            
            return Response({
                'success': True,
                'data': stats
            })
            
        except Exception as e:
            logger.error(f"Direct payment stats error: {str(e)}")
            return Response(
                {'error': 'Failed to fetch direct payment statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )