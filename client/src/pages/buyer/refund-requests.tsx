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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-8 h-8 text-theme-cyan" />
            <div>
              <h1 className="text-2xl font-bold">My Refund Requests</h1>
              <p className="text-gray-300">Track all your refund requests</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by order ID or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_vendor">Pending Vendor</SelectItem>
                  <SelectItem value="vendor_approved">Approved</SelectItem>
                  <SelectItem value="vendor_rejected">Rejected</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refunds List */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-theme-cyan" />
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No refund requests found</h3>
                <p className="text-gray-400">You haven't created any refund requests yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRefunds.map((refund) => (
                  <div key={refund.id} className="p-5 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getStatusColor(refund.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(refund.status)}
                              {getStatusDisplay(refund.status)}
                            </span>
                          </Badge>
                          <span className="text-white font-semibold">Order #{refund.order_id}</span>
                        </div>
                        <p className="text-gray-300 text-sm mb-1">{refund.reason}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                          <span>Amount: <span className="text-white font-semibold">{refund.amount} {refund.crypto_currency}</span></span>
                          <span>Type: <span className="text-white">{refund.refund_type}</span></span>
                          <span>Created: {new Date(refund.created_at).toLocaleString()}</span>
                        </div>
                        {refund.vendor_decision_deadline && refund.status === 'pending_vendor' && (
                          <p className="text-yellow-400 text-xs mt-1">
                            Vendor decision deadline: {new Date(refund.vendor_decision_deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRefund(refund);
                            setIsDetailsOpen(true);
                          }}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Refund Request Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                Order #{selectedRefund?.order_id}
              </DialogDescription>
            </DialogHeader>
            {selectedRefund && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <Badge className={getStatusColor(selectedRefund.status)}>
                      {getStatusDisplay(selectedRefund.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Amount</p>
                    <p className="text-white font-semibold">{selectedRefund.amount} {selectedRefund.crypto_currency}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Refund Type</p>
                    <p className="text-white">{selectedRefund.refund_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Created</p>
                    <p className="text-white">{new Date(selectedRefund.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Reason</p>
                  <p className="text-white bg-gray-800 p-3 rounded">{selectedRefund.reason}</p>
                </div>
                {selectedRefund.status === 'vendor_rejected' && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-400 mb-1">Refund Rejected by Vendor</h4>
                        <p className="text-red-300/80 text-sm">
                          The vendor has rejected this refund request. {selectedRefund.vendor_response ? `Reason: ${selectedRefund.vendor_response}` : 'Please contact support if you believe this is an error.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedRefund.vendor_decision_deadline && selectedRefund.status === 'pending_vendor' && (
                  <div>
                    <p className="text-gray-400 text-sm">Vendor Decision Deadline</p>
                    <p className="text-yellow-400">{new Date(selectedRefund.vendor_decision_deadline).toLocaleString()}</p>
                  </div>
                )}
                {selectedRefund.vendor_refund_required && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm">
                      <strong>Vendor refund required:</strong> The vendor must process this refund.
                    </p>
                    {selectedRefund.vendor_refund_deadline && (
                      <p className="text-yellow-400 text-xs mt-1">
                        Deadline: {new Date(selectedRefund.vendor_refund_deadline).toLocaleString()}
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

