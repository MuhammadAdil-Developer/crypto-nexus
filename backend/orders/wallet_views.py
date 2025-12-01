"""
Wallet Views
Handles wallet balance, transactions, and withdrawals (on-chain)
"""
import logging
from decimal import Decimal

from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from shared.models import UserWallet, WalletTransaction
from shared.utils import log_user_activity
from payments.services import PaymentService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_balance(request):
    """Get user's wallet balance"""
    try:
        try:
            wallet, created = UserWallet.objects.get_or_create(user=request.user)
        except Exception as e:
            logger.warning(f"UserWallet table not available: {str(e)}")
            # Return zero balance if wallet table doesn't exist
            return Response({
                'success': True,
                'wallet': {
                    'balance_btc': '0',
                    'balance_xmr': '0',
                    'total_deposited_btc': '0',
                    'total_deposited_xmr': '0',
                    'total_withdrawn_btc': '0',
                    'total_withdrawn_xmr': '0',
                }
            })
        
        return Response({
            'success': True,
            'wallet': {
                'balance_btc': str(wallet.balance_btc),
                'balance_xmr': str(wallet.balance_xmr),
                'total_deposited_btc': str(wallet.total_deposited_btc),
                'total_deposited_xmr': str(wallet.total_deposited_xmr),
                'total_withdrawn_btc': str(wallet.total_withdrawn_btc),
                'total_withdrawn_xmr': str(wallet.total_withdrawn_xmr),
            }
        })
    
    except Exception as e:
        logger.error(f"Get wallet balance error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_transactions(request):
    """Get user's wallet transactions"""
    try:
        try:
            wallet, created = UserWallet.objects.get_or_create(user=request.user)
        except Exception as e:
            logger.warning(f"UserWallet table not available: {str(e)}")
            # Return empty transactions if wallet table doesn't exist
            return Response({
                'success': True,
                'data': [],
                'total': 0,
                'page': 1,
                'page_size': 20
            })
        
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        transaction_type = request.query_params.get('type', None)
        currency = request.query_params.get('currency', None)
        
        transactions = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        
        if transaction_type:
            transactions = transactions.filter(transaction_type=transaction_type)
        
        if currency:
            transactions = transactions.filter(crypto_currency=currency.upper())
        
        total = transactions.count()
        start = (page - 1) * limit
        end = start + limit
        transactions_page = transactions[start:end]
        
        data = []
        for tx in transactions_page:
            data.append({
                'id': str(tx.id),
                'transaction_type': tx.transaction_type,
                'amount': str(tx.amount),
                'crypto_currency': tx.crypto_currency,
                'order_id': tx.order.order_id if tx.order else None,
                'refund_id': str(tx.refund_request.id) if tx.refund_request else None,
                'transaction_hash': tx.transaction_hash,
                'notes': tx.notes,
                'created_at': tx.created_at.isoformat(),
            })
        
        return Response({
            'success': True,
            'data': data,
            'total': total,
            'page': page,
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"Get wallet transactions error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e),
            'data': [],
            'total': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wallet_withdraw(request):
    """
    Withdraw from wallet
    - Validates amount & balance
    - Sends real crypto to the user's address (BTC via BTCPay, XMR via Monero RPC)
    - Debits internal wallet and records WalletTransaction with blockchain tx hash
    """
    try:
        amount = request.data.get('amount')
        currency = request.data.get('currency')
        withdrawal_address = request.data.get('withdrawal_address')
        
        # Validation
        if not amount or not currency:
            return Response({
                'success': False,
                'message': 'amount and currency are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                return Response({
                    'success': False,
                    'message': 'Amount must be greater than 0'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'message': 'Invalid amount format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        currency = currency.upper()
        if currency not in ['BTC', 'XMR']:
            return Response({
                'success': False,
                'message': 'Currency must be BTC or XMR'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use stored payout address if not provided in request
        if not withdrawal_address:
            if currency == 'BTC':
                withdrawal_address = getattr(request.user, 'btc_payout_address', None)
            elif currency == 'XMR':
                withdrawal_address = getattr(request.user, 'xmr_payout_address', None)
        
        if not withdrawal_address:
            return Response({
                'success': False,
                'message': f'No withdrawal address provided. Please set your {currency} payout address in settings or provide withdrawal_address.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create internal wallet
        wallet, created = UserWallet.objects.get_or_create(user=request.user)
        
        # Check internal balance first (safety check before sending on-chain)
        balance = wallet.get_balance(currency)
        if balance < amount_decimal:
            return Response({
                'success': False,
                'message': f'Insufficient balance. Available: {balance} {currency}, Requested: {amount_decimal} {currency}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1) Send crypto out using existing payment services
        payment_service = PaymentService()
        tx_hash = None

        if currency == 'BTC':
            # Use BTCPay Server wallet API to send BTC
            payout_result = payment_service.btcpay.create_payout({
                'destination': withdrawal_address,
                'amount': str(amount_decimal),
            })
            if not payout_result or not payout_result.get('transactionHash'):
                logger.error(f"BTC withdrawal failed for {request.user.username}: {payout_result}")
                return Response({
                    'success': False,
                    'message': 'Failed to send BTC withdrawal. Please try again later or contact support.'
                }, status=status.HTTP_502_BAD_GATEWAY)

            tx_hash = payout_result.get('transactionHash') or payout_result.get('id')

        elif currency == 'XMR':
            # Use Monero RPC wallet to send XMR
            destinations = [{
                'address': withdrawal_address,
                # Monero RPC expects amount in XMR (depends on your RPC config),
                # here we forward the decimal amount directly.
                'amount': float(amount_decimal),
            }]
            monero_result = payment_service.monero.send_transaction(destinations)
            if not monero_result or not monero_result.get('tx_hash'):
                logger.error(f"XMR withdrawal failed for {request.user.username}: {monero_result}")
                return Response({
                    'success': False,
                    'message': 'Failed to send XMR withdrawal. Please try again later or contact support.'
                }, status=status.HTTP_502_BAD_GATEWAY)

            tx_hash = monero_result.get('tx_hash')

        # 2) If on-chain send succeeded, update internal wallet + record transaction
        with transaction.atomic():
            # Re-check balance inside transaction to avoid race conditions
            wallet.refresh_from_db()
            balance = wallet.get_balance(currency)
            if balance < amount_decimal:
                logger.error(f"Balance changed before debit for {request.user.username}. On-chain tx_hash={tx_hash}")
                return Response({
                    'success': False,
                    'message': 'Balance changed while processing withdrawal. Please contact support with your tx hash.'
                }, status=status.HTTP_409_CONFLICT)

            # Debit wallet
            wallet.debit(amount_decimal, currency)
            
            # Create withdrawal transaction with blockchain tx hash
            withdrawal_tx = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type='withdrawal',
                amount=amount_decimal,
                crypto_currency=currency,
                transaction_hash=tx_hash,
                notes=f'Withdrawal to {withdrawal_address}'
            )
            
            # Log activity
            log_user_activity(
                user=request.user,
                activity_type='wallet_withdrawn',
                description=f'Withdrew {amount_decimal} {currency} from wallet',
                metadata={
                    'amount': str(amount_decimal),
                    'currency': currency,
                    'withdrawal_address': withdrawal_address,
                    'transaction_id': str(withdrawal_tx.id),
                    'transaction_hash': tx_hash,
                }
            )
        
        return Response({
            'success': True,
            'message': 'Withdrawal sent successfully',
            'transaction': {
                'id': str(withdrawal_tx.id),
                'amount': str(amount_decimal),
                'currency': currency,
                'status': 'completed',
                'transaction_hash': tx_hash,
                'withdrawal_address': withdrawal_address,
            }
        })
    
    except ValueError as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Wallet withdraw error: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


