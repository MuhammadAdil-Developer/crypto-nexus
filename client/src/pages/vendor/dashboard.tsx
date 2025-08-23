import { VendorLayout } from "@/components/vendor/VendorLayout";
import { VendorOverviewCards } from "@/components/vendor/VendorOverviewCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, TrendingUp, Package, Star } from "lucide-react";

const recentOrders = [
  {
    id: "ORD-VN-4521",
    buyer: "crypto_buyer_01",
    product: "Netflix Premium Account (1 Year)",
    amount: "0.0012 BTC",
    status: "Processing",
    date: "2024-01-15"
  },
  {
    id: "ORD-VN-4520",
    buyer: "anonymous_buyer",
    product: "Spotify Premium (6 Months)",
    amount: "0.0008 BTC",
    status: "Completed",
    date: "2024-01-14"
  },
  {
    id: "ORD-VN-4519",
    buyer: "crypto_buyer_02",
    product: "Disney+ Account (1 Year)",
    amount: "0.0010 BTC",
    status: "Shipped",
    date: "2024-01-14"
  }
];

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

const recentMessages = [
  {
    id: 1,
    buyer: "crypto_buyer_01",
    product: "Netflix Premium Account",
    lastMessage: "Hello, when will the account be ready?",
    time: "2 min ago",
    unread: true
  },
  {
    id: 2,
    buyer: "anonymous_buyer",
    product: "Spotify Premium",
    lastMessage: "Thanks for the quick delivery!",
    time: "1 hour ago",
    unread: false
  }
];

export default function VendorDashboard() {
  return (
    <VendorLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome back, CryptoAccountsPlus!</h1>
          <p className="text-blue-100">Here's what's happening with your store today</p>
          <div className="mt-4 flex space-x-4">
            <Button variant="secondary" className="bg-gray-800 text-white hover:bg-gray-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <VendorOverviewCards />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white">Recent Orders</CardTitle>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white">{order.id}</h4>
                        <Badge 
                          variant={order.status === "Completed" ? "default" : "secondary"}
                          className={order.status === "Completed" ? "bg-green-100 text-green-800" : ""}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">{order.product}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">by {order.buyer}</span>
                        <span className="font-semibold text-blue-400">{order.amount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white">Top Products</CardTitle>
                <Button variant="outline" size="sm">
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
                      <div className="font-semibold text-blue-400">{product.revenue}</div>
                      <Badge variant="outline" className="mt-1">
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
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white">Recent Messages</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.map((message) => (
                <div key={message.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {message.buyer.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-white">{message.buyer}</h4>
                        {message.unread && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white h-16">
                <Plus className="w-5 h-5 mr-2" />
                Add Product
              </Button>
              <Button variant="outline" className="h-16">
                <TrendingUp className="w-5 h-5 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" className="h-16">
                <Star className="w-5 h-5 mr-2" />
                Check Reviews
              </Button>
              <Button variant="outline" className="h-16">
                <Eye className="w-5 h-5 mr-2" />
                Preview Store
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}