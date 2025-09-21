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
    if (!this.userId) {
      console.warn('No user ID found, cannot connect to realtime service');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found, cannot connect to realtime service');
      return;
    }

    console.log('🔌 Connecting to realtime WebSocket...', { userId: this.userId });

    try {
      this.ws = new WebSocket(`ws://localhost:8000/ws/realtime/${this.userId}/?token=${token}`);
      
      this.ws.onopen = () => {
        console.log('✅ Realtime WebSocket connected successfully');
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

      this.ws.onclose = () => {
        console.log('❌ Realtime WebSocket disconnected');
        this.scheduleReconnect();
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
      default:
        console.log('❓ Unknown realtime message type:', type);
    }
  }

  private triggerCallbacks(eventType: string, payload: any): void {
    const callbacks = this.callbacks.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Error in realtime callback:', error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  subscribe(eventType: string, callback: Function): void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, []);
    }
    this.callbacks.get(eventType)!.push(callback);
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
