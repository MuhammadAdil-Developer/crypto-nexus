from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from decimal import Decimal
import json
import logging
from django.utils import timezone

from .services import PaymentService, EscrowService
from .mock_services import get_payment_service
from .models import PaymentAddress, EscrowPayment
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
            
            # Validate crypto currency
            if not CryptoCurrency.objects.filter(symbol=crypto_currency).exists():
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