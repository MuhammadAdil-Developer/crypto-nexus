const API_BASE_URL = "http://localhost:8000/api/v1";

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
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}/products${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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

  // Create product
  async createProduct(productData: Partial<Product>): Promise<ProductDetailResponse> {
    return this.makeRequest<ProductDetailResponse>('/create/', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  // Update product
  async updateProduct(productId: number, productData: Partial<Product>): Promise<ProductDetailResponse> {
    return this.makeRequest<ProductDetailResponse>(`/update/${productId}/`, {
      method: 'PUT',
      body: JSON.stringify(productData),
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
      body: JSON.stringify({ products }),
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
}

export const productService = new ProductService();
