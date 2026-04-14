import { api } from './authService';

export interface AdminCounts {
  users: number;
  vendors: number;
  listings: number;
  orders: number;
  disputes: number;
  messages: number;
  tickets: number;
  payouts: number;
  commissions: number;
}

class AdminService {
  async getAdminCounts(): Promise<AdminCounts> {
    try {
      const response = await api.get('/admin/counts/');
      return response.data.data || {
        users: 0,
        vendors: 0,
        listings: 0,
        orders: 0,
        disputes: 0,
        messages: 0,
        tickets: 0,
        payouts: 0,
        commissions: 0,
      };
    } catch (error) {
      console.error('Error fetching admin counts:', error);
      return {
        users: 0,
        vendors: 0,
        listings: 0,
        orders: 0,
        disputes: 0,
        messages: 0,
        tickets: 0,
        payouts: 0,
        commissions: 0,
      };
    }
  }
}

export default new AdminService();


