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
  Wallet
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { orderService } from "@/services/orderService";
import { productService, Product } from "@/services/productService";

// Add these interfaces at the top of the file (after imports)

interface Product {
  id: string | number;
  headline?: string;
  listing_title?: string;
  vendor?: { username?: string };
  vendor_username?: string;
  price: string | number;
  main_image?: string;
  main_images?: string[];
  rating?: number | string;
  quantity_available?: number;
  trending?: boolean;
  category?: { name?: string };
  is_featured?: boolean;
  delivery_time?: string;
  account_type?: string;
  description?: string;
}

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

const categories = [
  { id: 1, name: "Streaming", icon: Play, count: "1,247", color: "from-red-500 to-pink-500" },
  { id: 2, name: "Software", icon: Code, count: "892", color: "from-blue-500 to-cyan-500" },
  { id: 3, name: "Gaming", icon: Gamepad2, count: "567", color: "from-green-500 to-emerald-500" },
  { id: 4, name: "Design", icon: Image, count: "423", color: "from-teal-500 to-cyan-500" },
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

function BuyerHomeContent() {
  console.log("Hello World");
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
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [duplicatedProducts, setDuplicatedProducts] = useState<Product[]>([]);
  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: "order",
      title: "Order delivered",
      description: "Netflix Premium Account has been delivered to your account",
      time: "2 min ago",
      status: "success"
    },
    {
      id: 2,
      type: "message",
      title: "New message from vendor",
      description: "CryptoAccountsPlus replied to your inquiry about Spotify Premium",
      time: "15 min ago",
      status: "info"
    },
    {
      id: 3,
      type: "order",
      title: "Order processing",
      description: "Your Adobe Creative Cloud order is being prepared",
      time: "1 hour ago",
      status: "warning"
    },
    {
      id: 4,
      type: "wishlist",
      title: "Price drop alert",
      description: "Xbox Game Pass Ultimate is now 25% off - check your wishlist!",
      time: "2 hours ago",
      status: "success"
    }
  ]);
  const { toast } = useToast();

  // Enhanced smooth auto-slide effect - only when not hovered
  useEffect(() => {
    if (!trendingProducts.length || isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        // Simply increment without resetting - infinite scroll
        return prev + 0.01; // Slower, smoother movement
      });
    }, 10); // Smooth interval for animation
    
    return () => clearInterval(interval);
  }, [trendingProducts.length, isHovered]);

  // Fetch trending products with enhancement
  useEffect(() => {
    const fetchTrendingProducts = async () => {
      try {
        setLoading(true);
        const response = await productService.getProducts({
          sort_by: "views_count",
          page_size: 50 // Fetch more products to show variety
        });
        
        if (response.success && response.data) {
          setTrendingProducts(response.data);
          
          // Create duplicated array for infinite scroll
          // Triple the products to ensure smooth infinite scrolling
          const tripled = [...response.data, ...response.data, ...response.data];
          setDuplicatedProducts(tripled);
          
          console.log("Trending products loaded:", response.data.length);
        } else {
          console.error("API returned success: false");
          setTrendingProducts([]);
          setDuplicatedProducts([]);
        }
      } catch (error) {
        console.error("Error fetching trending products:", error);
        setTrendingProducts([]);
        setDuplicatedProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrendingProducts();
  }, []);

  // Simplified and immediate order fetch function
  const fetchOrdersData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No auth token found');
        setIsLoadingOrder(false);
        setIsLoadingOrdersData(false);
        return;
      }

      console.log('Fetching orders data...');
      setIsLoadingOrder(true);
      setIsLoadingOrdersData(true);
      setOrdersError(null);
      
      // Direct API call with better error handling
      const ordersData = await orderService.getOrders();
      console.log('Raw orders data:', ordersData);
      
      const orders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);
      console.log('Processed orders:', orders.length);
      
      // Process pending orders for active order banner
      const pendingOrders = orders.filter((order) => 
        order.payment_status === 'pending' && order.order_status === 'pending_payment'
      );

      if (pendingOrders.length > 0) {
        const lastOrder = pendingOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        setActiveOrder(lastOrder);
        setPendingOrdersCount(pendingOrders.length);
        
        const orderCreatedAt = new Date(lastOrder.created_at).getTime();
        const expiresAt = orderCreatedAt + (30 * 60 * 1000);
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
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      setRecentOrders(recent);

      // Process order counts
      setTotalOrders(orders.length);
      
      const activeOrdersList = orders.filter(order => 
        ["pending", "processing", "shipped"].includes(order.order_status)
      );
      setActiveOrders(activeOrdersList.length);

      console.log('Orders data loaded successfully:', {
        total: orders.length,
        pending: pendingOrders.length,
        recent: recent.length,
        active: activeOrdersList.length
      });

      // Reset retry count on successful fetch
      setRetryCount(0);

    } catch (error) {
      console.error('Failed to fetch orders data:', error);
      setOrdersError('Failed to load order data');
      
      // Only retry once if retry count is less than 2
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          console.log('Retrying order data fetch...');
          fetchOrdersData();
        }, 5000); // Wait 5 seconds before retry
      } else {
        console.log('Max retries reached, stopping...');
        setRetryCount(0); // Reset for next time
      }
      
    } finally {
      setIsLoadingOrder(false);
      setIsLoadingOrdersData(false);
    }
  };

  // Immediate order fetch function - always fetch fresh data
  const fetchOrderImmediately = async () => {
    console.log('Fetching orders immediately...');
    await fetchOrdersData();
  };

  // Fetch active order
  useEffect(() => {
    fetchOrderImmediately();
  }, []);

  // Interval to check for new orders (only when there are active orders)
  useEffect(() => {
    // Only poll if there are active orders or pending payments
    if (activeOrders > 0 || pendingOrdersCount > 0) {
      const interval = setInterval(() => {
        console.log('Polling for order updates...');
        fetchOrdersData();
      }, 120000); // Every 2 minutes instead of 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeOrders, pendingOrdersCount]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrdersData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      addOrderCancellationNotification(activeOrder.order_id, productName);

      const response = await orderService.updateOrderStatus(activeOrder.order_id, 'cancelled');

      if (response) {
        setActiveOrder(null);
        setTimeRemaining(0);
        setPendingOrdersCount(0);
        localStorage.removeItem('activeOrderTimer');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  // These functions are now consolidated into fetchOrdersData()
  const addOrderCancellationNotification = (orderId, productName) => {
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

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Payment address copied to clipboard.",
    });
  };

  return (
    <>
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
              <Link href="/buyer/orders">
                <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-800">
                  View All ({pendingOrdersCount})
                </Button>
              </Link>
            )}
            <Link href="/buyer/payment-test">
              <Button size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
                Pay Now
              </Button>
            </Link>
          </div>
        </div>
      )}

      <BuyerLayout hasBanner={activeOrder && !isLoadingOrder && timeRemaining > 0}>
        <div className="space-y-6">
          {/* Hero Search Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/20 via-teal-900/20 to-cyan-900/20 border border-gray-700/50 p-8">
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm"></div>
            <div className="relative">
              <div className="text-center mb-8">
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                  Find Your Perfect Digital Account
                </h1>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                  Browse thousands of premium accounts from verified vendors with crypto payments
                </p>
              </div>
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search for Netflix, Spotify, Steam, Adobe..."
                      className="pl-12 pr-4 py-4 text-lg bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 rounded-xl backdrop-blur-sm"
                    />
                  </div>
                  <Button size="lg" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl">
                    Search
                  </Button>
                  <Button variant="outline" size="lg" className="px-6 py-4 rounded-xl border-gray-600">
                    <Filter className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-blue-700/50 hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white min-h-[32px]">
                      {isLoadingOrdersData ? <span className="inline-block animate-pulse">... </span> : totalOrders}
                    </p>
                    <p className="text-sm text-blue-300">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wishlist Items Card (unchanged) */}
            <Card className="bg-gradient-to-br from-green-900/30 to-emerald-800/30 border-green-700/50 hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">5</p>
                    <p className="text-sm text-green-300">Wishlist Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Messages Card (placeholder data) */}
            <Card className="bg-gradient-to-br from-teal-900/30 to-cyan-800/30 border-teal-700/50 hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">5</p>
                    <p className="text-sm text-teal-300">New Messages</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Orders Card */}
            <Card className="bg-gradient-to-br from-orange-900/30 to-amber-800/30 border-orange-700/50 hover:scale-105 transition-transform duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white min-h-[32px]">
                      {isLoadingOrdersData ? <span className="inline-block animate-pulse">... </span> : activeOrders}
                    </p>
                    <p className="text-sm text-orange-300">Active Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Browse Categories */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Sparkles className="w-7 h-7 mr-3 text-yellow-400" />
                Browse Categories
              </h2>
              <Link href="/buyer/listings">
                <Button variant="ghost" className="text-blue-400 hover:text-blue-300">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.id} className="group hover:scale-105 transition-all duration-200 cursor-pointer border-gray-700 bg-gray-900">
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">{category.name}</h3>
                      <p className="text-sm text-gray-400">{category.count} products</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Enhanced Trending Products Carousel */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <TrendingUp className="w-7 h-7 mr-3 text-green-400" />
                Trending Now
              </h2>
              <div className="flex items-center space-x-4">
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  Hot Deals
                </Badge>
                <div className="text-sm text-gray-400">
                  {trendingProducts.length} Products Available
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
              </div>
            ) : (
              <div 
                className="relative overflow-hidden rounded-xl"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Smooth Infinite Carousel - No Reset */}
                <div 
                  className="flex transition-none" 
                  style={{ 
                    transform: `translateX(-${(currentSlide * 33.333) % (trendingProducts.length * 100)}%)`
                  }}
                >
                  {/* Create enough duplicates for seamless infinite scroll */}
                  {Array(6).fill(trendingProducts).flat().map((product, index) => (
                    <div 
                      key={`${product.id}-${index}`} 
                      className="flex-none w-1/3 px-3"
                    >
                      <div className="relative group">
                        <ProductCard 
                          product={{
                            ...product,
                            vendor: typeof product.vendor === "string" ? product.vendor : product.vendor?.username || product.vendor_username || "Unknown Vendor",
                            rating: parseFloat(product.rating as string) || 4.5,
                            trending: true,
                            category: product.category?.name || "General"
                          }} 
                        />
                        
                        {/* Hover overlay with product details */}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center p-4">
                          <div className="text-center text-white">
                            <h4 className="font-semibold mb-2 text-sm">
                              {product.headline || product.listing_title || "Untitled Product"}
                            </h4>
                            <p className="text-xs text-gray-300 mb-3 line-clamp-2">
                              {product.description || "No description available"}
                            </p>
                            <div className="flex items-center justify-center space-x-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {product.category?.name || "General"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {product.account_type}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Special badges */}
                        {product.is_featured && (
                          <Badge className="absolute -top-2 -left-2 bg-yellow-500 text-black z-10 text-xs">
                            Featured
                          </Badge>
                        )}
                        {product.delivery_time === 'instant_auto' && (
                          <Badge className="absolute -top-2 -right-2 bg-green-500 text-white z-10 text-xs">
                            Instant
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pause indicator when hovered */}
                {isHovered && (
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                    Paused
                  </div>
                )}
              </div>
            )}
            
            {/* Product stats - simplified without timer info */}
            {!loading && trendingProducts.length > 0 && (
              <div className="flex justify-center mt-6 text-sm text-gray-400">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Showing all {trendingProducts.length} products</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>Hover to pause</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Recent Orders Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Package className="w-7 h-7 mr-3 text-blue-400" />
                Recent Orders
              </h2>
              <Link href="/buyer/orders">
                <Button variant="ghost" className="text-blue-400 hover:text-blue-300">
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
                            <h3 className="font-semibold text-white mb-1">{order.product?.headline || order.title}</h3>
                            <p className="text-sm text-gray-400 mb-2">{typeof order.vendor === "string" ? order.vendor : order.vendor?.username}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Order: {order.order_id || order.id}</span>
                              <span>•</span>
                              <span>{order.created_at || order.orderDate ? new Date(order.created_at || order.orderDate!).toLocaleDateString() : ""}</span>
                            </div>
                            {order.product_credentials && Object.keys(order.product_credentials).length > 0 && order.order_status === 'paid' && (
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
                              className={`text-xs border-gray-600 ${
                                order.status === 'delivered' ? 'text-gray-300' :
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
                        
                        <div className="flex space-x-3">
                          {order.status === 'delivered' && order.canRate ? (
                            <Button variant="outline" size="sm" className="border-gray-600 hover:border-gray-500">
                              <Star className="w-4 h-4 mr-2" />
                              Rate Order
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="border-gray-600 hover:border-gray-500">
                              <Package className="w-4 h-4 mr-2" />
                              Track Order
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="border-gray-600 hover:border-gray-500">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contact Vendor
                          </Button>
                          <Button variant="outline" size="sm" className="border-gray-600 hover:border-gray-500">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
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

          {/* Top Vendors Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Award className="w-7 h-7 mr-3 text-yellow-400" />
                Top Vendors
              </h2>
              <Link href="/vendors">
                <Button variant="ghost" className="text-blue-400 hover:text-blue-300">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {topVendors.map((vendor) => (
                <Card key={vendor.id} className="group hover:scale-105 transition-all duration-200 cursor-pointer border-gray-700 bg-gray-900">
                  <CardContent className="p-6 text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{vendor.avatar}</span>
                      </div>
                      {vendor.verified && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Verified className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-white mb-2">{vendor.name}</h3>
                    <p className="text-xs text-gray-400 mb-3">{vendor.specialization}</p>
                    <div className="flex items-center justify-center space-x-1 mb-3">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-white">{vendor.rating}</span>
                      <span className="text-xs text-gray-400">({vendor.totalSales} sales)</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <Clock className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">{vendor.responseTime}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-gray-600">
                      <Eye className="w-3 h-3 mr-2" />
                      View Store
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Activity and Actions Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Clock className="w-7 h-7 mr-3 text-blue-400" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <Card key={activity.id} className="border-gray-700 bg-gray-900 hover:bg-gray-800/80 transition-colors duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-start space-x-4">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                          activity.status === 'success' ? 'bg-green-400' :
                          activity.status === 'info' ? 'bg-blue-400' :
                          activity.status === 'warning' ? 'bg-yellow-400' : 'bg-gray-400'
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
                ))}
              </div>
            </section>

            {/* Quick Actions Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Zap className="w-7 h-7 mr-3 text-yellow-400" />
                Quick Actions
              </h2>
              <div className="space-y-4">
                <Link href="/buyer/orders">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border-gray-700 bg-gray-900">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Track Orders</h3>
                          <p className="text-sm text-gray-400">3 active orders</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/buyer/messages">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border-gray-700 bg-gray-900">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-teal-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Messages</h3>
                          <p className="text-sm text-gray-400">5 unread</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                
                <Link href="/buyer/support">
                  <Card className="group hover:scale-105 transition-all duration-200 cursor-pointer border-gray-700 bg-gray-900">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                          <Crown className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Premium Support</h3>
                          <p className="text-sm text-gray-400">24/7 assistance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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