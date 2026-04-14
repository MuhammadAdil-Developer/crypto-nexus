import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    DollarSign,
    TrendingUp,
    Users,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    ChevronRight,
    Calendar,
    Bitcoin,
    Activity
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import paymentService from "@/services/paymentService";

const COLORS = ["#00ffa3", "#00d1ff", "#a855f7", "#fbbf24", "#ef4444"];

export default function AdminEarnings() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchEarningsData = async () => {
        try {
            setLoading(true);
            const res = await paymentService.getAdminEarningsAnalytics();
            setData(res);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEarningsData();
        paymentService.triggerSecurityNotifications();
    }, []);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-bg">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-10 h-10 text-accent animate-spin" />
                    <p className="text-gray-400 font-medium animate-pulse">Analyzing Financial Data...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-8 print:overflow-visible print:h-auto print:p-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 print:mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight print:text-2xl">Earnings Overview</h1>
                    <p className="text-gray-400 mt-1 print:text-gray-500">Platform Financial Report - Generated on {new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex gap-3 print:hidden">
                    <Button variant="outline" className="border-border text-gray-300 hover:text-white" onClick={fetchEarningsData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Data
                    </Button>
                    <Button
                        className="bg-accent text-bg font-bold hover:bg-accent-2"
                        onClick={() => window.print()}
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        Monthly Report
                    </Button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Break through ALL parent layout constraints */
                    html, body, #root, #root > div, main, .flex, .flex-1, .overflow-y-auto {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                        overflow-y: visible !important;
                        position: static !important;
                        display: block !important;
                        width: 100% !important;
                        background-color: #030711 !important;
                    }

                    /* Hide non-report UI elements */
                    aside, nav, [role="navigation"], header, .print\\:hidden, button, .sidebar {
                        display: none !important;
                    }

                    main {
                        padding: 1cm !important;
                        margin: 0 !important;
                    }

                    /* Ensure cards don't clip and flow naturally */
                    .grid {
                        display: block !important;
                    }

                    /* Ensure cards and their contents have no weird black backgrounds */
                    .bg-surface-1 {
                        background-color: #0f172a !important;
                        border: 1px solid #1e293b !important;
                        border-radius: 12px !important;
                        margin-bottom: 2rem !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        display: block !important;
                        width: 100% !important;
                        box-shadow: none !important;
                    }

                    .bg-surface-1 div, .bg-surface-1 span {
                        background-color: transparent !important;
                        background: transparent !important;
                    }
                    
                    /* Icons and Badges can have subtle backgrounds if needed, but transparent is safer for print */
                    .bg-surface-1 .bg-accent\\/10, 
                    .bg-surface-1 .bg-success\\/10, 
                    .bg-surface-1 .bg-danger\\/10,
                    .bg-surface-1 .bg-stone-900\\/50 {
                        background-color: rgba(255, 255, 255, 0.05) !important;
                    }

                    /* Maintain Dark Theme Text */
                    h1, h2, h3, h4, p, span, div, td, th {
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Fix Charts */
                    .recharts-responsive-container {
                        width: 100% !important;
                        height: 380px !important;
                        min-height: 380px !important;
                        display: block !important;
                    }

                    table {
                        width: 100% !important;
                        display: table !important;
                    }
                }
            `}} />

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-surface-1 border-border shadow-xl hover:border-accent/40 transition-all cursor-default">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-accent" />
                            </div>
                            <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${data.summary.profitGrowth >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                                {data.summary.profitGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                {Math.abs(data.summary.profitGrowth)}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-400">Total Platform Profit</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{data.summary.totalProfitUSD}</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="text-[10px] font-mono bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">{data.summary.profitBTC} BTC</span>
                            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{data.summary.profitXMR} XMR</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-surface-1 border-border shadow-xl hover:border-accent/40 transition-all cursor-default">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                            <span className="flex items-center text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                {data.summary.vendorGrowth}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-400">Total Registered Users</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{data.summary.totalUsers}</h3>
                        <p className="text-xs text-gray-500 mt-1">Platform-wide adoption</p>
                    </CardContent>
                </Card>

                <Card className="bg-surface-1 border-border shadow-xl hover:border-accent/40 transition-all cursor-default">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-purple-500" />
                            </div>
                            <span className="flex items-center text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                {data.summary.successGrowth}%
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-400">High-Tier Vendors</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{data.summary.highTierVendors}</h3>
                        <p className="text-xs text-gray-500 mt-1">Generating &gt; $1,000/mo</p>
                    </CardContent>
                </Card>

                <Card className="bg-surface-1 border-border shadow-xl hover:border-accent/40 transition-all cursor-default">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-400">Total Active Vendors</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{data.summary.activeVendors}</h3>
                        <p className="text-xs text-gray-500 mt-1">With at least one sale</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 gap-8 mb-8">
                {/* Revenue Chart - Full Width */}
                <Card className="bg-surface-1 border-border shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                        <CardTitle className="text-white text-lg font-bold flex items-center justify-between">
                            12-Month Revenue History (USD)
                            <span className="text-xs font-normal text-gray-500">Trailing 12 months</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#00ffa3' }}
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    />
                                    <Bar dataKey="value" fill="#00ffa3" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Order Types Chart */}
                <Card className="bg-surface-1 border-border shadow-2xl overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                        <CardTitle className="text-white text-lg font-bold">Order Type Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center flex-1">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.ratios}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {data.ratios.map((_entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {data.ratios.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-xs text-gray-300 font-medium">{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top 6 Vendors */}
                <Card className="lg:col-span-2 bg-surface-1 border-border shadow-2xl">
                    <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.02]">
                        <CardTitle className="text-white text-lg font-bold">Top 6 Profit-Generating Vendors</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-accent hover:text-accent-2"
                            onClick={() => navigate('/admin/vendors')}
                        >
                            View All <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white/2 text-left uppercase text-[10px] font-bold tracking-wider text-gray-500 border-b border-white/5">
                                        <th className="px-6 py-4">Vendor Name</th>
                                        <th className="px-6 py-4">Orders</th>
                                        <th className="px-6 py-4">Profit Contributed</th>
                                        <th className="px-6 py-4">Growth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {data.topVendors.map((vendor: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/2 transition-colors group">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-xs font-bold text-white group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                                                    {vendor.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-gray-200 font-medium">{vendor.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{vendor.orders}</td>
                                            <td className="px-6 py-4 text-white font-mono font-bold">${vendor.value.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-success text-xs font-medium flex items-center">
                                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                                    {8 - i}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Profit Feed - Bottom Row */}
            <Card className="bg-surface-1 border-border shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-accent" />
                            <CardTitle className="text-white text-lg font-bold">Recent Profit Feed</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white group">
                            Live Stream <span className="w-2 h-2 rounded-full bg-red-500 ml-2 animate-pulse" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/2 text-left uppercase text-[10px] font-bold tracking-wider text-gray-500 border-b border-white/5">
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Profit Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.recentProfits.map((profit: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/2 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-accent font-mono text-sm">#{profit.orderId}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300 font-medium">{profit.vendor}</td>
                                        <td className="px-6 py-4 text-success font-mono font-bold">+{profit.amount}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                                RELEASED
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm italic">{profit.timestamp}</td>
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
