const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export interface Product {
  id: number;
  headline: string;
  listing_title?: string;
  website: string;
  account_type: string;
  access_type: string;
  access_method: string;
  account_balance?: string;
  description: string;
  price: string;
  discount_percentage: string;
  additional_info?: string;
  delivery_time: string;
  delivery_method: string;
  special_features: string[];
  region_restrictions?: string[];
  credentials?: any;
  credentials_visible: boolean;
  main_image?: string;
  gallery_images?: string[];
  notes_for_buyer?: string;
  status: string;
  is_featured: boolean;
  is_active: boolean;
  approval_notes?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  rejected_by?: number;
  rejected_at?: string;
  views_count: number;
  favorites_count: number;
  rating: number;
  review_count: number;
  category: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
  };
  sub_category?: {
    id: number;
    name: string;
    slug: string;
    description?: string;
  };
  vendor: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  success: boolean;
  message: string;
  data: Product[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface ProductDetailResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface ViewTrackingResponse {
  success: boolean;
  message: string;
  view_created: boolean;
  views_count: number;
}

class ProductService {
  private async makeRequest<T>(endpoint: string, options: Omit<RequestInit, 'body' | 'headers'> & { body?: any; headers?: Record<string, string> } = {}): Promise<T> {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    // Handle body serialization before setting headers
    let serializedBody = options.body;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      serializedBody = JSON.stringify(options.body);
    }
    
    // Create headers object explicitly
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Merge any additional headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    
    const config: RequestInit = {
      ...options,
      headers,
      body: serializedBody as unknown as BodyInit,
    };

    console.log('🔍 Making request to:', `${API_BASE_URL}/products${endpoint}`);
    console.log('🔍 Request config:', {
      url: `${API_BASE_URL}/products${endpoint}`,
      method: config.method,
      headers: config.headers,
      body: config.body,
      bodyType: typeof config.body,
      bodyLength: typeof config.body === 'string' ? config.body.length : 0
    });

    const response = await fetch(`${API_BASE_URL}/products${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🔍 Request failed:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all products with filtering
  async getProducts(params: {
    search?: string;
    category?: string;
    account_type?: string;
    min_price?: string;
    max_price?: string;
    sort_by?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<ProductListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.makeRequest<ProductListResponse>(endpoint);
  }

  // Get buyer listings
  async getBuyerListings(): Promise<ProductListResponse> {
    return this.makeRequest<ProductListResponse>('/buyer/listings/');
  }

  // Get product details
  async getProductDetail(productId: number): Promise<ProductDetailResponse> {
    return this.makeRequest<ProductDetailResponse>(`/${productId}/`);
  }

  // Track product view
  async trackProductView(productId: number): Promise<ViewTrackingResponse> {
    return this.makeRequest<ViewTrackingResponse>(`/${productId}/track-view/`, {
      method: 'POST',
    });
  }

  // Get vendor products
  async getVendorProducts(): Promise<ProductListResponse> {
    return this.makeRequest<ProductListResponse>('/vendor/products/');
  }

  // Get public vendor products by username
  async getVendorPublicProducts(vendorUsername: string): Promise<ProductListResponse> {
    console.log('🔍 getVendorPublicProducts called with vendorUsername:', vendorUsername);
    console.log('🔍 Full URL will be:', `${API_BASE_URL}/products/vendor-public/${vendorUsername}/`);
    return this.makeRequest<ProductListResponse>(`/vendor-public/${vendorUsername}/`);
  }

  // Create product
  async createProduct(productData: Partial<Product>): Promise<ProductDetailResponse> {
    return this.makeRequest<ProductDetailResponse>('/create/', {
      method: 'POST',
      body: productData,
    });
  }

  // Update product
  async updateProduct(productId: number, productData: Partial<Product>): Promise<ProductDetailResponse> {
    return this.makeRequest<ProductDetailResponse>(`/update/${productId}/`, {
      method: 'PUT',
      body: productData,
    });
  }

  // Delete product
  async deleteProduct(productId: number): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/delete/${productId}/`, {
      method: 'DELETE',
    });
  }

  // Get categories
  async getCategories(): Promise<{
    success: boolean;
    message: string;
    data: Array<{
      id: number;
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      subcategories: Array<{
        id: number;
        name: string;
        slug: string;
        description?: string;
      }>;
    }>;
  }> {
    return this.makeRequest('/categories/');
  }

  // Reveal credentials
  async revealCredentials(productId: number): Promise<{
    success: boolean;
    message: string;
    data: {
      credentials: any;
      credentials_visible: boolean;
    };
  }> {
    return this.makeRequest(`/${productId}/reveal-credentials/`, {
      method: 'POST',
    });
  }

  // Bulk upload CSV
  async bulkUploadCSV(file: File): Promise<{
    success: boolean;
    message: string;
    created_products: number[];
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/products/bulk-upload/csv/`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Bulk upload simple
  async bulkUploadSimple(products: Partial<Product>[]): Promise<{
    success: boolean;
    message: string;
    created_products: number[];
    errors: string[];
  }> {
    return this.makeRequest('/bulk-upload/simple/', {
      method: 'POST',
      body: { products },
    });
  }

  // Get bulk upload template
  async getBulkUploadTemplate(): Promise<Blob> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/products/bulk-upload/template/`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // Reviews
  async getReviews(productId: number): Promise<{ success: boolean; message: string; data: any[] }> {
    return this.makeRequest<{ success: boolean; message: string; data: any[] }>(`/${productId}/reviews/`);
  }

  async postReview(productId: number, payload: { rating: number; comment: string; images?: string[] }): Promise<{ success: boolean; message: string; data?: any }> {
    return this.makeRequest<{ success: boolean; message: string; data?: any }>(`/${productId}/reviews/create/`, {
      method: 'POST',
      body: payload, // Let makeRequest handle JSON serialization
    });
  }

  // Vendor reviews (all for vendor)
  async getVendorReviews(params: { page?: number; page_size?: number; product_id?: number; search?: string; min_rating?: number; max_rating?: number; date_from?: string; date_to?: string; ordering?: string } = {}): Promise<{ success: boolean; message: string; data: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    const endpoint = qs ? `/reviews/vendor/?${qs}` : '/reviews/vendor/';
    return this.makeRequest(endpoint);
  }

  // Vendor product-specific reviews (simple for UI)
  async getVendorProductReviewsSimple(productId: number, params: { page?: number; page_size?: number; ordering?: string } = {}): Promise<{ success: boolean; message: string; data: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    const endpoint = qs ? `/vendor/products/${productId}/reviews/?${qs}` : `/vendor/products/${productId}/reviews/`;
    return this.makeRequest(endpoint);
  }

  // Buyer own reviews (simple for UI)
  async getMyReviewsSimple(params: { page?: number; page_size?: number; ordering?: string } = {}): Promise<{ success: boolean; message: string; data: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    const endpoint = qs ? `/reviews/mine/simple/?${qs}` : '/reviews/mine/simple/';
    return this.makeRequest(endpoint);
  }

  // Product reviews for modal
  async getProductReviewsModal(productId: number, params: { page?: number; page_size?: number } = {}): Promise<{ 
    success: boolean; 
    data: { 
      reviews: any[]; 
      product_stats: any; 
      pagination: any 
    } 
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    const endpoint = qs ? `/${productId}/reviews/modal/?${qs}` : `/${productId}/reviews/modal/`;
    return this.makeRequest(endpoint);
  }
}

export const productService = new ProductService();
