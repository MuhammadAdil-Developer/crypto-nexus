import { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Loader2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { refundService, WalletBalance, WalletTransaction } from "@/services/refundService";
import { useToast } from "@/hooks/use-toast";

export default function BuyerBilling() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState<"BTC" | "XMR">("BTC");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [currentPage]);

  const fetchWallet = async () => {
    try {
      setIsLoading(true);
      const result = await refundService.getWalletBalance();
      if (result && result.success) {
        setWallet(result.wallet);
      } else {
        // If wallet doesn't exist, create it by setting default values
        setWallet({
          balance_btc: '0',
          balance_xmr: '0',
          total_deposited_btc: '0',
          total_deposited_xmr: '0',
          total_withdrawn_btc: '0',
          total_withdrawn_xmr: '0',
        });
      }
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      // Set default wallet on error
      setWallet({
        balance_btc: '0',
        balance_xmr: '0',
        total_deposited_btc: '0',
        total_deposited_xmr: '0',
        total_withdrawn_btc: '0',
        total_withdrawn_xmr: '0',
      });
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch wallet balance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const result = await refundService.getWalletTransactions(currentPage, itemsPerPage);
      if (result && result.success) {
        setTransactions(result.data || []);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsWithdrawing(true);
      const result = await refundService.withdrawFromWallet(
        withdrawAmount,
        withdrawCurrency,
        withdrawAddress
      );
      if (result.success) {
        toast({
          title: "Success",
          description: "Withdrawal request submitted successfully",
        });
        setIsWithdrawOpen(false);
        setWithdrawAmount("");
        setWithdrawAddress("");
        fetchWallet();
        fetchTransactions();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to process withdrawal",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'refund':
      case 'partial_refund':
        return 'text-green-400';
      case 'withdrawal':
        return 'text-red-400';
      case 'deposit':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'refund':
      case 'partial_refund':
        return <ArrowDownCircle className="w-4 h-4 text-green-400" />;
      case 'withdrawal':
        return <ArrowUpCircle className="w-4 h-4 text-red-400" />;
      case 'deposit':
        return <ArrowDownCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedTransactions = transactions.slice(startIndex, endIndex);

  return (
    <BuyerLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Billing & Wallet</h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1">Manage your wallet balance and transactions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchWallet();
              fetchTransactions();
            }}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Wallet Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border border-gray-700 bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    Bitcoin Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {wallet ? parseFloat(wallet.balance_btc || '0').toFixed(8) : '0.00000000'} BTC
                  </div>
                  <p className="text-sm text-gray-400">
                    Total Deposited: {wallet ? parseFloat(wallet.total_deposited_btc || '0').toFixed(8) : '0.00000000'} BTC
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-700 bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-orange-400" />
                    Monero Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {wallet ? parseFloat(wallet.balance_xmr || '0').toFixed(8) : '0.00000000'} XMR
                  </div>
                  <p className="text-sm text-gray-400">
                    Total Deposited: {wallet ? parseFloat(wallet.total_deposited_xmr || '0').toFixed(8) : '0.00000000'} XMR
                  </p>
                </CardContent>
              </Card>
            </div>

        {/* Withdraw Button */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <Button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No transactions yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {displayedTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(tx.transaction_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white capitalize">
                              {tx.transaction_type.replace('_', ' ')}
                            </span>
                            {tx.order_id && (
                              <Badge variant="outline" className="text-xs">
                                Order: {tx.order_id}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                          {tx.notes && (
                            <p className="text-xs text-gray-500 mt-1">{tx.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold ${getTransactionTypeColor(tx.transaction_type)}`}>
                          {tx.transaction_type === 'withdrawal' ? '-' : '+'}
                          {tx.amount} {tx.crypto_currency}
                        </div>
                        {tx.transaction_hash && (
                          <p className="text-xs text-gray-500 mt-1 font-mono truncate max-w-[150px]">
                            {tx.transaction_hash.slice(0, 10)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-400 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </div>

      {/* Withdraw Modal */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Withdraw Funds</DialogTitle>
            <DialogDescription className="text-gray-400">
              Withdraw funds from your wallet to an external address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={withdrawCurrency} onValueChange={(value: "BTC" | "XMR") => setWithdrawCurrency(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="XMR">Monero (XMR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00000000"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Available: {wallet ? (withdrawCurrency === 'BTC' ? parseFloat(wallet.balance_btc).toFixed(8) : parseFloat(wallet.balance_xmr).toFixed(8)) : '0.00000000'} {withdrawCurrency}
              </p>
            </div>
            <div>
              <Label htmlFor="address">Withdrawal Address</Label>
              <Input
                id="address"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="Enter {withdrawCurrency} address"
                className="bg-gray-800 border-gray-700 text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleWithdraw} disabled={isWithdrawing} className="bg-blue-600 hover:bg-blue-700">
                {isWithdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Withdraw
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </BuyerLayout>
  );
}

