import axios from 'axios';
import { authService } from './authService';

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
    const token = authService.getAccessToken();
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

export interface VendorProduct {
  id: string;
  listing_title: string;
  vendor_name: string;
  category_name: string;
  sub_category_name: string;
  price: number;
  final_price: number;
  discount_percentage: number;
  quantity_available: number;
  rating: number;
  review_count: number;
  views_count: number;
  favorites_count: number;
  status: string;
  is_featured: boolean;
  main_image: string | null;
  created_at: string;
  // Additional properties
  description?: string;
  account_type?: string;
  verification_level?: string;
  account_age?: string;
  access_method?: string;
  delivery_method?: string;
  region_restrictions?: string;
  notes_for_buyer?: string;
  special_features?: string[];
  tags?: string[];
  gallery_images?: string[];
  documents?: string[];
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface VendorProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: VendorProduct[];
}

export interface VendorStats {
  totalProducts: number;
  activeListings: number;
  outOfStock: number;
  underReview: number;
  totalSales: number;
  totalRevenue: number;
}

class VendorService {
  // Get vendor's products
  async getMyProducts(page: number = 1, pageSize: number = 20): Promise<VendorProductsResponse> {
    try {
      const response = await api.get(`/products/my-products/?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Failed to fetch vendor products');
    }
  }

  // Get vendor statistics
  async getVendorStats(): Promise<VendorStats> {
    try {
      const response = await api.get('/products/my-products/');
      const products = response.data.results || [];
      
      const stats: VendorStats = {
        totalProducts: products.length,
        activeListings: products.filter((p: VendorProduct) => p.status === 'approved').length,
        outOfStock: products.filter((p: VendorProduct) => p.quantity_available === 0).length,
        underReview: products.filter((p: VendorProduct) => p.status === 'pending_approval').length,
        totalSales: products.reduce((sum: number, p: VendorProduct) => sum + p.review_count, 0),
        totalRevenue: products.reduce((sum: number, p: VendorProduct) => sum + (p.final_price * p.review_count), 0)
      };
      
      return stats;
    } catch (error: any) {
      console.error('Error fetching vendor stats:', error);
      return {
        totalProducts: 0,
        activeListings: 0,
        outOfStock: 0,
        underReview: 0,
        totalSales: 0,
        totalRevenue: 0
      };
    }
  }

  // Delete a product
  async deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/products/${productId}/delete/`);
      console.log('🔍 Delete response:', response);
      console.log('🔍 Response data:', response.data);
      
      // Handle 204 No Content (successful delete with no response body)
      if (response.status === 204) {
        return {
          success: true,
          message: 'Product deleted successfully'
        };
      }
      
      // Handle normal JSON response
      return response.data;
    } catch (error: any) {
      console.log('🔍 Delete error:', error);
      console.log('🔍 Error response:', error.response);
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Failed to delete product');
    }
  }

  // Update product status
  async updateProductStatus(productId: string, status: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Updating product status:', { productId, status });
      const response = await api.patch(`/products/${productId}/status/`, { status });
      console.log('🔍 Status update response:', response);
      console.log('🔍 Response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('🔍 Status update error:', error);
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Failed to update product status');
    }
  }
}

export const vendorService = new VendorService();
export default vendorService; 