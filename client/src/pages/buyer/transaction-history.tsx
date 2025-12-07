import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bitcoin,
  Wallet,
  RefreshCw,
  Search,
  Clock,
  ArrowLeft,
  Copy,
  ExternalLink,
  Filter
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import { Link } from "react-router-dom";

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

export default function BuyerTransactionHistory() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
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

  const filteredTransactions = transactions.filter(transaction => {
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
        return "bg-green-600 text-white border-green-600";
      case "pending":
        return "bg-yellow-600 text-white border-yellow-600";
      case "failed":
        return "bg-red-600 text-white border-red-600";
      case "processing":
        return "bg-blue-600 text-white border-blue-600";
      default:
        return "bg-gray-600 text-white border-gray-600";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "payment":
        return "bg-green-500";
      case "escrow_release":
        return "bg-blue-500";
      case "direct_payment":
        return "bg-orange-500";
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
        // fail silently
      }
      document.body.removeChild(textArea);
      return;
    }

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
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <Link to="/buyer">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center">
                <Bitcoin className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 mr-2 sm:mr-3 text-orange-400 flex-shrink-0" />
                <span className="truncate">Transaction History</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">Track all your payment activities and transactions</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm w-full sm:w-auto"
            onClick={() => fetchTransactionHistory(currentPage)}
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? "Refreshing..." : "Refresh"}</span>
            <span className="sm:hidden">{loading ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-10 bg-surface-2 border-border text-white text-sm sm:text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-surface-2 border-border text-white text-sm sm:text-base">
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
                <SelectTrigger className="w-full sm:w-40 bg-surface-2 border-border text-white text-sm sm:text-base">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{transactions.length}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Transactions</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {transactions.filter(t => t.status === 'completed' || t.status === 'confirmed').length}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Completed</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                {transactions.filter(t => t.status === 'pending').length}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Pending</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {transactions.filter(t => t.status === 'failed').length}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-white">
              Transaction History ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 gap-3">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-orange-500"></div>
                <span className="text-gray-400 text-sm sm:text-base">Loading transaction history...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-red-400 mb-4 text-sm sm:text-base">{error}</p>
                <Button onClick={() => fetchTransactionHistory(currentPage)} variant="outline" size="sm" className="text-xs sm:text-sm">
                  Try Again
                </Button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Bitcoin className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-400 text-sm sm:text-base">No transactions found</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 hover:bg-gray-700 transition-colors overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                      <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${getTypeColor(transaction.type)} flex items-center justify-center flex-shrink-0`}>
                          <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <h3 className="font-semibold text-white text-sm sm:text-base break-words">{transaction.description}</h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={`text-[10px] sm:text-xs ${getStatusColor(transaction.status)}`}>
                                {transaction.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                {transaction.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 break-words">Order: {transaction.order_id}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 break-words">Vendor: {transaction.vendor_name}</p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="text-base sm:text-lg font-bold text-white">{transaction.amount}</p>
                        <p className="text-xs sm:text-sm text-gray-400">{transaction.usd_amount}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="min-w-0">
                        <span className="text-gray-400 block mb-1">From:</span>
                        <div className="flex items-start space-x-2">
                          <p className="font-mono text-white text-[10px] sm:text-xs break-all flex-1 min-w-0">{transaction.from_address}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(transaction.from_address)}
                            className="w-6 h-6 p-0 text-gray-400 hover:text-white flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-gray-400 block mb-1">To:</span>
                        <div className="flex items-start space-x-2">
                          <p className="font-mono text-white text-[10px] sm:text-xs break-all flex-1 min-w-0">{transaction.to_address}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(transaction.to_address)}
                            className="w-6 h-6 p-0 text-gray-400 hover:text-white flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {transaction.transaction_hash && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
                        <span className="text-gray-400 text-xs sm:text-sm block mb-1">Transaction Hash:</span>
                        <div className="flex items-start space-x-2">
                          <p className="font-mono text-white text-[10px] sm:text-xs break-all flex-1 min-w-0">{transaction.transaction_hash}</p>
                          <div className="flex items-center space-x-1 flex-shrink-0">
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
            )}

            {/* Pagination */}
            {filteredTransactions.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-700">
                <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTransactionHistory(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
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
                          disabled={loading}
                          className={`text-xs sm:text-sm ${page === currentPage
                            ? "bg-blue-600 text-white border-blue-600"
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
                    disabled={currentPage === totalPages || loading}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BuyerLayout>
  );
}
