import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreVertical, Eye, MessageSquare, Package, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const orders = [
  {
    id: "ORD-VN-4521",
    buyer: "crypto_buyer_01",
    product: "Netflix Premium Account (1 Year)",
    amount: "0.0012 BTC",
    usdAmount: "$48.50",
    status: "Processing",
    priority: "normal",
    date: "2024-01-15",
    time: "10:30 AM",
    paymentMethod: "BTC",
    escrow: true
  },
  {
    id: "ORD-VN-4520",
    buyer: "anonymous_buyer",
    product: "Spotify Premium (6 Months)",
    amount: "0.0008 BTC",
    usdAmount: "$32.40",
    status: "Completed",
    priority: "normal",
    date: "2024-01-14",
    time: "02:15 PM",
    paymentMethod: "XMR",
    escrow: false
  },
  {
    id: "ORD-VN-4519",
    buyer: "crypto_buyer_02",
    product: "Disney+ Account (1 Year)",
    amount: "0.0010 BTC",
    usdAmount: "$40.50",
    status: "Shipped",
    priority: "urgent",
    date: "2024-01-14",
    time: "09:20 AM",
    paymentMethod: "BTC",
    escrow: true
  },
  {
    id: "ORD-VN-4518",
    buyer: "crypto_buyer_03",
    product: "Adobe Creative Cloud (1 Year)",
    amount: "0.0034 BTC",
    usdAmount: "$137.60",
    status: "Pending",
    priority: "high",
    date: "2024-01-13",
    time: "04:45 PM",
    paymentMethod: "BTC",
    escrow: true
  },
  {
    id: "ORD-VN-4517",
    buyer: "anonymous_buyer_2",
    product: "VPN Service (1 Year)",
    amount: "0.0015 BTC",
    usdAmount: "$60.75",
    status: "Cancelled",
    priority: "normal",
    date: "2024-01-12",
    time: "11:30 AM",
    paymentMethod: "XMR",
    escrow: false
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "Processing":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Shipped":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "normal":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};

export default function VendorOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Orders & Sales</h1>
            <p className="text-gray-400">Manage your customer orders and track sales</p>
          </div>
          <Button variant="outline">
            Export Orders
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">156</div>
              <p className="text-sm text-gray-400">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">8</div>
              <p className="text-sm text-gray-400">Processing</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">5</div>
              <p className="text-sm text-gray-400">Shipped</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">143</div>
              <p className="text-sm text-gray-400">Completed</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">2.45 BTC</div>
              <p className="text-sm text-gray-400">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search orders, buyers, products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(order.priority)} mb-1`}></div>
                      <span className="text-xs text-gray-400 uppercase">{order.priority}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-white">{order.id}</h3>
                        {order.escrow && (
                          <Badge variant="outline" className="text-xs">
                            Escrow
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {order.paymentMethod}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{order.product}</p>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-400">by {order.buyer}</span>
                        <span className="text-sm text-gray-400">{order.date} at {order.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">{order.amount}</div>
                      <div className="text-sm text-gray-400">{order.usdAmount}</div>
                    </div>

                    <Badge className={`border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </Badge>

                    <div className="flex items-center space-x-2">
                      {order.status === "Processing" && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message Buyer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Package className="w-4 h-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                          {order.status === "Processing" && (
                            <>
                              <DropdownMenuItem className="text-green-600">
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Shipped
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <X className="w-4 h-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Package className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
                <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    
  );
}