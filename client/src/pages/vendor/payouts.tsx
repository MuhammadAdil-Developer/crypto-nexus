import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Download, TrendingUp, Clock, CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

const payoutHistory = [
  {
    id: "PAY-2024-015",
    amount: "0.245 BTC",
    usdAmount: "$9,870.50",
    address: "bc1q...xyz789",
    method: "BTC",
    status: "Completed",
    date: "2024-01-15",
    txHash: "a1b2c3d4e5f6789..."
  },
  {
    id: "PAY-2024-014",
    amount: "0.189 BTC",
    usdAmount: "$7,623.40",
    address: "bc1q...abc123",
    method: "BTC",
    status: "Completed",
    date: "2024-01-08",
    txHash: "z9y8x7w6v5u4321..."
  },
  {
    id: "PAY-2024-013",
    amount: "2.45 XMR",
    usdAmount: "$4,321.90",
    address: "4A1B...789XYZ",
    method: "XMR",
    status: "Processing",
    date: "2024-01-14",
    txHash: null
  },
  {
    id: "PAY-2024-012",
    amount: "0.156 BTC",
    usdAmount: "$6,291.60",
    address: "bc1q...def456",
    method: "BTC",
    status: "Completed",
    date: "2024-01-01",
    txHash: "m3n4o5p6q7r8901..."
  }
];

// Dynamic data interfaces
interface PayoutData {
  id: string;
  amount: string;
  usdAmount: string;
  address: string;
  method: string;
  status: string;
  date: string;
  txHash?: string;
  payment_proof_hash?: string;
  order_id?: string;
  type?: 'escrow' | 'direct' | 'refund';
  gross_amount?: string;
  platform_fee?: string;
  base_platform_fee?: string;
  promotion_fee?: string;
  promotion_fee_rate?: number;
  escrow_fee?: string;
  platform_fee_rate?: number;
  escrow_fee_rate?: number;
  network_fee?: string;
}

const isBlockchainTxHash = (hash?: string) => !!hash && /^[a-fA-F0-9]{64}$/.test(hash);
const getExplorerLink = (method?: string, hash?: string) => {
  if (!hash || !isBlockchainTxHash(hash)) return null;
  const symbol = (method || "").toLowerCase();
  if (symbol === "btc" || symbol === "bitcoin") return `https://blockchair.com/bitcoin/transaction/${hash}`;
  if (symbol === "xmr" || symbol === "monero") return `https://xmrchain.net/tx/${hash}`;
  return null;
};
const getProofLink = (method?: string, proofHash?: string) => getExplorerLink(method, proofHash);

// Styled Crypto Icon Component
const CryptoIcon = ({ symbol, size = "md" }: { symbol?: string, size?: "sm" | "md" | "lg" | "xl" }) => {
  const isBTC = symbol?.toUpperCase() === 'BTC' || symbol?.toUpperCase() === 'BITCOIN';
  const isXMR = symbol?.toUpperCase() === 'XMR' || symbol?.toUpperCase() === 'MONERO';

  const sizeMetrics = {
    sm: { box: "w-8 h-8", icon: "w-5 h-5" },
    md: { box: "w-10 h-10", icon: "w-6 h-6" },
    lg: { box: "w-12 h-12", icon: "w-7 h-7" },
    xl: { box: "w-16 h-16", icon: "w-10 h-10" }
  };

  const metrics = sizeMetrics[size];

  return (
    <div className={`
      ${metrics.box} 
      rounded-full 
      bg-[#09111f] 
      flex 
      items-center 
      justify-center 
      border-2 
      ${isBTC ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : isXMR ? 'border-[#ff6600]/40 shadow-[0_0_15px_rgba(255,102,0,0.2)]' : 'border-gray-500/40'} 
    `}>
      {isBTC ? (
        <svg viewBox="0 0 512 512" className={`${metrics.icon}`}>
          <path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248z" fill="#f7931a" />
          <path d="M446.689 215.197c-3.141-20.985-12.791-36.929-28.924-47.8c-13.883-9.356-31.063-14.739-51.542-16.142l11.458-45.926-28.016-6.993-11.162 44.733c-7.361-1.84-14.922-3.567-22.463-5.264l11.238-45.05-28.016-6.988-11.458 45.925c-6.101-1.39-12.016-2.731-18.06-4.108l.006-.027-38.653-9.648-7.468 29.972s20.793 4.767 20.355 5.058c11.353 2.828 13.399 10.334 13.064 16.273l-13.08 52.486c.773.193 1.782.443 2.909.739l-2.937-.733-18.337 73.545c-1.583 3.963-5.642 9.897-14.766 7.625.32 0-20.355-5.071-20.355-5.071l-13.931 32.091 36.483 9.091c6.791 1.696 13.435 3.473 19.957 5.127l-11.558 46.362 28.021 6.99 11.458-45.921c7.653 2.083 15.093 4.07 22.38 5.969l-11.442 45.871 28.021 6.99 11.558-46.368c47.882 9.081 83.993 5.405 99.141-37.935 12.193-34.908.411-55.02-24.636-68.086 18.261-4.223 32.062-16.242 36.035-41.246zM324.417 319.497c-8.682 34.808-67.433 15.989-86.425 11.258l15.426-61.859c18.992 4.73 80.088 14.111 70.999 50.601zm8.73-87.962c-7.923 31.78-56.918 15.655-72.77 11.693l14.072-56.44c15.852 3.962 66.974 11.439 58.698 44.747z" fill="#fff" />
        </svg>
      ) : isXMR ? (
        <svg viewBox="0 0 512 512" className={`${metrics.icon}`}>
          <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm138.2 376H350l-8.4-1.1c-32.9-4.3-51.4-23.7-65.4-56.1l-18-42.3-19.1 44.8c-14 32.8-32.4 51.5-66.6 54.1l-10 1.2h-44.4v-31.1H147l2.8-.2c20.3-1.6 30.6-11.7 39.4-32.1l54.8-128.6L191.1 121c-7.2-22.1-15.3-31.1-39.7-32.1l-4.4-.2V57.6h46.2l3.4.1c25.4.6 36.3 9.4 46 36.5l25.7 71.5 24.3-68.5c10.5-29.6 19.4-39 48.7-39.6l3.7-.1h46.2v31.1h-4.4c-24.4 1-32.5 10-39.7 32.1l-52.9 161 54.8 128.6c8.8 20.4 19.1 30.5 39.4 32.1l2.8.2v31.1z" fill="#ff6600" />
        </svg>
      ) : (
        <span className="text-white font-black">{symbol?.toUpperCase() || "CRY"}</span>
      )}
    </div>
  );
};

interface PendingEarnings {
  btc: { earned_amount: string; earned_usd: string; earned_orders: number; balance_amount: string; balance_usd: string; pending_orders: number };
  xmr: { earned_amount: string; earned_usd: string; earned_orders: number; balance_amount: string; balance_usd: string; pending_orders: number };
  total: { earned_usd: string; earned_orders: number; balance_usd: string; pending_orders: number };
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]";
    case "processing":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.1)]";
    case "ready":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]";
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]";
    case "failed":
      return "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]";
    case "cancelled":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
};

export default function VendorPayouts() {
  // State management
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [pendingEarnings, setPendingEarnings] = useState<PendingEarnings>({
    btc: { earned_amount: "0.0000", earned_usd: "$0.00", earned_orders: 0, balance_amount: "0.0000", balance_usd: "$0.00", pending_orders: 0 },
    xmr: { earned_amount: "0.0000", earned_usd: "$0.00", earned_orders: 0, balance_amount: "0.0000", balance_usd: "$0.00", pending_orders: 0 },
    total: { earned_usd: "$0.00", earned_orders: 0, balance_usd: "$0.00", pending_orders: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterType, setFilterType] = useState("all"); // Added type filter
  const [selectedPayout, setSelectedPayout] = useState<PayoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  // Fetch vendor payouts data
  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/vendor/payouts/');

      if (response.data.success) {
        setPayouts(response.data.data);

        // Calculate pending earnings from API data
        const pendingData = response.data.pending_earnings || {};
        if (pendingData) {
          setPendingEarnings({
            btc: {
              earned_amount: pendingData.btc?.earned_amount || "0.0000",
              earned_usd: pendingData.btc?.earned_usd || "$0.00",
              earned_orders: pendingData.btc?.earned_orders || 0,
              balance_amount: pendingData.btc?.balance_amount || "0.0000",
              balance_usd: pendingData.btc?.balance_usd || "$0.00",
              pending_orders: pendingData.btc?.pending_orders || 0
            },
            xmr: {
              earned_amount: pendingData.xmr?.earned_amount || "0.0000",
              earned_usd: pendingData.xmr?.earned_usd || "$0.00",
              earned_orders: pendingData.xmr?.earned_orders || 0,
              balance_amount: pendingData.xmr?.balance_amount || "0.0000",
              balance_usd: pendingData.xmr?.balance_usd || "$0.00",
              pending_orders: pendingData.xmr?.pending_orders || 0
            },
            total: {
              earned_usd: pendingData.total?.earned_usd || "$0.00",
              earned_orders: pendingData.total?.earned_orders || 0,
              balance_usd: pendingData.total?.balance_usd || "$0.00",
              pending_orders: pendingData.total?.pending_orders || 0
            }
          });
        } else {
          setError('Failed to fetch payout data');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch payout data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction history
  const fetchTransactionHistory = async (page: number = 1) => {
    try {
      setTransactionsLoading(true);
      const response = await api.get('/payments/vendor/transaction-history/', {
        params: {
          page: page,
          limit: itemsPerPage
        }
      });

      if (response.data.success) {
        setTransactions(response.data.data);
        setTotalPages(Math.ceil(response.data.total / itemsPerPage));
        setCurrentPage(page);
      } else {
        console.error('Failed to fetch transaction history');
      }
    } catch (error: any) {
      console.error('Transaction history fetch error:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
    fetchTransactionHistory();
  }, []);

  const filteredPayouts = [...payouts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by latest
    .filter(payout => {
      const methodMatch = filterMethod === "all" || payout.method === filterMethod;
      const typeMatch = filterType === "all" || payout.type === filterType;
      return methodMatch && typeMatch;
    });

  const totalPaidOut = payouts
    .filter(p => p.status.toLowerCase() === "completed")
    .reduce((sum, p) => sum + parseFloat(p.usdAmount.replace('$', '').replace(',', '')), 0);

  const copyToClipboard = (text: string) => {
    // Basic fallback for unsecure contexts (HTTP)
    if (!navigator.clipboard && document.execCommand) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast({
            title: "Copied!",
            description: "Address copied",
          });
        }
      } catch (err) {
        // fail silently
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text);
  };

  const exportHistory = () => {
    if (payouts.length === 0) {
      toast({
        title: "No data",
        description: "Nothing to export yet",
        variant: "destructive"
      });
      return;
    }

    const headers = ["ID", "Amount", "USD Amount", "Address", "Method", "Status", "Date", "Type", "Order ID"];
    const csvContent = [
      headers.join(","),
      ...payouts.map(p => [
        p.id,
        p.amount.replace(',', ''),
        p.usdAmount.replace(',', '').replace('$', ''),
        p.address,
        p.method,
        p.status,
        p.date,
        p.type || 'N/A',
        p.order_id || 'N/A'
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payout_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "History exported to CSV",
    });
  };

  return (

    <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">
            Payouts & Earnings
          </h1>
          <p className="text-gray-400 font-medium max-w-lg italic text-sm sm:text-base">
            Track your revenue, manage withdrawals, and view transaction history.
          </p>
        </div>
        <Button
          onClick={fetchPayouts}
          disabled={loading}
          className="bg-gray-900/50 hover:bg-gray-800 text-white border border-gray-700/50 shadow-lg rounded-xl h-12 px-6 font-bold transition-all"
        >
          <TrendingUp className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* Balance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="border border-amber-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Wallet className="w-8 h-8 text-amber-500" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-bold px-3 py-1">BTC BALANCE</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">
                {loading ? "..." : `${pendingEarnings.btc.balance_amount} BTC`}
              </div>
              <div className="text-sm text-gray-400 flex justify-between items-center">
                <span>≈ {loading ? "..." : pendingEarnings.btc.balance_usd}</span>
                <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs border border-amber-500/20">
                  {loading ? "..." : pendingEarnings.btc.pending_orders} orders pending release
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Wallet className="w-8 h-8 text-orange-500" />
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-bold px-3 py-1">XMR BALANCE</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                {loading ? "..." : `${pendingEarnings.xmr.balance_amount} XMR`}
              </div>
              <div className="text-sm text-gray-400 flex justify-between items-center">
                <span>≈ {loading ? "..." : pendingEarnings.xmr.balance_usd}</span>
                <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-xs border border-orange-500/20">
                  {loading ? "..." : pendingEarnings.xmr.pending_orders} orders pending release
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold px-3 py-1">TOTAL EARNINGS</Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Earnings</span>
              <div className="text-2xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                {loading ? "..." : pendingEarnings.total.earned_usd}
              </div>
              <div className="text-sm text-gray-400">
                Total Earnings Settled Directly
              </div>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <div className="text-xs text-emerald-400 font-medium text-center">
                {loading ? "..." : pendingEarnings.total.earned_orders}
              </div>
              <div className="text-[10px] text-emerald-500/70 text-center uppercase tracking-wider">
                total completed orders
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Paid Out</p>
            <div className="text-xl sm:text-2xl font-black text-white">${totalPaidOut.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Payouts</p>
            <div className="text-xl sm:text-2xl font-black text-cyan-400">{loading ? "..." : payouts.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pending Orders</p>
            <div className="text-xl sm:text-2xl font-black text-amber-400">{loading ? "..." : pendingEarnings.total.pending_orders}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Successful Payouts</p>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {loading ? "..." : payouts.filter(p => p.status.toLowerCase() === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-900/50 border-gray-700/50 text-white rounded-xl h-10">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white font-bold">
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="XMR">Monero (XMR)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-900/50 border-gray-700/50 text-white rounded-xl h-10">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white font-bold">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="direct">Direct Payment</SelectItem>
                <SelectItem value="escrow">Escrow Payout</SelectItem>
                <SelectItem value="refund">Refund Issued</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="w-full sm:w-auto border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl h-10 font-bold"
              onClick={exportHistory}
            >
              <Download className="w-4 h-4 mr-2" />
              Export History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white px-2">Payout History <span className="text-gray-500 text-base font-normal ml-2">({filteredPayouts.length})</span></h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
            <p className="text-gray-400">Loading payouts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchPayouts} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">Try Again</Button>
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/30 border border-gray-800 border-dashed rounded-xl">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No payouts found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayouts.map((payout) => (
              <Card key={payout.id} className="bg-gray-900/40 border border-gray-700/30 hover:bg-gray-800/40 transition-all group overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start space-x-4 min-w-0 flex-1">
                      <CryptoIcon symbol={payout.method} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-base truncate group-hover:text-cyan-400 transition-colors">{payout.id}</h3>
                          <Badge className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(payout.status)}`}>
                            {payout.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700 bg-gray-900/50">
                            {payout.type === 'escrow' ? 'Escrow' : payout.type === 'refund' ? 'Refund' : 'Direct'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mb-1">Order: {payout.order_id || "N/A"}</p>
                        <div className="flex items-center text-sm text-gray-400 font-mono mb-1">
                          <span className="truncate max-w-[200px] sm:max-w-md">{payout.address}</span>
                          <button onClick={() => copyToClipboard(payout.address)} className="ml-2 hover:text-white transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          {new Date(payout.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 border-t lg:border-t-0 border-gray-800/50 pt-3 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <div className="font-black text-white text-lg">{payout.amount}</div>
                        <div className="text-sm text-gray-400 font-medium">{payout.usdAmount}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {payout.payment_proof_hash && getProofLink(payout.method, payout.payment_proof_hash) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            onClick={() => window.open(getProofLink(payout.method, payout.payment_proof_hash)!, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setModalOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="p-6 border-b border-gray-800/50">
            <CardTitle className="text-lg font-bold text-white flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-cyan-400" />
              Payout Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg">
              <span className="text-gray-400 text-sm">Escrow Orders</span>
              <span className="text-white font-medium text-sm">Auto-release after 2 days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg">
              <span className="text-gray-400 text-sm">Direct Orders</span>
              <span className="text-white font-medium text-sm">Immediate payment</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg">
              <span className="text-gray-400 text-sm">Processing</span>
              <span className="text-white font-medium text-sm">Real-time updates</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="p-6 border-b border-gray-800/50">
            <CardTitle className="text-lg font-bold text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
              Network Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg">
              <span className="text-gray-400 text-sm">BTC Fee</span>
              <span className="text-emerald-400 font-bold text-sm">~0.0001 BTC</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg">
              <span className="text-gray-400 text-sm">XMR Fee</span>
              <span className="text-orange-400 font-bold text-sm">~0.001 XMR</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Fees are dynamic and depend on network congestion.</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Section */}
      <Card className="bg-gray-900/40 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-white flex items-center">
              <Clock className="w-5 h-5 mr-3 text-cyan-500" />
              Incoming Transactions
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTransactionHistory()}
              disabled={transactionsLoading}
              className="text-gray-400 hover:text-white"
            >
              {transactionsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {transactionsLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-3" />
              <p className="text-gray-400 font-medium">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${transaction.type === 'payout' ? 'bg-emerald-500' : 'bg-cyan-500'} shadow-[0_0_8px_rgba(34,211,238,0.5)]`}></div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{transaction.description}</h4>
                        <p className="text-xs text-gray-500">Order: <span className="text-gray-300 font-mono">{transaction.order_id}</span></p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-white text-sm">{transaction.amount}</p>
                      <p className="text-xs text-gray-500">{transaction.usd_amount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-3 border-t border-gray-700/30">
                    <div>
                      <span className="text-gray-500 block mb-1">From</span>
                      <p className="font-mono text-gray-300 truncate">{transaction.from_address}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">To</span>
                      <p className="font-mono text-gray-300 truncate">{transaction.to_address}</p>
                    </div>
                    <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1">
                      <Badge className={`text-[10px] uppercase ${transaction.status === 'completed' || transaction.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-700 text-gray-400'}`}>
                        {transaction.status}
                      </Badge>
                      <span className="text-gray-500">{new Date(transaction.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {transactions.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactionHistory(currentPage - 1)}
                disabled={currentPage === 1 || transactionsLoading}
                className="bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Previous
              </Button>
              <div className="text-sm text-gray-400">Page {currentPage} of {totalPages}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactionHistory(currentPage + 1)}
                disabled={currentPage === totalPages || transactionsLoading}
                className="bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Payout Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 text-white shadow-2xl p-0 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          <DialogHeader className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-cyan-400" />
              {selectedPayout?.type === 'escrow' ? 'Escrow Payout Details' : selectedPayout?.type === 'refund' ? 'Refund Details' : 'Direct Payment Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="p-6 space-y-6">
              {/* Summary Card */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <CryptoIcon symbol={selectedPayout.method} size="xl" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Total Received</p>
                    <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-1">{selectedPayout.amount}</h2>
                    <p className="text-cyan-400 font-bold text-lg">{selectedPayout.usdAmount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-sm px-3 py-1 mb-2 ${getStatusColor(selectedPayout.status)}`}>{selectedPayout.status}</Badge>
                  <p className="text-sm text-gray-500 font-mono">{selectedPayout.id}</p>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-800/20 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Order ID</span>
                      <span className="text-white font-mono">{selectedPayout.order_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white capitalize">{selectedPayout.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date & Time</span>
                      <span className="text-white">
                        {new Date(selectedPayout.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/20 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fees & Net</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gross Amount</span>
                      <span className="text-white font-mono">{selectedPayout.gross_amount || '0.00000000'}</span>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex flex-col">
                        <span className="text-gray-400">Platform Fee</span>
                        <span className="text-[10px] text-gray-500">Rate: {selectedPayout.platform_fee_rate}%</span>
                      </div>
                      <span className="text-red-400">-{selectedPayout.platform_fee || '0.00000000'}</span>
                    </div>
                    {!!selectedPayout.promotion_fee && selectedPayout.promotion_fee !== '0.00' && selectedPayout.promotion_fee !== '0' && (
                      <div className="flex justify-between">
                        <div className="flex flex-col">
                          <span className="text-gray-400">Promotion Fee (Highlighted)</span>
                          <span className="text-[10px] text-gray-500">Extra: {selectedPayout.promotion_fee_rate || 0}%</span>
                        </div>
                        <span className="text-red-400">-{selectedPayout.promotion_fee}</span>
                      </div>
                    )}
                    {selectedPayout.type === 'escrow' && (
                      <div className="flex justify-between">
                        <div className="flex flex-col">
                          <span className="text-gray-400">Escrow Fee</span>
                          <span className="text-[10px] text-gray-500">Rate: {selectedPayout.escrow_fee_rate}%</span>
                        </div>
                        <span className="text-red-400">-{selectedPayout.escrow_fee || '0.00000000'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network Fee (est.)</span>
                      <span className="text-red-400/70">-{selectedPayout.network_fee || '0.00000250'}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t border-gray-700/50">
                      <span className="text-white font-bold text-lg">Net Earnings</span>
                      <span className="text-cyan-400 font-black text-lg">{selectedPayout.amount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Wallet Address */}
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Destination Address</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-300 break-all border border-gray-700/50">
                    {selectedPayout.address}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedPayout.address)} className="h-11 w-11 shrink-0 bg-gray-800 border-gray-700 hover:bg-gray-700">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Transaction Hash */}
              {selectedPayout.txHash && (
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Transaction Hash</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-300 break-all border border-gray-700/50">
                      {selectedPayout.txHash}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedPayout.txHash!)} className="h-11 w-11 shrink-0 bg-gray-800 border-gray-700 hover:bg-gray-700">
                      <Copy className="w-4 h-4" />
                    </Button>
                    {getExplorerLink(selectedPayout.method, selectedPayout.txHash) ? (
                      <Button variant="outline" size="icon" onClick={() => window.open(getExplorerLink(selectedPayout.method, selectedPayout.txHash)!, '_blank')} className="h-11 w-11 shrink-0 bg-gray-800 border-gray-700 hover:bg-gray-700">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                        Internal Reference
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Proof Hash (incoming buyer transaction) */}
              {selectedPayout.payment_proof_hash && (
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Payment Proof</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-300 break-all border border-gray-700/50">
                      {selectedPayout.payment_proof_hash}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedPayout.payment_proof_hash!)} className="h-11 w-11 shrink-0 bg-gray-800 border-gray-700 hover:bg-gray-700">
                      <Copy className="w-4 h-4" />
                    </Button>
                    {getProofLink(selectedPayout.method, selectedPayout.payment_proof_hash) ? (
                      <Button variant="outline" size="icon" onClick={() => window.open(getProofLink(selectedPayout.method, selectedPayout.payment_proof_hash)!, '_blank')} className="h-11 w-11 shrink-0 bg-gray-800 border-gray-700 hover:bg-gray-700">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                        Internal Reference
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}
