import React, { createContext, useContext, useState, useEffect } from 'react';
import { messagingService } from '@/services/messagingService';
import { realtimeService } from '@/services/realtimeService';

interface MessageNotification {
  id: string;
  type: 'message' | 'order' | 'price_drop' | 'system' | 'review' | 'dispute' | 'dispute_message' | 'dispute_resolved';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  sender?: string;
  product?: string;
  orderId?: string;
  productId?: number;
  productTitle?: string;
  disputeId?: number;
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
      
      // Merge with existing notifications without duplicating by id
      setNotifications((prev) => {
        const byId = new Map(prev.map(n => [n.id, n]));
        messageNotifications.forEach(n => byId.set(n.id, n));
        const merged = Array.from(byId.values());
        try { (window as any).debugNotifications = merged; } catch {}
        console.log('🔎 MessagingContext refresh merged notifications:', merged);
        return merged;
      });
      
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔌 MessagingProvider init: setting up realtime subscriptions');
    let isMounted = true;

    // Initialize real-time connection (always connect; service reads tokens internally if needed)
    try {
      realtimeService.connect();
    } catch (e) {
      console.error('Failed to connect realtimeService:', e);
    }
    
    // Subscribe to real-time updates
    const handleUnreadCountUpdate = (data: any) => {
      if (!isMounted) return;
      setUnreadCount(data.unread_count || 0);
    };
    
    const handleRecentMessagesUpdate = (data: any) => {
      if (!isMounted) return;
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
        
        setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
      }
    };
    
    realtimeService.subscribe('unread_count_update', handleUnreadCountUpdate);
    realtimeService.subscribe('recent_messages_update', handleRecentMessagesUpdate);
    // Review prompt handler - show as notification instead of auto modal
    const handleReviewPrompt = (payload: any) => {
      if (!isMounted) return;
      console.log('🔍 Review prompt received:', payload);
      
      // Create review notification
      const reviewNotification: MessageNotification = {
        id: `review_prompt_${payload.order_id}`,
        type: 'review',
        title: 'Share your review',
        message: `Please review your purchase: ${payload.product_title}`,
        time: 'Just now',
        unread: true,
        orderId: payload.order_id,
        productId: payload.product_id,
        productTitle: payload.product_title
      };
      
      // Add to notifications
      setNotifications(prev => [reviewNotification, ...prev]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Also dispatch as window event for any components that want to listen
      window.dispatchEvent(new CustomEvent('review_prompt', { detail: payload }));
    };
    realtimeService.subscribe('review_prompt', handleReviewPrompt);
    
    // New review notification for vendors
    const handleNewReview = (payload: any) => {
      if (!isMounted) return;
      console.log('🔍 New review notification received in MessagingContext:', payload);
      
      // Create new review notification for vendors
      const newReviewNotification: MessageNotification = {
        id: `new_review_${payload.product_id}_${Date.now()}`,
        type: 'review',
        title: 'New product review',
        message: `${payload.buyer_username} reviewed "${payload.product_title}" - ${payload.rating} stars`,
        time: 'Just now',
        unread: true,
        productId: payload.product_id,
        productTitle: payload.product_title,
        sender: payload.buyer_username
      };
      
      // Add to notifications
      setNotifications(prev => [newReviewNotification, ...prev]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('new_review', handleNewReview);
    
    // New dispute notification for vendors
    const handleNewDispute = (payload: any) => {
      if (!isMounted) return;
      console.log('🔍 New dispute notification received in MessagingContext:', payload);
      
      const newDisputeNotification: MessageNotification = {
        id: `new_dispute_${payload.dispute_id}_${Date.now()}`,
        type: 'dispute',
        title: 'New dispute created',
        message: `${payload.buyer_username} created a dispute for order #${payload.order_id}`,
        time: 'Just now',
        unread: true,
        disputeId: payload.dispute_id,
        orderId: payload.order_id,
        sender: payload.buyer_username
      };
      
      setNotifications(prev => [newDisputeNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('new_dispute', handleNewDispute);
    
    // Dispute message notification
    const handleDisputeMessage = (payload: any) => {
      if (!isMounted) return;
      console.log('🔍 Dispute message notification received in MessagingContext:', payload);
      
      const disputeMessageNotification: MessageNotification = {
        id: `dispute_message_${payload.dispute_id}_${Date.now()}`,
        type: 'dispute_message',
        title: 'New message in dispute',
        message: `New message in dispute #${payload.dispute_id}`,
        time: 'Just now',
        unread: true,
        disputeId: payload.dispute_id,
        sender: payload.sender_username
      };
      
      setNotifications(prev => [disputeMessageNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('dispute_message', handleDisputeMessage);
    
    // Dispute resolved notification
    const handleDisputeResolved = (payload: any) => {
      if (!isMounted) return;
      console.log('🔍 Dispute resolved notification received in MessagingContext:', payload);
      
      const disputeResolvedNotification: MessageNotification = {
        id: `dispute_resolved_${payload.dispute_id}_${Date.now()}`,
        type: 'dispute_resolved',
        title: 'Dispute resolved',
        message: `Dispute #${payload.dispute_id} has been resolved: ${payload.resolution}`,
        time: 'Just now',
        unread: true,
        disputeId: payload.dispute_id
      };
      
      setNotifications(prev => [disputeResolvedNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('dispute_resolved', handleDisputeResolved);
    
    // Initial load
    refreshNotifications();
    
    // Cleanup
    return () => {
      isMounted = false;
      realtimeService.unsubscribe('unread_count_update', handleUnreadCountUpdate);
      realtimeService.unsubscribe('recent_messages_update', handleRecentMessagesUpdate);
      realtimeService.unsubscribe('review_prompt', handleReviewPrompt);
      realtimeService.unsubscribe('new_review', handleNewReview);
      realtimeService.unsubscribe('new_dispute', handleNewDispute);
      realtimeService.unsubscribe('dispute_message', handleDisputeMessage);
      realtimeService.unsubscribe('dispute_resolved', handleDisputeResolved);
      // Do NOT disconnect the shared realtimeService here (prevents clearing callbacks)
    };
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

