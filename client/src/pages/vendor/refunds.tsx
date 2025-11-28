import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Loader2, 
  MoreVertical, 
  Eye, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import refundService, { Refund } from "@/services/refundService";
import { useToast } from "@/components/ui/ToastContainer";

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "approved":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "completed":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "rejected":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "approved":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "completed":
      return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    case "rejected":
      return <X className="w-3 h-3 sm:w-4 sm:h-4" />;
    default:
      return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
  }
};

const getRefundTypeColor = (type: string) => {
  return type === "full" 
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : "bg-orange-500/20 text-orange-400 border-orange-500/30";
};

export default function VendorRefunds() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [refundStats, setRefundStats] = useState({
    total_refunds: 0,
    pending_refunds: 0,
    completed_refunds: 0,
    total_refunded_amount: "0"
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { showToast } = useToast();

  useEffect(() => {
    fetchRefunds();
    fetchStats();
  }, []);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      const result = await refundService.getVendorRefunds(currentPage, itemsPerPage);
      if (result.success) {
        setRefunds(result.data || []);
      } else {
        showToast({
          title: "Error",
          message: "Failed to fetch refunds",
          type: "error"
        });
      }
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      showToast({
        title: "Error",
        message: "Failed to fetch refunds",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await refundService.getRefundStats();
      if (result.success) {
        setRefundStats(result as any);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefund(refund);
    setIsDetailsOpen(true);
  };

  const handleCancelRefund = async (refundId: string) => {
    if (!confirm('Are you sure you want to cancel this refund request?')) return;

    setIsCancelling(true);
    try {
      const result = await refundService.cancelRefundRequest(refundId);
      if (result.success) {
        showToast({
          title: "Cancelled",
          message: "Refund request cancelled successfully",
          type: "success"
        });
        fetchRefunds();
      } else {
        showToast({
          title: "Error",
          message: result.message || "Failed to cancel refund",
          type: "error"
        });
      }
    } catch (error: any) {
      showToast({
        title: "Error",
        message: "Failed to cancel refund request",
        type: "error"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = 
      refund.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || refund.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedRefunds = filteredRefunds.slice(startIndex, endIndex);

  return (
    <>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Refund Requests</h1>
            <p className="text-gray-400 text-sm sm:text-base">Track and manage your refund requests</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto text-xs sm:text-sm border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={fetchRefunds}
            disabled={isLoading}
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border border-gray-700 bg-gray-900 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-white">{refundStats.total_refunds}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Refunds</p>
            </CardContent>
          </Card>
          <Card className="border border-yellow-700 bg-yellow-900/20 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-yellow-400">{refundStats.pending_refunds}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Pending</p>
            </CardContent>
          </Card>
          <Card className="border border-green-700 bg-green-900/20 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="text-xl sm:text-2xl font-bold text-green-400">{refundStats.completed_refunds}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Completed</p>
            </CardContent>
          </Card>
          <Card className="border border-blue-700 bg-blue-900/20 backdrop-blur-sm col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="text-lg sm:text-xl font-bold text-blue-400 break-words">{refundStats.total_refunded_amount}</div>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Refunded</p>
            </CardContent>
          </Card>
        </div>

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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                  <p className="text-gray-400 text-sm sm:text-base">You haven't requested any refunds yet.</p>
                </div>
              ) : (
                displayedRefunds.map((refund) => (
                  <div 
                    key={refund.id} 
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base truncate">Order: {refund.order_id}</h3>
                          <Badge className={`text-[10px] sm:text-xs border ${getRefundTypeColor(refund.refund_type)}`}>
                            {refund.refund_type === 'full' ? 'Full' : 'Partial'} Refund
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mb-1 break-words">Reason: {refund.reason}</p>
                        <p className="text-xs sm:text-sm text-gray-400">Buyer: {refund.buyer}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-3 sm:gap-4 lg:gap-2 xl:gap-6 flex-shrink-0">
                      <div className="text-left sm:text-right lg:text-right">
                        <div className="font-semibold text-orange-400 text-sm sm:text-base">{refund.amount}</div>
                        <div className="text-xs sm:text-sm text-gray-400">{refund.crypto_currency}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`border text-[10px] sm:text-xs ${getStatusColor(refund.status)}`}>
                          <span className="mr-1">
                            {getStatusIcon(refund.status)}
                          </span>
                          {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[90vw] sm:w-auto">
                            <DropdownMenuItem onClick={() => handleViewDetails(refund)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {refund.status === 'pending' && (
                              <DropdownMenuItem 
                                onClick={() => handleCancelRefund(refund.id)}
                                className="text-red-600"
                                disabled={isCancelling}
                              >
                                <X className="w-4 h-4 mr-2" />
                                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredRefunds.length > 0 && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-700">
                <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRefunds.length)} of {filteredRefunds.length}
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>

                  <span className="text-xs sm:text-sm text-gray-400 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refund Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-2xl">
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
                      <Badge className={`text-[10px] sm:text-xs border ${getRefundTypeColor(selectedRefund.refund_type)}`}>
                        {selectedRefund.refund_type === 'full' ? 'Full' : 'Partial'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Status:</span>
                      <Badge className={`text-[10px] sm:text-xs border ${getStatusColor(selectedRefund.status)}`}>
                        {selectedRefund.status.charAt(0).toUpperCase() + selectedRefund.status.slice(1)}
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
                      <span className="font-semibold text-orange-400 text-xs sm:text-sm break-words">{selectedRefund.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Currency:</span>
                      <span className="text-white text-xs sm:text-sm">{selectedRefund.crypto_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs sm:text-sm">Created:</span>
                      <span className="text-white text-xs sm:text-sm">{new Date(selectedRefund.created_at).toLocaleString()}</span>
                    </div>
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

              {selectedRefund.notes && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-white">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-gray-300 text-xs sm:text-sm">{selectedRefund.notes}</p>
                  </CardContent>
                </Card>
              )}

              {selectedRefund.status === 'rejected' && selectedRefund.rejection_reason && (
                <Card className="bg-red-900/20 border border-red-500/30">
                  <CardHeader className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base text-red-400">Rejection Reason</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-red-300 text-xs sm:text-sm">{selectedRefund.rejection_reason}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
