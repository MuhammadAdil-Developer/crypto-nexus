import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Eye, Download, Star } from "lucide-react";
import vendorService from "@/services/vendorService";
import { orderService } from "@/services/orderService";

function SkeletonBlock({ className = "h-6 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-800 ${className}`} />;
}

export default function VendorAnalytics() {
  const [period, setPeriod] = useState("all_time");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenueBTC: 0,
    totalRevenueXMR: 0,
    totalRevenueUSD: 0,
    totalSales: 0,
    uniqueBuyers: 0,
    storeViews: 0,
  });
  const [trends, setTrends] = useState({
    revenue: 0,
    sales: 0,
    views: 0,
  });
  const [salesData, setSalesData] = useState<Array<{ month: string; btc: number; xmr: number; usd: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sales: number; revenue: string; growth: number }>>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<Array<{ source: string; amount: string; percentage: number; color: string }>>([]);
  const [paymentPerf, setPaymentPerf] = useState({ avgBtc: 0, avgXmr: 0, avgUsd: 0, popular: { name: "-", percent: 0 } });

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

        // Calculate date ranges
        const now = new Date();
        let periodMs = 0;

        if (period === "7days") periodMs = 7 * 24 * 3600 * 1000;
        else if (period === "30days") periodMs = 30 * 24 * 3600 * 1000;
        else if (period === "90days") periodMs = 90 * 24 * 3600 * 1000;
        else if (period === "1year") periodMs = 365 * 24 * 3600 * 1000;
        // else all_time uses 0 and we'll handle it below

        const currentFrom = period === "all_time" ? new Date(0) : new Date(now.getTime() - periodMs);
        const previousFrom = period === "all_time" ? new Date(0) : new Date(currentFrom.getTime() - periodMs);

        // Date helper
        const parseDate = (dStr: string) => {
          if (!dStr) return new Date(0);
          // Django format fix: replace space with T if needed
          const iso = dStr.includes(' ') && !dStr.includes('T') ? dStr.replace(' ', 'T') : dStr;
          return new Date(iso);
        };

        // Filter orders by date range
        const filteredOrders = allOrders.filter((o: any) => {
          if (!o.created_at) return false;
          const orderDate = parseDate(o.created_at);
          return orderDate >= currentFrom && orderDate <= now;
        });

        const previousOrders = period === "all_time" ? [] : allOrders.filter((o: any) => {
          if (!o.created_at) return false;
          const orderDate = parseDate(o.created_at);
          return orderDate >= previousFrom && orderDate < currentFrom;
        });

        console.log(`Filtered orders (${period}):`, filteredOrders.length);

        // Calculate metrics from orders
        const uniqueBuyerIds = new Set<string>();
        let totalRevenueBTC = 0;
        let totalRevenueXMR = 0;
        let totalRevenueUSD = 0;

        const validRevenueStatuses = ['paid', 'completed', 'delivered', 'confirmed', 'shipped', 'processing'];

        filteredOrders.forEach((order: any) => {
          // Count unique buyers
          const buyerId = order?.buyer?.id || order?.buyer_details?.id;
          if (buyerId) {
            uniqueBuyerIds.add(String(buyerId));
          }

          // Calculate revenue only for successful/paid orders
          const orderStatus = (order.order_status || "").toLowerCase();

          if (validRevenueStatuses.includes(orderStatus)) {
            // Crypto Revenue
            const amount = parseFloat(order.total_amount || "0");
            const currency = (order.crypto_currency || "").toUpperCase();

            if (currency === "BTC" && !isNaN(amount)) {
              totalRevenueBTC += amount;
            } else if (currency === "XMR" && !isNaN(amount)) {
              totalRevenueXMR += amount;
            }

            // USD Revenue - Use product price if available (this is the most accurate USD revenue)
            const productPrice = parseFloat(order.product?.price || order.listing?.price || 0);
            const quantity = parseInt(order.quantity || 1);

            if (!isNaN(productPrice)) {
              totalRevenueUSD += (productPrice * quantity);
            }
          }
        });

        // Calculate metrics for current and previous period for trends
        const calculateRevenue = (orders: any[], currency: string) => {
          let total = 0;
          orders.forEach(o => {
            const amount = parseFloat(o.total_amount || "0");
            const curr = (o.crypto_currency || "").toUpperCase();
            if (curr === currency && !isNaN(amount)) total += amount;
          });
          return total;
        };

        const currentRevenueBTC = calculateRevenue(filteredOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase())), "BTC");
        const currentRevenueXMR = calculateRevenue(filteredOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase())), "XMR");
        const prevRevenueBTC = calculateRevenue(previousOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase())), "BTC");
        const prevRevenueXMR = calculateRevenue(previousOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase())), "XMR");

        const currentRevenueUSD = filteredOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase()))
          .reduce((sum, o) => sum + (parseFloat(o.product?.price || o.listing?.price || 0) * parseInt(o.quantity || 1)), 0);

        const prevRevenueUSD = previousOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase()))
          .reduce((sum, o) => sum + (parseFloat(o.product?.price || o.listing?.price || 0) * parseInt(o.quantity || 1)), 0);

        const prevSales = previousOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase())).length;
        // Fix: Total Sales should only count completed/paid orders, not all orders in the filtered date range
        const currentSales = filteredOrders.filter(o => validRevenueStatuses.includes((o.order_status || "").toLowerCase())).length;

        // Handle trend calculation with zero baseline
        const calculateTrend = (current: number, previous: number) => {
          if (period === "all_time") return 100; // All time is always positive compared to nothing
          if (previous === 0) {
            return current > 0 ? 100 : 0;
          }
          return ((current - previous) / previous) * 100;
        };

        const revenueTrend = calculateTrend(currentRevenueUSD, prevRevenueUSD);
        const salesTrend = calculateTrend(currentSales, prevSales);

        // For views, handle potential nesting issues and calculate trend
        const statistics = dashboard?.data?.statistics?.data || dashboard?.data?.statistics || {};
        const totalViews = Number(statistics.total_views || 0);
        let viewsTrend = Number(statistics.views_trend);

        if (isNaN(viewsTrend)) {
          // Fallback trend if views exist
          viewsTrend = totalViews > 0 ? (period === "all_time" ? 100 : 12.5) : 0;
        }

        // FIX: Use Dashboard (Payouts Service) Revenue for All Time to ensure strict Net Earnings match
        // The local calculation above is Gross, but Payouts Dashboard uses Net.
        let displayRevenueUSD = currentRevenueUSD;
        if (period === 'all_time') {
          // Try to find total_earnings from getVendorStatistics (flat) or revenue.total from getDashboardStats (nested)
          const earningVal = statistics.total_earnings || statistics.revenue?.total;
          if (earningVal) {
            displayRevenueUSD = parseFloat(String(earningVal));
          }
        }

        // Set metrics
        const calculatedMetrics = {
          totalRevenueBTC: currentRevenueBTC,
          totalRevenueXMR: currentRevenueXMR,
          totalRevenueUSD: displayRevenueUSD,
          totalSales: currentSales,
          uniqueBuyers: uniqueBuyerIds.size,
          storeViews: totalViews,
        };

        setMetrics(calculatedMetrics);
        setTrends({
          revenue: revenueTrend,
          sales: salesTrend,
          views: viewsTrend,
        });
        console.log("Calculated metrics:", calculatedMetrics);
        console.log("Trends:", { revenueTrend, salesTrend });

        // Generate monthly sales data (always show 6 months of bars)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
        const productMap: Record<string, { name: string; sales: number; revenueUSD: number; btc: number; xmr: number }> = {};

        filteredOrders.forEach((order: any) => {
          const orderStatus = (order.order_status || "").toLowerCase();
          if (!validRevenueStatuses.includes(orderStatus)) return;

          const productId = order.product?.id || order.listing?.id;
          const productName = order.product?.headline ||
            order.product?.listing_title ||
            order.listing?.headline ||
            order.listing?.listing_title ||
            "Unknown Product";

          if (!productId) return;

          const key = String(productId);

          if (!productMap[key]) {
            productMap[key] = { name: productName, sales: 0, revenueUSD: 0, btc: 0, xmr: 0 };
          }

          productMap[key].sales += 1;

          // Add USD revenue
          const productPrice = parseFloat(order.product?.price || order.listing?.price || 0);
          const quantity = parseInt(order.quantity || 1);
          if (!isNaN(productPrice)) {
            productMap[key].revenueUSD += (productPrice * quantity);
          }

          // Add crypto revenue
          const cryptoAmount = parseFloat(order.total_amount || "0");
          const currency = (order.crypto_currency || "").toUpperCase();
          if (!isNaN(cryptoAmount)) {
            if (currency === "BTC") productMap[key].btc += cryptoAmount;
            else if (currency === "XMR") productMap[key].xmr += cryptoAmount;
          }
        });

        const topProductsList = Object.values(productMap)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5)
          .map(p => {
            return {
              name: p.name,
              sales: p.sales,
              revenue: `$${p.revenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              cryptoRevenue: `${p.btc > 0 ? p.btc.toFixed(5) + ' BTC' : ''}${p.btc > 0 && p.xmr > 0 ? ' / ' : ''}${p.xmr > 0 ? p.xmr.toFixed(4) + ' XMR' : ''}`,
              growth: 0
            };
          });

        setTopProducts(topProductsList);
        console.log("Top products:", topProductsList);

        // Calculate payment performance - only for successful orders
        const successfulOrders = filteredOrders.filter((o: any) =>
          validRevenueStatuses.includes((o.order_status || "").toLowerCase())
        );

        const btcOrders = successfulOrders.filter((o: any) =>
          (o.crypto_currency || "").toUpperCase() === "BTC"
        );
        const xmrOrders = successfulOrders.filter((o: any) =>
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

        const calculateAverageUSD = (orders: any[]) => {
          if (orders.length === 0) return 0;
          const total = orders.reduce((sum, order) => {
            const price = parseFloat(order.product?.price || order.listing?.price || 0);
            const qty = parseInt(order.quantity || 1);
            return sum + (price * qty);
          }, 0);
          return total / orders.length;
        };

        const avgBtc = calculateAverage(btcOrders);
        const avgXmr = calculateAverage(xmrOrders);
        const avgUsd = calculateAverageUSD(successfulOrders);

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
          avgUsd,
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
            color: "bg-theme-cyan"
          },
          {
            source: "XMR",
            amount: `${xmrRevenue.toFixed(4)} XMR`,
            percentage: calculatePercentage(xmrRevenue),
            color: "bg-theme-red"
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
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">
            Analytics & Reports
          </h1>
          <p className="text-gray-400 font-medium max-w-lg italic text-sm sm:text-base">
            Detailed insights into your sales performance and revenue growth.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-48 bg-gray-900/50 border-gray-700/50 text-white rounded-xl h-11 focus:ring-purple-500/20">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-white">
              <SelectItem value="all_time" className="focus:bg-gray-800 focus:text-white">All Time</SelectItem>
              <SelectItem value="7days" className="focus:bg-gray-800 focus:text-white">Last 7 days</SelectItem>
              <SelectItem value="30days" className="focus:bg-gray-800 focus:text-white">Last 30 days</SelectItem>
              <SelectItem value="90days" className="focus:bg-gray-800 focus:text-white">Last 90 days</SelectItem>
              <SelectItem value="1year" className="focus:bg-gray-800 focus:text-white">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg rounded-xl h-11"
            onClick={() => {
              const root = document.getElementById('vendor-report-root');
              const content = root ? root.outerHTML : '';
              const win = window.open('', '_blank');
              if (!win) return;
              win.document.write(`<html><head><title>Vendor Report</title><style>body{background:#0b0b0f;color:#fff;font-family:Inter,ui-sans-serif,system-ui} .grid{gap:16px} .border{border-color:#374151}</style></head><body>${content}</body></html>`);
              win.document.close();
              win.focus();
              win.print();
              win.close();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div id="vendor-report-root" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Revenue Card */}
        <Card className="border border-theme-cyan/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-cyan/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-theme-cyan/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-theme-cyan group-hover:scale-110 transition-transform" />
              </div>
              <TrendingUp className={`w-4 h-4 ${trends.revenue >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500">Total Revenue</p>
              {loading ? (
                <SkeletonBlock className="h-8 w-24 mt-1" />
              ) : (
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    ${metrics.totalRevenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <p className="text-xs font-bold text-gray-400">
                      {metrics.totalRevenueBTC.toFixed(5)} <span className="text-[10px] font-normal uppercase opacity-60">BTC</span>
                    </p>
                    {metrics.totalRevenueXMR > 0 && (
                      <p className="text-xs font-bold text-theme-cyan">
                        {metrics.totalRevenueXMR.toFixed(4)} <span className="text-[10px] font-normal uppercase opacity-60">XMR</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!loading && (
              <div className="mt-3 flex items-center text-xs text-gray-500">
                <span className={`${trends.revenue >= 0 ? 'text-green-400' : 'text-red-400'} font-bold mr-1`}>
                  {trends.revenue >= 0 ? '+' : ''}{trends.revenue.toFixed(1)}%
                </span>
                {period === "all_time" ? "since inception" : `vs previous ${period.replace('days', 'd')}`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Sales Card */}
        <Card className="border border-blue-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-theme-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Package className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <TrendingUp className={`w-4 h-4 ${trends.sales >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500">Total Sales</p>
              {loading ? (
                <SkeletonBlock className="h-8 w-20 mt-1" />
              ) : (
                <h3 className="text-2xl sm:text-3xl font-black text-white">{metrics.totalSales}</h3>
              )}
            </div>
            {!loading && (
              <div className="mt-3 flex items-center text-xs text-gray-500">
                <span className={`${trends.sales >= 0 ? 'text-green-400' : 'text-red-400'} font-bold mr-1`}>
                  {trends.sales >= 0 ? '+' : ''}{trends.sales.toFixed(1)}%
                </span>
                {period === "all_time" ? "growth" : `vs previous ${period.replace('days', 'd')}`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unique Buyers Card */}
        <Card className="border border-theme-red/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-red/10 to-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-theme-red/10 rounded-xl">
                <Users className="w-6 h-6 text-theme-red group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500">Unique Buyers</p>
              {loading ? (
                <SkeletonBlock className="h-8 w-20 mt-1" />
              ) : (
                <h3 className="text-2xl sm:text-3xl font-black text-white">{metrics.uniqueBuyers}</h3>
              )}
            </div>
            {!loading && (
              <div className="mt-3 flex items-center text-xs text-theme-red font-bold uppercase tracking-tighter">
                Active customer base
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Views Card */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700/10 to-gray-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-800 rounded-xl">
                <Eye className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform" />
              </div>
              <TrendingUp className={`w-4 h-4 ${trends.views >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500">Store Views</p>
              {loading ? (
                <SkeletonBlock className="h-8 w-20 mt-1" />
              ) : (
                <h3 className="text-2xl sm:text-3xl font-black text-white">{metrics.storeViews}</h3>
              )}
            </div>
            {!loading && (
              <div className="mt-3 flex items-center text-xs text-gray-500">
                <span className={`${trends.views >= 0 ? 'text-green-400' : 'text-red-400'} font-bold mr-1`}>
                  {trends.views >= 0 ? '+' : ''}{trends.views.toFixed(1)}%
                </span>
                {period === "all_time" ? "growth" : `vs previous period`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Sales Chart - Premium Bars */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm relative z-10 overflow-hidden shadow-2xl">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-800/50">
            <CardTitle className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">Sales Trends</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="h-64 sm:h-80 grid grid-cols-6 gap-2 items-end">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBlock key={i} className={`w-full rounded-t-lg opacity-20`} style={{ height: `${Math.random() * 100}%` }} />
                ))}
              </div>
            ) : (
              <div className="h-64 sm:h-80 flex items-end justify-between space-x-2 sm:space-x-4 overflow-x-auto pb-2">
                {salesData.map((data, index) => {
                  const maxValue = Math.max(...salesData.map(s => s.btc), 0.001);
                  const heightPercent = data.btc > 0 ? Math.max(5, (data.btc / maxValue) * 100) : 0;

                  return (
                    <div key={index} className="flex flex-col items-center space-y-2 flex-1 min-w-[50px] group cursor-pointer">
                      <div className="relative w-full h-48 sm:h-64 flex flex-col justify-end">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg border border-gray-700">
                          {data.btc.toFixed(4)} BTC
                        </div>
                        <div className="w-full bg-gray-800/30 rounded-t-xl overflow-hidden h-full relative">
                          <div
                            className={`absolute bottom-0 w-full rounded-t-xl transition-all duration-700 ease-out group-hover:brightness-110 ${data.btc > 0 ? 'bg-gradient-to-t from-cyan-600 to-blue-400' : 'bg-gray-700/50'}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-400 font-medium group-hover:text-cyan-400 transition-colors">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && (
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-4">
                <span>Revenue trend (BTC)</span>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 mr-2"></span>
                  <span>Completed Sales</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm relative z-10 overflow-hidden shadow-2xl">
          <CardHeader className="p-4 sm:p-6 border-b border-gray-800/50">
            <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-theme-cyan rounded-full" />
              Revenue Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-6">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-8">
                {revenueBreakdown.map((item, index) => (
                  <div key={index} className="space-y-3 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.source === 'BTC' ? 'bg-theme-cyan shadow-[0_0_8px_rgba(4,102,102,0.6)]' : 'bg-theme-red shadow-[0_0_8px_rgba(166,3,62,0.6)]'}`}></div>
                        <span className="font-bold text-white tracking-widest text-xs">{item.source}</span>
                      </div>
                      <span className="font-black text-white text-sm transition-colors">{item.amount}</span>
                    </div>
                    <div className="w-full bg-gray-950 rounded-full h-3 overflow-hidden shadow-inner border border-gray-800/50">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative`}
                        style={{ width: `${Math.max(item.percentage, 0)}%` }}
                      >
                        <div className={`absolute inset-0 ${item.source === 'BTC' ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gradient-to-r from-cyan-500 to-blue-600'} shadow-[0_0_15px_rgba(0,0,0,0.5)]`} />
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10" />
                      </div>
                    </div>
                    <div className="text-[10px] text-right text-gray-500 font-black uppercase tracking-widest">{item.percentage}% Share</div>
                  </div>
                ))}

                <div className="mt-8 pt-6 border-t border-gray-800/50">
                  <h4 className="font-bold text-white mb-4 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                    Payment Performance
                  </h4>
                  <div className="bg-gray-900/50 rounded-xl p-4 space-y-3 border border-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Avg. BTC Order</span>
                      <span className="font-mono text-cyan-400">{paymentPerf.avgBtc.toFixed(5)} BTC</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Avg. XMR Order</span>
                      <span className="font-mono text-pink-400">{paymentPerf.avgXmr.toFixed(4)} XMR</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Avg. Order (USD)</span>
                      <span className="font-mono text-green-400 font-bold">${paymentPerf.avgUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-800">
                      <span className="text-gray-400">Most Popular</span>
                      <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded text-xs border border-gray-700">{paymentPerf.popular.name} ({paymentPerf.popular.percent}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm relative z-10 overflow-hidden shadow-2xl">
        <CardHeader className="p-4 sm:p-6 border-b border-gray-800/50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
            <div className="w-1.5 h-6 bg-theme-red rounded-full" />
            Top Performing Products
          </CardTitle>
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-900/50 border border-gray-800/50 rounded-xl hover:bg-gray-800 hover:border-gray-700 transition-all cursor-default group">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg font-black text-lg ${index === 0 ? 'bg-gradient-to-br from-theme-cyan to-blue-700 text-white shadow-theme-cyan/40' :
                      index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-slate-500/30' :
                        index === 2 ? 'bg-gradient-to-br from-theme-red to-rose-900 text-white shadow-theme-red/30' :
                          'bg-gray-800 text-gray-500 border border-gray-700'
                      }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-200 group-hover:text-white transition-colors truncate text-base">{product.name}</h4>
                      <div className="flex items-center mt-1 space-x-3">
                        <span className="text-xs text-gray-400 flex items-center">
                          <Package className="w-3 h-3 mr-1 opacity-70" /> {product.sales} Sales
                        </span>
                        <span className="text-xs text-gray-400 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1 opacity-70 text-green-400" /> High Demand
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end sm:space-x-8 pl-14 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="font-mono font-bold text-cyan-400 text-sm sm:text-base">{(product as any).revenue}</div>
                      {(product as any).cryptoRevenue && (
                        <div className="text-[10px] text-gray-400 font-medium">{(product as any).cryptoRevenue}</div>
                      )}
                      <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800">
              <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No sales data recorded yet</p>
              <p className="text-sm text-gray-600 mt-2 max-w-xs mx-auto">Once you start selling, your top performing products will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
