import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

// Create axios instance with base configuration
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    const url: string = originalRequest.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    const hasToken =
      !!localStorage.getItem('accessToken') ||
      !!localStorage.getItem('refreshToken');

    if (status === 401 && hasToken && !isAuthEndpoint) {
      // Token expired or invalid
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');

      // Trigger token expiration modal instead of direct redirect
      window.dispatchEvent(
        new CustomEvent('token_expired', {
          detail: { userType: user.user_type },
        })
      );
    }
    return Promise.reject(error);
  }
);

// Helper function to extract error message from API response
const extractErrorMessage = (error: any, defaultMessage: string): string => {
  if (!error.response?.data) {
    return error.message || defaultMessage;
  }

  const data = error.response.data;

  // Priority 1: Check order_status field (for order status update errors)
  if (data.order_status) {
    if (Array.isArray(data.order_status)) {
      return data.order_status.join('. ');
    }
    return String(data.order_status);
  }

  // Priority 2: Check non_field_errors
  if (data.non_field_errors) {
    if (Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join('. ');
    }
    return String(data.non_field_errors);
  }

  // Priority 3: Check error field
  if (data.error) {
    if (Array.isArray(data.error)) {
      return data.error.join('. ');
    }
    return String(data.error);
  }

  // Priority 4: Check detail field
  if (data.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail.join('. ');
    }
    return String(data.detail);
  }

  // Priority 5: Check message field
  if (data.message) {
    return String(data.message);
  }

  // Priority 6: If data is a string
  if (typeof data === 'string') {
    return data;
  }

  // Priority 7: Try to get first key's value
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const firstValue = data[firstKey];

      if (Array.isArray(firstValue)) {
        return firstValue.join('. ');
      }
      return String(firstValue);
    }
  }

  return error.message || defaultMessage;
};

export interface Order {
  id: string;
  order_id: string;
  buyer: any;
  vendor: any;
  product: any;
  quantity: number;
  unit_price: string;
  total_amount: string;
  crypto_currency: string;
  payment_address: string;
  payment_status: string;
  order_status: string;
  use_escrow: boolean;
  escrow_fee: string;
  dispute_opened: boolean;
  dispute_reason: string;
  payment_expires_at: string | null;
  payment_confirmed_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  dispute_opened_at: string | null;
  product_credentials: any;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  product: number;
  quantity: number;
  crypto_currency: string;
  use_escrow: boolean;
}

export interface UpdateOrderStatusRequest {
  order_status: string;
  dispute_reason?: string;
}

export interface Credentials {
  credentials: string;
  delivered_at: string;
  delivery_method: string;
  additional_info: string;
  notes: string;
}

class OrderService {
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    try {
      const response = await api.post('/orders/', orderData);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to create order'));
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      const response = await api.get(`/orders/?page_size=10000&_t=${Date.now()}`);
      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        return response.data.results;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch orders'));
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await api.get(`/orders/${orderId}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch order'));
    }
  }

  async updateOrderStatus(orderId: string, statusData: UpdateOrderStatusRequest): Promise<Order> {
    try {
      // Backwards-compatible: allow passing a string for statusData
      const payload = typeof statusData === 'string' ? { order_status: statusData } : statusData;

      console.log('📤 Sending order status update:', {
        orderId,
        payload
      });

      const response = await api.patch(`/orders/${orderId}/`, payload);

      console.log('✅ Order status updated successfully:', response.data);

      return response.data;
    } catch (error: any) {
      console.error('❌ Order status update failed:', {
        orderId,
        error: error.response?.data
      });

      // Extract the specific error message from the API response
      const errorMessage = extractErrorMessage(error, 'Failed to update order status');

      console.log('🔔 Extracted error message:', errorMessage);

      throw new Error(errorMessage);
    }
  }

  // Admin convenience: confirm order (alias to confirmDelivery)
  async confirmOrder(orderId: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/confirm_delivery/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to confirm order'));
    }
  }

  async openDispute(orderId: string, reason: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/open_dispute/`, {
        dispute_reason: reason
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to open dispute'));
    }
  }

  async resolveDispute(orderId: string, resolution: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/resolve_dispute/`, {
        resolution: resolution
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to resolve dispute'));
    }
  }

  async confirmPaymentSuccess(orderId: string): Promise<{ credentials: Credentials }> {
    try {
      const response = await api.post(`/orders/${orderId}/confirm_payment_success/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to confirm payment'));
    }
  }

  async getCredentials(orderId: string): Promise<{ credentials: Credentials }> {
    try {
      const response = await api.get(`/orders/${orderId}/get_credentials/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to get credentials'));
    }
  }

  async markAsDelivered(orderId: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/mark_delivered/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to mark as delivered'));
    }
  }

  async confirmDelivery(orderId: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/confirm_delivery/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to confirm delivery'));
    }
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/cancel/`, {
        cancellation_reason: reason
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to cancel order'));
    }
  }

  async getOrderHistory(): Promise<Order[]> {
    try {
      const response = await api.get(`/orders/history/?page_size=10000&_t=${Date.now()}`);
      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        return response.data.results;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch order history'));
    }
  }

  async getVendorOrders(): Promise<Order[]> {
    try {
      // Backend automatically filters by user type, so use /orders/ endpoint with large page size
      const response = await api.get(`/orders/?page_size=10000&_t=${Date.now()}`);
      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        return response.data.results;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch vendor orders'));
    }
  }

  async getBuyerOrders(): Promise<Order[]> {
    try {
      // Fetch all orders without pagination - OrderViewSet automatically filters by buyer
      const response = await api.get(`/orders/?page_size=10000&_t=${Date.now()}`);
      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        return response.data.results;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch buyer orders'));
    }
  }

  async getAdminDashboard(days: number = 30): Promise<any> {
    try {
      const response = await api.get(`/orders/admin_dashboard/?days=${days}`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch admin dashboard data'));
    }
  }

  async expireOrder(orderId: string): Promise<Order> {
    try {
      // Backend now accepts order ID in URL path (detail=True)
      const response = await api.post(`/orders/${orderId}/expire_order/`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Failed to expire order'));
    }
  }

}

export const orderService = new OrderService();