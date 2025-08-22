import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye, RefreshCw, DollarSign, Package, AlertTriangle } from "lucide-react";
import { SAMPLE_ORDERS } from "@/lib/constants";

export default function AdminOrders() {

  const extendedOrders = [
    ...SAMPLE_ORDERS,
    {
      id: "ORD-2848",
      buyer: "digital_user_94",
      vendor: "StreamingPro",
      listing: "Amazon Prime Video (1 Year)",
      amount: "0.0009 BTC",
      status: "Pending Payment",
      statusType: "warning" as const,
      created: "10 min ago",
      paymentStatus: "Unpaid",
      escrowStatus: "Waiting",
      deliveryStatus: "Pending"
    },
    {
      id: "ORD-2849", 
      buyer: "anonymous_buyer",
      vendor: "TechAccounts",
      listing: "GitHub Pro Account (6 Months)",
      amount: "0.76 XMR",
      status: "Refunded",
      statusType: "muted" as const,
      created: "1 day ago",
      paymentStatus: "Refunded",
      escrowStatus: "Released",
      deliveryStatus: "Cancelled"
    }
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Order Management</h1>
            <p className="text-gray-300 mt-1">Monitor and manage all marketplace orders</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              Export Orders
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-white">12,847</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center mr-4">
                  <Package className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Completed Today</p>
                  <p className="text-2xl font-bold text-white">89</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">In Escrow</p>
                  <p className="text-2xl font-bold text-white">847.2 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Disputed</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search by order ID, buyer, or vendor..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-orders"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="escrow">In Escrow</SelectItem>
                  <SelectItem value="confirming">Confirming</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currency</SelectItem>
                  <SelectItem value="btc">BTC</SelectItem>
                  <SelectItem value="xmr">XMR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-border hover:bg-surface-2">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Order ID</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Buyer</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Payment</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extendedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-2/50" data-testid={`order-row-${order.id}`}>
                      <td className="p-4">
                        <span className="font-mono text-accent">{order.id}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-accent text-sm">{order.buyer[0].toUpperCase()}</span>
                          </div>
                          <span className="text-white">{order.buyer}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{order.vendor}</td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-white truncate">{order.listing}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-white">{order.amount}</div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={order.status} type={order.statusType} />
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={
                            order.status === "Delivered" ? "default" :
                            order.status === "Disputed" ? "destructive" :
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {order.status === "Delivered" ? "Confirmed" :
                           order.status === "Disputed" ? "Hold" :
                           order.status === "In Escrow" ? "Escrowed" :
                           "Pending"}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-300">{order.created}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-order-${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.status === "In Escrow" && (
                            <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`release-escrow-${order.id}`}>
                              Release
                            </Button>
                          )}
                          {order.status === "Disputed" && (
                            <Button variant="ghost" size="sm" className="text-warning hover:text-yellow-400" data-testid={`resolve-dispute-${order.id}`}>
                              Resolve
                            </Button>
                          )}
                          {order.status === "Confirming" && (
                            <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`refund-order-${order.id}`}>
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
  );
}