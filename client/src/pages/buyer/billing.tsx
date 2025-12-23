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
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Billing & Transactions</h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1">View your payment history and transactions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactionHistory(currentPage)}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs for Payments and Refunds */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="payments" className="data-[state=active]:bg-gray-700">
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="data-[state=active]:bg-gray-700">
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Refunds ({refunds.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            {/* Filters */}
            <Card className="border border-gray-700 bg-gray-900">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search payments..."
                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="escrow_release">Escrow Release</SelectItem>
                      <SelectItem value="direct_payment">Direct Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payment Transactions */}
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-white">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-400">Loading transaction history...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button onClick={() => fetchTransactionHistory(currentPage)} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Bitcoin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No transactions found</p>
                    <p className="text-sm text-gray-500 mt-2">Your transaction history will appear here</p>
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
                                  <Bitcoin className="w-6 h-6 text-white" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-white">{transaction.description}</h3>
                                  <Badge className={getStatusColor(transaction.status)}>
                                    {transaction.status}
                                  </Badge>
                                  <Badge variant="outline">
                                    {transaction.type.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-400">Order: {transaction.order_id}</p>
                                <p className="text-xs text-gray-500">Vendor: {transaction.vendor_name}</p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold text-white">{transaction.amount}</p>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            {/* Filters for Refunds */}
            <Card className="border border-gray-700 bg-gray-900">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search refunds..."
                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Refund Transactions */}
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-white">Refund History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-400">Loading refund history...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button onClick={() => fetchTransactionHistory(currentPage)} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowDownCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No refunds found</p>
                    <p className="text-sm text-gray-500 mt-2">Your refund history will appear here</p>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BuyerLayout>
  );
}
