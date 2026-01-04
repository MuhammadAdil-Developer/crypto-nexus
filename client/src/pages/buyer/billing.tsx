import { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bitcoin,
  RefreshCw,
  Search,
  Copy,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import { cn } from "@/lib/utils";
import { PageBanner } from "@/components/PageBanner";

interface TransactionData {
  id: string;
  type: string;
  description: string;
  amount: string;
  usd_amount: string;
  from_address: string;
  to_address: string;
  transaction_hash?: string;
  status: string;
  timestamp: string;
  order_id: string;
  vendor_name: string;
  crypto_symbol: string;
}

export default function BuyerBilling() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("payments");
  const { toast } = useToast();

  // Fetch transaction history
  const fetchTransactionHistory = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/payments/buyer/transaction-history/', {
        params: {
          page: page,
          limit: itemsPerPage,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: searchTerm || undefined
        }
      });

      if (response.data.success) {
        setTransactions(response.data.data);
        setTotalPages(Math.ceil(response.data.total / itemsPerPage));
        setCurrentPage(page);
      } else {
        setError('Failed to fetch transaction history');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, searchTerm]);

  // Separate payments and refunds
  const payments = transactions.filter(t => t.type !== 'refund');
  const refunds = transactions.filter(t => t.type === 'refund');

  const filteredTransactions = (activeTab === 'payments' ? payments : refunds).filter(transaction => {
    const matchesSearch = searchTerm === '' ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "confirmed":
        return "bg-theme-cyan-dim text-theme-cyan border-theme-cyan/30";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed":
        return "bg-theme-red/20 text-theme-red border-theme-red/30";
      case "processing":
        return "bg-theme-cyan/20 text-theme-cyan border-theme-cyan/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "payment":
        return "bg-theme-red";
      case "escrow_release":
        return "bg-theme-cyan text-black";
      case "direct_payment":
        return "bg-theme-red";
      case "refund":
        return "bg-theme-cyan text-black";
      default:
        return "bg-gray-500";
    }
  };

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
            description: "Address copied.",
            variant: "default",
          });
        }
      } catch (err) {
        // fail silently or show error
      }
      document.body.removeChild(textArea);
      return;
    }

    // Modern Secure Context
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Address copied to clipboard.",
        variant: "default",
      });
    }, () => {
      toast({
        title: "Error",
        description: "Failed to copy address.",
        variant: "destructive",
      });
    });
  };

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageBanner
          title="Billing"
          subtitle="Full transparency for your financial history."
          type="buyer"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactionHistory(currentPage)}
              disabled={loading}
              className="bg-white/5 hover:bg-theme-cyan/10 text-gray-300 hover:text-white border-white/10 hover:border-theme-cyan/50 rounded-xl h-10 px-4 transition-all duration-300 font-bold uppercase tracking-widest text-[10px]"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          }
        />

        {/* Tabs for Payments and Refunds */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/60 p-1.5 rounded-2xl border border-gray-800/50 backdrop-blur-xl h-auto mb-6">
            <TabsTrigger
              value="payments"
              className="rounded-xl py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-700 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-500"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              <span className="font-bold uppercase tracking-wider text-xs">Payments History</span>
              <Badge className="ml-2 bg-white/20 text-white border-none text-[10px] px-1.5 h-4 flex items-center">{payments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="refunds"
              className="rounded-xl py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-500"
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              <span className="font-bold uppercase tracking-wider text-xs">Refunds Track</span>
              <Badge className="ml-2 bg-white/20 text-white border-none text-[10px] px-1.5 h-4 flex items-center">{refunds.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            {/* Filters - Glass Bar */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-[2rem] p-6 shadow-2xl mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-theme-cyan transition-colors w-5 h-5" />
                  <Input
                    placeholder="Search by ID, vendor, or description..."
                    className="pl-12 h-12 bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all rounded-2xl shadow-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-12 bg-black/40 border-gray-700/50 text-gray-300 rounded-2xl focus:ring-theme-cyan/10">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-gray-800 text-gray-300 rounded-2xl">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-12 bg-black/40 border-gray-700/50 text-gray-300 rounded-2xl focus:ring-theme-cyan/10">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-gray-800 text-gray-300 rounded-2xl">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="payment">Standard Payment</SelectItem>
                      <SelectItem value="escrow_release">Escrow Release</SelectItem>
                      <SelectItem value="direct_payment">Direct Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Payment Transactions */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-2xl">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-theme-cyan" />
                    <span className="text-gray-400 font-medium tracking-wide">Syncing Financial Stream...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-2xl">
                  <p className="text-theme-red font-bold mb-4">{error}</p>
                  <Button onClick={() => fetchTransactionHistory(currentPage)} variant="outline" className="border-theme-red/50 text-theme-red hover:bg-theme-red/10">
                    Re-initialize Connection
                  </Button>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-16 text-center shadow-2xl">
                  <Bitcoin className="w-16 h-16 text-gray-500 mx-auto mb-6 opacity-20" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">No Activity Recorded</h3>
                  <p className="text-gray-400 mt-2 italic">Your financial history is currently empty.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {filteredTransactions.map((transaction) => (
                      <div key={transaction.id} className="group relative bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:border-blue-500/50 hover:bg-gray-800/60 shadow-lg hover:shadow-blue-500/5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:from-blue-500/10 transition-colors duration-500" />

                        <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-6">
                          <div className="flex items-start space-x-4 min-w-0 flex-1 w-full sm:w-auto">
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${getTypeColor(transaction.type)} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              {transaction.crypto_symbol === 'XMR' ? (
                                <span className="font-black text-xs text-black">XMR</span>
                              ) : (
                                <Bitcoin className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-blue-400 transition-colors truncate max-w-[200px] sm:max-w-none">{transaction.description}</h3>
                                <Badge className={cn("text-[10px] font-bold uppercase tracking-widest h-5 flex-shrink-0", getStatusColor(transaction.status))}>
                                  {transaction.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                <p className="text-gray-400 flex items-center font-medium">
                                  <span className="text-[10px] uppercase font-black mr-1 opacity-50">Order:</span>
                                  <span className="text-blue-400 font-mono">#{transaction.order_id}</span>
                                </p>
                                <p className="text-gray-400 flex items-center font-medium">
                                  <span className="text-[10px] uppercase font-black mr-1 opacity-50">Vendor:</span>
                                  <span className="text-white">{transaction.vendor_name}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right flex flex-col items-start sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/50">
                            <p className="text-xl sm:text-2xl font-black text-white">{transaction.amount}</p>
                            <p className="text-xs sm:text-sm font-bold text-gray-500">{transaction.usd_amount}</p>
                            <div className="flex items-center mt-2 text-[10px] sm:text-xs text-gray-500 font-mono">
                              <span className="bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700/50">
                                {new Date(transaction.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Connection Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-950/40 p-3 sm:p-4 rounded-xl border border-gray-800/50 hover:bg-gray-950/60 transition-colors">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Source Address (From)</span>
                            <div className="flex items-center space-x-3">
                              <p className="font-mono text-white text-[10px] sm:text-xs break-all flex-1 line-clamp-1 group-hover:line-clamp-none transition-all duration-300 opacity-80">{transaction.from_address}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(transaction.from_address)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg flex-shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-gray-950/40 p-3 sm:p-4 rounded-xl border border-gray-800/50 hover:bg-gray-950/60 transition-colors">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Destination Address (To)</span>
                            <div className="flex items-center space-x-3">
                              <p className="font-mono text-white text-[10px] sm:text-xs break-all flex-1 line-clamp-1 group-hover:line-clamp-none transition-all duration-300 opacity-80">{transaction.to_address}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(transaction.to_address)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg flex-shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {transaction.transaction_hash && (
                          <div className="mt-4 pt-4 border-t border-gray-800/50">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Blockchain Transaction Evidence</span>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <p className="font-mono text-white text-[10px] sm:text-xs break-all flex-1 bg-blue-500/5 px-3 py-2 rounded-lg border border-blue-500/10 text-blue-300/80 w-full">{transaction.transaction_hash}</p>
                              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(transaction.transaction_hash!)}
                                  className="h-9 px-3 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl"
                                >
                                  <Copy className="w-3.5 h-3.5 mr-2" />
                                  <span className="text-xs font-bold uppercase tracking-tighter">Copy Hash</span>
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => window.open(`https://blockchair.com/${transaction.crypto_symbol.toLowerCase()}/transaction/${transaction.transaction_hash}`, '_blank')}
                                  className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                  <span className="text-xs font-bold uppercase tracking-tighter">Chain Link</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {filteredTransactions.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                      <div className="text-sm text-gray-400">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchTransactionHistory(currentPage - 1)}
                          disabled={currentPage === 1 || loading}
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
                                disabled={loading}
                                className={page === currentPage ? "bg-theme-cyan text-black border-theme-cyan" : "border-gray-600 text-gray-300 hover:bg-gray-700"}
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
                          disabled={currentPage === totalPages || loading}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            {/* Filters for Refunds - Glass Bar */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-[2rem] p-6 shadow-2xl mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-theme-cyan transition-colors w-5 h-5" />
                  <Input
                    placeholder="Search refunds..."
                    className="pl-12 h-12 bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all rounded-2xl shadow-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12 bg-black/40 border-gray-700/50 text-gray-300 rounded-2xl focus:ring-theme-cyan/10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-800 text-gray-300 rounded-2xl">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Refund Transactions */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-2xl">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-theme-cyan" />
                    <span className="text-gray-400 font-medium tracking-wide">Syncing Refund Stream...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-2xl">
                  <p className="text-theme-red font-bold mb-4">{error}</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-16 text-center shadow-2xl">
                  <ArrowDownCircle className="w-16 h-16 text-gray-500 mx-auto mb-6 opacity-20" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">No Refunds Tracked</h3>
                  <p className="text-gray-400 mt-2 italic">You haven't received any refunds yet.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {filteredTransactions.map((transaction) => (
                      <div key={transaction.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-700 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-start space-x-4 min-w-0 flex-1">
                            <div className={`w-12 h-12 rounded-full ${getTypeColor(transaction.type)} flex items-center justify-center flex-shrink-0`}>
                              {transaction.crypto_symbol === 'XMR' ? (
                                <span className="font-bold text-xs">XMR</span>
                              ) : (
                                <ArrowDownCircle className="w-6 h-6 text-white" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-white">{transaction.description}</h3>
                                <Badge className={getStatusColor(transaction.status)}>
                                  {transaction.status}
                                </Badge>
                                <Badge variant="outline" className="bg-theme-cyan/10 text-theme-cyan border-theme-cyan/30">
                                  REFUND
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400">Order: {transaction.order_id}</p>
                              <p className="text-xs text-gray-500">Vendor: {transaction.vendor_name}</p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-theme-cyan">{transaction.amount}</p>
                            <p className="text-sm text-gray-400">{transaction.usd_amount}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(transaction.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400 block mb-1">From:</span>
                            <div className="flex items-center space-x-2">
                              <p className="font-mono text-white text-xs break-all flex-1">{transaction.from_address}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(transaction.from_address)}
                                className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-1">To:</span>
                            <div className="flex items-center space-x-2">
                              <p className="font-mono text-white text-xs break-all flex-1">{transaction.to_address}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(transaction.to_address)}
                                className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {transaction.transaction_hash && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <span className="text-gray-400 text-sm block mb-1">Transaction Hash:</span>
                            <div className="flex items-center space-x-2">
                              <p className="font-mono text-white text-xs break-all flex-1">{transaction.transaction_hash}</p>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(transaction.transaction_hash!)}
                                  className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`https://blockchair.com/${transaction.crypto_symbol.toLowerCase()}/transaction/${transaction.transaction_hash}`, '_blank')}
                                  className="w-6 h-6 p-0 text-gray-400 hover:text-white"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BuyerLayout>
  );
}
