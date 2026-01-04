import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
import { TermsConditionsModal } from "@/components/TermsConditionsModal";
import { VendorOverviewCards } from "@/components/vendor/VendorOverviewCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, TrendingUp, Package, Star, Lock, CheckCircle, MessageSquare, Users, Megaphone, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { orderService } from "@/services/orderService";
import { messagingService } from "@/services/messagingService";
import { realtimeService } from "@/services/realtimeService";
import disputeService from "@/services/disputeService";
import { useToast } from "@/hooks/use-toast";
import { productService } from "@/services/productService";
import vendorService from "@/services/vendorService";
import { api, authService } from "@/services/authService";

interface Order {
  id: string;
  order_id: string;
  buyer: {
    username: string;
  };
  product: {
    headline: string;
  };
  total_amount: string;
  crypto_currency: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  use_escrow?: boolean;
  confirmed_at?: string;
}


export default function VendorOverview() {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingTopProducts, setIsLoadingTopProducts] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState<string>("$0.00");
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [earnings, setEarnings] = useState<number>(0);
  const [disputes, setDisputes] = useState<number>(0);
  const [ordersFetched, setOrdersFetched] = useState(false);
  const [productsFetched, setProductsFetched] = useState(false);
  const [messagesFetched, setMessagesFetched] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [trends, setTrends] = useState<any>({});
  const [additionalStats, setAdditionalStats] = useState<any>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>('loading');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Cache keys for localStorage
  const CACHE_KEYS = {
    RECENT_ORDERS: 'vendor_dashboard_recent_orders',
    TOP_PRODUCTS: 'vendor_dashboard_top_products',
    RECENT_MESSAGES: 'vendor_dashboard_recent_messages',
    CARDS_DATA: 'vendor_dashboard_cards_data',
    DASHBOARD_STATS: 'vendor_dashboard_stats',
  };
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  // Fetch recent orders and calculate metrics with caching
  const fetchRecentOrders = async () => {
    if (ordersFetched) return;

    // Try cache first
    const cached = getCachedData(CACHE_KEYS.RECENT_ORDERS);
    if (cached !== null) {
      setRecentOrders(cached.slice(0, 5));
      // setOrdersFetched(true); // Don't set yet, we might need stats
    }

    try {
      setIsLoadingOrders(true);
      setIsLoadingCards(true);

      // Fetch Dashboard Stats (Parallel with orders usually, or replaces calculations)
      const statsResponse = await vendorService.getDashboardStats();
      if (statsResponse.success && statsResponse.data) {
        const stats = statsResponse.data;

        setTotalRevenue(stats.revenue.total);
        setTotalSales(String(stats.sales.total)); // Show numeric count of orders
        setActiveListingsCount(stats.listings.active);
        setPendingOrdersCount(stats.listings.attention_required);
        setEarnings(stats.revenue.total); // Numeric USD total
        setDisputes(stats.cases.active);

        // Update Trends
        setTrends({
          salesChange: "Lifetime count",
          listingsChange: "0 this week",
          ordersChange: "0 from yesterday",
          earningsChange: `+$${stats.revenue.total.toLocaleString()}`, // Show total as positive growth for now
          disputesChange: "No change"
        });

        // Calculate BTC estimate
        const btcEstimate = stats.revenue.total / 100000;

        setAdditionalStats({
          btcRevenue: `≈ ${btcEstimate.toFixed(8)} BTC`,
          featuredListings: Math.floor(stats.listings.active / 2), // Mock logic from previous code, can be real later
          ordersAttention: stats.listings.attention_required,
          disputesActive: stats.cases.active,
          avgResponseTime: "N/A" // Will be calculated from messages if available
        });
      }

      // Fetch Orders List
      let ordersData: any = [];
      try {
        ordersData = await orderService.getVendorOrders();
      } catch (e) {
        // ignore
      }
      const ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.results || [];
      const allOrders = ordersArray || [];

      // Sort and set recent orders - Take 4 for better layout balance
      const sortedOrders = allOrders
        .sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

      setRecentOrders(sortedOrders);
      setCachedData(CACHE_KEYS.RECENT_ORDERS, sortedOrders);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoadingOrders(false);
      setIsLoadingCards(false);
      setOrdersFetched(true);
    }
  };

  const fetchActiveListings = async () => {
    // Now handled by fetchRecentOrders / getDashboardStats
  };

  // Fetch top performing products with caching
  const fetchTopProducts = async () => {
    if (productsFetched) return;

    // Try cache first
    const cached = getCachedData(CACHE_KEYS.TOP_PRODUCTS);
    if (cached !== null) {
      setTopProducts(cached);
      setIsLoadingTopProducts(false);
      setProductsFetched(true);
      return;
    }

    try {
      setIsLoadingTopProducts(true);
      const res = await productService.getVendorProducts();
      const products = (res as any)?.data || [];

      // Sort by review count or sales and take top 6
      const topProductsList = products
        .sort((a: any, b: any) => (b.review_count || 0) - (a.review_count || 0))
        .slice(0, 6)
        .map((product: any) => ({
          id: product.id,
          name: product.headline || product.listing_title || "Product",
          sales: product.review_count || 0,
          revenue: `$${Number(product.price || 0).toFixed(2)}`,
          status: product.status === 'approved' ? 'Active' : 'Inactive',
          stock: product.quantity_available || 0
        }));

      setTopProducts(topProductsList);
      setCachedData(CACHE_KEYS.TOP_PRODUCTS, topProductsList);
    } catch (e) {
      console.error('Error fetching top products:', e);
      setTopProducts([]);
    } finally {
      setIsLoadingTopProducts(false);
      setProductsFetched(true);
    }
  };

  // Fetch recent messages with caching
  const fetchRecentMessages = async () => {
    if (messagesFetched) return;

    // Try cache first
    const cached = getCachedData(CACHE_KEYS.RECENT_MESSAGES);
    if (cached !== null) {
      setRecentMessages(cached);
      setIsLoadingMessages(false);
      setMessagesFetched(true);
      return;
    }

    try {
      setIsLoadingMessages(true);
      const messages = await messagingService.getRecentMessages();
      setRecentMessages(messages);
      setCachedData(CACHE_KEYS.RECENT_MESSAGES, messages);
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      toast({
        title: "Error",
        description: "Failed to load recent messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
      setMessagesFetched(true);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/system/announcements/');
      if (response.data) {
        const data = response.data.results || response.data;
        setAnnouncements(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  useEffect(() => {
    // Check for preview mode
    const searchParams = new URLSearchParams(window.location.search);
    const isParamPreview = searchParams.get('preview') === 'true';
    const isSessionPreview = sessionStorage.getItem('vendorPreviewMode') === 'true';

    if (isParamPreview || isSessionPreview) {
      setIsPreviewMode(true);
    }

    // Removal of preview mode and activation logic
    const handleApprovedTransition = () => {
      setIsApproved(true);
      setApplicationStatus('approved');
      setIsPreviewMode(false);

      // Remove preview mode from session
      sessionStorage.removeItem('vendorPreviewMode');

      // Remove ?preview=true from URL without refreshing
      const url = new URL(window.location.href);
      if (url.searchParams.has('preview')) {
        url.searchParams.delete('preview');
        window.history.replaceState({}, '', url.pathname + url.search);

        toast({
          title: "Account Approved! 🎉",
          description: "Your application was approved! You now have full vendor access.",
        });
      }
    };

    // Fetch actual application status and sync user type
    const fetchStatus = async () => {
      const user = authService.getCurrentUser();
      if (!user) {
        setApplicationStatus('unauthenticated');
        return;
      }

      try {
        // First, check if user type has changed locally
        if (user.user_type === 'vendor') {
          handleApprovedTransition();
          return;
        }

        // Sync profile to see if user_type has changed to vendor on server
        const profileRes = await authService.getProfile();
        if (profileRes.success && profileRes.data) {
          const latestUser = profileRes.data;
          if (latestUser.user_type === 'vendor') {
            const updatedUser = { ...user, user_type: latestUser.user_type };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            handleApprovedTransition();
            return;
          }
        }

        // Check application status details
        const res = await api.get(`/vendors/applications/check/${user.username}/`);
        if (res.data.success && res.data.data) {
          const status = res.data.data.status?.toLowerCase();
          setApplicationStatus(status);
          setRejectionReason(res.data.data.rejection_reason || res.data.data.admin_notes || null);

          if (status === 'approved') {
            handleApprovedTransition();
          }
        } else {
          setApplicationStatus('none');
        }
      } catch (e) {
        console.error('Error checking application status:', e);
        // Don't set error status immediately to avoid flickering during polling
      }
    };

    fetchStatus();

    // Set up polling for real-time updates (every 10 seconds)
    // Only poll if we aren't approved yet
    const intervalId = setInterval(() => {
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.user_type !== 'vendor' && !isApproved) {
        fetchStatus();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isApproved, navigate]);

  // Initialize dashboard data and legal checks
  useEffect(() => {
    // Dev/testing: force-show legal modals when URL contains ?forceShowLegal=1 (dev only)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (import.meta.env.DEV && searchParams.get('forceShowLegal') === '1') {
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

    fetchRecentOrders();
    fetchTopProducts();
    fetchRecentMessages();
    fetchAnnouncements();

    // Subscribe to real-time updates
    const handleRecentMessagesUpdate = (data: any) => {
      console.log('📋 Received recent messages update:', data);
      setRecentMessages(data);
    };

    realtimeService.subscribe('recent_messages_update', handleRecentMessagesUpdate);

    // Listen for new_review event
    const handleNewReview = (payload: any) => {
      toast({
        title: 'New review received',
        description: `${payload?.buyer_username || 'Buyer'} rated ${payload?.rating}/5 for ${payload?.product_title || 'your product'}`,
      });
    };
    realtimeService.subscribe('new_review', handleNewReview);

    // Cleanup on unmount
    return () => {
      realtimeService.unsubscribe('recent_messages_update', handleRecentMessagesUpdate);
      realtimeService.unsubscribe('new_review', handleNewReview);
    };
  }, []);

  // Navigation handlers
  const handleViewAllOrders = () => {
    navigate(isPreviewMode ? '/vendor/orders?preview=true' : '/vendor/orders');
  };

  const handleAddNewProduct = () => {
    navigate(isPreviewMode ? '/vendor/listings/add?preview=true' : '/vendor/listings/add');
  };

  // Get status display for orders
  const getStatusDisplay = (order: Order) => {
    const paymentStatus = order.payment_status?.toLowerCase();
    const orderStatus = order.order_status?.toLowerCase();

    if (paymentStatus === 'paid') {
      return 'Completed';
    }

    switch (orderStatus) {
      case 'pending':
      case 'pending_payment':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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



      {/* Preview Mode Warning Banner */}
      {isPreviewMode && !isApproved && applicationStatus !== 'loading' && (
        <div className="space-y-4 mb-6">
          {(applicationStatus === 'rejected' || applicationStatus === 'Rejected') ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3">
              <div className="p-2 bg-red-500/20 rounded-full shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-red-500 font-semibold text-lg">Application Rejected</h3>
                <p className="text-red-200/80 mt-1">
                  Unfortunately, your vendor application has been rejected.
                  {rejectionReason && (
                    <span className="block mt-2 font-medium text-red-400 font-bold">Reason: {rejectionReason}</span>
                  )}
                </p>
                <Button
                  onClick={() => navigate('/vendor/apply')}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  Edit & Resubmit Application
                </Button>
              </div>
            </div>
          ) : (applicationStatus === 'pending' || applicationStatus === 'loading' || !applicationStatus || applicationStatus === 'none') ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start space-x-3">
              <div className="p-2 bg-yellow-500/20 rounded-full shrink-0">
                <Lock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-yellow-500 font-semibold text-lg">Application Pending</h3>
                <p className="text-yellow-200/80 mt-1">
                  You are currently in <strong>Preview Mode</strong>. Your vendor application is still under review.
                  You can explore the dashboard, but you cannot create active listings or accept orders until your account is verified.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
      {/* Announcements Banner - Moved outside main container */}
      {announcements.length > 0 && (
        <div className="sticky z-40 backdrop-blur-md w-full px-4 mb-4">
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`
                  rounded-lg p-4 border flex items-start space-x-4 shadow-lg
                  ${announcement.priority === 'high'
                    ? 'bg-red-950/40 border-red-500/30 text-red-100'
                    : announcement.priority === 'low'
                      ? 'bg-gray-900/60 border-gray-700 text-gray-200'
                      : 'bg-blue-950/40 border-blue-500/30 text-blue-100'
                  }
                `}
              >
                <div className={`p-2 rounded-full ${announcement.priority === 'high' ? 'bg-red-500/20' :
                  announcement.priority === 'low' ? 'bg-gray-700/50' :
                    'bg-blue-500/20'
                  }`}>
                  <Megaphone className={`w-5 h-5 ${announcement.priority === 'high' ? 'text-red-400' :
                    announcement.priority === 'low' ? 'text-gray-400' :
                      'text-blue-400'
                    }`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${announcement.priority === 'high' ? 'text-red-400' :
                    announcement.priority === 'low' ? 'text-gray-200' :
                      'text-blue-400'
                    }`}>
                    {announcement.title}
                  </h3>
                  <p className="text-sm mt-1 opacity-90">{announcement.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">

        {/* AC Logo and Branding Section */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6">
          {/* AC Logo Monogram */}
          <div className="mb-3 sm:mb-4">
            <img
              src="/images/ac-logo-monogram.png"
              alt="AC Logo Monogram"
              className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain"
              style={{ filter: 'brightness(0.8) contrast(1.1) saturate(0.9)', imageRendering: '-webkit-optimize-contrast' }}
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

        {/* ADD LISTING Button - Left Positioned */}
        <div className="flex justify-start mb-4 sm:mb-6 lg:mb-8">
          <Button
            className="bg-theme-red hover:bg-theme-red-dark text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg shadow-theme-red/20"
            onClick={handleAddNewProduct}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="truncate">ADD LISTING</span>
          </Button>
        </div>

        {/* Overview Cards */}
        <VendorOverviewCards
          pendingOrders={pendingOrdersCount}
          activeListings={activeListingsCount}
          totalSales={totalSales}
          totalRevenue={totalRevenue}
          earnings={earnings}
          disputes={disputes}
          isLoading={isLoadingCards}
          trends={trends}
          additionalStats={additionalStats}
        />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch">
          {/* Recent Orders */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl relative z-10 flex flex-col h-full overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <CardTitle className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">RECENT ORDERS</CardTitle>
                <Button
                  className="bg-theme-red hover:bg-theme-red-dark text-white text-xs sm:text-sm w-full sm:w-auto"
                  size="sm"
                  onClick={handleViewAllOrders}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {isLoadingOrders ? (
                  // Skeleton loader for orders - Show 4 for balance
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-800 rounded-lg animate-pulse">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 bg-gray-700 rounded w-24 sm:w-32"></div>
                        <div className="h-4 bg-gray-700 rounded w-16 sm:w-20"></div>
                      </div>
                      <div className="h-3 bg-gray-700 rounded w-32 sm:w-48 mb-2"></div>
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-700 rounded w-20 sm:w-24"></div>
                        <div className="h-4 bg-gray-700 rounded w-12 sm:w-16"></div>
                      </div>
                    </div>
                  ))
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Recent Orders</h3>
                    <p className="text-xs sm:text-sm text-gray-400">You don't have any recent orders yet.</p>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                          <h4 className="font-medium text-white text-sm sm:text-base truncate">{order.order_id}</h4>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <div className="text-xs text-gray-400 mb-1">{formatDate(order.created_at)}</div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge className={`text-[10px] sm:text-xs border-none ${getStatusDisplay(order) === "Completed"
                                ? "bg-theme-cyan-dim text-theme-cyan"
                                : getStatusDisplay(order) === "Processing"
                                  ? "bg-theme-cyan/20 text-theme-cyan"
                                  : getStatusDisplay(order) === "Pending"
                                    ? "bg-theme-red/10 text-theme-red"
                                    : "bg-theme-red text-white"
                                }`}>
                                {getStatusDisplay(order)}
                              </Badge>
                              {order.use_escrow && (
                                <>
                                  <Badge className="bg-gradient-to-r from-theme-cyan/90 to-theme-cyan/70 text-black text-[9px] sm:text-[10px] px-1 py-0 h-4 shadow-sm shadow-theme-cyan/20">
                                    <Lock className="w-2 h-2 mr-0.5" />
                                    ESCROW
                                  </Badge>
                                  {order.order_status === 'paid' && !order.confirmed_at && (
                                    <Badge className="bg-theme-red/20 text-theme-red border-theme-red/30 text-[9px] sm:text-[10px] px-1 py-0 h-4 whitespace-nowrap">
                                      Awaiting
                                    </Badge>
                                  )}
                                  {order.confirmed_at && (
                                    <Badge className="bg-theme-cyan/20 text-theme-cyan border-theme-cyan/30 text-[9px] sm:text-[10px] px-1 py-0 h-4">
                                      <CheckCircle className="w-2 h-2 mr-0.5" />
                                      Approved
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300 mb-1 break-words">{order.product.headline}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm text-gray-400">by {order.buyer.username}</span>
                          <span className="font-semibold text-theme-cyan text-sm sm:text-base">{order.total_amount} {order.crypto_currency}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl relative z-10 flex flex-col h-full overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <CardTitle className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">TOP PRODUCTS</CardTitle>
                <Button className="bg-theme-red hover:bg-theme-red-dark text-white text-xs sm:text-sm w-full sm:w-auto" size="sm">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="sm:inline">Manage</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {isLoadingTopProducts ? (
                  // Skeleton loader for top products - Show 6 for balance
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-gray-800 rounded-lg animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-700 rounded w-32 sm:w-48 mb-2"></div>
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="h-3 bg-gray-700 rounded w-12 sm:w-16"></div>
                            <div className="h-3 bg-gray-700 rounded w-16 sm:w-20"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-gray-700 rounded w-12 sm:w-16 mb-1"></div>
                          <div className="h-5 bg-gray-700 rounded w-10 sm:w-12"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : topProducts.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Products Found</h3>
                    <p className="text-xs sm:text-sm text-gray-400">Start by adding your first product listing.</p>
                  </div>
                ) : (
                  topProducts.map((product) => (
                    <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white mb-1 text-sm sm:text-base break-words">{product.name}</h4>
                        <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-300">
                          <span>{product.sales} sales</span>
                          <span>Stock: {product.stock}</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="font-semibold text-theme-cyan text-sm sm:text-base">{product.revenue}</div>
                        <Badge className={`mt-1 text-[10px] sm:text-xs ${product.status === 'Active' ? 'bg-theme-red text-white' : 'bg-gray-600'} border-none`}>
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Messages */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl relative z-10 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <CardTitle className="text-lg sm:text-xl font-bold text-white">RECENT MESSAGES</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-theme-cyan text-theme-cyan hover:bg-theme-cyan/20 transition-colors text-xs sm:text-sm w-full sm:w-auto"
                onClick={() => navigate('/vendor/messages')}
              >
                <MessageSquare className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">View All Messages</span>
                <span className="sm:hidden">View All</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {isLoadingMessages ? (
                // Skeleton loader for messages
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-3 sm:p-4 bg-gray-800 rounded-lg animate-pulse">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="h-4 bg-gray-700 rounded w-20 sm:w-24"></div>
                          <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="h-3 bg-gray-700 rounded w-24 sm:w-32 mb-1"></div>
                        <div className="h-3 bg-gray-700 rounded w-36 sm:w-48"></div>
                      </div>
                      <div className="h-3 bg-gray-700 rounded w-10 sm:w-12 flex-shrink-0"></div>
                    </div>
                  </div>
                ))
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="text-base font-medium text-white mb-1">No Recent Messages</h3>
                  <p className="text-gray-400 mb-3 text-xs sm:text-sm">You haven't received any messages from buyers yet.</p>
                </div>
              ) : (
                recentMessages.map((message) => (
                  <div key={message.id} className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-cyan-dim rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-theme-cyan font-semibold text-xs sm:text-sm">
                          {message.buyer.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-white text-sm sm:text-base truncate">{message.buyer}</h4>
                          {message.unread && (
                            <div className="w-2 h-2 bg-theme-red rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300 break-words">{message.product}</p>
                        <p className="text-xs sm:text-sm text-gray-400 truncate">{message.lastMessage}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-gray-400">{message.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-white">QUICK ACTIONS</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Button
                className="bg-theme-red hover:bg-theme-red-dark text-white h-14 sm:h-16 cursor-pointer text-sm sm:text-base"
                onClick={() => navigate('/vendor/listings/add')}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Add Product</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button
                className="bg-gray-800 hover:bg-gray-700 text-white h-14 sm:h-16 cursor-pointer text-sm sm:text-base group"
                onClick={() => navigate('/vendor/analytics')}
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 text-gray-400 group-hover:text-theme-cyan transition-colors" />
                <span className="hidden sm:inline">View Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </Button>
              <Button
                className="bg-gray-800 hover:bg-gray-700 text-white h-14 sm:h-16 cursor-pointer text-sm sm:text-base group"
                onClick={() => navigate('/vendor/reviews')}
              >
                <Star className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 text-gray-400 group-hover:text-theme-cyan transition-colors" />
                <span className="hidden sm:inline">Check Reviews</span>
                <span className="sm:hidden">Reviews</span>
              </Button>
              <Button
                className="bg-gray-800 hover:bg-gray-700 text-white h-14 sm:h-16 cursor-pointer text-sm sm:text-base sm:col-span-2 lg:col-span-1 group"
                onClick={() => {
                  const userStr = localStorage.getItem('user');
                  if (userStr) {
                    try {
                      const user = JSON.parse(userStr);
                      const username = user.username;
                      if (username) {
                        window.location.href = `/vendor/public/${username}`;
                      }
                    } catch (_) {
                      // Fallback if parsing fails
                    }
                  }
                }}
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 text-gray-400 group-hover:text-theme-cyan transition-colors" />
                <span className="hidden sm:inline">Preview Store</span>
                <span className="sm:hidden">Preview</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 
