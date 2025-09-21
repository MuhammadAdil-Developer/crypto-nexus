const API_BASE_URL = 'http://localhost:8000/api/v1';

class MessagingService {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private onMessageCallback: ((message: any) => void) | null = null;
  private onTypingCallback: ((data: any) => void) | null = null;
  private onConversationInfoCallback: ((data: any) => void) | null = null;
  private baseUrl = API_BASE_URL;

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // API Methods
  async getConversations(): Promise<any[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    
    return response.json();
  }

  async getConversation(conversationId: string): Promise<any> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationId}/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }
    
    return response.json();
  }

  async getMessages(conversationId: string): Promise<any[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationId}/messages/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    return response.json();
  }

  async createProductConversation(productId: number, recipientId: number): Promise<any> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/create-product/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        recipient_id: recipientId,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    
    return response.json();
  }

  async getConversationByProduct(productId: number): Promise<any> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/product/${productId}/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversation by product');
    }
    
    return response.json();
  }

  async markMessagesRead(conversationId: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationId}/mark-read/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }
  }

  async reportMessage(messageId: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/messages/${messageId}/report/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to report message');
    }
  }

  async editMessage(messageId: string, content: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/messages/${messageId}/edit/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to edit message');
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/messages/${messageId}/delete/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
  }

  // WebSocket Methods
  connectToConversation(conversationId: string): void {
    this.conversationId = conversationId;
    const token = localStorage.getItem('accessToken');
    const wsUrl = `ws://localhost:8000/ws/chat/${conversationId}/?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'chat_message':
          if (this.onMessageCallback) {
            this.onMessageCallback(data.data);
          }
          break;
        case 'product_reference':
          if (this.onMessageCallback) {
            this.onMessageCallback(data.data);
          }
          break;
        case 'typing':
          if (this.onTypingCallback) {
            this.onTypingCallback(data);
          }
          break;
        case 'conversation_info':
          if (this.onConversationInfoCallback) {
            this.onConversationInfoCallback(data.data);
          }
          break;
        case 'error':
          console.error('WebSocket error:', data.message);
          break;
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.conversationId = null;
  }

  sendMessage(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        message: message,
      }));
    }
  }

  sendTyping(isTyping: boolean): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
      }));
    }
  }

  // Event Handlers
  onMessage(callback: (message: any) => void): void {
    this.onMessageCallback = callback;
  }

  onTyping(callback: (data: any) => void): void {
    this.onTypingCallback = callback;
  }

  onConversationInfo(callback: (data: any) => void): void {
    this.onConversationInfoCallback = callback;
  }

  // Utility Methods
  getProductContextFromStorage(): any {
    const context = localStorage.getItem('chatProductContext');
    if (context) {
      const data = JSON.parse(context);
      localStorage.removeItem('chatProductContext'); // Clear after reading
      return data;
    }
    return null;
  }

  // Home page notification APIs
  async getRecentMessages(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/messaging/recent-messages/`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recent messages');
    }

    return response.json();
  }

  async getUnreadCount(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/messaging/unread-count/`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch unread count: ${response.status} ${response.statusText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`API returned HTML instead of JSON: ${text.substring(0, 100)}...`);
    }

    const data = await response.json();
    return data.unread_count || 0;
  }

  async getRecentActivity(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/messaging/recent-activity/`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recent activity: ${response.status} ${response.statusText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`API returned HTML instead of JSON: ${text.substring(0, 100)}...`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
}

export const messagingService = new MessagingService();
