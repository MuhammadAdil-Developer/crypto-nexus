import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Bitcoin, Wallet, Lock, CheckCircle, Bell, X, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV_ITEMS, SAMPLE_ACTIVITY } from "@/lib/constants";
import { authService } from "@/services/authService";
import { orderService, Order } from "@/services/orderService";
import { Link, useNavigate } from "react-router-dom";
import { useMessaging } from "@/contexts/MessagingContext";
import { getApiUrl } from "@/config/api";
import paymentService from "@/services/paymentService";
import { CRYPTO_PRICES, refreshCryptoPrices } from "@/lib/priceUtils";

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="w-16 h-6 bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

// API Integration Types
interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone?: string | null;
  profile_picture?: string | null;
  is_verified: boolean;
  date_joined: string;
}

interface VendorApplication {
  id: number;
  business_name: string;
  vendor_username: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Product {
  id: number;
  headline: string;
  status: string;
  created_at: string;
  vendor_username: string;
}

interface DashboardStats {
  statistics: {
    users: { total: number; buyers: number; vendors: number; growth_pct: number };
    vendors: { total: number; growth_pct: number };
    listings: { total: number; growth_pct: number };
    orders: { today: number; yesterday: number; growth_pct: number };
    total_orders: number;
    paid_orders: number;
    pending_payments: number;
    disputed_orders: number;
  };
  chart_data: Array<{
    date: string;
    orders: number;
    users: number;
    listings: number;
  }>;
  escrow_stats: {
    btc_total: number;
    xmr_total: number;
    pending_releases: number;
    auto_release_orders: number;
    disputed_orders: number;
  };
  recent_orders: UIOrder[];
}

// Transform API order data to match UI structure
interface UIOrder {
  id: string;
  buyer: string;
  vendor: string;
  listing: string;
  amount: string;
  status: string;
  statusType: 'success' | 'warning' | 'danger' | 'accent';
  created: string;
  use_escrow?: boolean;
  order_status?: string;
  confirmed_at?: string;
}

const safeString = (val: any) => (val === null || val === undefined ? '' : String(val));

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} d ago`;
  } catch (e) {
    return 'N/A';
  }
};

const getStatusType = (status: string): 'success' | 'warning' | 'danger' | 'accent' => {
  const s = status.toLowerCase();
  if (s.includes('delivered') || s.includes('confirmed') || s.includes('success') || s.includes('paid')) return 'success';
  if (s.includes('pending') || s.includes('awaiting') || s.includes('processing')) return 'warning';
  if (s.includes('disputed') || s.includes('cancelled') || s.includes('failed') || s.includes('rejected')) return 'danger';
  return 'accent';
};

const transformApiOrderToUIOrder = (apiOrder: any): UIOrder => {
  const buyerName = apiOrder.buyer?.username || 'System';
  const vendorName = apiOrder.vendor?.username || (apiOrder.product?.vendor_username || 'Unknown');
  const productName = apiOrder.product?.headline || 'Unknown Product';
  const totalAmount = apiOrder.total_amount || '0.00';
  const cryptoCurrency = apiOrder.crypto_currency || 'BTC';
  const amountString = `${totalAmount} ${cryptoCurrency}`;

  // Safe status handling
  const orderStatus = safeString(apiOrder.order_status);
  // Backend often sends 'order_status_display' field (human readable), if not, use raw status
  const statusDisplay = (apiOrder as any).order_status_display || orderStatus;

  return {
    id: safeString(apiOrder.order_id || apiOrder.id),
    buyer: buyerName,
    vendor: vendorName,
    listing: productName,
    amount: amountString,
    status: statusDisplay,
    statusType: getStatusType(orderStatus),
    created: formatDate(apiOrder.created_at),
    use_escrow: apiOrder.use_escrow,
    order_status: apiOrder.order_status,
    confirmed_at: apiOrder.confirmed_at || undefined
  };
};

export function Overview() {
  // API Integration State
  const [users, setUsers] = useState<User[]>([]);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<UIOrder[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [cryptoStatus, setCryptoStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<number>(30); // 30 or 90
  const navigate = useNavigate();

  // Real-time notifications from MessagingContext
  const { notifications, unreadCount } = useMessaging();

  // Get latest unread notification for banner
  const latestNotification = notifications.find(n => n.unread && !dismissedNotifications.has(n.id));

  // Rate refresh - Ensure UI uses real-time USD equivalent
  const [prices, setPrices] = useState(CRYPTO_PRICES);

  // API Functions
  const fetchDashboardData = async (isRefreshing = false) => {
    const startTime = performance.now();
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // Parallel fetch main stats and crypto prices
      const parallelStart = performance.now();
      const [statsData, _] = await Promise.all([
        orderService.getAdminDashboard(timeRange, isRefreshing),
        refreshCryptoPrices()
      ]);
      console.log(`[PERF] Dashboard parallel fetch took: ${(performance.now() - parallelStart).toFixed(2)}ms`);
      if (statsData?.execution_time) {
        console.log(`[PERF] Server reported processing time: ${statsData.execution_time}`);
      }

      // Update local price state to trigger re-render
      setPrices({ ...CRYPTO_PRICES });

      if (statsData) {
        // Transform recent orders
        if (statsData.recent_orders) {
          statsData.recent_orders = statsData.recent_orders.map((order: any) => transformApiOrderToUIOrder(order));
          setRecentOrders(statsData.recent_orders);
        }
        setDashboardStats(statsData);
      } else {
        setError('No dashboard data returned');
      }

      // Fetch crypto status independently
      try {
        const nodeStart = performance.now();
        const cryptoData = await paymentService.getAdminCryptoStatus();
        if (cryptoData) {
          setCryptoStatus(cryptoData);
          console.log(`[PERF] Crypto node status took: ${(performance.now() - nodeStart).toFixed(2)}ms`);
        }
      } catch (err) {
        console.error('Error fetching crypto node status:', err);
      }

    } catch (error: any) {
      console.error('Error in dashboard initialization:', error);
      setError('System initialization failed');
    } finally {
      console.log(`[PERF] Total Dashboard load routine took: ${(performance.now() - startTime).toFixed(2)}ms`);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount and when timeRange changes
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Helper function for getAlertMessage 
  const getPendingVendorApplicationsCount = () => {
    // In a full implementation, this should come from the dashboard stats
    return 0; // Placeholder until backend provides this specific count
  };

  // Generate smart alert message based on actual pending items
  const getAlertMessage = () => {
    if (loading) return "Loading...";

    const pendingDisputes = dashboardStats?.escrow_stats.disputed_orders || 0;

    // Fallback logic since we simplified the initial fetch
    // ideally the dashboard endpoint should return these counts
    const alerts = [];

    if (pendingDisputes > 0) {
      alerts.push(`${pendingDisputes} dispute${pendingDisputes > 1 ? 's' : ''} awaiting resolution`);
    }

    // Always show BTC node update requirement
    alerts.push('BTC node requires update');

    return alerts.join(' • ');
  };

  const hasPendingItems = () => {
    if (loading) return false;
    const pendingDisputes = dashboardStats?.escrow_stats.disputed_orders || 0;
    return pendingDisputes > 0;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {/* Real-time Notification Banner */}
      {latestNotification && (
        <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 animate-in slide-in-from-top">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Bell className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-blue-300">{latestNotification.title}</h3>
                <p className="text-sm text-blue-200/80 mt-1 line-clamp-2">{latestNotification.message}</p>
                {latestNotification.actionUrl && (
                  <button
                    onClick={() => {
                      navigate(latestNotification.actionUrl || '/admin');
                      setDismissedNotifications(prev => new Set(prev).add(latestNotification.id));
                    }}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    View Details →
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setDismissedNotifications(prev => new Set(prev).add(latestNotification.id))}
              className="text-blue-400 hover:text-blue-300 flex-shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Alert Banner - Only show if there are pending items */}
      {/* Alert Banner Removed as per user request */}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Users");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium">Total Users</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-text">
                    {loading ? "..." : dashboardStats?.statistics.users.total || 0}
                  </p>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                    {loading ? "" : `(${dashboardStats?.statistics.users.buyers || 0}B / ${dashboardStats?.statistics.users.vendors || 0}V)`}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`flex items-center ${dashboardStats?.statistics.users.growth_pct && dashboardStats.statistics.users.growth_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                {dashboardStats?.statistics.users.growth_pct && dashboardStats.statistics.users.growth_pct >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(dashboardStats?.statistics.users.growth_pct || 0)}%
              </span>
              <span className="ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Vendors");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium">Active Vendors</p>
                <p className="text-2xl font-bold text-text">
                  {loading ? "..." : dashboardStats?.statistics.vendors.total || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`flex items-center ${dashboardStats?.statistics.vendors.growth_pct && dashboardStats.statistics.vendors.growth_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                {dashboardStats?.statistics.vendors.growth_pct && dashboardStats.statistics.vendors.growth_pct >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(dashboardStats?.statistics.vendors.growth_pct || 0)}%
              </span>
              <span className="ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Listings");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium">Live Listings</p>
                <p className="text-2xl font-bold text-text">
                  {loading ? "..." : dashboardStats?.statistics.listings.total || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`flex items-center ${dashboardStats?.statistics.listings.growth_pct && dashboardStats.statistics.listings.growth_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                {dashboardStats?.statistics.listings.growth_pct && dashboardStats.statistics.listings.growth_pct >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(dashboardStats?.statistics.listings.growth_pct || 0)}%
              </span>
              <span className="ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Orders");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium">Orders Today</p>
                <p className="text-2xl font-bold text-text">
                  {loading ? "..." : dashboardStats?.statistics.orders.today || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`flex items-center ${dashboardStats?.statistics.orders.growth_pct && dashboardStats.statistics.orders.growth_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                {dashboardStats?.statistics.orders.growth_pct && dashboardStats.statistics.orders.growth_pct >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(dashboardStats?.statistics.orders.growth_pct || 0)}%
              </span>
              <span className="ml-2">vs yesterday</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Order Volume Chart */}
        <Card className="lg:col-span-2 crypto-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-text">Platform Growth</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTimeRange(7)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === 7 ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-text hover:bg-surface-3'}`}
                >
                  7D
                </button>
                <button
                  onClick={() => setTimeRange(30)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === 30 ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-text hover:bg-surface-3'}`}
                >
                  30D
                </button>
                <button
                  onClick={() => setTimeRange(90)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === 90 ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-text hover:bg-surface-3'}`}
                >
                  90D
                </button>
              </div>
            </div>

            <div className="h-64 bg-surface-2 rounded-xl flex items-center justify-center border border-border relative overflow-hidden">
              {(loading || (!dashboardStats && !error)) ? (
                <div className="absolute inset-0 bg-[#0B0F1A] flex items-center justify-center z-20 transition-opacity duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    alt="Trading chart visualization"
                    className="w-full h-full object-cover opacity-60 mix-blend-screen"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-transparent to-[#0B0F1A]/50"></div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 bg-surface-2 flex flex-col items-center justify-center z-20 p-6 text-center">
                  <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mb-4">
                    <X className="w-6 h-6 text-danger" />
                  </div>
                  <h4 className="text-white font-semibold mb-2">Data Load Failed</h4>
                  <p className="text-gray-400 text-sm max-w-[250px]">{error}</p>
                  <button
                    onClick={() => fetchDashboardData()}
                    className="mt-4 text-xs text-accent hover:underline flex items-center"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardStats?.chart_data || []}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#00E5FF"
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="New Users"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="listings"
                    name="New Listings"
                    stroke="#8B5CF6"
                    fillOpacity={1}
                    fill="url(#colorListings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">Loading recent activity...</p>
                </div>
              ) : recentOrders.length > 0 ? (
                recentOrders.slice(0, 5).map((order, index) => (
                  <div key={order.id} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${order.statusType === "success" ? "bg-success" :
                      order.statusType === "warning" ? "bg-warning" :
                        order.statusType === "accent" ? "bg-accent" :
                          order.statusType === "danger" ? "bg-danger" :
                            "bg-muted"
                      }`} />
                    <div className="flex-1">
                      <p className="text-sm text-text">
                        {order.status === 'completed' ? 'Order completed' :
                          order.status === 'paid' ? 'Payment received' :
                            order.status === 'pending' ? 'New order placed' :
                              order.status === 'cancelled' ? 'Order cancelled' :
                                order.status === 'disputed' ? 'Dispute opened' :
                                  'Order updated'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.listing} • {order.amount} • {order.created}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Node Status and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Crypto Node Status */}
        <Card className="crypto-card">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-text mb-3">Crypto Nodes</h3>

            {loading && (!cryptoStatus || !cryptoStatus.nodes) ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-700 rounded w-20"></div>
                        <div className="h-2 bg-gray-700 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="w-16 h-6 bg-gray-700 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : cryptoStatus?.nodes && cryptoStatus.nodes.length > 0 ? (
              cryptoStatus.nodes.map((node: any) => (
                <div key={node.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg mb-3 last:mb-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${node.symbol === 'BTC' ? 'bg-warning/20' : 'bg-accent/20'} rounded-lg flex items-center justify-center`}>
                      {node.symbol === 'BTC' ? (
                        <Bitcoin className="text-warning w-4 h-4" />
                      ) : (
                        <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text text-sm">{node.name}</p>
                      <p className="text-xs text-gray-400">
                        Block #{node.blockHeight} • {node.lastSync}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={node.status} type={node.statusType === 'success' ? 'success' : 'warning'} />
                </div>
              ))
            ) : (
              <div className="text-center py-4 bg-surface-2 rounded-lg">
                <p className="text-xs text-gray-500">Node data unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escrow Overview */}
        <Card className="crypto-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-text">Escrow Overview</h3>
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing || loading}
                className={`p-1.5 hover:bg-surface-2 rounded-full transition-all duration-200 ${refreshing ? 'animate-spin text-accent' : 'text-gray-400'}`}
                title="Refresh escrow data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`text-center p-3 bg-surface-2 rounded-lg transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
                <p className="text-xl font-bold text-text font-mono">
                  {loading ? "..." : dashboardStats?.escrow_stats.btc_total.toFixed(5) || "0.00000"}
                </p>
                <p className="text-xs">BTC in Escrow</p>
                <p className="text-xs mt-1 text-gray-400">
                  ~${((dashboardStats?.escrow_stats.btc_total || 0) * prices.BTC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`text-center p-3 bg-surface-2 rounded-lg transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
                <p className="text-xl font-bold text-text font-mono">
                  {loading ? "..." : dashboardStats?.escrow_stats.xmr_total.toFixed(3) || "0.000"}
                </p>
                <p className="text-xs">XMR in Escrow</p>
                <p className="text-xs mt-1 text-gray-400">
                  ~${((dashboardStats?.escrow_stats.xmr_total || 0) * prices.XMR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className={`mt-3 space-y-1 transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Pending Releases</span>
                <span className="text-text">{dashboardStats?.escrow_stats.pending_releases || 0} orders</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Auto-Release (48h)</span>
                <span className="text-text">{dashboardStats?.escrow_stats.auto_release_orders || 0} orders</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Disputed</span>
                <span className="text-danger font-medium">{dashboardStats?.escrow_stats.disputed_orders || 0} orders</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Alerts */}
        <Card className="crypto-card">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-text mb-3 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-yellow-400" />
              Escrow Alerts
            </h3>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400">Loading escrow alerts...</p>
                </div>
              ) : recentOrders.filter(order => order.use_escrow).slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-yellow-400" />
                  <div className="flex-1">
                    <p className="text-xs text-text">
                      Escrow Order: {order.listing}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.order_status === 'paid' && !order.confirmed_at
                        ? 'Awaiting buyer approval'
                        : order.confirmed_at
                          ? 'Approved by buyer'
                          : 'Payment pending'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {order.created}
                  </div>
                </div>
              ))}
              {recentOrders.filter(order => order.use_escrow).length === 0 && !loading && (
                <div className="text-center py-2">
                  <Lock className="w-6 h-6 mx-auto text-gray-500 mb-1" />
                  <p className="text-xs text-gray-400">No escrow orders at the moment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="crypto-card">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Recent Orders</h3>
            <Link
              to="/admin/orders"
              className="text-sm text-accent hover:text-accent-2 transition-colors duration-200"
            >
              View all orders →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Listing</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-700 rounded w-16"></div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-2">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-accent">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">{order.buyer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">{order.vendor}</td>
                    <td className="px-6 py-4 text-sm text-text">{order.listing}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text font-mono">{order.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={order.status} type={order.statusType} />
                        {order.use_escrow && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black text-[10px] px-1 py-0 h-4">
                              <Lock className="w-2 h-2 mr-0.5" />
                              ESCROW
                            </Badge>
                            {order.order_status === 'paid' && !order.confirmed_at && (
                              <Badge className="bg-orange-500/20 text-orange-300 text-[10px] px-1 py-0 h-4 whitespace-nowrap">
                                Awaiting
                              </Badge>
                            )}
                            {order.confirmed_at && (
                              <Badge className="bg-green-500/20 text-green-300 text-[10px] px-1 py-0 h-4">
                                <CheckCircle className="w-2 h-2 mr-0.5" />
                                Approved
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{order.created}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted">
                    No recent orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
