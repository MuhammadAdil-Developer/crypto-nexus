import React, { createContext, useContext, useState, useEffect } from 'react';
import { messagingService } from '@/services/messagingService';
import { realtimeService } from '@/services/realtimeService';
import notificationService from '@/services/notificationService';

interface MessageNotification {
  id: string;
  type: 'message' | 'order' | 'price_drop' | 'system' | 'review' | 'dispute' | 'dispute_message' | 'dispute_resolved' | 'listing_approval' | 'listing_rejection' | 'vendor_invitation';
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
  actionUrl?: string;
}

interface MessagingContextType {
  unreadCount: number;
  notifications: MessageNotification[];
  allNotifications: MessageNotification[];
  isLoading: boolean;
  refreshNotifications: (force?: boolean) => void;
  setUnreadCount: (count: number) => void;
  setNotifications: React.Dispatch<React.SetStateAction<MessageNotification[]>>;
  setAllNotifications: React.Dispatch<React.SetStateAction<MessageNotification[]>>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [allNotifications, setAllNotifications] = useState<MessageNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const refreshCacheTime = 30000; // 30 seconds cache
  
  // Use shared service singletons

  const refreshNotifications = async (force = false) => {
    // Prevent unnecessary reloads - use cache if refreshed recently
    const now = Date.now();
    if (!force && now - lastRefreshTime < refreshCacheTime && allNotifications.length > 0) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get unread count from notification service
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      
      // Get recent notifications (system, listings, etc.)
      const notificationsResponse = await notificationService.getRecentNotifications(20);
      const systemNotifications: MessageNotification[] = (notificationsResponse.data || []).map((n: any) => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        message: n.message,
        time: new Date(n.created_at).toLocaleString(),
        unread: !n.is_read,
        productId: n.data?.product_id,
        productTitle: n.data?.product_headline || n.data?.productTitle,
        actionUrl: n.data?.action_url
      }));
      
      // Get recent activity (messages)
      const recentActivity = await messagingService.getRecentActivity();
      
      // Convert to notification format
      // Use conversation ID or a unique identifier to prevent duplicates
      const messageNotifications: MessageNotification[] = (recentActivity || []).map((activity: any) => {
        // Extract conversation ID from activity if available, otherwise use timestamp
        const uniqueId = activity.conversation_id || activity.id || `msg_${Date.now()}_${Math.random()}`;
        return {
          id: `msg_activity_${uniqueId}`, // Prefix to distinguish from real-time notifications
        type: 'message',
        title: activity.title,
        message: activity.description,
        time: activity.time,
        unread: activity.status === 'info',
        sender: activity.description.split(' replied about')[0],
        product: activity.description.split(' replied about ')[1]?.split(':')[0]
        };
      });
      
      
      // Merge all notifications without duplicating by id
      const allMergedNotifications = (() => {
        // Create a fresh Map for each update
        const byId = new Map<string, MessageNotification>();
        
        // Add system notifications
        systemNotifications.forEach(n => byId.set(n.id, n));
        
        // Add message notifications
        messageNotifications.forEach(n => byId.set(n.id, n));
        
        // Convert to array and sort by time (most recent first)
        return Array.from(byId.values()).sort((a, b) => {
          const aTime = new Date(a.time).getTime();
          const bTime = new Date(b.time).getTime();
          return bTime - aTime;
        });
      })();
      
      // Set all notifications (both read and unread)
      setAllNotifications(() => allMergedNotifications);
      
      // Set only unread notifications for the main notifications array
      // Filter based on actual is_read status from API
      const unreadOnly = allMergedNotifications.filter(n => n.unread === true);
      setNotifications(unreadOnly);
      
      // Update unread count from API to ensure accuracy
      const freshCount = await notificationService.getUnreadCount();
      setUnreadCount(freshCount);
      
      // If count is 0, mark all notifications as read in state as well
      if (freshCount === 0) {
        setAllNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        setNotifications([]);
      }
      
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsLoading(false);
      setLastRefreshTime(Date.now());
    }
  };

  useEffect(() => {
    let isMounted = true;

    console.log('🔌 MessagingContext: Setting up WebSocket handlers...');
    
    // Listen for messages_marked_read event to refresh notifications
    const handleMessagesMarkedRead = () => {
      if (!isMounted) return;
      // Force refresh to get updated unread count
      refreshNotifications(true);
    };
    
    window.addEventListener('messages_marked_read', handleMessagesMarkedRead);
    
    // Subscribe to real-time updates FIRST (before connecting)
    const handleUnreadCountUpdate = (data: any) => {
      if (!isMounted) return;
      const newCount = data.unread_count || data.count || 0;
      console.log('🔢 Unread count update received:', newCount);
      setUnreadCount(newCount);
      
      // Also update notifications to mark messages as read
      setNotifications(prev => prev.map(n => {
        if (n.type === 'message') {
          return { ...n, unread: false };
        }
        return n;
      }));
      setAllNotifications(prev => prev.map(n => {
        if (n.type === 'message') {
          return { ...n, unread: false };
        }
        return n;
      }));
    };
    
    const handleRecentMessagesUpdate = (data: any) => {
      if (!isMounted) return;
      // Update notifications with latest message
      if (data && data.length > 0) {
        const latestMessage = data[0];
        // Get current user type to determine notification title
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userType = user?.user_type || 'buyer';
        
        // For vendors: "New message from buyer", For buyers: "New message from vendor"
        const title = userType === 'vendor' ? 'New message from buyer' : 'New message from vendor';
        const senderName = userType === 'vendor' ? latestMessage.buyer : (latestMessage.vendor || latestMessage.buyer);
        
        // Use conversation ID to prevent duplicates with activity-based notifications
        const conversationId = latestMessage.conversation_id || latestMessage.id;
        const newNotification: MessageNotification = {
          id: `msg_realtime_${conversationId}`, // Prefix to distinguish from activity notifications
          type: 'message',
          title: title,
          message: `${senderName} replied about ${latestMessage.product || 'product'}: ${latestMessage.lastMessage}`,
          time: latestMessage.time,
          unread: true,
          sender: senderName,
          product: latestMessage.product
        };
        
        setNotifications(prev => [newNotification, ...prev.filter(n => !n.id.includes(conversationId))]);
        setAllNotifications(prev => [newNotification, ...prev.filter(n => !n.id.includes(conversationId))]);
        // Update unread count
        setUnreadCount(prev => prev + 1);
      }
    };
    
    // Handle message read event to update unread count in real-time
    const handleMessageRead = (data: any) => {
      if (!isMounted) return;
      // When messages are read, refresh notifications to update unread count
      refreshNotifications();
    };
    
    // Handle order notifications (works for buyer, vendor, and admin)
    const handleOrderNotification = (data: any) => {
      if (!isMounted) {
        console.log('⚠️ handleOrderNotification: Component not mounted, ignoring');
        return;
      }
      
      console.log('📦 [ADMIN/VENDOR/BUYER] Order notification received via WebSocket:', data);
      
      // Check if this is a count refresh notification FIRST, before creating notification object
      const notificationData = data.data || data;
      if (notificationData?.action === 'refresh_counts' || notificationData?.data?.action === 'refresh_counts') {
        // Dispatch custom event to trigger count refresh, but don't add notification
        console.log('🔄 Count refresh notification received, triggering refresh_counts event');
        window.dispatchEvent(new CustomEvent('refresh_counts'));
        return;
      }
      
      // Use notification ID from backend if available
      const notificationId = data.id || data.data?.id || `noti_${Date.now()}_${Math.random()}`;
      const notificationType = data.type || data.data?.type || 'order_update';
      const orderId = data.order_id || data.data?.order_id || data.id;
      
      // Create unique ID for deduplication
      const uniqueId = notificationId;
      
      const newNotification: MessageNotification = {
        id: uniqueId,
        type: (notificationType === 'dispute' ? 'dispute' : 
               notificationType === 'payment' ? 'payment' :
               notificationType === 'system' ? 'system' :
               notificationType === 'listing_approval' ? 'listing_approval' : 'order') as any,
        title: data.title || data.data?.title || 'Notification',
        message: data.message || data.data?.message || 'You have a new notification',
        time: 'Just now',
        unread: true,
        productTitle: data.product_headline || data.data?.product_headline || data.data?.data?.product_headline,
        orderId: orderId,
        actionUrl: data.action_url || data.data?.action_url || data.data?.data?.action_url || '/admin'
      };
      
      console.log('📦 Adding notification:', newNotification);
      
      // Use notification ID from data if available for better deduplication
      const finalId = data.id || notificationId;
      
      // Use functional updates to avoid closure issues - check and add in one go
      setAllNotifications(prev => {
        // Check if already exists using notification ID from backend
        const exists = prev.some(n => n.id === finalId);
        if (exists) {
          console.log('📦 Notification already exists, updating it:', finalId);
          // Update existing notification but keep it unread
          return prev.map(n => 
            n.id === finalId ? { ...newNotification, unread: true, time: 'Just now' } : n
          );
        }
        // Add new notification at the beginning
        const updated = [newNotification, ...prev];
        console.log('📦 Added NEW notification, total count:', updated.length);
        return updated;
      });
      
      // Update unread notifications list (show all unread notifications)
      setNotifications(prev => {
        const exists = prev.some(n => n.id === finalId);
        if (exists) {
          return prev.map(n => 
            n.id === finalId ? { ...newNotification, unread: true, time: 'Just now' } : n
          );
        }
        // Add to unread list
        return [newNotification, ...prev];
      });
      
      // Always update unread count when new notification arrives
      setUnreadCount(prev => {
        const newCount = prev + 1;
        console.log('📦 [IMPORTANT] Updated unread count via WebSocket:', prev, '->', newCount);
        return newCount;
      });
      
      // Trigger count refresh for all users (admin/vendor/buyer) when message notification arrives
      if (notificationType === 'message' || newNotification.type === 'message') {
        // Dispatch custom event to trigger count refresh in AdminCountsContext, VendorCountsContext, and BuyerCountsContext
        window.dispatchEvent(new CustomEvent('refresh_counts'));
      }
      
      // Trigger count refresh for all users when order notification arrives
      if (notificationType === 'order' || newNotification.type === 'order' || notificationType === 'order_created' || notificationType === 'payment_confirmed' || notificationType === 'payment_received') {
        window.dispatchEvent(new CustomEvent('refresh_counts'));
      }
      
      // Trigger count refresh for all users when payout notification arrives
      if (notificationType === 'system' && (newNotification.title?.includes('Payout') || newNotification.message?.includes('payout'))) {
        window.dispatchEvent(new CustomEvent('refresh_counts'));
      }
    };
    
    // Subscribe to handlers FIRST before connecting
    console.log('🔌 [VENDOR/BUYER] Subscribing to order_notification handler...');
    realtimeService.subscribe('unread_count_update', handleUnreadCountUpdate);
    realtimeService.subscribe('recent_messages_update', handleRecentMessagesUpdate);
    realtimeService.subscribe('message_read', handleMessageRead);
    realtimeService.subscribe('order_notification', handleOrderNotification);
    console.log('✅ [VENDOR/BUYER] All handlers subscribed, verifying...');
    
    // Verify subscription immediately
    setTimeout(() => {
      const callbacks = (realtimeService as any).callbacks?.get('order_notification') || [];
      console.log(`🔍 Verification: order_notification has ${callbacks.length} callbacks registered`);
      if (callbacks.length === 0) {
        console.error('❌ CRITICAL: order_notification handler was NOT registered! Re-subscribing...');
        realtimeService.subscribe('order_notification', handleOrderNotification);
      }
    }, 100);
    
    // NOW connect after handlers are subscribed
    const connectWebSocket = () => {
      try {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('accessToken');
        console.log('🔌 Connecting WebSocket with userId:', userId, 'token exists:', !!token);
        
        if (!userId || !token) {
          console.warn('⚠️ userId or token not available, will retry in 1 second...');
          // Retry after 1 second if userId/token not available yet
          setTimeout(() => {
            if (isMounted) {
              connectWebSocket();
            }
          }, 1000);
          return;
        }
        
        realtimeService.connect();
        
        // Aggressively verify connection and retry if needed (for vendor/buyer/admin)
        const verifyConnection = () => {
          if (!isMounted) return;
          
          if (!realtimeService.isConnected()) {
            console.warn('⚠️ WebSocket not connected, retrying immediately...');
            realtimeService.connect();
            // Check again after 3 seconds
            setTimeout(verifyConnection, 3000);
          } else {
            console.log('✅ WebSocket connection verified');
            // Periodic health check every 30 seconds
            setTimeout(() => {
              if (isMounted && !realtimeService.isConnected()) {
                console.warn('⚠️ WebSocket connection lost during health check, reconnecting...');
                realtimeService.connect();
              }
            }, 30000);
          }
        };
        
        // Initial verification after 2 seconds
        setTimeout(verifyConnection, 2000);
      } catch (e) {
        console.error('Failed to connect realtimeService:', e);
        // Retry after 2 seconds on error
        setTimeout(() => {
          if (isMounted) {
            connectWebSocket();
          }
        }, 2000);
      }
    };
    
    connectWebSocket();
    
    // Subscribe to new message notifications
    const handleNewMessageNotification = (data: any) => {
      if (!isMounted) return;
      
      // Use conversation ID from payload to prevent duplicates
      const conversationId = data.conversation_id || data.id || Date.now();
      const newNotification: MessageNotification = {
        id: `msg_noti_${conversationId}`, // Use conversation ID to prevent duplicates
        type: 'message',
        title: data.title || 'New message',
        message: data.message || `${data.sender} sent you a message`,
        time: 'Just now',
        unread: true,
        sender: data.sender || data.sender_username,
        product: data.product_title
      };
      
      setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
      setAllNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
      setUnreadCount(prev => prev + 1);
    };
    
    realtimeService.subscribe('new_message_notification', handleNewMessageNotification);
    
    // Subscribe to listing notifications
    const handleListingNotification = (data: any) => {
      if (!isMounted) return;
      
      const newNotification: MessageNotification = {
        id: data.id || `listing_${Date.now()}`,
        type: data.type,
        title: data.title,
        message: data.message,
        time: new Date().toLocaleString(),
        unread: true,
        productId: data.data?.product_id,
        productTitle: data.data?.product_headline
      };
      
      setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
      setAllNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
    };
    
    realtimeService.subscribe('listing_notification', handleListingNotification);
    // Review prompt handler - show as notification instead of auto modal
    const handleReviewPrompt = (payload: any) => {
      if (!isMounted) return;
      
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
      setAllNotifications(prev => [reviewNotification, ...prev.filter(n => n.id !== reviewNotification.id)]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Also dispatch as window event for any components that want to listen
      window.dispatchEvent(new CustomEvent('review_prompt', { detail: payload }));
    };
    realtimeService.subscribe('review_prompt', handleReviewPrompt);
    
    // New review notification for vendors
    const handleNewReview = (payload: any) => {
      if (!isMounted) return;
      
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
      setAllNotifications(prev => [newReviewNotification, ...prev.filter(n => n.id !== newReviewNotification.id)]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('new_review', handleNewReview);
    
    // New dispute notification for vendors
    const handleNewDispute = (payload: any) => {
      if (!isMounted) return;
      
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
      setAllNotifications(prev => [newDisputeNotification, ...prev.filter(n => n.id !== newDisputeNotification.id)]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('new_dispute', handleNewDispute);
    
    // Dispute message notification
    const handleDisputeMessage = (payload: any) => {
      if (!isMounted) return;
      
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
      setAllNotifications(prev => [disputeMessageNotification, ...prev.filter(n => n.id !== disputeMessageNotification.id)]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('dispute_message', handleDisputeMessage);
    
    // Dispute resolved notification
    const handleDisputeResolved = (payload: any) => {
      if (!isMounted) return;
      
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
      setAllNotifications(prev => [disputeResolvedNotification, ...prev.filter(n => n.id !== disputeResolvedNotification.id)]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('dispute_resolved', handleDisputeResolved);
    
    // Vendor invitation notification handler
    const handleVendorInvitation = (payload: any) => {
      if (!isMounted) return;
      
      const vendorInvitationNotification: MessageNotification = {
        id: `vendor_invitation_${Date.now()}`,
        type: 'vendor_invitation',
        title: payload.title || 'Vendor Invitation',
        message: payload.message || "You've been invited to become a vendor on our marketplace!",
        time: 'Just now',
        unread: true,
        actionUrl: payload.action_url || '/vendor/apply'
      };
      
      setNotifications(prev => [vendorInvitationNotification, ...prev]);
      setAllNotifications(prev => [vendorInvitationNotification, ...prev.filter(n => n.id !== vendorInvitationNotification.id)]);
      setUnreadCount(prev => prev + 1);
    };
    realtimeService.subscribe('vendor_invitation', handleVendorInvitation);
    
    // Initial load
    refreshNotifications();
    
    // Listen for login events to ensure WebSocket connects after login
    const handleLogin = () => {
      console.log('🔐 Login detected, ensuring WebSocket connection...');
      if (isMounted && !realtimeService.isConnected()) {
        setTimeout(() => {
      if (isMounted) {
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('accessToken');
            if (userId && token) {
              console.log('🔌 Reconnecting WebSocket after login...');
              realtimeService.connect();
            }
          }
        }, 500);
      }
    };
    
    window.addEventListener('user_logged_in', handleLogin);
    
    // Note: No polling - real-time updates via WebSocket handle notifications and unread count
    // WebSocket will update unread count automatically when notifications arrive
    
    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener('messages_marked_read', handleMessagesMarkedRead);
      window.removeEventListener('user_logged_in', handleLogin);
      realtimeService.unsubscribe('unread_count_update', handleUnreadCountUpdate);
      realtimeService.unsubscribe('recent_messages_update', handleRecentMessagesUpdate);
      realtimeService.unsubscribe('message_read', handleMessageRead);
      realtimeService.unsubscribe('order_notification', handleOrderNotification);
      realtimeService.unsubscribe('new_message_notification', handleNewMessageNotification);
      realtimeService.unsubscribe('listing_notification', handleListingNotification);
      realtimeService.unsubscribe('review_prompt', handleReviewPrompt);
      realtimeService.unsubscribe('new_review', handleNewReview);
      realtimeService.unsubscribe('new_dispute', handleNewDispute);
      realtimeService.unsubscribe('dispute_message', handleDisputeMessage);
      realtimeService.unsubscribe('dispute_resolved', handleDisputeResolved);
      realtimeService.unsubscribe('vendor_invitation', handleVendorInvitation);
      // Do NOT disconnect the shared realtimeService here (prevents clearing callbacks)
    };
  }, []);

  return (
    <MessagingContext.Provider value={{
      unreadCount,
      notifications,
      allNotifications,
      isLoading,
      refreshNotifications,
      setUnreadCount,
      setNotifications,
      setAllNotifications
    }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    // Return default values instead of throwing error
    return {
      unreadCount: 0,
      notifications: [],
      allNotifications: [],
      isLoading: false,
      refreshNotifications: () => {},
      setUnreadCount: () => {}
    };
  }
  return context;
}

