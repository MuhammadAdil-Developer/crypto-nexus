import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface PaymentAddress {
  order_id: string;
  payment_address: string;
  expected_amount: string;
  crypto_currency: string;
  payment_type: 'wallet' | 'buy' | 'exchange';
  status: 'pending' | 'partial' | 'paid' | 'overpaid' | 'expired' | 'cancelled';
  expires_at: string;
  required_confirmations: number;
  btcpay_invoice_id?: string;
  btcpay_checkout_link?: string;
  monero_subaddress_index?: number;
  escrow?: {
    enabled: boolean;
    status: string;
    escrow_amount: string;
    escrow_fee: string;
    auto_release_days: number;
  };
}

export interface PaymentStatus {
  order_id: string;
  status: string;
  expected_amount: string;
  received_amount: string;
  payment_address: string;
  expires_at: string;
  confirmations: number;
  required_confirmations: number;
  escrow?: {
    status: string;
    auto_release_at?: string;
  };
}

export interface SupportedCurrency {
  symbol: string;
  name: string;
  decimals: number;
  network: string;
}

class PaymentService {

  async createPaymentAddress(data: { order_id: string; crypto_currency: string; amount: string; payment_type: string; use_escrow: boolean }): Promise<PaymentAddress> {
    try {
      const response = await api.post("/payments/create/", data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to create payment address");
    }
  }
  async getPaymentStatus(orderId: string): Promise<PaymentStatus> {
    try {
      const response = await api.get(`/payments/status/${orderId}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get payment status');
    }
  }

  async getSupportedCurrencies(): Promise<SupportedCurrency[]> {
    try {
      const response = await api.get('/payments/currencies/');
      return response.data.supported_currencies;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get supported currencies');
    }
  }

  async releaseEscrow(orderId: string): Promise<void> {
    try {
      await api.post(`/escrow/${orderId}/`, { action: 'release' });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to release escrow');
    }
  }

  async disputeEscrow(orderId: string, reason: string): Promise<void> {
    try {
      await api.post(`/escrow/${orderId}/`, { action: 'dispute', reason });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to dispute escrow');
    }
  }

  // Polling for payment updates
  startPaymentPolling(orderId: string, callback: (status: PaymentStatus) => void, intervalMs: number = 5000) {
    const pollInterval = setInterval(async () => {
      try {
        const status = await this.getPaymentStatus(orderId);
        callback(status);
        
        // Stop polling if payment is completed or expired
        if (['paid', 'expired', 'cancelled'].includes(status.status)) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    }, intervalMs);

    return pollInterval;
  }

  stopPaymentPolling(intervalId: number) {
    clearInterval(intervalId);
  }

  // Helper methods for payment types
  async simulateCreditCardPayment(amount: number, currency: string): Promise<{ success: boolean; message: string }> {
    // Simulate credit card payment processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: Math.random() > 0.2, // 80% success rate
          message: Math.random() > 0.2 ? 'Payment processed successfully' : 'Payment failed - insufficient funds'
        });
      }, 2000);
    });
  }

  async simulateExchangeConnection(exchange: string): Promise<{ success: boolean; message: string }> {
    // Simulate exchange API connection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: Math.random() > 0.1, // 90% success rate
          message: Math.random() > 0.1 ? `Connected to ${exchange} successfully` : `Failed to connect to ${exchange}`
        });
      }, 1500);
    });
  }

  // QR Code generation for wallet payments
  generatePaymentQR(address: string, amount: string, currency: string): string {
    // Generate QR code data
    let qrData = '';
    
    if (currency === 'BTC') {
      qrData = `bitcoin:${address}?amount=${amount}`;
    } else if (currency === 'XMR') {
      qrData = `monero:${address}?tx_amount=${amount}`;
    } else {
      qrData = address;
    }
    
    // Return QR code URL (using qr-server.com for simplicity)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  }

  // Format crypto amounts
  formatCryptoAmount(amount: string, currency: string): string {
    const num = parseFloat(amount);
    
    if (currency === 'BTC') {
      return num.toFixed(8);
    } else if (currency === 'XMR') {
      return num.toFixed(12);
    }
    
    return amount;
  }

  // Convert fiat to crypto (mock implementation)
  async getFiatToCryptoRate(fiatAmount: number, fiatCurrency: string, cryptoCurrency: string): Promise<number> {
    // Mock exchange rates
    const rates: { [key: string]: number } = {
      'BTC': 45000, // $45,000 per BTC
      'XMR': 150,   // $150 per XMR
    };

    const rate = rates[cryptoCurrency];
    if (!rate) throw new Error('Unsupported cryptocurrency');

    return fiatAmount / rate;
  }
}

export default new PaymentService(); 