import { API_BASE_URL, getWebSocketUrl } from '@/config/api';

class MessagingService {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private onMessageCallback: ((message: any) => void) | null = null;
  private onTypingCallback: ((data: any) => void) | null = null;
  private onConversationInfoCallback: ((data: any) => void) | null = null;
  private onConversationLockedCallback: ((data: any) => void) | null = null;
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

  // Admin method to get all conversations (when backend endpoint is available)
  async getAllConversations(): Promise<any[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/admin/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch all conversations');
    }
    
    return response.json();
  }

  // Get messages for a specific conversation
  async getConversationMessages(conversationId: string, page: number = 1, pageSize: number = 20): Promise<any[]> {
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
    
    const data = await response.json();
    return data;
  }

  async createProductConversation(productId: string | number, recipientId: string | number): Promise<any> {
    const token = localStorage.getItem('accessToken');
    
    // Convert both IDs to strings (they are UUIDs)
    const productIdStr = String(productId);
    const recipientIdStr = String(recipientId);
    
    const requestBody = {
      product_id: productIdStr,
      recipient_id: recipientIdStr,
    };
    
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/create-product/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || 'Failed to create conversation';
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  async getConversationByProduct(productId: string | number): Promise<any> {
    const token = localStorage.getItem('accessToken');
    // Ensure productId is a string (UUID)
    const productIdStr = String(productId);
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/product/${productIdStr}/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No conversation found for this product');
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to fetch conversation by product';
      throw new Error(errorMessage);
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
    
    // Trigger refresh of notifications after marking as read
    // The backend should send unread_count_update event, but we refresh just in case
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('messages_marked_read'));
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

  async lockConversation(conversationId: string, lock: boolean = true): Promise<any> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationId}/lock/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lock }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || 'Failed to lock conversation';
      throw new Error(errorMessage);
    }

    return response.json();
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
    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
    }
    
    this.conversationId = conversationId;
    const token = localStorage.getItem('accessToken');
    const wsUrl = getWebSocketUrl(`/ws/chat/${conversationId}/?token=${token}`);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'chat_message':
            if (this.onMessageCallback && data.data) {
              // Mark the message as not temporary when it comes from server
              const serverMessage = { ...data.data, isTemporary: false };
              this.onMessageCallback(serverMessage);
            }
            break;
          case 'product_reference':
            if (this.onMessageCallback && data.data) {
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
          case 'conversation_locked':
            if (this.onConversationLockedCallback) {
              this.onConversationLockedCallback(data.data);
            }
            break;
          case 'message_edited':
            // Handle message edit from WebSocket - send to realtimeService
            if (data.data) {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('message_edited', { detail: data.data }));
              }
            }
            break;
          case 'message_deleted':
            // Handle message delete from WebSocket - send to realtimeService
            if (data.data) {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('message_deleted', { detail: data.data }));
              }
            }
            break;
          case 'error':
            console.error('WebSocket error received:', data);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      this.ws = null;
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.conversationId = null;
  }

  async sendMessage(message: string, conversationId?: string, attachment?: File): Promise<any> {
    const convId = conversationId || this.conversationId;
    
    if (!convId) {
      throw new Error('No conversation ID available');
    }

    // Always use REST API - WebSocket will deliver the message in real-time
    // This ensures no duplicate messages and simpler logic
    return await this.sendMessageViaAPI(convId, message, attachment);
  }

  async sendMessageViaAPI(conversationId: string, content: string, attachment?: File, onProgress?: (progress: number) => void): Promise<any> {
    const token = localStorage.getItem('accessToken');
    const conversationIdStr = String(conversationId);
    
    if (attachment) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('conversation', conversationIdStr);
      formData.append('content', content || '');
      formData.append('attachment', attachment);
      
      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              // Don't create temp message here - component already handles it
              // The real message will come via WebSocket from the server
              resolve(response);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || errorData.message || 'Failed to send message'));
            } catch {
              reject(new Error('Failed to send message'));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error while sending file'));
        });
        
        xhr.open('POST', `${API_BASE_URL}/messaging/conversations/${conversationIdStr}/messages/`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } else {
      // Regular JSON payload for text messages
      const payload = {
        conversation: conversationIdStr,
        content: content,
        message_type: 'text',
      };
      
      const response = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationIdStr}/messages/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to send message';
        throw new Error(errorMessage);
      }
      
      return await response.json();
    }
  }
  
  async sendMessageWithAttachment(conversationId: string, content: string, attachment: File, onProgress?: (progress: number) => void): Promise<any> {
    return await this.sendMessageViaAPI(conversationId, content, attachment, onProgress);
  }
  
  async blockUser(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/users/${userId}/block/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message || 'User blocked successfully' };
      } else {
        return { success: false, error: data.error || data.message || 'Failed to block user' };
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: 'Network error while blocking user' };
    }
  }
  
  async unblockUser(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/users/${userId}/unblock/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message || 'User unblocked successfully' };
      } else {
        return { success: false, error: data.error || data.message || 'Failed to unblock user' };
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: 'Network error while unblocking user' };
    }
  }
  
  async getBlockedUsers(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/users/blocked/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (response.ok) {
        return { success: true, data: data.data || [] };
      } else {
        return { success: false, error: data.error || 'Failed to get blocked users' };
      }
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return { success: false, error: 'Network error while getting blocked users' };
    }
  }
  
  async reportUser(
    reportedUserId: string,
    reason: string,
    description: string,
    conversationId?: string,
    messageId?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/users/report/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          reason,
          description,
          conversation_id: conversationId,
          message_id: messageId,
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message || 'User reported successfully' };
      } else {
        return { success: false, error: data.error || data.message || 'Failed to report user' };
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      return { success: false, error: 'Network error while reporting user' };
    }
  }
  
  async getUserAttachments(userId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/users/${userId}/attachments/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (response.ok) {
        return { success: true, data: data.data || [] };
      } else {
        return { success: false, error: data.error || 'Failed to get attachments' };
      }
    } catch (error) {
      console.error('Error getting user attachments:', error);
      return { success: false, error: 'Network error while getting attachments' };
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

  onConversationLocked(callback: (data: any) => void): void {
    this.onConversationLockedCallback = callback;
  }

  // Utility Methods
  setProductContextInStorage(context: any): void {
    localStorage.setItem('productContext', JSON.stringify(context));
    if (context.isDispute) {
      localStorage.setItem('disputeContext', JSON.stringify({ 
        disputeId: context.disputeId, 
        conversationId: context.id 
      }));
    }
  }
  
  getProductContextFromStorage(): any {
    const context = localStorage.getItem('productContext');
    if (context) {
      const data = JSON.parse(context);
      localStorage.removeItem('productContext'); // Clear after reading
      return data;
    }
    return null;
  }

  // Home page notification APIs
  async getRecentMessages(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/recent-messages/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Recent messages API returned ${response.status}, returning empty array`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : (data?.results || data?.data || []);
    } catch (error) {
      console.warn('Failed to fetch recent messages, returning empty array:', error);
      return [];
    }
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
    // Handle both direct array and response.data format
    if (Array.isArray(data)) {
      return data;
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data?.results)) {
      return data.results;
    }
    return [];
  }
}

export const messagingService = new MessagingService();
