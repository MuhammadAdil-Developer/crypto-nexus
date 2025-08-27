import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Eye, Download } from "lucide-react";

// Mock data for charts
const salesData = [
  { month: "Jan", btc: 0.45, xmr: 0.23, usd: 18400 },
  { month: "Feb", btc: 0.52, xmr: 0.31, usd: 21200 },
  { month: "Mar", btc: 0.38, xmr: 0.28, usd: 17800 },
  { month: "Apr", btc: 0.61, xmr: 0.35, usd: 24500 },
  { month: "May", btc: 0.73, xmr: 0.42, usd: 29600 },
  { month: "Jun", btc: 0.68, xmr: 0.39, usd: 27400 },
];

const topProducts = [
  { name: "Netflix Premium", sales: 45, revenue: "0.54 BTC", growth: 12.5 },
  { name: "Spotify Premium", sales: 32, revenue: "0.26 BTC", growth: 8.3 },
  { name: "Adobe Creative Cloud", sales: 15, revenue: "0.51 BTC", growth: -5.2 },
  { name: "Disney+ Account", sales: 28, revenue: "0.28 BTC", growth: 15.7 },
  { name: "VPN Service", sales: 22, revenue: "0.33 BTC", growth: 22.1 },
];

const revenueBreakdown = [
  { source: "BTC", amount: "1.85 BTC", percentage: 68.5, color: "bg-orange-500" },
  { source: "XMR", amount: "0.85 XMR", percentage: 31.5, color: "bg-gray-600" },
];

export default function VendorAnalytics() {
  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
            <p className="text-gray-400">Track your performance and revenue insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select defaultValue="30days">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">2.45 BTC</p>
                  <p className="text-sm text-gray-400">≈ $98,420 USD</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12.5% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold text-white">142</p>
                  <p className="text-sm text-gray-400">Orders completed</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8.3% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Unique Buyers</p>
                  <p className="text-2xl font-bold text-white">89</p>
                  <p className="text-sm text-gray-400">Active customers</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">-2.1% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Store Views</p>
                  <p className="text-2xl font-bold text-white">1,247</p>
                  <p className="text-sm text-gray-400">Profile visits</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Eye className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+18.7% from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sales Chart */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-end justify-between space-x-2">
                {salesData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                    <div className="bg-gray-700 w-full rounded-lg overflow-hidden h-64 flex flex-col justify-end">
                      <div 
                        className="bg-blue-500 transition-all duration-500 ease-out"
                        style={{ height: `${(data.btc / 0.8) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{data.month}</span>
                    <span className="text-xs text-gray-400">{data.btc} BTC</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                <span>Revenue trend showing steady growth</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                    <span>BTC Revenue</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {revenueBreakdown.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{item.source}</span>
                      <span className="font-semibold text-white">{item.amount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`${item.color} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-400">{item.percentage}% of total revenue</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-700 bg-gray-900">
                <h4 className="font-semibold text-white mb-4">Payment Method Performance</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Average Order Value (BTC)</span>
                    <span className="font-medium">0.0142 BTC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Average Order Value (XMR)</span>
                    <span className="font-medium">0.0098 XMR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Most Popular Payment</span>
                    <span className="font-medium">Bitcoin (68.5%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <p className="text-sm text-gray-400">{product.sales} sales</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">{product.revenue}</div>
                      <div className="text-sm text-gray-400">Revenue</div>
                    </div>
                    
                    <div className="flex items-center">
                      {product.growth > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${product.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.growth > 0 ? '+' : ''}{product.growth}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    
  );
}