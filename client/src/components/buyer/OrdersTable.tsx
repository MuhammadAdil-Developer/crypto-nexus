import { MoreVertical, Package, Truck, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const orders = [
  {
    id: "ORD-2847",
    product: "Netflix Premium Account (1 Year)",
    vendor: "CryptoAccountsPlus",
    price: "0.0012 BTC",
    date: "2024-01-15",
    status: "Delivered",
    statusType: "success" as const
  },
  {
    id: "ORD-2846",
    product: "Spotify Premium (6 Months)",
    vendor: "DigitalVault", 
    price: "0.0008 BTC",
    date: "2024-01-14",
    status: "In Transit",
    statusType: "warning" as const
  },
  {
    id: "ORD-2845",
    product: "Adobe Creative Cloud (1 Year)",
    vendor: "PremiumSoft",
    price: "0.0034 BTC", 
    date: "2024-01-12",
    status: "Processing",
    statusType: "accent" as const
  },
  {
    id: "ORD-2844",
    product: "YouTube Premium (3 Months)",
    vendor: "StreamingAccounts",
    price: "0.0006 BTC",
    date: "2024-01-10",
    status: "Cancelled",
    statusType: "danger" as const
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle className="w-4 h-4" />;
    case "In Transit":
      return <Truck className="w-4 h-4" />;
    case "Processing":
      return <Clock className="w-4 h-4" />;
    case "Cancelled":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (statusType: string) => {
  switch (statusType) {
    case "success":
      return "text-green-400 bg-green-900/20";
    case "warning":
      return "text-yellow-400 bg-yellow-900/20";
    case "accent":
      return "text-blue-400 bg-blue-900/20";
    case "danger":
      return "text-red-400 bg-red-900/20";
    default:
      return "text-gray-400 bg-gray-900/20";
  }
};

interface OrdersTableProps {
  compact?: boolean;
}

export function OrdersTable({ compact = false }: OrdersTableProps) {
  const displayOrders = compact ? orders.slice(0, 3) : orders;

  return (
    <Card className="border border-gray-700 bg-gray-900">
      {!compact && (
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">
            Your Orders
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-0" : ""}>
        <div className="space-y-4">
          {displayOrders.map((order) => (
            <div 
              key={order.id}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors duration-200"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(order.statusType)}`}>
                  {getStatusIcon(order.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">
                    {order.product}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {order.vendor} • {order.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {order.price}
                  </p>
                  <Badge 
                    className={`text-xs ${getStatusColor(order.statusType)}`}
                    variant="secondary"
                  >
                    {order.status}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Track Order</DropdownMenuItem>
                    {order.status === "Delivered" && (
                      <DropdownMenuItem>Leave Review</DropdownMenuItem>
                    )}
                    {order.status === "Processing" && (
                      <DropdownMenuItem className="text-red-600">Cancel Order</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}