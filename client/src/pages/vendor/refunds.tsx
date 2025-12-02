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
  MessageSquare
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
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "vendor_approved":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "vendor_rejected":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "disputed":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "admin_approved":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "completed":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending_vendor":
      return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "vendor_approved":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "vendor_rejected":
      return <X className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "disputed":
      return <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "admin_approved":
      return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "completed":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    default:
      return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
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

  const handleApprove = async () => {
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
      const result = await refundService.approveRefund(selectedRefund.id, {
        notes: approveNotes,
        payment_source: paymentSource,
        transaction_hash: paymentSource === 'platform' ? transactionHashValue.trim() : undefined,
        external_wallet_address: paymentSource === 'external' ? externalWalletAddress.trim() : undefined,
      });
      if (result.success) {
        toast({
          title: "Success",
          description: "Refund approved successfully",
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Refund Management</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage buyer refund requests and process refunds</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto text-xs sm:text-sm border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={() => {
              fetchRefunds();
              fetchPendingRefunds();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Urgent Alerts */}
        {(totalPendingDecision > 0 || totalPendingRefund > 0) && (
          <div className="space-y-3">
            {totalPendingDecision > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <div>
                        <p className="text-yellow-400 font-semibold">
                          {totalPendingDecision} Refund Request{totalPendingDecision > 1 ? 's' : ''} Pending Your Decision
                        </p>
                        <p className="text-yellow-300/70 text-sm">
                          You have 48 hours to approve or reject these requests
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusFilter('pending_vendor')}
                      className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/20"
                    >
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {totalPendingRefund > 0 && (
              <Card className="border-red-500/50 bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="text-red-400 font-semibold">
                          {totalPendingRefund} Refund{totalPendingRefund > 1 ? 's' : ''} Requiring Processing
                        </p>
                        <p className="text-red-300/70 text-sm">
                          Admin resolved dispute in buyer's favor. Please process refund immediately.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Filter to show only pending refunds
                        const pending = refunds.filter(r => r.vendor_refund_required && !r.vendor_refund_completed);
                        setRefunds(pending);
                      }}
                      className="border-red-400 text-red-400 hover:bg-red-400/20"
                    >
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search order ID, buyer, reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
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

        {/* Refunds List */}
        <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-pink-600">
              Refund Requests ({filteredRefunds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {isLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 animate-spin mx-auto" />
                  <p className="text-gray-400 mt-4 text-sm sm:text-base">Loading refunds...</p>
                </div>
              ) : filteredRefunds.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">No refunds found</h3>
                  <p className="text-gray-400 text-sm sm:text-base">No refund requests at this time.</p>
                </div>
              ) : (
                filteredRefunds.map((refund) => (
                  <div 
                    key={refund.id} 
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base truncate">Order: {refund.order_id}</h3>
                          <Badge className={`text-[10px] sm:text-xs border ${getStatusColor(refund.status)}`}>
                            <span className="mr-1">
                              {getStatusIcon(refund.status)}
                            </span>
                            {refund.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          {refund.vendor_refund_required && !refund.vendor_refund_completed && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] sm:text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Action Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mb-1 break-words">Buyer: {refund.buyer}</p>
                        <p className="text-xs sm:text-sm text-gray-400 break-words">Reason: {refund.reason}</p>
                        {refund.vendor_decision_deadline && refund.status === 'pending_vendor' && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Decision deadline: {new Date(refund.vendor_decision_deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-3 sm:gap-4 lg:gap-2 xl:gap-6 flex-shrink-0">
                      <div className="text-left sm:text-right lg:text-right">
                        <div className="font-semibold text-blue-400 text-sm sm:text-base">{refund.amount}</div>
                        <div className="text-xs sm:text-sm text-gray-400">{refund.crypto_currency}</div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
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
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRefund(refund);
                                setIsRejectOpen(true);
                              }}
                              className="text-xs"
                            >
                              <X className="w-3 h-3 mr-1" />
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
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Process Refund
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              disabled={openingChat === refund.id}
                            >
                              {openingChat === refund.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[90vw] sm:w-auto">
                            <DropdownMenuItem onClick={() => {
                              setSelectedRefund(refund);
                              setIsDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              setOpeningChat(refund.id);
                              try {
                                // Use product_id and buyer_id from refund data (already included in API response)
                                const productId = refund.product_id;
                                const buyerId = refund.buyer_id;
                                
                                if (!productId || !buyerId) {
                                  toast({
                                    title: "Error",
                                    description: "Order details not available. Please refresh the page and try again.",
                                    variant: "destructive",
                                  });
                                  setOpeningChat(null);
                                  return;
                                }
                                
                                // Set context for messaging page - this will create conversation and auto-select it
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
                                  description: "Failed to open chat. Please try again.",
                                  variant: "destructive",
                                });
                                setOpeningChat(null);
                              }
                            }}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Chat with Buyer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Refund Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRefund && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-white">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Order ID:</span>
                      <span className="font-mono text-white text-xs sm:text-sm break-all">{selectedRefund.order_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Buyer:</span>
                      <span className="text-white text-xs sm:text-sm break-words">{selectedRefund.buyer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Type:</span>
                      <Badge className={`text-[10px] sm:text-xs border ${selectedRefund.refund_type === 'full' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {selectedRefund.refund_type === 'full' ? 'Full' : 'Partial'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Status:</span>
                      <Badge className={`text-[10px] sm:text-xs border ${getStatusColor(selectedRefund.status)}`}>
                        {selectedRefund.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-white">Amount Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Amount:</span>
                      <span className="font-semibold text-blue-400 text-xs sm:text-sm break-words">{selectedRefund.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Currency:</span>
                      <span className="text-white text-xs sm:text-sm">{selectedRefund.crypto_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Created:</span>
                      <span className="text-white text-xs sm:text-sm">{new Date(selectedRefund.created_at).toLocaleString()}</span>
                    </div>
                    {selectedRefund.vendor_decision_deadline && selectedRefund.status === 'pending_vendor' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-xs sm:text-sm">Decision Deadline:</span>
                        <span className="text-yellow-400 text-xs sm:text-sm">{new Date(selectedRefund.vendor_decision_deadline).toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-sm sm:text-base text-white">Reason</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-gray-300 text-xs sm:text-sm">{selectedRefund.reason}</p>
                </CardContent>
              </Card>

              {(selectedRefund.buyer_btc_payout_address || selectedRefund.buyer_xmr_payout_address) && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-white">Buyer Payout Addresses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 space-y-2">
                    {selectedRefund.buyer_btc_payout_address && (
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">BTC Address:</span>
                        <p className="text-white text-xs sm:text-sm font-mono break-all">
                          {selectedRefund.buyer_btc_payout_address}
                        </p>
                      </div>
                    )}
                    {selectedRefund.buyer_xmr_payout_address && (
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">XMR Address:</span>
                        <p className="text-white text-xs sm:text-sm font-mono break-all">
                          {selectedRefund.buyer_xmr_payout_address}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedRefund.vendor_decision_notes && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-white">Your Decision Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-gray-300 text-xs sm:text-sm">{selectedRefund.vendor_decision_notes}</p>
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
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Refund</DialogTitle>
            <DialogDescription className="text-gray-400">
              Follow these steps to complete the refund process. You must send the coins manually from your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRefund && (
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Refund Source</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentSource('platform')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      paymentSource === 'platform'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm">Your Payout Wallet Address</div>
                    <p className="text-xs text-gray-400 mt-1">
                      Send from your saved payout wallet address (from VendorApplication).
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSource('external')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      paymentSource === 'external'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm">External Wallet</div>
                    <p className="text-xs text-gray-400 mt-1">
                      Send manually from your external wallet and provide transaction hash.
                    </p>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Buyer payout address ({selectedRefund.crypto_currency}):{" "}
                  <span className="font-mono text-gray-300">
                    {selectedRefund.crypto_currency === 'BTC'
                      ? (selectedRefund.buyer_btc_payout_address || 'Not provided')
                      : (selectedRefund.buyer_xmr_payout_address || 'Not provided')}
                  </span>
                </p>
              </div>
            )}

            {paymentSource === 'platform' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">Transaction Hash *</Label>
                  <Input
                    value={transactionHashValue}
                    onChange={(e) => setTransactionHashValue(e.target.value)}
                    placeholder="Paste the blockchain transaction hash after sending from your payout wallet"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Send {selectedRefund?.amount} {selectedRefund?.crypto_currency} manually from your payout wallet address (saved in VendorApplication) to buyer's address, then paste the transaction hash here.
                  </p>
                </div>
              </div>
            )}

            {paymentSource === 'external' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">External Wallet Address *</Label>
                  <Input
                    value={externalWalletAddress}
                    onChange={(e) => setExternalWalletAddress(e.target.value)}
                    placeholder="Enter the external wallet address you will use for refund"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Transaction Hash *</Label>
                  <Input
                    value={transactionHashValue}
                    onChange={(e) => setTransactionHashValue(e.target.value)}
                    placeholder="Paste the blockchain transaction hash after sending from external wallet"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Send {selectedRefund?.amount} {selectedRefund?.crypto_currency} manually from the external wallet address above to buyer's address, then paste the transaction hash here.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="approveNotes">Notes (Optional)</Label>
              <Textarea
                id="approveNotes"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsApproveOpen(false);
                setApproveNotes("");
                setTransactionHashValue("");
                setExternalWalletAddress("");
                setPaymentSource('platform');
              }}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Refund
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Refund</DialogTitle>
            <DialogDescription className="text-gray-400">
              Rejecting this refund will allow the buyer to open a dispute if they disagree.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you are rejecting this refund request..."
                rows={4}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsRejectOpen(false);
                setRejectReason("");
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Reject Refund
                  </>
                )}
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
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Process Refund</DialogTitle>
            <DialogDescription className="text-gray-400">
              Follow these steps to complete the refund process. You must send the coins manually from your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRefund && (
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Refund Source</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentSource('platform')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      paymentSource === 'platform'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm">Your Payout Wallet Address</div>
                    <p className="text-xs text-gray-400 mt-1">
                      Send from your saved payout wallet address (from VendorApplication).
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSource('external')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      paymentSource === 'external'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm">External Wallet</div>
                    <p className="text-xs text-gray-400 mt-1">
                      Send manually from your external wallet and provide transaction hash.
                    </p>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Buyer payout address ({selectedRefund.crypto_currency}):{" "}
                  <span className="font-mono text-gray-300">
                    {selectedRefund.crypto_currency === 'BTC'
                      ? (selectedRefund.buyer_btc_payout_address || 'Not provided')
                      : (selectedRefund.buyer_xmr_payout_address || 'Not provided')}
                  </span>
                </p>
              </div>
            )}

            {paymentSource === 'platform' && selectedRefund && (
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="text-blue-400 font-semibold text-sm mb-2 block">Step-by-Step Instructions:</Label>
                    <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300">
                      <li>Open your {selectedRefund.crypto_currency} wallet (the one saved in your VendorApplication settings)</li>
                      <li>Send exactly <strong className="text-white">{selectedRefund.amount} {selectedRefund.crypto_currency}</strong> to the buyer's payout address shown below</li>
                      <li>Wait for the transaction to be confirmed on the blockchain</li>
                      <li>Copy the transaction hash from your wallet</li>
                      <li>Paste the transaction hash in the field below and click "Process Refund"</li>
                    </ol>
                  </div>
                  <div className="bg-gray-800 rounded p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Buyer's {selectedRefund.crypto_currency} Payout Address:</p>
                    <p className="text-xs font-mono text-white break-all">
                      {selectedRefund?.crypto_currency === 'BTC' 
                        ? (selectedRefund?.buyer_btc_payout_address || 'Not provided')
                        : (selectedRefund?.buyer_xmr_payout_address || 'Not provided')}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Transaction Hash *</Label>
                  <Input
                    value={transactionHashValue}
                    onChange={(e) => setTransactionHashValue(e.target.value)}
                    placeholder="Paste the blockchain transaction hash here after sending coins"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    After sending {selectedRefund?.amount} {selectedRefund?.crypto_currency} to the buyer's address above, paste the transaction hash here.
                  </p>
                </div>
              </div>
            )}

            {paymentSource === 'external' && selectedRefund && (
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="text-blue-400 font-semibold text-sm mb-2 block">Step-by-Step Instructions:</Label>
                    <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300">
                      <li>Open your external {selectedRefund.crypto_currency} wallet</li>
                      <li>Send exactly <strong className="text-white">{selectedRefund.amount} {selectedRefund.crypto_currency}</strong> to the buyer's payout address shown below</li>
                      <li>Wait for the transaction to be confirmed on the blockchain</li>
                      <li>Copy the transaction hash from your wallet</li>
                      <li>Enter the external wallet address you used and paste the transaction hash below, then click "Process Refund"</li>
                    </ol>
                  </div>
                  <div className="bg-gray-800 rounded p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Buyer's {selectedRefund.crypto_currency} Payout Address:</p>
                    <p className="text-xs font-mono text-white break-all">
                      {selectedRefund?.crypto_currency === 'BTC' 
                        ? (selectedRefund?.buyer_btc_payout_address || 'Not provided')
                        : (selectedRefund?.buyer_xmr_payout_address || 'Not provided')}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">External Wallet Address *</Label>
                  <Input
                    value={externalWalletAddress}
                    onChange={(e) => setExternalWalletAddress(e.target.value)}
                    placeholder="Enter the external wallet address you used to send the refund"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter the external wallet address from which you sent the refund.
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Transaction Hash *</Label>
                  <Input
                    value={transactionHashValue}
                    onChange={(e) => setTransactionHashValue(e.target.value)}
                    placeholder="Paste the blockchain transaction hash here after sending coins"
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    After sending {selectedRefund?.amount} {selectedRefund?.crypto_currency} to the buyer's address, paste the transaction hash here.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="processNotes">Notes (Optional)</Label>
              <Textarea
                id="processNotes"
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                placeholder="Add any notes about this refund..."
                rows={3}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            {selectedRefund && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  <strong>Amount to refund:</strong> {selectedRefund.amount} {selectedRefund.crypto_currency}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsProcessOpen(false);
                setProcessNotes("");
                setTransactionHashValue("");
                setExternalWalletAddress("");
                setPaymentSource('platform');
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleProcessRefund} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
