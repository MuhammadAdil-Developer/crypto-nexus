#!/usr/bin/env python
"""
Test script to manually trigger direct payment monitoring
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from payments.tasks import check_direct_payment_status, simulate_direct_payment_detection
from payments.models import DirectPayment

def test_direct_payment_monitoring():
    print("=== Testing Direct Payment Monitoring ===")
    
    # 1. Check if there are any pending direct payments
    pending_payments = DirectPayment.objects.filter(status='pending')
    print(f"Found {pending_payments.count()} pending direct payments")
    
    if pending_payments.exists():
        for payment in pending_payments[:3]:  # Show first 3
            print(f"- Payment ID: {payment.id}, Order: {payment.order.order_id}, Amount: {payment.amount}")
    
    # 2. Run the monitoring task
    print("\n=== Running Direct Payment Monitoring Task ===")
    try:
        result = check_direct_payment_status.delay()
        print(f"Task submitted: {result.id}")
        print("Task result:", result.get(timeout=10))
    except Exception as e:
        print(f"Error running task: {e}")
    
    # 3. Test simulation if we have pending payments
    if pending_payments.exists():
        payment = pending_payments.first()
        print(f"\n=== Testing Payment Simulation ===")
        print(f"Simulating payment detection for payment {payment.id}")
        
        try:
            result = simulate_direct_payment_detection.delay(str(payment.id), "test_tx_123")
            print(f"Simulation task submitted: {result.id}")
            print("Simulation result:", result.get(timeout=10))
        except Exception as e:
            print(f"Error running simulation: {e}")

if __name__ == "__main__":
    test_direct_payment_monitoring()

