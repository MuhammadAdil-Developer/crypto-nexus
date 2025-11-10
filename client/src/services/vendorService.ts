import { api } from './authService';

export interface VendorCounts {
  listings: number;
  orders: number;
  messages: number;
  reviews: number;
  disputes: number;
  tickets: number;
  payouts: number;
}

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
}

export default new VendorService();
