"""
SECURITY MONITORING SYSTEM
Professional-grade wallet monitoring with alerts
"""

import os
import django
import requests
from decimal import Decimal
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
from payments.models import Payout, DirectPayment

# SECURITY THRESHOLDS
SECURITY_CONFIG = {
    # Transaction limits
    'MAX_SINGLE_TRANSACTION': Decimal('0.01'),  # 0.01 BTC (~$680)
    'MAX_HOURLY_TOTAL': Decimal('0.05'),        # 0.05 BTC (~$3400)
    'MAX_DAILY_TOTAL': Decimal('0.2'),          # 0.2 BTC (~$13600)
    
    # Hot wallet balance limits
    'HOT_WALLET_MIN_BALANCE': Decimal('0.005'),  # Alert if below
    'HOT_WALLET_MAX_BALANCE': Decimal('0.05'),   # Auto-sweep if above
    
    # Alert recipients
    'ALERT_EMAILS': ['admin@accountzclub.com', 'security@accountzclub.com'],
    
    # Monitoring intervals
    'CHECK_INTERVAL_MINUTES': 5,
}


def check_suspicious_activity():
    """
    Check for suspicious wallet activity
    """
    now = datetime.now()
    alerts = []
    
    # 1. Check hourly transaction volume
    one_hour_ago = now - timedelta(hours=1)
    hourly_payouts = Payout.objects.filter(
        created_at__gte=one_hour_ago,
        status='completed'
    )
    hourly_total = sum([p.net_amount for p in hourly_payouts])
    
    if hourly_total > SECURITY_CONFIG['MAX_HOURLY_TOTAL']:
        alerts.append({
            'severity': 'HIGH',
            'type': 'HOURLY_LIMIT_EXCEEDED',
            'message': f'Hourly transaction volume {hourly_total} BTC exceeds limit {SECURITY_CONFIG["MAX_HOURLY_TOTAL"]} BTC',
            'transactions': hourly_payouts.count()
        })
    
    # 2. Check daily transaction volume
    one_day_ago = now - timedelta(days=1)
    daily_payouts = Payout.objects.filter(
        created_at__gte=one_day_ago,
        status='completed'
    )
    daily_total = sum([p.net_amount for p in daily_payouts])
    
    if daily_total > SECURITY_CONFIG['MAX_DAILY_TOTAL']:
        alerts.append({
            'severity': 'HIGH',
            'type': 'DAILY_LIMIT_EXCEEDED',
            'message': f'Daily transaction volume {daily_total} BTC exceeds limit {SECURITY_CONFIG["MAX_DAILY_TOTAL"]} BTC',
            'transactions': daily_payouts.count()
        })
    
    # 3. Check for transactions without platform records (like the mystery $336)
    try:
        from payments.services import BTCPayServerService
        btcpay = BTCPayServerService()
        
        # Get recent BTCPay transactions
        wallet_url = f"{btcpay.base_url}/api/v1/stores/{btcpay.store_id}/payment-methods/onchain/BTC/wallet/transactions"
        response = requests.get(wallet_url, headers=btcpay.headers, timeout=10)
        
        if response.status_code == 200:
            btcpay_txs = response.json()
            
            # Check for transactions in last hour
            for tx in btcpay_txs[:20]:  # Check recent 20
                tx_hash = tx.get('transactionHash')
                timestamp = tx.get('timestamp')
                
                if timestamp:
                    tx_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    if tx_time > one_hour_ago:
                        # Check if this transaction is in our database
                        in_db = DirectPayment.objects.filter(tx_hash=tx_hash).exists() or \
                                Payout.objects.filter(tx_hash=tx_hash).exists()
                        
                        if not in_db and not tx.get('labels'):  # No labels = manual transaction
                            alerts.append({
                                'severity': 'CRITICAL',
                                'type': 'UNTRACKED_TRANSACTION',
                                'message': f'Transaction {tx_hash} found in BTCPay but NOT in platform database',
                                'tx_hash': tx_hash,
                                'timestamp': timestamp
                            })
    except Exception as e:
        print(f"Error checking BTCPay transactions: {e}")
    
    # 4. Check hot wallet balance
    try:
        from payments.services import BTCPayServerService
        btcpay = BTCPayServerService()
        balance_info = btcpay.get_wallet_balance()
        balance = Decimal(balance_info.get('balance', 0))
        
        if balance < SECURITY_CONFIG['HOT_WALLET_MIN_BALANCE']:
            alerts.append({
                'severity': 'MEDIUM',
                'type': 'LOW_BALANCE',
                'message': f'Hot wallet balance {balance} BTC is below minimum {SECURITY_CONFIG["HOT_WALLET_MIN_BALANCE"]} BTC',
                'balance': str(balance)
            })
        
        if balance > SECURITY_CONFIG['HOT_WALLET_MAX_BALANCE']:
            alerts.append({
                'severity': 'LOW',
                'type': 'HIGH_BALANCE',
                'message': f'Hot wallet balance {balance} BTC exceeds max {SECURITY_CONFIG["HOT_WALLET_MAX_BALANCE"]} BTC - sweep recommended',
                'balance': str(balance)
            })
    except Exception as e:
        print(f"Error checking wallet balance: {e}")
    
    return alerts


def send_security_alert(alerts):
    """
    Send email alerts for security issues
    """
    if not alerts:
        return
    
    # Group by severity
    critical = [a for a in alerts if a['severity'] == 'CRITICAL']
    high = [a for a in alerts if a['severity'] == 'HIGH']
    medium = [a for a in alerts if a['severity'] == 'MEDIUM']
    
    subject = f"🚨 SECURITY ALERT: {len(alerts)} issue(s) detected"
    
    message = f"""
    SECURITY MONITORING ALERT
    ========================
    Time: {datetime.now()}
    Total Alerts: {len(alerts)}
    
    """
    
    if critical:
        message += f"\n🚨 CRITICAL ({len(critical)}):\n"
        for alert in critical:
            message += f"  - {alert['message']}\n"
    
    if high:
        message += f"\n⚠️ HIGH ({len(high)}):\n"
        for alert in high:
            message += f"  - {alert['message']}\n"
    
    if medium:
        message += f"\n⚠️ MEDIUM ({len(medium)}):\n"
        for alert in medium:
            message += f"  - {alert['message']}\n"
    
    message += "\n\nPlease investigate immediately."
    
    # Send email
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            SECURITY_CONFIG['ALERT_EMAILS'],
            fail_silently=False,
        )
        print("✅ Security alert sent")
    except Exception as e:
        print(f"❌ Failed to send alert: {e}")


def monitor_security():
    """
    Main monitoring function
    """
    print("=" * 80)
    print("SECURITY MONITORING")
    print("=" * 80)
    
    alerts = check_suspicious_activity()
    
    if alerts:
        print(f"\n⚠️ {len(alerts)} SECURITY ALERT(S) DETECTED\n")
        for alert in alerts:
            print(f"[{alert['severity']}] {alert['message']}")
        
        send_security_alert(alerts)
    else:
        print("\n✅ No suspicious activity detected")
    
    print("=" * 80)


if __name__ == "__main__":
    monitor_security()
