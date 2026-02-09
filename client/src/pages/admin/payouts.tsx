
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, Wallet, RefreshCw, Check, X, Clock, Download, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLocation, useNavigate } from "react-router-dom";
import paymentService from "@/services/paymentService";
import { Pagination } from "@/components/ui/pagination";

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
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<any | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showPayoutPrompt, setShowPayoutPrompt] = useState(false);
  const [isBulkReleasing, setIsBulkReleasing] = useState(false);

  // Manual Payout State
  const [manualPayoutOpen, setManualPayoutOpen] = useState(false);
  const [manualPayoutData, setManualPayoutData] = useState({
    currency: 'BTC',
    address: '',
    amount: '',
    order_id: '',
    notes: ''
  });
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [lookups, setLookups] = useState<{ addresses: any[], orders: any[] }>({ addresses: [], orders: [] });
  const [addressPopoverOpen, setAddressPopoverOpen] = useState(false);
  const [orderPopoverOpen, setOrderPopoverOpen] = useState(false);

  const fetchLookups = async () => {
    try {
      const response = await api.get('/payments/admin/manual-payout/lookups/');
      if (response.data.success) {
        setLookups({
          addresses: response.data.addresses || [],
          orders: response.data.orders || []
        });
      }
    } catch (err) {
      console.error("Failed to fetch manual payout lookups", err);
    }
  };

  useEffect(() => {
    if (manualPayoutOpen) {
      fetchLookups();
    }
  }, [manualPayoutOpen]);

  const handleManualPayout = async () => {
    if (!manualPayoutData.address || !manualPayoutData.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Address & Amount)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingManual(true);
      const response = await api.post('/payments/admin/manual-payout/', manualPayoutData);

      if (response.data.success) {
        toast({
          title: "Success",
          description: response.data.message,
          variant: "default",
        });
        setManualPayoutOpen(false);
        setManualPayoutData({
          currency: 'BTC',
          address: '',
          amount: '',
          order_id: '',
          notes: ''
        });
        fetchPayouts();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to send manual payout",
        variant: "destructive",
      });
    } finally {
      setIsSendingManual(false);
    }
  };

  // Fetch payouts from API
  const fetchPayouts = async (page: number = 1, limit: number = itemsPerPage) => {
    try {
      setLoading(true);
      const response = await api.get('/payments/admin/payouts/', {
        params: {
          type: typeFilter,
          status: statusFilter,
          search: searchTerm,
          page: page,
          limit: limit
        }
      });

      if (response.data.success) {
        setPayouts(response.data.data);
        setTotalItems(response.data.total || response.data.data.length);
        setTotalPages(response.data.total_pages || 1);
        setCurrentPage(page);
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
        setTotalItems(response.data.total || response.data.data.length);
        setTotalPages(Math.ceil((response.data.total || response.data.data.length) / itemsPerPage));
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
    fetchPayouts(1);
  }, [typeFilter, statusFilter, searchTerm, itemsPerPage]);

  // Fetch refunds for admin customer-refund section
  const fetchRefunds = async (page: number = 1, limit: number = itemsPerPage) => {
    try {
      setRefundsLoading(true);
      const response = await api.get('/payments/admin/refunds/', {
        params: {
          page,
          limit
        }
      });
      if (response.data && response.data.success) {
        setRefunds(response.data.data || []);
        setTotalItems(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / limit));
        setCurrentPage(page);
      } else if (response.data && Array.isArray(response.data)) {
        // fallback if API returns raw array
        setRefunds(response.data || []);
      } else {
        setRefunds([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch refunds', err);
      setRefunds([]);
    } finally {
      setRefundsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  // Handle incoming redirect state from Admin Crypto
  useEffect(() => {
    if (location.state) {
      const { showPrompt, filter, action } = location.state as any;

      if (showPrompt) {
        setShowPayoutPrompt(true);
      }

      if (filter) {
        setTypeFilter('escrow');
        setSearchTerm(filter); // Search for the specific currency
      }

      if (action === 'release_expired') {
        // Automatically open the bulk confirmation or show a specific toast
        toast({
          title: "Escrow Filtered",
          description: "All expired payouts are now highlighted below.",
        });
      }

      // Clear state so it doesn't trigger on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleBulkEscrowRelease = async () => {
    try {
      setIsBulkReleasing(true);
      const result = await paymentService.performBulkEscrowAction('release_expired');
      toast({
        title: "Bulk Action Success",
        description: result.message,
      });
      fetchPayouts();
    } catch (error: any) {
      toast({
        title: "Bulk Action Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBulkReleasing(false);
    }
  };

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

  // Helper to map API status to StatusBadge types
  const refundStatusType = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
      case 'requested':
        return 'warning';
      case 'approved':
      case 'completed':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'processing':
        return 'accent';
      default:
        return 'warning';
    }
  };

  const handleApproveRefund = async (refundId: string) => {
    try {
      const res = await api.post(`/payments/admin/refunds/${refundId}/approve/`);
      if (res.data && res.data.success) {
        toast({ title: 'Refund Approved', description: res.data.message || 'Refund approved', variant: 'default' });
        fetchRefunds();
        fetchPayouts();
      } else {
        toast({ title: 'Error', description: res.data?.error || 'Failed to approve refund', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to approve refund', variant: 'destructive' });
    }
  };

  const handleRejectRefund = async (refundId: string, reason?: string) => {
    try {
      const res = await api.post(`/payments/admin/refunds/${refundId}/reject/`, { reason: reason || 'Rejected by admin' });
      if (res.data && res.data.success) {
        toast({ title: 'Refund Rejected', description: res.data.message || 'Refund rejected', variant: 'default' });
        fetchRefunds();
        fetchPayouts();
      } else {
        toast({ title: 'Error', description: res.data?.error || 'Failed to reject refund', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to reject refund', variant: 'destructive' });
    }
  };

  const handleViewRefund = (refund: any) => {
    setSelectedRefund(refund);
    setRefundModalOpen(true);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-3 md:p-6">
      {/* Payout Instructions Dialog */}
      <Dialog open={showPayoutPrompt} onOpenChange={setShowPayoutPrompt}>
        <DialogContent className="max-w-lg bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </span>
              Escrow Payout Management
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              You have been redirected to the payout management center.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-surface-2/50 border border-border p-4 rounded-xl">
              <h4 className="text-white font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-gray-300 space-y-2 list-disc pl-4">
                <li>Funded escrow payments appear here once the buyer confirms the order.</li>
                <li>You can manually (Release) individual payments to vendors.</li>
                <li>Expired payouts (48h+ after shipment) can be released in bulk.</li>
                <li>Once released, the system initiates the blockchain transaction.</li>
              </ul>
            </div>
            <p className="text-sm text-gray-400">
              Check the <span className="text-accent font-bold">"Ready"</span> status payouts below to start processing.
            </p>
          </div>
          <DialogFooter>
            <Button className="w-full bg-accent text-bg hover:bg-accent-2 font-bold" onClick={() => setShowPayoutPrompt(false)}>
              Got it, let's proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Payouts & Refunds</h1>
          <p className="text-gray-300 mt-1 text-sm sm:text-base">Manage vendor payouts and customer refund requests</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-900/40 border-0 h-11 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            onClick={() => setManualPayoutOpen(true)}
          >
            <Wallet className="w-5 h-5 text-white" />
            Send Manual Crypto
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-900/40 border-0 h-11 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            onClick={handleBulkEscrowRelease}
            disabled={isBulkReleasing}
          >
            {isBulkReleasing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Release All Escrow Payouts
          </Button>
          <Button variant="outline" size="sm" className="border-border text-gray-300 hover:text-white hover:bg-surface-2/50  w-full sm:w-auto h-11 px-4">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="sm:inline">Export Report</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-accent mr-4" />
              <div>
                <p className="text-sm text-gray-400">Pending Payouts</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? "..." : payouts.filter(p => ['pending', 'ready', 'processing', 'awaiting'].includes(p.status.toLowerCase())).length}
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
                    const activePayouts = payouts.filter(p => ['pending', 'ready', 'processing', 'awaiting'].includes(p.status.toLowerCase()));
                    const totalBTC = activePayouts
                      .filter(p => p.crypto_currency === 'BTC')
                      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
                    const totalXMR = activePayouts
                      .filter(p => p.crypto_currency === 'XMR')
                      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

                    const parts = [];
                    if (totalBTC > 0) parts.push(`${totalBTC.toFixed(6)} BTC`);
                    if (totalXMR > 0) parts.push(`${totalXMR.toFixed(6)} XMR`);

                    return parts.length > 0 ? parts.join(" + ") : "0.0000";
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
        setCurrentPage(1);
        if (value === 'history') {
          fetchTransactionHistory(1);
        } else if (value === 'payouts') {
          fetchPayouts(1);
        } else if (value === 'refunds') {
          fetchRefunds(1);
        }
      }}>
        <TabsList className="bg-surface-2 mb-4 sm:mb-6 flex-wrap">
          <TabsTrigger value="payouts" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            Vendor Payouts
          </TabsTrigger>
          <TabsTrigger value="refunds" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            Customer Refunds
          </TabsTrigger>
          <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payouts">
          {/* Filters */}
          <Card className="crypto-card mb-4 sm:mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by vendor name..."
                      className="pl-10  border-border text-white w-full"
                      data-testid="search-payouts"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40  border-border text-white">
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
                    <SelectTrigger className="w-full sm:w-40 border-border text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="escrow">Escrow</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px] px-4 sm:px-0">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-surface-2 to-surface-2/80">
                      <tr>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">Vendor & Order</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">Payout Amount</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide hidden lg:table-cell">Fees & Commission</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">Status & Type</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide hidden md:table-cell">Payment Method</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide hidden xl:table-cell">Timeline</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-surface-2/30 transition-all duration-200 border-b border-border/20" data-testid={`payout-row-${payout.id}`}>
                          <td className="p-3 sm:p-4">
                            <div>
                              <p className="font-medium text-white text-sm sm:text-base">{payout.vendor_name}</p>
                              <p className="text-xs sm:text-sm text-gray-400">Order: {payout.order_id}</p>
                              <p className="text-xs text-gray-500 hidden sm:block">Buyer: {payout.buyer_name}</p>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4">
                            <div>
                              <p className="font-mono text-white text-sm sm:text-base">{payout.amount} {payout.crypto_currency}</p>
                              {payout.type === 'escrow' && payout.gross_amount && (
                                <p className="text-xs sm:text-sm text-gray-400">
                                  Gross: {payout.gross_amount} {payout.crypto_currency}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 hidden lg:table-cell">
                            {payout.type === 'escrow' && payout.platform_fee ? (
                              <div>
                                <span className="font-mono text-accent text-sm">Platform: {payout.platform_fee} {payout.crypto_currency}</span>
                                {payout.escrow_fee && (
                                  <p className="text-xs sm:text-sm text-gray-400">Escrow: {payout.escrow_fee} {payout.crypto_currency}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Direct Payment</span>
                            )}
                          </td>
                          <td className="p-3 sm:p-4">
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
                              {/* Mobile: Show fees here */}
                              <div className="lg:hidden mt-2 pt-2 border-t border-gray-700">
                                {payout.type === 'escrow' && payout.platform_fee && (
                                  <div className="text-xs">
                                    <span className="text-accent">Platform: {payout.platform_fee} {payout.crypto_currency}</span>
                                    {payout.escrow_fee && (
                                      <p className="text-gray-400">Escrow: {payout.escrow_fee} {payout.crypto_currency}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 hidden md:table-cell">
                            <Badge variant="outline" className="text-gray-300 text-xs">
                              {payout.crypto_currency} Address
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1 break-all">
                              {payout.vendor_address.substring(0, 20)}...
                            </p>
                          </td>
                          <td className="p-3 sm:p-4 text-gray-300 hidden xl:table-cell">
                            {payout.type === 'escrow' ? (
                              <div>
                                <p className="text-xs sm:text-sm">{payout.requested_at ? new Date(payout.requested_at).toLocaleDateString() : 'N/A'}</p>
                                {payout.auto_release_at && (
                                  <p className="text-xs text-gray-500">
                                    Auto-release: {new Date(payout.auto_release_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs sm:text-sm">{payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}</p>
                                {payout.expires_at && (
                                  <p className="text-xs text-gray-500">
                                    Expires: {new Date(payout.expires_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-2">
                                {(payout.status === "pending" || payout.status === "ready" || payout.status === "failed") && payout.type === 'escrow' && (
                                  <Button
                                    size="sm"
                                    className={`shadow-lg transition-all duration-200 text-xs sm:text-sm ${payout.status === "failed"
                                      ? "bg-green-500 hover:bg-green-500 hover:shadow-green-500/25"
                                      : payout.status === "ready"
                                        ? "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25"
                                        : "bg-green-600 hover:bg-green-700 hover:shadow-green-500/25"
                                      } text-white flex-1 sm:flex-initial`}
                                    onClick={() => handleReleaseClick(payout)}
                                    data-testid={`approve-payout-${payout.id}`}
                                  >
                                    <Check className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">{payout.status === "failed" ? "Retry Release" :
                                      payout.status === "ready" ? "Release Payment" : "Release"}</span>
                                    <span className="sm:hidden">Release</span>
                                  </Button>
                                )}
                                {(payout.status === "pending" || payout.status === "ready" || payout.status === "failed") && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25 transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-initial"
                                    onClick={() => processPayoutAction(payout.id, 'cancel')}
                                    data-testid={`reject-payout-${payout.id}`}
                                  >
                                    <X className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Cancel</span>
                                    <span className="sm:hidden">X</span>
                                  </Button>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-300 hover:text-white hover:bg-surface-2/50 border-border/50 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto"
                                onClick={() => handleViewDetails(payout)}
                                data-testid={`view-payout-${payout.id}`}
                              >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                <span className="hidden sm:inline">View Details</span>
                                <span className="sm:hidden">Details</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {loading && (
                        <tr>
                          <td colSpan={7} className="p-6 sm:p-12 text-center">
                            <div className="space-y-4">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-surface-2 rounded-full flex items-center justify-center">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-gray-400 text-base sm:text-lg font-medium">Loading payouts...</div>
                                <div className="text-gray-500 text-xs sm:text-sm">
                                  Fetching payout data from the blockchain
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {payouts.length === 0 && !loading && (
                        <tr>
                          <td colSpan={7} className="p-6 sm:p-12 text-center">
                            <div className="space-y-4">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-surface-2 rounded-full flex items-center justify-center">
                                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                              </div>
                              <div className="space-y-2">
                                <div className="text-gray-400 text-base sm:text-lg font-medium">No payouts found</div>
                                <div className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto space-y-1">
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
              </div>
            </CardContent>
            {payouts.length > 0 && !loading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => fetchPayouts(page)}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={(limit) => setItemsPerPage(limit)}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          {/* Refunds Table */}
          <Card className="crypto-card">
            <CardHeader>
              <CardTitle className="text-white text-lg sm:text-xl">Customer Refund Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[700px] px-4 sm:px-0">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300">Order ID</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300 hidden md:table-cell">Buyer</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300 hidden lg:table-cell">Vendor</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300">Amount</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300">Reason</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300 hidden xl:table-cell">Requested</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {refundsLoading ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center">
                            <div className="text-gray-400">Loading refunds...</div>
                          </td>
                        </tr>
                      ) : refunds.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-400">No refund requests found</td>
                        </tr>
                      ) : (
                        refunds.map((refund: any) => (
                          <tr key={refund.id} className="hover:bg-surface-2/50" data-testid={`refund-row-${refund.id}`}>
                            <td className="p-3 sm:p-4">
                              <span className="font-mono text-accent text-xs sm:text-sm">{refund.order?.order_number ?? refund.order?.id ?? refund.order_id ?? ''}</span>
                            </td>
                            <td className="p-3 sm:p-4 text-white hidden md:table-cell text-sm">{refund.buyer?.username ?? refund.buyer_name ?? refund.buyer}</td>
                            <td className="p-3 sm:p-4 text-gray-300 hidden lg:table-cell text-sm">{refund.vendor?.username ?? refund.vendor_name ?? refund.vendor}</td>
                            <td className="p-3 sm:p-4">
                              <span className="font-mono text-white text-xs sm:text-sm">{refund.amount}</span>
                            </td>
                            <td className="p-3 sm:p-4">
                              <div className="max-w-xs">
                                <p className="text-gray-300 truncate text-xs sm:text-sm">{refund.reason ?? refund.notes}</p>
                              </div>
                            </td>
                            <td className="p-3 sm:p-4">
                              <StatusBadge status={refund.status ?? 'Unknown'} type={refundStatusType(refund.status ?? '')} />
                            </td>
                            <td className="p-3 sm:p-4 text-gray-300 hidden xl:table-cell text-xs sm:text-sm">{new Date(refund.created_at ?? refund.requested_at ?? Date.now()).toLocaleString()}</td>
                            <td className="p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                {(refund.status || '').toLowerCase() === 'pending' && (
                                  <>
                                    <Button variant="ghost" size="sm" className="text-success hover:text-green-400 text-xs" data-testid={`approve-refund-${refund.id}`} onClick={() => handleApproveRefund(refund.id)}>
                                      <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-danger hover:text-red-400 text-xs" data-testid={`reject-refund-${refund.id}`} onClick={() => handleRejectRefund(refund.id)}>
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs" data-testid={`view-refund-${refund.id}`} onClick={() => handleViewRefund(refund)}>
                                  <span className="hidden sm:inline">View Order</span>
                                  <span className="sm:hidden">View</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            {refunds.length > 0 && !refundsLoading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => fetchRefunds(page)}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={(limit) => setItemsPerPage(limit)}
              />
            )}
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
                  onClick={(e) => {
                    e.preventDefault();
                    fetchTransactionHistory();
                  }}
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
                          <div className={`w-3 h-3 rounded-full ${transaction.type === 'incoming_payment' ? 'bg-green-500' :
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">From:</span>
                          <p className="font-mono text-white text-xs break-all">{transaction.from_address}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">To:</span>
                          <p className="font-mono text-white text-xs break-all">{transaction.to_address}</p>
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
              {transactions.length > 0 && !transactionsLoading && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => fetchTransactionHistory(page)}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onItemsPerPageChange={(limit) => setItemsPerPage(limit)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-surface to-surface-2 text-white border-2 border-border/50 shadow-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {selectedPayout?.type === 'escrow' ? 'Escrow Payout Details' : 'Direct Payment Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Refund Details Modal */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-surface to-surface-2 text-white border-2 border-border/50 shadow-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Refund Request Details</DialogTitle>
          </DialogHeader>

          {selectedRefund ? (
            <div className="space-y-4 p-4 max-h-[75vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Order:</p>
                  <p className="font-mono text-white">{selectedRefund.order?.order_id ?? selectedRefund.order_id ?? selectedRefund.order_pk ?? ''}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status:</p>
                  <StatusBadge status={selectedRefund.status} type={refundStatusType(selectedRefund.status)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Buyer:</p>
                  <p className="text-white">{selectedRefund.buyer_name ?? selectedRefund.buyer?.username ?? selectedRefund.buyer}</p>
                </div>
                <div>
                  <p className="text-gray-400">Vendor:</p>
                  <p className="text-white">{selectedRefund.vendor_name ?? selectedRefund.vendor?.username ?? selectedRefund.vendor}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400">Amount:</p>
                <p className="font-mono text-white">{selectedRefund.amount}</p>
              </div>

              <div>
                <p className="text-gray-400">Reason:</p>
                <p className="text-gray-300">{selectedRefund.reason ?? selectedRefund.notes}</p>
              </div>

              {selectedRefund.transaction_hash && (
                <div>
                  <p className="text-gray-400">Transaction Hash:</p>
                  <p className="font-mono text-white break-all">{selectedRefund.transaction_hash}</p>
                </div>
              )}

              {/* Order Details */}
              {selectedRefund.order && (
                <Card className="bg-surface-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between"><span>Order ID</span><span className="font-mono text-white">{selectedRefund.order.order_id ?? selectedRefund.order_id}</span></div>
                      <div className="flex justify-between"><span>Total Amount</span><span className="font-mono text-white">{selectedRefund.order.total_amount}</span></div>
                      <div className="flex justify-between"><span>Unit Price</span><span className="font-mono text-white">{selectedRefund.order.unit_price}</span></div>
                      <div className="flex justify-between"><span>Quantity</span><span className="text-white">{selectedRefund.order.quantity}</span></div>
                      <div className="flex justify-between"><span>Crypto</span><span className="text-white">{selectedRefund.order.crypto_currency}</span></div>
                      <div className="flex justify-between"><span>Order Status</span><span className="text-white">{selectedRefund.order.order_status}</span></div>
                      <div className="flex justify-between"><span>Payment Status</span><span className="text-white">{selectedRefund.order.payment_status}</span></div>
                      {/* Removed delivered/product credentials for anonymity */}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Product Details */}
              {selectedRefund.product && (
                <Card className="bg-surface-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Product Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between"><span>Headline</span><span className="text-white">{selectedRefund.product.headline}</span></div>
                      <div className="flex justify-between"><span>Price</span><span className="font-mono text-white">{selectedRefund.product.price}</span></div>
                      {selectedRefund.product.description && <div><span className="text-gray-400">Description</span><p className="text-gray-300 text-sm mt-1">{selectedRefund.product.description}</p></div>}
                      {selectedRefund.product.main_images && selectedRefund.product.main_images.length > 0 && (
                        <div>
                          <span className="text-gray-400">Images</span>
                          <div className="flex gap-2 mt-2">
                            {selectedRefund.product.main_images.map((img: string, idx: number) => (
                              <img key={idx} src={img} alt={`img-${idx}`} className="w-20 h-12 object-cover rounded" />
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Product credentials hidden for anonymity */}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex space-x-3 pt-4">
                {(selectedRefund.status || '').toLowerCase() === 'pending' && (
                  <>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { handleApproveRefund(selectedRefund.id); setRefundModalOpen(false); }}>
                      <Check className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => { handleRejectRefund(selectedRefund.id); setRefundModalOpen(false); }}>
                      <X className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                {/* <Button variant="outline" onClick={() => setRefundModalOpen(false)}>Close</Button> */}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400">No refund selected</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Release Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md bg-gradient-to-br from-surface to-surface-2 text-white border-2 border-border/50 shadow-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <Check className="w-6 h-6 mr-2 text-green-400" />
              {payoutToRelease?.status === "failed" ? "Retry Escrow Release" :
                payoutToRelease?.status === "ready" ? "Release Escrow Payment" : "Confirm Escrow Release"}
            </DialogTitle>
          </DialogHeader>

          {payoutToRelease && (
            <div className="space-y-4">
              <div className={`border rounded-lg p-4 ${payoutToRelease.status === "failed"
                ? "bg-red-900/20 border-red-500/30"
                : payoutToRelease.status === "ready"
                  ? "bg-blue-900/20 border-blue-500/30"
                  : "bg-yellow-900/20 border-yellow-500/30"
                }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${payoutToRelease.status === "failed" ? "bg-red-400" :
                    payoutToRelease.status === "ready" ? "bg-blue-400" : "bg-yellow-400"
                    }`}></div>
                  <span className={`font-semibold ${payoutToRelease.status === "failed" ? "text-red-300" :
                    payoutToRelease.status === "ready" ? "text-blue-300" : "text-yellow-300"
                    }`}>
                    {payoutToRelease.status === "failed" ? "🔄 Retry Payment" :
                      payoutToRelease.status === "ready" ? "💰 Payment Ready" : "⚠️ Important"}
                  </span>
                </div>
                <p className={`text-sm ${payoutToRelease.status === "failed" ? "text-red-200" :
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
                  className={`text-white flex-1 ${payoutToRelease.status === "failed"
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

      {/* Manual Payout Dialog */}
      <Dialog open={manualPayoutOpen} onOpenChange={setManualPayoutOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-accent" />
              Send Crypto Manually
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Send BTC or XMR directly from the platform wallet to any address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Currency</label>
              <Select
                value={manualPayoutData.currency}
                onValueChange={(v) => setManualPayoutData({ ...manualPayoutData, currency: v })}
              >
                <SelectTrigger className="bg-gray-950/50 border-gray-800 text-white h-12 focus:ring-accent">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  <SelectItem value="BTC" className="focus:bg-accent/20 focus:text-white">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="XMR" className="focus:bg-accent/20 focus:text-white">Monero (XMR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Recipient Address</label>
              <Popover open={addressPopoverOpen} onOpenChange={setAddressPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={addressPopoverOpen}
                    className="w-full justify-between bg-gray-950/50 border-gray-800 text-white h-12 hover:bg-gray-900 font-normal px-3"
                  >
                    <span className="truncate">
                      {manualPayoutData.address || "Select or enter address..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-gray-900 border-gray-800" align="start">
                  <Command className="bg-transparent text-white">
                    <CommandInput
                      placeholder="Search saved addresses..."
                      className="text-white bg-transparent"
                      onValueChange={(val) => {
                        // Allow manual typing by updating state directly if no match or just to keep track
                        setManualPayoutData({ ...manualPayoutData, address: val });
                      }}
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      <CommandEmpty className="py-2 px-4 text-sm text-gray-400">No matching addresses. Keep typing for manual entry.</CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        {lookups.addresses
                          .filter(a => a.currency === manualPayoutData.currency)
                          .map((addr) => (
                            <CommandItem
                              key={`${addr.address}-${addr.label}`}
                              value={addr.address}
                              onSelect={(currentValue) => {
                                setManualPayoutData({ ...manualPayoutData, address: currentValue });
                                setAddressPopoverOpen(false);
                              }}
                              className="flex flex-col items-start py-2 px-3 aria-selected:bg-accent/20 cursor-pointer"
                            >
                              <span className="font-bold text-accent text-xs">{addr.label}</span>
                              <span className="text-xs text-gray-400 truncate w-full">{addr.address}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Amount</label>
              <Input
                type="number"
                step="0.00000001"
                placeholder="0.00000000"
                className="bg-gray-950/50 border-gray-800 text-white h-12 focus:border-accent"
                value={manualPayoutData.amount}
                onChange={(e) => setManualPayoutData({ ...manualPayoutData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Link to Order ID (Optional)</label>
              <Popover open={orderPopoverOpen} onOpenChange={setOrderPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orderPopoverOpen}
                    className="w-full justify-between bg-gray-950/50 border-gray-800 text-white h-12 hover:bg-gray-900 font-normal px-3"
                  >
                    <span className="truncate">
                      {manualPayoutData.order_id || "Select or enter Order ID..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-gray-900 border-gray-800" align="start">
                  <Command className="bg-transparent text-white">
                    <CommandInput
                      placeholder="Search orders..."
                      className="text-white bg-transparent"
                      onValueChange={(val) => {
                        setManualPayoutData({ ...manualPayoutData, order_id: val });
                      }}
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      <CommandEmpty className="py-2 px-4 text-sm text-gray-400">No matching orders.</CommandEmpty>
                      <CommandGroup heading="Recent Orders">
                        {lookups.orders.map((order) => (
                          <CommandItem
                            key={order.id}
                            value={order.id}
                            onSelect={(currentValue) => {
                              setManualPayoutData({ ...manualPayoutData, order_id: currentValue });
                              setOrderPopoverOpen(false);
                            }}
                            className="flex flex-col items-start py-2 px-3 aria-selected:bg-accent/20 cursor-pointer"
                          >
                            <span className="font-bold text-accent text-xs">{order.id}</span>
                            <span className="text-xs text-gray-400 truncate w-full">{order.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Internal Notes / Reason</label>
              <Input
                placeholder="Reason for manual payout..."
                className="bg-gray-950/50 border-gray-800 text-white h-12 focus:border-accent"
                value={manualPayoutData.notes}
                onChange={(e) => setManualPayoutData({ ...manualPayoutData, notes: e.target.value })}
              />
            </div>

            <div className="bg-accent/10 border border-accent/20 p-3 rounded-lg flex items-start gap-3">
              <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-accent-2">
                <strong>Attention:</strong> This is a real blockchain transaction. Funds will be sent immediately from the platform's hot wallet. This action cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setManualPayoutOpen(false)} className="border-border text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button
              className="bg-accent text-bg hover:bg-accent-2 font-bold min-w-[120px]"
              onClick={handleManualPayout}
              disabled={isSendingManual}
            >
              {isSendingManual ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>

  );
}
