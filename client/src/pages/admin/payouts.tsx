
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, Wallet, RefreshCw, Check, X, Clock, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface PayoutData {
  id: number;
  type: 'escrow' | 'direct';
  order_id: string;
  vendor_name: string;
  buyer_name: string;
  crypto_currency: string;
  amount: string;
  gross_amount?: string;
  platform_fee?: string;
  escrow_fee?: string;
  platform_fee_rate?: number;  // Add commission rates
  escrow_fee_rate?: number;     // Add commission rates
  vendor_address: string;
  transaction_hash?: string;
  status: string;
  payment_status: string;  // Add payment status
  order_status: string;    // Add order status
  requested_at?: string;
  processed_at?: string;
  completed_at?: string;
  auto_release_at?: string;
  created_at?: string;
  confirmed_at?: string;
  expires_at?: string;
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPayout, setSelectedPayout] = useState<PayoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [payoutToRelease, setPayoutToRelease] = useState<PayoutData | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  // Fetch payouts from API
  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/admin/payouts/', {
        params: {
          type: typeFilter,
          status: statusFilter,
          search: searchTerm
        }
      });
      
      if (response.data.success) {
        setPayouts(response.data.data);
      } else {
        setError('Failed to fetch payouts');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  // Process payout action (release, cancel)
  const handleReleaseClick = (payout: PayoutData) => {
    setPayoutToRelease(payout);
    setConfirmModalOpen(true);
  };

  const confirmRelease = async () => {
    if (!payoutToRelease) return;
    
    try {
      setIsReleasing(true);
      const response = await api.post('/payments/admin/payouts/', {
        payout_id: payoutToRelease.id,
        action: 'release'
      });
      
      if (response.data.success) {
        // Refresh the data
        fetchPayouts();
        toast({
          title: "Success",
          description: response.data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: 'Failed to release payout',
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || 'Failed to release payout',
        variant: "destructive",
      });
    } finally {
      setIsReleasing(false);
      setConfirmModalOpen(false);
      setPayoutToRelease(null);
    }
  };

  const processPayoutAction = async (payoutId: number, action: string) => {
    try {
      const response = await api.post('/payments/admin/payouts/', {
        payout_id: payoutId,
        action: action
      });
      
      if (response.data.success) {
        // Refresh the data
        fetchPayouts();
        toast({
          title: "Success",
          description: response.data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: 'Failed to process payout action',
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || 'Failed to process payout action',
        variant: "destructive",
      });
    }
  };

  // Fetch transaction history from API
  const fetchTransactionHistory = async (page: number = 1) => {
    try {
      setTransactionsLoading(true);
      const response = await api.get('/payments/admin/transaction-history/', {
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
        toast({
          title: "Error",
          description: "Failed to fetch transaction history",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Transaction history fetch error:', error);
      toast({
        title: "Error", 
        description: error.response?.data?.error || "Failed to fetch transaction history",
        variant: "destructive",
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [typeFilter, statusFilter, searchTerm]);

  const getStatusType = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'awaiting':
        return 'warning';
      case 'ready':
      case 'processing':
        return 'accent';
      case 'completed':
      case 'confirmed':
      case 'paid':
        return 'success';
      case 'failed':
      case 'expired':
      case 'cancelled':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const handleViewDetails = (payout: PayoutData) => {
    setSelectedPayout(payout);
    setModalOpen(true);
  };

  const sampleRefunds = [
    {
      id: 1,
      orderId: "ORD-2844",
      buyer: "privacy_first",
      vendor: "PremiumDigital",
      amount: "0.0015 BTC",
      reason: "Account credentials not working",
      status: "Pending",
      statusType: "warning" as const,
      requestDate: "1 hour ago",
      escrowReleased: false
    },
    {
      id: 2,
      orderId: "ORD-2831",
      buyer: "crypto_buyer_89",
      vendor: "StreamAccounts",
      amount: "0.0008 BTC",
      reason: "Wrong account type delivered",
      status: "Approved",
      statusType: "success" as const,
      requestDate: "4 hours ago",
      escrowReleased: true
    },
    {
      id: 3,
      orderId: "ORD-2823",
      buyer: "anon_user_423",
      vendor: "DigitalServices",
      amount: "0.0012 BTC",
      reason: "Vendor not responding",
      status: "Processing",
      statusType: "accent" as const,
      requestDate: "1 day ago",
      escrowReleased: false
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* API Status */}
        {loading && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-blue-300 mb-6">
            Loading payouts...
          </div>
        )}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300 mb-6">
            API Error: {error}
          </div>
        )}
        {!loading && !error && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-green-300 mb-6">
            Connected! Found {payouts.length} payouts.
            <div className="mt-2 text-sm space-y-1">
              <div className="flex items-center space-x-4">
                <span className="text-blue-300">Escrow: {payouts.filter(p => p.type === 'escrow').length}</span>
                <span className="text-purple-300">Direct: {payouts.filter(p => p.type === 'direct').length}</span>
              </div>
              {payouts.filter(p => p.type === 'escrow').length === 0 && (
                <div className="text-yellow-300 text-xs mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-500/30">
                  💡 <strong>Tip:</strong> Escrow payouts only appear when buyers confirm their orders. 
                  Create an escrow-enabled product order and have the buyer confirm it to see escrow payouts here.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Payouts & Refunds</h1>
            <p className="text-gray-300 mt-1">Manage vendor payouts and customer refund requests</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              Process All
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Pending Payouts</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : payouts.filter(p => p.status === 'pending' || p.status === 'ready').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Wallet className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Pending</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : (() => {
                      const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'ready');
                      const totalBTC = pendingPayouts
                        .filter(p => p.crypto_currency === 'BTC')
                        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
                      const totalXMR = pendingPayouts
                        .filter(p => p.crypto_currency === 'XMR')
                        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
                      
                      if (totalBTC > 0 && totalXMR > 0) {
                        return `${totalBTC.toFixed(4)} BTC + ${totalXMR.toFixed(4)} XMR`;
                      } else if (totalBTC > 0) {
                        return `${totalBTC.toFixed(4)} BTC`;
                      } else if (totalXMR > 0) {
                        return `${totalXMR.toFixed(4)} XMR`;
                      } else {
                        return "0.0000";
                      }
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <RefreshCw className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Failed Payouts</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : payouts.filter(p => p.status === 'failed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Check className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Completed Today</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : (() => {
                      const today = new Date().toDateString();
                      return payouts.filter(p => 
                        p.status === 'completed' && 
                        p.completed_at && 
                        new Date(p.completed_at).toDateString() === today
                      ).length;
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payouts" className="w-full" onValueChange={(value) => {
          if (value === 'history' && transactions.length === 0) {
            fetchTransactionHistory();
          }
        }}>
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="payouts" className="text-gray-300 data-[state=active]:text-white">
              Vendor Payouts
            </TabsTrigger>
            <TabsTrigger value="refunds" className="text-gray-300 data-[state=active]:text-white">
              Customer Refunds
            </TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payouts">
            {/* Filters */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        placeholder="Search by vendor name..." 
                        className="pl-10 bg-surface-2 border-border text-white"
                        data-testid="search-payouts"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="escrow">Escrow</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payouts Table */}
            <Card className="crypto-card border-2 border-border/50 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-surface-2/50 to-surface-2/30 border-b border-border/30">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white text-xl font-semibold">Vendor Payout Requests</CardTitle>
                    <p className="text-gray-400 text-sm mt-1">Manage escrow releases and direct payment tracking</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchPayouts}
                    disabled={loading}
                    className="text-gray-300 hover:text-white hover:bg-surface-2/50 transition-all duration-200"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-surface-2 to-surface-2/80">
                      <tr>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Vendor & Order</th>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Payout Amount</th>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Fees & Commission</th>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Status & Type</th>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Payment Method</th>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Timeline</th>
                        <th className="text-left p-4 text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-surface-2/30 transition-all duration-200 border-b border-border/20" data-testid={`payout-row-${payout.id}`}>
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">{payout.vendor_name}</p>
                              <p className="text-sm text-gray-400">Order: {payout.order_id}</p>
                              <p className="text-xs text-gray-500">Buyer: {payout.buyer_name}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-mono text-white">{payout.amount} {payout.crypto_currency}</p>
                              {payout.type === 'escrow' && payout.gross_amount && (
                                <p className="text-sm text-gray-400">
                                  Gross: {payout.gross_amount} {payout.crypto_currency}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {payout.type === 'escrow' && payout.platform_fee ? (
                              <div>
                                <span className="font-mono text-accent">Platform: {payout.platform_fee} {payout.crypto_currency}</span>
                                {payout.escrow_fee && (
                                  <p className="text-sm text-gray-400">Escrow: {payout.escrow_fee} {payout.crypto_currency}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">Direct Payment</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div>
                                <span className="text-xs text-gray-400">Payment:</span>
                                <StatusBadge 
                                  status={payout.payment_status === 'paid' ? 'Paid' : payout.payment_status} 
                                  type={payout.payment_status === 'paid' ? 'success' : 'warning'} 
                                />
                              </div>
                              <div>
                                <span className="text-xs text-gray-400">Payout:</span>
                                <StatusBadge 
                                  status={payout.status === 'pending' ? 'Awaiting' : payout.status} 
                                  type={getStatusType(payout.status)} 
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Type: {payout.type.toUpperCase()}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-gray-300">
                              {payout.crypto_currency} Address
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1 break-all">
                              {payout.vendor_address.substring(0, 20)}...
                            </p>
                          </td>
                          <td className="p-4 text-gray-300">
                            {payout.type === 'escrow' ? (
                              <div>
                                <p>{payout.requested_at ? new Date(payout.requested_at).toLocaleDateString() : 'N/A'}</p>
                                {payout.auto_release_at && (
                                  <p className="text-xs text-gray-500">
                                    Auto-release: {new Date(payout.auto_release_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <p>{payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}</p>
                                {payout.expires_at && (
                                  <p className="text-xs text-gray-500">
                                    Expires: {new Date(payout.expires_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {(payout.status === "pending" || payout.status === "ready" || payout.status === "failed") && payout.type === 'escrow' && (
                                <Button 
                                  size="sm" 
                                  className={`shadow-lg transition-all duration-200 ${
                                    payout.status === "failed" 
                                      ? "bg-green-500 hover:bg-green-500 hover:shadow-green-500/25" 
                                      : payout.status === "ready"
                                      ? "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25"
                                      : "bg-green-600 hover:bg-green-700 hover:shadow-green-500/25"
                                  } text-white`}
                                  onClick={() => handleReleaseClick(payout)}
                                  data-testid={`approve-payout-${payout.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  {payout.status === "failed" ? "Retry Release" : 
                                   payout.status === "ready" ? "Release Payment" : "Release"}
                                </Button>
                              )}
                              {(payout.status === "pending" || payout.status === "ready" || payout.status === "failed") && (
                                <Button 
                                  variant="destructive"
                                  size="sm" 
                                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25 transition-all duration-200"
                                  onClick={() => processPayoutAction(payout.id, 'cancel')}
                                  data-testid={`reject-payout-${payout.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              <Button 
                                variant="outline"
                                size="sm" 
                                className="text-gray-300 hover:text-white hover:bg-surface-2/50 border-border/50 transition-all duration-200" 
                                onClick={() => handleViewDetails(payout)}
                                data-testid={`view-payout-${payout.id}`}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {loading && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center">
                            <div className="space-y-4">
                              <div className="w-16 h-16 mx-auto bg-surface-2 rounded-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-gray-400 text-lg font-medium">Loading payouts...</div>
                                <div className="text-gray-500 text-sm">
                                  Fetching payout data from the blockchain
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {payouts.length === 0 && !loading && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center">
                            <div className="space-y-4">
                              <div className="w-16 h-16 mx-auto bg-surface-2 rounded-full flex items-center justify-center">
                                <Wallet className="w-8 h-8 text-gray-500" />
                              </div>
                              <div className="space-y-2">
                                <div className="text-gray-400 text-lg font-medium">No payouts found</div>
                                <div className="text-gray-500 text-sm max-w-md mx-auto space-y-1">
                                  <p>• <strong className="text-blue-400">Escrow payouts</strong> appear when buyers confirm orders</p>
                                  <p>• <strong className="text-purple-400">Direct payments</strong> appear when orders are created</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds">
            {/* Refunds Table */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Customer Refund Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Order ID</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Buyer</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Amount</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Reason</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Requested</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sampleRefunds.map((refund) => (
                        <tr key={refund.id} className="hover:bg-surface-2/50" data-testid={`refund-row-${refund.id}`}>
                          <td className="p-4">
                            <span className="font-mono text-accent">{refund.orderId}</span>
                          </td>
                          <td className="p-4 text-white">{refund.buyer}</td>
                          <td className="p-4 text-gray-300">{refund.vendor}</td>
                          <td className="p-4">
                            <span className="font-mono text-white">{refund.amount}</span>
                          </td>
                          <td className="p-4">
                            <div className="max-w-xs">
                              <p className="text-gray-300 truncate">{refund.reason}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={refund.status} type={refund.statusType} />
                          </td>
                          <td className="p-4 text-gray-300">{refund.requestDate}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {refund.status === "Pending" && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`approve-refund-${refund.id}`}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`reject-refund-${refund.id}`}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-refund-${refund.id}`}>
                                View Order
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="crypto-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-white">Transaction History</CardTitle>
                  <Button
                    variant="outline" 
                    size="sm" 
                    onClick={fetchTransactionHistory}
                    disabled={transactionsLoading}
                    className="text-gray-300 hover:text-white hover:bg-surface-2/50 transition-all duration-200"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    <span className="ml-3 text-gray-400">Loading transaction history...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No transactions found</p>
                    <p className="text-sm text-gray-500 mt-2">Transaction history will appear here as payments are processed</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="bg-surface-2 border border-border rounded-lg p-4 hover:bg-surface-2/80 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              transaction.type === 'incoming_payment' ? 'bg-green-500' :
                              transaction.type === 'escrow_payout' ? 'bg-blue-500' :
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
                            <StatusBadge status={transaction.status} type={getStatusType(transaction.status)} />
                          </div>
                        </div>
                        
                        {transaction.transaction_hash && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-gray-400 text-sm">Transaction Hash:</span>
                            <p className="font-mono text-white text-xs break-all">{transaction.transaction_hash}</p>
                          </div>
                        )}
                        
                        <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-gray-400">
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
          </TabsContent>
        </Tabs>

        {/* Payout Details Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-surface to-surface-2 text-white border-2 border-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                {selectedPayout?.type === 'escrow' ? 'Escrow Payout Details' : 'Direct Payment Details'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedPayout && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-surface-2 border-border">
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
                        <StatusBadge status={selectedPayout.status} type={getStatusType(selectedPayout.status)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-surface-2 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vendor:</span>
                        <span className="text-white">{selectedPayout.vendor_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Buyer:</span>
                        <span className="text-white">{selectedPayout.buyer_name}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Details */}
                <Card className="bg-surface-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cryptocurrency:</span>
                        <Badge variant="outline">{selectedPayout.crypto_currency}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="font-mono text-white">{selectedPayout.amount} {selectedPayout.crypto_currency}</span>
                      </div>
                    </div>
                    
                    {selectedPayout.type === 'escrow' && (
                      <>
                        {selectedPayout.gross_amount && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Gross Amount:</span>
                            <span className="font-mono text-white">{selectedPayout.gross_amount} {selectedPayout.crypto_currency}</span>
                          </div>
                        )}
                        {selectedPayout.platform_fee && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Platform Fee ({selectedPayout.platform_fee_rate || 0}%):</span>
                            <span className="font-mono text-accent">{selectedPayout.platform_fee} {selectedPayout.crypto_currency}</span>
                          </div>
                        )}
                        {selectedPayout.escrow_fee && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Escrow Fee ({selectedPayout.escrow_fee_rate || 0}%):</span>
                            <span className="font-mono text-accent">{selectedPayout.escrow_fee} {selectedPayout.crypto_currency}</span>
                          </div>
                        )}
                        <Separator className="bg-border" />
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">Net Amount to Vendor:</span>
                          <span className="font-mono text-green-400">{selectedPayout.amount} {selectedPayout.crypto_currency}</span>
                        </div>
                      </>
                    )}
                    
                    <Separator className="bg-border" />
                    
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vendor Wallet Address:</span>
                      <div className="text-right">
                        <p className="font-mono text-white break-all">{selectedPayout.vendor_address}</p>
                        <Badge variant="outline" className="mt-1">Vendor's {selectedPayout.crypto_currency} Address</Badge>
                      </div>
                    </div>
                    
                    {selectedPayout.transaction_hash && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transaction Hash:</span>
                        <div className="text-right">
                          <p className="font-mono text-white break-all">{selectedPayout.transaction_hash}</p>
                          <Badge variant="outline" className="mt-1">Blockchain Transaction</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timestamps */}
                <Card className="bg-surface-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPayout.type === 'escrow' ? (
                      <>
                        {selectedPayout.requested_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Requested At:</span>
                            <span className="text-white">{new Date(selectedPayout.requested_at).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedPayout.processed_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Processed At:</span>
                            <span className="text-white">{new Date(selectedPayout.processed_at).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedPayout.completed_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Completed At:</span>
                            <span className="text-white">{new Date(selectedPayout.completed_at).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedPayout.auto_release_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Auto-Release Scheduled:</span>
                            <span className="text-yellow-400">{new Date(selectedPayout.auto_release_at).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {selectedPayout.created_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Created At:</span>
                            <span className="text-white">{new Date(selectedPayout.created_at).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedPayout.confirmed_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Confirmed At:</span>
                            <span className="text-white">{new Date(selectedPayout.confirmed_at).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedPayout.expires_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Expires At:</span>
                            <span className="text-red-400">{new Date(selectedPayout.expires_at).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {selectedPayout.status === "pending" && selectedPayout.type === 'escrow' && (
                  <Card className="bg-surface-2 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Admin Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-3">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            processPayoutAction(selectedPayout.id, 'release');
                            setModalOpen(false);
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Release Payment
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => {
                            processPayoutAction(selectedPayout.id, 'cancel');
                            setModalOpen(false);
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Payout
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Releasing will send {selectedPayout.amount} {selectedPayout.crypto_currency} to the vendor's wallet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Release Confirmation Modal */}
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent className="max-w-md bg-gradient-to-br from-surface to-surface-2 text-white border-2 border-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center">
                <Check className="w-6 h-6 mr-2 text-green-400" />
                {payoutToRelease?.status === "failed" ? "Retry Escrow Release" : 
                 payoutToRelease?.status === "ready" ? "Release Escrow Payment" : "Confirm Escrow Release"}
              </DialogTitle>
            </DialogHeader>
            
            {payoutToRelease && (
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${
                  payoutToRelease.status === "failed" 
                    ? "bg-red-900/20 border-red-500/30" 
                    : payoutToRelease.status === "ready"
                    ? "bg-blue-900/20 border-blue-500/30"
                    : "bg-yellow-900/20 border-yellow-500/30"
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      payoutToRelease.status === "failed" ? "bg-red-400" : 
                      payoutToRelease.status === "ready" ? "bg-blue-400" : "bg-yellow-400"
                    }`}></div>
                    <span className={`font-semibold ${
                      payoutToRelease.status === "failed" ? "text-red-300" : 
                      payoutToRelease.status === "ready" ? "text-blue-300" : "text-yellow-300"
                    }`}>
                      {payoutToRelease.status === "failed" ? "🔄 Retry Payment" : 
                       payoutToRelease.status === "ready" ? "💰 Payment Ready" : "⚠️ Important"}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    payoutToRelease.status === "failed" ? "text-red-200" : 
                    payoutToRelease.status === "ready" ? "text-blue-200" : "text-yellow-200"
                  }`}>
                    {payoutToRelease.status === "failed" 
                      ? "Retry sending the cryptocurrency from the admin wallet to the vendor's wallet."
                      : payoutToRelease.status === "ready"
                      ? "Payment is confirmed and ready to be released to the vendor's wallet."
                      : "This action will send crypto from the escrew wallet to the vendor's wallet."
                    }
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Vendor:</span>
                    <span className="text-white font-semibold">{payoutToRelease.vendor_name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Order ID:</span>
                    <span className="text-white font-mono">{payoutToRelease.order_id}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Amount to Send:</span>
                    <span className="text-green-400 font-bold text-lg">
                      {payoutToRelease.amount} {payoutToRelease.crypto_currency}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Vendor Address:</span>
                    <span className="text-white font-mono text-sm break-all">
                      {payoutToRelease.vendor_address}
                    </span>
                  </div>
                  
                  {payoutToRelease.platform_fee && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Platform Fee:</span>
                      <span className="text-blue-400">{payoutToRelease.platform_fee} {payoutToRelease.crypto_currency}</span>
                    </div>
                  )}
                  
                  {payoutToRelease.escrow_fee && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Escrow Fee:</span>
                      <span className="text-purple-400">{payoutToRelease.escrow_fee} {payoutToRelease.crypto_currency}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setConfirmModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    className={`text-white flex-1 ${
                      payoutToRelease.status === "failed" 
                        ? "bg-orange-500 hover:bg-orange-600" 
                        : payoutToRelease.status === "ready"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    onClick={confirmRelease}
                    disabled={isReleasing}
                  >
                    {isReleasing ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {payoutToRelease.status === "failed" ? "Retry Release" : 
                         payoutToRelease.status === "ready" ? "Release Payment" : "Confirm Release"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    
  );
}
