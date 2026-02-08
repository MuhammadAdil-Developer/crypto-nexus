import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface RefundRequest {
  id: string;
  order_id: string;
  order_pk: string;
  buyer?: string;
  vendor?: string;
  amount: string;
  crypto_currency: string;
  reason: string;
  refund_type: 'full' | 'partial';
  status: string;
  buyer_id?: string;
  product_id?: string;
  use_escrow?: boolean;  // Add escrow status
  buyer_btc_payout_address?: string;
  buyer_xmr_payout_address?: string;
  vendor_payment_source?: 'platform' | 'external' | null;
  vendor_external_wallet_address?: string;
  vendor_refund_transaction_hash?: string;
  vendor_decision?: 'approved' | 'rejected';
  vendor_decision_notes?: string;
  vendor_decision_deadline?: string;
  vendor_refund_required?: boolean;
  vendor_refund_deadline?: string;
  vendor_refund_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  refund_id?: string;
  reason: string;
  evidence?: any;
  status: string;
  resolution?: 'buyer_wins' | 'vendor_wins' | 'partial_refund';
  resolution_amount?: string;
  resolved_at?: string;
  created_at: string;
}

export interface WalletBalance {
  balance_btc: string;
  balance_xmr: string;
  total_deposited_btc: string;
  total_deposited_xmr: string;
  total_withdrawn_btc: string;
  total_withdrawn_xmr: string;
}

export interface WalletTransaction {
  id: string;
  transaction_type: 'refund' | 'withdrawal' | 'deposit' | 'purchase' | 'partial_refund' | 'external_refund';
  amount: string;
  crypto_currency: string;
  order_id?: string;
  refund_id?: string;
  transaction_hash?: string;
  notes?: string;
  created_at: string;
}

class RefundService {
  // Buyer endpoints
  async requestRefund(orderId: string, data: {
    refund_type: 'full' | 'partial';
    amount?: string;
    reason: string;
    notes?: string;
  }) {
    const response = await api.post(`/orders/buyer/refund-request/`, {
      order_id: orderId,
      ...data,
    });
    return response.data;
  }

  async getBuyerRefundRequests(page = 1, limit = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    const response = await api.get(`/orders/buyer/refund-requests/?${params}`);
    return response.data;
  }

  async openDispute(refundId: string, reason: string, evidence?: any) {
    const response = await api.post(`/orders/buyer/disputes/open/`, {
      refund_id: refundId,
      reason,
      evidence: evidence || {},
    });
    return response.data;
  }

  async getBuyerDisputes(page = 1, limit = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    const response = await api.get(`/orders/buyer/disputes/?${params}`);
    return response.data;
  }

  // Vendor endpoints
  async getVendorRefundRequests(page = 1, limit = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    const response = await api.get(`/orders/vendor/refund-requests/?${params}`);
    return response.data;
  }

  async getVendorPendingRefunds() {
    const response = await api.get(`/orders/vendor/refund-requests/pending/`);
    return response.data;
  }

  async approveRefund(
    refundId: string,
    data: {
      notes?: string;
      payment_source?: 'platform' | 'external';
      transaction_hash?: string;
      external_wallet_address?: string;
      refund_now?: boolean;
    } = {}
  ) {
    const payload: Record<string, any> = {
      notes: data.notes || '',
      payment_source: data.payment_source || 'platform',
    };
    if (data.transaction_hash) {
      payload.transaction_hash = data.transaction_hash;
    }
    if (data.external_wallet_address) {
      payload.external_wallet_address = data.external_wallet_address;
    }
    if (data.refund_now !== undefined) {
      payload.refund_now = data.refund_now;
    }
    const response = await api.post(`/orders/vendor/refunds/${refundId}/approve/`, payload);
    return response.data;
  }

  async rejectRefund(refundId: string, rejectionReason: string) {
    const response = await api.post(`/orders/vendor/refunds/${refundId}/reject/`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  }

  async processRefund(
    refundId: string,
    data: {
      transaction_hash?: string;
      notes?: string;
      payment_source?: 'platform' | 'external';
      external_wallet_address?: string;
    } = {}
  ) {
    const payload: Record<string, any> = {
      notes: data.notes || '',
      payment_source: data.payment_source || 'platform',
    };
    if (data.transaction_hash) {
      payload.transaction_hash = data.transaction_hash;
    }
    if (data.external_wallet_address) {
      payload.external_wallet_address = data.external_wallet_address;
    }
    const response = await api.post(`/orders/vendor/refunds/${refundId}/process/`, payload);
    return response.data;
  }

  // Admin endpoints
  async getAdminRefundRequests(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    const response = await api.get(`/orders/admin/refunds/?${params}`);
    return response.data;
  }

  async getAdminRefundDetail(refundId: string) {
    const response = await api.get(`/orders/admin/refunds/${refundId}/`);
    return response.data;
  }

  async forceRefund(refundId: string, notes?: string) {
    const response = await api.post(`/orders/admin/refunds/${refundId}/force/`, {
      notes: notes || '',
    });
    return response.data;
  }

  async getAdminDisputes(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    const response = await api.get(`/orders/admin/disputes/?${params}`);
    return response.data;
  }

  async resolveDispute(disputeId: string, data: {
    resolution: 'buyer_wins' | 'vendor_wins' | 'partial_refund';
    resolution_amount?: string;
    resolution_notes: string;
  }) {
    const response = await api.post(`/orders/admin/disputes/${disputeId}/resolve/`, data);
    return response.data;
  }

  // Wallet endpoints
  async getWalletBalance() {
    const response = await api.get(`/orders/wallet/balance/`);
    return response.data;
  }

  async getWalletTransactions(page = 1, limit = 20, type?: string, currency?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (type) params.append('type', type);
    if (currency) params.append('currency', currency);
    const response = await api.get(`/orders/wallet/transactions/?${params}`);
    return response.data;
  }

  async withdrawFromWallet(amount: string, currency: string, withdrawalAddress: string) {
    const response = await api.post(`/orders/wallet/withdraw/`, {
      amount,
      currency,
      withdrawal_address: withdrawalAddress,
    });
    return response.data;
  }
}

export const refundService = new RefundService();
