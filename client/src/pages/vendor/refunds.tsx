import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Loader2,
  MoreVertical,
  Eye,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Info,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { refundService, RefundRequest } from "@/services/refundService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { messagingService } from "@/services/messagingService";

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending_vendor":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]";
    case "vendor_approved":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]";
    case "vendor_rejected":
      return "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]";
    case "disputed":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]";
    case "admin_approved":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
    case "completed":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending_vendor":
      return <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />;
    case "vendor_approved":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />;
    case "vendor_rejected":
      return <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
    case "disputed":
      return <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />;
    case "admin_approved":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />;
    case "completed":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />;
    default:
      return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />;
  }
};

export default function VendorRefunds() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<any>({ pending_decision: [], pending_refund: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processNotes, setProcessNotes] = useState("");
  const [paymentSource, setPaymentSource] = useState<'platform' | 'external'>('platform');
  const [externalWalletAddress, setExternalWalletAddress] = useState("");
  const [transactionHashValue, setTransactionHashValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRefunds();
    fetchPendingRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      const result = await refundService.getVendorRefundRequests(1, 100, statusFilter === "all" ? undefined : statusFilter);
      if (result.success) {
        setRefunds(result.data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch refunds",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      toast({
        title: "Error",
        description: "Failed to fetch refunds",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRefunds = async () => {
    try {
      const result = await refundService.getVendorPendingRefunds();
      if (result.success) {
        setPendingRefunds(result.data || { pending_decision: [], pending_refund: [] });
      }
    } catch (error) {
      console.error('Error fetching pending refunds:', error);
    }
  };

  const handleApprove = async (refundNow: boolean = false) => {
    if (!selectedRefund) return;

    // For escrow orders with "Refund Now", skip transaction hash requirement
    const isEscrowRefundNow = refundNow && selectedRefund.use_escrow;

    if (!isEscrowRefundNow) {
      if (paymentSource === 'platform') {
        if (!transactionHashValue.trim()) {
          toast({
            title: "Error",
            description: "Please send the refund manually from your payout wallet and provide the transaction hash",
            variant: "destructive",
          });
          return;
        }
      }
      if (paymentSource === 'external') {
        if (!externalWalletAddress.trim()) {
          toast({
            title: "Error",
            description: "Please provide the external wallet address you will use for the refund",
            variant: "destructive",
          });
          return;
        }
        if (!transactionHashValue.trim()) {
          toast({
            title: "Error",
            description: "Please send the refund manually from your external wallet and provide the transaction hash",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      setIsProcessing(true);
      const result = await refundService.approveRefund(selectedRefund.id, {
        notes: approveNotes,
        payment_source: isEscrowRefundNow ? 'platform' : paymentSource,
        transaction_hash: isEscrowRefundNow ? undefined : (paymentSource === 'platform' ? transactionHashValue.trim() : undefined),
        external_wallet_address: isEscrowRefundNow ? undefined : (paymentSource === 'external' ? externalWalletAddress.trim() : undefined),
        refund_now: isEscrowRefundNow,  // Flag to indicate automatic refund processing
      });
      if (result.success) {
        toast({
          title: "Success",
          description: isEscrowRefundNow
            ? "Refund approved and processed automatically. Amount sent to buyer's wallet from platform escrow."
            : "Refund approved successfully",
        });
        setIsApproveOpen(false);
        setApproveNotes("");
        setTransactionHashValue("");
        setExternalWalletAddress("");
        setPaymentSource('platform');
        setSelectedRefund(null);
        fetchRefunds();
        fetchPendingRefunds();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to approve refund",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve refund",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund || !rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const result = await refundService.rejectRefund(selectedRefund.id, rejectReason);
      if (result.success) {
        toast({
          title: "Success",
          description: "Refund rejected. Buyer can open a dispute if needed.",
        });
        setIsRejectOpen(false);
        setRejectReason("");
        setSelectedRefund(null);
        fetchRefunds();
        fetchPendingRefunds();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to reject refund",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject refund",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedRefund) return;

    if (paymentSource === 'platform') {
      if (!transactionHashValue.trim()) {
        toast({
          title: "Error",
          description: "Please send the refund manually from your payout wallet and provide the transaction hash",
          variant: "destructive",
        });
        return;
      }
    }
    if (paymentSource === 'external') {
      if (!externalWalletAddress.trim()) {
        toast({
          title: "Error",
          description: "Please provide the external wallet address you will use for the refund",
          variant: "destructive",
        });
        return;
      }
      if (!transactionHashValue.trim()) {
        toast({
          title: "Error",
          description: "Please send the refund manually from your external wallet and provide the transaction hash",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsProcessing(true);
      const result = await refundService.processRefund(selectedRefund.id, {
        transaction_hash: paymentSource === 'external' ? transactionHashValue.trim() : undefined,
        notes: processNotes,
        payment_source: paymentSource,
        external_wallet_address: paymentSource === 'external' ? externalWalletAddress.trim() : undefined,
      });
      if (result.success) {
        toast({
          title: "Success",
          description: "Refund processed successfully. Amount credited to buyer's wallet.",
        });
        setIsProcessOpen(false);
        setProcessNotes("");
        setTransactionHashValue("");
        setExternalWalletAddress("");
        setPaymentSource('platform');
        setSelectedRefund(null);
        fetchRefunds();
        fetchPendingRefunds();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to process refund",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch =
      refund.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (refund.buyer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || refund.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPendingDecision = pendingRefunds.pending_decision?.length || 0;
  const totalPendingRefund = pendingRefunds.pending_refund?.length || 0;

  return (
    <>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
        {/* Premium Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-8 mt-2">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">
              Refund Requests
            </h1>
            <p className="text-gray-400 font-medium max-w-lg italic text-sm sm:text-base">
              Review, approve, or reject buyer refund requests efficiently.
            </p>
          </div>
          <Button
            onClick={() => {
              fetchRefunds();
              fetchPendingRefunds();
            }}
            disabled={isLoading}
            className="bg-gray-900/50 hover:bg-gray-800 text-white border border-gray-700/50 shadow-lg rounded-xl h-12 px-6 font-bold transition-all"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Urgent Alerts */}
        {(totalPendingDecision > 0 || totalPendingRefund > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {totalPendingDecision > 0 && (
              <Card className="border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/20 rounded-full animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">
                          {totalPendingDecision} Pending Decision{totalPendingDecision > 1 ? 's' : ''}
                        </p>
                        <p className="text-amber-200/70 text-sm font-medium">
                          Action required within 48 hours
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setStatusFilter('pending_vendor')}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none"
                    >
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {totalPendingRefund > 0 && (
              <Card className="border border-red-500/30 bg-red-500/5 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-500/20 rounded-full animate-pulse">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">
                          {totalPendingRefund} Refund{totalPendingRefund > 1 ? 's' : ''} To Process
                        </p>
                        <p className="text-red-200/70 text-sm font-medium">
                          Admin resolved in buyer favor. Process now.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const pending = refunds.filter(r => r.vendor_refund_required && !r.vendor_refund_completed);
                        setRefunds(pending);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold border-none"
                    >
                      Process
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filters */}
        <Card className="bg-gray-900/40 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-cyan-500 text-gray-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <Input
                    placeholder="Search by order ID, buyer, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 bg-gray-900/50 border-gray-700/50 text-white rounded-xl h-11 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-56 bg-gray-900/50 border-gray-700/50 text-white rounded-xl h-11 focus:ring-2 focus:ring-cyan-500/20">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_vendor">Pending Decision</SelectItem>
                  <SelectItem value="vendor_approved">Approved</SelectItem>
                  <SelectItem value="vendor_rejected">Rejected</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="admin_approved">Admin Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refunds List List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white px-2">Refund Requests <span className="text-gray-500 text-base font-normal ml-2">({filteredRefunds.length})</span></h2>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
                <p className="text-gray-400">Loading refunds...</p>
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="text-center py-16 bg-gray-900/30 border border-gray-800 border-dashed rounded-xl">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">No refunds found matching your criteria</p>
              </div>
            ) : (
              filteredRefunds.map((refund) => (
                <Card key={refund.id} className="bg-gray-900/40 border border-gray-700/30 hover:bg-gray-800/40 transition-all group overflow-hidden relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${refund.status === 'pending_vendor' ? 'bg-amber-500' :
                    refund.status === 'vendor_approved' || refund.status === 'admin_approved' || refund.status === 'completed' ? 'bg-emerald-500' :
                      refund.status === 'vendor_rejected' ? 'bg-red-500' :
                        refund.status === 'disputed' ? 'bg-orange-500' : 'bg-gray-600'
                    }`} />
                  <CardContent className="p-5 pl-7">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-start space-x-4 min-w-0 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-800/50 border border-gray-700/50`}>
                          {getStatusIcon(refund.status)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-bold text-white text-base truncate group-hover:text-cyan-400 transition-colors">Order #{refund.order_id}</h3>
                            <Badge className={`text-[10px] uppercase font-bold tracking-wider ${getStatusColor(refund.status)}`}>
                              {refund.status.replace('_', ' ')}
                            </Badge>
                            {refund.vendor_refund_required && !refund.vendor_refund_completed && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] animate-pulse">
                                Action Required
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-400">
                            <p className="flex items-center"><span className="text-gray-500 w-16">Buyer:</span> <span className="text-white font-medium">{refund.buyer}</span></p>
                            <p className="flex items-center"><span className="text-gray-500 w-16">Reason:</span> <span className="text-white truncate">{refund.reason}</span></p>
                          </div>

                          {refund.vendor_decision_deadline && refund.status === 'pending_vendor' && (
                            <p className="text-xs text-amber-500 mt-2 font-medium flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              Decision Deadline: {new Date(refund.vendor_decision_deadline).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 lg:text-right border-t lg:border-t-0 border-gray-800/50 pt-4 lg:pt-0">
                        <div>
                          <div className="font-black text-white text-xl">{refund.amount}</div>
                          <div className="text-sm text-gray-400 font-medium">{refund.crypto_currency}</div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
                          {refund.status === 'pending_vendor' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRefund(refund);
                                  setPaymentSource('platform');
                                  setTransactionHashValue("");
                                  setExternalWalletAddress("");
                                  setIsApproveOpen(true);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white border-none h-8 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              >
                                <CheckCircle className="w-3 h-3 mr-1.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRefund(refund);
                                  setIsRejectOpen(true);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white border-none h-8 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                              >
                                <X className="w-3 h-3 mr-1.5" />
                                Reject
                              </Button>
                            </>
                          )}
                          {refund.vendor_refund_required && !refund.vendor_refund_completed && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setPaymentSource('platform');
                                setTransactionHashValue("");
                                setExternalWalletAddress("");
                                setProcessNotes("");
                                setIsProcessOpen(true);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white border-none h-8 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                            >
                              <RefreshCw className="w-3 h-3 mr-1.5" />
                              Process Refund
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                disabled={openingChat === refund.id}
                              >
                                {openingChat === refund.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700 text-white shadow-xl">
                              <DropdownMenuItem onClick={() => {
                                setSelectedRefund(refund);
                                setIsDetailsOpen(true);
                              }} className="focus:bg-gray-800 focus:text-cyan-400 cursor-pointer">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                setOpeningChat(refund.id);
                                try {
                                  const productId = refund.product_id;
                                  const buyerId = refund.buyer_id;

                                  if (!productId || !buyerId) {
                                    toast({
                                      title: "Error",
                                      description: "Order details not available.",
                                      variant: "destructive",
                                    });
                                    setOpeningChat(null);
                                    return;
                                  }

                                  messagingService.setProductContextInStorage({
                                    id: productId,
                                    recipientId: buyerId,
                                    title: `Refund Request - ${refund.order_id}`,
                                    isRefund: true,
                                    refundId: refund.id,
                                    buyerUsername: refund.buyer
                                  });

                                  navigate('/vendor/messages');
                                } catch (error) {
                                  console.error('Error opening chat:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to open chat.",
                                    variant: "destructive",
                                  });
                                  setOpeningChat(null);
                                }
                              }} className="focus:bg-gray-800 focus:text-cyan-400 cursor-pointer">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Chat with Buyer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Refund Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 text-white shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-800/50 sticky top-0 bg-gray-900/95 backdrop-blur-xl z-20">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30 text-cyan-400">
                <Eye className="w-5 h-5" />
              </div>
              Refund Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center border border-red-500/30">
                    <h3 className="text-xl font-black text-white">{selectedRefund.crypto_currency}</h3>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Refund Amount</p>
                    <h2 className="text-3xl font-black text-white tracking-tight">{selectedRefund.amount}</h2>
                    <p className="text-gray-500 font-medium">{selectedRefund.refund_type === 'full' ? 'Full Refund' : 'Partial Refund'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-sm px-3 py-1 mb-2 font-bold ${getStatusColor(selectedRefund.status)}`}>{selectedRefund.status.replace('_', ' ')}</Badge>
                  <p className="text-sm text-gray-500 font-mono">Order: {selectedRefund.order_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <Card className="bg-gray-800/20 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest">Request Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Buyer</span>
                      <span className="text-white font-medium">{selectedRefund.buyer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created At</span>
                      <span className="text-white">{new Date(selectedRefund.created_at).toLocaleString()}</span>
                    </div>
                    {selectedRefund.vendor_decision_deadline && selectedRefund.status === 'pending_vendor' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Deadline</span>
                        <span className="text-amber-500 font-bold">{new Date(selectedRefund.vendor_decision_deadline).toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reason */}
                <Card className="bg-gray-800/20 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest">Reason</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-white text-sm leading-relaxed">{selectedRefund.reason}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Addresses */}
              {(selectedRefund.buyer_btc_payout_address || selectedRefund.buyer_xmr_payout_address) && (
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Buyer Payout Address</p>
                  {selectedRefund.buyer_btc_payout_address && (
                    <div className="mb-3">
                      <span className="text-xs text-orange-500 font-bold block mb-1">BTC Address</span>
                      <div className="lg:flex items-center gap-3">
                        <div className="flex-1 bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-300 break-all border border-gray-700/50 mb-2 lg:mb-0">
                          {selectedRefund.buyer_btc_payout_address}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedRefund.buyer_xmr_payout_address && (
                    <div>
                      <span className="text-xs text-orange-600 font-bold block mb-1">XMR Address</span>
                      <div className="lg:flex items-center gap-3">
                        <div className="flex-1 bg-gray-900/50 rounded-lg p-3 font-mono text-sm text-gray-300 break-all border border-gray-700/50 mb-2 lg:mb-0">
                          {selectedRefund.buyer_xmr_payout_address}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Decision Notes */}
              {selectedRefund.vendor_decision_notes && (
                <Card className="bg-gray-800/20 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your Decision Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-gray-300 text-sm italic">"{selectedRefund.vendor_decision_notes}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog
        open={isApproveOpen}
        onOpenChange={(open) => {
          setIsApproveOpen(open);
          if (!open) {
            setApproveNotes("");
            setTransactionHashValue("");
            setExternalWalletAddress("");
            setPaymentSource('platform');
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-xl mx-4 sm:mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 text-white shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-800/50">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              Approve Refund
            </DialogTitle>
            <DialogDescription className="text-gray-400 ml-1">
              {selectedRefund?.use_escrow
                ? "This order uses escrow. You can process the refund instantly."
                : "Standard order. You must send coins manually from your wallet."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {selectedRefund && selectedRefund.use_escrow ? (
              // Escrow orders: Only show "Refund Now" option
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5 flex gap-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg h-fit text-emerald-400">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-emerald-400 font-bold text-base mb-1">Escrow Protected</h4>
                    <p className="text-emerald-200/70 text-sm leading-relaxed">
                      Funds are currently held in the platform escrow wallet. Approving will automatically release <span className="font-bold text-white">{selectedRefund.amount} {selectedRefund.crypto_currency}</span> back to the buyer instantly.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Non-escrow orders: Show manual refund options
              <>
                {selectedRefund && (
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-gray-300 uppercase tracking-wide">Select Refund Source</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentSource('platform')}
                        className={`p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${paymentSource === 'platform'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                          }`}
                      >
                        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${paymentSource === 'platform' ? 'border-emerald-500' : 'border-gray-600'}`}>
                          {paymentSource === 'platform' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                        </div>
                        <div className="font-bold text-sm text-white mb-1 group-hover:text-emerald-400 transition-colors">Saved Payout Wallet</div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Send from your registered vendor wallet address.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentSource('external')}
                        className={`p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${paymentSource === 'external'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                          }`}
                      >
                        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${paymentSource === 'external' ? 'border-emerald-500' : 'border-gray-600'}`}>
                          {paymentSource === 'external' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                        </div>
                        <div className="font-bold text-sm text-white mb-1 group-hover:text-emerald-400 transition-colors">External Wallet</div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Send from a different wallet manually.
                        </p>
                      </button>
                    </div>

                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 mt-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <AlertCircle className="w-24 h-24 text-gray-500" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 relative z-10">Buyer's Payout Address ({selectedRefund.crypto_currency})</p>
                      <div className="font-mono text-sm text-emerald-400 break-all bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 relative z-10 flex items-center justify-between group">
                        <span>{selectedRefund.crypto_currency === 'BTC'
                          ? (selectedRefund.buyer_btc_payout_address || 'Not provided')
                          : (selectedRefund.buyer_xmr_payout_address || 'Not provided')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentSource === 'platform' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                    <Label className="text-gray-300 text-sm font-bold mb-2 block">Transaction Hash <span className="text-red-400">*</span></Label>
                    <Input
                      value={transactionHashValue}
                      onChange={(e) => setTransactionHashValue(e.target.value)}
                      placeholder="Paste transaction hash after sending..."
                      className="bg-gray-900/50 border-gray-700/50 text-white font-mono placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11 rounded-xl"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <Info className="w-3 h-3 mr-1" /> Proof of payment is required.
                    </p>
                  </div>
                )}

                {paymentSource === 'external' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                    <div>
                      <Label className="text-gray-300 text-sm font-bold mb-2 block">Your Wallet Address <span className="text-red-400">*</span></Label>
                      <Input
                        value={externalWalletAddress}
                        onChange={(e) => setExternalWalletAddress(e.target.value)}
                        placeholder="Enter sending wallet address..."
                        className="bg-gray-900/50 border-gray-700/50 text-white font-mono placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm font-bold mb-2 block">Transaction Hash <span className="text-red-400">*</span></Label>
                      <Input
                        value={transactionHashValue}
                        onChange={(e) => setTransactionHashValue(e.target.value)}
                        placeholder="Paste transaction hash..."
                        className="bg-gray-900/50 border-gray-700/50 text-white font-mono placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-2">
              <Label htmlFor="approveNotes" className="text-gray-300 text-sm font-bold mb-2 block">Optional Notes</Label>
              <Textarea
                id="approveNotes"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add any additional context relevant to the refund..."
                rows={3}
                className="bg-gray-900/50 border-gray-700/50 text-white placeholder:text-gray-600 resize-none focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => handleApprove(selectedRefund?.use_escrow && paymentSource === 'platform')}
                disabled={isProcessing}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 h-11 rounded-xl"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {selectedRefund?.use_escrow ? 'Confirm Automatic Refund' : 'Approve & Submit Refund'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsApproveOpen(false)}
                className="sm:w-32 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-11 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 max-w-lg shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-800/50">
            <DialogTitle className="text-white text-xl font-black flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-500">
                <XCircle className="w-5 h-5" />
              </div>
              Reject Refund
            </DialogTitle>
            <DialogDescription className="text-gray-400 ml-1">
              Rejecting this refund may lead to a dispute if the buyer disagrees.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div>
              <Label htmlFor="rejectReason" className="text-gray-300 mb-2 block font-bold text-sm uppercase tracking-wide">Rejection Reason <span className="text-red-500">*</span></Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain clearly why you are rejecting this refund request..."
                rows={4}
                required
                className="bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-600 resize-none focus:ring-red-500/20 focus:border-red-500/50 rounded-xl"
              />
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200/80 leading-relaxed font-medium">
                The buyer will be notified immediately. If they escalate this to a dispute, admins will review your reason and may intervene.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()} className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold shadow-lg shadow-red-600/20 h-11 rounded-xl">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => {
                setIsRejectOpen(false);
                setRejectReason("");
              }} className="sm:w-32 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-11 rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Refund Modal */}
      <Dialog
        open={isProcessOpen}
        onOpenChange={(open) => {
          setIsProcessOpen(open);
          if (!open) {
            setProcessNotes("");
            setTransactionHashValue("");
            setExternalWalletAddress("");
            setPaymentSource('platform');
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-xl mx-4 sm:mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 text-white shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-800/50">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-500">
                <RefreshCw className="w-5 h-5" />
              </div>
              Process Required Refund
            </DialogTitle>
            <DialogDescription className="text-gray-400 ml-1">
              An admin has resolved a dispute in the buyer's favor. You must process this refund immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {selectedRefund && (
              <div className="space-y-4">
                <Label className="text-sm font-bold text-gray-300 uppercase tracking-wide">Select Refund Source</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentSource('platform')}
                    className={`p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${paymentSource === 'platform'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                      }`}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${paymentSource === 'platform' ? 'border-emerald-500' : 'border-gray-600'}`}>
                      {paymentSource === 'platform' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                    </div>
                    <div className="font-bold text-sm text-white mb-1 group-hover:text-emerald-400 transition-colors">Your Payout Wallet</div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Send from your registered vendor wallet.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSource('external')}
                    className={`p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${paymentSource === 'external'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                      }`}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${paymentSource === 'external' ? 'border-emerald-500' : 'border-gray-600'}`}>
                      {paymentSource === 'external' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                    </div>
                    <div className="font-bold text-sm text-white mb-1 group-hover:text-emerald-400 transition-colors">External Wallet</div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Send from a different wallet manually.
                    </p>
                  </button>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-4 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-2 relative z-10">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Buyer's {selectedRefund.crypto_currency} Address</p>
                    <Badge className="bg-red-500 text-white border-0 font-bold shadow-lg shadow-red-500/20">
                      {selectedRefund.amount} {selectedRefund.crypto_currency}
                    </Badge>
                  </div>
                  <div className="font-mono text-sm text-red-200 break-all bg-gray-900/50 p-3 rounded-lg border border-red-500/20 relative z-10">
                    {selectedRefund.crypto_currency === 'BTC'
                      ? (selectedRefund.buyer_btc_payout_address || 'Not provided')
                      : (selectedRefund.buyer_xmr_payout_address || 'Not provided')}
                  </div>
                </div>
              </div>
            )}

            {paymentSource === 'platform' && selectedRefund && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <Label className="text-blue-400 font-bold text-sm mb-2 block flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Instructions
                  </Label>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300 ml-1 leading-relaxed">
                    <li>Open your <span className="text-white font-bold">{selectedRefund.crypto_currency}</span> wallet</li>
                    <li>Send exactly <strong className="text-white bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">{selectedRefund.amount} {selectedRefund.crypto_currency}</strong> to the address above</li>
                    <li>Wait for the transaction to be confirmed</li>
                    <li>Copy the transaction hash and paste it below</li>
                  </ol>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm font-bold mb-2 block">Transaction Hash <span className="text-red-400">*</span></Label>
                  <Input
                    value={transactionHashValue}
                    onChange={(e) => setTransactionHashValue(e.target.value)}
                    placeholder="Paste transaction hash here..."
                    className="bg-gray-900/50 border-gray-700/50 text-white font-mono placeholder:text-gray-600 focus:border-red-500/50 focus:ring-red-500/20 h-11 rounded-xl"
                    required
                  />
                </div>
              </div>
            )}

            {paymentSource === 'external' && selectedRefund && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <Label className="text-blue-400 font-bold text-sm mb-2 block flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Instructions
                  </Label>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300 ml-1 leading-relaxed">
                    <li>Open your external <span className="text-white font-bold">{selectedRefund.crypto_currency}</span> wallet</li>
                    <li>Send exactly <strong className="text-white bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">{selectedRefund.amount} {selectedRefund.crypto_currency}</strong> to the address above</li>
                    <li>Wait for the transaction to be confirmed</li>
                    <li>Enter your wallet address and the transaction hash below</li>
                  </ol>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm font-bold mb-2 block">Your Wallet Address <span className="text-red-400">*</span></Label>
                  <Input
                    value={externalWalletAddress}
                    onChange={(e) => setExternalWalletAddress(e.target.value)}
                    placeholder="Enter sending wallet address..."
                    className="bg-gray-900/50 border-gray-700/50 text-white font-mono placeholder:text-gray-600 focus:border-red-500/50 focus:ring-red-500/20 h-11 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm font-bold mb-2 block">Transaction Hash <span className="text-red-400">*</span></Label>
                  <Input
                    value={transactionHashValue}
                    onChange={(e) => setTransactionHashValue(e.target.value)}
                    placeholder="Paste transaction hash here..."
                    className="bg-gray-900/50 border-gray-700/50 text-white font-mono placeholder:text-gray-600 focus:border-red-500/50 focus:ring-red-500/20 h-11 rounded-xl"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="processNotes" className="text-gray-300 text-sm font-bold mb-2 block">Optional Notes</Label>
              <Textarea
                id="processNotes"
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
                className="bg-gray-900/50 border-gray-700/50 text-white placeholder:text-gray-600 resize-none focus:border-red-500/50 focus:ring-red-500/20 rounded-xl"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="destructive" onClick={handleProcessRefund} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/20 h-11 rounded-xl">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Refund
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => {
                setIsProcessOpen(false);
                setProcessNotes("");
                setTransactionHashValue("");
                setExternalWalletAddress("");
                setPaymentSource('platform');
              }} className="sm:w-32 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-11 rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
