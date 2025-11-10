import { api } from './authService';

export interface BuyerCounts {
  messages: number;
  orders: number;
  support: number;
}

export async function getBuyerCounts(): Promise<BuyerCounts> {
  try {
    const response = await api.get('/buyer/counts/');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch buyer counts');
  } catch (error) {
    console.error('Error fetching buyer counts:', error);
    // Return default counts on error
    return {
      messages: 0,
      orders: 0,
      support: 0,
    };
  }
}


