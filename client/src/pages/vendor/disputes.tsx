import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, Clock, CheckCircle, XCircle, MessageSquare, FileText, Upload, Loader2, User, Package, DollarSign, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { messagingService } from "@/services/messagingService";
import { useToast } from "@/hooks/use-toast";
import disputeService, { Dispute } from "@/services/disputeService";

export default function VendorDisputes() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Response form
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [respondingToDisputeId, setRespondingToDisputeId] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, [page, statusFilter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: 20
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await disputeService.getDisputes(params);

      if (response.success) {
        setDisputes(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch disputes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch disputes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (dispute: Dispute) => {
    // Open immediately, show skeleton while loading
    setIsDetailModalOpen(true);
    setSelectedDispute({
      ...dispute,
      description: dispute.description || '',
    } as any);
    try {
      const response = await disputeService.getDisputeDetail(dispute.id);
      if (response.success && response.data) {
        setSelectedDispute(response.data.dispute);
      }
    } catch (error) {
      console.error('Error fetching dispute details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispute details",
        variant: "destructive"
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedDispute || !responseText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a response message",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await disputeService.sendDisputeMessage(selectedDispute.id, {
        message: responseText.trim()
      });

      if (response.success) {
        toast({
          title: "Response Sent",
          description: "Your response has been sent successfully",
        });

        setIsResponseModalOpen(false);
        setResponseText("");

        // Refresh disputes to get updated message count
        fetchDisputes();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to send response",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-theme-red/20 text-theme-red border-theme-red/30';
      case 'in_progress': return 'bg-theme-cyan/20 text-theme-cyan border-theme-cyan/30';
      case 'resolved': return 'bg-theme-cyan/10 text-theme-cyan border-theme-cyan/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'escalated': return 'bg-theme-red/20 text-theme-red border-theme-red/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-theme-red';
      case 'high': return 'bg-theme-red/80';
      case 'medium': return 'bg-theme-cyan/80';
      case 'low': return 'bg-theme-cyan';
      default: return 'bg-gray-500';
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch =
      dispute.dispute_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.buyer_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalDisputes = disputes.length;
  const openDisputes = disputes.filter(d => d.status === "open").length;
  const inProgressDisputes = disputes.filter(d => d.status === "in_progress").length;
  const resolvedDisputes = disputes.filter(d => d.status === "resolved").length;

  return (
    <div className="space-y-4 sm:space-y-6 relative z-10 p-3 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Disputes & Resolution</h1>
          <p className="text-gray-400 text-sm sm:text-base">Manage customer disputes and resolve issues</p>
        </div>
        <div className="flex items-center space-x-4">
          {openDisputes > 0 && (
            <Badge className="bg-theme-red/20 text-theme-red border-theme-red/30 text-xs sm:text-sm">
              {openDisputes} urgent
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-theme-red mr-2 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Total Disputes</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{totalDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-theme-red mr-2 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Open</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{openDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-theme-cyan mr-2 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{inProgressDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-theme-cyan mr-2 sm:mr-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Resolved</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{resolvedDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search disputes..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-600 text-white text-sm sm:text-base">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-theme-cyan" />
            <span className="ml-2 text-gray-400 text-sm sm:text-base">Loading disputes...</span>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Disputes Found</h3>
              <p className="text-gray-400 text-sm sm:text-base">No disputes match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="bg-gray-900 border-gray-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-theme-red flex-shrink-0" />
                        <span className="font-mono text-theme-cyan text-sm sm:text-base break-all">#{dispute.dispute_id}</span>
                      </div>
                      <Badge className={`text-[10px] sm:text-xs ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className="bg-gray-700 text-gray-300 border-gray-600 text-[10px] sm:text-xs">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(dispute.priority)} mr-1 sm:mr-2`}></div>
                          {dispute.priority.toUpperCase()} PRIORITY
                        </div>
                      </Badge>

                      {/* Resolution Badge */}
                      {dispute.resolution !== 'pending' && (
                        <Badge className={`text-[10px] sm:text-xs ${dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial'
                          ? 'bg-theme-red/20 text-theme-red border-theme-red/30'
                          : 'bg-theme-cyan/20 text-theme-cyan border-theme-cyan/30'
                          }`}>
                          {dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial' ? (
                            <XCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          <span className="text-xs">
                            {dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial'
                              ? 'Lost' : 'Won'}
                          </span>
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 break-words">{dispute.title}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-400">Buyer</p>
                          <p className="text-white text-sm sm:text-base break-words">{dispute.buyer_username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-400">Order</p>
                          <p className="text-white text-sm sm:text-base break-all">#{dispute.order}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-400">Amount</p>
                          <p className="text-white font-mono text-sm sm:text-base break-words">{dispute.order_data?.total_amount || 'N/A'} BTC</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                      <span>Created {new Date(dispute.created_at).toLocaleDateString()}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Category: {dispute.category.replace('_', ' ')}</span>
                      {dispute.assigned_admin_username && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="break-words">Admin: {dispute.assigned_admin_username}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 lg:ml-6 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 flex-1 sm:flex-initial text-xs sm:text-sm"
                      onClick={() => handleViewDetails(dispute)}
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                    {(dispute.status === 'open' || dispute.status === 'in_progress') && (
                      <Button
                        size="sm"
                        className="bg-theme-cyan hover:bg-theme-cyan/80 text-black flex-1 sm:flex-initial text-xs sm:text-sm"
                        disabled={respondingToDisputeId === dispute.id}
                        onClick={async () => {
                          const currentDisputeId = dispute.id;
                          setRespondingToDisputeId(currentDisputeId);
                          try {
                            // Fetch full dispute detail to get buyer id and product id
                            const resp = await disputeService.getDisputeDetail(dispute.id);
                            const full = resp?.data?.dispute || null;
                            const productId = full?.product || dispute.product;
                            const buyerId = full?.buyer;

                            if (!productId || !buyerId) {
                              toast({
                                title: "Error",
                                description: "Could not load dispute details. Missing product or buyer information.",
                                variant: "destructive",
                              });
                              setRespondingToDisputeId(null);
                              return;
                            }

                            // Store context so Messages page can auto-open or create conversation
                            messagingService.setProductContextInStorage({
                              id: productId,
                              recipientId: buyerId,
                              title: dispute.title,
                              isDispute: true,
                              disputeId: dispute.id,
                              buyerUsername: dispute.buyer_username
                            });

                            // Navigate to messages page
                            navigate('/vendor/messages');
                            setRespondingToDisputeId(null);
                          } catch (e) {
                            console.error('Error fetching dispute detail:', e);
                            toast({
                              title: "Error",
                              description: "Could not load dispute details. Please try again.",
                              variant: "destructive",
                            });
                            setRespondingToDisputeId(null);
                          }
                        }}
                      >
                        {respondingToDisputeId === dispute.id ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">Opening…</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Respond</span>
                            <span className="sm:hidden">Chat</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dispute Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base sm:text-lg">Dispute Details</DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4 sm:space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Dispute Information</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">ID:</span>
                      <span className="text-white break-all text-right">{selectedDispute.dispute_id}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Status:</span>
                      <Badge className={`${getStatusColor(selectedDispute.status)} text-[10px] sm:text-xs`}>
                        {selectedDispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Priority:</span>
                      <Badge className="bg-gray-700 text-gray-300 border-gray-600 text-[10px] sm:text-xs">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedDispute.priority)} mr-1 sm:mr-2`}></div>
                          {selectedDispute.priority.toUpperCase()}
                        </div>
                      </Badge>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-white break-words text-right">{selectedDispute.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Parties</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Buyer:</span>
                      <span className="text-white break-words text-right">{selectedDispute.buyer_username}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Vendor:</span>
                      <span className="text-white break-words text-right">{selectedDispute.vendor_username}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Order:</span>
                      <span className="text-white break-all text-right">#{selectedDispute.order}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white break-words text-right">{selectedDispute.order_data?.total_amount || 'N/A'} BTC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Description</h4>
                <p className="text-gray-300 bg-gray-800 p-3 rounded-lg text-xs sm:text-sm break-words">{selectedDispute.description}</p>
              </div>

              {/* Resolution Info */}
              {selectedDispute.resolution !== 'pending' && (
                <div>
                  <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Resolution Details</h4>
                  <div className="bg-gray-800 p-3 sm:p-4 rounded-lg space-y-3">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400 text-xs sm:text-sm">Decision:</span>
                      <span className="text-white text-xs sm:text-sm break-words text-right">{selectedDispute.resolution.replace('_', ' ')}</span>
                    </div>

                    {/* Resolution Basis */}
                    <div>
                      <span className="text-gray-400 block mb-2 text-xs sm:text-sm">Resolution Basis:</span>
                      <div className="bg-gray-700 p-3 rounded-lg">
                        {selectedDispute.resolution_notes ? (
                          <p className="text-gray-300 text-xs sm:text-sm break-words">{selectedDispute.resolution_notes}</p>
                        ) : (
                          <p className="text-gray-400 italic text-xs sm:text-sm">No specific resolution notes provided by admin</p>
                        )}
                      </div>
                    </div>

                    {/* Admin Decision Details */}
                    <div className="border-t border-gray-600 pt-3">
                      <div className="flex justify-between gap-2 mb-2">
                        <span className="text-gray-400 text-xs sm:text-sm">Resolved by:</span>
                        <span className="text-white text-xs sm:text-sm break-words text-right">{selectedDispute.assigned_admin_username || 'Admin'}</span>
                      </div>
                      <div className="flex justify-between gap-2 mb-2">
                        <span className="text-gray-400 text-xs sm:text-sm">Resolved on:</span>
                        <span className="text-white text-xs sm:text-sm">
                          {selectedDispute.resolved_at ? new Date(selectedDispute.resolved_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>

                      {/* Outcome Summary */}
                      <div className="mt-3">
                        <span className="text-gray-400 block mb-2 text-xs sm:text-sm">Outcome Summary:</span>
                        <div className="bg-gray-700 p-3 rounded-lg">
                          {selectedDispute.resolution === 'buyer_wins' || selectedDispute.resolution === 'refund_full' || selectedDispute.resolution === 'refund_partial' ? (
                            <div className="flex items-center space-x-2 text-theme-red">
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">Decision was in buyer's favor</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-theme-cyan">
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">Decision was in your favor</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedDispute.refund_amount && (
                        <div className="flex justify-between gap-2 mt-3">
                          <span className="text-gray-400 text-xs sm:text-sm">Refund Amount:</span>
                          <span className="text-theme-red font-semibold text-xs sm:text-sm break-words text-right">{selectedDispute.refund_amount} BTC</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base sm:text-lg">Respond to Dispute</DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h4 className="text-white font-medium mb-2 text-sm sm:text-base break-words">Dispute: {selectedDispute.title}</h4>
                <p className="text-gray-400 text-xs sm:text-sm break-words">Respond to buyer: {selectedDispute.buyer_username}</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Your Response *
                </label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response to the buyer..."
                  className="bg-gray-800 border-gray-600 text-white min-h-32 text-sm sm:text-base"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400 mt-1">{responseText.length}/2000 characters</p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <Button
                  onClick={handleSendResponse}
                  disabled={submitting || !responseText.trim()}
                  className="bg-theme-cyan hover:bg-theme-cyan/80 text-black w-full sm:w-auto text-sm sm:text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Response
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsResponseModalOpen(false)}
                  className="border-gray-600 text-gray-300 w-full sm:w-auto text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
