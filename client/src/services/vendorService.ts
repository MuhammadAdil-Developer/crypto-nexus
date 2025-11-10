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
}

export default new VendorService();
