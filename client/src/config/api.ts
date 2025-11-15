// API Configuration
// This file centralizes all API base URL configuration
// Use environment variable VITE_API_BASE_URL or fallback to default

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const BASE_URL_WITHOUT_API = BASE_URL.replace('/api/v1', '') || 'http://localhost:8000';

export const API_BASE_URL = BASE_URL;
export const API_BASE_URL_WITHOUT_API = BASE_URL_WITHOUT_API;

// WebSocket URL helper
export const getWebSocketUrl = (path: string): string => {
  const wsProtocol = BASE_URL_WITHOUT_API.startsWith('https') ? 'wss' : 'ws';
  const wsBase = BASE_URL_WITHOUT_API.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${wsBase}${path}`;
};

// Helper function to get full image URL
export const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL_WITHOUT_API}${url}`;
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http')) return endpoint;
  if (endpoint.startsWith('/')) {
    return `${API_BASE_URL}${endpoint}`;
  }
  return `${API_BASE_URL}/${endpoint}`;
};

