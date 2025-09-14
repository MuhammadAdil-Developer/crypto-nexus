import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

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
  product_id: number;
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
      throw new Error(error.response?.data?.error || 'Failed to create order');
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      const response = await api.get('/orders/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch orders');
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await api.get(`/orders/${orderId}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch order');
    }
  }

  async updateOrderStatus(orderId: string, statusData: UpdateOrderStatusRequest): Promise<Order> {
    try {
      const response = await api.patch(`/orders/${orderId}/`, statusData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update order status');
    }
  }

  async openDispute(orderId: string, reason: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/open_dispute/`, {
        dispute_reason: reason
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to open dispute');
    }
  }

  async resolveDispute(orderId: string, resolution: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/resolve_dispute/`, {
        resolution: resolution
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to resolve dispute');
    }
  }

  async confirmPaymentSuccess(orderId: string): Promise<{ credentials: Credentials }> {
    try {
      const response = await api.post(`/orders/${orderId}/confirm_payment_success/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to confirm payment');
    }
  }

  async getCredentials(orderId: string): Promise<{ credentials: Credentials }> {
    try {
      const response = await api.get(`/orders/${orderId}/get_credentials/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get credentials');
    }
  }

  async markAsDelivered(orderId: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/mark_delivered/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to mark as delivered');
    }
  }

  async confirmDelivery(orderId: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/confirm_delivery/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to confirm delivery');
    }
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${orderId}/cancel/`, {
        cancellation_reason: reason
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to cancel order');
    }
  }

  async getOrderHistory(): Promise<Order[]> {
    try {
      const response = await api.get('/orders/history/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch order history');
    }
  }

  async getVendorOrders(): Promise<Order[]> {
    try {
      const response = await api.get('/orders/vendor/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch vendor orders');
    }
  }

  async getBuyerOrders(): Promise<Order[]> {
    try {
      const response = await api.get('/orders/buyer/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch buyer orders');
    }
  }

  async getAdminDashboard(): Promise<{
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    total_revenue: string;
    recent_orders: Order[];
    order_stats: {
      by_status: Record<string, number>;
      by_month: Record<string, number>;
    };
  }> {
    try {
      const response = await api.get('/orders/admin_dashboard/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch admin dashboard data');
    }
  }

}

export const orderService = new OrderService();
