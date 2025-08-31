import time
import random
from decimal import Decimal
from django.conf import settings
from .models import PaymentAddress, PaymentStatus
from .services import BTCPayServerService, MoneroRPCService
from django.utils import timezone
from datetime import timedelta

class MockBTCPayService:
    """Mock BTCPay service for local development"""
    
    def create_invoice(self, order_id: str, amount: Decimal, currency: str = 'BTC') -> dict:
        """Create mock BTCPay invoice"""
        # Simulate API delay
        time.sleep(1)
        
        # Generate mock data
        mock_invoice = {
            'id': f'mock_invoice_{order_id}',
            'checkoutLink': f'http://localhost:3000/mock-payment/{order_id}',
            'addresses': {
                'BTC': f'tb1q{random.randint(1000000000000000000, 9999999999999999999)}'
            },
            'status': 'New',
            'amount': str(amount),
            'currency': currency
        }
        
        return mock_invoice
    
    def get_invoice_status(self, invoice_id: str) -> dict:
        """Get mock invoice status"""
        time.sleep(0.5)
        
        # Simulate payment progression
        statuses = ['New', 'Paid', 'Confirmed', 'Complete']
        current_status = random.choice(statuses)
        
        return {
            'id': invoice_id,
            'status': current_status,
            'amount': '0.001',
            'currency': 'BTC'
        }

class MockMoneroService:
    """Mock Monero service for local development"""
    
    def create_subaddress(self, account_index: int = 0, label: str = "") -> dict:
        """Create mock Monero subaddress"""
        time.sleep(1)
        
        # Generate mock address
        mock_address = f'9{random.randint(1000000000000000000, 9999999999999999999)}'
        
        return {
            'address': mock_address,
            'address_index': account_index
        }
    
    def get_balance(self, account_index: int = 0) -> dict:
        """Get mock wallet balance"""
        time.sleep(0.5)
        
        return {
            'balance': random.randint(100000000000, 999999999999),
            'unlocked_balance': random.randint(100000000000, 999999999999)
        }
    
    def check_payment(self, payment_id: str, amount: int) -> bool:
        """Mock payment check"""
        time.sleep(0.5)
        
        # Simulate 80% success rate
        return random.random() > 0.2

class MockPaymentService:
    """Mock payment service for local development"""
    
    def __init__(self):
        self.btcpay = MockBTCPayService()
        self.monero = MockMoneroService()
    
    def create_payment_address(self, order_id: str, crypto_currency: str, 
                             amount: Decimal, payment_type: str = 'wallet',
                             use_escrow: bool = False) -> PaymentAddress:
        """Create mock payment address"""
        
        # Simulate processing delay
        time.sleep(2)
        
        # Generate mock address based on cryptocurrency
        if crypto_currency == 'BTC':
            payment_address = f'tb1q{random.randint(1000000000000000000, 9999999999999999999)}'
        elif crypto_currency == 'XMR':
            payment_address = f'9{random.randint(1000000000000000000, 9999999999999999999)}'
        else:
            payment_address = f'mock_{crypto_currency}_{random.randint(1000000, 9999999)}'
        
        # Create payment address record
        payment_address_obj = PaymentAddress.objects.create(
            order_id=order_id,
            crypto_currency_id=crypto_currency,
            payment_type=payment_type,
            expected_amount=amount,
            payment_address=payment_address,
            expires_at=timezone.now() + timedelta(hours=2),
            required_confirmations=1
        )
        
        return payment_address_obj
    
    def simulate_payment_confirmation(self, order_id: str, delay_seconds: int = 5):
        """Simulate payment confirmation after delay"""
        import threading
        
        def confirm_payment():
            time.sleep(delay_seconds)
            
            try:
                payment_address = PaymentAddress.objects.get(order_id=order_id)
                payment_address.status = 'paid'
                payment_address.confirmed_at = timezone.now()
                payment_address.received_amount = payment_address.expected_amount
                payment_address.transaction_hash = f'mock_tx_{random.randint(1000000000000000000, 9999999999999999999)}'
                payment_address.save()
                
                print(f"✅ Mock payment confirmed for order {order_id}")
                
            except PaymentAddress.DoesNotExist:
                print(f"❌ Payment address not found for order {order_id}")
        
        # Run in background thread
        thread = threading.Thread(target=confirm_payment)
        thread.daemon = True
        thread.start()
        
        return True

# Factory function to get appropriate service
def get_payment_service():
    """Get payment service based on settings"""
    if getattr(settings, 'USE_MOCK_PAYMENTS', False):
        return MockPaymentService()
    else:
        # Return real services when not in mock mode
        from .services import PaymentService
        return PaymentService() 