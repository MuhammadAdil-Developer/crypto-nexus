import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Loader2
} from "lucide-react";
import { refundService, RefundRequest } from "@/services/refundService";
import { useToast } from "@/hooks/use-toast";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageBanner } from "@/components/PageBanner";

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending_vendor":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "vendor_approved":
      return "bg-theme-cyan-dim text-theme-cyan border-theme-cyan/30";
    case "vendor_rejected":
      return "bg-theme-red/20 text-theme-red border-theme-red/30";
    case "disputed":
      return "bg-theme-red/20 text-theme-red border-theme-red/30";
    case "admin_approved":
      return "bg-theme-cyan-dim text-theme-cyan border-theme-cyan/30";
    case "completed":
      return "bg-theme-cyan-dim text-theme-cyan border-theme-cyan/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending_vendor":
      return <Clock className="w-4 h-4" />;
    case "vendor_approved":
      return <CheckCircle className="w-4 h-4" />;
    case "vendor_rejected":
      return <XCircle className="w-4 h-4" />;
    case "disputed":
      return <AlertTriangle className="w-4 h-4" />;
    case "admin_approved":
      return <CheckCircle className="w-4 h-4" />;
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

const getStatusDisplay = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending_vendor":
      return "Pending Vendor";
    case "vendor_approved":
      return "Approved";
    case "vendor_rejected":
      return "Rejected";
    case "disputed":
      return "Disputed";
    case "admin_approved":
      return "Admin Approved";
    case "completed":
      return "Completed";
    default:
      return status;
  }
};

export default function BuyerRefundRequests() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter]);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      const result = await refundService.getBuyerRefundRequests(
        1,
        100,
        statusFilter === "all" ? undefined : statusFilter
      );
      if (result.success) {
        setRefunds(result.data || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch refund requests",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fetching refund requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch refund requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch =
      refund.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageBanner
          title="Refunds"
          subtitle="Track your refund status."
          type="buyer"
          className="mb-8"
        />

        {/* Filters - Glass Bar */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-[2rem] p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-theme-cyan transition-colors w-5 h-5" />
              <Input
                placeholder="Search by order ID or reason..."
                className="pl-12 h-12 bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all rounded-2xl shadow-2xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56 h-12 bg-black/40 border-gray-700/50 text-gray-300 rounded-2xl focus:ring-theme-cyan/10">
                <SelectValue placeholder="Display All Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-800 text-gray-300 rounded-2xl">
                <SelectItem value="all">All Request Status</SelectItem>
                <SelectItem value="pending_vendor">Waiting for Vendor</SelectItem>
                <SelectItem value="vendor_approved">Approved Requests</SelectItem>
                <SelectItem value="vendor_rejected">Rejected Requests</SelectItem>
                <SelectItem value="disputed">Under Dispute</SelectItem>
                <SelectItem value="completed">Completed & Finalized</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Refunds List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-2xl">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-theme-cyan" />
                <span className="text-gray-400 font-medium tracking-wide">loading Refund...</span>
              </div>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-16 text-center shadow-2xl">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                  <RefreshCw className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">No Refunds Found</h3>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  You haven't initiated any refund protocols. If you're experiencing issues with an acquisition, you can start a refund from your orders dashboard.
                </p>
                <Button
                  className="h-12 px-8 bg-theme-cyan hover:bg-theme-cyan-dark text-white rounded-2xl font-bold tracking-widest uppercase transition-all shadow-lg shadow-theme-cyan/20"
                  onClick={() => window.location.href = '/buyer/orders'}
                >
                  Access Orders
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRefunds.map((refund) => (
                <div key={refund.id} className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden hover:border-gray-600/50 transition-all duration-300 shadow-xl group p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1.5", getStatusColor(refund.status))}>
                          {getStatusIcon(refund.status)}
                          {getStatusDisplay(refund.status)}
                        </Badge>
                        <span className="text-white font-black text-sm tracking-tight flex items-center uppercase">
                          Reference <span className="text-theme-cyan ml-1.5 font-mono">#{refund.order_id}</span>
                        </span>
                      </div>

                      <p className="text-gray-400 mb-4 line-clamp-2 text-sm sm:text-base italic">
                        "{refund.reason}"
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                          <span className="text-gray-500 uppercase font-black text-[10px]">Amount:</span>
                          <span className="text-emerald-400 font-bold">{refund.amount} {refund.crypto_currency}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                          <span className="text-gray-500 uppercase font-black text-[10px]">Type:</span>
                          <span className="text-theme-cyan font-bold uppercase">{refund.refund_type}</span>
                        </div>
                      </div>

                      {refund.vendor_decision_deadline && refund.status === 'pending_vendor' && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                          <Clock className="w-4 h-4 text-yellow-500/70" />
                          <p className="text-yellow-500/70 text-xs font-bold uppercase tracking-tight">
                            Decision Deadline: {new Date(refund.vendor_decision_deadline).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRefund(refund);
                          setIsDetailsOpen(true);
                        }}
                        className="h-12 px-6 bg-black/20 border-gray-700/50 text-gray-300 hover:text-white hover:bg-theme-cyan/10 hover:border-theme-cyan/50 rounded-2xl font-bold tracking-widest uppercase transition-all"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Info
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-3xl">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-white uppercase tracking-tighter">Refund Details</DialogTitle>
            </DialogHeader>
            {selectedRefund && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Parameters</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Decision:</span>
                        <Badge className={getStatusColor(selectedRefund.status)}>
                          {getStatusDisplay(selectedRefund.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Valuation:</span>
                        <span className="text-emerald-400 font-bold">{selectedRefund.amount} {selectedRefund.crypto_currency}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Class:</span>
                        <span className="text-white uppercase font-bold text-xs">{selectedRefund.refund_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Initiated:</span>
                        <span className="text-white font-medium">{new Date(selectedRefund.created_at).toLocaleString()}</span>
                      </div>
                      {selectedRefund.vendor_decision_deadline && selectedRefund.status === 'pending_vendor' && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Deadline:</span>
                          <span className="text-yellow-500 font-medium">{new Date(selectedRefund.vendor_decision_deadline).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Statement of Motive</h4>
                  <p className="text-gray-300 bg-white/5 border border-white/5 p-4 rounded-2xl text-sm leading-relaxed italic break-words">
                    "{selectedRefund.reason}"
                  </p>
                </div>

                {selectedRefund.status === 'vendor_rejected' && (
                  <div className="bg-theme-red/10 border border-theme-red/20 rounded-2xl p-4 sm:p-6 space-y-3">
                    <div className="flex items-center gap-3 text-theme-red">
                      <XCircle className="w-5 h-5" />
                      <h4 className="font-black uppercase tracking-widest text-sm">Vendor Rejection</h4>
                    </div>
                    <p className="text-red-300/80 text-sm leading-relaxed">
                      {selectedRefund.vendor_decision_notes || 'No specific rejection context provided by vendor.'}
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-theme-red hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                        onClick={() => window.location.href = `/buyer/create-dispute?orderId=${selectedRefund.order_pk}&refund_id=${selectedRefund.id}`}
                      >
                        Escalate to Dispute Protocols
                      </Button>
                    </div>
                  </div>
                )}

                {selectedRefund.vendor_refund_required && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 sm:p-6 space-y-2">
                    <div className="flex items-center gap-3 text-yellow-500">
                      <AlertTriangle className="w-5 h-5" />
                      <h4 className="font-black uppercase tracking-widest text-sm">Refund Compulsory</h4>
                    </div>
                    <p className="text-yellow-500/80 text-sm">
                      Vendor is mandated to process this resolution.
                    </p>
                    {selectedRefund.vendor_refund_deadline && (
                      <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                        Termination Deadline: {new Date(selectedRefund.vendor_refund_deadline).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </BuyerLayout>
  );
}

