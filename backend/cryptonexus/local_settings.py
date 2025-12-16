# Local Development Settings - MAINNET Configuration
# WARNING: This is configured for MAINNET (real Bitcoin/Monero)

# BTCPay Server - Production
BTCPAY_SERVER_URL = 'http://88.99.143.151:23000'  # Your production BTCPay
BTCPAY_STORE_ID = ''  # Set via environment variable
BTCPAY_API_KEY = ''   # Set via environment variable

# Monero RPC - Mainnet
MONERO_RPC_URL = 'http://88.99.143.151:18081/json_rpc'
MONERO_RPC_USER = ''  # Set via environment variable
MONERO_RPC_PASSWORD = ''  # Set via environment variable

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