import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Eye, Download } from "lucide-react";
import vendorService from "@/services/vendorService";
import { orderService } from "@/services/orderService";

function SkeletonBlock({ className = "h-6 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-800 ${className}`} />;
}

export default function VendorAnalytics() {
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalSales: 0,
    uniqueBuyers: 0,
    storeViews: 0,
  });
  const [salesData, setSalesData] = useState<Array<{ month: string; btc: number; xmr: number; usd: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sales: number; revenue: string; growth: number }>>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<Array<{ source: string; amount: string; percentage: number; color: string }>>([]);
  const [paymentPerf, setPaymentPerf] = useState({ avgBtc: 0, avgXmr: 0, popular: { name: "-", percent: 0 } });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      try {
        // Fetch orders - this is the primary data source
        let allOrders: any[] = [];
        try {
          const ordersResponse: any = await orderService.getOrders();
          const normalized = Array.isArray(ordersResponse)
            ? ordersResponse
            : (ordersResponse?.results || ordersResponse?.data || ordersResponse?.orders || []);
          allOrders = Array.isArray(normalized) ? normalized : [];
          console.log("Total orders fetched:", allOrders.length);
          console.log("Sample order:", allOrders[0]);
        } catch (e) {
          console.error("Failed to fetch orders:", e);
          allOrders = [];
        }

        // Also fetch dashboard for store views
        let dashboard: any = null;
        try {
          dashboard = await vendorService.getVendorDashboard();
          console.log("Dashboard data:", dashboard);
        } catch (e) {
          console.log("Dashboard fetch failed");
        }

        // Calculate date range based on selected period
        const now = new Date();
        const from = period === "7days" ? new Date(now.getTime() - 7*24*3600*1000)
                    : period === "30days" ? new Date(now.getTime() - 30*24*3600*1000)
                    : period === "90days" ? new Date(now.getTime() - 90*24*3600*1000)
                    : new Date(now.getTime() - 365*24*3600*1000);
        
        // Filter orders by date range
        const filteredOrders = allOrders.filter((o: any) => {
          if (!o.created_at) return false;
          const orderDate = new Date(o.created_at);
          return orderDate >= from && orderDate <= now;
        });

        console.log(`Filtered orders (${period}):`, filteredOrders.length);

        // Calculate metrics from orders
        const uniqueBuyerIds = new Set<string>();
        let totalRevenueBTC = 0;
        let totalRevenueXMR = 0;

        filteredOrders.forEach((order: any) => {
          // Count unique buyers (support both raw and transformed shapes)
          const buyerId = order?.buyer?.id || order?.buyer_details?.id;
          if (buyerId) {
            uniqueBuyerIds.add(String(buyerId));
          }

          // Calculate revenue
          const amount = parseFloat(order.total_amount || "0");
          const currency = (order.crypto_currency || "").toUpperCase();
          
          if (currency === "BTC" && !isNaN(amount)) {
            totalRevenueBTC += amount;
          } else if (currency === "XMR" && !isNaN(amount)) {
            totalRevenueXMR += amount;
          }
        });

        // Set metrics
        const calculatedMetrics = {
          totalRevenue: totalRevenueBTC, // Primary revenue in BTC
          totalSales: filteredOrders.length,
          uniqueBuyers: uniqueBuyerIds.size,
          storeViews: Number(dashboard?.data?.statistics?.total_views || 0),
        };
        
        setMetrics(calculatedMetrics);
        console.log("Calculated metrics:", calculatedMetrics);

        // Generate monthly sales data (always show 6 months of bars)
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthsToShow = 6;
        const monthBuckets: Array<{ key: string; label: string; btc: number; xmr: number }> = [];
        
        for (let i = monthsToShow - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthBuckets.push({ 
            key, 
            label: monthNames[date.getMonth()], 
            btc: 0,
            xmr: 0
          });
        }
        
        // Fill buckets with order data
        filteredOrders.forEach((order: any) => {
          if (!order.created_at) return;
          
          const orderDate = new Date(order.created_at);
          const orderKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          const bucket = monthBuckets.find(b => b.key === orderKey);
          
          if (bucket) {
            const amount = parseFloat(order.total_amount || "0");
            const currency = (order.crypto_currency || "").toUpperCase();
            
            if (currency === "BTC" && !isNaN(amount)) {
              bucket.btc += amount;
            } else if (currency === "XMR" && !isNaN(amount)) {
              bucket.xmr += amount;
            }
          }
        });
        
        setSalesData(monthBuckets.map(b => ({ 
          month: b.label, 
          btc: b.btc, 
          xmr: b.xmr, 
          usd: 0 
        })));
        console.log("Sales data:", monthBuckets);

        // Calculate top products from orders
        const productMap: Record<string, { name: string; sales: number; revenue: number }> = {};
        
        filteredOrders.forEach((order: any) => {
          const productId = order.product?.id || order.listing?.id;
          const productName = order.product?.headline || 
                            order.product?.listing_title || 
                            order.listing?.headline ||
                            order.listing?.listing_title ||
                            "Unknown Product";
          
          if (!productId) return;
          
          const key = String(productId);
          
          if (!productMap[key]) {
            productMap[key] = { name: productName, sales: 0, revenue: 0 };
          }
          
          productMap[key].sales += 1;
          
          // Add revenue (convert to BTC equivalent for display)
          const amount = parseFloat(order.total_amount || "0");
          const currency = (order.crypto_currency || "").toUpperCase();
          
          if (currency === "BTC" && !isNaN(amount)) {
            productMap[key].revenue += amount;
          }
        });
        
        const topProductsList = Object.values(productMap)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5)
          .map(p => ({
            name: p.name,
            sales: p.sales,
            revenue: `${p.revenue.toFixed(4)} BTC`,
            growth: 0
          }));
        
        setTopProducts(topProductsList);
        console.log("Top products:", topProductsList);

        // Calculate payment performance
        const btcOrders = filteredOrders.filter((o: any) => 
          (o.crypto_currency || "").toUpperCase() === "BTC"
        );
        const xmrOrders = filteredOrders.filter((o: any) => 
          (o.crypto_currency || "").toUpperCase() === "XMR"
        );
        
        const calculateAverage = (orders: any[]) => {
          if (orders.length === 0) return 0;
          const total = orders.reduce((sum, order) => {
            const amount = parseFloat(order.total_amount || "0");
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
          return total / orders.length;
        };
        
        const avgBtc = calculateAverage(btcOrders);
        const avgXmr = calculateAverage(xmrOrders);
        
        // Calculate most popular payment method
        const paymentCounts: Record<string, number> = {};
        filteredOrders.forEach((order: any) => {
          const currency = (order.crypto_currency || "").toUpperCase();
          if (currency) {
            paymentCounts[currency] = (paymentCounts[currency] || 0) + 1;
          }
        });
        
        const totalOrders = Object.values(paymentCounts).reduce((a, b) => a + b, 0);
        const sortedPayments = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1]);
        const [popularCurrency, popularCount] = sortedPayments[0] || ["-", 0];
        
        setPaymentPerf({
          avgBtc,
          avgXmr,
          popular: {
            name: popularCurrency || "-",
            percent: totalOrders > 0 ? Math.round((popularCount / totalOrders) * 100) : 0
          }
        });
        console.log("Payment performance:", { avgBtc, avgXmr, popular: popularCurrency });

        // Calculate revenue breakdown
        const btcRevenue = btcOrders.reduce((sum, order) => {
          const amount = parseFloat(order.total_amount || "0");
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        const xmrRevenue = xmrOrders.reduce((sum, order) => {
          const amount = parseFloat(order.total_amount || "0");
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        const totalRevenue = btcRevenue + xmrRevenue;
        const calculatePercentage = (value: number) => 
          totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0;
        
        setRevenueBreakdown([
          {
            source: "BTC",
            amount: `${btcRevenue.toFixed(4)} BTC`,
            percentage: calculatePercentage(btcRevenue),
            color: "bg-orange-500"
          },
          {
            source: "XMR",
            amount: `${xmrRevenue.toFixed(4)} XMR`,
            percentage: calculatePercentage(xmrRevenue),
            color: "bg-gray-600"
          }
        ]);
        console.log("Revenue breakdown:", { btcRevenue, xmrRevenue });

      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [period]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics & Reports</h1>
          <p className="text-gray-400 text-sm sm:text-base">Track your performance and revenue insights</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => {
            const root = document.getElementById('vendor-report-root');
            const content = root ? root.outerHTML : '';
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.write(`<html><head><title>Vendor Report</title><style>body{background:#0b0b0f;color:#fff;font-family:Inter,ui-sans-serif,system-ui} .grid{gap:16px} .border{border-color:#374151}</style></head><body>${content}</body></html>`);
            win.document.close();
            win.focus();
            win.print();
            win.close();
          }}>
            <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div id="vendor-report-root" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total Revenue</p>
                {loading ? (
                  <>
                    <SkeletonBlock className="h-6 sm:h-8 w-24 sm:w-40 mt-2" />
                    <SkeletonBlock className="h-3 sm:h-4 w-32 sm:w-48 mt-2" />
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-2xl font-bold text-white break-words">
                      {metrics.totalRevenue.toFixed(4)} BTC
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400">From completed orders</p>
                  </>
                )}
              </div>
              <div className="bg-green-100 p-2 sm:p-3 rounded-full flex-shrink-0 ml-2">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            {!loading && (
              <div className="flex items-center mt-3 sm:mt-4">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                <span className="text-xs sm:text-sm text-green-600">+12.5% from last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total Sales</p>
                {loading ? (
                  <>
                    <SkeletonBlock className="h-6 sm:h-8 w-20 sm:w-24 mt-2" />
                    <SkeletonBlock className="h-3 sm:h-4 w-28 sm:w-36 mt-2" />
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-2xl font-bold text-white">{metrics.totalSales}</p>
                    <p className="text-xs sm:text-sm text-gray-400">Orders completed</p>
                  </>
                )}
              </div>
              <div className="bg-blue-100 p-2 sm:p-3 rounded-full flex-shrink-0 ml-2">
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            {!loading && (
              <div className="flex items-center mt-3 sm:mt-4">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                <span className="text-xs sm:text-sm text-green-600">+8.3% from last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Unique Buyers</p>
                {loading ? (
                  <>
                    <SkeletonBlock className="h-6 sm:h-8 w-20 sm:w-24 mt-2" />
                    <SkeletonBlock className="h-3 sm:h-4 w-28 sm:w-36 mt-2" />
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-2xl font-bold text-white">{metrics.uniqueBuyers}</p>
                    <p className="text-xs sm:text-sm text-gray-400">Active customers</p>
                  </>
                )}
              </div>
              <div className="bg-purple-100 p-2 sm:p-3 rounded-full flex-shrink-0 ml-2">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            {!loading && metrics.uniqueBuyers > 0 && (
              <div className="flex items-center mt-3 sm:mt-4">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                <span className="text-xs sm:text-sm text-green-600">Active customer base</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Store Views</p>
                {loading ? (
                  <>
                    <SkeletonBlock className="h-6 sm:h-8 w-20 sm:w-24 mt-2" />
                    <SkeletonBlock className="h-3 sm:h-4 w-28 sm:w-36 mt-2" />
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-2xl font-bold text-white">{metrics.storeViews}</p>
                    <p className="text-xs sm:text-sm text-gray-400">Profile visits</p>
                  </>
                )}
              </div>
              <div className="bg-yellow-100 p-2 sm:p-3 rounded-full flex-shrink-0 ml-2">
                <Eye className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
            {!loading && (
              <div className="flex items-center mt-3 sm:mt-4">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                <span className="text-xs sm:text-sm text-green-600">+18.7% from last month</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Sales Chart - Always show bars */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-pink-600">Sales Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="h-64 sm:h-80 grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-full w-full" />
                ))}
              </div>
            ) : (
              <div className="h-64 sm:h-80 flex items-end justify-between space-x-1 sm:space-x-2 overflow-x-auto">
                {salesData.map((data, index) => {
                  const maxValue = Math.max(...salesData.map(s => s.btc), 0.001);
                  const heightPercent = data.btc > 0 ? Math.max(5, (data.btc / maxValue) * 100) : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1 sm:space-y-2 flex-1 min-w-[50px]">
                      <div className="bg-gray-700 w-full rounded-lg overflow-hidden h-48 sm:h-64 flex flex-col justify-end">
                        <div 
                          className={`${data.btc > 0 ? 'bg-blue-500' : 'bg-gray-600'} transition-all duration-500 ease-out`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-400 font-medium">{data.month}</span>
                      <span className="text-[9px] sm:text-xs text-gray-400 break-words text-center">{data.btc.toFixed(4)} BTC</span>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && (
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-400">
                <span>Revenue trend for selected period</span>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded mr-1 sm:mr-2"></div>
                    <span>BTC Revenue</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-pink-600">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                <SkeletonBlock className="h-5 sm:h-6 w-40 sm:w-56" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-5 sm:h-6 w-32 sm:w-40" />
                <SkeletonBlock className="h-3 w-full" />
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {revenueBreakdown.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-sm sm:text-base">{item.source}</span>
                      <span className="font-semibold text-white text-sm sm:text-base break-words">{item.amount}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3">
                      <div 
                        className={`${item.color} h-2 sm:h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(item.percentage, 0)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">{item.percentage}% of total revenue</div>
                  </div>
                ))}
                
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700">
                  <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Payment Method Performance</h4>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-400">Average Order Value (BTC)</span>
                      <span className="font-medium text-white break-words">{paymentPerf.avgBtc.toFixed(4)} BTC</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-400">Average Order Value (XMR)</span>
                      <span className="font-medium text-white break-words">{paymentPerf.avgXmr.toFixed(4)} XMR</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-400">Most Popular Payment</span>
                      <span className="font-medium text-white break-words">{paymentPerf.popular.name} ({paymentPerf.popular.percent}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm relative z-10">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-pink-600">Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 sm:p-4 bg-gray-800 rounded-lg">
                  <SkeletonBlock className="h-4 sm:h-5 w-2/3" />
                  <SkeletonBlock className="h-3 sm:h-4 w-1/3 mt-2" />
                </div>
              ))}
            </div>
          ) : topProducts.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-xs sm:text-sm">#{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-white text-sm sm:text-base break-words">{product.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">{product.sales} {product.sales === 1 ? 'sale' : 'sales'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 sm:space-x-6 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-blue-400 text-sm sm:text-base">{product.revenue}</div>
                      <div className="text-[10px] sm:text-xs text-gray-400">Revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm sm:text-base">No orders yet for this period</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Sales data will appear here once you have orders</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
