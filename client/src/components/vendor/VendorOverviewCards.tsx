import { TrendingUp, Package, ShoppingCart, Wallet, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const overviewData = [
  {
    title: "Total Sales",
    value: "2.45 BTC",
    change: "+12.3%",
    changeType: "positive" as const,
    icon: TrendingUp,
    description: "≈ $98,420 USD"
  },
  {
    title: "Active Listings",
    value: "24",
    change: "+2 this week",
    changeType: "positive" as const,
    icon: Package,
    description: "12 featured listings"
  },
  {
    title: "Pending Orders",
    value: "8",
    change: "-3 from yesterday",
    changeType: "negative" as const,
    icon: ShoppingCart,
    description: "5 require attention"
  },
  {
    title: "Earnings",
    value: "0.89 BTC",
    change: "+0.12 BTC",
    changeType: "positive" as const,
    icon: Wallet,
    description: "Available for withdrawal"
  },
  {
    title: "Disputes",
    value: "1",
    change: "No change",
    changeType: "neutral" as const,
    icon: AlertTriangle,
    description: "1 active case"
  }
];

export function VendorOverviewCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {overviewData.map((item, index) => {
        const Icon = item.icon;
        
        return (
          <Card key={index} className="border border-gray-200 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {item.title}
              </CardTitle>
              <Icon className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="flex items-center mt-1">
                <span className={`text-sm ${
                  item.changeType === 'positive' 
                    ? 'text-green-600' 
                    : item.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-500'
                }`}>
                  {item.change}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}