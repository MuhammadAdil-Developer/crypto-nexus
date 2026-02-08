# Quick Testing Guide - Payout Fee Fix

## 🚀 Method 1: Using Test Script (Fastest)

### Step 1: Find a recent paid order
```bash
# Go to backend directory
cd backend

# Open Django shell
python manage.py shell
```

```python
from orders.models import Order
from payments.models import DirectPayment, PaymentAddress

# Find recent paid orders (non-escrow)
recent_orders = Order.objects.filter(
    payment_status='paid',
    use_escrow=False
).order_by('-created_at')[:5]

for order in recent_orders:
    print(f"Order ID: {order.order_id}")
    print(f"  Amount: {order.total_amount}")
    print(f"  Status: {order.payment_status}")
    print(f"  Created: {order.created_at}")
    print("---")
```

### Step 2: Test payout with existing script
```bash
# Run the test script
python ../test_payout_direct.py
# Enter the Order ID when prompted
```

### Step 3: Check logs
```bash
# Check Django logs for detailed fee calculation
# Look for these log messages:
# - "--- FEE CALCULATION FOR ORDER ---"
# - "USD Equivalents (approx):"
# - "Expected vendor receive:"
```

---

## 🔍 Method 2: Check Existing Payouts (Verify Fix)

### Check recent payouts in database
```python
from payments.models import DirectPayment
from decimal import Decimal

# Get recent payouts
recent_payouts = DirectPayment.objects.filter(
    status='completed'
).order_by('-created_at')[:5]

for payout in recent_payouts:
    gross = payout.amount
    platform_fee = payout.platform_fee
    net = payout.net_amount
    
    # Calculate percentages
    fee_percent = (platform_fee / gross * 100) if gross > 0 else 0
    
    print(f"Order: {payout.order.order_id}")
    print(f"  Gross: {gross} BTC")
    print(f"  Platform Fee: {platform_fee} BTC ({fee_percent:.2f}%)")
    print(f"  Net Amount: {net} BTC")
    print(f"  Status: {payout.status}")
    print("---")
```

---

## 📊 Method 3: Manual Trigger (For Testing)

### Trigger payout for specific order
```python
from payments.tasks import process_non_escrow_payout

# Replace with actual order ID
order_id = "ORD-XXXXX"

# Trigger payout
result = process_non_escrow_payout(order_id)
print(result)
```

---

## ✅ What to Verify

### 1. Check Fee Calculation
- Platform fee should be **9%** (or whatever is set in CommissionSettings)
- NOT 60-70% like before!

### 2. Check Logs for These Messages:
```
--- FEE CALCULATION FOR ORDER ORD-XXXXX ---
Gross Amount: 0.00010004 BTC
Commission Rate: 9.0%
Platform Fee: 0.00000900 BTC (9.0% of gross)
NET AMOUNT TO VENDOR (before miner fees): 0.00009104 BTC
Expected miner fee: 0.00005 BTC (~$0.50-2.50 USD)
EXPECTED VENDOR RECEIVE (after miner fees): 0.00004104 BTC

USD Equivalents (approx):
  Gross: $4.00 USD
  Platform Fee: $0.36 USD
  Net (before miner fees): $3.64 USD
  Expected vendor receive: $1.64 USD
```

### 3. Verify Actual Transaction
- Check BTCPay Server wallet transactions
- Vendor should receive close to the "Expected vendor receive" amount
- Miner fees (~$0.50-2.50) will be deducted by BTCPay

### 4. Check Database
```python
from payments.models import DirectPayment

payout = DirectPayment.objects.get(order__order_id="ORD-XXXXX")
print(f"Platform Fee: {payout.platform_fee}")
print(f"Net Amount: {payout.net_amount}")
print(f"Status: {payout.status}")
```

---

## 🐛 If Issues Found

### Check Commission Settings
```python
from payments.commission_models import CommissionSettings

settings = CommissionSettings.get_settings()
print(f"Platform Fee Rate: {settings.platform_fee_rate}%")
```

### Check Wallet Balance
```python
from payments.services import BTCPayServerService

btcpay = BTCPayServerService()
balance = btcpay.get_wallet_balance()
print(f"Balance: {balance}")
```

---

## 📝 Quick Test Checklist

- [ ] Find a paid order (non-escrow)
- [ ] Trigger payout using test script
- [ ] Check logs for fee calculation
- [ ] Verify platform fee is ~9% (not 60-70%)
- [ ] Check vendor received correct amount
- [ ] Verify sweep logic didn't incorrectly cap amount
