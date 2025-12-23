# Local Development Settings - MAINNET Configuration
# WARNING: This is configured for MAINNET (real Bitcoin/Monero)

# BTCPay Server - Production
BTCPAY_SERVER_URL = 'https://pay.accountzclub.com'
BTCPAY_STORE_ID = '5rZ8Bo7fCoXCUAbkSvnNhTgQiVwEbiSstB7Cxs76BDW7'
BTCPAY_API_KEY = 'f66dd13f59806719fcee1eb31be75057ea47c1fd'

# Monero RPC - Mainnet
MONERO_RPC_URL = 'http://127.0.0.1:18082/json_rpc'
MONERO_RPC_USER = 'monerouser'
MONERO_RPC_PASSWORD = 'moneropass123'

# Bitcoin RPC - Mainnet
BITCOIN_RPC_URL = 'http://88.99.143.151:8332'  # Mainnet port
BITCOIN_RPC_USER = ''  # Set via environment variable
BITCOIN_RPC_PASSWORD = ''  # Set via environment variable

# MAINNET configuration
BITCOIN_NETWORK = 'mainnet'
MONERO_NETWORK = 'mainnet'

# For production, use real payment processing
USE_MOCK_PAYMENTS = False

# Confirmation requirements for mainnet security
BTC_CONFIRMATIONS = 3
XMR_CONFIRMATIONS = 10