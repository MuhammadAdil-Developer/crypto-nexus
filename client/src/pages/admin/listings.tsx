import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Pagination } from "@/components/ui/pagination";
import { Search, Filter, Check, X, Edit, Trash2, Eye, Star, MapPin, Calendar, CheckCircle, XCircle, Clock, User, Tag, DollarSign, Loader2, Lock, CheckSquare, Square, Package, Shield, Key, Truck, FileText, Download, Folder, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// API Service
import { API_BASE_URL, getApiUrl, getImageUrl } from '@/config/api';
import authService from '@/services/authService';
import placeholderImage from "@/assets/placeholder.png";

interface Product {
  id: number;
  headline: string | null;
  listing_title?: string | null;
  website: string | null;
  account_type: string;
  access_type: string | null;
  account_balance: string | null;
  account_age?: string | null;
  access_method?: string | null;
  description: string;
  price: string;
  additional_info: string | null;
  delivery_time: string | null;
  delivery_method?: string | null;
  credentials_display: string;
  main_image: string | null;
  main_images?: string[];
  gallery_images: string[];
  documents?: string[];
  status: string;
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  rating: string;
  review_count: number;
  created_at: string;
  vendor_username: string;
  vendor?: {
    id: string;
    username: string;
    email: string;
  };
  category?: {
    id: string;
    name: string;
  };
  sub_category?: {
    id: string;
    name: string;
  } | null;
  escrow_enabled?: boolean;
  tags?: string[];
  special_features?: string[];
  region_restrictions?: string | null;
  notes_for_buyer?: string | null;
  quantity_available?: number;
  discount_percentage?: string | null;
  auto_delivery_script?: string | null;
}

export default function AdminListings() {
  const [createListingModalOpen, setCreateListingModalOpen] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const createForm = useForm({
    defaultValues: {
      title: "",
      website: "",
      description: "",
      vendor: "",
      category: "",
      account_type: "social",
      access_type: "full_ownership",
      access_method: "email_password",
      account_balance: "",
      additional_info: "",
      price: "0",
      discount_percentage: "0",
      delivery_time: "instant_auto",
      delivery_method: "instant",
      credentials: "",
      region_restrictions: "",
      notes_for_buyer: "",
      quantity_available: "1"
    }
  });

  const handleCreateListing = async (data: any) => {
    try {
      setCreatingListing(true);

      const token = authService.getToken() || localStorage.getItem('accessToken');
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please login to create product', variant: 'destructive' });
        return;
      }

      // Validate required fields
      if (!data.title || !data.website || !data.description || !data.vendor || !data.category || !data.account_type || !data.access_type || !data.delivery_time) {
        toast({ title: 'Validation Error', description: 'Please fill all required fields including category', variant: 'destructive' });
        return;
      }

      // Use multipart/form-data like vendor flow to support images/files
      const formDataPayload = new FormData();
      formDataPayload.append('headline', data.title || '');
      formDataPayload.append('website', data.website || '');
      formDataPayload.append('description', data.description || '');
      formDataPayload.append('category_id', data.category || '');
      formDataPayload.append('account_type', data.account_type || 'social');
      formDataPayload.append('access_type', data.access_type || 'full_ownership');
      formDataPayload.append('access_method', data.access_method || 'email_password');
      formDataPayload.append('price', data.price || '0');
      formDataPayload.append('discount_percentage', data.discount_percentage || '0');
      formDataPayload.append('delivery_time', data.delivery_time || 'instant_auto');
      formDataPayload.append('delivery_method', data.delivery_method || 'instant');
      if (data.account_balance) formDataPayload.append('account_balance', data.account_balance);
      if (data.additional_info) formDataPayload.append('additional_info', data.additional_info);
      if (data.credentials) formDataPayload.append('credentials', data.credentials);
      if (data.region_restrictions) formDataPayload.append('region_restrictions', data.region_restrictions);
      if (data.notes_for_buyer) formDataPayload.append('notes_for_buyer', data.notes_for_buyer);
      if (data.quantity_available) formDataPayload.append('quantity_available', data.quantity_available);
      if (data.vendor) formDataPayload.append('vendor_username', data.vendor);

      const response = await fetch(getApiUrl('/products/create/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataPayload
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success !== false) {
        toast({ title: 'Success', description: 'Product created successfully' });
        setCreateListingModalOpen(false);
        createForm.reset();
        fetchAllProducts();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to create product',
          variant: 'destructive'
        });
        if (result.errors) {
          console.error('Validation errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Create product error:', error);
      toast({ title: 'Error', description: 'Failed to create product', variant: 'destructive' });
    } finally {
      setCreatingListing(false);
    }
  };

  // Vendor selector state and helpers
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorLoading, setVendorLoading] = useState(false);
  const vendorSearchTimeout = useRef<number | null>(null as any);

  // Category management state
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState(0);

  const fetchVendors = async (search: string = '') => {
    try {
      setVendorLoading(true);
      const token = authService.getToken() || localStorage.getItem('accessToken');
      if (!token) return;

      let url = `${API_BASE_URL}/vendors/approved/?page_size=50`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return setVendors([]);
      const data = await res.json();
      // Support multiple shapes
      const list = (data?.data && Array.isArray(data.data)) ? data.data : (data.results || data || []);
      setVendors(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to fetch vendors', e);
      setVendors([]);
    } finally {
      setVendorLoading(false);
    }
  };

  useEffect(() => {
    // fetch initial vendor list when modal opens
    if (createListingModalOpen) fetchVendors('');
  }, [createListingModalOpen]);

  useEffect(() => {
    // debounce vendor search
    if (vendorSearchTimeout.current) window.clearTimeout(vendorSearchTimeout.current);
    vendorSearchTimeout.current = window.setTimeout(() => {
      fetchVendors(vendorSearch);
    }, 250) as any;
    return () => {
      if (vendorSearchTimeout.current) window.clearTimeout(vendorSearchTimeout.current);
    };
  }, [vendorSearch]);
  const [viewListingModalOpen, setViewListingModalOpen] = useState(false);
  const [editListingModalOpen, setEditListingModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Product | null>(null);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentFilter, setCurrentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);

  // Pagination state - Changed default to 10
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Selection state for bulk operations
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const { toast } = useToast();

  const editForm = useForm({
    defaultValues: {
      title: "",
      website: "",
      description: "",
      vendor: "",
      category: "",
      btcPrice: "",
      xmrPrice: "",
      delivery: "",
      status: "Pending"
    }
  });

  // Fetch pending products and categories
  useEffect(() => {
    fetchAllProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = authService.getToken() || localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/categories/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }

    try {
      const token = authService.getToken() || localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/categories/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
          sort_order: categorySortOrder,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'Category created successfully' });
        setCategoryModalOpen(false);
        setCategoryName('');
        setCategoryDescription('');
        setCategorySortOrder(0);
        fetchCategories();
      } else {
        toast({ title: 'Error', description: result.message || 'Failed to create category', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryName.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }

    try {
      const token = authService.getToken() || localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/categories/${editingCategory.id}/update/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
          sort_order: categorySortOrder,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'Category updated successfully' });
        setCategoryModalOpen(false);
        setEditingCategory(null);
        setCategoryName('');
        setCategoryDescription('');
        setCategorySortOrder(0);
        fetchCategories();
      } else {
        toast({ title: 'Error', description: result.message || 'Failed to update category', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const token = authService.getToken() || localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/categories/${categoryId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Category deleted successfully' });
        fetchCategories();
      } else {
        const result = await response.json();
        toast({ title: 'Error', description: result.message || 'Failed to delete category', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  const openEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryName(category.name || '');
    setCategoryDescription(category.description || '');
    setCategorySortOrder(category.sort_order || 0);
    setCategoryModalOpen(true);
  };

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFilter, selectedCategoryFilter]);

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/admin/all/?page_size=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Backend Response (All Products):', data);
        console.log('📊 Products data:', data.data);

        // FIXED: data.data is directly the array, not data.data.products
        const products = data.data || [];
        console.log('📊 Products array:', products);
        console.log('📊 Products with statuses:', products.map(p => ({ id: p.id, status: p.status, headline: p.headline })));

        setAllProducts(products);
        setPendingProducts(products);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (productId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/admin/${productId}/approve/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product approved successfully",
        });
        fetchAllProducts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to approve product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: "Error",
        description: "Failed to approve product",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (productId: number, reason: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/admin/${productId}/reject/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_notes: reason }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product rejected successfully",
        });
        fetchAllProducts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to reject product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: "Error",
        description: "Failed to reject product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/products/delete/${productId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
        fetchAllProducts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedListing(product);
    editForm.reset({
      title: product.headline || "",
      website: product.website || "",
      description: product.description || "",
      vendor: product.vendor_username || "",
      category: product.account_type || "",
      btcPrice: product.price || "",
      xmrPrice: product.price || "",
      delivery: product.delivery_time || "",
      status: product.status || "Pending"
    });
    setEditListingModalOpen(true);
  };

  const handleUpdateProduct = async (data: any) => {
    if (!selectedListing) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      // Map form data to API format
      const updateData: any = {
        headline: data.title,
        description: data.description,
        price: data.btcPrice,
        delivery_time: data.delivery,
        account_type: data.category,
      };

      // Add website if provided
      if (data.website) {
        updateData.website = data.website;
      }

      // Use vendor update endpoint - admins can update any product
      const response = await fetch(`${API_BASE_URL}/products/update/${selectedListing.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
        setEditListingModalOpen(false);
        fetchAllProducts(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleView = async (product: Product) => {
    try {
      // Fetch full product details
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/${product.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSelectedListing(data.data);
          setViewListingModalOpen(true);
        } else {
          // Fallback to basic product data
          setSelectedListing(product);
          setViewListingModalOpen(true);
        }
      } else {
        // Fallback to basic product data
        setSelectedListing(product);
        setViewListingModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      // Fallback to basic product data
      setSelectedListing(product);
      setViewListingModalOpen(true);
    }
  };

  // Bulk selection functions
  const handleSelectAll = () => {
    const pendingProducts = allProducts.filter(product => product.status === 'pending_approval');

    if (isSelectAll) {
      // Deselect all
      setSelectedProducts([]);
      setIsSelectAll(false);
    } else {
      // Select all pending products
      const allPendingIds = pendingProducts.map(product => product.id);
      setSelectedProducts(allPendingIds);
      setIsSelectAll(true);
    }
  };

  const handleSelectProduct = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      setIsSelectAll(false);
    } else {
      const newSelected = [...selectedProducts, productId];
      setSelectedProducts(newSelected);

      // Check if all pending products are now selected
      const pendingProducts = allProducts.filter(product => product.status === 'pending_approval');
      setIsSelectAll(newSelected.length === pendingProducts.length);
    }
  };

  const handleApproveAllSelected = async () => {
    if (selectedProducts.length === 0) return;

    try {
      setIsApprovingAll(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access admin panel",
          variant: "destructive",
        });
        return;
      }

      // Approve all selected products
      const approvePromises = selectedProducts.map(async (productId) => {
        const response = await fetch(`${API_BASE_URL}/products/admin/${productId}/approve/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        return response.ok;
      });

      const results = await Promise.all(approvePromises);
      const successCount = results.filter(result => result).length;

      if (successCount === selectedProducts.length) {
        toast({
          title: "Bulk Approval Successful",
          description: `${successCount} products have been approved successfully`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `${successCount} out of ${selectedProducts.length} products were approved`,
        });
      } else {
        toast({
          title: "Bulk Approval Failed",
          description: "Failed to approve any products",
          variant: "destructive",
        });
      }

      // Clear selection and refresh data
      setSelectedProducts([]);
      setIsSelectAll(false);
      fetchAllProducts();
    } catch (error) {
      console.error('Error approving products:', error);
      toast({
        title: "Error",
        description: "Failed to approve products",
        variant: "destructive",
      });
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Filter products based on current filter, category, and search
  const getFilteredProducts = () => {
    let filtered = allProducts;

    // Apply status filter
    if (currentFilter === 'pending') {
      filtered = filtered.filter(product => product.status === 'pending_approval');
    } else if (currentFilter === 'approved') {
      filtered = filtered.filter(product => product.status === 'approved');
    } else if (currentFilter === 'rejected') {
      filtered = filtered.filter(product => product.status === 'rejected');
    }

    // Apply category filter
    if (selectedCategoryFilter && selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(product => {
        const productCategoryId = product.category?.id || product.category;
        return productCategoryId === selectedCategoryFilter || productCategoryId?.toString() === selectedCategoryFilter;
      });
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.headline?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.vendor_username?.toLowerCase().includes(searchLower) ||
        product.account_type?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Get paginated products
  const getPaginatedProducts = () => {
    const filteredProducts = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending_approval':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending_approval':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-white">Loading listings...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Product Listings</h1>
            <p className="text-gray-300 mt-1">Manage all marketplace product listings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setEditingCategory(null);
              setCategoryName('');
              setCategoryDescription('');
              setCategorySortOrder(0);
              setCategoryModalOpen(true);
            }}>
              <Tag className="mr-2 h-4 w-4" /> Manage Categories
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateListingModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>

            <Dialog open={createListingModalOpen} onOpenChange={setCreateListingModalOpen}>
              <DialogTrigger asChild>
                <div style={{ display: 'none' }} />
              </DialogTrigger>
              <DialogContent className="max-h-[95vh] w-full sm:max-w-2xl mx-auto p-4 sm:p-6 overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl">Add Product</DialogTitle>
                  <DialogDescription className="text-sm">Create a new product listing (admin)</DialogDescription>
                </DialogHeader>

                <form onSubmit={createForm.handleSubmit(handleCreateListing)} className="space-y-4 mt-4">
                  {/* Vendor Selection */}
                  <div>
                    <Label className="text-sm font-medium">Vendor * (search)</Label>
                    <Input
                      placeholder="Search vendor username or shop name..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="bg-surface-2 border-border text-white text-sm mt-1"
                    />
                    <div className="mt-2 max-h-40 overflow-y-auto bg-surface-2 border border-border rounded">
                      {vendorLoading ? (
                        <div className="p-3 text-gray-400 text-sm">Searching vendors...</div>
                      ) : vendors.length === 0 ? (
                        <div className="p-3 text-gray-400 text-sm">No vendors found</div>
                      ) : (
                        vendors.map((v: any) => (
                          <div
                            key={v.id || v.vendor_username}
                            className="p-3 hover:bg-gray-700/40 cursor-pointer text-white border-b border-border/30 last:border-b-0"
                            onClick={() => {
                              createForm.setValue('vendor', v.vendor_username);
                              setVendorSearch('');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{v.business_name || v.vendor_username}</div>
                                <div className="text-xs text-gray-400">@{v.vendor_username}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {createForm.getValues('vendor') && (
                      <p className="text-xs text-green-400 mt-2">✓ Selected: {createForm.getValues('vendor')}</p>
                    )}
                  </div>

                  {/* Main Product Info */}
                  <div className="space-y-3 border-t border-gray-600/30 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300">Product Information</h3>

                    <div>
                      <Label className="text-sm">Title *</Label>
                      <Input {...createForm.register('title', { required: true })} placeholder="e.g., Premium Zoom Account" className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Website *</Label>
                      <Input {...createForm.register('website', { required: true })} placeholder="e.g., zoom.com" className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Description *</Label>
                      <Textarea {...createForm.register('description', { required: true })} placeholder="Detailed description of the account" rows={3} className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Category *</Label>
                      <Select
                        value={createForm.watch('category')}
                        onValueChange={(v) => createForm.setValue('category', v)}
                      >
                        <SelectTrigger className="bg-surface-2 border-border text-white text-sm mt-1">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-2 border-border">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Account Type *</Label>
                        <Select defaultValue={createForm.getValues('account_type')} onValueChange={(v) => createForm.setValue('account_type', v)}>
                          <SelectTrigger className="bg-surface-2 border-border text-white text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-2 border-border">
                            <SelectItem value="messengers">Messengers</SelectItem>
                            <SelectItem value="streaming">Streaming</SelectItem>
                            <SelectItem value="gaming">Gaming</SelectItem>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="trading">Trading/Exchange</SelectItem>
                            <SelectItem value="software">Software</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">Access Type *</Label>
                        <Select defaultValue={createForm.getValues('access_type')} onValueChange={(v) => createForm.setValue('access_type', v)}>
                          <SelectTrigger className="bg-surface-2 border-border text-white text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-2 border-border">
                            <SelectItem value="full_ownership">Full Ownership</SelectItem>
                            <SelectItem value="access">Access</SelectItem>
                            <SelectItem value="shared">Shared</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Delivery Time *</Label>
                        <Select defaultValue={createForm.getValues('delivery_time')} onValueChange={(v) => createForm.setValue('delivery_time', v)}>
                          <SelectTrigger className="bg-surface-2 border-border text-white text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-2 border-border">
                            <SelectItem value="instant_auto">Instant Auto-delivery</SelectItem>
                            <SelectItem value="manual_24h">Manual delivery within 24hrs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">Access Method</Label>
                        <Select defaultValue={createForm.getValues('access_method')} onValueChange={(v) => createForm.setValue('access_method', v)}>
                          <SelectTrigger className="bg-surface-2 border-border text-white text-sm mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface-2 border-border">
                            <SelectItem value="email_password">Email & Password</SelectItem>
                            <SelectItem value="url_token">URL & Token</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Account Info */}
                  <div className="space-y-3 border-t border-gray-600/30 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300">Pricing & Account Details</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Price (USD) *</Label>
                        <Input {...createForm.register('price', { required: true })} type="number" step="0.01" placeholder="0.00" className="text-sm mt-1" />
                      </div>

                      <div>
                        <Label className="text-sm">Discount % (optional)</Label>
                        <Input {...createForm.register('discount_percentage')} type="number" step="0.01" placeholder="0" className="text-sm mt-1" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Account Balance</Label>
                      <Input {...createForm.register('account_balance')} placeholder="e.g., $100 credit" className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Quantity Available</Label>
                      <Input {...createForm.register('quantity_available')} type="number" placeholder="1" className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Region Restrictions</Label>
                      <Input {...createForm.register('region_restrictions')} placeholder="e.g., US only, EU restricted" className="text-sm mt-1" />
                    </div>
                  </div>

                  {/* Credentials & Notes */}
                  <div className="space-y-3 border-t border-gray-600/30 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300">Credentials & Additional Info</h3>

                    <div>
                      <Label className="text-sm">Credentials</Label>
                      <Textarea {...createForm.register('credentials')} placeholder="Username:password or other access details" rows={2} className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Additional Information</Label>
                      <Textarea {...createForm.register('additional_info')} placeholder="Any extra details about the account" rows={2} className="text-sm mt-1" />
                    </div>

                    <div>
                      <Label className="text-sm">Notes for Buyer</Label>
                      <Textarea {...createForm.register('notes_for_buyer')} placeholder="Instructions or warnings for the buyer" rows={2} className="text-sm mt-1" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-gray-600/30 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCreateListingModalOpen(false)}
                      className="text-sm w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={creatingListing}
                      className="text-sm w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                    >
                      {creatingListing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Product
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-accent text-sm font-semibold">T</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Products</p>
                  <p className="text-lg font-bold text-white">{allProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending Review</p>
                  <p className="text-lg font-bold text-white">
                    {allProducts.filter(p => p.status === 'pending_approval').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Approved</p>
                  <p className="text-lg font-bold text-white">
                    {allProducts.filter(p => p.status === 'approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rejected</p>
                  <p className="text-lg font-bold text-white">
                    {allProducts.filter(p => p.status === 'rejected').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10 bg-surface-2 border-border text-white placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={currentFilter} onValueChange={(value: any) => setCurrentFilter(value)}>
                  <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="all" className="text-white">All Status</SelectItem>
                    <SelectItem value="pending" className="text-white">Pending Review</SelectItem>
                    <SelectItem value="approved" className="text-white">Approved</SelectItem>
                    <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategoryFilter} onValueChange={(value: any) => setSelectedCategoryFilter(value)}>
                  <SelectTrigger className="w-48 bg-surface-2 border-border text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="all" className="text-white">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-white">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="crypto-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Products ({filteredProducts.length})</CardTitle>
              {currentFilter === 'pending' && allProducts.filter(p => p.status === 'pending_approval').length > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-pending-products"
                      checked={isSelectAll}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all-pending-products" className="text-sm text-gray-300">
                      Select All
                    </Label>
                  </div>
                  {selectedProducts.length > 0 && (
                    <Button
                      onClick={handleApproveAllSelected}
                      disabled={isApprovingAll}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isApprovingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Approve All Selected ({selectedProducts.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Product</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Category</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Vendor</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Price</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Views</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Created</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPaginatedProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-surface-2/50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          {currentFilter === 'pending' && product.status === 'pending_approval' && (
                            <Checkbox
                              id={`select-product-${product.id}`}
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => handleSelectProduct(product.id)}
                            />
                          )}
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                            <img
                              src={getImageUrl(product.main_image) || placeholderImage}
                              alt={product.headline || 'Product'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = placeholderImage;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{product.headline || 'Untitled'}</p>
                            <p className="text-gray-400 text-sm truncate">{product.website || 'No website'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-purple-400 border-purple-400">
                          {product.category?.name || 'No Category'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-white">{product.vendor_username}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge className={getStatusColor(product.status)}>
                            {getStatusDisplayName(product.status)}
                          </Badge>
                          {product.escrow_enabled && (
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-xs px-1.5 py-0.5">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              ESCROW
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-bold">${parseFloat(product.price).toFixed(2)}</span>
                        <span className="text-gray-400 text-xs font-mono ml-1">≈ {parseFloat((parseFloat(product.price) / 100000).toFixed(8))} BTC</span>
                      </td>
                      <td className="p-4">
                        <span className="text-white">{product.views_count || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300 text-sm">
                          {new Date(product.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => handleView(product)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {product.status === 'pending_approval' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300"
                                onClick={() => {
                                  setActionProduct(product);
                                  setIsApproveConfirmOpen(true);
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => {
                                  setActionProduct(product);
                                  setIsRejectConfirmOpen(true);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => {
                              setActionProduct(product);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No products found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredProducts.length}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </CardContent>
        </Card>

        {/* Edit Product Modal */}
        <Dialog open={editListingModalOpen} onOpenChange={setEditListingModalOpen}>
          <DialogContent className="max-w-2xl bg-card text-white border border-gray-600/30">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Edit Product</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateProduct)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Product Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Enter product title"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Website</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Enter website URL"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Enter product description"
                          rows={4}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="btcPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.00000001"
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="0.00"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="delivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Delivery Time</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="e.g., instant_auto"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="streaming">Streaming</SelectItem>
                          <SelectItem value="gaming">Gaming</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditListingModalOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent text-bg hover:bg-accent-2"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Product Modal */}
        <Dialog open={viewListingModalOpen} onOpenChange={setViewListingModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-card text-white border border-gray-600/30 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-gray-600/20 bg-card">
              <DialogTitle className="text-xl font-bold text-white">Product Details</DialogTitle>
            </DialogHeader>

            {selectedListing && (
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="p-6 space-y-6">
                  {/* Product Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Product ID</Label>
                      <p className="text-lg font-mono text-accent font-semibold mt-1">{selectedListing.id}</p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</Label>
                      <div className="mt-1 space-y-1">
                        <Badge className={getStatusColor(selectedListing.status)}>
                          {getStatusDisplayName(selectedListing.status)}
                        </Badge>
                        {selectedListing.escrow_enabled && (
                          <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 text-xs px-1.5 py-0.5">
                            <Lock className="w-2.5 h-2.5 mr-0.5" />
                            ESCROW PROTECTED
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Created</Label>
                      <p className="text-white font-medium mt-1 text-sm">
                        {new Date(selectedListing.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Main Image */}
                  {(selectedListing.main_image || (selectedListing.main_images && selectedListing.main_images.length > 0)) && (
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <h3 className="text-lg font-semibold text-white mb-3">Main Image</h3>
                      <img
                        src={
                          selectedListing.main_image
                            ? (selectedListing.main_image.startsWith('http') ? selectedListing.main_image : `http://localhost:8000${selectedListing.main_image}`)
                            : (selectedListing.main_images && selectedListing.main_images.length > 0
                              ? (selectedListing.main_images[0].startsWith('http') ? selectedListing.main_images[0] : `http://localhost:8000${selectedListing.main_images[0]}`)
                              : '')
                        }
                        alt={selectedListing.headline || 'Product'}
                        className="w-full h-64 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                        }}
                      />
                    </div>
                  )}

                  {/* Product Information */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Product Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Headline</Label>
                          <p className="text-white font-medium">{selectedListing.headline || selectedListing.listing_title || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Website</Label>
                          <p className="text-white font-medium">{selectedListing.website || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Category</Label>
                          <p className="text-white font-medium">{selectedListing.category?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Sub Category</Label>
                          <p className="text-white font-medium">{selectedListing.sub_category?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Price</Label>
                          <span className="text-white font-bold text-lg">${parseFloat(selectedListing.price).toFixed(2)}</span>
                          <span className="text-gray-400 text-sm font-mono ml-2">≈ {parseFloat((parseFloat(selectedListing.price) / 100000).toFixed(8))} BTC</span>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Vendor</Label>
                          <p className="text-white font-medium">{selectedListing.vendor_username || selectedListing.vendor?.username || 'N/A'}</p>
                        </div>
                        {selectedListing.quantity_available !== undefined && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Stock Available</Label>
                            <p className="text-white font-medium">{selectedListing.quantity_available}</p>
                          </div>
                        )}
                        {selectedListing.discount_percentage && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Discount</Label>
                            <p className="text-green-400 font-medium">{selectedListing.discount_percentage}%</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-400">Description</Label>
                        <p className="text-white mt-1 leading-relaxed">{selectedListing.description}</p>
                      </div>

                      {selectedListing.additional_info && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Additional Information</Label>
                          <p className="text-white mt-1 leading-relaxed">{selectedListing.additional_info}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Account Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Account Type</Label>
                        <p className="text-white font-medium">{selectedListing.account_type || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Access Type</Label>
                        <p className="text-white font-medium">{selectedListing.access_type || 'N/A'}</p>
                      </div>
                      {selectedListing.account_balance && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Account Balance</Label>
                          <p className="text-white font-medium">{selectedListing.account_balance}</p>
                        </div>
                      )}
                      {selectedListing.account_age && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Account Age</Label>
                          <p className="text-white font-medium">{selectedListing.account_age}</p>
                        </div>
                      )}
                      {selectedListing.access_method && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Access Method</Label>
                          <p className="text-white font-medium">{selectedListing.access_method}</p>
                        </div>
                      )}
                      {selectedListing.credentials_display && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Credentials</Label>
                          <p className="text-white font-medium">{selectedListing.credentials_display}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Delivery Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedListing.delivery_method && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Delivery Method</Label>
                          <p className="text-white font-medium">{selectedListing.delivery_method}</p>
                        </div>
                      )}
                      {selectedListing.delivery_time && (
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Delivery Time</Label>
                          <p className="text-white font-medium">{selectedListing.delivery_time}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags & Special Features */}
                  {(selectedListing.tags && selectedListing.tags.length > 0) || (selectedListing.special_features && selectedListing.special_features.length > 0) || selectedListing.region_restrictions ? (
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <h3 className="text-lg font-semibold text-white mb-3">Tags & Features</h3>
                      <div className="space-y-3">
                        {selectedListing.tags && selectedListing.tags.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400 mb-2 block">Tags</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedListing.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-purple-400 border-purple-400">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedListing.special_features && selectedListing.special_features.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400 mb-2 block">Special Features</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedListing.special_features.map((feature: string, index: number) => (
                                <Badge key={index} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedListing.region_restrictions && (
                          <div>
                            <Label className="text-sm font-medium text-gray-400 mb-2 block">Region Restrictions</Label>
                            <p className="text-white text-sm">{selectedListing.region_restrictions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Notes for Buyer */}
                  {selectedListing.notes_for_buyer && (
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <h3 className="text-lg font-semibold text-white mb-3">Notes for Buyer</h3>
                      <p className="text-white text-sm leading-relaxed">{selectedListing.notes_for_buyer}</p>
                    </div>
                  )}

                  {/* Gallery Images */}
                  {selectedListing.gallery_images && selectedListing.gallery_images.length > 0 && (
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <h3 className="text-lg font-semibold text-white mb-3">Gallery Images</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedListing.gallery_images.map((image: string, index: number) => {
                          const imageUrl = image.startsWith('http') ? image : `http://localhost:8000${image}`;
                          return (
                            <div key={index} className="relative group">
                              <img
                                src={imageUrl}
                                alt={`Gallery image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-600 group-hover:border-blue-400 transition-colors"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {selectedListing.documents && selectedListing.documents.length > 0 && (
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                      <h3 className="text-lg font-semibold text-white mb-3">Documents</h3>
                      <div className="space-y-3">
                        {selectedListing.documents.map((doc: string, index: number) => {
                          const docUrl = doc.startsWith('http') ? doc : `http://localhost:8000${doc}`;
                          const docName = doc.split('/').pop() || `Document ${index + 1}`;
                          return (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                              <FileText className="w-5 h-5 text-blue-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">Document {index + 1}</p>
                                <p className="text-gray-400 text-xs truncate">{docName}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-400 border-blue-400 hover:bg-blue-400/10 flex-shrink-0"
                                onClick={() => window.open(docUrl, '_blank')}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">{selectedListing.views_count || 0}</div>
                        <p className="text-sm text-gray-400">Views</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-500">{selectedListing.favorites_count || 0}</div>
                        <p className="text-sm text-gray-400">Favorites</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-500">{selectedListing.review_count || 0}</div>
                        <p className="text-sm text-gray-400">Reviews</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {typeof selectedListing.rating === 'number' && !isNaN(selectedListing.rating) ? selectedListing.rating.toFixed(1) : parseFloat(selectedListing.rating || '0').toFixed(1)}
                        </div>
                        <p className="text-sm text-gray-400">Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-600/20 bg-card">
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setViewListingModalOpen(false)}
                  className="border-gray-600/30 text-gray-300 hover:bg-gray-700/50 px-4 py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation */}
        <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
          <AlertDialogContent className="bg-card border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Approve Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to approve "{actionProduct?.headline}"? This will make it visible to buyers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionProduct) {
                    handleApprove(actionProduct.id);
                    setIsApproveConfirmOpen(false);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Confirmation */}
        <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
          <AlertDialogContent className="bg-card border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Reject Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to reject "{actionProduct?.headline}"? Please provide a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 py-4">
              <Label htmlFor="rejection-reason" className="text-sm font-medium text-gray-400">
                Rejection Reason
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="mt-2 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionProduct && rejectionReason) {
                    handleReject(actionProduct.id, rejectionReason);
                    setIsRejectConfirmOpen(false);
                    setRejectionReason("");
                  }
                }}
                disabled={!rejectionReason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Product</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to delete "{actionProduct?.headline}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (actionProduct) {
                    handleDelete(actionProduct.id);
                    setDeleteConfirmOpen(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Category Management Modal */}
        <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
          <DialogContent className="max-w-2xl bg-card text-white border border-gray-600/30">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingCategory ? 'Update category details' : 'Add a new product category'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-300">Category Name *</Label>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Social Media Accounts"
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-300">Description</Label>
                <Textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Category description (optional)"
                  rows={3}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-300">Sort Order</Label>
                <Input
                  type="number"
                  value={categorySortOrder}
                  onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategoryModalOpen(false);
                    setEditingCategory(null);
                    setCategoryName('');
                    setCategoryDescription('');
                    setCategorySortOrder(0);
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                  className="bg-accent text-bg hover:bg-accent-2"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </div>
            <div className="mt-6 border-t border-gray-600/30 pt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Existing Categories</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No categories yet</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-600/20"
                    >
                      <div>
                        <p className="text-white font-medium">{cat.name}</p>
                        {cat.description && (
                          <p className="text-gray-400 text-sm">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditCategory(cat)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}