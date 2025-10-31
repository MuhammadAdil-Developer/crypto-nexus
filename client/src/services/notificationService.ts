import { api } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface Notification {
  id: string;
  type: 'message' | 'order' | 'payment' | 'system' | 'listing_approval' | 'listing_rejection';
  title: string;
  message: string;
  is_read: boolean;
  data: any;
  created_at: string;
}

class NotificationService {
  async getNotifications(page: number = 1, pageSize: number = 20, unreadOnly: boolean = false): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        unread_only: unreadOnly ? 'true' : 'false'
      });
      
      const response = await api.get(`/notifications/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async getRecentNotifications(limit: number = 10): Promise<any> {
    try {
      const response = await api.get(`/notifications/recent/?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/notifications/unread-count/');
      return response.data.data.unread_count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string): Promise<any> {
    try {
      const response = await api.post(`/notifications/${notificationId}/mark-read/`);
      console.log('✅ Notification marked as read:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<any> {
    try {
      const response = await api.post('/notifications/mark-all-read/');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

export default new NotificationService();

