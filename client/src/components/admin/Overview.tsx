import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Bitcoin, Wallet, Lock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV_ITEMS, SAMPLE_ACTIVITY } from "@/lib/constants";
import { authService } from "@/services/authService";
import { orderService, Order } from "@/services/orderService";
import { Link } from "react-router-dom";

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

const transformApiOrderToUIOrder = (apiOrder: Order): UIOrder => {
  // Determine status badge type based on order status
  const getStatusType = (status: string): 'success' | 'warning' | 'danger' | 'accent' => {
    if (typeof status !== 'string') return 'warning';
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
      case 'paid':
        return 'success';
      case 'pending_payment':
      case 'pending':
        return 'warning';
      case 'cancelled':
      case 'disputed':
      case 'failed':
        return 'danger';
      case 'delivered':
      case 'processing':
        return 'accent';
      default:
        return 'warning';
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string): string => {
    try {
      if (!dateString || typeof dateString !== 'string') return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Safe string conversion helper
  const safeString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (value && typeof value === 'object') {
      // If it's an object, try to get a meaningful string representation
      if (value.username) return value.username;
      if (value.email) return value.email;
      if (value.first_name) return value.first_name;
      if (value.headline) return value.headline;
      if (value.listing_title) return value.listing_title;
      if (value.name) return value.name;
      return 'Unknown';
    }
    return 'Unknown';
  };

  // Extract display names safely with robust error handling
  const buyerName = safeString(apiOrder.buyer);
  const vendorName = safeString(apiOrder.vendor);
  const productName = safeString(apiOrder.product);

  // Safe amount formatting
  const totalAmount = typeof apiOrder.total_amount === 'number' ? apiOrder.total_amount : 
                     typeof apiOrder.total_amount === 'string' ? parseFloat(apiOrder.total_amount) || 0 : 0;
  const cryptoCurrency = typeof apiOrder.crypto_currency === 'string' ? apiOrder.crypto_currency : 'BTC';
  const amountString = `${totalAmount} ${cryptoCurrency}`;

  // Safe status handling
  const orderStatus = safeString(apiOrder.order_status);
  const statusDisplay = safeString(apiOrder.order_status_display) || orderStatus;

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
    confirmed_at: apiOrder.confirmed_at
  };
};

export function Overview() {
  // API Integration State
  const [users, setUsers] = useState<User[]>([]);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>([]);
  const [recentOrders, setRecentOrders] = useState<UIOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // API Functions
  const fetchUsers = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }
      
      const response = await fetch('http://localhost:8000/api/v1/users/', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.users) {
          setUsers(data.data.users);
        }
      }
    } catch (error) {
      console.error('💥 Error fetching users:', error);
    }
  };

  const fetchVendorApplications = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }
      
      const response = await fetch('http://localhost:8000/api/v1/applications/', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          setVendorApplications(data.results);
        }
      }
    } catch (error) {
      console.error('💥 Error fetching vendor applications:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      console.log('🔄 Fetching recent orders from admin dashboard...');
      const dashboardData = await orderService.getAdminDashboard();
      
      if (dashboardData.recent_orders && Array.isArray(dashboardData.recent_orders)) {
        // Get only the last 4 orders and transform them
        const last4Orders = dashboardData.recent_orders.slice(0, 4);
        console.log('🔍 Raw orders data:', last4Orders);
        
        const transformedOrders = last4Orders.map((order, index) => {
          try {
            console.log(`🔄 Transforming order ${index}:`, order);
            const transformed = transformApiOrderToUIOrder(order);
            console.log(`✅ Transformed order ${index}:`, transformed);
            return transformed;
          } catch (error) {
            console.error(`❌ Error transforming order ${index}:`, error, order);
            // Return a safe fallback order
            return {
              id: `error-${index}`,
              buyer: 'Unknown',
              vendor: 'Unknown',
              listing: 'Unknown Product',
              amount: '0 BTC',
              status: 'Unknown',
              statusType: 'warning' as const,
              created: 'N/A'
            };
          }
        });
        
        setRecentOrders(transformedOrders);
        console.log('✅ Successfully fetched and transformed recent orders:', transformedOrders);
      } else {
        console.warn('⚠️ No recent orders found in dashboard data');
        setRecentOrders([]);
      }
    } catch (error) {
      console.error('💥 Error fetching recent orders:', error);
      // Keep the component working even if API fails
      setRecentOrders([]);
    }
  };

  // Get counts from API data
  const getTotalUsersCount = () => {
    return users.length;
  };

  const getActiveVendorsCount = () => {
    return vendorApplications.filter(app => app.status === 'approved').length;
  };

  const getPendingVendorApplicationsCount = () => {
    return vendorApplications.filter(app => app.status === 'pending').length;
  };

  // Fetch data on component mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchUsers(), 
      fetchVendorApplications(),
      fetchRecentOrders()
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {/* Alert Banner */}
      <div className="mb-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-warning">Action Required</h3>
            <div className="mt-2 text-sm text-warning/80">
              <p>
                {loading ? "..." : getPendingVendorApplicationsCount()} vendor applications pending review • 3 disputes awaiting resolution • BTC node requires update
              </p>
            </div>
          </div>
        </div>
      </div>
      
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
                <p className="text-2xl font-bold text-text">
                  {loading ? "..." : getTotalUsersCount()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                12%
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
                  {loading ? "..." : getActiveVendorsCount()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                8%
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
                <p className="text-2xl font-bold text-text">1,432</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                24%
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
                <p className="text-2xl font-bold text-text">89</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-danger flex items-center">
                <TrendingDown className="w-3 h-3 mr-1" />
                3%
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Order Volume</h3>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-accent/20 text-accent rounded-md">7D</button>
                <button className="px-3 py-1 text-sm hover:bg-surface-2 rounded-md">30D</button>
                <button className="px-3 py-1 text-sm hover:bg-surface-2 rounded-md">90D</button>
              </div>
            </div>
            
            <div className="h-64 bg-surface-2 rounded-xl flex items-center justify-center border border-border relative overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                alt="Trading chart visualization" 
                className="w-full h-full object-cover rounded-xl opacity-60" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center bg-surface/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                  </svg>
                  <span>Chart: Order volume trends</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {SAMPLE_ACTIVITY.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === "success" ? "bg-success" :
                    activity.type === "warning" ? "bg-warning" :
                    activity.type === "accent" ? "bg-accent" :
                    activity.type === "danger" ? "bg-danger" :
                    "bg-muted"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-text">{activity.title}</p>
                    <p className="text-xs">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Escrow Notifications */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-yellow-400" />
              Escrow Alerts
            </h3>
            <div className="space-y-4">
              {recentOrders.filter(order => order.use_escrow).slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-yellow-400" />
                  <div className="flex-1">
                    <p className="text-sm text-text">
                      Escrow Order: {order.product?.headline || 'Unknown Product'}
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
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {recentOrders.filter(order => order.use_escrow).length === 0 && (
                <div className="text-center py-4">
                  <Lock className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                  <p className="text-sm text-gray-400">No escrow orders at the moment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Node Status and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Crypto Node Status */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Crypto Nodes</h3>
            
            {/* BTC Node */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                  <Bitcoin className="text-warning w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-text">Bitcoin Node</p>
                  <p className="text-sm">Block #820,847 • Synced 2 min ago</p>
                </div>
              </div>
              <StatusBadge status="Connected" type="success" />
            </div>
            
            {/* XMR Node */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Monero Node</p>
                  <p className="text-sm">Block #3,021,456 • Synced 1 min ago</p>
                </div>
              </div>
              <StatusBadge status="Connected" type="success" />
            </div>
          </CardContent>
        </Card>
        
        {/* Escrow Status */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Escrow Overview</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-surface-2 rounded-xl">
                <p className="text-2xl font-bold text-text font-mono">12.847</p>
                <p className="text-sm">BTC in Escrow</p>
                <p className="text-xs mt-1">~$525,847</p>
              </div>
              <div className="text-center p-4 bg-surface-2 rounded-xl">
                <p className="text-2xl font-bold text-text font-mono">847.23</p>
                <p className="text-sm">XMR in Escrow</p>
                <p className="text-xs mt-1">~$145,623</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="">Pending Releases</span>
                <span className="text-text">23 orders</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="">Auto-Release (48h)</span>
                <span className="text-text">156 orders</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="">Disputed</span>
                <span className="text-danger">3 orders</span>
              </div>
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
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted">
                    Loading recent orders...
                  </td>
                </tr>
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
