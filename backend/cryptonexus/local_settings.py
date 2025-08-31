# Local Development Settings (No Docker)

# Use public testnet services for development
BTCPAY_SERVER_URL = 'https://testnet.demo.btcpayserver.org'  # Public testnet
BTCPAY_STORE_ID = 'demo'  # Demo store
BTCPAY_API_KEY = 'demo_key'  # Demo API key

# Monero testnet RPC (public)
MONERO_RPC_URL = 'https://testnet-rpc.monero.com/json_rpc'
MONERO_RPC_USER = ''
MONERO_RPC_PASSWORD = ''

# Bitcoin testnet (public)
BITCOIN_RPC_URL = 'https://testnet.bitcoin.com/api'
BITCOIN_RPC_USER = ''
BITCOIN_RPC_PASSWORD = ''

# Testnet configuration
BITCOIN_NETWORK = 'testnet'
MONERO_NETWORK = 'testnet'

# For local testing, use mock services
USE_MOCK_PAYMENTS = True
MOCK_PAYMENT_DELAY = 5  # seconds 