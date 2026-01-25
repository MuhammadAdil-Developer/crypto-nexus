// API Configuration
// This file centralizes all API base URL configuration
// Use environment variable VITE_API_BASE_URL or fallback to default

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.protocol}//api.${host}/api/v1`;
    }
  }
  return 'http://localhost:8000/api/v1';
};

const BASE_URL = getBaseUrl();
const BASE_URL_WITHOUT_API = BASE_URL.replace('/api/v1', '');

export const API_BASE_URL = BASE_URL;
export const API_BASE_URL_WITHOUT_API = BASE_URL_WITHOUT_API;

// WebSocket URL helper
export const getWebSocketUrl = (path: string): string => {
  // Check if we're on production (IP address or domain without localhost)
  const isProduction = !BASE_URL_WITHOUT_API.includes('localhost') && !BASE_URL_WITHOUT_API.includes('127.0.0.1');

  // For production, use wss if https, ws if http
  // For localhost, always use ws
  const wsProtocol = (isProduction && BASE_URL_WITHOUT_API.startsWith('https')) ? 'wss' : 'ws';
  const wsBase = BASE_URL_WITHOUT_API.replace(/^https?:\/\//, '');

  // Ensure we don't have double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${wsProtocol}://${wsBase}${cleanPath}`;
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

