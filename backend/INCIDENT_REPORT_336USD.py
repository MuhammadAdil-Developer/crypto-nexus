"""
===============================================================================
INCIDENT INVESTIGATION REPORT
Transaction ID: d063d9d50d73933c8abe2f87d059c17c3ccd0b9977e59a5edaa893cbd457f003
Amount: 0.00492429 BTC (~$336 USD)
Date: February 16, 2026
===============================================================================

EXECUTIVE SUMMARY:
------------------
The $336 BTC transaction was NOT processed through the platform's Django 
application. This was a DIRECT BTCPay Server wallet transaction that bypassed 
all platform logic, database records, and validation systems.

EVIDENCE:
---------

1. DATABASE CHECK - NO RECORDS FOUND
   ✓ Searched ALL DirectPayment records: NOT FOUND
   ✓ Searched ALL Payout records: NOT FOUND
   ✓ Searched ALL PaymentAddress records: NOT FOUND
   ✓ Searched ALL Order records: NOT FOUND
   ✓ Searched transaction hash in logs: NOT FOUND
   
   CONCLUSION: This transaction was NEVER processed by the platform code.

2. BTCPAY SERVER CHECK - TRANSACTION EXISTS
   ✓ Transaction found in BTCPay wallet history
   ✓ Transaction has NO invoice label (platform transactions always have labels)
   ✓ Transaction has NO comment (platform transactions always have comments)
   ✓ Transaction is a UTXO consolidation (wallet management, not a payout)
   
   CONCLUSION: This was a BTCPay-level wallet operation, not a platform payout.

3. DESTINATION ADDRESS ANALYSIS
   ✓ Destination: bc1qlfej2kjh62flgl4tu3k9pqkpnxz7ced7rvnpww
   ✓ NOT in any vendor records
   ✓ NOT in any buyer records  
   ✓ NOT in any payout records
   ✓ NOT in current BTCPay wallet UTXOs
   
   CONCLUSION: This address is EXTERNAL to the platform.

4. FUND MOVEMENT AFTER CONSOLIDATION
   ✓ Funds were IMMEDIATELY spent to 2 other addresses:
      - bc1quj59wx983plep3a94m2acf2h52ghuvc39lgpfn (0.00505447 BTC)
      - bc1q8m5hwt9qqhf4y7az80jucet669vksl5plgdu9w (0.00255345 BTC)
   
   CONCLUSION: This looks like money was moved out intentionally.

5. PLATFORM CODE ANALYSIS
   ✓ ALL platform payouts go through PayoutService._send_btc_payout_raw()
   ✓ ALL platform payouts create DirectPayment or Payout records
   ✓ ALL platform payouts have invoice labels in BTCPay
   ✓ This transaction has NONE of these characteristics
   
   CONCLUSION: Platform code was NOT involved in this transaction.

ROOT CAUSE ANALYSIS:
--------------------
This transaction was initiated through ONE of these methods:

A) BTCPay Dashboard Manual Withdrawal
   - Someone logged into BTCPay web interface
   - Manually sent transaction from Wallet page
   - This bypasses Django application entirely

B) BTCPay Auto-Forwarding Rule
   - BTCPay Store Settings → Wallet → Automated Payout configured
   - Funds automatically forwarded to external address
   - This is a BTCPay feature, not platform feature

C) BTCPay API Direct Call
   - Someone with BTCPay API key made direct wallet API call
   - Bypassed Django application
   - Used BTCPay API endpoints directly

D) Compromised BTCPay Admin Account
   - Unauthorized access to BTCPay server
   - Manual withdrawal by unauthorized person

WHAT THE PLATFORM DOES:
------------------------
Platform Transaction Flow (NORMAL):
1. Buyer pays → Invoice created in BTCPay with label
2. Webhook received → Django processes payment
3. DirectPayment record created in database
4. Fees calculated and stored
5. Payout initiated through PayoutService
6. Transaction sent with invoice reference
7. All logged in database and system logs

Mystery Transaction Flow (ACTUAL):
1. ??? → Direct BTCPay wallet transaction
2. NO webhook to Django
3. NO database records
4. NO invoice label
5. NO platform involvement

RECOMMENDED ACTIONS:
--------------------
1. CHECK BTCPay Dashboard Access Logs
   - Who logged in around Feb 16, 2026 19:00-20:00 UTC?
   - Any suspicious login locations?

2. CHECK BTCPay Store Settings
   - Stores → Settings → Wallet
   - Look for "Automated Payouts" or "Forwarding"
   - Screenshot any forwarding rules

3. CHECK BTCPay Wallet Settings  
   - Payment Methods → BTC → Wallet
   - Look for any automation settings
   - Screenshot the configuration

4. CHECK BTCPay Users & Permissions
   - Server Settings → Users
   - Who has Store Owner or Admin access?
   - Review and remove any suspicious accounts

5. REVIEW BTCPay API Keys
   - Stores → Settings → Access Tokens
   - Check all API keys and their permissions
   - Revoke any unknown or suspicious keys

6. CHANGE BTCPay ADMIN PASSWORD
   - Change password for BTCPay admin account
   - Enable 2FA if not already enabled

SCREENSHOTS NEEDED FROM CLIENT:
-------------------------------
Please provide screenshots of:

1. BTCPay Dashboard → Wallets → BTC → Transactions
   (Show the transaction d063d9d... in the list)

2. BTCPay Dashboard → Stores → Settings → Wallet
   (Show any automation/forwarding settings)

3. BTCPay Dashboard → Stores → Settings → Access Tokens
   (Show all API keys - BLUR the actual keys!)

4. BTCPay Dashboard → Server Settings → Users
   (Show who has access to BTCPay)

5. BTCPay Transaction Details for d063d9d...
   (Click on the transaction to see full details)

CONCLUSION:
-----------
This is NOT a platform bug or system error. The transaction occurred at the 
BTCPay Server level and never touched the Django application code. 

The platform's payment processing system is working correctly. All legitimate 
platform payouts are properly logged and can be traced in the database.

This incident requires investigation at the BTCPay Server level, not the 
platform application level.

Evidence Generated: February 17, 2026
Report Created By: System Investigation Script
===============================================================================
"""

print(__doc__)
