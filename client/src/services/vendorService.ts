import { authService, api } from './authService';

export interface VendorProduct {
  id: number;
  headline: string;
  listing_title?: string;
  website: string;
  account_type: string;
  access_type: string;
  account_balance?: string;
  description: string;
  price: string;
  additional_info?: string;
  delivery_time: string;
  credentials_display?: string;
  main_image?: string | null;
  gallery_images: string[];
  main_images: string[];
  status: string;
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  rating: string;
  review_count: number;
  created_at: string;
  vendor_username: string;
  vendor: {
    id: string;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  sub_category?: {
    id: number;
    name: string;
  } | null;
  tags: string[];
  special_features: string[];
  quantity_available: number;
  access_method?: string;
  account_age?: string;
  delivery_method?: string;
  region_restrictions?: string;
  notes_for_buyer?: string;
  documents?: string[];
  auto_delivery_script?: string;
  discount_percentage?: string;
  escrow_enabled?: boolean;
  // Additional properties for compatibility
  listing_title?: string;
  vendor_name?: string;
  category_name?: string;
  sub_category_name?: string;
  final_price?: number;
  main_image?: string | null;
  verification_level?: string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface VendorProductsResponse {
  success: boolean;
  message: string;
  data: VendorProduct[];
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
      console.log('🔍 getMyProducts called with:', { page, pageSize });
      console.log('🔍 Making API call to:', `/products/vendor/products/?page=${page}&page_size=${pageSize}`);
      
      const response = await api.get(`/products/vendor/products/?page=${page}&page_size=${pageSize}`);
      
      console.log('🔍 API Response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Response status:', response.status);
      
      // Transform the response to match expected structure
      const transformedData = {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data || []
      };
      
      console.log('🔍 Transformed data:', transformedData);
      
      return transformedData;
    } catch (error: any) {
      console.error('❌ getMyProducts error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        return {
          success: false,
          message: error.response.data.message || 'Failed to fetch products',
          data: []
        };
      }
      throw new Error('Failed to fetch vendor products');
    }
  }

  // Get vendor statistics
  async getVendorStats(): Promise<VendorStats> {
    try {
      const response = await api.get('/products/vendor/products/');
      const products = response.data.data || [];
      
      const stats: VendorStats = {
        totalProducts: products.length,
        activeListings: products.filter((p: VendorProduct) => p.status === 'approved').length,
        outOfStock: products.filter((p: VendorProduct) => p.quantity_available === 0).length,
        underReview: products.filter((p: VendorProduct) => p.status === 'pending_approval').length,
        totalSales: products.reduce((sum: number, p: VendorProduct) => sum + p.review_count, 0),
        totalRevenue: products.reduce((sum: number, p: VendorProduct) => sum + (parseFloat(p.price) * p.review_count), 0)
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

  // Get product detail
  async getProductDetail(productId: string): Promise<any> {
    try {
      console.log('🔍 getProductDetail called with productId:', productId);
      
      const response = await api.get(`/products/${productId}/`);
      
      console.log('🔍 Product detail response:', response);
      console.log('🔍 Product detail data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ getProductDetail error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        return error.response.data;
      }
      throw new Error('Failed to fetch product details');
    }
  }

  // Create product
  async createProduct(productData: Partial<VendorProduct>): Promise<any> {
    try {
      console.log('🔍 createProduct called with:', productData);
      
      const response = await api.post('/products/create/', productData);
      
      console.log('🔍 Create product response:', response);
      console.log('🔍 Create product data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ createProduct error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        return error.response.data;
      }
      throw new Error('Failed to create product');
    }
  }

  // Update product
  async updateProduct(productId: string, productData: Partial<VendorProduct>): Promise<any> {
    try {
      console.log('🔍 updateProduct called with:', { productId, productData });
      
      const response = await api.put(`/products/update/${productId}/`, productData);
      
      console.log('�� Update product response:', response);
      console.log('🔍 Update product data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ updateProduct error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        return error.response.data;
      }
      throw new Error('Failed to update product');
    }
  }

  // Delete product
  async deleteProduct(productId: string): Promise<any> {
    try {
      console.log('🔍 deleteProduct called with productId:', productId);
      
      const response = await api.delete(`/products/delete/${productId}/`);
      
      console.log('🔍 Delete product response:', response);
      console.log('🔍 Delete product data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ deleteProduct error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        return error.response.data;
      }
      throw new Error('Failed to delete product');
    }
  }

  // Get vendor dashboard data
  async getVendorDashboard(): Promise<any> {
    try {
      console.log('🔍 getVendorDashboard called');
      
      const response = await api.get('/products/vendor/products/');
      const products = response.data.data || [];
      
      const dashboardData = {
        statistics: {
          total_products: products.length,
          active_listings: products.filter((p: VendorProduct) => p.status === 'approved').length,
          pending_approval: products.filter((p: VendorProduct) => p.status === 'pending_approval').length,
          rejected: products.filter((p: VendorProduct) => p.status === 'rejected').length,
          out_of_stock: products.filter((p: VendorProduct) => p.quantity_available === 0).length,
          total_views: products.reduce((sum: number, p: VendorProduct) => sum + p.views_count, 0),
          total_favorites: products.reduce((sum: number, p: VendorProduct) => sum + p.favorites_count, 0),
          total_revenue: products.reduce((sum: number, p: VendorProduct) => sum + parseFloat(p.price), 0)
        },
        recent_products: products.slice(0, 5),
        top_performing: products
          .filter((p: VendorProduct) => p.views_count > 0)
          .sort((a: VendorProduct, b: VendorProduct) => b.views_count - a.views_count)
          .slice(0, 5)
      };
      
      console.log('🔍 Dashboard data:', dashboardData);
      
      return {
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: dashboardData
      };
    } catch (error: any) {
      console.error('❌ getVendorDashboard error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      return {
        success: false,
        message: 'Failed to fetch dashboard data',
        data: {
          statistics: {
            total_products: 0,
            active_listings: 0,
            pending_approval: 0,
            rejected: 0,
            out_of_stock: 0,
            total_views: 0,
            total_favorites: 0,
            total_revenue: 0
          },
          recent_products: [],
          top_performing: []
        }
      };
    }
  }

  // Bulk upload CSV
  async bulkUploadCSV(file: File): Promise<any> {
    try {
      console.log('🔍 bulkUploadCSV called with file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/products/bulk-upload/csv/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('🔍 Bulk upload response:', response);
      console.log('🔍 Bulk upload data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ bulkUploadCSV error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.data) {
        console.log('🔍 Error response data:', error.response.data);
        return error.response.data;
      }
      throw new Error('Failed to upload CSV file');
    }
  }

  // Get bulk upload template
  async getBulkUploadTemplate(): Promise<Blob> {
    try {
      console.log('🔍 getBulkUploadTemplate called');
      
      const response = await api.get('/products/bulk-upload/template/', {
        responseType: 'blob'
      });
      
      console.log('�� Template response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ getBulkUploadTemplate error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      throw new Error('Failed to download template');
    }
  }
}

export default new VendorService();
