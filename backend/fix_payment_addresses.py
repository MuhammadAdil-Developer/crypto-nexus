#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from orders.models import Order
from payments.models import PaymentAddress
from payments.services import PaymentService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_payment_addresses():
    """Generate payment addresses for orders with empty payment addresses"""
    ps = PaymentService()
    empty_orders = Order.objects.filter(payment_address='')
    
    print(f"Found {empty_orders.count()} orders with empty payment addresses")
    
    for order in empty_orders:
        print(f"Processing {order.order_id}...")
        try:
            # Check if PaymentAddress already exists
            existing_payment = PaymentAddress.objects.filter(order_id=order.order_id).first()
            
            if existing_payment:
                # Use existing payment address
                order.payment_address = existing_payment.payment_address
                order.payment_expires_at = existing_payment.expires_at
                order.save()
                print(f"  Using existing: {order.payment_address}")
            else:
                # Create new payment address
                payment_address = ps.create_payment_address(
                    order.order_id, 
                    order.crypto_currency, 
                    order.total_amount
                )
                
                order.payment_address = payment_address.payment_address
                order.payment_expires_at = payment_address.expires_at
                order.save()
                
                print(f"  Generated: {order.payment_address}")
            
        except Exception as e:
            print(f"  Error: {e}")
    
    print("Done!")

if __name__ == "__main__":
    fix_payment_addresses() 