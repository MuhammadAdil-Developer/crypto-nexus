import { authService, api } from './authService';

export interface WishlistItem {
  id: string;
  product: string;
  product_data: {
    id: number;
    headline: string;
    listing_title: string;
    price: string;
    main_image: string;
    stock_quantity: number;
    vendor: {
      id: number;
      username: string;
    };
  };
  vendor_username: string;
  created_at: string;
}

export interface WishlistStats {
  total_items: number;
  in_stock_items: number;
  out_of_stock_items: number;
  price_drops: number;
  total_value: number;
}

export interface WishlistNotification {
  id: string;
  product: string;
  product_title: string;
  product_price: string;
  notification_type: 'price_drop' | 'back_in_stock' | 'vendor_message';
  message: string;
  is_read: boolean;
  created_at: string;
}

class WishlistService {
  private wishlistCache: { data: WishlistItem[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  // Get user's wishlist with caching
  async getWishlist(forceRefresh: boolean = false): Promise<{ success: boolean; data?: WishlistItem[]; message?: string }> {
    try {
      // Check cache first
      if (!forceRefresh && this.wishlistCache && 
          (Date.now() - this.wishlistCache.timestamp) < this.CACHE_DURATION) {
        return {
          success: true,
          data: this.wishlistCache.data
        };
      }

      // console.log('🔍 Fetching wishlist');
      
      const response = await api.get('/wishlist/');
      
      // console.log('🔍 Get wishlist response:', response);
      
      // Update cache
      if (response.data.success && response.data.data) {
        this.wishlistCache = {
          data: response.data.data,
          timestamp: Date.now()
        };
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Get wishlist error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to fetch wishlist'
      };
    }
  }

  // Add product to wishlist
  async addToWishlist(productId: number): Promise<{ success: boolean; message: string; data?: WishlistItem }> {
    try {
      console.log('🔍 Adding to wishlist:', productId);
      
      const response = await api.post('/wishlist/', { product_id: productId });
      
      console.log('🔍 Add to wishlist response:', response);
      
      // Invalidate cache after successful add
      if (response.data.success) {
        this.wishlistCache = null;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Add to wishlist error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to add product to wishlist'
      };
    }
  }

  // Remove product from wishlist
  async removeFromWishlist(productId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Removing from wishlist:', productId);
      
      const response = await api.delete('/wishlist/', { data: { product_id: productId } });
      
      console.log('🔍 Remove from wishlist response:', response);
      
      // Invalidate cache after successful remove
      if (response.data.success) {
        this.wishlistCache = null;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Remove from wishlist error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to remove product from wishlist'
      };
    }
  }

  // Check if product is in wishlist
  async isInWishlist(productId: number): Promise<boolean> {
    try {
      const wishlist = await this.getWishlist();
      if (wishlist.success && wishlist.data) {
        return wishlist.data.some(item => 
          item.product === productId.toString() || 
          item.product_data?.id === productId
        );
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking wishlist status:', error);
      return false;
    }
  }

  // Get wishlist statistics
  async getWishlistStats(): Promise<{ success: boolean; data?: WishlistStats; message?: string }> {
    try {
      console.log('🔍 Fetching wishlist stats');
      
      const response = await api.get('/wishlist/stats/');
      
      console.log('🔍 Get wishlist stats response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Get wishlist stats error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to fetch wishlist statistics'
      };
    }
  }

  // Get wishlist count for a specific product
  async getProductWishlistCount(productId: number): Promise<{ success: boolean; data?: { product_id: number; wishlist_count: number }; message?: string }> {
    try {
      console.log('🔍 Fetching product wishlist count:', productId);
      
      const response = await api.get(`/wishlist/product/${productId}/count/`);
      
      console.log('🔍 Get product wishlist count response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Get product wishlist count error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to fetch product wishlist count'
      };
    }
  }

  // Get vendor's wishlist statistics (for vendor dashboard)
  async getVendorWishlistStats(): Promise<{ success: boolean; data?: Array<{ product_id: number; product_title: string; wishlist_count: number }>; message?: string }> {
    try {
      console.log('🔍 Fetching vendor wishlist stats');
      
      const response = await api.get('/wishlist/vendor/stats/');
      
      console.log('🔍 Get vendor wishlist stats response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Get vendor wishlist stats error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to fetch vendor wishlist statistics'
      };
    }
  }

  // Get wishlist notifications
  async getWishlistNotifications(): Promise<{ success: boolean; data?: WishlistNotification[]; message?: string }> {
    try {
      console.log('🔍 Fetching wishlist notifications');
      
      const response = await api.get('/wishlist/notifications/');
      
      console.log('🔍 Get wishlist notifications response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Get wishlist notifications error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to fetch wishlist notifications'
      };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Marking notification as read:', notificationId);
      
      const response = await api.post('/wishlist/notifications/', { notification_id: notificationId });
      
      console.log('🔍 Mark notification as read response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Mark notification as read error:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: 'Failed to mark notification as read'
      };
    }
  }
}

export default new WishlistService();
