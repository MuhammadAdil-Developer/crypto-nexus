import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Download, TrendingUp, Clock, CheckCircle, Copy, ExternalLink } from "lucide-react";
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
  order_id?: string;
  type?: 'escrow' | 'direct';
  gross_amount?: string;
  platform_fee?: string;
  escrow_fee?: string;
  platform_fee_rate?: number;
  escrow_fee_rate?: number;
}

interface PendingEarnings {
  btc: { amount: string; usd: string; orders: number };
  xmr: { amount: string; usd: string; orders: number };
  total: { usd: string; orders: number };
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "processing":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "ready":
      return "bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20";
    case "pending":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
    case "failed":
      return "bg-theme-red/10 text-theme-red border-theme-red/20";
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
    btc: { amount: "0.0000", usd: "$0.00", orders: 0 },
    xmr: { amount: "0.0000", usd: "$0.00", orders: 0 },
    total: { usd: "$0.00", orders: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState("all");
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
        setPendingEarnings({
          btc: {
            amount: pendingData.btc?.amount || "0.0000",
            usd: pendingData.btc?.usd || "$0.00",
            orders: pendingData.btc?.orders || 0
          },
          xmr: {
            amount: pendingData.xmr?.amount || "0.0000",
            usd: pendingData.xmr?.usd || "$0.00",
            orders: pendingData.xmr?.orders || 0
          },
          total: {
            usd: pendingData.total?.usd || "$0.00",
            orders: pendingData.total?.orders || 0
          }
        });
      } else {
        setError('Failed to fetch payout data');
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

  const filteredPayouts = payouts.filter(payout =>
    filterMethod === "all" || payout.method === filterMethod
  );

  const totalPaidOut = payouts
    .filter(p => p.status === "Completed" || p.status === "completed")
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

  return (

    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Payouts & Earnings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Manage your earnings and funds history</p>
        </div>
        <Button
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto text-xs sm:text-sm"
          onClick={fetchPayouts}
          disabled={loading}
        >
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border-theme-cyan/30 bg-gradient-to-br from-theme-cyan/10 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-theme-cyan">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <Badge className="bg-theme-cyan text-black hover:bg-theme-cyan/80 text-xs sm:text-sm">BTC</Badge>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {loading ? "..." : `${pendingEarnings.btc.amount} BTC`}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">≈ {loading ? "..." : pendingEarnings.btc.usd}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{loading ? "..." : `${pendingEarnings.btc.orders} pending orders`}</p>
          </CardContent>
        </Card>

        <Card className="border-theme-cyan/30 bg-gradient-to-br from-theme-cyan/10 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-theme-cyan">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <Badge className="bg-theme-cyan text-black hover:bg-theme-cyan/80 text-xs sm:text-sm">XMR</Badge>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {loading ? "..." : `${pendingEarnings.xmr.amount} XMR`}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">≈ {loading ? "..." : pendingEarnings.xmr.usd}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{loading ? "..." : `${pendingEarnings.xmr.orders} pending orders`}</p>
          </CardContent>
        </Card>

        <Card className="border-theme-red/30 bg-gradient-to-br from-theme-red/10 to-transparent sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-theme-red">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <Badge className="bg-theme-red text-white hover:bg-theme-red/80 text-xs sm:text-sm">TOTAL</Badge>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">{loading ? "..." : pendingEarnings.total.usd}</div>
            <p className="text-xs sm:text-sm text-gray-400">Total Pending</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{loading ? "..." : `${pendingEarnings.total.orders} total orders`}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-cyan">${totalPaidOut.toLocaleString()}</div>
            <p className="text-xs sm:text-sm text-gray-400">Total Paid Out</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-cyan">{loading ? "..." : payouts.length}</div>
            <p className="text-xs sm:text-sm text-gray-400">Total Payouts</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-red">{loading ? "..." : pendingEarnings.total.orders}</div>
            <p className="text-xs sm:text-sm text-gray-400">Pending Orders</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-theme-cyan">
              {loading ? "..." : payouts.filter(p => p.status === "Completed" || p.status === "completed").length}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">Successful Payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="XMR">Monero (XMR)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
              <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              Export History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-white">
            Payout History ({loading ? "..." : filteredPayouts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col sm:flex-row items-center justify-center py-8 gap-3">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-theme-cyan"></div>
              <span className="text-gray-400 text-sm sm:text-base">Loading payouts...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4 text-sm sm:text-base">{error}</p>
              <Button onClick={fetchPayouts} variant="outline" className="text-xs sm:text-sm">
                Try Again
              </Button>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm sm:text-base">No payouts found</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-theme-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-theme-cyan" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">{payout.id}</h3>
                        <Badge className={`text-[10px] sm:text-xs ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {payout.method}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 break-words">
                        To: {payout.address.substring(0, 8)}...{payout.address.substring(payout.address.length - 6)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-auto p-0"
                          onClick={() => copyToClipboard(payout.address)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{payout.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end space-x-3 sm:space-x-4 lg:space-x-6 flex-shrink-0">
                    <div className="text-right lg:text-right">
                      <div className="font-semibold text-white text-sm sm:text-base">{payout.amount}</div>
                      <div className="text-xs sm:text-sm text-gray-400">{payout.usdAmount}</div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-2">
                      {payout.status === "Completed" ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-theme-cyan" />
                      ) : payout.status === "Processing" ? (
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-theme-cyan" />
                      ) : null}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPayout(payout);
                          setModalOpen(true);
                        }}
                        className="text-theme-cyan hover:text-theme-cyan/80 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </Button>

                      {payout.txHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(`https://blockchair.com/${payout.method.toLowerCase()}/transaction/${payout.txHash}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Information */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-white">Payout Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Payout Information</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Escrow Orders:</span>
                  <span className="font-medium text-white break-words text-right">Auto-release after 7 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Direct Orders:</span>
                  <span className="font-medium text-white break-words text-right">Immediate payment</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Processing:</span>
                  <span className="font-medium text-white break-words text-right">Real-time updates</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Support:</span>
                  <span className="font-medium text-white break-words text-right">24/7 assistance</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Network Fees</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">BTC Network Fee:</span>
                  <span className="font-medium text-white break-words text-right">~0.0001 BTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">XMR Network Fee:</span>
                  <span className="font-medium text-white break-words text-right">~0.001 XMR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee Calculation:</span>
                  <span className="font-medium text-white break-words text-right">Dynamic</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 break-words">
                Network fees are automatically calculated based on current network conditions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Section */}
      <Card className="border border-gray-700 bg-gray-900">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <CardTitle className="text-lg sm:text-xl font-bold text-white flex items-center">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 sm:mr-3 text-theme-cyan" />
              Transaction History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactionHistory()}
              disabled={transactionsLoading}
              className="text-gray-300 hover:text-white hover:bg-gray-700 w-full sm:w-auto text-xs sm:text-sm"
            >
              {transactionsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {transactionsLoading ? (
            <div className="flex flex-col sm:flex-row items-center justify-center py-8 gap-3">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-theme-cyan"></div>
              <span className="text-gray-400 text-sm sm:text-base">Loading transaction history...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-400 text-sm sm:text-base">No transactions found</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Your transaction history will appear here as payments are received</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${transaction.type === 'payout' ? 'bg-theme-cyan' :
                        transaction.type === 'direct_payment' ? 'bg-theme-cyan' :
                          'bg-theme-red'
                        }`}></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white text-sm sm:text-base break-words">{transaction.description}</h3>
                        <p className="text-xs sm:text-sm text-gray-400">Order: {transaction.order_id}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="font-bold text-white text-sm sm:text-base">{transaction.amount}</p>
                      <p className="text-xs sm:text-sm text-gray-400">{transaction.usd_amount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-400">From:</span>
                      <p className="font-mono text-white text-[10px] sm:text-xs break-all">{transaction.from_address}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">To:</span>
                      <p className="font-mono text-white text-[10px] sm:text-xs break-all">{transaction.to_address}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <span className="text-gray-400">Status:</span>
                      <div className="mt-1">
                        <Badge className={`text-[10px] sm:text-xs ${transaction.status === 'completed' || transaction.status === 'confirmed' ? 'bg-theme-cyan/10 text-theme-cyan' :
                          transaction.status === 'pending' ? 'bg-theme-red/10 text-theme-red' :
                            transaction.status === 'failed' ? 'bg-theme-red text-white' :
                              'bg-gray-500 text-white'
                          }`}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {transaction.transaction_hash && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <span className="text-gray-400 text-xs sm:text-sm">Transaction Hash:</span>
                      <p className="font-mono text-white text-[10px] sm:text-xs break-all">{transaction.transaction_hash}</p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-700 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0 text-[10px] sm:text-xs text-gray-400">
                    <span>Type: {transaction.type.replace('_', ' ').toUpperCase()}</span>
                    <span>{new Date(transaction.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {transactions.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-700">
              <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length} transactions
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactionHistory(currentPage - 1)}
                  disabled={currentPage === 1 || transactionsLoading}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm"
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;

                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => fetchTransactionHistory(page)}
                        disabled={transactionsLoading}
                        className={`text-xs sm:text-sm ${page === currentPage
                          ? "bg-theme-cyan text-black border-theme-cyan"
                          : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactionHistory(currentPage + 1)}
                  disabled={currentPage === totalPages || transactionsLoading}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 text-white border-2 border-gray-700 shadow-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl font-bold text-white">
              {selectedPayout?.type === 'escrow' ? 'Escrow Payout Details' : 'Direct Payment Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-lg text-white">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Order ID:</span>
                      <span className="font-mono text-white text-xs sm:text-sm break-all">{selectedPayout.order_id}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Payment Type:</span>
                      <Badge variant={selectedPayout.type === 'escrow' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs w-fit">
                        {selectedPayout.type === 'escrow' ? 'Escrow' : 'Direct Payment'}
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Status:</span>
                      <Badge className={`text-[10px] sm:text-xs ${getStatusColor(selectedPayout.status)} w-fit`}>
                        {selectedPayout.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-lg text-white">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Amount:</span>
                      <span className="font-semibold text-white text-xs sm:text-sm break-words">{selectedPayout.amount}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">USD Value:</span>
                      <span className="font-semibold text-white text-xs sm:text-sm break-words">{selectedPayout.usdAmount}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Cryptocurrency:</span>
                      <span className="font-semibold text-white text-xs sm:text-sm">{selectedPayout.method}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Date:</span>
                      <span className="text-white text-xs sm:text-sm">{selectedPayout.date}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Wallet Address */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-sm sm:text-lg text-white">Wallet Address</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 p-2 sm:p-3 bg-gray-700 rounded-lg">
                      <p className="font-mono text-white text-[10px] sm:text-sm break-all">{selectedPayout.address}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedPayout.address)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-2"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-sm sm:text-lg text-white">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <span className="text-gray-400 text-xs sm:text-sm">Cryptocurrency:</span>
                      <p className="font-semibold text-white text-xs sm:text-sm">{selectedPayout.method}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs sm:text-sm">Amount:</span>
                      <p className="font-semibold text-white text-xs sm:text-sm break-words">{selectedPayout.amount}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Gross Amount:</span>
                      <span className="text-white text-xs sm:text-sm break-words">{selectedPayout.gross_amount || '0.00000000'} {selectedPayout.method}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Platform Fee ({selectedPayout.platform_fee_rate || 0}%):</span>
                      <span className="text-theme-red text-xs sm:text-sm break-words">-{selectedPayout.platform_fee || '0.00000000'} {selectedPayout.method}</span>
                    </div>
                    {selectedPayout.type === 'escrow' && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                        <span className="text-gray-400 text-xs sm:text-sm">Escrow Fee ({selectedPayout.escrow_fee_rate || 0}%):</span>
                        <span className="text-theme-red text-xs sm:text-sm break-words">-{selectedPayout.escrow_fee || '0.00000000'} {selectedPayout.method}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-600 pt-2 sm:pt-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                        <span className="text-gray-400 font-semibold text-xs sm:text-sm">Net Amount to Vendor:</span>
                        <span className="text-theme-cyan font-bold text-xs sm:text-sm break-words">{selectedPayout.amount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-sm sm:text-lg text-white">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-400 text-xs sm:text-sm">Requested At:</span>
                    <span className="text-white text-xs sm:text-sm break-words">{selectedPayout.date}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-400 text-xs sm:text-sm">Processed At:</span>
                    <span className="text-white text-xs sm:text-sm break-words">
                      {selectedPayout.status === 'completed' || selectedPayout.status === 'confirmed'
                        ? new Date(new Date(selectedPayout.date).getTime() + 30 * 60 * 1000).toLocaleString() // 30 minutes later
                        : 'Pending'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-400 text-xs sm:text-sm">Completed At:</span>
                    <span className="text-white text-xs sm:text-sm break-words">
                      {selectedPayout.status === 'completed' || selectedPayout.status === 'confirmed'
                        ? new Date(new Date(selectedPayout.date).getTime() + 45 * 60 * 1000).toLocaleString() // 45 minutes later
                        : 'Pending'}
                    </span>
                  </div>
                  {selectedPayout.type === 'escrow' && selectedPayout.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-400 text-xs sm:text-sm">Auto-Release Scheduled:</span>
                      <span className="text-theme-cyan text-xs sm:text-sm font-medium break-words">
                        {new Date(new Date(selectedPayout.date).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction Hash */}
              {selectedPayout.txHash && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-lg text-white">Transaction Hash</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1 p-2 sm:p-3 bg-gray-700 rounded-lg">
                        <p className="font-mono text-white text-[10px] sm:text-sm break-all">{selectedPayout.txHash}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(selectedPayout.txHash!)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-2"
                        >
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://blockchair.com/${selectedPayout.method.toLowerCase()}/transaction/${selectedPayout.txHash}`, '_blank')}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 h-8 w-8 sm:h-auto sm:w-auto p-0 sm:p-2"
                        >
                          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}
