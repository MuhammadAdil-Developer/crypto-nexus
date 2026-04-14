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

  async getMyActiveHighlights() {
    try {
      const response = await api.get('/products/vendor/highlights/active/');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching active highlights:', error);
      return { success: false, data: [] };
    }
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
      const outOfStock = products.filter(p => Number(p.quantity_available) === 0).length;
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

  /**
   * Fetches fully aggregated dashboard data specifically optimized for speed.
   */
  async getDashboardAggregated() {
    try {
      const response = await api.get('/vendors/dashboard/aggregated/');
      return response.data;
    } catch (error) {
      console.error('Error fetching aggregated dashboard:', error);
      return { success: false, message: 'Failed to fetch aggregated dashboard' };
    }
  }

  async getDashboardStats() {
    try {
      // Parallel fetches with individual error handling to prevent one failure from blocking everything
      const results = await Promise.allSettled([
        productService.getVendorProducts(),
        this.getProfile(),
        api.get('/orders/?page_size=50'), // Smaller page size for dashboard stats
        api.get('/payments/vendor/payouts/')
      ]);

      const productsRes = results[0].status === 'fulfilled' ? (results[0].value as any) : { data: [] };
      const profileRes = results[1].status === 'fulfilled' ? (results[1].value as any) : { data: {} };
      const ordersResData = results[2].status === 'fulfilled' ? (results[2].value as any).data : { results: [] };
      const payoutsResData = results[3].status === 'fulfilled' ? (results[3].value as any).data : {};

      const products = productsRes.data || [];
      const profile = profileRes.data || {};
      const orders = ordersResData?.results || ordersResData || [];
      const payoutsExtra = payoutsResData || {};

      console.log("Dashboard Stats - Data Fetched", {
        productsCount: products.length,
        ordersCount: Array.isArray(orders) ? orders.length : 0
      });

      // Use earnings from payouts page as the source of truth for "Overall Earning"
      const pendingTotalUsd = payoutsExtra.pending_earnings?.total?.earned_usd || "$0.00";
      const totalRevenueFromPayouts = parseFloat(pendingTotalUsd.replace('$', '').replace(',', '')) || 0;

      // Calculate Product Stats
      const totalProducts = products.length;
      const activeListings = products.filter((p: any) => p.status === 'approved' && (p.is_active !== false)).length;
      const outOfStock = products.filter((p: any) => Number(p.quantity_available) === 0 && p.status === 'approved').length;
      const underReview = products.filter((p: any) => p.status === 'pending_approval' || p.status === 'under_review').length;

      // Calculate Revenue & Sales (USD based)
      const validOrderStatuses = [
        'paid', 'completed', 'delivered', 'shipped', 'confirmed',
        'processing', 'payment_received'
      ];

      const ordersArray = Array.isArray(orders) ? orders : [];
      const completedOrders = ordersArray.filter((o: any) =>
        validOrderStatuses.includes(o.order_status?.toLowerCase())
      );

      const finalSalesCount = completedOrders.length;

      // Calculate revenue based on the USD price of the product (Fallback)
      const calculatedRevenue = completedOrders.reduce((sum: number, o: any) => {
        const price = parseFloat(o.product?.price || 0);
        const qty = parseInt(o.quantity) || 1;
        return sum + (price * qty);
      }, 0);

      const finalRevenue = totalRevenueFromPayouts;

      console.log(`Stats Finalized: Revenue=${finalRevenue}, Sales=${finalSalesCount}`);

      // Calculate Available Balance (from profile data)
      const availableBalance = profile.account_balance || 0;
      const activeCases = 0;

      return {
        success: true,
        data: {
          revenue: {
            total: finalRevenue,
            trend: 0,
            period: 'all_time'
          },
          sales: {
            total: finalSalesCount,
            trend: 0,
            period: 'this_week'
          },
          listings: {
            active: activeListings,
            total: totalProducts,
            attention_required: outOfStock
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

  async bulkDeleteProducts(productIds: number[]) {
    try {
      const response = await productService.bulkDeleteProducts(productIds);
      return response;
    } catch (error: any) {
      console.error('Error bulk deleting products:', error);
      return {
        success: false,
        message: error.message || 'Failed to bulk delete products'
      };
    }
  }

  async promoteHighlight(productId: number, isGiveaway: boolean = false) {
    try {
      const response = await api.post(`/products/${productId}/promote/highlight/`, {
        is_giveaway: isGiveaway
      });
      return response.data;
    } catch (error: any) {
      console.error('Error promoting highlight:', error);
      throw error.response?.data || error;
    }
  }

  async promoteUnhighlight(productId: number) {
    try {
      const response = await api.post(`/products/${productId}/promote/unhighlight/`);
      return response.data;
    } catch (error: any) {
      console.error('Error stopping promotion:', error);
      throw error.response?.data || error;
    }
  }

  async promoteNotification(productIds: number[], currency: string = 'BTC', promotionType: string = 'standard') {
    try {
      const response = await api.post('/products/promote/notification/', {
        product_ids: productIds,
        currency,
        promotion_type: promotionType
      });
      return response.data;
    } catch (error: any) {
      console.error('Error promoting notification:', error);
      throw error.response?.data || error;
    }
  }

  async createBlastPayment(productIds: number[], currency: string = 'BTC', promotionType: string = 'standard') {
    try {
      const response = await api.post('/products/promote/notification/create-payment/', {
        product_ids: productIds,
        currency,
        promotion_type: promotionType
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating blast payment:', error);
      throw error.response?.data || error;
    }
  }

  async checkBlastPayment(invoiceId: string, productIds: number[], promotionType: string = 'standard') {
    try {
      const response = await api.post('/products/promote/notification/check-payment/', {
        invoice_id: invoiceId,
        product_ids: productIds,
        promotion_type: promotionType
      });
      return response.data;
    } catch (error: any) {
      console.error('Error checking blast payment:', error);
      throw error.response?.data || error;
    }
  }

  async getBlastHistory() {
    try {
      const response = await api.get('/products/promote/notification/history/');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching blast history:', error);
      return { success: false, data: [] };
    }
  }

  async removeBlast(announcementId: string) {
    try {
      const response = await api.post(`/products/promote/notification/${announcementId}/remove/`);
      return response.data;
    } catch (error: any) {
      console.error('Error removing blast:', error);
      throw error.response?.data || error;
    }
  }
}

export default new VendorService();