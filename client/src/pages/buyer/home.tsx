import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
import { TermsConditionsModal } from "@/components/TermsConditionsModal";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { ProductCard } from "@/components/buyer/ProductCard";
import { CartProvider } from "@/contexts/CartContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  TrendingUp,
  Clock,
  Star,
  ShoppingCart,
  Heart,
  MessageSquare,
  Package,
  Filter,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  Play,
  Image,
  Code,
  Gamepad2,
  ChevronLeft,
  Timer,
  Award,
  Verified,
  Crown,
  Eye,
  Copy,
  AlertTriangle,
  Bitcoin,
  Wallet,
  Loader2,
  Users,
  Briefcase,
  Music
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import wishlistService from "@/services/wishlistService";
import { Label } from "@/components/ui/label";
import { orderService } from "@/services/orderService";
import { productService, Product } from "@/services/productService";
import { messagingService } from "@/services/messagingService";
import { useMessaging } from "@/contexts/MessagingContext";

// Add these interfaces at the top of the file (after imports)

interface Order {
  id: string | number;
  order_id?: string | number;
  product?: Product;
  title?: string;
  vendor?: { username?: string } | string;
  created_at?: string;
  orderDate?: string;
  product_credentials?: { credentials?: string };
  order_status?: string;
  price?: string | number;
  status?: string;
  deliveryDate?: string;
  canRate?: boolean;
  [key: string]: any;
}

// Static category icons mapping - will be used as fallback
const categoryIconMap: { [key: string]: any } = {
  'streaming': Play,
  'software': Code,
  'gaming': Gamepad2,
  'design': Image,
  'social': Users,
  'business': Briefcase,
  'music': Music,
  'default': Package,
};

// Default categories for fallback
const defaultCategories = [
  { id: 1, name: "Streaming Services", icon: Play, count: "21", color: "from-red-500 to-pink-900", services: "NETFLIX, SPOTIFY, DISNEY+, HULU + MORE" },
  { id: 2, name: "Software", icon: Code, count: "892", color: "from-red-500 to-pink-800", services: "ADOBE, MICROSOFT, AUTODESK + MORE" },
  { id: 3, name: "Gaming", icon: Gamepad2, count: "567", color: "from-red-500 to-pink-900", services: "STEAM, EPIC GAMES, XBOX + MORE" },
  { id: 4, name: "Design", icon: Image, count: "423", color: "from-red-500 to-pink-800", services: "FIGMA, SKETCH, CANVA + MORE" },
];

const topVendors = [
  {
    id: 1,
    name: "CryptoAccountsPlus",
    rating: 4.9,
    totalSales: 2547,
    verified: true,
    specialization: "Streaming Services",
    avatar: "CA",
    responseTime: "< 1 hour"
  },
  {
    id: 2,
    name: "DigitalVault",
    rating: 4.8,
    totalSales: 1923,
    verified: true,
    specialization: "Software & Tools",
    avatar: "DV",
    responseTime: "< 30 min"
  },
  {
    id: 3,
    name: "GamingHub",
    rating: 4.7,
    totalSales: 1654,
    verified: true,
    specialization: "Gaming Accounts",
    avatar: "GH",
    responseTime: "< 2 hours"
  },
  {
    id: 4,
    name: "PremiumSoft",
    rating: 4.9,
    totalSales: 1432,
    verified: true,
    specialization: "Professional Software",
    avatar: "PS",
    responseTime: "< 1 hour"
  }
];

// API base for public endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

function BuyerHomeContent() {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [topVendorsData, setTopVendorsData] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [currentCategorySlide, setCurrentCategorySlide] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isLoadingOrdersData, setIsLoadingOrdersData] = useState(true);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  // Messaging state is now handled by MessagingProvider
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const [ordersFetched, setOrdersFetched] = useState(false);
  const [wishlistFetched, setWishlistFetched] = useState(false);
  const [trendingProductsFetched, setTrendingProductsFetched] = useState(false);
  const [recentActivityFetched, setRecentActivityFetched] = useState(false);
  const { toast } = useToast();

  // Get messaging data from context
  const { unreadCount, isLoading: isLoadingMessages } = useMessaging();

  // Cache keys for localStorage
  const CACHE_KEYS = {
    TRENDING_PRODUCTS: 'buyer_home_trending_products',
    RECENT_ORDERS: 'buyer_home_recent_orders',
    RECENT_ACTIVITY: 'buyer_home_recent_activity',
    WISHLIST_COUNT: 'buyer_home_wishlist_count',
    ORDERS_DATA: 'buyer_home_orders_data',
  };
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes


  // Track window width for responsive carousel
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-slide effect with 5 second interval
  useEffect(() => {

    // Dev/testing: force-show legal modals when URL contains ?forceShowLegal=1 (dev only)
    try {
      const params = new URLSearchParams(window.location.search);
      if (import.meta.env.DEV && params.get('forceShowLegal') === '1') {
        localStorage.removeItem('legal_confirmed_privacy');
        localStorage.removeItem('legal_confirmed_terms');
      }
    } catch (e) { /* ignore in SSR */ }

    // Check if legal documents have been confirmed
    const privacyConfirmed = localStorage.getItem('legal_confirmed_privacy');
    const termsConfirmed = localStorage.getItem('legal_confirmed_terms');
    if (!privacyConfirmed) {
      setShowPrivacyModal(true);
    } else if (!termsConfirmed) {
      setShowTermsModal(true);
    }
    if (!trendingProducts.length || !isAutoPlaying) return;

    const cardsPerView = windowWidth < 640 ? 1 : 4;
    scrollIntervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const maxSlide = Math.ceil(trendingProducts.length / cardsPerView) - 1;
        return prev >= maxSlide ? 0 : prev + 1;
      });
    }, 5000); // Auto scroll every 5 seconds

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [trendingProducts.length, isAutoPlaying, windowWidth]);

  const handlePrevSlide = () => {
    setIsAutoPlaying(false);
    const cardsPerView = windowWidth < 640 ? 1 : 4;
    setCurrentSlide((prev) => {
      const maxSlide = Math.ceil(trendingProducts.length / cardsPerView) - 1;
      return prev <= 0 ? maxSlide : prev - 1;
    });
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleNextSlide = () => {
    setIsAutoPlaying(false);
    const cardsPerView = windowWidth < 640 ? 1 : 4;
    setCurrentSlide((prev) => {
      const maxSlide = Math.ceil(trendingProducts.length / cardsPerView) - 1;
      return prev >= maxSlide ? 0 : prev + 1;
    });
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  // Helper function to get cached data
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  // Helper function to set cached data
  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error caching data:', e);
    }
  };

  // Fetch wishlist count with caching
  useEffect(() => {
    if (wishlistFetched) return;

    // Try cache first
    const cached = getCachedData(CACHE_KEYS.WISHLIST_COUNT);
    if (cached !== null) {
      setWishlistCount(cached);
      setWishlistFetched(true);
      return;
    }

    const fetchWishlistCount = async () => {
      try {
        const response = await wishlistService.getWishlistStats();
        if (response.success && response.data) {
          const count = response.data.total_items || 0;
          setWishlistCount(count);
          setCachedData(CACHE_KEYS.WISHLIST_COUNT, count);
        } else {
          // Fallback: try to get count from wishlist items
          try {
            const wishlistResponse = await wishlistService.getWishlist();
            if (wishlistResponse.success && wishlistResponse.data) {
              const count = wishlistResponse.data.length || 0;
              setWishlistCount(count);
              setCachedData(CACHE_KEYS.WISHLIST_COUNT, count);
            }
          } catch (fallbackError) {
            console.error('Error fetching wishlist fallback:', fallbackError);
          }
        }
      } catch (error: any) {
        console.error('Error fetching wishlist count:', error);
        // If API returns 500, try fallback
        if (error.response?.status === 500) {
          try {
            const wishlistResponse = await wishlistService.getWishlist();
            if (wishlistResponse.success && wishlistResponse.data) {
              const count = wishlistResponse.data.length || 0;
              setWishlistCount(count);
              setCachedData(CACHE_KEYS.WISHLIST_COUNT, count);
            }
          } catch (fallbackError) {
            console.error('Error fetching wishlist fallback:', fallbackError);
          }
        }
      } finally {
        setWishlistFetched(true);
      }
    };

    fetchWishlistCount();
  }, [wishlistFetched]);

  // Fetch trending products with caching
  useEffect(() => {
    if (trendingProductsFetched) return;

    // Try cache first
    const cached = getCachedData(CACHE_KEYS.TRENDING_PRODUCTS);
    if (cached !== null && cached.length > 0) {
      setTrendingProducts(cached);
      setTrendingProductsFetched(true);
      setLoading(false); // Ensure loader is off when using cache
      return;
    }

    const fetchTrendingProducts = async () => {
      try {
        setLoading(true);
        const response = await productService.getProducts({
          sort_by: "views_count",
          page_size: 50 // Fetch more products to show variety
        });

        if (response.success && response.data) {
          setTrendingProducts(response.data);
          setCachedData(CACHE_KEYS.TRENDING_PRODUCTS, response.data);
        } else {
          console.error("API returned success: false");
          setTrendingProducts([]);
        }
      } catch (error) {
        console.error("Error fetching trending products:", error);
        setTrendingProducts([]);
      } finally {
        setLoading(false);
        setTrendingProductsFetched(true);
      }
    };
    fetchTrendingProducts();
  }, [trendingProductsFetched]);

  // Fetch approved vendors for Top Vendors section with actual statistics
  useEffect(() => {
    const loadTopVendors = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/vendors/approved/?limit=4`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success && Array.isArray(data.data)) {
            // Fetch statistics for each vendor
            const vendorsWithStats = await Promise.all(
              data.data.map(async (v: any, idx: number) => {
                const initials = (v.business_name || v.vendor_username || 'VN').slice(0, 2).toUpperCase();
                const vendorUsername = v.vendor_username || v.username;

                // Fetch vendor statistics
                let rating = 0;
                let totalSales = 0;
                let responseTime = '< 2 hours';

                if (vendorUsername) {
                  try {
                    const statsRes = await fetch(`${API_BASE_URL}/vendors/statistics/${vendorUsername}/`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });

                    if (statsRes.ok) {
                      const statsData = await statsRes.json();
                      if (statsData?.success && statsData.data) {
                        // Extract rating (format: "4.5/5" or "No rating")
                        const ratingStr = statsData.data.vendor_rating || '0';
                        rating = parseFloat(ratingStr.replace('/5', '')) || 0;
                        totalSales = statsData.data.total_sales || 0;

                        // Calculate response time based on last sale or average
                        if (statsData.data.last_sale_date) {
                          const lastSale = new Date(statsData.data.last_sale_date);
                          const hoursSince = (Date.now() - lastSale.getTime()) / (1000 * 60 * 60);
                          if (hoursSince < 1) {
                            responseTime = '< 1 hour';
                          } else if (hoursSince < 2) {
                            responseTime = '< 2 hours';
                          } else if (hoursSince < 24) {
                            responseTime = `< ${Math.floor(hoursSince)} hours`;
                          } else {
                            responseTime = `< ${Math.floor(hoursSince / 24)} days`;
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Error fetching vendor stats:', err);
                  }
                }

                return {
                  id: idx + 1,
                  name: v.business_name || v.vendor_username,
                  rating: rating || 4.8,
                  totalSales: totalSales,
                  verified: v.is_verified || true,
                  specialization: v.category || 'Marketplace Vendor',
                  avatar: initials,
                  responseTime: responseTime,
                  vendor_username: vendorUsername,
                };
              })
            );

            setTopVendorsData(vendorsWithStats);
          }
        }
      } catch (_) {
        // Keep static fallback on error
      }
    };
    loadTopVendors();
  }, []);

  // Fetch categories from API for Featured Categories section
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setCategoriesData(defaultCategories);
          return;
        }

        const response = await productService.getCategories();
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Map API categories to display format
          const mappedCategories = response.data.map((cat: any, idx: number) => {
            const slug = (cat.slug?.toLowerCase() || cat.name?.toLowerCase() || '').trim();
            const slugParts = slug.split('-');
            const firstPart = slugParts[0] || slug.split(' ')[0] || '';
            const Icon = categoryIconMap[slug] || categoryIconMap[firstPart] || categoryIconMap['default'] || Package;

            // Count products in this category (if available)
            const count = cat.product_count || cat.count || '0';

            return {
              id: cat.id || idx + 1,
              name: cat.name || 'Category',
              icon: Icon,
              count: count.toString(),
              color: "from-red-500 to-pink-900", // Default gradient
              services: cat.description || `${(cat.name || 'Category').toUpperCase()} PRODUCTS`,
              slug: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-'),
            };
          });

          setCategoriesData(mappedCategories);
        } else {
          setCategoriesData(defaultCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategoriesData(defaultCategories);
      }
    };

    fetchCategories();
  }, []);

  // Auto-slide categories every 10 seconds
  useEffect(() => {
    const categoriesToShow = categoriesData.length > 0 ? categoriesData : defaultCategories;
    if (categoriesToShow.length <= 4) {
      setCurrentCategorySlide(0);
      return; // No need to slide if 4 or fewer categories
    }

    const maxSlides = Math.ceil(categoriesToShow.length / 4);

    const interval = setInterval(() => {
      setCurrentCategorySlide((prev) => {
        return (prev + 1) >= maxSlides ? 0 : prev + 1;
      });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [categoriesData.length]);

  // Fetch search suggestions from actual product listings
  useEffect(() => {
    if (!homeSearchQuery.trim()) {
      // Fetch popular products when search is empty
      const fetchPopularSuggestions = async () => {
        try {
          setIsLoadingSuggestions(true);
          const response = await productService.getProducts({
            sort_by: 'views',
            page_size: 10
          });
          if (response.success && Array.isArray(response.data)) {
            const suggestions = response.data.map((product: any) => ({
              term: product.headline || product.listing_title || product.website,
              count: (product.views_count || 0) + (product.favorites_count || 0),
              type: 'product',
              productId: product.id
            }));
            setSearchSuggestions(suggestions);
          }
        } catch (error) {
          console.error('Error fetching popular suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      fetchPopularSuggestions();
      return;
    }

    // Debounce search suggestions based on typed query
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const response = await productService.getProducts({
          search: homeSearchQuery.trim(),
          page_size: 10
        });
        if (response.success && Array.isArray(response.data)) {
          const suggestions = response.data.map((product: any) => ({
            term: product.headline || product.listing_title || product.website,
            count: (product.views_count || 0) + (product.favorites_count || 0),
            type: 'product',
            productId: product.id
          }));
          // Also add the typed query as a suggestion if no exact matches
          if (suggestions.length === 0) {
            suggestions.push({
              term: homeSearchQuery.trim(),
              count: 0,
              type: 'search',
              productId: null
            });
          }
          setSearchSuggestions(suggestions);
        }
      } catch (error) {
        console.error('Error fetching search suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [homeSearchQuery]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle home search
  const handleHomeSearch = (query?: string) => {
    const searchTerm = query || homeSearchQuery.trim();
    if (searchTerm) {
      navigate(`/buyer/listings?search=${encodeURIComponent(searchTerm)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    const searchTerm = suggestion.term || suggestion;
    setHomeSearchQuery(searchTerm);
    handleHomeSearch(searchTerm);
  };

  // Simplified and immediate order fetch function with caching
  const fetchOrdersData = async (force = false) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoadingOrder(false);
        setIsLoadingOrdersData(false);
        return;
      }

      // Try cache first if not forcing
      if (!force) {
        const cached = getCachedData(CACHE_KEYS.ORDERS_DATA);
        if (cached !== null) {
          processOrdersData(cached);
          setIsLoadingOrder(false);
          setIsLoadingOrdersData(false);
          return;
        }
      }

      setIsLoadingOrder(true);
      setIsLoadingOrdersData(true);
      setOrdersError(null);

      // Direct API call with better error handling
      const ordersData = await orderService.getOrders();

      const orders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);

      // Cache the orders data
      setCachedData(CACHE_KEYS.ORDERS_DATA, orders);

      // Process orders data
      processOrdersData(orders);

      // Reset retry count on successful fetch
      setRetryCount(0);

    } catch (error) {
      console.error('Failed to fetch orders data:', error);
      setOrdersError('Failed to load order data');

      // Only retry once if retry count is less than 2
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchOrdersData();
        }, 5000); // Wait 5 seconds before retry
      } else {
        setRetryCount(0); // Reset for next time
      }

    } finally {
      setIsLoadingOrder(false);
      setIsLoadingOrdersData(false);
    }
  };

  // Process orders data (extracted for reuse)
  const processOrdersData = (orders: any[]) => {
    // Process pending orders for active order banner - show for newly created orders
    const pendingOrders = orders.filter((order) =>
      (order.payment_status === 'pending' || order.payment_status === 'pending_payment') &&
      (order.order_status === 'pending_payment' || order.order_status === 'pending')
    );

    if (pendingOrders.length > 0) {
      // Sort by created_at (most recent first) to show newest pending order
      const sortedPending = pendingOrders.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastOrder = sortedPending[0];

      setActiveOrder(lastOrder);
      setPendingOrdersCount(pendingOrders.length);

      const orderCreatedAt = new Date(lastOrder.created_at).getTime();
      const expiresAt = orderCreatedAt + (30 * 60 * 1000); // 30 minutes
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

      setTimeRemaining(remainingSeconds);
    } else {
      setActiveOrder(null);
      setPendingOrdersCount(0);
      setTimeRemaining(0);
    }

    // Process recent orders
    const recent = orders
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    setRecentOrders(recent);

    // Process order counts
    setTotalOrders(orders.length);

    const activeOrdersList = orders.filter((order: any) =>
      ["pending", "processing", "shipped"].includes(order.order_status)
    );
    setActiveOrders(activeOrdersList.length);
  };

  // Immediate order fetch function - with caching
  const fetchOrderImmediately = async () => {
    await fetchOrdersData(false); // Use cache if available
  };

  // Fetch active order - only once on mount
  useEffect(() => {
    if (ordersFetched) return;

    fetchOrderImmediately().then(() => {
      setOrdersFetched(true);
    });
  }, [ordersFetched]);

  // Interval to check for new orders (only when there are active orders) - REDUCED FREQUENCY
  useEffect(() => {
    // Only poll if there are active orders or pending payments
    if (activeOrders > 0 || pendingOrdersCount > 0) {
      const interval = setInterval(() => {
        fetchOrdersData();
      }, 300000); // Every 5 minutes instead of 2 minutes - reduce auto-reload

      return () => clearInterval(interval);
    }
  }, [activeOrders, pendingOrdersCount]);

  // REMOVED visibility change handler - it was causing unnecessary reloads
  // Real-time notifications will handle updates instead


  // Fetch recent activity from API (real notifications only, no static fallback)
  const fetchRecentActivity = async (force = false) => {
    if (recentActivityFetched && !force) return;

    try {
      const response = await messagingService.getRecentActivity();
      // Handle both direct array and response.data format
      const activity = Array.isArray(response) ? response : (response?.data || response || []);

      if (activity && Array.isArray(activity) && activity.length > 0) {
        const formattedActivity = activity.map((act: any) => ({
          id: act.id,
          type: act.type || 'message',
          title: act.title || 'New message from vendor',
          description: act.description || act.message || '',
          time: act.time || 'Just now',
          status: act.status || 'info'
        }));
        setRecentActivity(formattedActivity);
        setCachedData(CACHE_KEYS.RECENT_ACTIVITY, formattedActivity);
      } else {
        // No activities - show empty state
        setRecentActivity([]);
        setCachedData(CACHE_KEYS.RECENT_ACTIVITY, []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Show empty state on error, not static data
      setRecentActivity([]);
    } finally {
      setRecentActivityFetched(true);
    }
  };

  useEffect(() => {
    fetchRecentActivity();

    // Refresh activity every 15 seconds to get new notifications
    const interval = setInterval(() => {
      fetchRecentActivity(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Listen for order creation events to refresh
  useEffect(() => {
    const handleOrderCreated = () => {
      // Refresh orders and recent activity when order is created
      fetchOrdersData(true);
      fetchRecentActivity(true);
    };

    window.addEventListener('order_created', handleOrderCreated);
    return () => window.removeEventListener('order_created', handleOrderCreated);
  }, []);

  // Review prompt (realtime) -> toast/CTA
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail || {};
      toast({
        title: 'Share your review',
        description: `Please review your purchase: ${detail.product_title || 'Product'}`,
      });
    };
    window.addEventListener('review_prompt', handler as any);
    return () => window.removeEventListener('review_prompt', handler as any);
  }, []);

  // Persist timer state
  useEffect(() => {
    if (activeOrder && timeRemaining > 0) {
      localStorage.setItem('activeOrderTimer', JSON.stringify({
        orderId: activeOrder.order_id,
        timeRemaining: timeRemaining,
        orderCreatedAt: activeOrder.created_at,
        orderData: {
          order_id: activeOrder.order_id,
          product: activeOrder.product,
          total_amount: activeOrder.total_amount,
          crypto_currency: activeOrder.crypto_currency,
          payment_address: activeOrder.payment_address,
          created_at: activeOrder.created_at
        }
      }));
    } else {
      localStorage.removeItem('activeOrderTimer');
    }
  }, [activeOrder, timeRemaining]);

  // Timer countdown
  useEffect(() => {
    if (activeOrder && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            cancelExpiredOrder();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeOrder, timeRemaining]);

  // Update activity timestamps
  useEffect(() => {
    const timestampTimer = setInterval(() => {
      updateActivityTimestamps();
    }, 60000);

    return () => clearInterval(timestampTimer);
  }, []);

  // Orders data is now fetched in the main fetchOrdersData function

  const cancelExpiredOrder = async () => {
    if (!activeOrder) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const productName = activeOrder.product?.headline || activeOrder.product?.listing_title || "Product";

      // Call backend API to expire the order (this will also send notifications)
      const response = await fetch(`http://localhost:8000/api/v1/orders/expire/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_id: activeOrder.order_id })
      });

      if (response.ok) {
        // Order expired successfully
        setActiveOrder(null);
        setTimeRemaining(0);
        setPendingOrdersCount(0);
        localStorage.removeItem('activeOrderTimer');

        // Refresh orders and recent activity to show notifications
        fetchOrdersData(true);
        fetchRecentActivity(true);

        toast({
          title: "Order Expired",
          description: `Order ${activeOrder.order_id} has expired due to payment timeout`,
          variant: "destructive",
        });
      } else {
        // Fallback: try to update status to cancelled
        const orderIdStr = activeOrder.order_id?.toString() || '';
        if (orderIdStr) {
          try {
            const response = await orderService.updateOrderStatus(orderIdStr, 'cancelled');
            if (response) {
              setActiveOrder(null);
              setTimeRemaining(0);
              setPendingOrdersCount(0);
              localStorage.removeItem('activeOrderTimer');
            }
          } catch (err) {
            console.error('Failed to cancel order:', err);
          }
        }
      }
    } catch (error) {
      console.error('Failed to expire order:', error);
      toast({
        title: "Error",
        description: "Failed to expire order",
        variant: "destructive",
      });
    }
  };

  // These functions are now consolidated into fetchOrdersData()
  const addOrderCancellationNotification = (orderId: string, productName: string) => {
    const newActivity = {
      id: Date.now(),
      type: "order_cancelled",
      title: "Order Cancelled",
      description: `Your order ${orderId} for "${productName}" was cancelled due to payment timeout`,
      time: "Just now",
      status: "warning"
    };

    setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);

    toast({
      title: "Order Cancelled",
      description: `Order ${orderId} was cancelled due to payment timeout`,
      variant: "destructive",
    });
  };

  const updateActivityTimestamps = () => {
    setRecentActivity(prev => prev.map(activity => {
      if (activity.time === "Just now") {
        return { ...activity, time: "1 min ago" };
      } else if (activity.time === "1 min ago") {
        return { ...activity, time: "2 min ago" };
      } else if (activity.time === "2 min ago") {
        return { ...activity, time: "5 min ago" };
      } else if (activity.time === "5 min ago") {
        return { ...activity, time: "10 min ago" };
      } else if (activity.time === "10 min ago") {
        return { ...activity, time: "15 min ago" };
      } else if (activity.time === "15 min ago") {
        return { ...activity, time: "30 min ago" };
      } else if (activity.time === "30 min ago") {
        return { ...activity, time: "1 hour ago" };
      }
      return activity;
    }));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    // Basic fallback for unsecure contexts (HTTP)
    if (!navigator.clipboard && document.execCommand) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast({
            title: "Copied!",
            description: "Payment address copied.",
          });
        }
      } catch (err) {
        // fail silently
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Payment address copied to clipboard.",
    });
  };

  return (
    <>
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => {
          // After privacy is confirmed, show terms
          if (!localStorage.getItem('legal_confirmed_terms')) {
            setShowTermsModal(true);
          }
          setShowPrivacyModal(false);
        }}
      />
      <TermsConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
      {/* Order Payment Banner */}
      {activeOrder && !isLoadingOrder && timeRemaining > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-b border-blue-700/50 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-6 flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-shrink-0 ml-16">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium whitespace-nowrap">Payment Required:</span>
            </div>
            <div className="flex items-center space-x-4 text-sm min-w-0 overflow-hidden">
              <span className="whitespace-nowrap">ID: <span className="font-mono">{activeOrder.order_id}</span></span>
              <span className="whitespace-nowrap">Product: <span className="font-semibold truncate max-w-20">{activeOrder.product?.headline || 'N/A'}</span></span>
              <span className="whitespace-nowrap">Amount: <span className="font-mono font-semibold">{activeOrder.total_amount} {activeOrder.crypto_currency}</span></span>
              <span className="whitespace-nowrap">Address: <span className="font-mono">{activeOrder.payment_address ? activeOrder.payment_address.slice(0, 12) + '...' : 'Loading...'}</span></span>
              <span className="flex items-center space-x-1 whitespace-nowrap">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                <span>left</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeOrder.payment_address && copyToClipboard(activeOrder.payment_address)}
              className="text-white hover:bg-blue-700"
              disabled={!activeOrder.payment_address}
            >
              <Copy className="w-4 h-4" />
            </Button>
            {pendingOrdersCount > 1 && (
              <Link to="/buyer/orders">
                <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-800">
                  View All ({pendingOrdersCount})
                </Button>
              </Link>
            )}
            <Link to="/buyer/payment-test">
              <Button size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
                Pay Now
              </Button>
            </Link>
          </div>
        </div>
      )}

      <BuyerLayout hasBanner={!!(activeOrder && !isLoadingOrder && timeRemaining > 0)}>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
          {/* AC Logo and Branding Section - Same as Vendor */}
          <div className="flex flex-col items-center justify-center py-4 sm:py-6">
            {/* AC Logo Monogram */}
            <div className="mb-3 sm:mb-4">
              <img
                src="/images/ac-logo-monogram.png"
                alt="AC Logo Monogram"
                className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain"
                style={{ filter: 'brightness(0.6) contrast(1.1) saturate(0.9)', imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>

            {/* THE ONE AND ONLY Text */}
            <div className="mb-0">
              <img
                src="/images/the-one-and-only.png"
                alt="THE ONE AND ONLY"
                className="h-5 sm:h-6 lg:h-7 object-contain"
                style={{ filter: 'brightness(0.75) contrast(1.2) saturate(0.85)', imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          </div>

          {/* Search Bar Section - Exactly like Image */}
          <div className="max-w-4xl mx-auto relative mb-6 sm:mb-8">
            <div className="relative flex items-center" ref={searchRef}>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  placeholder="Search for accounts..."
                  value={homeSearchQuery}
                  onChange={(e) => {
                    setHomeSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleHomeSearch();
                    }
                  }}
                  className="w-full pl-12 pr-16 py-3 sm:py-4 text-base sm:text-lg  text-gray-900 placeholder-gray-500 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <Button
                size="lg"
                className="absolute right-2 w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0 flex items-center justify-center shadow-lg transition-all duration-200"
                style={{ backgroundColor: '#AD0539' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c10647'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AD0539'}
                onClick={() => handleHomeSearch()}
              >
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </Button>
            </div>
            {/* Auto-suggestions dropdown - positioned relative to max-w-4xl container */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999] max-h-80 overflow-y-auto">
                {isLoadingSuggestions ? (
                  <div className="px-4 py-3 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  <>
                    {homeSearchQuery.trim() && (
                      <div
                        onClick={() => handleHomeSearch()}
                        className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
                      >
                        <div className="flex items-center">
                          <Search className="w-4 h-4 text-gray-400 mr-3" />
                          <span className="text-white">Search for "{homeSearchQuery}"</span>
                        </div>
                      </div>
                    )}
                    {searchSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center flex-1">
                          <Search className="w-4 h-4 text-gray-400 mr-3" />
                          <span className="text-white">{suggestion.term}</span>
                        </div>
                        {suggestion.count > 0 && (
                          <span className="text-xs text-gray-400">{suggestion.count}+ views</span>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="px-4 py-3 text-gray-400 text-center">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dashboard Stats Cards - Exactly like Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="border border-gray-700 bg-gray-900 hover:shadow-lg transition-shadow duration-200 relative z-10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-white min-h-[32px]">
                      {isLoadingOrdersData ? <span className="inline-block animate-pulse">... </span> : totalOrders}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-700 bg-gray-900 hover:shadow-lg transition-shadow duration-200 relative z-10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Wishlist Items</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{wishlistCount}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-700 bg-gray-900 hover:shadow-lg transition-shadow duration-200 relative z-10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">New Messages</p>
                    <p className="text-xl sm:text-2xl font-bold text-white min-h-[32px]">
                      {isLoadingMessages ? <span className="inline-block animate-pulse">...</span> : unreadCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-700 bg-gray-900 hover:shadow-lg transition-shadow duration-200 relative z-10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Active Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-white min-h-[32px]">
                      {isLoadingOrdersData ? <span className="inline-block animate-pulse">... </span> : activeOrders}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Browse Categories - Exactly like Image */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 ml-5">
              <h2 className="text-xl sm:text-2xl font-bold text-pink-600 uppercase tracking-wide ml-5" style={{ color: '#AD0539' }}>
                FEATURED CATEGORIES
              </h2>
              <Link to="/buyer/listings">
                <Button variant="ghost" className="w-full sm:w-auto text-white hover:text-pink-400">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="relative overflow-hidden">
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 transition-opacity duration-500"
                style={{
                  opacity: 1
                }}
              >
                {(() => {
                  const allCategories = categoriesData.length > 0 ? categoriesData : defaultCategories;
                  const startIndex = currentCategorySlide * 4;
                  const endIndex = startIndex + 4;
                  const visibleCategories = allCategories.slice(startIndex, endIndex);

                  return visibleCategories.map((category: any) => {
                    const Icon = category.icon;

                    return (
                      <Card
                        key={category.id}
                        className="group hover:scale-105 transition-all duration-200 cursor-pointer border border-gray-700 bg-gray-900 overflow-hidden"
                      >
                        <CardContent className="p-0">
                          {/* Image/Icon Section - Top Part - Original Category Icon */}
                          <div className="relative h-32 sm:h-40 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-20`}></div>
                            <div className="relative z-10 w-full h-full flex items-center justify-center">
                              <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}>
                                <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                              </div>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-4 sm:p-5">
                            <h3 className="font-bold mb-2 text-sm sm:text-base uppercase tracking-wide" style={{ color: '#AD0539' }}>{category.name}</h3>
                            <p className="text-xs sm:text-sm text-white mb-2 leading-relaxed">{category.services}</p>
                            <div className="flex items-center justify-between mt-3">
                              <p className="text-xs sm:text-sm font-medium" style={{ color: '#AD0539' }}>{category.count} LISTINGS</p>
                              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </div>
          </section>

          {/* Featured Listings - Infinite Horizontal Scroll */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide" style={{ color: '#AD0539' }}>
                FEATURED LISTINGS
              </h2>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link to="/buyer/listings">
                  <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="w-full overflow-hidden" style={{ position: 'relative', isolation: 'isolate' }}>
                <div className="flex gap-4">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="flex-shrink-0 w-[280px] sm:w-[300px]">
                      <Card className="border border-gray-700 bg-gray-900 overflow-hidden group">
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
                      </Card>
                    </div>
                  ))}
                </div>
                <style>{`
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                  .animate-shimmer {
                    animation: shimmer 2s infinite;
                  }
                `}</style>
              </div>
            ) : trendingProducts.length > 0 ? (
              <div className="w-full overflow-hidden" style={{ position: 'relative', isolation: 'isolate' }}>
                <div
                  className="flex gap-4"
                  id="featured-listings-scroll"
                  style={{
                    animation: `scroll-horizontal-${trendingProducts.length} 300s linear infinite`,
                    width: 'max-content',
                    willChange: 'transform',
                    display: 'inline-flex'
                  }}
                  onMouseEnter={(e) => {
                    const element = e.currentTarget;
                    element.style.animationPlayState = 'paused';
                  }}
                  onMouseLeave={(e) => {
                    const element = e.currentTarget;
                    element.style.animationPlayState = 'running';
                  }}
                >
                  {/* Duplicate products for seamless loop */}
                  {[...trendingProducts, ...trendingProducts, ...trendingProducts].map((product, idx) => (
                    <div key={`${product.id}-${idx}`} className="flex-shrink-0 w-[280px] sm:w-[300px]">
                      <ProductCard product={product as any} redirectOnAction={true} />
                    </div>
                  ))}
                </div>
                <style>{`
                  @keyframes scroll-horizontal-${trendingProducts.length} {
                    0% {
                      transform: translateX(0);
                    }
                    100% {
                      transform: translateX(-${trendingProducts.length * 304}px);
                    }
                  }
                  #featured-listings-scroll {
                    transition: animation-play-state 0.3s ease;
                  }
                `}</style>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No featured products available</p>
              </div>
            )}
          </section>

          {/* Recent Orders Section - Exactly like Image */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide" style={{ color: '#AD0539' }}>
                RECENT ORDERS
              </h2>
              <Link to="/buyer/orders">
                <Button variant="ghost" className="w-full sm:w-auto text-white hover:text-pink-400">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {isLoadingOrdersData ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-gray-700 bg-gray-900">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : recentOrders.length > 0 ? recentOrders.map((order) => (
                <Card key={order.id} className="group hover:bg-gray-800/50 transition-all duration-200 border-gray-700 bg-gray-900">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1" style={{ color: '#AD0539' }}>{order.product?.headline || order.title}</h3>
                            <p className="text-sm text-gray-400 mb-2">{typeof order.vendor === "string" ? order.vendor : order.vendor?.username}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Order: {order.order_id || order.id}</span>
                              <span>•</span>
                              <span>{order.created_at || order.orderDate ? new Date(order.created_at || order.orderDate!).toLocaleDateString() : ""}</span>
                            </div>
                            {order.product_credentials && Object.keys(order.product_credentials).length > 0 &&
                              (order.order_status === 'paid' || order.order_status === 'confirmed' || order.order_status === 'delivered') && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => {
                                      const credentialsData = order.product_credentials?.credentials || '';
                                      const emailPart = credentialsData.split('Password:')[0]?.replace('Email:', '').trim() || 'N/A';
                                      const passwordPart = credentialsData.split('Password:')[1]?.trim() || 'N/A';
                                      const modal = document.createElement('div');
                                      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';

                                      modal.innerHTML = `
                                      <div class="bg-gray-900 border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                                        <div class="flex items-center justify-between p-6 border-b border-gray-600/20">
                                          <h2 class="text-xl font-bold text-white">Product Credentials</h2>
                                          <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                          </button>
                                        </div>
                                        <div class="p-6 overflow-y-auto max-h-[60vh]">
                                          <div class="space-y-4">
                                            <div class="bg-gray-800/50 rounded-lg p-4">
                                              <div class="flex items-center justify-between mb-2">
                                                <p class="text-sm text-gray-400">Email:</p>
                                                <button onclick="this.nextElementSibling.classList.toggle('hidden'); this.innerHTML = this.nextElementSibling.classList.contains('hidden') ? '👁️' : '🙈'" class="text-green-400 hover:text-green-300">👁️</button>
                                              </div>
                                              <p class="text-white font-mono break-all hidden">${emailPart}</p>
                                            </div>
                                            <div class="bg-gray-800/50 rounded-lg p-4">
                                              <div class="flex items-center justify-between mb-2">
                                                <p class="text-sm text-gray-400">Password:</p>
                                                <button onclick="this.nextElementSibling.classList.toggle('hidden'); this.innerHTML = this.nextElementSibling.classList.contains('hidden') ? '👁️' : '🙈'" class="text-green-400 hover:text-green-300">👁️</button>
                                              </div>
                                              <p class="text-white font-mono break-all hidden">${passwordPart}</p>
                                            </div>
                                            <div class="flex justify-center mt-6">
                                              <button id="downloadBtn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                                <span>Download Credentials</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    `;

                                      const downloadBtn = modal.querySelector('#downloadBtn');
                                      downloadBtn?.addEventListener('click', () => {
                                        const credentialsText = `Email: ${emailPart}\nPassword: ${passwordPart}`;
                                        const blob = new Blob([credentialsText], { type: 'text/plain' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${order.product?.headline || 'product'}_credentials.txt`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);
                                      });

                                      document.body.appendChild(modal);
                                    }}
                                    className="text-xs text-green-400 hover:text-green-300 underline cursor-pointer"
                                  >
                                    Click to view credentials
                                  </button>
                                </div>
                              )}
                          </div>
                          <div className="text-right ml-6">
                            <p className="text-lg font-bold text-white mb-1">{order.price}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs border-gray-600 ${order.status === 'delivered' ? 'text-gray-300' :
                                order.status === 'processing' ? 'text-gray-300' :
                                  order.status === 'shipped' ? 'text-gray-300' : 'text-gray-300'
                                }`}
                            >
                              {order.status === 'delivered' ? 'Delivered' :
                                order.status === 'processing' ? 'Processing' :
                                  order.status === 'shipped' ? 'Shipped' : order.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center space-x-4 text-xs">
                            <span className="text-gray-400">
                              {order.status === 'delivered' ? 'Delivered on:' : 'Expected delivery:'}
                            </span>
                            <span className="text-gray-300">
                              {order.deliveryDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(order.status === 'paid' || order.status === 'delivered' || order.status === 'confirmed') && order.canRate ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600 hover:border-gray-500"
                              onClick={() => {
                                const pid = (order as any)?.product?.id;
                                if (pid) {
                                  setReviewProductId(pid);
                                  setReviewRating(5);
                                  setReviewComment("");
                                  setIsReviewOpen(true);
                                } else {
                                  toast({ title: 'Cannot open review', description: 'Missing product reference for this order.' });
                                }
                              }}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Rate Order
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 hover:border-gray-500"
                            onClick={() => {
                              // Navigate to orders page with order ID to auto-open details
                              navigate(`/buyer/orders`, {
                                state: {
                                  openOrderId: order.order_id || order.id,
                                  openOrderDetails: true
                                }
                              });
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 hover:border-gray-500"
                            onClick={() => {
                              // Navigate to messages page and auto-open vendor chat
                              const vendorUsername = typeof order.vendor === 'string'
                                ? order.vendor
                                : order.vendor?.username || '';
                              if (vendorUsername) {
                                navigate(`/buyer/messages`, {
                                  state: {
                                    openVendorChat: vendorUsername,
                                    autoOpenChat: true
                                  }
                                });
                              } else {
                                toast({
                                  title: 'Error',
                                  description: 'Vendor information not available',
                                  variant: 'destructive'
                                });
                              }
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contact Vendor
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 hover:border-gray-500"
                            onClick={() => {
                              // Show status change modal
                              const currentStatus = order.order_status || order.status || 'unknown';
                              const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
                              const currentIndex = statusOptions.indexOf(currentStatus.toLowerCase());
                              const nextStatus = currentIndex < statusOptions.length - 1
                                ? statusOptions[currentIndex + 1]
                                : statusOptions[0];

                              toast({
                                title: 'Change Status',
                                description: `Current status: ${currentStatus}. Would you like to update it? Go to order history if want`,
                                variant: 'default'
                              });

                              // In a real implementation, this would call an API to update status
                              // For now, just show a message
                              console.log('Would update order status to:', nextStatus);
                            }}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Change Status
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 text-lg">No recent orders</p>
                  <p className="text-gray-500 text-sm">Your orders will appear here</p>
                </div>
              )}
            </div>
          </section>


          {/* Review Modal */}
          {isReviewOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
                <div className="p-5 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="text-white font-semibold">Share your review</h3>
                  <button className="text-gray-400 hover:text-gray-200" onClick={() => setIsReviewOpen(false)}>✕</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <Label className="text-gray-300">Rating</Label>
                    <div className="flex space-x-2 mt-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border ${reviewRating >= n ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-800 text-gray-300 border-gray-700'}`}
                          onClick={() => setReviewRating(n)}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Comment</Label>
                    <textarea
                      className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                      rows={4}
                      placeholder="Share your experience..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-5 border-t border-gray-700 flex items-center justify-end space-x-3">
                  <Button variant="outline" className="border-gray-600" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      if (!reviewProductId) return;
                      try {
                        const res = await productService.postReview(reviewProductId, { rating: reviewRating, comment: reviewComment });
                        if (res?.success) {
                          toast({ title: 'Thank you!', description: 'Your review has been submitted.' });
                          setIsReviewOpen(false);
                        } else {
                          toast({ title: 'Review failed', description: res?.message || 'Please try again.' });
                        }
                      } catch (err: any) {
                        toast({ title: 'Review failed', description: err?.message || 'Please try again.' });
                      }
                    }}
                  >Submit Review</Button>
                </div>
              </div>
            </div>
          )}

          {/* Top Vendors Section - Exactly like Image */}
          <section>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide" style={{ color: '#AD0539' }}>
                TOP VENDORS
              </h2>
              <Link to="/vendors">
                <Button variant="ghost" className="w-full sm:w-auto text-white hover:text-pink-400">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {(topVendorsData.length ? topVendorsData : topVendors).map((vendor) => (
                <Card key={vendor.id} className="group hover:scale-105 transition-all duration-200 cursor-pointer border-gray-700 bg-gray-900">
                  <CardContent className="p-6 text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{vendor.avatar}</span>
                      </div>
                      {vendor.verified && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Verified className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold mb-2" style={{ color: '#AD0539' }}>{vendor.name}</h3>
                    <p className="text-xs text-gray-400 mb-3">{vendor.specialization}</p>
                    <div className="flex items-center justify-center space-x-1 mb-3">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-white">{vendor.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <Clock className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">{vendor.responseTime || '< 2 hours'}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-600"
                      onClick={() => {
                        const username = (vendor as any).vendor_username || (vendor.name || '').toLowerCase().replace(/\s+/g, '_');
                        if (username) {
                          window.location.href = `/vendor/public/${username}`;
                        }
                      }}
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      View Store
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Activity and Actions Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Quick Actions Section - Exactly like Image */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide mb-4 sm:mb-6" style={{ color: '#AD0539' }}>
                QUICK ACTIONS
              </h2>
              <div className="space-y-4">
                <Link to="/buyer/orders">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border border-gray-700 bg-gray-900">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">Active Orders</h3>
                          <p className="text-sm text-gray-400">{activeOrders} active orders</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/buyer/messages">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border border-gray-700 bg-gray-900">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">Messages</h3>
                          <p className="text-sm text-gray-400">
                            {isLoadingMessages ? (
                              <span className="flex items-center">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Loading...
                              </span>
                            ) : (
                              `${unreadCount} unread`
                            )}
                          </p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/buyer/transaction-history">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border border-gray-700 bg-gray-900">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">Transaction History</h3>
                          <p className="text-sm text-gray-400">View all payments</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                          <Bitcoin className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/buyer/support">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border border-gray-700 bg-gray-900">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">Premium Support</h3>
                          <p className="text-sm text-gray-400">24/7 assistance</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                          <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </section>

            {/* Recent Activity Section - Exactly like Image */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide mb-4 sm:mb-6" style={{ color: '#AD0539' }}>
                RECENT ACTIVITY
              </h2>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <Card className="border-gray-700 bg-gray-900">
                    <CardContent className="p-8 text-center">
                      <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">No recent activity</p>
                    </CardContent>
                  </Card>
                ) : (
                  recentActivity.map((activity) => (
                    <Card key={activity.id} className="border border-gray-700 bg-gray-900 hover:bg-gray-800/80 transition-colors duration-200">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start space-x-4">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${activity.status === 'success' ? 'bg-green-400' :
                            activity.status === 'info' ? 'bg-blue-400' :
                              activity.status === 'warning' ? 'bg-yellow-400' :
                                activity.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                            }`}></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-sm mb-1">{activity.title}</h4>
                            <p className="text-xs text-gray-400 mb-2">{activity.description}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{activity.time}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </BuyerLayout>
    </>
  );
}

export default function BuyerHome() {
  return (
    <CartProvider>
      <BuyerHomeContent />
    </CartProvider>
  );
}