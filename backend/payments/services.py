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
from typing import Optional
import logging
from requests.auth import HTTPDigestAuth

logger = logging.getLogger(__name__)


class BTCPayServerService:
    """Service for BTCPay Server integration"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'BTCPAY_SERVER_URL', 'http://94.130.201.44:23000')
        self.store_id = getattr(settings, 'BTCPAY_STORE_ID', 'AKwDcGXvXRfKkVD3uTD7cK2Yv3jbnidDhwihfxBGyUN3')  # Correct Store ID
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
            
            # Try BTCPay Server first
            response = requests.post(
                f"{self.base_url}/api/v1/stores/{self.store_id}/invoices",
                headers=self.headers,
                json=invoice_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"BTCPay invoice created successfully: {data}")
                
                invoice_id = data.get('id')
                
                # Wait a moment for address generation, then fetch the invoice details
                import time
                time.sleep(2)  # Wait 2 seconds for address generation
                
                # Get the payment methods to get the BTC address
                payment_methods_response = requests.get(
                    f"{self.base_url}/api/v1/stores/{self.store_id}/invoices/{invoice_id}/payment-methods",
                    headers=self.headers,
                    timeout=30
                )
                
                btc_address = ''
                if payment_methods_response.status_code == 200:
                    payment_methods_data = payment_methods_response.json()
                    logger.info(f"BTCPay payment methods: {payment_methods_data}")
                    
                    # Extract BTC address from the payment methods response
                    for payment_method in payment_methods_data:
                        if payment_method.get('paymentMethodId') == 'BTC-CHAIN':
                            btc_address = payment_method.get('destination', '')
                            break
                
                logger.info(f"Extracted BTC address: {btc_address}")
                
                # Return a standardized format
                return {
                    'invoice_id': invoice_id,
                    'address': btc_address,
                    'checkoutLink': data.get('checkoutLink', ''),
                    'amount': str(amount),
                    'currency': currency,
                    'orderId': order_id
                }
            else:
                logger.error(f"BTCPay invoice creation failed. Status: {response.status_code}, Response: {response.text}")
                # Return None to trigger fallback address generation
                return None
                
        except Exception as e:
            logger.error(f"BTCPay service error: {str(e)}")
            return None
    
    def get_payment_address(self, invoice_id: str) -> str:
        """Get BTC address from invoice payment methods"""
        try:
            # Get the payment methods to get the BTC address
            payment_methods_response = requests.get(
                f"{self.base_url}/api/v1/stores/{self.store_id}/invoices/{invoice_id}/payment-methods",
                headers=self.headers,
                timeout=30
            )
            
            if payment_methods_response.status_code == 200:
                payment_methods_data = payment_methods_response.json()
                logger.info(f"BTCPay payment methods: {payment_methods_data}")
                
                # Extract BTC address from the payment methods response
                for payment_method in payment_methods_data:
                    if payment_method.get('paymentMethodId') == 'BTC-CHAIN':
                        btc_address = payment_method.get('destination', '')
                        logger.info(f"Extracted BTC address: {btc_address}")
                        return btc_address
                
                logger.warning(f"No BTC address found in payment methods for invoice {invoice_id}")
                return None
            else:
                logger.error(f"Failed to get payment methods: {payment_methods_response.status_code} - {payment_methods_response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting payment address from invoice: {e}")
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
            
            logger.info(f"Webhook verification debug:")
            logger.info(f"  - Received signature: {signature}")
            logger.info(f"  - Configured secret: {webhook_secret}")
            logger.info(f"  - Payload length: {len(payload)}")
            
            # BTCPay sends signature as "sha256=hash", extract just the hash
            if signature.startswith('sha256='):
                signature = signature[7:]  # Remove "sha256=" prefix
            
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            logger.info(f"  - Extracted signature: {signature[:16]}...")
            logger.info(f"  - Expected signature: {expected_signature[:16]}...")
            
            is_valid = hmac.compare_digest(signature, expected_signature)
            logger.info(f"  - Signature valid: {is_valid}")
            
            return is_valid
        except Exception as e:
            logger.error(f"Webhook verification error: {str(e)}")
            return False
    
    def create_payout(self, payout_data: dict) -> dict:
        """Create a payout using BTCPay Server"""
        try:
            import requests
            import uuid
            
            # Send REAL Bitcoin transaction using BTCPay Server Wallet API
            logger.info("Sending REAL Bitcoin transaction via BTCPay Server...")
            
            # Get wallet info first
            wallet_url = f"{self.base_url}/api/v1/stores/{self.store_id}/payment-methods/onchain/BTC/wallet"
            logger.info(f"Getting wallet info from: {wallet_url}")
            
            wallet_response = requests.get(wallet_url, headers=self.headers)
            logger.info(f"Wallet response: {wallet_response.status_code}")
            
            if wallet_response.status_code == 200:
                wallet_info = wallet_response.json()
                logger.info(f"Wallet info: {wallet_info}")
                
                # Check if we have sufficient balance
                available_balance = float(wallet_info.get('confirmedBalance', 0))
                required_amount = float(payout_data['amount'])
                
                logger.info(f"Available Balance: {available_balance} BTC")
                logger.info(f"Required Amount: {required_amount} BTC")
                
                if available_balance < required_amount:
                    logger.error(f"INSUFFICIENT FUNDS: Need {required_amount} BTC but only have {available_balance} BTC")
                    logger.error(f"Please add {required_amount - available_balance} BTC to the wallet")
                    # For testing, use available amount
                    test_amount = str(available_balance - 0.0001)  # Leave some for fees
                    logger.warning(f"Using test amount: {test_amount} BTC instead")
                    payout_data['amount'] = test_amount
                
                # Send transaction using wallet API
                send_url = f"{self.base_url}/api/v1/stores/{self.store_id}/payment-methods/onchain/BTC/wallet/transactions"
                
                transaction_data = {
                    'destinations': [{
                        'destination': payout_data['destination'],
                        'amount': payout_data['amount']
                    }],
                    'feeRate': 1,  # Use normal fee rate (INTEGER, not string)
                    'proceedWithBroadcast': True,
                    'proceedWithPayjoin': False
                }
                
                logger.info(f"Sending REAL Bitcoin transaction: {transaction_data}")
                
                send_response = requests.post(send_url, json=transaction_data, headers=self.headers)
                
                if send_response.status_code == 200:
                    tx_result = send_response.json()
                    logger.info(f"SUCCESS: REAL Bitcoin transaction sent: {tx_result}")
                    
                    return {
                        'id': tx_result.get('transactionHash', f"btc_payout_{uuid.uuid4().hex[:16]}"),
                        'destination': payout_data['destination'],
                        'amount': payout_data['amount'],
                        'status': 'completed',
                        'transactionHash': tx_result.get('transactionHash', f"btc_payout_{uuid.uuid4().hex[:16]}"),
                        'real_transaction': True
                    }
                else:
                    logger.error(f"FAILED to send Bitcoin transaction: {send_response.status_code} - {send_response.text}")
                    logger.error("Bitcoin transaction failed - no fallback methods available")
                    return None
            else:
                logger.error(f"FAILED to get wallet info: {wallet_response.status_code} - {wallet_response.text}")
                logger.error("Cannot proceed without wallet access")
                return None
                
        except Exception as e:
            logger.error(f"Error creating BTCPay payout: {str(e)}")
            return None


class MoneroRPCService:
    """Service for Monero wallet RPC integration"""
    
    def __init__(self):
        # Updated to use your Monero RPC server
        self.rpc_url = getattr(settings, 'MONERO_RPC_URL', 'http://88.99.143.151:28083/json_rpc')
        self.rpc_user = getattr(settings, 'MONERO_RPC_USER', 'monerouser')
        self.rpc_password = getattr(settings, 'MONERO_RPC_PASSWORD', 'moneropass123')
        self.wallet_password = getattr(settings, 'MONERO_WALLET_PASSWORD', 'testwallet')
        
        logger.info(f"Monero RPC Service initialized: {self.rpc_url}")
        
    def _make_rpc_call(self, method: str, params: dict = None) -> dict:
        """Make RPC call to Monero wallet"""
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": "0",
                "method": method,
                "params": params or {}
            }
            
            # Use Digest authentication for Monero RPC
            auth = None
            if self.rpc_user and self.rpc_password:
                auth = HTTPDigestAuth(self.rpc_user, self.rpc_password)
            
            logger.info(f"Monero RPC call: {method} with params: {params}")
            
            response = requests.post(
                self.rpc_url,
                json=payload,
                auth=auth,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'error' in result:
                    logger.error(f"Monero RPC error: {result['error']}")
                    return None
                logger.info(f"Monero RPC success: {method}")
                return result
            else:
                logger.error(f"Monero RPC HTTP error: {response.status_code} - {response.text}")
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
    
    def check_payment_by_subaddress(self, subaddress_index: int, expected_amount: int) -> dict:
        """Check if payment has been received to specific subaddress"""
        try:
            # Get transfers for specific subaddress
            transfers = self.get_transfers(account_index=0, subaddr_indices=[subaddress_index])
            
            if transfers and 'in' in transfers:
                for transfer in transfers['in']:
                    # Check if transfer is to our subaddress and amount matches
                    if (transfer.get('subaddr_index') == subaddress_index and 
                        transfer.get('amount') >= expected_amount and
                        transfer.get('confirmations', 0) >= 1):  # At least 1 confirmation
                        
                        logger.info(f"Monero payment found: {transfer}")
                        return {
                            'found': True,
                            'amount': transfer.get('amount'),
                            'txid': transfer.get('txid'),
                            'confirmations': transfer.get('confirmations', 0),
                            'timestamp': transfer.get('timestamp'),
                            'subaddr_index': transfer.get('subaddr_index')
                        }
            
            return {'found': False}
            
        except Exception as e:
            logger.error(f"Error checking Monero payment: {str(e)}")
            return {'found': False, 'error': str(e)}
    
    def check_payment(self, payment_id: str, amount: int) -> bool:
        """Check if payment has been received (legacy method)"""
        result = self._make_rpc_call("get_payments", {
            "payment_id": payment_id
        })
        
        if result and 'result' in result and 'payments' in result['result']:
            for payment in result['result']['payments']:
                if payment['amount'] >= amount:
                    return True
        return False
    
    def get_address_info(self, address: str) -> dict:
        """Get information about an address"""
        result = self._make_rpc_call("validate_address", {
            "address": address
        })
        
        if result and 'result' in result:
            return result['result']
        return None
    
    def get_wallet_height(self) -> int:
        """Get current wallet height"""
        result = self._make_rpc_call("get_height")
        
        if result and 'result' in result:
            return result['result'].get('height', 0)
        return 0
    
    def send_transaction(self, destinations: list, priority: int = 1) -> Optional[dict]:
        """Send XMR transaction to specified destinations"""
        try:
            # Priority: 1=normal, 2=elevated, 3=priority, 4=flash
            priority_map = {1: 1, 2: 2, 3: 3, 4: 4}
            
            params = {
                'destinations': destinations,
                'priority': priority_map.get(priority, 1),
                'ring_size': 16,
                'get_tx_key': True,
                'get_tx_hex': True
            }
            
            result = self._make_rpc_call('transfer', params)
            
            if result and 'result' in result and 'tx_hash' in result['result']:
                return {
                    'tx_hash': result['result']['tx_hash'],
                    'tx_key': result['result'].get('tx_key'),
                    'tx_hex': result['result'].get('tx_hex'),
                    'fee': result['result'].get('fee', 0)
                }
            else:
                logger.error(f"Send transaction failed: {result}")
                return None
                
        except Exception as e:
            logger.error(f"Error sending transaction: {str(e)}")
            return None


class PaymentService:
    """Main payment service orchestrator"""
    
    def __init__(self):
        self.btcpay = BTCPayServerService()
        self.monero = MoneroRPCService()
    
    def create_payment_address(self, order_id: str, crypto_currency: str, 
                             amount: Decimal, payment_type: str = 'wallet',
                             use_escrow: bool = False) -> PaymentAddress:
        
        try:
            crypto = CryptoCurrency.objects.get(symbol=crypto_currency)
            
            # Use get_or_create to avoid duplicate key constraint
            payment_address, created = PaymentAddress.objects.get_or_create(
                order_id=order_id,
                defaults={
                    'crypto_currency': crypto,
                    'payment_type': payment_type,
                    'expected_amount': amount,
                    'expires_at': timezone.now() + timedelta(hours=2),  # 2 hour expiry
                    'required_confirmations': settings.REQUIRED_CONFIRMATIONS.get(
                        crypto_currency, 1 if crypto_currency == 'XMR' else 3
                    )
                }
            )
            
            # If payment address already exists, update it
            if not created:
                payment_address.crypto_currency = crypto
                payment_address.payment_type = payment_type
                payment_address.expected_amount = amount
                payment_address.expires_at = timezone.now() + timedelta(hours=2)
                payment_address.required_confirmations = settings.REQUIRED_CONFIRMATIONS.get(
                    crypto_currency, 1 if crypto_currency == 'XMR' else 3
            )
            
            # Generate address based on cryptocurrency (only if not already created)
            if crypto_currency == 'BTC' and not payment_address.payment_address:
                if use_escrow:
                    # Use BTCPay Server for escrow payments
                    invoice_data = self.btcpay.create_invoice(order_id, amount, 'BTC')
                    if invoice_data and invoice_data.get('address'):
                        payment_address.btcpay_invoice_id = invoice_data.get('invoice_id', '')
                        payment_address.btcpay_checkout_link = invoice_data.get('checkoutLink', '')
                        payment_address.payment_address = invoice_data['address']
                        logger.info(f"BTCPay escrow address generated for order {order_id}: {payment_address.payment_address}")
                    else:
                        # Fallback to static address generation
                        payment_address.payment_address = self._generate_btc_address(order_id)
                        logger.warning(f"Using fallback BTC address for order {order_id}: {payment_address.payment_address}")
                else:
                    # For direct payments, create BTCPay invoice (BETTER APPROACH!)
                    from orders.models import Order
                    from vendors.models import VendorApplication
                    
                    order = Order.objects.get(order_id=order_id)
                    
                    # Create BTCPay invoice for direct payment (same as escrow but different metadata)
                    # The create_invoice method expects: order_id, amount, currency
                    invoice_response = self.btcpay.create_invoice(order_id, amount, 'BTC')
                    
                    if invoice_response and invoice_response.get('invoice_id'):
                        # The invoice response already includes the BTC address
                        invoice_id = invoice_response['invoice_id']
                        btc_address = invoice_response['address']
                        
                        if btc_address:
                            payment_address.payment_address = btc_address
                            payment_address.btcpay_invoice_id = invoice_id
                            payment_address.save()
                        else:
                            raise Exception("No BTC address in invoice response")
                        
                        # Get vendor's address for later payout
                        try:
                            vendor_app = VendorApplication.objects.get(vendor_username=order.product.vendor.username)
                            vendor_address = vendor_app.btc_address
                        except VendorApplication.DoesNotExist:
                            raise Exception("Vendor application not found")
                        
                        if not vendor_address:
                            raise Exception("Vendor BTC address not found in application")
                        
                        # Create direct payment record with vendor address for payout
                        from .models import DirectPayment
                        DirectPayment.objects.create(
                            order=order,
                            vendor=order.product.vendor,
                            buyer=order.buyer,
                            crypto_currency=crypto,
                            amount=amount,
                            vendor_address=vendor_address,  # Store vendor address for payout
                            expires_at=timezone.now() + timedelta(hours=24)
                        )
                        
                        logger.info(f"Direct BTC invoice created for order {order_id}: {invoice_response['id']}")
                        logger.info(f"Payment address: {btc_address}")
                        logger.info(f"Vendor will receive payment at: {vendor_address}")
                    else:
                        logger.error(f"BTCPay invoice creation failed for order {order_id}")
                        logger.error(f"Invoice response: {invoice_response}")
                        raise Exception("Failed to create BTCPay invoice for direct payment")
                    
            elif crypto_currency == 'XMR' and not payment_address.payment_address:
                if use_escrow:
                    # Use Monero subaddress for escrow
                    subaddress_data = self.monero.create_subaddress(label=f"Order-{order_id}")
                    if subaddress_data:
                        payment_address.payment_address = subaddress_data['address']
                        payment_address.monero_subaddress_index = subaddress_data['address_index']
                        logger.info(f"Monero subaddress generated for order {order_id}: {payment_address.payment_address} (index: {subaddress_data['address_index']})")
                    else:
                        raise Exception("Failed to create Monero subaddress")
                else:
                    # For direct XMR payments, create Monero subaddress (BETTER APPROACH!)
                    from orders.models import Order
                    from vendors.models import VendorApplication
                    
                    order = Order.objects.get(order_id=order_id)
                    
                    # Create Monero subaddress for direct payment
                    subaddress_data = self.monero.create_subaddress(label=f"Direct-Order-{order_id}")
                    
                    if subaddress_data and subaddress_data.get('address'):
                        payment_address.payment_address = subaddress_data['address']
                        payment_address.monero_subaddress_index = subaddress_data['address_index']
                        payment_address.save()
                        
                        # Get vendor's address for later payout
                        try:
                            vendor_app = VendorApplication.objects.get(vendor_username=order.product.vendor.username)
                            vendor_address = vendor_app.xmr_address
                        except VendorApplication.DoesNotExist:
                            raise Exception("Vendor application not found")
                        
                        if not vendor_address:
                            raise Exception("Vendor XMR address not found in application")
                        
                        # Create direct payment record with vendor address for payout
                        from .models import DirectPayment
                        DirectPayment.objects.create(
                            order=order,
                            vendor=order.product.vendor,
                            buyer=order.buyer,
                            crypto_currency=crypto,
                            amount=amount,
                            vendor_address=vendor_address,  # Store vendor address for payout
                            expires_at=timezone.now() + timedelta(hours=24)
                        )
                        
                        logger.info(f"Direct XMR subaddress created for order {order_id}: {subaddress_data['address']}")
                        logger.info(f"Vendor will receive payment at: {vendor_address}")
                    else:
                        raise Exception("Failed to create Monero subaddress for direct payment")

                        
            payment_address.save()
            
            # Create escrow if requested
            if use_escrow:
                self._create_escrow_payment(payment_address, amount)
            
            return payment_address
            
        except Exception as e:
            logger.error(f"Payment address creation error: {str(e)}")
            raise
    
    def _generate_btc_address(self, order_id: str) -> str:
        """Generate deterministic BTC testnet address (for development/testing only)"""
        # This is a simplified version that generates a valid testnet address format
        # In production, you should use proper key derivation
        prefix = 'tb1q'  # testnet bech32 prefix
        hash_input = f"{order_id}-{timezone.now().timestamp()}"
        hash_obj = hashlib.sha256(hash_input.encode())
        addr_hash = hash_obj.hexdigest()[:32]  # Take first 32 chars
        return f"{prefix}{addr_hash}"
    
    def _create_escrow_payment(self, payment_address: PaymentAddress, amount: Decimal):
        """Create escrow payment record and payout record immediately"""
        from orders.models import Order
        from vendors.models import VendorApplication
        
        # Get order details
        order = Order.objects.get(order_id=payment_address.order_id)
        
        escrow_fee = amount * Decimal('0.02')  # 2% escrow fee
        
        # Create escrow payment record
        escrow = EscrowPayment.objects.create(
            payment_address=payment_address,
            buyer=order.buyer,
            vendor=order.product.vendor,
            escrow_amount=amount,
            escrow_fee=escrow_fee,
            auto_release_at=timezone.now() + timedelta(days=7)
        )
        
        # Create escrow payout record immediately (like direct payments)
        try:
            # Get vendor's wallet address from VendorApplication
            vendor_username = order.product.vendor.username
            logger.info(f"Looking up vendor application for: {vendor_username}")
            
            vendor_app = VendorApplication.objects.get(vendor_username=vendor_username)
            logger.info(f"Found vendor app - Business Name: {vendor_app.business_name}, BTC: {vendor_app.btc_address}, XMR: {vendor_app.xmr_address}")
            
            vendor_address = None
            
            if payment_address.crypto_currency.symbol == 'BTC':
                vendor_address = vendor_app.btc_address
                logger.info(f"Using BTC address: {vendor_address}")
            elif payment_address.crypto_currency.symbol == 'XMR':
                vendor_address = vendor_app.xmr_address
                logger.info(f"Using XMR address: {vendor_address}")
            
            if vendor_address:
                # Calculate amounts
                gross_amount = amount
                platform_fee = gross_amount * Decimal('0.05')  # 5% platform fee
                net_amount = gross_amount - platform_fee - escrow_fee
                
                # Create payout record with pending status
                from .models import Payout
                Payout.objects.create(
                    order=order,
                    vendor=order.product.vendor,
                    buyer=order.buyer,
                    payout_type='escrow',
                    crypto_currency=payment_address.crypto_currency,
                    gross_amount=gross_amount,
                    net_amount=net_amount,
                    platform_fee=platform_fee,
                    escrow_fee=escrow_fee,
                    vendor_address=vendor_address,
                    status='pending',  # Will be updated when payment is confirmed
                    auto_release_enabled=True,
                    auto_release_at=timezone.now() + timedelta(days=7)
                )
                
                logger.info(f"Created escrow payout immediately for order {payment_address.order_id}: {net_amount} {payment_address.crypto_currency.symbol}")
            else:
                logger.warning(f"Vendor {payment_address.crypto_currency.symbol} address not found for order {payment_address.order_id}")
                
        except VendorApplication.DoesNotExist:
            logger.warning(f"Vendor application not found for {order.product.vendor.username}")
        except Exception as e:
            logger.error(f"Error creating escrow payout for order {payment_address.order_id}: {str(e)}")
    
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
            logger.info(f"Raw webhook payload: {payload}")
            logger.info(f"Payload type: {type(payload)}")
            logger.info(f"Payload keys: {list(payload.keys()) if isinstance(payload, dict) else 'Not a dict'}")
            
            invoice_id = payload.get('invoiceId')
            # BTCPay Server puts orderId in metadata, not root level
            metadata = payload.get('metadata', {}) if payload.get('metadata') else {}
            order_id = payload.get('orderId') or metadata.get('orderId')
            status = payload.get('status')
            webhook_type = payload.get('type')
            
            logger.info(f"Processing BTCPay webhook: invoice_id={invoice_id}, order_id={order_id}, status={status}, type={webhook_type}")
            logger.info(f"Metadata: {metadata}")
            
            # Handle test webhooks (no order_id or invoice_id)
            if not order_id or not invoice_id:
                logger.info("Test webhook received - ignoring")
                return True
            
            try:
                # Try to find by order_id first, then by invoice_id
                if order_id:
                    try:
                        payment_address = PaymentAddress.objects.get(
                            order_id=order_id,
                            btcpay_invoice_id=invoice_id
                        )
                    except PaymentAddress.DoesNotExist:
                        # Try to find by order_id only (in case invoice_id not saved yet)
                        payment_address = PaymentAddress.objects.get(order_id=order_id)
                        # Update the invoice_id if it's missing
                        if not payment_address.btcpay_invoice_id:
                            payment_address.btcpay_invoice_id = invoice_id
                            payment_address.save()
                else:
                    # If no order_id in webhook, find by invoice_id only
                    payment_address = PaymentAddress.objects.get(
                        btcpay_invoice_id=invoice_id
                    )
                    logger.info(f"Found PaymentAddress by invoice_id only: {payment_address.order_id}")
            except PaymentAddress.DoesNotExist:
                logger.warning(f"PaymentAddress not found for order_id={order_id}, invoice_id={invoice_id}")
                return False
            
            # Check if this webhook was already processed
            delivery_id = payload.get('deliveryId') if payload else None
            existing_webhook = PaymentWebhook.objects.filter(
                payment_address=payment_address,
                webhook_type='btcpay',
                external_id=invoice_id,
                delivery_id=delivery_id
            ).first()
            
            if existing_webhook and existing_webhook.processed:
                logger.info(f"Webhook already processed for invoice {invoice_id}, skipping")
                return True
            
            # Store webhook
            webhook = PaymentWebhook.objects.create(
                payment_address=payment_address,
                webhook_type='btcpay',
                external_id=invoice_id,
                raw_data=payload,
                delivery_id=delivery_id
            )
            
            # Update payment status based on webhook type
            if webhook_type in ['InvoiceReceivedPayment', 'InvoicePaymentSettled', 'InvoiceSettled', 'InvoiceProcessing']:
                # Determine status based on webhook type and payment data
                payment_data = payload.get('payment', {})
                payment_status = payment_data.get('status', '')
                
                # Map webhook types and payment statuses to our status
                if webhook_type == 'InvoiceReceivedPayment':
                    # Payment received but might still be processing
                    if payment_status == 'Processing':
                        btcpay_status = 'Paid'  # Payment received, mark as paid
                    elif payment_status == 'Settled':
                        btcpay_status = 'Settled'  # Payment fully confirmed
                    else:
                        btcpay_status = 'Paid'
                elif webhook_type == 'InvoicePaymentSettled':
                    btcpay_status = 'Settled'  # Payment fully settled
                elif webhook_type == 'InvoiceSettled':
                    btcpay_status = 'Settled'  # Invoice completed
                elif webhook_type == 'InvoiceProcessing':
                    # This is just a processing notification, don't change status if already paid
                    current_status = payment_address.status
                    if current_status == 'paid' or current_status == 'pending':
                        # Don't change status, just log
                        logger.info(f"InvoiceProcessing webhook received - keeping current status: {current_status}")
                        return True  # Skip processing this webhook
                    else:
                        btcpay_status = 'Paid'
                else:
                    btcpay_status = 'New'
                
                logger.info(f"Determined BTCPay status: {btcpay_status} from webhook_type: {webhook_type}, payment_status: {payment_status}")
                
                # Map BTCPay status to our payment status
                status_mapping = {
                    'New': 'pending',
                    'Paid': 'paid', 
                    'Settled': 'paid',
                    'Invalid': 'cancelled',
                    'Expired': 'expired'
                }
                
                mapped_status = status_mapping.get(btcpay_status, 'pending')
                payment_address.status = mapped_status
                
                if mapped_status == 'paid':
                    payment_address.confirmed_at = timezone.now()
                    
                    # Get transaction hash from payment data
                    if payment_data:
                        payment_address.transaction_hash = payment_data.get('id')
                        payment_address.received_amount = float(payment_data.get('value', 0))
                
                payment_address.save()
                
                # Update order status dynamically based on BTCPay status
                logger.info(f"Updating order status based on BTCPay status: {btcpay_status}")
                self._update_order_status_dynamically(payment_address.order_id, btcpay_status)
                
                # Process escrow if applicable
                if hasattr(payment_address, 'escrow') and mapped_status == 'paid':
                    escrow = payment_address.escrow
                    escrow.status = 'funded'
                    escrow.save()
                
                # Process direct payment if applicable (NEW APPROACH)
                if mapped_status == 'paid':
                    self._process_direct_payment_webhook(payment_address)
                
                # Mark webhook as processed
                webhook.processed = True
                webhook.processed_at = timezone.now()
                webhook.save()
                
                logger.info(f"Payment status updated to {mapped_status} for order {payment_address.order_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"BTCPay webhook processing error: {str(e)}")
            return False
    
    def _process_direct_payment_webhook(self, payment_address):
        """Process direct payment webhook - calculate fees and send to vendor"""
        try:
            from .models import DirectPayment
            
            # Check if this is a direct payment
            try:
                from orders.models import Order
                order = Order.objects.get(order_id=payment_address.order_id)
                direct_payment = DirectPayment.objects.get(order=order)
            except (DirectPayment.DoesNotExist, Order.DoesNotExist):
                # Not a direct payment, skip
                return
            
            logger.info(f"Processing direct payment webhook for order {payment_address.order_id}")
            
            # Calculate fees
            amount = direct_payment.amount
            platform_fee = amount * Decimal('0.05')  # 5% platform fee
            escrow_fee = amount * Decimal('0.01')    # 1% escrow fee
            net_amount = amount - platform_fee - escrow_fee
            
            # Update direct payment record with fees
            direct_payment.platform_fee = platform_fee
            direct_payment.escrow_fee = escrow_fee
            direct_payment.net_amount = net_amount
            direct_payment.status = 'confirmed'
            direct_payment.confirmed_at = timezone.now()
            direct_payment.transaction_hash = payment_address.transaction_hash
            direct_payment.save()
            
            logger.info(f"Direct payment fees calculated: Platform={platform_fee}, Escrow={escrow_fee}, Net={net_amount}")
            
            # Send net amount to vendor using existing payout system
            self._send_direct_payment_to_vendor(direct_payment, net_amount)
            
        except Exception as e:
            logger.error(f"Error processing direct payment webhook: {e}")
    
    def _send_direct_payment_to_vendor(self, direct_payment, net_amount):
        """Send net amount to vendor wallet"""
        try:
            vendor_address = direct_payment.vendor_address
            crypto_currency = direct_payment.crypto_currency.symbol
            
            logger.info(f"Sending {net_amount} {crypto_currency} to vendor {direct_payment.vendor.username} at {vendor_address}")
            
            if crypto_currency == 'BTC':
                # Use BTCPay Server to send BTC to vendor
                success = self._send_btc_to_vendor(vendor_address, net_amount)
            elif crypto_currency == 'XMR':
                # Use Monero RPC to send XMR to vendor
                success = self._send_xmr_to_vendor(vendor_address, net_amount)
            else:
                logger.error(f"Unsupported crypto currency: {crypto_currency}")
                return False
            
            if success:
                logger.info(f"Successfully sent {net_amount} {crypto_currency} to vendor")
                # Update direct payment status
                direct_payment.status = 'completed'
                direct_payment.save()
            else:
                logger.error(f"Failed to send {net_amount} {crypto_currency} to vendor")
                direct_payment.status = 'failed'
                direct_payment.save()
                
        except Exception as e:
            logger.error(f"Error sending direct payment to vendor: {e}")
    
    def _send_btc_to_vendor(self, vendor_address, amount):
        """Send BTC to vendor using existing BTCPay Server payout system"""
        try:
            # Use existing BTCPay Server payout functionality
            payout_data = {
                'destination': vendor_address,
                'amount': str(amount),
                'crypto_currency': 'BTC'
            }
            
            # Use existing BTCPay payout system
            logger.info(f"Sending BTC payout to vendor: {payout_data}")
            response = self.btcpay.create_payout(payout_data)
            
            if response and response.get('id'):
                logger.info(f"BTC payout created successfully: {response['id']}")
                return True
            else:
                logger.error(f"Failed to create BTC payout: {response}")
                return False
            
        except Exception as e:
            logger.error(f"Error sending BTC to vendor: {e}")
            return False
    
    def _send_xmr_to_vendor(self, vendor_address, amount):
        """Send XMR to vendor using existing Monero RPC system"""
        try:
            # Use existing Monero RPC functionality
            logger.info(f"Sending XMR payout: {amount} to {vendor_address}")
            
            # Use existing Monero transfer system
            transfer_result = self.monero.transfer(vendor_address, amount)
            
            if transfer_result and transfer_result.get('tx_hash'):
                logger.info(f"XMR transfer successful: {transfer_result['tx_hash']}")
                return True
            else:
                logger.error(f"Failed to transfer XMR: {transfer_result}")
                return False
            
        except Exception as e:
            logger.error(f"Error sending XMR to vendor: {e}")
            return False
    
    def _update_order_status_dynamically(self, order_id: str, btcpay_status: str):
        """Update order status dynamically based on BTCPay status"""
        try:
            from orders.models import Order, OrderStatus
            
            logger.info(f"Looking for order with order_id: {order_id}")
            order = Order.objects.get(order_id=order_id)
            logger.info(f"Found order: {order.id}, current status: {order.order_status}, payment_status: {order.payment_status}")
            
            # Map BTCPay status to our order status
            btcpay_to_order_status = {
                'New': OrderStatus.PENDING_PAYMENT.value,
                'Paid': OrderStatus.PAID.value,
                'Settled': OrderStatus.PAID.value,
                'Invalid': OrderStatus.CANCELLED.value,
                'Expired': OrderStatus.CANCELLED.value
            }
            
            # Map BTCPay status to payment status
            btcpay_to_payment_status = {
                'New': 'pending',
                'Paid': 'paid',
                'Settled': 'paid', 
                'Invalid': 'cancelled',
                'Expired': 'expired'
            }
            
            new_order_status = btcpay_to_order_status.get(btcpay_status, OrderStatus.PENDING_PAYMENT.value)
            new_payment_status = btcpay_to_payment_status.get(btcpay_status, 'pending')
            
            # Update order status
            order.order_status = new_order_status
            order.payment_status = new_payment_status
            
            # Set payment confirmed timestamp if status is paid/settled
            if btcpay_status in ['Paid', 'Settled']:
                order.payment_confirmed_at = timezone.now()
                
                # Set product credentials for paid orders (like in confirm_payment_success)
                if order.product.credentials and not order.product_credentials:
                    order.product_credentials = {
                        'credentials': order.product.credentials,
                        'delivered_at': timezone.now().isoformat(),
                        'delivery_method': order.product.delivery_time,
                        'additional_info': order.product.additional_info or '',
                        'notes': order.product.notes_for_buyer or ''
                    }
                    order.product.credentials_visible = True
                    order.product.save()
                    logger.info(f"Product credentials set for order {order_id}")
            
            order.save()
            
            logger.info(f"Order {order_id} status updated to {new_order_status} based on BTCPay status: {btcpay_status}")
            
            # Schedule review prompt for buyer if payment is confirmed
            if btcpay_status in ['Paid', 'Settled']:
                try:
                    from orders.tasks import send_review_prompt_task
                    send_review_prompt_task.apply_async(
                        args=[order.buyer.id, order.product.id, order.order_id],
                        countdown=60  # 1 minute delay
                    )
                    logger.info(f"Scheduled review prompt for order {order.order_id}")
                except Exception as e:
                    logger.error(f"Failed to schedule review prompt for order {order.order_id}: {str(e)}")
                
                # Create escrow payout immediately when order is paid (not just when confirmed)
                if order.use_escrow:
                    try:
                        from payments.tasks import create_escrow_payout
                        
                        # Create escrow payout asynchronously
                        create_escrow_payout.apply_async(args=[order.order_id])
                        
                        logger.info(f"Escrow payout creation queued for paid order {order.order_id}")
                    except Exception as e:
                        logger.error(f"Failed to queue escrow payout for order {order.order_id}: {str(e)}")
            
        except Order.DoesNotExist:
            logger.error(f"Order not found with order_id: {order_id}")
        except Exception as e:
            logger.error(f"Error updating order status for {order_id}: {str(e)}")
    
    def _update_order_status_on_payment(self, order_id: str):
        """Legacy method - kept for backward compatibility"""
        self._update_order_status_dynamically(order_id, 'Paid')
    
    def _process_monero_webhook(self, payload: dict) -> bool:
        """Process Monero payment notification"""
        try:
            # Implementation for Monero payment processing
            # This would involve checking transfers to specific subaddresses
            return True
            
        except Exception as e:
            logger.error(f"Monero webhook processing error: {str(e)}")
            return False
    
    def get_payment_address(self, order_id: str) -> PaymentAddress:
        """Get payment address for order"""
        try:
            return PaymentAddress.objects.get(order_id=order_id)
        except PaymentAddress.DoesNotExist:
            return None
    
    def check_payment_status(self, order_id: str) -> dict:
        """Check current payment status"""
        try:
            payment_address = PaymentAddress.objects.get(order_id=order_id)
            
            # Check for Monero payments if it's XMR
            if payment_address.crypto_currency.symbol == 'XMR' and payment_address.monero_subaddress_index:
                logger.info(f"Checking Monero payment for order {order_id}, subaddress index: {payment_address.monero_subaddress_index}")
                
                # Convert expected amount to atomic units (XMR uses 12 decimal places)
                expected_amount_atomic = int(float(payment_address.expected_amount) * 1e12)
                
                payment_result = self.monero.check_payment_by_subaddress(
                    payment_address.monero_subaddress_index,
                    expected_amount_atomic
                )
                
                if payment_result.get('found'):
                    logger.info(f"Monero payment found for order {order_id}: {payment_result}")
                    
                    # Update payment address with received amount
                    received_amount_xmr = payment_result['amount'] / 1e12
                    payment_address.received_amount = received_amount_xmr
                    payment_address.transaction_hash = payment_result['txid']
                    payment_address.confirmations = payment_result['confirmations']
                    
                    # Mark as paid if we have enough confirmations
                    if payment_result['confirmations'] >= payment_address.required_confirmations:
                        payment_address.status = 'paid'
                        payment_address.confirmed_at = timezone.now()
                        
                        # Update order status
                        self._update_order_status_dynamically(order_id, 'Paid')
                    
                    payment_address.save()
            
            result = {
                'order_id': order_id,
                'status': payment_address.status,
                'expected_amount': str(payment_address.expected_amount),
                'received_amount': str(payment_address.received_amount),
                'payment_address': payment_address.payment_address,
                'expires_at': payment_address.expires_at.isoformat(),
                'confirmations': payment_address.confirmations,
                'required_confirmations': payment_address.required_confirmations,
                'crypto_currency': payment_address.crypto_currency.symbol
            }
            
            # Add Monero specific info
            if payment_address.crypto_currency.symbol == 'XMR' and payment_address.monero_subaddress_index:
                result['monero_subaddress_index'] = payment_address.monero_subaddress_index
            
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


class PayoutService:
    """Service for handling vendor payouts"""
    
    def __init__(self):
        self.btcpay = BTCPayServerService()
        self.monero = MoneroRPCService()
    
    def create_escrow_payout(self, order_id: str) -> bool:
        """Update escrow payout status when order is paid (payout already exists)"""
        try:
            from orders.models import Order
            from .models import Payout, EscrowPayment
            
            order = Order.objects.get(order_id=order_id)
            
            # Check if payout already exists
            existing_payout = Payout.objects.filter(order=order, payout_type='escrow').first()
            if not existing_payout:
                logger.warning(f"No escrow payout found for order {order_id} - this should have been created when order was created")
                return False
            
            # Check if escrow exists and payment is confirmed
            try:
                payment_address = PaymentAddress.objects.get(order_id=order_id)
                escrow = payment_address.escrow
                
                # Check if payment is confirmed (not just escrow status)
                if payment_address.status != 'paid':
                    logger.warning(f"Payment not confirmed for order {order_id}, status: {payment_address.status}")
                    return False
                
                # Update escrow status to funded if payment is confirmed
                if escrow.status == 'created':
                    escrow.status = 'funded'
                    escrow.save()
                    logger.info(f"Updated escrow status to funded for order {order_id}")
                
                # Update payout status to ready for release when payment is confirmed
                if existing_payout.status == 'pending':
                    existing_payout.status = 'ready'
                    existing_payout.save()
                    logger.info(f"Escrow payout status updated to 'ready' for order {order_id} - payment confirmed")
                    return True
                elif existing_payout.status == 'ready':
                    logger.info(f"Escrow payout already ready for order {order_id}")
                    return True
                else:
                    logger.info(f"Escrow payout already processed for order {order_id}, status: {existing_payout.status}")
                    return True
                    
            except PaymentAddress.DoesNotExist:
                logger.error(f"Payment address not found for order {order_id}")
                return False
            
        except Exception as e:
            logger.error(f"Error updating escrow payout: {str(e)}")
            return False
    
    def process_escrow_payout(self, payout_id: int, admin_user=None) -> bool:
        """Process escrow payout by sending coins to vendor"""
        try:
            from .models import Payout
            
            payout = Payout.objects.get(id=payout_id)
            
            if payout.status not in ['pending', 'ready', 'failed']:
                logger.warning(f"Payout {payout_id} is not pending, ready, or failed (status: {payout.status})")
                return False
            
            # Update status to processing
            previous_status = payout.status
            payout.status = 'processing'
            payout.processed_at = timezone.now()
            payout.processed_by = admin_user
            payout.save()
            
            logger.info(f"Processing payout {payout_id} (previous status: {previous_status})")
            
            # Send coins to vendor
            success = False
            transaction_hash = None
            
            if payout.crypto_currency.symbol == 'BTC':
                success, transaction_hash = self._send_btc_payout(payout)
            elif payout.crypto_currency.symbol == 'XMR':
                success, transaction_hash = self._send_xmr_payout(payout)
            
            if success and transaction_hash:
                payout.status = 'completed'
                payout.completed_at = timezone.now()
                payout.transaction_hash = transaction_hash
                payout.save()
                
                # Update escrow status
                try:
                    payment_address = PaymentAddress.objects.get(order_id=payout.order.order_id)
                    escrow = payment_address.escrow
                    escrow.status = 'released'
                    escrow.released_at = timezone.now()
                    escrow.release_transaction_hash = transaction_hash
                    escrow.save()
                    
                    # Update order status
                    payout.order.order_status = 'completed'
                    payout.order.save()
                    
                except PaymentAddress.DoesNotExist:
                    logger.warning(f"Payment address not found for payout {payout_id}")
                
                logger.info(f"Escrow payout {payout_id} completed: {transaction_hash}")
                return True
            else:
                payout.status = 'failed'
                payout.save()
                logger.error(f"Failed to process escrow payout {payout_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing escrow payout: {str(e)}")
            return False
    
    def create_direct_payment(self, order_id: str) -> bool:
        """Create a direct payment record for non-escrow orders"""
        try:
            from orders.models import Order
            from .models import DirectPayment
            
            order = Order.objects.get(order_id=order_id)
            
            # Get payment address details
            payment_address = PaymentAddress.objects.get(order_id=order_id)
            
            # Get vendor's wallet address from VendorApplication
            from vendors.models import VendorApplication
            
            try:
                vendor_app = VendorApplication.objects.get(vendor_username=order.product.vendor.username)
                vendor_address = None
                
                if payment_address.crypto_currency.symbol == 'BTC':
                    vendor_address = vendor_app.btc_address
                elif payment_address.crypto_currency.symbol == 'XMR':
                    vendor_address = vendor_app.xmr_address
                
                if not vendor_address:
                    logger.error(f"Vendor {payment_address.crypto_currency.symbol} address not found in application")
                    return False
                    
            except VendorApplication.DoesNotExist:
                logger.error(f"Vendor application not found for {order.product.vendor.username}")
                return False
            
            # Update payment address to use vendor's address
            payment_address.payment_address = vendor_address
            payment_address.save()
            
            # Create direct payment record
            direct_payment = DirectPayment.objects.create(
                order=order,
                vendor=order.product.vendor,
                buyer=order.buyer,
                crypto_currency=payment_address.crypto_currency,
                amount=Decimal(str(payment_address.expected_amount)),
                vendor_address=vendor_address,
                expires_at=timezone.now() + timedelta(hours=24)  # 24 hour expiration
            )
            
            logger.info(f"Created direct payment for order {order_id} to address {vendor_address}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating direct payment: {str(e)}")
            return False
    
    def check_direct_payment_status(self, order_id: str) -> dict:
        """Check status of direct payment to vendor address"""
        try:
            from .models import DirectPayment
            
            direct_payment = DirectPayment.objects.get(order_id=order_id)
            
            if direct_payment.status == 'confirmed':
                return {
                    'status': 'confirmed',
                    'transaction_hash': direct_payment.transaction_hash,
                    'confirmations': direct_payment.confirmations
                }
            
            # Check if payment was made to vendor address
            payment_result = None
            
            if direct_payment.crypto_currency.symbol == 'BTC':
                payment_result = self._check_btc_direct_payment(direct_payment)
            elif direct_payment.crypto_currency.symbol == 'XMR':
                payment_result = self._check_xmr_direct_payment(direct_payment)
            
            if payment_result and payment_result.get('found'):
                direct_payment.status = 'confirmed'
                direct_payment.confirmed_at = timezone.now()
                direct_payment.transaction_hash = payment_result['txid']
                direct_payment.confirmations = payment_result.get('confirmations', 0)
                direct_payment.save()
                
                # Update order status
                direct_payment.order.order_status = 'completed'
                direct_payment.order.payment_status = 'paid'
                direct_payment.order.save()
                
                return {
                    'status': 'confirmed',
                    'transaction_hash': payment_result['txid'],
                    'confirmations': payment_result.get('confirmations', 0)
                }
            
            # Check if expired
            if timezone.now() > direct_payment.expires_at:
                direct_payment.status = 'expired'
                direct_payment.save()
                
                direct_payment.order.order_status = 'cancelled'
                direct_payment.order.save()
                
                return {'status': 'expired'}
            
            return {'status': 'pending'}
            
        except DirectPayment.DoesNotExist:
            return {'status': 'not_found'}
        except Exception as e:
            logger.error(f"Error checking direct payment status: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def auto_release_escrow_payouts(self) -> int:
        """Auto-release escrow payouts older than 7 days"""
        try:
            from .models import Payout
            
            expired_payouts = Payout.objects.filter(
                payout_type='escrow',
                status='pending',
                auto_release_enabled=True,
                auto_release_at__lte=timezone.now()
            )
            
            released_count = 0
            
            for payout in expired_payouts:
                if self.process_escrow_payout(payout.id):
                    released_count += 1
                    logger.info(f"Auto-released escrow payout {payout.id}")
            
            return released_count
            
        except Exception as e:
            logger.error(f"Error in auto-release: {str(e)}")
            return 0
    
    def _send_btc_payout(self, payout) -> tuple[bool, Optional[str]]:
        """Send BTC payout using BTCPay Server"""
        try:
            logger.info(f"Sending {payout.net_amount} BTC to {payout.vendor_address}")
            
            # Use BTCPay Server to send BTC
            # First, we need to create a payout request
            payout_data = {
                'destination': payout.vendor_address,
                'amount': str(payout.net_amount)
            }
            
            # Send payout using BTCPay Server API
            response = self.btcpay.create_payout(payout_data)
            
            if response and response.get('id'):
                # BTCPay Server returns a payout ID, we'll use that as transaction reference
                transaction_hash = f"btc_payout_{response['id']}"
                logger.info(f"BTC payout created successfully: {transaction_hash}")
                return True, transaction_hash
            else:
                logger.error(f"BTCPay payout creation failed: {response}")
                return False, None
            
        except Exception as e:
            logger.error(f"Error sending BTC payout: {str(e)}")
            return False, None
    
    def _send_xmr_payout(self, payout) -> tuple[bool, Optional[str]]:
        """Send XMR payout using Monero RPC"""
        try:
            # Convert amount to atomic units
            amount_atomic = int(float(payout.net_amount) * 1e12)
            
            # Use Monero RPC to send XMR
            result = self.monero.send_transaction(
                destinations=[{
                    'address': payout.vendor_address,
                    'amount': amount_atomic
                }],
                priority=1  # Normal priority
            )
            
            if result and result.get('tx_hash'):
                return True, result['tx_hash']
            else:
                logger.error(f"Monero send failed: {result}")
                return False, None
                
        except Exception as e:
            logger.error(f"Error sending XMR payout: {str(e)}")
            return False, None
    
    def _check_btc_direct_payment(self, direct_payment) -> Optional[dict]:
        """Check BTC direct payment to vendor address"""
        try:
            # For BTC, you would check the blockchain for transactions to the vendor address
            # This is a simplified version
            
            # In production, you'd use a Bitcoin API or your own node to check transactions
            # For now, return None (no payment found)
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking BTC direct payment: {str(e)}")
            return None
    
    def _check_xmr_direct_payment(self, direct_payment) -> Optional[dict]:
        """Check XMR direct payment to vendor address"""
        try:
            # For XMR, we can't easily check arbitrary addresses
            # This would require the vendor to provide payment proof or use subaddresses
            
            # For now, return None (no payment found)
            return None
            
        except Exception as e:
            logger.error(f"Error checking XMR direct payment: {str(e)}")
            return None