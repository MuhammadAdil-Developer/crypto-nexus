import { api } from './authService';
import { productService, Product } from './productService';

export interface VendorCounts {
  listings: number;
  orders: number;
  messages: number;
  reviews: number;
  disputes: number;
  tickets: number;
  payouts: number;
  refunds: number;
}

export interface VendorStats {
  totalProducts: number;
  activeListings: number;
  outOfStock: number;
  underReview: number;
  totalSales: number;
  totalRevenue: number;
}

export type VendorProduct = Product;

class VendorService {
  async getVendorCounts(): Promise<VendorCounts> {
    try {
      const response = await api.get('/vendor/counts/');
      return response.data.data || {
        listings: 0,
        orders: 0,
        messages: 0,
        reviews: 0,
        disputes: 0,
        tickets: 0,
        payouts: 0,
        refunds: 0,
      };
    } catch (error) {
      console.error('Error fetching vendor counts:', error);
      return {
        listings: 0,
        orders: 0,
        messages: 0,
        reviews: 0,
        disputes: 0,
        tickets: 0,
        payouts: 0,
        refunds: 0,
      };
    }
  }

  async getMyProducts() {
    return productService.getVendorProducts();
  }

  async getProductDetail(productId: string | number) {
    return productService.getProductDetail(Number(productId));
  }

  async getVendorStats(): Promise<VendorStats> {
    try {
      // Get vendor products to calculate stats
      const productsResponse = await productService.getVendorProducts();
      const products = productsResponse.data || [];

      // Calculate stats from products
      const totalProducts = products.length;
      const activeListings = products.filter(p => p.status === 'approved' && p.is_active).length;
      const outOfStock = products.filter(p => !p.is_active || p.status === 'reserved').length;
      const underReview = products.filter(p => p.status === 'pending_approval').length;

      // For sales and revenue, we would need to fetch orders, but for now return 0
      // These could be calculated from orders if needed
      const totalSales = 0;
      const totalRevenue = 0;

      return {
        totalProducts,
        activeListings,
        outOfStock,
        underReview,
        totalSales,
        totalRevenue,
      };
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      return {
        totalProducts: 0,
        activeListings: 0,
        outOfStock: 0,
        underReview: 0,
        totalSales: 0,
        totalRevenue: 0,
      };
    }
  }

  async getVendorStatistics(vendorUsername: string) {
    try {
      const response = await api.get(`/vendors/statistics/${vendorUsername}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor statistics:', error);
      return {
        success: false,
        message: 'Failed to fetch vendor statistics',
        data: null
      };
    }
  }

  async checkApplicationStatus(username: string) {
    try {
      const response = await api.get(`/vendors/status/${username}/`);
      return response.data;
    } catch (error) {
      console.error('Error checking application status:', error);
      return {
        success: false,
        message: 'Failed to check application status',
        data: null
      };
    }
  }

  async getBulkUploadTemplate() {
    try {
      const response = await api.get('/products/bulk-upload/template/');
      return response.data;
    } catch (error) {
      console.error('Error fetching bulk upload template:', error);
      return { success: false, message: 'Failed to fetch template' };
    }
  }

  async bulkUploadCSV(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/products/bulk-upload/csv/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to upload CSV',
        errors: error.response?.data?.errors || []
      };
    }
  }

  async bulkUploadSimple(data: string) {
    try {
      const response = await api.post('/products/bulk-upload/simple/', { data });
      return response.data;
    } catch (error: any) {
      console.error('Error uploading simple data:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to upload data',
        errors: error.response?.data?.errors || []
      };
    }
  }
}

export default new VendorService();