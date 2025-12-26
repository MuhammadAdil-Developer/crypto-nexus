import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Filter, Grid, List as ListIcon, Table, ChevronDown, Star, Eye, Heart, ShoppingCart, TrendingUp, Coins } from "lucide-react";
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

// Banner Assets
import bannerPattern from "@/assets/banner/pattern.png";
import bannerLogo from "@/assets/banner/logo.png";
import bannerLeftArrow from "@/assets/banner/arrow_left.png";
import bannerRightArrow from "@/assets/banner/arrow_right.png";

// API Service
import { API_BASE_URL, getImageUrl } from '@/config/api';
import placeholderImage from "@/assets/placeholder.png";

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
  accepted_crypto?: string[];
}

function BuyerListingsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCrypto, setSelectedCrypto] = useState<"all" | "BTC" | "XMR">("all");
  // Default to server-provided ordering (personalized) so different buyers see different orders
  const [sortBy, setSortBy] = useState("server");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string, name: string, count: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBulkPurchaseOpen, setIsBulkPurchaseOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Increased page size for lazy loading
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 12,
    total_count: 0,
    total_pages: 1
  });
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for search
  const observerTarget = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { getTotalItems } = useCart();

  // Initialize search query and category from URL params
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    const urlCategory = searchParams.get('category');

    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }

    if (urlCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [searchParams]);

  // Handle redirect actions - open modals or add to cart (after products are loaded)
  useEffect(() => {
    if (isLoading) return; // Wait for products to load

    const openOrderId = searchParams.get('openOrder');
    const openViewId = searchParams.get('openView');
    const addToCartId = searchParams.get('addToCart');

    if (openOrderId && filteredProducts.length > 0) {
      const productToOpen = filteredProducts.find(p => p.id.toString() === openOrderId);
      if (productToOpen) {
        // Trigger order modal opening via custom event
        setTimeout(() => {
          const event = new CustomEvent('openProductOrder', {
            detail: { productId: openOrderId, product: productToOpen }
          });
          window.dispatchEvent(event);
        }, 800);

        // Clean URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('openOrder');
        setSearchParams(newSearchParams, { replace: true });
      }
    }

    if (openViewId && filteredProducts.length > 0) {
      const productToOpen = filteredProducts.find(p => p.id.toString() === openViewId);
      if (productToOpen) {
        // Trigger view modal opening via custom event
        setTimeout(() => {
          const event = new CustomEvent('openProductView', {
            detail: { productId: openViewId, product: productToOpen }
          });
          window.dispatchEvent(event);
        }, 800);

        // Clean URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('openView');
        setSearchParams(newSearchParams, { replace: true });
      }
    }

    if (addToCartId && filteredProducts.length > 0) {
      const productToAdd = filteredProducts.find(p => p.id.toString() === addToCartId);
      if (productToAdd) {
        // Trigger add to cart via custom event
        setTimeout(() => {
          const event = new CustomEvent('addProductToCart', {
            detail: { productId: addToCartId, product: productToAdd }
          });
          window.dispatchEvent(event);
        }, 800);

        // Clean URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('addToCart');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [isLoading, filteredProducts, searchParams, setSearchParams]);

  // Initial fetch or fetch on filter change
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [selectedCrypto, minPrice, maxPrice, selectedCategory, sortBy]);

  // Fetch all products when searching (for cross-page search)
  useEffect(() => {
    if (searchQuery || selectedCrypto !== "all" || minPrice || maxPrice) {
      fetchAllProducts();
    }
  }, [searchQuery, selectedCrypto, minPrice, maxPrice]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
          const nextPage = pagination.page + 1;
          fetchProducts(nextPage);
        }
      },
      { threshold: 1.0, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isFetchingMore, isLoading, pagination.page]);

  // Extract categories when products are updated
  useEffect(() => {
    if (products.length > 0) {
      const categoryMap = new Map();
      products.forEach((product: Product) => {
        const catName = product.category?.name || 'Uncategorized';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
      });

      const categoryList = Array.from(categoryMap.entries()).map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        count: count as number
      }));

      setCategories([
        { id: "all", name: "All Categories", count: products.length },
        ...categoryList
      ]);
    }
  }, [products]);

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch all products for search (use a large page size or fetch all)
      const cryptoParam = selectedCrypto !== "all" ? `&crypto=${selectedCrypto}` : '';
      const priceParam = `${minPrice ? `&min_price=${minPrice}` : ''}${maxPrice ? `&max_price=${maxPrice}` : ''}`;
      const response = await fetch(`${API_BASE_URL}/products/buyer/listings/?page=1&page_size=1000${cryptoParam}${priceParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const productsArray = data.data || data.results || [];
        setAllProducts(productsArray);
      }
    } catch (error) {
      console.error('Error fetching all products for search:', error);
    }
  };

  // Filter and sort products - use allProducts for search to search across all pages
  useEffect(() => {
    // Use allProducts if searching, otherwise use current page products
    const sourceProducts = searchQuery ? allProducts : products;
    let filtered = [...sourceProducts];

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => {
        const productCategorySlug = product.category?.name?.toLowerCase().replace(/\s+/g, '-') || '';
        return productCategorySlug === selectedCategory;
      });
    }

    // Apply crypto filter
    if (selectedCrypto !== "all") {
      filtered = filtered.filter(product => {
        // Standardize on accepted_crypto from backend
        const acceptedCryptos = product.accepted_crypto || [];
        // Support BOTH uppercase and check for exact matches
        return acceptedCryptos.some(crypto => crypto.toUpperCase() === selectedCrypto.toUpperCase());
      });
    }

    // Apply search filter - search across all products, not just current page
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.listing_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // DO NOT filter by quantity_available - show all products even if out of stock

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
  }, [products, allProducts, searchQuery, selectedCategory, selectedCrypto, sortBy]);

  const fetchProducts = async (page = currentPage, isInitial = false) => {
    if (isFetchingMore && !isInitial) return;

    try {
      if (isInitial) setIsLoading(true);
      else setIsFetchingMore(true);

      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const cryptoParam = selectedCrypto !== "all" ? `&crypto=${selectedCrypto}` : '';
      const priceParam = `${minPrice ? `&min_price=${minPrice}` : ''}${maxPrice ? `&max_price=${maxPrice}` : ''}`;
      const categoryParam = selectedCategory !== "all" ? `&category=${selectedCategory}` : '';

      const response = await fetch(`${API_BASE_URL}/products/buyer/listings/?page=${page}&page_size=${pageSize}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}${cryptoParam}${priceParam}${categoryParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const productsArray = data.data || data.results || [];

        if (isInitial) {
          setProducts(productsArray);
        } else {
          setProducts(prev => [...prev, ...productsArray]);
        }

        if (data.pagination) {
          setPagination({
            page: data.pagination.page || page,
            page_size: data.pagination.page_size || pageSize,
            total_count: data.pagination.total_count || 0,
            total_pages: data.pagination.total_pages || 1
          });
          setHasMore((data.pagination.page || page) < (data.pagination.total_pages || 1));
        } else {
          setHasMore(productsArray.length === pageSize);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
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
    setCurrentPage(1); // Reset to page 1 when searching
    // Filtering is handled by useEffect hook
  };


  return (
    <BuyerLayout>
      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsCartOpen(true)}
          className="bg-theme-red hover:bg-[#850231] text-white rounded-full h-14 w-14 shadow-2xl shadow-theme-red/40 border border-theme-red/50 group transition-all duration-300 hover:scale-110 relative"
        >
          <ShoppingCart className="w-6 h-6" />
          <Badge className="absolute -top-1 -right-1 bg-theme-cyan text-black border-2 border-black text-[10px] font-black h-5 w-5 flex items-center justify-center p-0 rounded-full">
            {getTotalItems()}
          </Badge>
          <span className="absolute right-full mr-3 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            View Cart
          </span>
        </Button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 pb-10">
        {/* Modern Header Banner */}
        {/* Full Width Banner at the Top */}
        <div className="relative w-full h-[120px] md:h-[180px] overflow-hidden rounded-2xl bg-black mb-10 border border-gray-800 shadow-2xl group">
          {/* Pattern Background */}
          <div
            className="absolute inset-0 w-full h-full opacity-60"
            style={{
              backgroundImage: `url(${bannerPattern})`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: 'auto 100%'
            }}
          />

          {/* Left Arrow (Pinned Left) */}
          <img
            src={bannerLeftArrow}
            alt=""
            className="absolute left-0 top-0 h-full z-10 select-none pointer-events-none object-cover sm:object-fill"
            style={{ maxWidth: '30%' }}
          />

          {/* Right Arrow (Pinned Right) */}
          <img
            src={bannerRightArrow}
            alt=""
            className="absolute right-0 top-0 h-full z-10 select-none pointer-events-none object-cover sm:object-fill"
            style={{ maxWidth: '30%' }}
          />

          {/* Center Logo (Always Centered) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 h-[70%] md:h-[80%] aspect-square flex items-center justify-center">
            <img
              src={bannerLogo}
              alt="Logo"
              className="h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] scale-110 group-hover:scale-125 transition-transform duration-700"
            />
          </div>

          {/* Brand Text (Left Half) */}
          <div className="absolute left-[8%] md:left-[12%] top-1/2 transform -translate-y-1/2 z-20 hidden sm:block" style={{ maxWidth: '40%' }}>
            <h1
              className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
              }}
            >
              <span className="text-white">SETTINGS</span>
              {/* <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-red to-theme-cyan ml-1">Club</span> */}
            </h1>
            {/* <p className="text-gray-400 text-[10px] md:text-xs tracking-[0.3em] mt-1 ml-1 uppercase font-bold" style={{ fontFamily: "'Space Age', 'Orbitron', sans-serif" }}>
              Digital Marketplace
            </p> */}
          </div>
        </div>
        {/* Search, Sort, and View Toggle - Sticky */}
        <div className="lg:sticky top-0 z-30 bg-[#0E1A26]/90 backdrop-blur-md py-4 rounded-2xl border border-white/5 shadow-2xl mb-8 px-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            {/* Search Bar with Dark Background */}
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-hover:text-theme-cyan transition-colors w-5 h-5" />
                <Input
                  placeholder="Search products, vendors, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-theme-cyan focus:ring-theme-cyan/20 transition-all rounded-xl shadow-inner"
                />
              </div>
            </div>

            {/* Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto h-11 flex items-center justify-between gap-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all rounded-xl px-4 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-theme-cyan" />
                    <span className="text-xs uppercase tracking-widest font-bold font-mono">
                      {categories.find(cat => cat.id === selectedCategory)?.name || "All Segments"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E1A26] border-white/10 text-gray-300 min-w-[200px] rounded-xl shadow-2xl p-2">
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer group"
                  >
                    <span className="text-xs uppercase tracking-widest font-bold">{category.name}</span>
                    <Badge variant="secondary" className="bg-white/5 text-gray-500 group-hover:bg-theme-cyan/20 group-hover:text-theme-cyan border-none text-[10px]">
                      {category.count}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto h-11 flex items-center justify-between gap-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all rounded-xl px-4 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-theme-cyan" />
                    <span className="text-xs uppercase tracking-widest font-bold font-mono">
                      {sortBy === "newest" ? "Newest" :
                        sortBy === "oldest" ? "Oldest" :
                          sortBy === "price-low" ? "Price: Low" :
                            sortBy === "price-high" ? "Price: High" :
                              sortBy === "rating" ? "Rating" :
                                sortBy === "popular" ? "Popular" : "Recommended"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E1A26] border-white/10 text-gray-300 min-w-[200px] rounded-xl shadow-2xl p-2">
                <DropdownMenuItem onClick={() => setSortBy("server")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Recommended</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("newest")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Newest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Oldest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-low")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-high")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("rating")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Highest Rated</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("popular")} className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold">Most Popular</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Crypto Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto h-11 flex items-center justify-between gap-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all rounded-xl px-4 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-theme-cyan" />
                    <span className="text-xs uppercase tracking-widest font-bold font-mono">
                      {selectedCrypto === "all" ? "All Crypto" :
                        selectedCrypto === "BTC" ? "Bitcoin" : "Monero"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E1A26] border-white/10 text-gray-300 min-w-[200px] rounded-xl shadow-2xl p-2">
                <DropdownMenuItem
                  onClick={() => setSelectedCrypto("all")}
                  className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>All Cryptocurrencies</span>
                    {selectedCrypto === "all" && <span className="text-theme-cyan">✓</span>}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedCrypto("BTC")}
                  className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Bitcoin (BTC)</span>
                    {selectedCrypto === "BTC" && <span className="text-theme-cyan">✓</span>}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedCrypto("XMR")}
                  className="px-3 py-2.5 rounded-lg hover:bg-theme-cyan/10 hover:text-theme-cyan transition-colors cursor-pointer text-xs uppercase tracking-widest font-bold"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Monero (XMR)</span>
                    {selectedCrypto === "XMR" && <span className="text-theme-cyan">✓</span>}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Price Filter */}
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto h-11 flex items-center justify-between gap-3 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all rounded-xl px-4 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-theme-cyan" />
                    <span className="text-xs uppercase tracking-widest font-bold font-mono">
                      {minPrice || maxPrice ? `Price Range` : "All Prices"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0E1A26] border-white/10 text-gray-300 min-w-[240px] rounded-xl shadow-2xl p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Min Price (USD)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-9 bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Max Price (USD)</label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-9 bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                  className="w-full text-[10px] uppercase tracking-widest font-bold text-theme-red hover:bg-theme-red/10"
                >
                  Clear Filter
                </Button>
              </DropdownMenuContent>
            </DropdownMenu> */}

            {/* View Mode Toggle */}
            <div className="flex border border-white/10 rounded-xl overflow-hidden bg-white/5 h-11 w-full lg:w-auto p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`flex-1 lg:w-10 rounded-lg ${viewMode === "grid" ? "bg-theme-red text-white shadow-lg shadow-theme-red/20" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`flex-1 lg:w-10 rounded-lg ${viewMode === "list" ? "bg-theme-red text-white shadow-lg shadow-theme-red/20" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={`flex-1 lg:w-10 rounded-lg ${viewMode === "table" ? "bg-theme-red text-white shadow-lg shadow-theme-red/20" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                title="Table View"
              >
                <Table className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count + Items per page + Loading indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-gray-400">
          <span>
            Showing {searchQuery ? filteredProducts.length : filteredProducts.length} of {searchQuery ? allProducts.length : pagination.total_count} products
          </span>
          <div className="flex items-center gap-3">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Items per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-theme-cyan"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={36}>36</option>
                <option value={48}>48</option>
              </select>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-theme-cyan">
                <div className="w-4 h-4 border-2 border-theme-cyan border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Products Grid/List/Table */}
        <div>
          {isLoading && filteredProducts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, index) => (
                <Card key={index} className="border border-gray-700 bg-gray-900 overflow-hidden group">
                  <div className="relative aspect-video bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/20 to-transparent animate-shimmer"></div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-pulse w-3/4 bg-[length:200%_100%]"></div>
                      <div className="h-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-pulse w-1/2 bg-[length:200%_100%]"></div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-pulse w-full bg-[length:200%_100%]"></div>
                      <div className="h-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-pulse w-5/6 bg-[length:200%_100%]"></div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <div className="h-5 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-pulse w-20 bg-[length:200%_100%]"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded animate-pulse w-16 bg-[length:200%_100%]"></div>
                    </div>
                  </CardContent>
                  <style>{`
                    @keyframes shimmer {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(100%); }
                    }
                    .animate-shimmer {
                      animation: shimmer 2s infinite;
                    }
                  `}</style>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
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
                              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <img
                                  src={getImageUrl(product.main_image) || placeholderImage}
                                  alt={product.listing_title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = placeholderImage;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-medium truncate">{product.listing_title}</p>
                                <p className="text-gray-400 text-xs truncate">{product.description?.substring(0, 50)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-theme-cyan border-theme-cyan/50 bg-theme-cyan-dim">
                              {product.category?.name || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{product.vendor?.username || "N/A"}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <span className="text-white font-bold block">${parseFloat(product.price).toFixed(2)}</span>
                              <span className="text-gray-400 text-xs font-mono">≈ {parseFloat((parseFloat(product.price) / 100000).toFixed(8))} BTC</span>
                            </div>
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
                                className="text-theme-cyan hover:text-white hover:bg-theme-cyan-dim"
                                onClick={() => window.open(`/buyer/product/${product.id}`, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-theme-cyan hover:text-white hover:bg-theme-cyan-dim"
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


          {/* Infinite Scroll Sentinel */}
          <div ref={observerTarget} className="h-32 flex items-center justify-center mt-8 mb-12">
            {isFetchingMore && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-theme-cyan/20 border-t-theme-cyan rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.2)]"></div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Scanning deeper into the club...</p>
              </div>
            )}
            {!hasMore && products.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-2" />
                <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] bg-white/5 px-6 py-2.5 rounded-full border border-white/10 shadow-inner">
                  You've reached the end of the club.
                </p>
              </div>
            )}
          </div>
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