import { api, authService } from './authService';
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
      // Active listings are approved products that are currently active
      const activeListings = products.filter(p => p.status === 'approved' && p.is_active !== false).length;
      // Out of stock is specifically when quantity is 0
      const outOfStock = products.filter(p => p.quantity_available === 0 || p.quantity_available === '0').length;
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

  async getVendorDashboard() {
    try {
      const user = authService.getCurrentUser();
      if (!user) return { success: false, message: 'Not authenticated' };

      const response = await this.getVendorStatistics(user.username);
      if (response && response.success) {
        // Map the statistics to the structure expected by VendorAnalytics.tsx
        return {
          success: true,
          data: {
            statistics: response.data
          }
        };
      }
      return response;
    } catch (error) {
      console.error('Error fetching vendor dashboard:', error);
      return { success: false, message: 'Failed to fetch dashboard' };
    }
  }

  async getDashboardStats() {
    try {
      // Fetch all necessary data in parallel
      const [productsResponse, profileResponse, ordersResponse, payoutsResponse] = await Promise.all([
        productService.getVendorProducts(),
        this.getProfile(),
        api.get('/orders/?page_size=10000'),
        api.get('/payments/vendor/payouts/')
      ]);

      const products = productsResponse.data || [];
      const profile = profileResponse.data || {};
      const orders = ordersResponse.data?.results || ordersResponse.data || [];
      const payoutsExtra = payoutsResponse.data || {};

      console.log("Dashboard Stats - Payouts Data:", payoutsExtra);

      // Use earnings from payouts page as the source of truth for "Overall Earning"
      const pendingTotalUsd = payoutsExtra.pending_earnings?.total?.usd || "$0.00";
      const totalRevenueFromPayouts = parseFloat(pendingTotalUsd.replace('$', '').replace(',', '')) || 0;
      const totalSalesCountFromPayouts = payoutsExtra.pending_earnings?.total?.orders || 0;

      // Calculate Product Stats
      const totalProducts = products.length;
      const activeListings = products.filter(p => p.status === 'approved' && (p.is_active !== false)).length;
      const outOfStock = products.filter(p => (p.quantity_available === 0 || p.quantity_available === '0') && p.status === 'approved').length;
      const underReview = products.filter(p => p.status === 'pending_approval' || p.status === 'under_review').length;

      // Calculate Revenue & Sales (USD based)
      // We use product.price from the nested product object because order.total_amount is in Crypto
      const validOrderStatuses = [
        'paid', 'completed', 'delivered', 'shipped', 'confirmed',
        'processing', 'payment_received'
      ];

      const ordersArray = Array.isArray(orders) ? orders : [];
      const completedOrders = ordersArray.filter((o: any) =>
        validOrderStatuses.includes(o.order_status?.toLowerCase())
      );

      const totalSalesCount = completedOrders.length;

      // Calculate revenue based on the USD price of the product (Fallback)
      const calculatedRevenue = completedOrders.reduce((sum: number, o: any) => {
        const price = parseFloat(o.product?.price || 0);
        const qty = parseInt(o.quantity) || 1;
        return sum + (price * qty);
      }, 0);

      // Final values - Use Payouts API data as the source of truth if available
      const finalRevenue = totalRevenueFromPayouts > 0 ? totalRevenueFromPayouts : calculatedRevenue;
      const finalSalesCount = totalSalesCountFromPayouts > 0 ? totalSalesCountFromPayouts : completedOrders.length;

      console.log(`Stats Finalized: Revenue=${finalRevenue}, Sales=${finalSalesCount}`);

      // Calculate Available Balance (from profile data)
      const availableBalance = profile.account_balance || 0;

      // Calculate Active Cases (Disputes/Tickets)
      const activeCases = 0;

      return {
        success: true,
        data: {
          revenue: {
            total: finalRevenue,
            trend: 0, // Calculate trend if possible
            period: 'all_time'
          },
          sales: {
            total: finalSalesCount, // This is the count
            trend: 0,
            period: 'this_week'
          },
          listings: {
            active: activeListings,
            total: totalProducts,
            attention_required: outOfStock // Products needing attention (e.g. out of stock)
          },
          balance: {
            available: availableBalance,
            currency: 'USD'
          },
          cases: {
            active: activeCases,
            trend: 0
          }
        }
      };

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        message: 'Failed to fetch dashboard stats'
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

  async getProfile() {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return {
        success: false,
        message: 'Failed to fetch profile',
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

  async deleteProduct(productId: number | string) {
    try {
      const response = await productService.deleteProduct(Number(productId));
      return response;
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete product'
      };
    }
  }
}

export default new VendorService();