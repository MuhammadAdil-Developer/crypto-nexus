import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, 
  Loader2, 
  Eye, 
  CheckCircle, 
  X, 
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DollarSign
} from "lucide-react";
import { refundService, RefundRequest, Dispute } from "@/services/refundService";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminRefundDisputes() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState<"refunds" | "disputes">("disputes");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [resolution, setResolution] = useState<"buyer_wins" | "vendor_wins" | "partial_refund">("buyer_wins");
  const [resolutionAmount, setResolutionAmount] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === "refunds") {
      fetchRefunds();
    } else {
      fetchDisputes();
    }
  }, [activeTab, currentPage, statusFilter]);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      const result = await refundService.getAdminRefundRequests(currentPage, itemsPerPage, statusFilter === "all" ? undefined : statusFilter);
      if (result.success) {
        setRefunds(result.data || []);
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

  const fetchDisputes = async () => {
    try {
      setIsLoading(true);
      const result = await refundService.getAdminDisputes(currentPage, itemsPerPage, statusFilter === "all" ? undefined : statusFilter);
      if (result.success) {
        setDisputes(result.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch disputes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    if (resolution === 'partial_refund' && !resolutionAmount) {
      toast({
        title: "Error",
        description: "Please enter a resolution amount for partial refund",
        variant: "destructive",
      });
      return;
    }

    if (!resolutionNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide resolution notes",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsResolving(true);
      const result = await refundService.resolveDispute(selectedDispute.id, {
        resolution,
        resolution_amount: resolution === 'partial_refund' ? resolutionAmount : undefined,
        resolution_notes: resolutionNotes,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: `Dispute resolved: ${resolution}`,
        });
        setIsResolveOpen(false);
        setSelectedDispute(null);
        setResolution("buyer_wins");
        setResolutionAmount("");
        setResolutionNotes("");
        fetchDisputes();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to resolve dispute",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to resolve dispute",
        variant: "destructive",
      });
    } finally {
      setIsResolving(false);
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dispute.refund_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredDisputes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedDisputes = filteredDisputes.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Refund & Dispute Management</h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1">Manage refund requests and resolve disputes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeTab === "refunds") fetchRefunds();
            else fetchDisputes();
          }}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <Button
          variant={activeTab === "disputes" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("disputes");
            setCurrentPage(1);
          }}
          className={activeTab === "disputes" ? "bg-blue-600" : "text-gray-400"}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Disputes ({disputes.length})
        </Button>
        <Button
          variant={activeTab === "refunds" ? "default" : "ghost"}
          onClick={() => {
            setActiveTab("refunds");
            setCurrentPage(1);
          }}
          className={activeTab === "refunds" ? "bg-blue-600" : "text-gray-400"}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Refunds ({refunds.length})
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
                  placeholder="Search order ID, refund ID..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      {activeTab === "disputes" && (
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-pink-600">
              Disputes ({filteredDisputes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {isLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 animate-spin mx-auto" />
                  <p className="text-gray-400 mt-4 text-sm sm:text-base">Loading disputes...</p>
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">No disputes found</h3>
                  <p className="text-gray-400 text-sm sm:text-base">No disputes require resolution at this time.</p>
                </div>
              ) : (
                displayedDisputes.map((dispute) => (
                  <div 
                    key={dispute.id} 
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base truncate">Order: {dispute.order_id}</h3>
                          <Badge className={`text-[10px] sm:text-xs border ${getStatusColor(dispute.status)}`}>
                            {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
                          </Badge>
                          {dispute.resolution && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] sm:text-xs">
                              Resolved: {dispute.resolution.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mb-1 break-words">Reason: {dispute.reason}</p>
                        {dispute.resolution_amount && (
                          <p className="text-xs sm:text-sm text-green-400">
                            Resolution Amount: {dispute.resolution_amount}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {dispute.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setIsResolveOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // View details
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredDisputes.length)} of {filteredDisputes.length}
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
          </CardContent>
        </Card>
      )}

      {/* Resolve Dispute Modal */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Resolve Dispute</DialogTitle>
            <DialogDescription className="text-gray-400">
              Make a decision on this dispute. Your decision will be final.
            </DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Dispute Details</h4>
                <p className="text-gray-300 text-sm mb-2">Order ID: {selectedDispute.order_id}</p>
                <p className="text-gray-300 text-sm mb-2">Reason: {selectedDispute.reason}</p>
                {selectedDispute.evidence && Object.keys(selectedDispute.evidence).length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-xs">Evidence provided</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="resolution">Resolution *</Label>
                <Select value={resolution} onValueChange={(value: "buyer_wins" | "vendor_wins" | "partial_refund") => setResolution(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer_wins">Buyer Wins - Full Refund</SelectItem>
                    <SelectItem value="vendor_wins">Vendor Wins - No Refund</SelectItem>
                    <SelectItem value="partial_refund">Partial Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resolution === 'partial_refund' && (
                <div>
                  <Label htmlFor="resolutionAmount">Refund Amount *</Label>
                  <Input
                    id="resolutionAmount"
                    type="number"
                    step="0.00000001"
                    value={resolutionAmount}
                    onChange={(e) => setResolutionAmount(e.target.value)}
                    placeholder="Enter refund amount"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="resolutionNotes">Resolution Notes *</Label>
                <Textarea
                  id="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain your decision..."
                  rows={5}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsResolveOpen(false);
                  setSelectedDispute(null);
                  setResolution("buyer_wins");
                  setResolutionAmount("");
                  setResolutionNotes("");
                }}>
                  Cancel
                </Button>
                <Button onClick={handleResolveDispute} disabled={isResolving || !resolutionNotes.trim() || (resolution === 'partial_refund' && !resolutionAmount)} className="bg-blue-600 hover:bg-blue-700">
                  {isResolving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve Dispute
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


