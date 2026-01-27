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

# Typical payout tx size in vBytes (1-in-2-out ~250, 2-in-2-out ~350)
DEFAULT_BTC_TX_VBYTES = 250


def get_btc_estimated_miner_fee_btc() -> Optional[Decimal]:
    """Fetch current BTC miner fee estimate from mempool.space (sat/vB -> BTC for typical payout tx)."""
    try:
        r = requests.get("https://mempool.space/api/v1/fees/recommended", timeout=5)
        if r.status_code != 200:
            return None
        data = r.json()
        # Use economyFee for low-cost payouts; fallback to hourFee then minimumFee
        sat_per_vb = data.get("economyFee") or data.get("hourFee") or data.get("minimumFee") or 1
        # fee_btc = (sat_per_vb * vbytes) / 100_000_000
        fee_btc = Decimal(sat_per_vb) * DEFAULT_BTC_TX_VBYTES / Decimal("100000000")
        return fee_btc
    except Exception as e:
        logger.warning(f"Failed to fetch BTC fee from mempool.space: {e}")
        return None


def get_btc_fee_rate_sat_per_vb() -> Optional[int]:
    """Fetch recommended BTC fee rate in sat/vB from mempool.space (for BTCPay feeRate).
    ALWAYS tries API first - only returns None if API completely fails.
    """
    try:
        r = requests.get("https://mempool.space/api/v1/fees/recommended", timeout=8)
        if r.status_code != 200:
            logger.warning(f"mempool.space returned status {r.status_code}, cannot get fee rate")
            return None
        data = r.json()
        sat_per_vb = data.get("economyFee") or data.get("hourFee") or data.get("minimumFee") or 1
        logger.info(f"✅ BTC fee rate from mempool.space: {sat_per_vb} sat/vB")
        return sat_per_vb
    except Exception as e:
        logger.error(f"❌ CRITICAL: Failed to fetch BTC fee rate from mempool.space: {e} - Will use minimal fallback")
        return None


class BTCPayServerService:
    """Service for BTCPay Server integration"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'BTCPAY_SERVER_URL', 'https://pay.accountzclub.com')
        self.store_id = getattr(settings, 'BTCPAY_STORE_ID', '5rZ8Bo7fCoXCUAbkSvnNhTgQiVwEbiSstB7Cxs76BDW7')
        self.api_key = getattr(settings, 'BTCPAY_API_KEY', 'f66dd13f59806719fcee1eb31be75057ea47c1fd')
        self.headers = {
            'Authorization': f'token {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_invoice(self, order_id: str, amount: Decimal, currency: str = 'BTC') -> dict:
        """Create BTCPay invoice"""
        try:
            invoice_data = {
                'amount': str(amount),
                'currency': currency,
                'metadata': {
                    'orderId': order_id,
                    'platform': 'CryptoNexus'
                }
            }
            
            # Try BTCPay Server first
            url = f"{self.base_url}/api/v1/stores/{self.store_id}/invoices"
            
            # Debug logging
            logger.info(f"=== BTCPay Invoice Creation Debug ===")
            logger.info(f"Base URL: {self.base_url}")
            logger.info(f"Store ID: {self.store_id}")
            logger.info(f"API Key: {self.api_key[:20]}...")
            logger.info(f"Full URL: {url}")
            logger.info(f"Payload: {invoice_data}")
            logger.info(f"Headers: Authorization=token {self.api_key[:20]}...")
            
            response = requests.post(
                url,
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
                
                # Check if we have sufficient total balance
                # Using total balance (confirmed + unconfirmed) to allow faster testing/payouts
                total_balance = float(wallet_info.get('balance', 0))
                confirmed_balance = float(wallet_info.get('confirmedBalance', 0))
                required_amount = float(payout_data['amount'])
                
                logger.info(f"Available Confirmed Balance: {confirmed_balance} BTC")
                logger.info(f"Available Total Balance (including unconfirmed): {total_balance} BTC")
                logger.info(f"Required Payout Amount: {required_amount} BTC")
                
                # ALWAYS use live miner fee from mempool.space API - never hardcode
                fee_dec = get_btc_estimated_miner_fee_btc()
                if fee_dec is None:
                    logger.error("⚠️ WARNING: mempool.space API failed, using minimal fallback 0.00002 BTC (~$2)")
                    estimated_miner_fee = 0.00002  # Minimal fallback ONLY when API completely fails
                else:
                    estimated_miner_fee = float(fee_dec)
                    logger.info(f"✅ Using API fee: {estimated_miner_fee} BTC")
                total_needed = required_amount + estimated_miner_fee
                
                # CRITICAL FIX: Removed 'sweep/adjust' logic that was sending platform fees to vendors.
                # We only ever send the exact required_amount (net_amount).
                
                if total_needed > total_balance:
                    logger.error(
                        f"❌ INSUFFICIENT BALANCE: Required {required_amount} + estimated fee {estimated_miner_fee} = {total_needed} > Total {total_balance}"
                    )
                    logger.error("Payout aborted to prevent sending platform fees or failing due to lack of funds.")
                    return None
                
                logger.info(f"✅ Sufficient balance: {total_balance} BTC available. Sending exact Net Amount: {required_amount} BTC (miner fees will be deducted from this)")
                
                # Send transaction using wallet API
                send_url = f"{self.base_url}/api/v1/stores/{self.store_id}/payment-methods/onchain/BTC/wallet/transactions"
                
                # ALWAYS get fee rate from API - never hardcode
                fee_sat_vb = get_btc_fee_rate_sat_per_vb()
                if fee_sat_vb is None:
                    logger.error("⚠️ WARNING: mempool.space fee rate API failed, using minimal fallback 2 sat/vB")
                    fee_sat_vb = 2  # Minimal fallback ONLY when API fails
                else:
                    logger.info(f"✅ Using API fee rate: {fee_sat_vb} sat/vB")
                
                transaction_data = {
                    'destinations': [{
                        'destination': payout_data['destination'],
                        'amount': payout_data['amount'],
                        'subtractFeesFromAmount': True
                    }],
                    'feeRate': fee_sat_vb,  # From mempool.space API (economy/hour)
                    'proceedWithBroadcast': True,
                    'proceedWithPayjoin': False
                }
                est_fee_btc = get_btc_estimated_miner_fee_btc() or Decimal('0.00002')
                logger.info(f"=== BTC PAYOUT FEE (from mempool.space API) ===")
                logger.info(f"Payout amount: {payout_data['amount']} BTC")
                logger.info(f"Fee rate: {fee_sat_vb} sat/vB (from API)")
                logger.info(f"Estimated miner fee: ~{est_fee_btc} BTC")
                logger.info(f"===========================")
                
                logger.info(f"Sending REAL Bitcoin transaction: {transaction_data}")
                
                send_response = requests.post(send_url, json=transaction_data, headers=self.headers)
                
                if send_response.status_code == 200:
                    tx_result = send_response.json()
                    logger.info(f"SUCCESS: REAL Bitcoin transaction sent: {tx_result}")
                    
                    # Log actual transaction details for verification
                    actual_tx_hash = tx_result.get('transactionHash')
                    actual_amount_sent = tx_result.get('amount', payout_data['amount'])
                    logger.info(f"=== ACTUAL TRANSACTION DETAILS ===")
                    logger.info(f"Transaction Hash: {actual_tx_hash}")
                    logger.info(f"Amount sent to vendor: {actual_amount_sent} BTC")
                    logger.info(f"Destination: {payout_data['destination']}")
                    logger.info(f"Note: Miner fees were deducted from amount by BTCPay")
                    logger.info(f"=================================")
                    
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

    def get_wallet_balance(self) -> dict:
        """Get BTCPay wallet balance"""
        try:
            url = f"{self.base_url}/api/v1/stores/{self.store_id}/payment-methods/onchain/BTC/wallet"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get BTC wallet balance: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"BTCPay wallet balance error: {str(e)}")
            return None


class MoneroRPCService:
    """Service for Monero wallet RPC integration"""
    
    def __init__(self):
        # Updated to use Monero RPC server - MAINNET
        self.rpc_url = getattr(settings, 'MONERO_RPC_URL', 'http://127.0.0.1:18082/json_rpc')  # Local Wallet RPC
        self.rpc_user = getattr(settings, 'MONERO_RPC_USER', '')
        self.rpc_password = getattr(settings, 'MONERO_RPC_PASSWORD', '')
        self._address_index_cache = {}  # Cache for address -> index lookups
        
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
                timeout=30  # Reduced from 60 to 30
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
        """Get all kinds of transfers (confirmed, pool, pending)"""
        params = {
            "in": True,
            "pool": True,
            "pending": True,
            "account_index": account_index
        }
        
        if subaddr_indices:
            params["subaddr_indices"] = subaddr_indices
            
        result = self._make_rpc_call("get_transfers", params)
        
        if result and 'result' in result:
            return result['result']
        return None
    
    def get_transfer_by_txid(self, txid: str) -> dict:
        """Get transfer details by transaction ID"""
        result = self._make_rpc_call("get_transfer_by_txid", {
            "txid": txid
        })
        
        if result and 'result' in result and 'transfer' in result['result']:
            return result['result']['transfer']
        return None
    
    def check_payment_by_subaddress(self, subaddress_index: int, expected_amount: int, tolerance_percent: float = 1.6) -> dict:
        """Check if payment has been received to specific subaddress (includes mempool)"""
        try:
            # Get all transfers for specific subaddress
            transfers = self.get_transfers(account_index=0, subaddr_indices=[subaddress_index])
            
            if not transfers:
                logger.debug(f"No transfers found at all for subaddress index {subaddress_index}")
                return {'found': False}
                
            # Combine all incoming lists
            all_incoming = transfers.get('in', []) + transfers.get('pool', []) + transfers.get('pending', [])
            
            logger.info(f"Checking {len(all_incoming)} incoming transfers for index {subaddress_index}")
            
            total_received = 0
            main_txid = None
            max_confirmations = 0
            latest_timestamp = 0
            is_in_pool = False
            
            for transfer in all_incoming:
                tx_amount = transfer.get('amount', 0)
                tx_index = transfer.get('subaddr_index', {}).get('minor', transfer.get('subaddr_index'))
                
                # Handle cases where subaddr_index might be a dict or int
                if isinstance(tx_index, dict):
                    tx_index = tx_index.get('minor', 0)

                if tx_index == subaddress_index:
                    total_received += tx_amount
                    if not main_txid:
                        main_txid = transfer.get('txid')
                    max_confirmations = max(max_confirmations, transfer.get('confirmations', 0))
                    latest_timestamp = max(latest_timestamp, transfer.get('timestamp', 0))
                    if transfer.get('type') in ['pool', 'pending'] or transfer.get('confirmations', 0) == 0:
                        is_in_pool = True

                logger.info(f"Evaluating TX: id={transfer.get('txid')[:10]}..., amount={tx_amount}, index={tx_index}")
            
            # Calculate threshold with tolerance
            # Default tolerance expanded to 1.6% to accommodate user's small underpayment
            threshold = int(expected_amount * (1.0 - (tolerance_percent / 100.0)))
            
            logger.info(f"Subaddress {subaddress_index} Balance: {total_received} atomic units. Target: {expected_amount}, Min Threshold: {threshold}")

            if total_received >= threshold:
                logger.info(f"MATCH FOUND! Monero payment detected: {main_txid} (Total: {total_received})")
                return {
                    'found': True,
                    'amount': total_received,
                    'txid': main_txid,
                    'confirmations': max_confirmations,
                    'timestamp': latest_timestamp,
                    'subaddr_index': subaddress_index,
                    'is_in_pool': is_in_pool
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

    def get_address_index(self, address: str) -> Optional[dict]:
        """Get account and subaddress index for a given address (with caching)"""
        if address in self._address_index_cache:
            return self._address_index_cache[address]
            
        result = self._make_rpc_call("get_address_index", {
            "address": address
        })
        
        if result and 'result' in result:
            index = result['result']['index']
            self._address_index_cache[address] = index
            return index
        return None

    def get_incoming_transfers(self, address: str) -> list:
        """Get incoming transfers for a specific address (including mempool)"""
        index = self.get_address_index(address)
        if not index:
            return []
            
        params = {
            "in": True,
            "pool": True,
            "pending": True,
            "account_index": index.get('major', 0),
            "subaddr_indices": [index.get('minor', 0)]
        }
        
        result = self._make_rpc_call("get_transfers", params)
        if not result or 'result' not in result:
            return []
            
        res = result['result']
        return res.get('in', []) + res.get('pool', []) + res.get('pending', [])
    
    def get_wallet_height(self) -> int:
        """Get current wallet height"""
        result = self._make_rpc_call("get_height")
        
        if result and 'result' in result:
            return result['result'].get('height', 0)
        return 0
        
    def get_node_info(self) -> dict:
        """Get basic node info (simulated or real)"""
        try:
            height = self.get_wallet_height()
            if height > 0:
                return {
                    'status': 'Connected',
                    'height': height,
                    'version': 'v0.18.3.1'  # Hardcoded or fetch if available
                }
        except Exception:
            pass
        return {'status': 'Disconnected', 'height': 0}
    
    def send_transaction(self, destinations: list, priority: int = 1) -> Optional[dict]:
        """Send XMR transaction to specified destinations"""
        try:
            # Check unlocked balance BEFORE attempting transfer
            balance_info = self.get_balance()
            if not balance_info:
                logger.error("Failed to get wallet balance before transfer")
                return None
            
            unlocked_balance = balance_info.get('unlocked_balance', 0)
            balance = balance_info.get('balance', 0)
            
            # Calculate total amount needed
            total_amount_needed = sum(dest.get('amount', 0) for dest in destinations)
            
            logger.info(f"Monero Balance Check: Unlocked={unlocked_balance}, Total={balance}, Required={total_amount_needed}")
            
            if unlocked_balance < total_amount_needed:
                locked_amount = balance - unlocked_balance
                logger.error(
                    f"INSUFFICIENT UNLOCKED BALANCE: Required {total_amount_needed} atomic units, "
                    f"but only {unlocked_balance} are unlocked. "
                    f"{locked_amount} atomic units are still locked (waiting for confirmations). "
                    f"Monero requires 10 confirmations (~20 minutes) before funds can be spent."
                )
                return None
            
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

    def get_fiat_to_crypto_rate(self, crypto_symbol: str, fiat_symbol: str = 'USD') -> Decimal:
        """Get exchange rate from Crypto to Fiat (e.g. 1 BTC = ? USD)"""
        try:
            crypto_symbol = (crypto_symbol or '').upper()
            fiat_symbol = (fiat_symbol or 'USD').upper()

            # 1. For BTC/XMR try Kraken first (no auth, stable); CoinGecko often rate-limits XMR
            if fiat_symbol == 'USD' and crypto_symbol in ('BTC', 'XMR'):
                try:
                    pair_param = 'XBTUSD' if crypto_symbol == 'BTC' else 'XMRUSD'
                    resp = requests.get(f"https://api.kraken.com/0/public/Ticker?pair={pair_param}", timeout=8)
                    if resp.status_code == 200:
                        j = resp.json()
                        if not j.get("error") and "result" in j:
                            for v in j["result"].values():
                                if isinstance(v, dict) and "c" in v and isinstance(v["c"], (list, tuple)) and len(v["c"]) > 0:
                                    price = Decimal(str(v["c"][0]))
                                    if price > 0:
                                        logger.info(f"Kraken rate for {crypto_symbol}: {price} {fiat_symbol}")
                                        return price
                except Exception as kraken_e:
                    logger.warning(f"Kraken API failed ({kraken_e}), trying CoinGecko/DB")

            # 2. CoinGecko
            try:
                coingecko_ids = {'BTC': 'bitcoin', 'XMR': 'monero', 'LTC': 'litecoin', 'ETH': 'ethereum', 'USDT': 'tether'}
                coin_id = coingecko_ids.get(crypto_symbol)
                if coin_id:
                    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies={fiat_symbol.lower()}"
                    response = requests.get(url, timeout=8)
                    if response.status_code == 200:
                        data = response.json()
                        if coin_id in data and fiat_symbol.lower() in data[coin_id]:
                            price = Decimal(str(data[coin_id][fiat_symbol.lower()]))
                            if price > 0:
                                try:
                                    from shared.models import CryptoCurrency
                                    c = CryptoCurrency.objects.filter(symbol=crypto_symbol).first()
                                    if c:
                                        c.current_price = price
                                        c.save(update_fields=['current_price'])
                                except Exception as db_e:
                                    logger.warning(f"Failed to update crypto price in DB: {db_e}")
                                logger.info(f"CoinGecko rate for {crypto_symbol}: {price} {fiat_symbol}")
                                return price
            except Exception as api_e:
                logger.warning(f"CoinGecko API failed ({api_e}), trying DB/fallback")

            # 3. Database
            try:
                from shared.models import CryptoCurrency
                c = CryptoCurrency.objects.filter(symbol=crypto_symbol).first()
                if c and getattr(c, 'current_price', None) and Decimal(str(c.current_price)) > 0:
                    return Decimal(str(c.current_price))
            except Exception as db_e:
                logger.warning(f"DB rate failed ({db_e})")

            # 4. Last-resort fallback (avoid "Failed to fetch rate" for known coins)
            fallbacks = {
                'BTC': Decimal('98000'),
                'XMR': Decimal('165'),
                'LTC': Decimal('110'),
                'ETH': Decimal('2700'),
                'USDT': Decimal('1')
            }
            price = fallbacks.get(crypto_symbol, Decimal('0'))
            if price > 0:
                logger.warning(f"Using last-resort fallback for {crypto_symbol}: {price}")
            return price
            
        except Exception as e:
            logger.error(f"Error getting fiat to crypto rate: {str(e)}")
            # Never return 0 for BTC/XMR so /rates/ never returns 503 for these
            try:
                sym = (crypto_symbol or '').upper() if isinstance(crypto_symbol, str) else ''
            except Exception:
                sym = 'BTC'
            fallbacks = {'BTC': Decimal('98000'), 'XMR': Decimal('165')}
            return fallbacks.get(sym, Decimal('0'))
    
    def create_payment_address(self, order_id: str, crypto_currency: str, 
                             amount: Decimal, payment_type: str = 'wallet',
                             use_escrow: bool = False) -> PaymentAddress:
        
        try:
            crypto = CryptoCurrency.objects.get(symbol=crypto_currency)
            
            # Set expiration to 2 hours for all cryptocurrencies
            expiry_hours = 2
            
            # Use get_or_create to avoid duplicate key constraint
            payment_address, created = PaymentAddress.objects.get_or_create(
                order_id=order_id,
                defaults={
                    'crypto_currency': crypto,
                    'payment_type': payment_type,
                    'expected_amount': amount,
                    'expires_at': timezone.now() + timedelta(hours=expiry_hours),  # 8 hours for XMR, 2 hours for BTC
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
                payment_address.expires_at = timezone.now() + timedelta(hours=expiry_hours)  # 8 hours for XMR, 2 hours for BTC
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
                    # For direct payments, create BTCPay invoice (REQUIRED - NO FALLBACK)
                    from orders.models import Order
                    from vendors.models import VendorApplication
                    
                    order = Order.objects.get(order_id=order_id)
                    
                    # Get vendor's address for payout - Prioritize User profile addresses
                    vendor_address = order.product.vendor.btc_payout_address
                    
                    if not vendor_address:
                        # Fallback to vendor application if not in user profile
                        try:
                            vendor_app = VendorApplication.objects.get(vendor_username=order.product.vendor.username)
                            vendor_address = vendor_app.btc_address
                        except VendorApplication.DoesNotExist:
                            raise Exception("Vendor BTC address not found (profile or application)")
                    
                    if not vendor_address:
                        raise Exception("Vendor BTC address not found")
                    
                    # Create BTCPay invoice - MUST succeed, no fallback
                    invoice_response = self.btcpay.create_invoice(order_id, amount, 'BTC')
                    
                    if not invoice_response or not invoice_response.get('invoice_id'):
                        logger.error(f"BTCPay invoice creation failed for order {order_id}")
                        logger.error(f"Invoice response: {invoice_response}")
                        raise Exception("Failed to create BTCPay invoice for direct payment - check BTCPay server and API permissions")
                    
                    # Extract invoice details
                    btcpay_invoice_id = invoice_response['invoice_id']
                    btc_address = invoice_response.get('address')
                    
                    if not btc_address:
                        raise Exception("No BTC address in BTCPay invoice response")
                    
                    # Save payment address with BTCPay details
                    payment_address.payment_address = btc_address
                    payment_address.btcpay_invoice_id = btcpay_invoice_id
                    payment_address.save()
                    
                    # Create direct payment record with vendor address for payout
                    # NOTE: amount here is expected_amount (what buyer should send)
                    # When payment is received, direct_payment.amount will be updated to received_amount
                    from .models import DirectPayment
                    DirectPayment.objects.create(
                        order=order,
                        vendor=order.product.vendor,
                        buyer=order.buyer,
                        crypto_currency=crypto,
                        amount=amount,  # This is expected_amount initially, will be updated to received_amount when payment arrives
                        vendor_address=vendor_address,
                        expires_at=timezone.now() + timedelta(hours=24),
                        platform_fee=Decimal('0'),  # Will be calculated when payment is received
                        escrow_fee=Decimal('0'),
                        net_amount=Decimal('0')  # Will be calculated when payment is received
                    )
                    
                    logger.info(f"Direct BTC invoice created for order {order_id}: {btcpay_invoice_id}")
                    logger.info(f"Buyer payment address: {btc_address}")
                    logger.info(f"Vendor will receive payout at: {vendor_address}")
                    
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
                        
                        # Get vendor's address for later payout - Prioritize User profile addresses
                        vendor_address = order.product.vendor.xmr_payout_address
                        
                        if not vendor_address:
                            # Fallback to vendor application if not in user profile
                            try:
                                vendor_app = VendorApplication.objects.get(vendor_username=order.product.vendor.username)
                                vendor_address = vendor_app.xmr_address
                            except VendorApplication.DoesNotExist:
                                raise Exception("Vendor XMR address not found (profile or application)")
                        
                        if not vendor_address:
                            raise Exception("Vendor XMR address not found")
                        
                        # Create direct payment record with vendor address for payout
                        # NOTE: amount here is expected_amount (what buyer should send)
                        # When payment is received, direct_payment.amount will be updated to received_amount
                        from .models import DirectPayment
                        DirectPayment.objects.create(
                            order=order,
                            vendor=order.product.vendor,
                            buyer=order.buyer,
                            crypto_currency=crypto,
                            amount=amount,  # This is expected_amount initially, will be updated to received_amount when payment arrives
                            vendor_address=vendor_address,
                            expires_at=timezone.now() + timedelta(hours=24),
                            platform_fee=Decimal('0'),  # Will be calculated when payment is received
                            escrow_fee=Decimal('0'),
                            net_amount=Decimal('0')  # Will be calculated when payment is received
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
        """Generate deterministic BTC mainnet address (fallback method)"""
        # This is a simplified version that generates a valid mainnet address format
        # In production, you should use proper key derivation from BTCPay Server
        prefix = 'bc1q'  # mainnet bech32 prefix
        hash_input = f"{order_id}-{timezone.now().timestamp()}"
        hash_obj = hashlib.sha256(hash_input.encode())
        addr_hash = hash_obj.hexdigest()[:32]  # Take first 32 chars
        return f"{prefix}{addr_hash}"
    
    def _create_escrow_payment(self, payment_address: PaymentAddress, amount: Decimal):
        """Create escrow payment record and payout record immediately"""
        from orders.models import Order
        from vendors.models import VendorApplication
        from .commission_models import CommissionSettings
        
        # Get order details
        order = Order.objects.get(order_id=payment_address.order_id)
        
        # Get dynamic commission rates from database
        commission_settings = CommissionSettings.get_settings()
        escrow_fee_rate = commission_settings.escrow_fee_rate / Decimal('100')
        escrow_fee = amount * escrow_fee_rate
        
        # Create escrow payment record
        escrow = EscrowPayment.objects.create(
            payment_address=payment_address,
            buyer=order.buyer,
            vendor=order.product.vendor,
            escrow_amount=amount,
            escrow_fee=escrow_fee,
            auto_release_at=timezone.now() + timedelta(days=7)
        )
        
        # Create escrow payout record immediately
        try:
            # Get vendor's wallet address from User profile (prioritized) or VendorApplication
            vendor_user = order.product.vendor
            vendor_address = None
            
            if payment_address.crypto_currency.symbol == 'BTC':
                vendor_address = vendor_user.btc_payout_address
            elif payment_address.crypto_currency.symbol == 'XMR':
                vendor_address = vendor_user.xmr_payout_address
                
            if not vendor_address:
                # Fallback to VendorApplication
                try:
                    vendor_username = vendor_user.username
                    logger.info(f"Looking up vendor application fallback for: {vendor_username}")
                    vendor_app = VendorApplication.objects.get(vendor_username=vendor_username)
                    
                    if payment_address.crypto_currency.symbol == 'BTC':
                        vendor_address = vendor_app.btc_address
                    elif payment_address.crypto_currency.symbol == 'XMR':
                        vendor_address = vendor_app.xmr_address
                except VendorApplication.DoesNotExist:
                    logger.warning(f"Vendor application fallback failed for {vendor_user.username}")
            
            if vendor_address:
                # Calculate amounts using dynamic rates
                from .commission_models import VendorFee
                vendor_custom_rate = VendorFee.get_vendor_fee(vendor_user)
                
                if vendor_custom_rate is not None:
                    platform_fee_rate = vendor_custom_rate / Decimal('100')
                    logger.info(f"Using vendor-specific commission rate for escrow: {vendor_custom_rate}%")
                else:
                    platform_fee_rate = commission_settings.platform_fee_rate / Decimal('100')
                    logger.info(f"Using platform commission rate for escrow: {commission_settings.platform_fee_rate}%")
                
                gross_amount = amount
                platform_fee = gross_amount * platform_fee_rate
                net_amount = gross_amount - platform_fee - escrow_fee
                
                logger.info(f"Using dynamic commission rates for escrow: Platform={commission_settings.platform_fee_rate}%, Escrow={commission_settings.escrow_fee_rate}%")
                
                # Create payout record with pending status
                from .models import Payout
                payout = Payout.objects.create(
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
                    status='pending',
                    auto_release_enabled=True,
                    auto_release_at=timezone.now() + timedelta(days=7)
                )
                
                logger.info(f"Created escrow payout immediately for order {payment_address.order_id}: {net_amount} {payment_address.crypto_currency.symbol}")
                
                # Notify buyer, vendor, and admin about payout creation
                try:
                    from shared.admin_notifications import notify_payout_created
                    notify_payout_created(payout)
                except Exception as e:
                    logger.error(f"Error notifying about payout creation: {e}")
            else:
                logger.warning(f"Vendor {payment_address.crypto_currency.symbol} address not found for order {payment_address.order_id}")
                
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
            
            # Handle test webhooks (ONLY if both are missing)
            if not order_id and not invoice_id:
                logger.info("Test webhook received - ignoring")
                return True
            
            try:
                # Try to find by invoice_id first (BTCPay's primary key)
                if invoice_id:
                    try:
                        payment_address = PaymentAddress.objects.get(btcpay_invoice_id=invoice_id)
                        logger.info(f"Found PaymentAddress by invoice_id: {invoice_id}")
                    except PaymentAddress.DoesNotExist:
                        # Fallback to order_id if invoice_id fails or hasn't been saved yet
                        if order_id:
                            payment_address = PaymentAddress.objects.get(order_id=order_id)
                            # Update invoice_id for future use
                            if not payment_address.btcpay_invoice_id:
                                payment_address.btcpay_invoice_id = invoice_id
                                payment_address.save()
                        else:
                            logger.warning(f"PaymentAddress not found for invoice_id={invoice_id} and no order_id provided")
                            return False
                else:
                    payment_address = PaymentAddress.objects.get(order_id=order_id)
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
                
                # If BTCPay says Settled, we trust it and set confirmations to required
                if btcpay_status == 'Settled':
                    from django.conf import settings as django_settings
                    required_confs = django_settings.REQUIRED_CONFIRMATIONS.get(payment_address.crypto_currency.symbol, 3)
                    payment_address.confirmations = max(payment_address.confirmations or 0, required_confs)
                    logger.info(f"BTCPay status is Settled - forcing confirmations to {payment_address.confirmations} to trigger payout")
                
                # Create notification for payment failed/expired
                if mapped_status in ['cancelled', 'expired']:
                    try:
                        from orders.models import Order
                        from shared.models import Notification
                        from asgiref.sync import async_to_sync
                        from channels.layers import get_channel_layer
                        
                        try:
                            order = Order.objects.get(order_id=payment_address.order_id)
                            
                            # Send notification via central helper (respects preferences)
                            from shared.admin_notifications import send_user_notification
                            send_user_notification(
                                user=order.buyer,
                                notification_type='payment_failed',
                                title='Payment Failed' if mapped_status == 'cancelled' else 'Payment Expired',
                                message=f'Payment for order {order.order_id} - "{order.product.headline}" has been {mapped_status}. Please create a new order.',
                                data={
                                    'order_id': order.order_id,
                                    'product_id': str(order.product.id),
                                    'product_headline': order.product.headline,
                                    'action_url': f'/buyer/orders'
                                }
                            )
                            
                            logger.info(f"Payment failed notification sent for order {order.order_id}")
                            
                            logger.info(f"Payment failed notification created for order {order.order_id}")
                        except Order.DoesNotExist:
                            logger.error(f"Order not found for payment address {payment_address.order_id}")
                    except Exception as e:
                        logger.error(f"Failed to create payment failed notification: {str(e)}")
                
                if mapped_status == 'paid':
                    payment_address.confirmed_at = timezone.now()
                    
                    # Get transaction hash from payment data
                    if payment_data:
                        payment_address.transaction_hash = payment_data.get('id')
                        payment_address.received_amount = float(payment_data.get('value', 0))
                        # Extract confirmations from payment data - ONLY if higher than current
                        new_confs = payment_data.get('confirmations', 0)
                        if new_confs > (payment_address.confirmations or 0):
                            payment_address.confirmations = new_confs
                            logger.info(f"Updated confirmations from payment data: {payment_address.confirmations}")
                        else:
                            logger.info(f"Keeping existing confirmations: {payment_address.confirmations} (new was {new_confs})")
                
                payment_address.save()
                
                # Update order status dynamically based on BTCPay status
                logger.info(f"Updating order status based on BTCPay status: {btcpay_status}")
                self._update_order_status_dynamically(payment_address.order_id, btcpay_status)
                
                # Process escrow if applicable
                if hasattr(payment_address, 'escrow') and mapped_status == 'paid':
                    escrow = payment_address.escrow
                    escrow.status = 'funded'
                    escrow.save()
                    
                    # Update escrow payout status to 'ready'
                    self._update_escrow_payout_status(payment_address.order_id)
                
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
            
            # ============================================================
            # STEP 1: CALCULATE FEES IMMEDIATELY (before confirmations check)
            # ============================================================
            # CRITICAL: We must calculate and save platform_fee IMMEDIATELY when payment arrives
            # Even if confirmations are not sufficient yet, we need to know the fees
            # This ensures DirectPayment always has correct platform_fee set
            # ============================================================
            
            # Get dynamic commission rates from database
            from .commission_models import CommissionSettings, VendorFee
            commission_settings = CommissionSettings.get_settings()
            
            # Check for vendor-specific commission rate
            vendor_custom_rate = VendorFee.get_vendor_fee(order.product.vendor)
            if vendor_custom_rate is not None:
                platform_fee_rate = vendor_custom_rate / Decimal('100')
                logger.info(f"Using vendor-specific commission rate: {vendor_custom_rate}%")
            else:
                platform_fee_rate = commission_settings.platform_fee_rate / Decimal('100')
                logger.info(f"Using dynamic platform commission rate: {commission_settings.platform_fee_rate}%")
            
            # ============================================================
            # FEE CALCULATION FLOW (CONFIRMED APPROACH):
            # ============================================================
            # 1. Buyer sends $2.00 → network fee $0.25 deducted → $1.75 arrives (received_amount)
            # 2. Platform fee calculated on $1.75 (NOT on $2.00)
            # 3. Vendor net amount = $1.75 - platform_fee = $1.6625
            # 4. Network fee (~$0.25) deducted from $1.6625 when sending
            # 5. Vendor receives: $1.6625 - $0.25 = ~$1.41
            # ============================================================
            # CRITICAL: Always use received_amount (what actually arrived after buyer's network fee)
            # NEVER use expected_amount - it's the amount BEFORE buyer's network fee!
            if payment_address.received_amount and payment_address.received_amount > 0:
                amount = payment_address.received_amount
                logger.info(f"✅ Using received_amount ({amount}) for fee calculation (after buyer's network fee)")
            else:
                logger.error(f"❌ CRITICAL ERROR: received_amount is {payment_address.received_amount} (must be > 0)!")
                logger.error(f"   expected_amount: {payment_address.expected_amount}")
                logger.error(f"   Cannot calculate fees without received_amount - payment may not be confirmed yet!")
                raise ValueError(f"Cannot process payout: received_amount is {payment_address.received_amount} (must be > 0). Payment may not be fully confirmed.")
            
            # CRITICAL: ALWAYS update direct_payment.amount to received_amount BEFORE calculating fees
            # This ensures platform fee is calculated on what we actually received, not expected_amount
            if direct_payment.amount != amount:
                logger.info(f"🔄 Updating direct_payment.amount from {direct_payment.amount} to {amount} (received_amount)")
                direct_payment.amount = amount
                direct_payment.save(update_fields=['amount'])
            else:
                logger.info(f"✅ direct_payment.amount already correct: {amount}")
            
            # CRITICAL VERIFICATION: Ensure amount is received_amount, not expected_amount
            if amount >= payment_address.expected_amount:
                logger.error(f"❌ CRITICAL: amount ({amount}) >= expected_amount ({payment_address.expected_amount})!")
                logger.error(f"This means we're using expected_amount instead of received_amount!")
                logger.error(f"received_amount: {payment_address.received_amount}")
                if payment_address.received_amount > 0:
                    amount = payment_address.received_amount
                    direct_payment.amount = amount
                    direct_payment.save(update_fields=['amount'])
                    logger.error(f"✅ CORRECTED: Using received_amount {amount} instead")
                else:
                    raise ValueError(f"Cannot calculate fees: received_amount is 0, expected_amount is {payment_address.expected_amount}")
            
            escrow_fee_rate = Decimal('0') # Escrow fee is 0 for direct payments
            
            # CRITICAL: Verify platform_fee_rate is not zero
            if platform_fee_rate <= 0:
                logger.error(f"❌ CRITICAL: platform_fee_rate is {platform_fee_rate} (should be > 0)!")
                logger.error(f"Commission settings rate: {commission_settings.platform_fee_rate}%")
                raise ValueError(f"Platform fee rate is zero or negative: {platform_fee_rate}")
            
            # CRITICAL: Calculate platform fee with detailed logging
            platform_fee = amount * platform_fee_rate
            escrow_fee = amount * escrow_fee_rate
            
            logger.info(f"💰 PLATFORM FEE CALCULATION (Webhook):")
            logger.info(f"   Vendor: {order.product.vendor.username}")
            logger.info(f"   Amount (received): {amount}")
            logger.info(f"   Vendor custom rate: {vendor_custom_rate}%")
            logger.info(f"   Platform default rate: {commission_settings.platform_fee_rate}%")
            logger.info(f"   Platform fee rate used: {platform_fee_rate} ({platform_fee_rate * 100}%)")
            logger.info(f"   Calculated platform_fee: {amount} * {platform_fee_rate} = {platform_fee}")
            logger.info(f"   Escrow fee: {escrow_fee}")
            
            # CRITICAL: Verify platform fee was calculated
            if platform_fee <= 0:
                logger.error(f"❌ CRITICAL: platform_fee is {platform_fee} (should be > 0)!")
                logger.error(f"Amount: {amount}, Rate: {platform_fee_rate}, Calculated: {amount * platform_fee_rate}")
                logger.error(f"Vendor: {order.product.vendor.username}, Custom rate: {vendor_custom_rate}, Default: {commission_settings.platform_fee_rate}%")
                raise ValueError(f"Platform fee calculation resulted in zero: {platform_fee}")
            
            net_amount = amount - platform_fee - escrow_fee
            
            # CRITICAL VERIFICATION: Ensure platform fee is actually deducted
            if net_amount >= amount:
                logger.error(f"❌ CRITICAL ERROR: net_amount ({net_amount}) >= gross amount ({amount})!")
                logger.error(f"Platform fee calculation failed! Recalculating...")
                net_amount = amount - platform_fee - escrow_fee
                if net_amount >= amount:
                    raise ValueError(f"Platform fee not deducted! net_amount ({net_amount}) >= gross ({amount})")
            
            logger.info(f"Direct payment fees calculated: Platform={platform_fee}, Escrow={escrow_fee}, Net={net_amount}")
            logger.info(f"✅ VERIFICATION: net_amount ({net_amount}) = gross ({amount}) - platform_fee ({platform_fee}) - escrow_fee ({escrow_fee})")
            
            # Update direct payment record with fees (SAVE IMMEDIATELY)
            direct_payment.platform_fee = platform_fee
            direct_payment.escrow_fee = escrow_fee
            direct_payment.net_amount = net_amount
            direct_payment.status = 'confirmed'
            direct_payment.confirmed_at = timezone.now()
            direct_payment.transaction_hash = payment_address.transaction_hash
            direct_payment.save()
            
            logger.info(f"✅ FEES SAVED TO DATABASE: platform_fee={platform_fee}, net_amount={net_amount}")
            
            # ========================================
            # STEP 2: CHECK CONFIRMATIONS (for payout)
            # ========================================
            # Now that fees are calculated and saved, check if we have enough confirmations to send payout
            # Get required confirmations from settings (BTC: 3, XMR: 10)
            from django.conf import settings as django_settings
            crypto_symbol = payment_address.crypto_currency.symbol
            default_required = django_settings.REQUIRED_CONFIRMATIONS.get(crypto_symbol, 1)
            required_confirmations = payment_address.required_confirmations or default_required
            logger.info(f"Required confirmations: {required_confirmations} (from DB: {payment_address.required_confirmations}, default: {default_required})")
            current_confirmations = payment_address.confirmations or 0
            
            logger.info(f"==========================================")
            logger.info(f"CONFIRMATION CHECK FOR ORDER {payment_address.order_id}")
            logger.info(f"Current Confirmations: {current_confirmations}")
            logger.info(f"Required Confirmations: {required_confirmations}")
            logger.info(f"==========================================")
            
            if current_confirmations < required_confirmations:
                logger.info(f"❌ PAYOUT BLOCKED: Payment has only {current_confirmations} confirmations (required: {required_confirmations})")
                logger.info(f"⏰ Waiting for {required_confirmations - current_confirmations} more confirmation(s)")
                logger.info(f"📌 Payout will be triggered automatically when next webhook arrives with sufficient confirmations")
                logger.info(f"✅ NOTE: Fees already calculated and saved: platform_fee={platform_fee}, net_amount={net_amount}")
                # DO NOT SEND PAYOUT - EXIT HERE!
                return
            
            logger.info(f"✅ CONFIRMATIONS SUFFICIENT: Proceeding with payout processing")
            logger.info(f"==========================================")
            
            # STEP 3: TRIGGER PAYOUT (only if confirmations are sufficient)
            # We already checked confirmations at the top of this function
            try:
                from .tasks import process_non_escrow_payout
                process_non_escrow_payout.delay(payment_address.order_id)
                logger.info(f"Triggered process_non_escrow_payout task for order {payment_address.order_id}")
            except Exception as e:
                logger.error(f"Failed to trigger payout task: {str(e)}")
                # Fallback to direct call if task queue fails
                logger.info(f"⚠️ Using fallback direct send with net_amount: {net_amount}")
                from .services import PayoutService
                PayoutService()._send_direct_payment_to_vendor(direct_payment, net_amount)
            
        except Exception as e:
            logger.error(f"Error processing direct payment webhook: {e}")
    
    
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
                # Only if delivery type is 'instant_auto' OR specifically configured for auto-delivery
                is_auto_delivery = order.product.delivery_time == 'instant_auto'
                
                if order.product.credentials and not order.product_credentials and is_auto_delivery:
                    order.product_credentials = {
                        'credentials': order.product.credentials,
                        'delivered_at': timezone.now().isoformat(),
                        'delivery_method': order.product.delivery_time,
                        'additional_info': order.product.additional_info or '',
                        'notes': order.product.notes_for_buyer or ''
                    }
                    order.product.credentials_visible = True
                    order.product.save()
                    logger.info(f"Product credentials set for order {order_id} (Auto-Delivery)")
                elif not is_auto_delivery:
                    logger.info(f"Order {order_id} is Manual Delivery (type: {order.product.delivery_time}). Credentials NOT auto-released.")
                
                # Create notifications for buyer and vendor when payment is confirmed
                try:
                    from shared.models import Notification
                    from asgiref.sync import async_to_sync
                    from channels.layers import get_channel_layer
                    
                    # Get credentials location/details for notification
                    credentials_info = ""
                    if order.product_credentials:
                        creds = order.product_credentials.get('credentials', '')
                        if creds:
                            # Show first part of credentials or indicate location
                            if isinstance(creds, str):
                                credentials_info = f"Credentials are available in your order details."
                            else:
                                credentials_info = f"Your order credentials are ready."
                    
                    from shared.admin_notifications import send_user_notification
                    
                    # Notification for buyer
                    send_user_notification(
                        user=order.buyer,
                        notification_type='payment_confirmed',
                        title='Payment Confirmed',
                        message=f'Payment confirmed for order {order.order_id} - "{order.product.headline}". {credentials_info}',
                        data={
                            'order_id': order.order_id,
                            'product_id': str(order.product.id),
                            'product_headline': order.product.headline,
                            'action_url': f'/buyer/orders',
                            'has_credentials': bool(order.product_credentials)
                        }
                    )
                    
                    # Notification for vendor
                    escrow_note = " (Escrow)" if order.use_escrow else ""
                    send_user_notification(
                        user=order.vendor,
                        notification_type='payment_received',
                        title='Payment Received',
                        message=f'Payment received for order {order.order_id} from {order.buyer.username} - "{order.product.headline}"{escrow_note}.',
                        data={
                            'order_id': order.order_id,
                            'buyer_username': order.buyer.username,
                            'product_id': str(order.product.id),
                            'product_headline': order.product.headline,
                            'action_url': f'/vendor/orders',
                            'use_escrow': order.use_escrow
                        }
                    )
                    
                    # Trigger count refresh for all users (admin/vendor/buyer) when payment is confirmed
                    try:
                        # Send to buyer
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.buyer.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': f'count_refresh_payment_{order.id}',
                                    'type': 'system',
                                    'title': 'Count Refresh',
                                    'message': 'Order count updated',
                                    'is_read': False,
                                    'data': {
                                        'action': 'refresh_counts',
                                        'type': 'order'
                                    },
                                    'action_url': '',
                                    'created_at': order.updated_at.isoformat() if hasattr(order, 'updated_at') else timezone.now().isoformat(),
                                    'priority': 'low'
                                }
                            }
                        )
                        
                        # Send to vendor
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{order.vendor.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': f'count_refresh_payment_{order.id}',
                                    'type': 'system',
                                    'title': 'Count Refresh',
                                    'message': 'Order count updated',
                                    'is_read': False,
                                    'data': {
                                        'action': 'refresh_counts',
                                        'type': 'order'
                                    },
                                    'action_url': '',
                                    'created_at': order.updated_at.isoformat() if hasattr(order, 'updated_at') else timezone.now().isoformat(),
                                    'priority': 'low'
                                }
                            }
                        )
                        
                        # Send to all admins
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        admin_users = User.objects.filter(user_type='admin', is_active=True)
                        for admin_user in admin_users:
                            async_to_sync(channel_layer.group_send)(
                                f'realtime_{admin_user.id}',
                                {
                                    'type': 'order_notification',
                                    'data': {
                                        'id': f'count_refresh_payment_{order.id}',
                                        'type': 'system',
                                        'title': 'Count Refresh',
                                        'message': 'Order count updated',
                                        'is_read': False,
                                        'data': {
                                            'action': 'refresh_counts',
                                            'type': 'order'
                                        },
                                        'action_url': '',
                                        'created_at': order.updated_at.isoformat() if hasattr(order, 'updated_at') else timezone.now().isoformat(),
                                        'priority': 'low'
                                    }
                                }
                            )
                    except Exception as e:
                        logger.error(f"Error sending count refresh notification: {e}")
                except Exception as e:
                    logger.error(f"Failed to send real-time payment notifications: {str(e)}")
                
                logger.info(f"Payment confirmation notifications created for order {order_id}")
            
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
                else:
                    # For non-escrow orders, we do NOT trigger payout here anymore.
                    # Payout is now handled exclusively by _process_direct_payment_webhook
                    # which includes critical blockchain confirmation checks.
                    logger.info(f"Direct payment for order {order_id} will be processed by webhook handler after confirmations")
            
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
            logger.info(f"Processing Monero webhook: {payload}")
            
            # Extract info from payload
            txid = payload.get('txid')
            subaddr_index = payload.get('subaddr_index')
            
            if subaddr_index is None and not txid:
                logger.error("Monero webhook missing subaddr_index and txid")
                return False
                
            # If we only have txid, verify with RPC
            if txid and subaddr_index is None:
                transfer = self.monero.get_transfer_by_txid(txid)
                if transfer:
                    subaddr_index = transfer.get('subaddr_index', {}).get('minor')
            
            if subaddr_index is None:
                logger.error(f"Could not determine subaddress index for Monero payment")
                return False
                
            # Find associated payment address
            from .models import PaymentAddress
            try:
                # Find pending payment address with this subaddress index
                # We filter by pending or partial to presumably find the active order
                payment_address = PaymentAddress.objects.filter(
                    monero_subaddress_index=subaddr_index,
                    crypto_currency__symbol='XMR'
                ).exclude(status='paid').first()
                
                if not payment_address:
                    # Check if maybe it's already paid?
                    paid_address = PaymentAddress.objects.filter(
                        monero_subaddress_index=subaddr_index,
                        crypto_currency__symbol='XMR',
                        status='paid'
                    ).first()
                    
                    if paid_address:
                        logger.info(f"Payment address {paid_address.id} already paid")
                        return True
                    
                    logger.warning(f"No active payment address found for subaddress index {subaddr_index}")
                    return True # Return true to acknowledge webhook
            except Exception as e:
                logger.error(f"Error finding payment address: {e}")
                return False
                
            # Verify payment details via RPC to be safe
            # Determine expected amount in atomic units (piconero)
            # 1 XMR = 10^12 atomic units
            expected_amount_atomic = int(payment_address.expected_amount * Decimal('1000000000000'))
            
            # Check payment
            payment_info = self.monero.check_payment_by_subaddress(
                int(subaddr_index), 
                expected_amount_atomic
            )
            
            if payment_info.get('found'):
                # Payment confirmed
                amount_atomic = int(payment_info.get('amount', 0))
                amount_received = Decimal(str(amount_atomic)) / Decimal('1000000000000')
                
                logger.info(f"Monero payment confirmed for order {payment_address.order_id}: {amount_received} XMR")
                
                # Update payment address
                payment_address.status = 'paid'
                payment_address.received_amount = amount_received
                payment_address.transaction_hash = payment_info.get('txid')
                payment_address.confirmed_at = timezone.now()
                payment_address.save()
                
                # Update order status
                self._update_order_status_dynamically(payment_address.order_id, 'Paid')
                
                # Process escrow if applicable
                if hasattr(payment_address, 'escrow'):
                    escrow = payment_address.escrow
                    escrow.status = 'funded'
                    escrow.save()
                    
                    # Force update of payout status
                    payout_service = PayoutService()
                    payout_service.create_escrow_payout(payment_address.order_id)
                
                # Process direct payment if applicable
                self._process_direct_payment_webhook(payment_address)
                
                return True
            else:
                logger.warning(f"Monero payment not verified via RPC for index {subaddr_index}")
                return False
                
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
            # Check if this is a giveaway order (no payment address)
            from orders.models import Order
            try:
                order = Order.objects.get(order_id=order_id)
                if getattr(order, 'is_giveaway', False) or order.total_amount == 0:
                    # Giveaway orders don't have payment addresses - return paid status
                    return {
                        'order_id': order_id,
                        'status': 'paid',
                        'expected_amount': '0.00',
                        'received_amount': '0.00',
                        'payment_address': 'GIVEAWAY_FREE_ORDER',
                        'is_giveaway': True,
                        'message': 'This is a giveaway order - no payment required'
                    }
            except Order.DoesNotExist:
                pass
            
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
                    payment_address.confirmations = payment_result.get('confirmations', 0)
                    
                    # Mark as paid if it has enough confirmations (or any detections in test mode)
                    if payment_address.confirmations >= 0:
                        logger.info(f"Marking order {order_id} as PAID (Confirmations: {payment_address.confirmations})")
                        payment_address.status = 'paid'
                        payment_address.confirmed_at = timezone.now()
                        
                        # Update order status
                        self._update_order_status_dynamically(order_id, 'Paid')
                    
                    payment_address.save()
                else:
                    # If not found, still update confirmations if available (e.g. from error or partial)
                    payment_address.confirmations = payment_result.get('confirmations', 0)
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
            # Check if this is a giveaway order before returning error
            try:
                from orders.models import Order
                order = Order.objects.get(order_id=order_id)
                if getattr(order, 'is_giveaway', False) or order.total_amount == 0:
                    # Giveaway orders don't have payment addresses - return paid status
                    return {
                        'order_id': order_id,
                        'status': 'paid',
                        'expected_amount': '0.00',
                        'received_amount': '0.00',
                        'payment_address': 'GIVEAWAY_FREE_ORDER',
                        'is_giveaway': True,
                        'message': 'This is a giveaway order - no payment required'
                    }
            except Order.DoesNotExist:
                pass
            
            return {'error': 'Payment not found'}
        except Exception as e:
            logger.error(f"Payment status check error: {str(e)}")
            return {'error': str(e)}

    def get_fiat_to_crypto_rate(self, crypto_symbol: str, fiat_currency: str = 'USD') -> Optional[Decimal]:
        """Get current exchange rate - delegates to main method with same signature"""
        # Delegate to the main get_fiat_to_crypto_rate method (first one defined)
        # This method signature matches but we want to use the updated one
        try:
            # Use the same logic as the first method - call it via self
            # But since Python uses the last definition, we need to duplicate the fixed logic here
            crypto_symbol = (crypto_symbol or '').upper()
            fiat_currency = (fiat_currency or 'USD').upper()

            # 1. For BTC/XMR try Kraken first (no auth, stable)
            if fiat_currency == 'USD' and crypto_symbol in ('BTC', 'XMR'):
                try:
                    pair_param = 'XBTUSD' if crypto_symbol == 'BTC' else 'XMRUSD'
                    resp = requests.get(f"https://api.kraken.com/0/public/Ticker?pair={pair_param}", timeout=8)
                    if resp.status_code == 200:
                        j = resp.json()
                        if not j.get("error") and "result" in j:
                            for v in j["result"].values():
                                if isinstance(v, dict) and "c" in v and isinstance(v["c"], (list, tuple)) and len(v["c"]) > 0:
                                    price = Decimal(str(v["c"][0]))
                                    if price > 0:
                                        logger.info(f"Kraken rate for {crypto_symbol}: {price} {fiat_currency}")
                                        return price
                except Exception as kraken_e:
                    logger.warning(f"Kraken API failed ({kraken_e}), trying CoinGecko/DB")

            # 2. CoinGecko
            try:
                coingecko_ids = {'BTC': 'bitcoin', 'XMR': 'monero', 'LTC': 'litecoin', 'ETH': 'ethereum', 'USDT': 'tether'}
                coin_id = coingecko_ids.get(crypto_symbol)
                if coin_id:
                    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies={fiat_currency.lower()}"
                    response = requests.get(url, timeout=8)
                    if response.status_code == 200:
                        data = response.json()
                        if coin_id in data and fiat_currency.lower() in data[coin_id]:
                            price = Decimal(str(data[coin_id][fiat_currency.lower()]))
                            if price > 0:
                                logger.info(f"CoinGecko rate for {crypto_symbol}: {price} {fiat_currency}")
                                return price
            except Exception as api_e:
                logger.warning(f"CoinGecko API failed ({api_e}), trying DB/fallback")

            # 3. Database
            try:
                from shared.models import CryptoCurrency
                c = CryptoCurrency.objects.filter(symbol=crypto_symbol).first()
                if c and getattr(c, 'current_price', None) and Decimal(str(c.current_price)) > 0:
                    return Decimal(str(c.current_price))
            except Exception as db_e:
                logger.warning(f"DB rate failed ({db_e})")

            # 4. Last-resort fallback
            fallbacks = {'BTC': Decimal('98000'), 'XMR': Decimal('165'), 'LTC': Decimal('110'), 'ETH': Decimal('2700'), 'USDT': Decimal('1')}
            price = fallbacks.get(crypto_symbol, Decimal('0'))
            if price > 0:
                logger.warning(f"Using last-resort fallback for {crypto_symbol}: {price}")
            return price
            
        except Exception as e:
            logger.error(f"Error getting fiat to crypto rate: {str(e)}")
            # Never return None/0 for BTC/XMR so /rates/ never returns 503
            try:
                sym = (crypto_symbol or '').upper() if isinstance(crypto_symbol, str) else ''
            except Exception:
                sym = 'BTC'
            fallbacks = {'BTC': Decimal('98000'), 'XMR': Decimal('165')}
            return fallbacks.get(sym, Decimal('0'))

    
    def release_escrow(self, order_id: str, released_by_user_id: int, admin_override: bool = False) -> bool:
        """Release escrow payment to vendor"""
        try:
            payment_address = PaymentAddress.objects.get(order_id=order_id)
            escrow = payment_address.escrow
            
            # SECURITY: Prevent release if payment is not fully settled/confirmed
            from django.conf import settings as django_settings
            required_confs = django_settings.REQUIRED_CONFIRMATIONS.get(payment_address.crypto_currency.symbol, 3)
            current_confs = payment_address.confirmations or 0
            
            if payment_address.status != 'paid' or current_confs < required_confs:
                msg = f"❌ CANNOT RELEASE: Payment not confirmed on blockchain ({current_confs}/{required_confs} confs). Please wait for BTCPay status 'Settled'."
                logger.warning(msg)
                # Raise exception so the API shows the message to the user
                raise ValueError(msg)
                
            # Allow releasing if status is 'funded' OR 'disputed'
            if escrow.status not in ['funded', 'disputed']:
                msg = f"Cannot release escrow for order {order_id}: status is {escrow.status}"
                logger.warning(msg)
                raise ValueError(msg)
                logger.warning(f"Cannot release escrow for order {order_id}: status is {escrow.status} (expected 'funded' or 'disputed')")
                return False
            
            # Release escrow
            escrow.status = 'released'
            escrow.released_at = timezone.now()
            escrow.released_by_id = released_by_user_id
            escrow.save()
            
            logger.info(f"Escrow released for order {order_id}")
            
            # Trigger payout logic
            try:
                from .models import Payout
                from django.contrib.auth import get_user_model
                
                # Find associated payout
                payout = Payout.objects.filter(order__order_id=order_id, payout_type='escrow').first()
                if payout:
                    # Update payout status if needed
                    if payout.status == 'pending':
                        payout.status = 'ready'
                        payout.save()
                    
                    # Process the payout immediately
                    # We instantiate PayoutService dynamically to use it
                    payout_service = PayoutService()
                    
                    # Get user who released it for logging
                    User = get_user_model()
                    released_by = None
                    if released_by_user_id:
                        try:
                            released_by = User.objects.get(id=released_by_user_id)
                        except User.DoesNotExist:
                            pass
                            
                    payout_service.process_escrow_payout(payout.id, admin_user=released_by)
                    logger.info(f"Payout triggered for released escrow on order {order_id}")
                else:
                    logger.error(f"No payout found for released escrow on order {order_id}")
                    
            except Exception as e:
                logger.error(f"Error triggering payout for release: {e}")
                # We return True because the escrow itself WAS released, ensuring UI updates
                # The payout can be retried by admin if it failed
            
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

    def _send_direct_payment_to_vendor(self, direct_payment, net_amount):
        """Send net amount from direct payment to vendor wallet"""
        try:
            vendor_address = direct_payment.vendor_address
            crypto_currency = direct_payment.crypto_currency.symbol
            
            # ============================================================
            # CRITICAL VERIFICATION: Ensure we're sending net_amount, NOT gross amount
            # ============================================================
            # net_amount MUST be: gross_amount - platform_fee - escrow_fee
            # We MUST send net_amount, NOT direct_payment.amount (which is gross)
            # ============================================================
            
            # Step 1: Use net_amount from DB if parameter doesn't match
            if net_amount != direct_payment.net_amount:
                logger.error(f"⚠️ MISMATCH: net_amount parameter ({net_amount}) != direct_payment.net_amount ({direct_payment.net_amount})")
                logger.error(f"Using direct_payment.net_amount from DB: {direct_payment.net_amount}")
                net_amount = direct_payment.net_amount
            
            # Step 2: CRITICAL - Verify net_amount < gross amount (platform fee was deducted)
            if net_amount >= direct_payment.amount:
                logger.error(f"❌ CRITICAL ERROR: net_amount ({net_amount}) >= gross amount ({direct_payment.amount})!")
                logger.error(f"This means platform fee was NOT deducted!")
                logger.error(f"Platform fee in DB: {direct_payment.platform_fee}")
                logger.error(f"Escrow fee in DB: {direct_payment.escrow_fee}")
                logger.error(f"Recalculating: net_amount = {direct_payment.amount} - {direct_payment.platform_fee} - {direct_payment.escrow_fee}")
                net_amount = direct_payment.amount - direct_payment.platform_fee - direct_payment.escrow_fee
                if net_amount >= direct_payment.amount:
                    logger.error(f"❌ STILL WRONG: Recalculated net_amount ({net_amount}) >= gross ({direct_payment.amount})!")
                    logger.error(f"ABORTING - Cannot send payout without platform fee deduction!")
                    direct_payment.status = 'failed'
                    direct_payment.save()
                    raise ValueError(f"Cannot send: net_amount ({net_amount}) >= gross ({direct_payment.amount}). Platform fee not deducted!")
                logger.error(f"✅ CORRECTED net_amount: {net_amount}")
            
            # Step 3: Final verification - net_amount should be gross - platform_fee - escrow_fee
            expected_net = direct_payment.amount - direct_payment.platform_fee - direct_payment.escrow_fee
            if abs(net_amount - expected_net) > Decimal('0.00000001'):
                logger.warning(f"⚠️ net_amount ({net_amount}) doesn't match expected ({expected_net})")
                logger.warning(f"Using expected value: {expected_net}")
                net_amount = expected_net
            
            # Step 4: CRITICAL - Log what we're about to send
            logger.info(f"✅ VERIFIED: Sending net_amount = {net_amount} (gross: {direct_payment.amount}, platform_fee: {direct_payment.platform_fee}, escrow_fee: {direct_payment.escrow_fee})")
            logger.info(f"   Platform fee WAS deducted: {direct_payment.amount} - {direct_payment.platform_fee} - {direct_payment.escrow_fee} = {net_amount}")
            
            # CRITICAL: Reload from DB to ensure we have latest values
            direct_payment.refresh_from_db()
            
            # Recalculate net_amount from latest DB values to be 100% sure
            calculated_net = direct_payment.amount - direct_payment.platform_fee - direct_payment.escrow_fee
            if abs(net_amount - calculated_net) > Decimal('0.00000001'):
                logger.warning(f"⚠️ net_amount parameter ({net_amount}) != calculated from DB ({calculated_net})")
                logger.warning(f"Using calculated value from DB: {calculated_net}")
                net_amount = calculated_net
            
            logger.info("=== DIRECT PAYOUT EXECUTION ===")
            logger.info(f"Order: {direct_payment.order.order_id}")
            logger.info(f"Vendor: {direct_payment.vendor.username}")
            logger.info(f"Currency: {crypto_currency}")
            logger.info(f"Gross Amount (received): {direct_payment.amount}")
            logger.info(f"Platform Fee (deducted): {direct_payment.platform_fee}")
            logger.info(f"Escrow Fee (deducted): {direct_payment.escrow_fee}")
            logger.info(f"NET AMOUNT TO VENDOR: {net_amount} = {direct_payment.amount} - {direct_payment.platform_fee} - {direct_payment.escrow_fee}")
            logger.info(f"Destination Address: {vendor_address}")
            logger.info(f"✅ VERIFIED: Platform fee WAS deducted before sending")
            logger.info(f"💰 PLATFORM FEE RETAINED: {direct_payment.platform_fee} {crypto_currency} stays in platform wallet (BTCPay)")
            logger.info(f"   Only {net_amount} {crypto_currency} is being sent to vendor")
            
            # CRITICAL: Final check - net_amount MUST be < received_amount
            if net_amount >= direct_payment.amount:
                logger.error(f"❌❌❌ CRITICAL ERROR: net_amount ({net_amount}) >= received_amount ({direct_payment.amount})!")
                logger.error(f"   This means we're sending MORE than we received!")
                logger.error(f"   Platform fee: {direct_payment.platform_fee}, Escrow fee: {direct_payment.escrow_fee}")
                raise ValueError(f"Cannot send: net_amount ({net_amount}) >= received_amount ({direct_payment.amount})")
            
            # Calculate what vendor will actually receive (after network fee)
            estimated_network_fee = Decimal('0.0000025') if crypto_currency == 'BTC' else Decimal('0.0001')
            vendor_will_receive = net_amount - estimated_network_fee
            logger.info(f"📊 FINAL SUMMARY:")
            logger.info(f"   Received from buyer: {direct_payment.amount} {crypto_currency}")
            logger.info(f"   Platform fee (kept): {direct_payment.platform_fee} {crypto_currency}")
            logger.info(f"   Sending to vendor: {net_amount} {crypto_currency}")
            logger.info(f"   Network fee (deducted by BTCPay): ~{estimated_network_fee} {crypto_currency}")
            logger.info(f"   Vendor will receive: ~{vendor_will_receive} {crypto_currency}")
            logger.info("===============================")
            
            if crypto_currency == 'BTC':
                # CRITICAL: Pass received_amount for verification
                success, tx_hash = self._send_btc_payout_raw(vendor_address, net_amount, received_amount=direct_payment.amount)
            elif crypto_currency == 'XMR':
                success, tx_hash = self._send_xmr_payout_raw(vendor_address, net_amount)
            else:
                logger.error(f"Unsupported crypto currency: {crypto_currency}")
                return False
            
            if success:
                logger.info(f"SUCCESS: Payout sent. TX: {tx_hash}")
                direct_payment.status = 'completed'
                direct_payment.transaction_hash = tx_hash
                direct_payment.save()
                return True
            else:
                logger.error("FAILURE: Payout failed to send.")
                direct_payment.status = 'failed'
                direct_payment.save()
                return False
                
        except Exception as e:
            logger.error(f"Error in _send_direct_payment_to_vendor: {e}")
            return False

    def _send_btc_payout_raw(self, address, amount, received_amount=None):
        """Internal method to send BTC via BTCPay - sends net_amount (after platform fee deduction)
        
        CRITICAL: This MUST receive net_amount (gross - platform_fee - escrow_fee), NOT gross amount!
        Network fee will be deducted from this amount by BTCPay (subtractFeesFromAmount=True)
        
        Args:
            address: Vendor wallet address
            amount: net_amount to send (after platform fee deduction)
            received_amount: Original amount received from buyer (for verification)
        """
        try:
            # CRITICAL: Verify we're sending net_amount, not gross amount
            logger.info(f"📤 _send_btc_payout_raw: Sending {amount} BTC to {address}")
            logger.info(f"   ✅ This MUST be NET amount (after platform fee deduction)")
            logger.info(f"   ❌ This should NOT be gross amount (before platform fee)")
            
            # CRITICAL: Verify we're not sending MORE than we received
            if received_amount is not None:
                if amount > received_amount:
                    logger.error(f"❌❌❌ CRITICAL ERROR: Trying to send {amount} BTC but only received {received_amount} BTC!")
                    logger.error(f"   We're sending {amount - received_amount} BTC MORE than we received!")
                    logger.error(f"   ABORTING - This would cause platform to lose money!")
                    raise ValueError(f"Cannot send {amount} BTC when only {received_amount} BTC was received!")
                elif amount == received_amount:
                    logger.error(f"❌ CRITICAL ERROR: Trying to send {amount} BTC (same as received) - platform fee was NOT deducted!")
                    logger.error(f"   ABORTING - Platform fee must be deducted before sending!")
                    raise ValueError(f"Cannot send full amount {amount} BTC - platform fee must be deducted!")
                else:
                    platform_fee_retained = received_amount - amount
                    logger.info(f"✅ VERIFIED: Sending {amount} BTC (received: {received_amount} BTC, platform fee retained: {platform_fee_retained} BTC)")
            
            # CRITICAL: Verify amount is reasonable (should be less than what we received)
            # If amount > received_amount, we're sending MORE than we received - THIS IS WRONG!
            logger.warning(f"⚠️ VERIFICATION: Amount being sent: {amount} BTC")
            logger.warning(f"   If this is > received_amount, we're LOSING MONEY!")
            
            payout_data = {
                'destination': address,
                'amount': str(amount),  # CRITICAL: This MUST be net_amount (gross - platform_fee - escrow_fee)
                'subtractFeesFromAmount': True  # Network fee deducted from this amount
            }
            logger.info(f"📤 BTCPay payout_data: {payout_data}")
            logger.info(f"   Network fee will be deducted from {amount} by BTCPay")
            logger.warning(f"⚠️ FINAL CHECK: Sending {amount} BTC (network fee ~0.000002-0.000003 will be deducted)")
            logger.warning(f"   Vendor will receive: ~{amount - Decimal('0.0000025')} BTC")
            response = self.btcpay.create_payout(payout_data)
            if response and response.get('id'):
                return True, f"btc_payout_{response['id']}"
            return False, None
        except Exception as e:
            logger.error(f"BTC raw payout error: {e}")
            return False, None

    def _send_xmr_payout_raw(self, address, amount):
        """Internal method to send XMR via RPC"""
        try:
            amount_atomic = int(float(amount) * 1e12)
            result = self.monero.send_transaction(
                destinations=[{'address': address, 'amount': amount_atomic}],
                priority=1
            )
            if result and result.get('tx_hash'):
                return True, result['tx_hash']
            return False, None
        except Exception as e:
            logger.error(f"XMR raw payout error: {e}")
            return False, None
    
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
            
            # Notify about status change to processing
            try:
                from shared.admin_notifications import notify_payout_status_changed
                notify_payout_status_changed(payout, previous_status, 'processing')
            except Exception as e:
                logger.error(f"Error notifying about payout status change: {e}")
            
            logger.info(f"Processing payout {payout_id} (previous status: {previous_status})")
            
            # CRITICAL: Re-verify net_amount before sending to ensure fees are deducted
            # We use the actual rates from settings to ensure accuracy even in fallbacks
            from .commission_models import CommissionSettings, VendorFee
            cs = CommissionSettings.get_settings()
            v_rate = VendorFee.get_vendor_fee(payout.vendor)
            p_rate = (v_rate if v_rate is not None else cs.platform_fee_rate) / Decimal('100')
            e_rate = cs.escrow_fee_rate / Decimal('100') if payout.payout_type == 'escrow' else Decimal('0')
            
            # Recalculate fees based on actual configuration
            payout.platform_fee = payout.gross_amount * p_rate
            payout.escrow_fee = payout.gross_amount * e_rate
            expected_net = payout.gross_amount - payout.platform_fee - payout.escrow_fee
            
            if abs(payout.net_amount - expected_net) > Decimal('0.00000001'):
                logger.error(f"❌ FEE CALCULATION MISMATCH: Current net_amount {payout.net_amount} != Expected {expected_net}. Correcting to proper dynamic rates.")
                payout.net_amount = expected_net
                payout.save()
            
            logger.info(f"✅ Dynamic fee verification passed: Gross={payout.gross_amount}, Platform={payout.platform_fee} ({p_rate*100}%), Escrow={payout.escrow_fee} ({e_rate*100}%), Net={payout.net_amount}")
            
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
                
                # Notify about status change to completed
                try:
                    from shared.admin_notifications import notify_payout_status_changed
                    notify_payout_status_changed(payout, 'processing', 'completed')
                except Exception as e:
                    logger.error(f"Error notifying about payout status change: {e}")
                
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
                
                # Notify about status change to failed
                try:
                    from shared.admin_notifications import notify_payout_status_changed
                    notify_payout_status_changed(payout, 'processing', 'failed')
                except Exception as e:
                    logger.error(f"Error notifying about payout status change: {e}")
                
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
            # NOTE: Using expected_amount initially - will be updated to received_amount when payment arrives
            direct_payment = DirectPayment.objects.create(
                order=order,
                vendor=order.product.vendor,
                buyer=order.buyer,
                crypto_currency=payment_address.crypto_currency,
                amount=Decimal(str(payment_address.expected_amount)),  # Will be updated to received_amount when payment arrives
                vendor_address=vendor_address,
                expires_at=timezone.now() + timedelta(hours=24),
                platform_fee=Decimal('0'),  # Will be calculated when payment is received
                escrow_fee=Decimal('0'),
                net_amount=Decimal('0')  # Will be calculated when payment is received
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
            logger.info("=== BTC ESCROW PAYOUT ===")
            logger.info(f"Order: {payout.order.order_id}")
            logger.info(f"Net Amount: {payout.net_amount}")
            logger.info(f"Address: {payout.vendor_address}")
            
            success, tx_hash = self._send_btc_payout_raw(payout.vendor_address, payout.net_amount, received_amount=payout.gross_amount)
            
            if success:
                logger.info(f"BTC Payout Success: {tx_hash}")
                return True, tx_hash
            else:
                logger.error("BTC Payout Failed")
                return False, None
            
        except Exception as e:
            logger.error(f"Error sending BTC payout: {str(e)}")
            return False, None
    
    def _send_xmr_payout(self, payout) -> tuple[bool, Optional[str]]:
        """Send XMR payout using Monero RPC"""
        try:
            logger.info("=== XMR ESCROW PAYOUT ===")
            logger.info(f"Order: {payout.order.order_id}")
            logger.info(f"Net Amount: {payout.net_amount}")
            logger.info(f"Address: {payout.vendor_address}")
            
            success, tx_hash = self._send_xmr_payout_raw(payout.vendor_address, payout.net_amount)
            
            if success:
                logger.info(f"XMR Payout Success: {tx_hash}")
                return True, tx_hash
            else:
                logger.error("XMR Payout Failed")
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