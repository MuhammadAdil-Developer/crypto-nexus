import { useState, useEffect } from "react";
import { Search, Filter, Grid, List as ListIcon, Table, ChevronDown, Star, Eye, Heart, ShoppingCart } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { ProductCard } from "@/components/buyer/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { CartProvider, useCart } from "@/contexts/CartContext";
import CartSidebar from "@/components/buyer/CartSidebar";
import BulkPurchaseModal from "@/components/buyer/BulkPurchaseModal";
import { useSearchParams } from "react-router-dom";

// API Service
import { API_BASE_URL } from '@/config/api';

interface Product {
  id: number;
  listing_title: string;
  description: string;
  vendor: {
    id: number;
    username: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  sub_category: {
    id: number;
    name: string;
  };
  price: string;
  account_type: string;
  verification_level: string;
  delivery_method: string;
  status: string;
  created_at: string;
  main_image?: string | null;
  main_images: string[];
  gallery_images: string[];
  tags: string[];
  special_features: string[];
  quantity_available: number;
  rating?: number;
  review_count?: number;
}

function BuyerListingsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  // Default to server-provided ordering (personalized) so different buyers see different orders
  const [sortBy, setSortBy] = useState("server");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{id: string, name: string, count: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBulkPurchaseOpen, setIsBulkPurchaseOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // Items per page
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 12,
    total_count: 0,
    total_pages: 1
  });

  const { toast } = useToast();
  const { getTotalItems } = useCart();

  // Initialize search query from URL params
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
  }, [searchParams]);

  // Fetch products from API
  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  // Filter and sort products
  useEffect(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => {
        const productCategorySlug = product.category?.name?.toLowerCase().replace(/\s+/g, '-') || '';
        return productCategorySlug === selectedCategory;
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.listing_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply client-side sorting only if user explicitly selected a sort option.
    // Default 'server' preserves the order returned by the API (personalized ordering).
    if (sortBy && sortBy !== 'server') {
      switch (sortBy) {
        case "newest":
          filtered = [...filtered].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
        case "oldest":
          filtered = [...filtered].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          break;
        case "price-low":
          filtered = [...filtered].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case "price-high":
          filtered = [...filtered].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case "rating":
          filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case "popular":
          filtered = [...filtered].sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
          break;
        default:
          break;
      }
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to access listings",
          variant: "destructive",
        });
        return;
      }
  
      const response = await fetch(`${API_BASE_URL}/products/buyer/listings/?page=${currentPage}&page_size=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Buyer Listings Response:', data);
        
        // Handle both data.data and data.results formats
        const productsArray = data.data || data.results || [];
        console.log('📦 Products array:', productsArray);
        setProducts(productsArray);
        setFilteredProducts(productsArray);

        // Handle pagination info
        if (data.pagination) {
          setPagination({
            page: data.pagination.page || 1,
            page_size: data.pagination.page_size || pageSize,
            total_count: data.pagination.total_count || 0,
            total_pages: data.pagination.total_pages || 1
          });
        }
        
        // Extract categories from products
        const categoryMap = new Map();
        productsArray.forEach((product: Product) => {
          const catName = product.category?.name || 'Uncategorized';
          categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
        });
        
        const categoryList = Array.from(categoryMap.entries()).map(([name, count]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          count: count as number
        }));
        
        setCategories([
          { id: "all", name: "All Categories", count: productsArray.length },
          ...categoryList
        ]);
        
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch listings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch listings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Filtering is handled by useEffect hook
  };

  const handleSortChange = (sortOption: string) => {
    setSortBy(sortOption);
    let sortedProducts = [...filteredProducts];

    if (sortOption === "newest") {
      sortedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === "price-low") {
      sortedProducts.sort((a, b) => parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, '')));
    } else if (sortOption === "price-high") {
      sortedProducts.sort((a, b) => parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, '')));
    } else if (sortOption === "rating") {
      sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    setFilteredProducts(sortedProducts);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilteredProducts(products.filter(product => 
      product.listing_title.toLowerCase().includes(query.toLowerCase()) ||
      product.vendor.username.toLowerCase().includes(query.toLowerCase())
    ));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(pagination.total_pages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < pagination.total_pages) {
      if (endPage < pagination.total_pages - 1) pages.push('...');
      pages.push(pagination.total_pages);
    }

    return pages;
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Cart Button */}
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={() => setIsCartOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg"
          >
            <ShoppingCart className="w-6 h-6 mr-2" />
            Cart ({getTotalItems()})
          </Button>
        </div>
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <h1 className="text-2xl font-bold mb-2">Browse Listings</h1>
          <p className="text-gray-300">Discover {filteredProducts.length} products from trusted vendors</p>
        </div>

        {/* Search, Sort, and View Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
          {/* Search Bar with Dark Background */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search products, vendors, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Categories Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full lg:w-auto flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                {categories.find(cat => cat.id === selectedCategory)?.name || "All Categories"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center justify-between"
                >
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full lg:w-auto flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                Sort by: {sortBy === "newest" ? "Newest" : 
                         sortBy === "oldest" ? "Oldest" :
                         sortBy === "price-low" ? "Price: Low to High" :
                         sortBy === "price-high" ? "Price: High to Low" :
                         sortBy === "rating" ? "Highest Rated" :
                         sortBy === "popular" ? "Most Popular" : "Personalized"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("server")}>Personalized (Recommended)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-low")}>Price: Low to High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-high")}>Price: High to Low</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")}>Highest Rated</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("popular")}>Most Popular</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-600 rounded-lg overflow-hidden bg-gray-800 w-full lg:w-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`rounded-r-none ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`rounded-none border-x border-gray-600 ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={`rounded-l-none ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Count + Loading indicator */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          {isLoading && (
            <span className="flex items-center gap-2 text-xs text-blue-400">
              <span className="inline-block h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading page...
            </span>
          )}
        </div>

        {/* Main Content - Products Grid/List/Table */}
        <div>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No products found</div>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === "table" ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">Product</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">Category</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">Price</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">Rating</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                {product.main_image ? (
                                  <img
                                    src={product.main_image}
                                    alt={product.listing_title}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <span className="text-gray-400 text-lg">📦</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-medium truncate">{product.listing_title}</p>
                                <p className="text-gray-400 text-xs truncate">{product.description?.substring(0, 50)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-purple-400 border-purple-400">
                              {product.category?.name || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{product.vendor?.username || "N/A"}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">{product.price}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-white">
                                {product.rating ? (typeof product.rating === 'number' ? product.rating.toFixed(1) : parseFloat(String(product.rating)).toFixed(1)) : "N/A"}
                              </span>
                              <span className="text-gray-400 text-xs">({product.review_count || 0})</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300"
                                onClick={() => window.open(`/buyer/product/${product.id}`, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-pink-400 hover:text-pink-300"
                                onClick={() => {
                                  // Add to cart logic
                                }}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === "grid" ? 
              "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : 
              "space-y-4"
            }>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode as "grid" | "list"} />
              ))}
            </div>
          )}
        
        {/* Pagination Controls */}
        {pagination.total_pages > 1 && (
          <div className="flex flex-col items-center gap-3 mt-8 mb-4">
            <div className="inline-flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-full px-3 py-1 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-full text-gray-300 hover:text-white"
              >
                ‹
              </Button>
              {getPageNumbers().map((page, idx) => (
                page === "..." ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-500">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    onClick={() => handlePageChange(page as number)}
                    className={`rounded-full w-8 h-8 text-sm ${
                      currentPage === page
                        ? "bg-purple-600 text-white"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    {page}
                  </Button>
                )
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.total_pages}
                className="rounded-full text-gray-300 hover:text-white"
              >
                ›
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Page {currentPage} of {pagination.total_pages}
            </div>
          </div>
        )}
        </div>
        
        {/* Cart Sidebar */}
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={() => {
            setIsCartOpen(false);
            setIsBulkPurchaseOpen(true);
          }}
        />
        
        {/* Bulk Purchase Modal */}
        <BulkPurchaseModal
          isOpen={isBulkPurchaseOpen}
          onClose={() => setIsBulkPurchaseOpen(false)}
          onConfirm={() => {
            // Handle bulk purchase logic here
            toast({
              title: "Purchase Initiated",
              description: "Your bulk purchase has been initiated"
            });
            setIsBulkPurchaseOpen(false);
          }}
        />
      </div>
    </BuyerLayout>
  );
}

export default function BuyerListings() {
  return (
    <CartProvider>
      <BuyerListingsContent />
    </CartProvider>
  );
}