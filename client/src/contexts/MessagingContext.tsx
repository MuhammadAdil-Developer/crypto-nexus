import React, { createContext, useContext, useState, useEffect } from 'react';
import { messagingService } from '@/services/messagingService';
import { realtimeService } from '@/services/realtimeService';

interface MessageNotification {
  id: string;
  type: 'message' | 'order' | 'price_drop' | 'system';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  sender?: string;
  product?: string;
}

interface MessagingContextType {
  unreadCount: number;
  notifications: MessageNotification[];
  isLoading: boolean;
  refreshNotifications: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use shared service singletons

  const refreshNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Get unread count
      const count = await messagingService.getUnreadCount();
      setUnreadCount(count);
      
      // Get recent activity (messages)
      const recentActivity = await messagingService.getRecentActivity();
      
      // Convert to notification format
      const messageNotifications: MessageNotification[] = recentActivity.map((activity: any) => ({
        id: activity.id,
        type: 'message',
        title: activity.title,
        message: activity.description,
        time: activity.time,
        unread: activity.status === 'info',
        sender: activity.description.split(' replied about')[0],
        product: activity.description.split(' replied about ')[1]?.split(':')[0]
      }));
      
      // Add some static notifications for demo
      const staticNotifications: MessageNotification[] = [
        {
          id: 'order_1',
          type: 'order',
          title: 'Order delivered',
          message: 'Netflix Premium Account has been delivered to your account',
          time: '2 min ago',
          unread: true
        },
        {
          id: 'price_1',
          type: 'price_drop',
          title: 'Price drop alert',
          message: 'Xbox Game Pass Ultimate is now 25% off - check your wishlist!',
          time: '2 hours ago',
          unread: false
        }
      ];
      
      // Combine and sort by time (most recent first)
      const allNotifications = [...messageNotifications, ...staticNotifications];
      setNotifications(allNotifications);
      
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize real-time connection
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('accessToken');
    
    if (userId && token) {
      // Connect using stored credentials (service reads from localStorage)
      realtimeService.connect();
      
      // Subscribe to real-time updates
      const handleUnreadCountUpdate = (data: any) => {
        setUnreadCount(data.unread_count || 0);
      };
      
      const handleRecentMessagesUpdate = (data: any) => {
        // Update notifications with latest message
        if (data && data.length > 0) {
          const latestMessage = data[0];
          const newNotification: MessageNotification = {
            id: `msg_${latestMessage.id}`,
            type: 'message',
            title: 'New message from vendor',
            message: `${latestMessage.buyer} replied about ${latestMessage.product || 'product'}: ${latestMessage.lastMessage}`,
            time: latestMessage.time,
            unread: true,
            sender: latestMessage.buyer,
            product: latestMessage.product
          };
          
          setNotifications(prev => [newNotification, ...prev.filter(n => n.type !== 'message')]);
        }
      };
      
      realtimeService.subscribe('unread_count_update', handleUnreadCountUpdate);
      realtimeService.subscribe('recent_messages_update', handleRecentMessagesUpdate);
      
      // Initial load
      refreshNotifications();
      
      // Cleanup
      return () => {
        realtimeService.unsubscribe('unread_count_update', handleUnreadCountUpdate);
        realtimeService.unsubscribe('recent_messages_update', handleRecentMessagesUpdate);
        realtimeService.disconnect();
      };
    }
  }, []);

  return (
    <MessagingContext.Provider value={{
      unreadCount,
      notifications,
      isLoading,
      refreshNotifications
    }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}

