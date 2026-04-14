import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

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
  order_status?: string;
  payment_status?: string;
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

  async createPaymentAddress(data: { order_id: string; crypto_currency: string; amount: string; payment_type: string; use_escrow: boolean; linked_order_ids?: string[] }): Promise<PaymentAddress> {
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

  async getAdminCryptoStatus(): Promise<{ nodes: any[]; wallets: any[]; transactions: any[] }> {
    try {
      const response = await api.get('/payments/admin/crypto-status/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get crypto status');
    }
  }

  async performNodeAction(symbol: string, action: string): Promise<{ message: string; logs?: string }> {
    try {
      const response = await api.post('/payments/admin/node-action/', { symbol, action });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `Failed to perform ${action} on ${symbol}`);
    }
  }

  async performBulkEscrowAction(action: string): Promise<{ message: string; downloadUrl?: string }> {
    try {
      const response = await api.post('/payments/admin/bulk-escrow-action/', { action });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `Failed to perform bulk action: ${action}`);
    }
  }

  async getAdminEarningsAnalytics(): Promise<any> {
    try {
      const response = await api.get('/payments/admin/earnings/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get earnings analytics');
    }
  }

  async triggerSecurityNotifications(): Promise<void> {
    try {
      await api.post('/payments/admin/trigger-security-notifications/');
    } catch (error: any) {
      console.error('Failed to trigger security notifications:', error);
    }
  }

  async downloadAuthenticatedFile(url: string, filename: string): Promise<void> {
    try {
      // If URL already contains the full API path, strip it to avoid doubling up with baseURL
      let cleanUrl = url;
      const apiPrefix = '/api/v1';
      if (cleanUrl.startsWith(apiPrefix)) {
        cleanUrl = cleanUrl.substring(apiPrefix.length);
      }

      const response = await api.get(cleanUrl, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      throw new Error('Failed to download file. Please check your permissions.');
    }
  }

  // Polling for payment updates
  startPaymentPolling(orderId: string, callback: (status: PaymentStatus) => void, intervalMs: number = 5000): ReturnType<typeof setInterval> {
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

  stopPaymentPolling(intervalId: ReturnType<typeof setInterval>) {
    clearInterval(intervalId);
  }

  // Helper methods for payment types
  async simulateCreditCardPayment(amount: number, currency: string): Promise<{ success: boolean; message: string }> {
    // Simulate credit card payment processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: Math.random() > 0.2,
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

  // Convert fiat to crypto using live backend rates
  async getFiatToCryptoRate(fiatAmount: number, fiatCurrency: string, cryptoCurrency: string): Promise<number> {
    try {
      const response = await api.get('/payments/rates/', {
        params: {
          crypto: cryptoCurrency,
          fiat: fiatCurrency
        }
      });

      if (response.data && response.data.rate) {
        const rate = parseFloat(response.data.rate);
        return fiatAmount / rate;
      }
      throw new Error('Could not fetch exchange rate');
    } catch (error: any) {
      console.error('Exchange rate error:', error);
      // Fallback fallback rates if API fails
      const fallbackRates: { [key: string]: number } = {
        'BTC': 95000,
        'XMR': 160,
      };

      const rate = fallbackRates[cryptoCurrency] || 100;
      return fiatAmount / rate;
    }
  }
}

export default new PaymentService(); 
