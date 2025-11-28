import { api } from './authService';

export interface RefundRequest {
  order_id: string;
  reason: string;
  amount?: string; // For partial refunds
  refund_type: 'full' | 'partial'; // full or partial refund
  notes?: string;
}

export interface Refund {
  id: string;
  order_id: string;
  vendor: string;
  buyer: string;
  amount: string;
  crypto_currency: string;
  reason: string;
  refund_type: 'full' | 'partial';
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  rejection_reason?: string;
  transaction_hash?: string;
  notes?: string;
}

class RefundService {
  /**
   * Request a refund for an order (vendor initiates)
   */
  async requestRefund(refundData: RefundRequest): Promise<{ success: boolean; message: string; refund?: Refund }> {
    try {
      const response = await api.post('/refund-request/', refundData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { success: false, message: 'Failed to request refund' };
    }
  }

  /**
   * Get vendor's refund requests
   */
  async getVendorRefunds(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ success: boolean; data: Refund[]; total: number }> {
    try {
      const params: any = { page, limit };
      if (status) {
        params.status = status;
      }
      const response = await api.get('/vendor-refunds/', { params });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { success: false, data: [], total: 0 };
    }
  }

  /**
   * Get specific refund details
   */
  async getRefundDetails(refundId: string): Promise<{ success: boolean; data: Refund }> {
    try {
      const response = await api.get(`/refund-request/${refundId}/`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { success: false, data: null };
    }
  }

  /**
   * Cancel a pending refund request (vendor can cancel only if pending)
   */
  async cancelRefundRequest(refundId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/refund-request/${refundId}/cancel/`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { success: false, message: 'Failed to cancel refund request' };
    }
  }

  /**
   * Get refund statistics for vendor
   */
  async getRefundStats(): Promise<{
    success: boolean;
    total_refunds: number;
    pending_refunds: number;
    completed_refunds: number;
    total_refunded_amount: string;
  }> {
    try {
      const response = await api.get('/vendor-refund-stats/');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || {
        success: false,
        total_refunds: 0,
        pending_refunds: 0,
        completed_refunds: 0,
        total_refunded_amount: '0'
      };
    }
  }
}

export default new RefundService();
