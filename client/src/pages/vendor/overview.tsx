import { VendorOverviewCards } from "@/components/vendor/VendorOverviewCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, TrendingUp, Package, Star, Lock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { orderService } from "@/services/orderService";
import { messagingService } from "@/services/messagingService";
import { realtimeService } from "@/services/realtimeService";
import { useToast } from "@/hooks/use-toast";

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

const topProducts = [
  {
    id: 1,
    name: "Netflix Premium Account (1 Year)",
    sales: 45,
    revenue: "0.54 BTC",
    status: "Active",
    stock: 23
  },
  {
    id: 2,
    name: "Spotify Premium (6 Months)",
    sales: 32,
    revenue: "0.26 BTC",
    status: "Active",
    stock: 18
  },
  {
    id: 3,
    name: "Adobe Creative Cloud (1 Year)",
    sales: 15,
    revenue: "0.51 BTC",
    status: "Active",
    stock: 8
  }
];

export default function VendorOverview() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch recent orders
  const fetchRecentOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const ordersData = await orderService.getOrders();
      const ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData as any).results || [];
      
      // Get last 3 orders sorted by creation date
      const sortedOrders = ordersArray
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
    
    // Cleanup on unmount
    return () => {
      realtimeService.unsubscribe('recent_messages_update', handleRecentMessagesUpdate);
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
      <VendorOverviewCards />

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
                <p className="text-center text-gray-400">Loading orders...</p>
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
                          className={getStatusDisplay(order) === "Completed" ? "bg-green-500 text-white" : "bg-pink-600 text-white"}
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
              {topProducts.map((product) => (
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
                    <Badge className="mt-1 bg-pink-600 text-white">
                      {product.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
              <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-pink-600">RECENT MESSAGES</CardTitle>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white text-sm" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMessages.map((message) => (
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
            ))}
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