import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Search, Clock, CheckCircle, XCircle, MessageSquare, Eye, Loader2, User, Package, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import disputeService, { Dispute } from "@/services/disputeService";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { PageBanner } from "@/components/PageBanner";
import { Link } from "react-router-dom";

export default function BuyerMyDisputes() {
  const { toast } = useToast();

  // State
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchMyDisputes();
  }, [page, statusFilter]);

  const fetchMyDisputes = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: 20,
        buyer_only: true // Only get disputes created by current user
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
          description: "Failed to fetch your disputes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your disputes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (dispute: Dispute) => {
    try {
      setSelectedDispute(dispute);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching dispute details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispute details",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'in_progress': return 'bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20';
      case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <MessageSquare className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const disputeCategories = [
    { value: 'product_defective', label: 'Product Defective' },
    { value: 'product_not_received', label: 'Product Not Received' },
    { value: 'product_not_as_described', label: 'Product Not As Described' },
    { value: 'vendor_not_responsive', label: 'Vendor Not Responsive' },
    { value: 'unauthorized_transaction', label: 'Unauthorized Transaction' },
    { value: 'refund_issue', label: 'Refund Issue' },
    { value: 'other', label: 'Other' }
  ];

  const disputeResolutions = [
    { value: 'buyer_wins', label: 'Buyer Wins - Full Refund' },
    { value: 'vendor_wins', label: 'Vendor Wins - No Refund' },
    { value: 'refund_partial', label: 'Partial Refund' },
    { value: 'refund_full', label: 'Full Refund' }
  ];

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageBanner
          title="Disputes"
          subtitle="Track your disputes."
          type="buyer"
          className="mb-8"
        />

        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gray-900/60 backdrop-blur-xl border rounded-3xl p-4 sm:p-6 shadow-2xl transition-all hover:border-theme-cyan/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Open</p>
                  <p className="text-xl sm:text-2xl font-black text-white">
                    {disputes.filter(d => d.status === 'open').length}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-theme-cyan/5 flex items-center justify-center border border-theme-cyan/10">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-theme-cyan" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-3xl p-4 sm:p-6 shadow-2xl transition-all hover:border-theme-cyan/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">In Progress</p>
                  <p className="text-xl sm:text-2xl font-black text-white">
                    {disputes.filter(d => d.status === 'in_progress').length}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-theme-cyan/5 flex items-center justify-center border border-theme-cyan/10">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-theme-cyan" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-3xl p-4 sm:p-6 shadow-2xl transition-all hover:border-theme-red/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Resolved</p>
                  <p className="text-xl sm:text-2xl font-black text-white">
                    {disputes.filter(d => d.status === 'resolved').length}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-theme-red/5 flex items-center justify-center border border-theme-red/10">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-theme-red" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-3xl p-4 sm:p-6 shadow-2xl transition-all hover:border-theme-red/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Total Cases</p>
                  <p className="text-xl sm:text-2xl font-black text-white">{disputes.length}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-theme-red/5 flex items-center justify-center border border-theme-red/10">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-theme-red" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters - Glass Bar */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-[2rem] p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-theme-cyan transition-colors w-5 h-5" />
                <Input
                  placeholder="Search your cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-theme-cyan/50 focus:ring-theme-cyan/10 transition-all rounded-2xl shadow-2xl"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-56 h-12 bg-black/40 border-gray-700/50 text-gray-300 rounded-2xl focus:ring-theme-cyan/10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-gray-800 text-gray-300 rounded-2xl">
                  <SelectItem value="all">All Lifecycles</SelectItem>
                  <SelectItem value="open">Active Disputes</SelectItem>
                  <SelectItem value="in_progress">Investigation</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Disputes List */}
          <div className="space-y-3 sm:space-y-4">
            {loading ? (
              <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-12 text-center shadow-2xl">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-theme-cyan/50" />
                  <span className="text-gray-500 font-medium tracking-wide">Syncing Dispute Stream...</span>
                </div>
              </div>
            ) : disputes.length === 0 ? (
              <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-16 text-center shadow-2xl">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                    <AlertTriangle className="w-10 h-10 text-gray-700" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">No Disputes Found</h3>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                    You haven't initiated any dispute protocols. If you're experiencing issues with an acquisition, you can start a dispute from your orders nexus.
                  </p>
                  <Button
                    className="h-12 px-8 bg-theme-red hover:bg-theme-red-dark text-white rounded-2xl font-bold tracking-widest uppercase transition-all shadow-lg shadow-theme-red/20 border-none"
                    onClick={() => window.location.href = '/buyer/orders'}
                  >
                    Go to Orders
                  </Button>
                </div>
              </div>
            ) : (
              disputes
                .filter(dispute =>
                  searchTerm === '' ||
                  dispute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  dispute.description.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((dispute) => (
                  <div key={dispute.id} className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden hover:border-gray-600/50 transition-all duration-300 shadow-xl group">
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                            <h3 className="text-base sm:text-lg font-semibold text-white break-words">{dispute.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={`${getStatusColor(dispute.status)} text-xs`}>
                                {getStatusIcon(dispute.status)}
                                <span className="ml-1 capitalize hidden sm:inline">{dispute.status.replace('_', ' ')}</span>
                                <span className="ml-1 capitalize sm:hidden">{dispute.status.replace('_', ' ').split(' ')[0]}</span>
                              </Badge>
                              <Badge className={`${getPriorityColor(dispute.priority)} text-xs`}>
                                <span className="capitalize hidden sm:inline">{dispute.priority} Priority</span>
                                <span className="capitalize sm:hidden">{dispute.priority}</span>
                              </Badge>

                              {/* Resolution Badge */}
                              {dispute.resolution !== 'pending' && (
                                <Badge className={`${String(dispute.resolution) === 'buyer_wins' || String(dispute.resolution) === 'refund_full' || String(dispute.resolution) === 'refund_partial'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                                  } text-xs`}>
                                  {String(dispute.resolution) === 'buyer_wins' || String(dispute.resolution) === 'refund_full' || String(dispute.resolution) === 'refund_partial' ? (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  ) : (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  )}
                                  <span className="text-xs">
                                    {String(dispute.resolution) === 'buyer_wins' || String(dispute.resolution) === 'refund_full' || String(dispute.resolution) === 'refund_partial'
                                      ? 'Won' : 'Lost'}
                                  </span>
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-400 mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base break-words">{dispute.description}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                            <div className="break-words">
                              <span className="text-gray-400">Dispute ID:</span>
                              <span className="text-white ml-2 break-all">#{dispute.dispute_id}</span>
                            </div>
                            <div className="break-words">
                              <span className="text-gray-400">Category:</span>
                              <span className="text-white ml-2">
                                {disputeCategories.find(c => c.value === dispute.category)?.label || dispute.category}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Order:</span>
                              <span className="text-white ml-2">#{dispute.order}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Created:</span>
                              <span className="text-white ml-2">
                                {new Date(dispute.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-3 lg:ml-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 border-white/5 bg-white/5 text-gray-300 hover:bg-white/10 flex-1 sm:flex-none rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all"
                            onClick={() => handleViewDetails(dispute)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Inspect Info
                          </Button>

                          {/* View Chat button for active disputes */}
                          {(dispute.status === 'open' || dispute.status === 'in_progress') && (
                            <Button
                              size="sm"
                              className="h-10 bg-theme-cyan hover:bg-theme-cyan/90 text-black flex-1 sm:flex-none rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-lg shadow-theme-cyan/20 transition-all"
                              onClick={() => {
                                // Navigate to messages with context to open this dispute's chat
                                import('@/services/messagingService').then(({ messagingService }) => {
                                  messagingService.setProductContextInStorage({
                                    id: dispute.product, // Product ID
                                    recipientId: dispute.vendor, // Vendor ID
                                    isDispute: true,
                                    disputeId: dispute.id,
                                    buyerUsername: dispute.buyer_username
                                  });
                                  window.location.href = '/buyer/messages';
                                });
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Launch Chat
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Dispute Detail Modal */}
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-3xl">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black text-white uppercase tracking-tighter">Case Intelligence</DialogTitle>
              </DialogHeader>

              {selectedDispute && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Basic Information</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Title:</span>
                        <span className="text-white">{selectedDispute.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dispute ID:</span>
                        <span className="text-white">#{selectedDispute.dispute_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <Badge className={getStatusColor(selectedDispute.status)}>
                          {getStatusIcon(selectedDispute.status)}
                          <span className="ml-1 capitalize">{selectedDispute.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Priority:</span>
                        <Badge className={getPriorityColor(selectedDispute.priority)}>
                          <span className="capitalize">{selectedDispute.priority}</span>
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Category:</span>
                        <span className="text-white">
                          {disputeCategories.find(c => c.value === selectedDispute.category)?.label || selectedDispute.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parties */}
                  <div>
                    <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Parties</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Buyer:</span>
                        <span className="text-white">{selectedDispute.buyer_username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vendor:</span>
                        <span className="text-white">{selectedDispute.vendor_username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order:</span>
                        <span className="text-white">#{selectedDispute.order}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white">
                          {selectedDispute.order_data?.total_amount || 'N/A'} {selectedDispute.order_data?.crypto_currency || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Case Context</h4>
                    <p className="text-gray-300 bg-white/5 border border-white/5 p-4 rounded-2xl text-sm leading-relaxed break-words">{selectedDispute.description}</p>
                  </div>

                  {/* Resolution Info */}
                  {selectedDispute.resolution !== 'pending' && (
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Resolution Details</h4>
                      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Decision:</span>
                          <span className="text-white">
                            {disputeResolutions.find(r => r.value === selectedDispute.resolution)?.label || selectedDispute.resolution}
                          </span>
                        </div>

                        {/* Resolution Basis */}
                        <div>
                          <span className="text-gray-400 block mb-2">Resolution Basis:</span>
                          <div className="bg-gray-700 p-3 rounded-lg">
                            {selectedDispute.resolution_notes ? (
                              <p className="text-gray-300">{selectedDispute.resolution_notes}</p>
                            ) : (
                              <p className="text-gray-400 italic">No specific resolution notes provided by admin</p>
                            )}
                          </div>
                        </div>

                        {/* Admin Decision Details */}
                        <div className="border-t border-gray-600 pt-3">
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-400">Resolved by:</span>
                            <span className="text-white">{selectedDispute.assigned_admin_username || 'Admin'}</span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-400">Resolved on:</span>
                            <span className="text-white">
                              {selectedDispute.resolved_at ? new Date(selectedDispute.resolved_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>

                          {/* Outcome Summary */}
                          <div className="mt-3">
                            <span className="text-gray-400 block mb-2">Outcome Summary:</span>
                            <div className="bg-gray-700 p-3 rounded-lg">
                              {String(selectedDispute.resolution) === 'buyer_wins' || String(selectedDispute.resolution) === 'refund_full' || String(selectedDispute.resolution) === 'refund_partial' ? (
                                <div className="flex items-center space-x-2 text-green-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Decision was in your favor</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 text-red-400">
                                  <XCircle className="w-4 h-4" />
                                  <span>Decision was in vendor's favor</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {selectedDispute.refund_amount && (
                            <div className="flex justify-between mt-3">
                              <span className="text-gray-400">Refund Amount:</span>
                              <span className="text-green-400 font-semibold">
                                {selectedDispute.refund_amount} {selectedDispute.order_data?.crypto_currency || ''}
                              </span>
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
        </div>
      </div>
    </BuyerLayout>
  );
}
