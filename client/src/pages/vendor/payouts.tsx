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
      return "bg-green-600 text-white border-green-600";
    case "processing":
      return "bg-blue-600 text-white border-blue-600";
    case "ready":
      return "bg-blue-600 text-white border-blue-600";
    case "pending":
      return "bg-yellow-600 text-white border-yellow-600";
    case "failed":
      return "bg-red-600 text-white border-red-600";
    case "cancelled":
      return "bg-gray-600 text-white border-gray-600";
    default:
      return "bg-gray-600 text-white border-gray-600";
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
    navigator.clipboard.writeText(text);
  };

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Payouts & Earnings</h1>
            <p className="text-gray-400">Manage your earnings and funds history</p>
          </div>
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={fetchPayouts}
            disabled={loading}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-orange-500/30 bg-gradient-to-br from-orange-900/20 to-orange-800/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-orange-400">
                  <Wallet className="w-8 h-8" />
                </div>
                <Badge className="bg-orange-500 text-white">BTC</Badge>
              </div>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : `${pendingEarnings.btc.amount} BTC`}
              </div>
              <p className="text-sm text-gray-400">≈ {loading ? "..." : pendingEarnings.btc.usd}</p>
              <p className="text-xs text-gray-400 mt-1">{loading ? "..." : `${pendingEarnings.btc.orders} pending orders`}</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-500/30 bg-gradient-to-br from-gray-900/20 to-gray-800/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <Wallet className="w-8 h-8" />
                </div>
                <Badge className="bg-gray-600 text-white">XMR</Badge>
              </div>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : `${pendingEarnings.xmr.amount} XMR`}
              </div>
              <p className="text-sm text-gray-400">≈ {loading ? "..." : pendingEarnings.xmr.usd}</p>
              <p className="text-xs text-gray-400 mt-1">{loading ? "..." : `${pendingEarnings.xmr.orders} pending orders`}</p>
            </CardContent>
          </Card>

          <Card className="border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-blue-800/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-blue-400">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <Badge className="bg-blue-500 text-white">TOTAL</Badge>
              </div>
              <div className="text-2xl font-bold text-white">{loading ? "..." : pendingEarnings.total.usd}</div>
              <p className="text-sm text-gray-400">Total Pending</p>
              <p className="text-xs text-gray-400 mt-1">{loading ? "..." : `${pendingEarnings.total.orders} total orders`}</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">${totalPaidOut.toLocaleString()}</div>
              <p className="text-sm text-gray-400">Total Paid Out</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{loading ? "..." : payouts.length}</div>
              <p className="text-sm text-gray-400">Total Payouts</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">{loading ? "..." : pendingEarnings.total.orders}</div>
              <p className="text-sm text-gray-400">Pending Orders</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">
                {loading ? "..." : payouts.filter(p => p.status === "Completed" || p.status === "completed").length}
              </div>
              <p className="text-sm text-gray-400">Successful Payouts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="XMR">Monero (XMR)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Payout History ({loading ? "..." : filteredPayouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-400">Loading payouts...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={fetchPayouts} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No payouts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-white">{payout.id}</h3>
                        <Badge className={`text-xs ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {payout.method}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
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
                      <p className="text-xs text-gray-400">{payout.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-white">{payout.amount}</div>
                      <div className="text-sm text-gray-400">{payout.usdAmount}</div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {payout.status === "Completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : payout.status === "Processing" ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : null}
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedPayout(payout);
                          setModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Details
                      </Button>
                      
                      {payout.txHash && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(`https://blockchair.com/${payout.method.toLowerCase()}/transaction/${payout.txHash}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
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
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Payout Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-3">Payout Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Escrow Orders:</span>
                    <span className="font-medium">Auto-release after 7 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Direct Orders:</span>
                    <span className="font-medium">Immediate payment</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Processing:</span>
                    <span className="font-medium">Real-time updates</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Support:</span>
                    <span className="font-medium">24/7 assistance</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-3">Network Fees</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">BTC Network Fee:</span>
                    <span className="font-medium">~0.0001 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">XMR Network Fee:</span>
                    <span className="font-medium">~0.001 XMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fee Calculation:</span>
                    <span className="font-medium">Dynamic</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Network fees are automatically calculated based on current network conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History Section */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white flex items-center">
                <Wallet className="w-6 h-6 mr-3 text-orange-400" />
                Transaction History
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchTransactionHistory}
                disabled={transactionsLoading}
                className="text-gray-300 hover:text-white hover:bg-gray-700"
              >
                {transactionsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-gray-400">Loading transaction history...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No transactions found</p>
                <p className="text-sm text-gray-500 mt-2">Your transaction history will appear here as payments are received</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.type === 'payout' ? 'bg-green-500' :
                          transaction.type === 'direct_payment' ? 'bg-blue-500' :
                          'bg-orange-500'
                        }`}></div>
                        <div>
                          <h3 className="font-semibold text-white">{transaction.description}</h3>
                          <p className="text-sm text-gray-400">Order: {transaction.order_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{transaction.amount}</p>
                        <p className="text-sm text-gray-400">{transaction.usd_amount}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">From:</span>
                        <p className="font-mono text-white text-xs">{transaction.from_address}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">To:</span>
                        <p className="font-mono text-white text-xs">{transaction.to_address}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <Badge className={`text-xs ${
                          transaction.status === 'completed' || transaction.status === 'confirmed' ? 'bg-green-500 text-white' :
                          transaction.status === 'pending' ? 'bg-yellow-500 text-white' :
                          transaction.status === 'failed' ? 'bg-red-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {transaction.transaction_hash && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <span className="text-gray-400 text-sm">Transaction Hash:</span>
                        <p className="font-mono text-white text-xs break-all">{transaction.transaction_hash}</p>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-400">
                      <span>Type: {transaction.type.replace('_', ' ').toUpperCase()}</span>
                      <span>{new Date(transaction.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {transactions.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTransactionHistory(currentPage - 1)}
                    disabled={currentPage === 1 || transactionsLoading}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
                          className={
                            page === currentPage 
                              ? "bg-blue-600 text-white border-blue-600" 
                              : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 text-white border-2 border-gray-700 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                {selectedPayout?.type === 'escrow' ? 'Escrow Payout Details' : 'Direct Payment Details'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedPayout && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order ID:</span>
                        <span className="font-mono text-white">{selectedPayout.order_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment Type:</span>
                        <Badge variant={selectedPayout.type === 'escrow' ? 'default' : 'secondary'}>
                          {selectedPayout.type === 'escrow' ? 'Escrow' : 'Direct Payment'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <Badge className={`text-xs ${getStatusColor(selectedPayout.status)}`}>
                          {selectedPayout.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Payment Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="font-semibold text-white">{selectedPayout.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">USD Value:</span>
                        <span className="font-semibold text-white">{selectedPayout.usdAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cryptocurrency:</span>
                        <span className="font-semibold text-white">{selectedPayout.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white">{selectedPayout.date}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Wallet Address */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Wallet Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 p-3 bg-gray-700 rounded-lg">
                        <p className="font-mono text-white text-sm break-all">{selectedPayout.address}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(selectedPayout.address)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400">Cryptocurrency:</span>
                        <p className="font-semibold text-white">{selectedPayout.method}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <p className="font-semibold text-white">{selectedPayout.amount}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gross Amount:</span>
                        <span className="text-white">{selectedPayout.gross_amount || '0.00000000'} {selectedPayout.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform Fee ({selectedPayout.platform_fee_rate || 0}%):</span>
                        <span className="text-red-400">-{selectedPayout.platform_fee || '0.00000000'} {selectedPayout.method}</span>
                      </div>
                      {selectedPayout.type === 'escrow' && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Escrow Fee ({selectedPayout.escrow_fee_rate || 0}%):</span>
                          <span className="text-red-400">-{selectedPayout.escrow_fee || '0.00000000'} {selectedPayout.method}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Net Amount to Vendor:</span>
                          <span className="text-green-400 font-bold">{selectedPayout.amount}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Requested At:</span>
                      <span className="text-white">{selectedPayout.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Processed At:</span>
                      <span className="text-white">
                        {selectedPayout.status === 'completed' || selectedPayout.status === 'confirmed' 
                          ? new Date(new Date(selectedPayout.date).getTime() + 30 * 60 * 1000).toLocaleString() // 30 minutes later
                          : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed At:</span>
                      <span className="text-white">
                        {selectedPayout.status === 'completed' || selectedPayout.status === 'confirmed'
                          ? new Date(new Date(selectedPayout.date).getTime() + 45 * 60 * 1000).toLocaleString() // 45 minutes later
                          : 'Pending'}
                      </span>
                    </div>
                    {selectedPayout.type === 'escrow' && selectedPayout.status === 'pending' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Auto-Release Scheduled:</span>
                        <span className="text-yellow-400">
                          {new Date(new Date(selectedPayout.date).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Transaction Hash */}
                {selectedPayout.txHash && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Transaction Hash</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 p-3 bg-gray-700 rounded-lg">
                          <p className="font-mono text-white text-sm break-all">{selectedPayout.txHash}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(selectedPayout.txHash!)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`https://blockchair.com/${selectedPayout.method.toLowerCase()}/transaction/${selectedPayout.txHash}`, '_blank')}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
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