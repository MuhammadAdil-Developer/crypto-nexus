import { getWebSocketUrl } from '@/config/api';

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private userId: string | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.userId = localStorage.getItem('userId');
  }

  connect(): void {
    // Prevent duplicate connections
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Close existing connection if any (but preserve callbacks)
    if (this.ws) {
      console.log('🔄 Closing existing WebSocket connection before reconnecting...');
      this.ws.close();
      this.ws = null;
    }

    if (!this.userId) {
      this.userId = localStorage.getItem('userId');
      if (!this.userId) {
        console.warn('No user ID found, cannot connect to realtime service');
        return;
      }
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found, cannot connect to realtime service');
      return;
    }

    console.log('🔌 Connecting to realtime WebSocket...', { userId: this.userId });

    try {
      this.ws = new WebSocket(getWebSocketUrl(`/ws/realtime/${this.userId}/?token=${token}`));
      
      this.ws.onopen = () => {
        console.log('✅ Realtime WebSocket connected successfully');
        console.log(`🔍 Active callbacks after connection:`, Array.from(this.callbacks.keys()).map(k => `${k}:${this.callbacks.get(k)?.length || 0}`));
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        console.log('📨 Received realtime message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Parsed realtime data:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing realtime message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ Realtime WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        console.log(`🔍 Callbacks before reconnect:`, Array.from(this.callbacks.keys()).map(k => `${k}:${this.callbacks.get(k)?.length || 0}`));
        // Preserve callbacks during reconnect - don't clear them
        // Only reconnect if not a clean close (code 1000) or if it was an unexpected close
        if (event.code !== 1000 || !event.wasClean) {
          this.scheduleReconnect();
        } else {
          console.log('✅ WebSocket closed cleanly, not reconnecting');
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Realtime WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Error connecting to realtime service:', error);
    }
  }

  private handleMessage(data: any): void {
    const { type, data: payload, payload: payloadAlt } = data; // Backend sends both 'data' and 'payload'
    const actualPayload = payload || payloadAlt; // Use whichever is available
    console.log(`🔄 Handling realtime message type: ${type}`, actualPayload);
    
    switch (type) {
      case 'new_message':
        console.log('📩 Triggering new_message callbacks');
        this.triggerCallbacks('new_message', actualPayload);
        break;
      case 'new_message_notification':
        console.log('📩 Triggering new_message_notification callbacks');
        this.triggerCallbacks('new_message_notification', actualPayload);
        break;
      case 'message_read':
        console.log('👁️ Triggering message_read callbacks');
        this.triggerCallbacks('message_read', actualPayload);
        break;
      case 'unread_count_update':
        console.log('🔢 Triggering unread_count_update callbacks');
        this.triggerCallbacks('unread_count_update', actualPayload);
        break;
      case 'recent_messages_update':
        console.log('📋 Triggering recent_messages_update callbacks');
        this.triggerCallbacks('recent_messages_update', actualPayload);
        break;
      case 'new_review':
        console.log('⭐ Triggering new_review callbacks');
        this.triggerCallbacks('new_review', actualPayload);
        break;
      case 'review_prompt':
        console.log('🔔 Triggering review_prompt callbacks');
        this.triggerCallbacks('review_prompt', actualPayload);
        break;
      case 'new_dispute':
        console.log('⚖️ Triggering new_dispute callbacks');
        this.triggerCallbacks('new_dispute', actualPayload);
        break;
      case 'dispute_message':
        console.log('⚖️ Triggering dispute_message callbacks');
        this.triggerCallbacks('dispute_message', actualPayload);
        break;
      case 'dispute_resolved':
        console.log('⚖️ Triggering dispute_resolved callbacks');
        this.triggerCallbacks('dispute_resolved', actualPayload);
        break;
      case 'vendor_invitation':
        console.log('🔔 Triggering vendor_invitation callbacks');
        this.triggerCallbacks('vendor_invitation', actualPayload);
        break;
      case 'order_notification':
        console.log('📦 Triggering order_notification callbacks');
        this.triggerCallbacks('order_notification', actualPayload);
        break;
      default:
        console.log('❓ Unknown realtime message type:', type);
    }
  }

  private triggerCallbacks(eventType: string, payload: any): void {
    const callbacks = this.callbacks.get(eventType) || [];
    console.log(`🔔 Triggering ${eventType} callbacks, found ${callbacks.length} callbacks`);
    
    if (callbacks.length === 0) {
      console.error(`❌ NO CALLBACKS FOUND for ${eventType}! This means handlers were not subscribed.`);
      console.error(`❌ All registered callbacks:`, Array.from(this.callbacks.keys()));
    }
    
    callbacks.forEach((callback, index) => {
      try {
        console.log(`🔔 Executing callback ${index + 1}/${callbacks.length} for ${eventType}`);
        callback(payload);
        console.log(`✅ Callback ${index + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Error in realtime callback ${index + 1}:`, error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => {
        console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('❌ Max reconnection attempts reached, resetting and retrying...');
      // Reset attempts and try again after a longer delay (aggressive reconnection)
      this.reconnectAttempts = 0;
      setTimeout(() => {
        console.log('🔄 Resetting reconnection attempts and retrying...');
        this.connect();
      }, this.reconnectInterval * 2);
    }
  }

  subscribe(eventType: string, callback: Function): void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, []);
    }
    this.callbacks.get(eventType)!.push(callback);
    console.log(`✅ Subscribed to ${eventType}, total callbacks: ${this.callbacks.get(eventType)!.length}`);
  }

  unsubscribe(eventType: string, callback: Function): void {
    const callbacks = this.callbacks.get(eventType) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const realtimeService = new RealtimeService();
