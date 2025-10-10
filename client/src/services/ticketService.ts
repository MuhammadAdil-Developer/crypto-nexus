import { authService, api } from './authService';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface Ticket {
  id: string;
  ticket_id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  user: string;
  user_type: 'buyer' | 'vendor' | 'admin';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  last_response_at?: string;
  response_count: number;
}

export interface TicketMessage {
  id: string;
  ticket: string;
  sender: string;
  sender_type: 'buyer' | 'vendor' | 'admin';
  message: string;
  is_internal: boolean;
  created_at: string;
  attachments?: string[];
}

export interface TicketStatistics {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  waiting_response_tickets: number;
  urgent_tickets: number;
  high_priority_tickets: number;
  tickets_by_category: Record<string, number>;
  tickets_by_status: Record<string, number>;
  avg_response_time: number;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ReplyTicketData {
  message: string;
  is_internal?: boolean;
  attachments?: File[];
}

class TicketService {
  private baseUrl = API_BASE_URL;

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Create a new support ticket
  async createTicket(data: CreateTicketData): Promise<{ success: boolean; message: string; data?: Ticket }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'Ticket created successfully', data: result };
      } else {
        return { success: false, message: result.message || 'Failed to create ticket' };
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      return { success: false, message: 'Network error while creating ticket' };
    }
  }

  // Get all tickets (admin) or user's tickets (buyer/vendor)
  async getTickets(params: any = {}): Promise<{ success: boolean; data?: Ticket[]; message?: string }> {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `${this.baseUrl}/tickets/?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.results || result.data || result };
      } else {
        return { success: false, message: result.message || 'Failed to fetch tickets' };
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return { success: false, message: 'Network error while fetching tickets' };
    }
  }

  // Get ticket details
  async getTicket(ticketId: string): Promise<{ success: boolean; data?: Ticket; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, message: result.message || 'Failed to fetch ticket' };
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return { success: false, message: 'Network error while fetching ticket' };
    }
  }

  // Get ticket messages/conversation
  async getTicketMessages(ticketId: string): Promise<{ success: boolean; data?: TicketMessage[]; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/messages/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.results || result.data || result };
      } else {
        return { success: false, message: result.message || 'Failed to fetch ticket messages' };
      }
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      return { success: false, message: 'Network error while fetching ticket messages' };
    }
  }

  // Reply to ticket
  async replyToTicket(ticketId: string, data: ReplyTicketData): Promise<{ success: boolean; message: string; data?: TicketMessage }> {
    try {
      const formData = new FormData();
      formData.append('message', data.message);
      if (data.is_internal !== undefined) {
        formData.append('is_internal', data.is_internal.toString());
      }
      
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
      }

      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/messages/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'Reply sent successfully', data: result };
      } else {
        return { success: false, message: result.message || 'Failed to send reply' };
      }
    } catch (error) {
      console.error('Error replying to ticket:', error);
      return { success: false, message: 'Network error while sending reply' };
    }
  }

  // Update ticket status (admin only)
  async updateTicketStatus(ticketId: string, status: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'Ticket status updated successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to update ticket status' };
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, message: 'Network error while updating ticket status' };
    }
  }

  // Assign ticket (admin only)
  async assignTicket(ticketId: string, assignedTo: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/assign/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'Ticket assigned successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to assign ticket' };
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      return { success: false, message: 'Network error while assigning ticket' };
    }
  }

  // Get ticket statistics
  async getTicketStatistics(): Promise<{ success: boolean; data?: TicketStatistics; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/statistics/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, message: result.message || 'Failed to fetch ticket statistics' };
      }
    } catch (error) {
      console.error('Error fetching ticket statistics:', error);
      return { success: false, message: 'Network error while fetching ticket statistics' };
    }
  }

  // Close ticket
  async closeTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/close/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'Ticket closed successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to close ticket' };
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      return { success: false, message: 'Network error while closing ticket' };
    }
  }

  // Get quick reply templates (admin only)
  async getQuickReplyTemplates(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/templates/`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.results || result.data || result };
      } else {
        return { success: false, message: result.message || 'Failed to fetch templates' };
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      return { success: false, message: 'Network error while fetching templates' };
    }
  }
}

export default new TicketService();
