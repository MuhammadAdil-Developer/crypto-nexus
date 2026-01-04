import { authService, api } from './authService';

export interface Dispute {
  id: string; // UUID
  dispute_id: string;
  order: string;
  order_id?: string; // Add order_id field
  product: string;
  buyer: string;
  vendor: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  resolution: 'pending' | 'refund_full' | 'refund_partial' | 'refund_to_vendor' | 'product_replacement' | 'dispute_dismissed' | 'buyer_wins' | 'vendor_wins';
  resolution_notes?: string;
  refund_amount?: number;
  assigned_admin?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  evidence_files: string[];
  buyer_username: string;
  vendor_username: string;
  assigned_admin_username?: string;
  order_data?: any;
  product_data?: any;
}

export interface DisputeMessage {
  id: string;
  dispute: string;
  sender: string;
  message: string;
  is_internal: boolean;
  attachments: string[];
  created_at: string;
  sender_username: string;
  sender_type: string;
}

export interface DisputeTimeline {
  id: string;
  dispute: string;
  action: string;
  description: string;
  user: string;
  created_at: string;
  user_username: string;
}

export interface CreateDisputeData {
  order: string; // UUID
  title: string;
  description: string;
  category: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  evidence_files?: string[];
}

export interface DisputeStatistics {
  total_disputes: number;
  open_disputes: number;
  in_progress_disputes: number;
  resolved_disputes: number;
  closed_disputes: number;
  urgent_disputes: number;
  high_priority_disputes: number;
  disputes_by_category: Record<string, number>;
  disputes_by_status: Record<string, number>;
}

class DisputeService {
  // Create a new dispute
  async createDispute(data: CreateDisputeData): Promise<{ success: boolean; message: string; data?: Dispute }> {
    try {
      console.log('🔍 Creating dispute:', data);

      const response = await api.post('/disputes/create/', data);

      console.log('🔍 Create dispute response:', response);

      return response.data;
    } catch (error: any) {
      console.error('❌ Create dispute error:', error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: 'Failed to create dispute'
      };
    }
  }

  // Get disputes list
  async getDisputes(params: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    category?: string;
  } = {}): Promise<{
    success: boolean;
    data: Dispute[];
    pagination: any
  }> {
    try {
      console.log('🔍 Fetching disputes:', params);

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/disputes/list/?${queryString}` : '/disputes/list/';

      const response = await api.get(endpoint);

      console.log('🔍 Get disputes response:', response);

      return response.data;
    } catch (error: any) {
      console.error('❌ Get disputes error:', error);

      return {
        success: false,
        data: [],
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 0,
          has_next: false,
          has_previous: false
        }
      };
    }
  }

  // Get dispute detail
  async getDisputeDetail(disputeId: string | number): Promise<{
    success: boolean;
    data?: {
      dispute: Dispute;
      messages: DisputeMessage[];
      timeline: DisputeTimeline[]
    }
  }> {
    try {
      console.log('🔍 Fetching dispute detail:', disputeId);

      const response = await api.get(`/disputes/${disputeId}/`);

      console.log('🔍 Get dispute detail response:', response);

      return response.data;
    } catch (error: any) {
      console.error('❌ Get dispute detail error:', error);

      return {
        success: false,
        data: undefined
      };
    }
  }

  // Send message in dispute
  async sendDisputeMessage(disputeId: string | number, data: {
    message: string;
    is_internal?: boolean;
    attachments?: string[];
  }): Promise<{ success: boolean; message: string; data?: DisputeMessage }> {
    try {
      console.log('🔍 Sending dispute message:', { disputeId, data });

      const response = await api.post(`/disputes/${disputeId}/messages/`, data);

      console.log('🔍 Send dispute message response:', response);

      return response.data;
    } catch (error: any) {
      console.error('❌ Send dispute message error:', error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: 'Failed to send message'
      };
    }
  }

  // Resolve dispute (admin only)
  async resolveDispute(disputeId: string | number, data: {
    resolution: string;
    resolution_notes?: string;
    resolution_reason?: string;
    winning_party?: string;
    refund_amount?: number;
  }): Promise<{ success: boolean; message: string; data?: Dispute }> {
    try {
      console.log('🔍 Resolving dispute:', { disputeId, data });

      const response = await api.post(`/disputes/${disputeId}/resolve/`, data);

      console.log('🔍 Resolve dispute response:', response);

      return response.data;
    } catch (error: any) {
      console.error('❌ Resolve dispute error:', error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: 'Failed to resolve dispute'
      };
    }
  }

  // Get dispute statistics (admin only)
  async getDisputeStatistics(): Promise<{
    success: boolean;
    data?: DisputeStatistics
  }> {
    try {
      console.log('🔍 Fetching dispute statistics');

      const response = await api.get('/disputes/statistics/');

      console.log('🔍 Get dispute statistics response:', response);

      return response.data;
    } catch (error: any) {
      console.error('❌ Get dispute statistics error:', error);

      return {
        success: false,
        data: undefined
      };
    }
  }

  // Dispute categories
  getDisputeCategories() {
    return [
      { value: 'product_not_received', label: 'Product Not Received' },
      { value: 'product_defective', label: 'Product Defective' },
      { value: 'product_not_as_described', label: 'Product Not As Described' },
      { value: 'vendor_not_responsive', label: 'Vendor Not Responsive' },
      { value: 'payment_issue', label: 'Payment Issue' },
      { value: 'delivery_issue', label: 'Delivery Issue' },
      { value: 'other', label: 'Other' }
    ];
  }

  // Dispute priorities
  getDisputePriorities() {
    return [
      { value: 'low', label: 'Low', color: 'bg-green-500' },
      { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
      { value: 'high', label: 'High', color: 'bg-orange-500' },
      { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
    ];
  }

  // Dispute statuses
  getDisputeStatuses() {
    return [
      { value: 'open', label: 'Open', color: 'bg-blue-500' },
      { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
      { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
      { value: 'closed', label: 'Closed', color: 'bg-gray-500' },
      { value: 'escalated', label: 'Escalated', color: 'bg-red-500' }
    ];
  }

  // Dispute resolutions
  getDisputeResolutions() {
    return [
      { value: 'refund_full', label: 'Full Refund to Buyer' },
      { value: 'refund_partial', label: 'Partial Refund to Buyer' },
      { value: 'refund_to_vendor', label: 'Payment to Vendor' },
      { value: 'product_replacement', label: 'Product Replacement' },
      { value: 'dispute_dismissed', label: 'Dispute Dismissed' }
    ];
  }
}

export default new DisputeService();

