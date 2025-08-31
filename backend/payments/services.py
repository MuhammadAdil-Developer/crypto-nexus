import requests
import json
import hashlib
import hmac
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from .models import PaymentAddress, EscrowPayment, PaymentWebhook, BlockchainTransaction
from shared.models import CryptoCurrency
import logging

logger = logging.getLogger(__name__)


class BTCPayServerService:
    """Service for BTCPay Server integration"""
    
    def __init__(self):
        # Updated to use actual BTCPay Server running on localhost:23000
        self.base_url = getattr(settings, 'BTCPAY_SERVER_URL', 'http://localhost:23000')
        self.store_id = getattr(settings, 'BTCPAY_STORE_ID', 'AKwDcGXvXRfKkVD3uTD7cK2Yv3jbnidDhwihfxBGyUN3')  # From your screenshot
        self.api_key = getattr(settings, 'BTCPAY_API_KEY', '')
        self.headers = {
            'Authorization': f'token {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_invoice(self, order_id: str, amount: Decimal, currency: str = 'BTC') -> dict:
        """Create BTCPay invoice"""
        try:
            invoice_data = {
                'storeId': self.store_id,
                'amount': str(amount),
                'currency': currency,
                'orderId': order_id,
                'notificationUrl': f"{settings.SITE_URL}/api/v1/payments/webhooks/btcpay/",
                'redirectUrl': f"{settings.SITE_URL}/orders/{order_id}/",
                'metadata': {
                    'orderId': order_id,
                    'platform': 'CryptoNexus'
                }
            }
            
            # Updated API endpoint for BTCPay Server
            response = requests.post(
                f"{self.base_url}/api/v1/stores/{self.store_id}/invoices",
                headers=self.headers,
                json=invoice_data,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"BTCPay invoice creation failed: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"BTCPay service error: {str(e)}")
            return None
    
    def get_invoice_status(self, invoice_id: str) -> dict:
        """Get invoice status from BTCPay"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/stores/{self.store_id}/invoices/{invoice_id}",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            return None
            
        except Exception as e:
            logger.error(f"BTCPay status check error: {str(e)}")
            return None
    
    def verify_webhook(self, payload: str, signature: str) -> bool:
        """Verify BTCPay webhook signature"""
        try:
            webhook_secret = getattr(settings, 'BTCPAY_WEBHOOK_SECRET', '')
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Webhook verification error: {str(e)}")
            return False


class MoneroRPCService:
    """Service for Monero wallet RPC integration"""
    
    def __init__(self):
        # Updated to use Monero wallet RPC on localhost:18082
        self.rpc_url = getattr(settings, 'MONERO_RPC_URL', 'http://localhost:18082/json_rpc')
        self.rpc_user = getattr(settings, 'MONERO_RPC_USER', '')
        self.rpc_password = getattr(settings, 'MONERO_RPC_PASSWORD', '')
        self.wallet_password = getattr(settings, 'MONERO_WALLET_PASSWORD', '')
        
    def _make_rpc_call(self, method: str, params: dict = None) -> dict:
        """Make RPC call to Monero wallet"""
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": "0",
                "method": method,
                "params": params or {}
            }
            
            auth = None
            if self.rpc_user and self.rpc_password:
                auth = (self.rpc_user, self.rpc_password)
            
            response = requests.post(
                self.rpc_url,
                json=payload,
                auth=auth,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Monero RPC error: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Monero RPC call error: {str(e)}")
            return None
    
    def create_subaddress(self, account_index: int = 0, label: str = "") -> dict:
        """Create new subaddress for payment"""
        result = self._make_rpc_call("create_address", {
            "account_index": account_index,
            "label": label
        })
        
        if result and 'result' in result:
            return {
                'address': result['result']['address'],
                'address_index': result['result']['address_index']
            }
        return None
    
    def get_balance(self, account_index: int = 0) -> dict:
        """Get wallet balance"""
        result = self._make_rpc_call("get_balance", {
            "account_index": account_index
        })
        
        if result and 'result' in result:
            return result['result']
        return None
    
    def get_transfers(self, account_index: int = 0, subaddr_indices: list = None) -> dict:
        """Get incoming transfers"""
        params = {
            "in": True,
            "account_index": account_index
        }
        
        if subaddr_indices:
            params["subaddr_indices"] = subaddr_indices
            
        result = self._make_rpc_call("get_transfers", params)
        
        if result and 'result' in result:
            return result['result']
        return None
    
    def check_payment(self, payment_id: str, amount: int) -> bool:
        """Check if payment has been received"""
        result = self._make_rpc_call("get_payments", {
            "payment_id": payment_id
        })
        
        if result and 'result' in result and 'payments' in result['result']:
            for payment in result['result']['payments']:
                if payment['amount'] >= amount:
                    return True
        return False


class PaymentService:
    """Main payment service orchestrator"""
    
    def __init__(self):
        self.btcpay = BTCPayServerService()
        self.monero = MoneroRPCService()
    
    def create_payment_address(self, order_id: str, crypto_currency: str, 
                             amount: Decimal, payment_type: str = 'wallet',
                             use_escrow: bool = False) -> PaymentAddress:
        """Create payment address for order"""
        try:
            crypto = CryptoCurrency.objects.get(symbol=crypto_currency)
            
            # Create payment address record
            payment_address = PaymentAddress.objects.create(
                order_id=order_id,
                crypto_currency=crypto,
                payment_type=payment_type,
                expected_amount=amount,
                expires_at=timezone.now() + timedelta(hours=2),  # 2 hour expiry
                required_confirmations=1 if crypto_currency == 'XMR' else 3
            )
            
            # Generate address based on cryptocurrency
            if crypto_currency == 'BTC':
                invoice_data = self.btcpay.create_invoice(order_id, amount, 'BTC')
                if invoice_data:
                    payment_address.btcpay_invoice_id = invoice_data['id']
                    payment_address.btcpay_checkout_link = invoice_data['checkoutLink']
                    payment_address.payment_address = invoice_data['addresses']['BTC']
                else:
                    # Fallback to static address generation
                    payment_address.payment_address = self._generate_btc_address(order_id)
                    
            elif crypto_currency == 'XMR':
                subaddress_data = self.monero.create_subaddress(label=f"Order-{order_id}")
                if subaddress_data:
                    payment_address.payment_address = subaddress_data['address']
                    payment_address.monero_subaddress_index = subaddress_data['address_index']
                else:
                    raise Exception("Failed to create Monero subaddress")
            
            payment_address.save()
            
            # Create escrow if requested
            if use_escrow:
                self._create_escrow_payment(payment_address, amount)
            
            return payment_address
            
        except Exception as e:
            logger.error(f"Payment address creation error: {str(e)}")
            raise
    
    def _generate_btc_address(self, order_id: str) -> str:
        """Generate deterministic BTC address (simplified)"""
        # This is a simplified implementation
        # In production, use proper HD wallet derivation
        import hashlib
        seed = f"{settings.SECRET_KEY}{order_id}".encode()
        hash_obj = hashlib.sha256(seed)
        # This would need proper Bitcoin address generation
        return f"bc1q{hash_obj.hexdigest()[:32]}"
    
    def _create_escrow_payment(self, payment_address: PaymentAddress, amount: Decimal):
        """Create escrow payment record"""
        escrow_fee = amount * Decimal('0.02')  # 2% escrow fee
        
        EscrowPayment.objects.create(
            payment_address=payment_address,
            buyer_id=1,  # This should come from the order
            vendor_id=1,  # This should come from the order
            escrow_amount=amount,
            escrow_fee=escrow_fee,
            auto_release_at=timezone.now() + timedelta(days=7)
        )
    
    def process_payment_webhook(self, webhook_type: str, payload: dict) -> bool:
        """Process incoming payment webhook"""
        try:
            if webhook_type == 'btcpay':
                return self._process_btcpay_webhook(payload)
            elif webhook_type == 'monero':
                return self._process_monero_webhook(payload)
            return False
            
        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            return False
    
    def _process_btcpay_webhook(self, payload: dict) -> bool:
        """Process BTCPay Server webhook"""
        try:
            invoice_id = payload.get('invoiceId')
            order_id = payload.get('orderId')
            status = payload.get('status')
            
            payment_address = PaymentAddress.objects.get(
                order_id=order_id,
                btcpay_invoice_id=invoice_id
            )
            
            # Store webhook
            PaymentWebhook.objects.create(
                payment_address=payment_address,
                webhook_type='btcpay',
                external_id=invoice_id,
                raw_data=payload
            )
            
            # Update payment status
            if status == 'Settled':
                payment_address.status = 'paid'
                payment_address.confirmed_at = timezone.now()
                payment_address.transaction_hash = payload.get('transactionHash')
                payment_address.save()
                
                # Process escrow if applicable
                if hasattr(payment_address, 'escrow'):
                    escrow = payment_address.escrow
                    escrow.status = 'funded'
                    escrow.save()
            
            return True
            
        except Exception as e:
            logger.error(f"BTCPay webhook processing error: {str(e)}")
            return False
    
    def _process_monero_webhook(self, payload: dict) -> bool:
        """Process Monero payment notification"""
        try:
            # Implementation for Monero payment processing
            # This would involve checking transfers to specific subaddresses
            return True
            
        except Exception as e:
            logger.error(f"Monero webhook processing error: {str(e)}")
            return False
    
    def check_payment_status(self, order_id: str) -> dict:
        """Check current payment status"""
        try:
            payment_address = PaymentAddress.objects.get(order_id=order_id)
            
            result = {
                'order_id': order_id,
                'status': payment_address.status,
                'expected_amount': str(payment_address.expected_amount),
                'received_amount': str(payment_address.received_amount),
                'payment_address': payment_address.payment_address,
                'expires_at': payment_address.expires_at.isoformat(),
                'confirmations': payment_address.confirmations,
                'required_confirmations': payment_address.required_confirmations
            }
            
            # Add escrow info if applicable
            if hasattr(payment_address, 'escrow'):
                result['escrow'] = {
                    'status': payment_address.escrow.status,
                    'auto_release_at': payment_address.escrow.auto_release_at.isoformat() if payment_address.escrow.auto_release_at else None
                }
            
            return result
            
        except PaymentAddress.DoesNotExist:
            return {'error': 'Payment not found'}
        except Exception as e:
            logger.error(f"Payment status check error: {str(e)}")
            return {'error': str(e)}
    
    def release_escrow(self, order_id: str, released_by_user_id: int, admin_override: bool = False) -> bool:
        """Release escrow payment to vendor"""
        try:
            payment_address = PaymentAddress.objects.get(order_id=order_id)
            escrow = payment_address.escrow
            
            if escrow.status != 'funded':
                return False
            
            # Release escrow
            escrow.status = 'released'
            escrow.released_at = timezone.now()
            escrow.released_by_id = released_by_user_id
            escrow.save()
            
            logger.info(f"Escrow released for order {order_id}")
            return True
            
        except Exception as e:
            logger.error(f"Escrow release error: {str(e)}")
            return False


class EscrowService:
    """Service for escrow management"""
    
    def auto_release_escrows(self):
        """Auto-release expired escrows"""
        expired_escrows = EscrowPayment.objects.filter(
            status='funded',
            auto_release_enabled=True,
            auto_release_at__lte=timezone.now()
        )
        
        for escrow in expired_escrows:
            try:
                escrow.status = 'released'
                escrow.released_at = timezone.now()
                escrow.save()
                
                logger.info(f"Auto-released escrow for order {escrow.payment_address.order_id}")
                
            except Exception as e:
                logger.error(f"Auto-release error for escrow {escrow.id}: {str(e)}")
    
    def dispute_escrow(self, order_id: str, reason: str) -> bool:
        """Mark escrow as disputed"""
        try:
            payment_address = PaymentAddress.objects.get(order_id=order_id)
            escrow = payment_address.escrow
            
            escrow.status = 'disputed'
            escrow.dispute_reason = reason
            escrow.save()
            
            return True
            
        except Exception as e:
            logger.error(f"Escrow dispute error: {str(e)}")
            return False 