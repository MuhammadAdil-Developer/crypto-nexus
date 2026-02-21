# Local Development Settings - MAINNET Configuration
# WARNING: This is configured for MAINNET (real Bitcoin/Monero)

# BTCPay Server - Production
BTCPAY_SERVER_URL = 'https://pay.accountzclub.com'
BTCPAY_STORE_ID = '8wYTiCWKm47tXgi9mZe1Vf99ZKpStCXbKUJTpNumgmEC'
BTCPAY_API_KEY = '6460c3257b528997986804a5677df63102ec7947'

# Monero RPC - Mainnet
MONERO_RPC_URL = 'http://127.0.0.1:18082/json_rpc'
MONERO_RPC_USER = 'nx_vault_7Q'
MONERO_RPC_PASSWORD = 'F9!xQ@3Zk#M7vR2$LwA8'

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
BTC_CONFIRMATIONS = 1
XMR_CONFIRMATIONS = 1