import { VendorOverviewCards } from "@/components/vendor/VendorOverviewCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, TrendingUp, Package, Star, Lock, CheckCircle, MessageSquare, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { orderService } from "@/services/orderService";
import { messagingService } from "@/services/messagingService";
import { realtimeService } from "@/services/realtimeService";
import disputeService from "@/services/disputeService";
import { useToast } from "@/hooks/use-toast";
import { productService } from "@/services/productService";

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
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingTopProducts, setIsLoadingTopProducts] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState<string>("0.00 BTC");
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [earnings, setEarnings] = useState<number>(0);
  const [disputes, setDisputes] = useState<number>(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch recent orders and calculate metrics
  const fetchRecentOrders = async () => {
    try {
      setIsLoadingOrders(true);
      setIsLoadingCards(true);
      
      let ordersData: any = [];
      try {
        ordersData = await orderService.getVendorOrders();
      } catch (e) {
        // ignore and try fallback
      }
      let ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.results || [];

      // Fallback to generic orders if vendor-specific returns nothing
      if (!ordersArray || ordersArray.length === 0) {
        try {
          const generic = await orderService.getOrders();
          ordersArray = Array.isArray(generic) ? generic : (generic as any)?.results || [];
        } catch (e) {
          // keep empty
        }
      }

      // Calculate metrics from orders
      const allOrders = ordersArray || [];
      const pending = allOrders.filter((o: any) => ['pending', 'pending_payment', 'processing'].includes((o?.order_status || '').toLowerCase())).length;
      setPendingOrdersCount(pending);

      // Calculate total sales and revenue
      let totalRevenueBTC = 0;
      allOrders.forEach((order: any) => {
        const amount = parseFloat(order.total_amount || "0");
        if ((order.crypto_currency || "").toUpperCase() === "BTC" && !isNaN(amount)) {
          totalRevenueBTC += amount;
        }
      });

      setTotalSales(`${totalRevenueBTC.toFixed(4)} BTC`);
      setTotalRevenue(totalRevenueBTC);
      setEarnings(totalRevenueBTC * 0.8); // Assume 80% available for withdrawal
      // Calculate disputes from actual dispute service
      try {
        const disputeStats = await disputeService.getDisputeStatistics();
        if (disputeStats.success && disputeStats.data) {
          setDisputes(disputeStats.data.total_disputes || 0);
        } else {
          setDisputes(allOrders.filter((o: any) => o.order_status === 'disputed').length);
        }
      } catch (error) {
        console.error('Error fetching disputes:', error);
        setDisputes(allOrders.filter((o: any) => o.order_status === 'disputed').length);
      }

      // Get last 3 orders sorted by creation date
      const sortedOrders = allOrders
        .sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      setRecentOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recent orders",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOrders(false);
      setIsLoadingCards(false);
    }
  };

  const fetchActiveListings = async () => {
    try {
      const res = await productService.getVendorProducts();
      const products = (res as any)?.data || [];
      // Match VendorListings logic: active = status === 'approved'
      const active = products.filter((p: any) => p.status === 'approved').length;
      setActiveListingsCount(active);
    } catch (e) {
      console.error('Error fetching vendor products:', e);
      setActiveListingsCount(0);
    }
  };

  // Fetch top performing products
  const fetchTopProducts = async () => {
    try {
      setIsLoadingTopProducts(true);
      const res = await productService.getVendorProducts();
      const products = (res as any)?.data || [];
      
      // Sort by review count or sales and take top 5
      const topProductsList = products
        .sort((a: any, b: any) => (b.review_count || 0) - (a.review_count || 0))
        .slice(0, 5)
        .map((product: any) => ({
          id: product.id,
          name: product.headline || product.listing_title || "Product",
          sales: product.review_count || 0,
          revenue: `${Number(product.price || 0).toFixed(4)} BTC`,
          status: product.status === 'approved' ? 'Active' : 'Inactive',
          stock: product.quantity_available || 0
        }));
      
      setTopProducts(topProductsList);
    } catch (e) {
      console.error('Error fetching top products:', e);
      setTopProducts([]);
    } finally {
      setIsLoadingTopProducts(false);
    }
  };

  // Fetch recent messages
  const fetchRecentMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const messages = await messagingService.getRecentMessages();
      setRecentMessages(messages);
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      toast({
        title: "Error",
        description: "Failed to load recent messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchRecentOrders();
    fetchActiveListings();
    fetchTopProducts();
    fetchRecentMessages();
    
    // Connect to real-time service
    realtimeService.connect();
    
    // Subscribe to real-time updates
    const handleRecentMessagesUpdate = (data: any) => {
      console.log('📋 Received recent messages update:', data);
      setRecentMessages(data);
    };
    
    console.log('🔌 Subscribing to recent messages updates...');
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
      realtimeService.disconnect();
    };
  }, []);

  // Navigation handlers
  const handleViewAllOrders = () => {
    navigate('/vendor/orders');
  };

  const handleAddNewProduct = () => {
    navigate('/vendor/listings/add');
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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-8 relative z-10">
      {/* AC Logo and Branding Section */}
      <div className="flex flex-col items-center justify-center py-6">
        {/* AC Logo Monogram */}
        <div className="mb-4">
          <img 
            src="/images/ac-logo-monogram.png" 
            alt="AC Logo Monogram" 
            className="w-48 h-48 object-contain"
          />
        </div>
        
        {/* THE ONE AND ONLY Text */}
        <div className="mb-0">
          <img 
            src="/images/the-one-and-only.png" 
            alt="THE ONE AND ONLY" 
            className="h-12 object-contain"
          />
        </div>
      </div>

      {/* ADD LISTING Button - Left Positioned */}
      <div className="flex justify-start mb-8">
        <Button 
          className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 text-lg font-semibold"
          onClick={handleAddNewProduct}
        >
          <Plus className="w-5 h-5 mr-2" />
          ADD LISTING
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
      />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
              <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-pink-600">RECENT ORDERS</CardTitle>
              <Button 
                className="bg-pink-600 hover:bg-pink-700 text-white text-sm"
                size="sm"
                onClick={handleViewAllOrders}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingOrders ? (
                // Skeleton loader for orders
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-4 bg-gray-800 rounded-lg animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 bg-gray-700 rounded w-32"></div>
                      <div className="h-4 bg-gray-700 rounded w-20"></div>
                    </div>
                    <div className="h-3 bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-gray-700 rounded w-24"></div>
                      <div className="h-4 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                ))
              ) : recentOrders.length === 0 ? (
                <p className="text-center text-gray-400">No recent orders found.</p>
              ) : (
                recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white">{order.order_id}</h4>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-1">{formatDate(order.created_at)}</div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge 
                          className={
                            getStatusDisplay(order) === "Completed" 
                              ? "bg-emerald-500 text-white border-emerald-400" 
                              : getStatusDisplay(order) === "Processing"
                              ? "bg-blue-500 text-white border-blue-400"
                              : getStatusDisplay(order) === "Pending"
                              ? "bg-amber-500 text-white border-amber-400"
                              : "bg-pink-500 text-white border-pink-400"
                          }
                        >
                          {getStatusDisplay(order)}
                        </Badge>
                        {order.use_escrow && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">{order.product.headline}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">by {order.buyer.username}</span>
                        <span className="font-semibold text-pink-600">{order.total_amount} {order.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
              <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-pink-600">TOP PRODUCTS</CardTitle>
              <Button className="bg-pink-600 hover:bg-pink-700 text-white text-sm" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingTopProducts ? (
                // Skeleton loader for top products
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4 bg-gray-800 rounded-lg animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700 rounded w-48 mb-2"></div>
                        <div className="flex items-center space-x-4">
                          <div className="h-3 bg-gray-700 rounded w-16"></div>
                          <div className="h-3 bg-gray-700 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-gray-700 rounded w-16 mb-1"></div>
                        <div className="h-5 bg-gray-700 rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : topProducts.length === 0 ? (
                <p className="text-center text-gray-400">No products found.</p>
              ) : (
                topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{product.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-300">
                        <span>{product.sales} sales</span>
                        <span>Stock: {product.stock}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-pink-600">{product.revenue}</div>
                      <Badge className={`mt-1 ${product.status === 'Active' ? 'bg-pink-600' : 'bg-gray-600'} text-white`}>
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
              <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-pink-600">RECENT MESSAGES</CardTitle>
            <Button 
            variant="outline" 
            size="sm"
            className="border-pink-600 text-pink-400 hover:bg-pink-600 hover:text-white transition-colors"
            onClick={() => navigate('/vendor/messages')}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            View All Messages
          </Button>
        </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingMessages ? (
              // Skeleton loader for messages
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-4 bg-gray-800 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                        <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
                      </div>
                      <div className="h-3 bg-gray-700 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-48"></div>
                    </div>
                    <div className="h-3 bg-gray-700 rounded w-12"></div>
                  </div>
                </div>
              ))
            ) : recentMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-base font-medium text-white mb-1">No Recent Messages</h3>
                <p className="text-gray-400 mb-3 text-sm">You haven't received any messages from buyers yet.</p>
                {/* <Button 
                  variant="outline" 
                  size="sm"
                  className="border-pink-600 text-pink-400 hover:bg-pink-600 hover:text-white transition-colors"
                  onClick={() => navigate('/vendor/messages')}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  View All Messages
                </Button> */}
              </div>
            ) : (
              recentMessages.map((message) => (
                <div key={message.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {message.buyer.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-white">{message.buyer}</h4>
                        {message.unread && (
                          <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{message.product}</p>
                      <p className="text-sm text-gray-400 truncate">{message.lastMessage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">{message.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
              <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-pink-600">QUICK ACTIONS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white h-16">
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </Button>
            <Button className="bg-gray-800 hover:bg-gray-600 text-white h-16">
              <TrendingUp className="w-5 h-5 mr-2" />
              View Analytics
            </Button>
            <Button className="bg-gray-800 hover:bg-gray-600 text-white h-16">
              <Star className="w-5 h-5 mr-2" />
              Check Reviews
            </Button>
            <Button className="bg-gray-800 hover:bg-gray-600 text-white h-16">
              <Eye className="w-5 h-5 mr-2" />
              Preview Store
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 