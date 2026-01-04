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
      case 'open': return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      case 'closed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-none';
      case 'escalated': return 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 shadow-red-500/50';
      case 'high': return 'bg-orange-500 shadow-orange-500/50';
      case 'medium': return 'bg-blue-500 shadow-blue-500/50';
      case 'low': return 'bg-gray-500 shadow-gray-500/50';
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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">
            Disputes & Resolution
          </h1>
          <p className="text-gray-400 font-medium max-w-lg italic text-sm sm:text-base">
            Professional management of customer issues and dispute resolution.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {openDisputes > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 flex items-center shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-400 font-bold text-sm tracking-wide uppercase">{openDisputes} Urgent Action{openDisputes > 1 ? 's' : ''} Needed</span>
            </div>
          )}
        </div>
      </div>

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Disputes */}
        <Card className="border border-purple-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-purple-200/70">Total Disputes</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{totalDisputes}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Open Disputes */}
        <Card className="border border-red-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              </div>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Action Required</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-200/70">Open Disputes</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{openDisputes}</h3>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border border-amber-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <MessageSquare className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-200/70">In Progress</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{inProgressDisputes}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card className="border border-emerald-500/20 bg-gray-900/40 backdrop-blur-sm relative overflow-hidden group hover:bg-gray-800/40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-200/70">Resolved</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white">{resolvedDisputes}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 mb-6 relative z-10">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  placeholder="Search by ID, buyer, title or description..."
                  className="pl-10 bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-indigo-500/20 focus:border-indigo-500/50 h-10 transition-all placeholder:text-gray-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-900/50 border-gray-700/50 text-white rounded-xl h-10 focus:ring-indigo-500/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
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
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <span className="text-gray-400 font-medium">Loading disputes...</span>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Disputes Found</h3>
              <p className="text-gray-400 max-w-sm mx-auto">No disputes match your current search criteria. Adjust your filters to see more results.</p>
            </CardContent>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 hover:bg-gray-800/40 transition-colors group relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${dispute.status === 'open' ? 'bg-red-500' :
                dispute.status === 'in_progress' ? 'bg-amber-500' :
                  dispute.status === 'resolved' ? 'bg-emerald-500' : 'bg-gray-600'
                }`} />
              <CardContent className="p-5 pl-7">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center space-x-2 bg-gray-800/50 px-2 py-1 rounded text-xs font-mono border border-gray-700/50">
                        <span className="text-indigo-400">#{dispute.dispute_id}</span>
                      </div>
                      <Badge className={`text-[10px] font-bold tracking-wide uppercase ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] font-bold border-0 ${getPriorityColor(dispute.priority)} text-black`}>
                        {dispute.priority.toUpperCase()} PRIORITY
                      </Badge>

                      {/* Resolution Badge */}
                      {dispute.resolution !== 'pending' && (
                        <Badge variant="outline" className={`text-[10px] bg-transparent border ${dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial'
                          ? 'text-red-400 border-red-500/30'
                          : 'text-emerald-400 border-emerald-500/30'
                          }`}>
                          {dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial' ? (
                            <XCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial' ? 'Lost' : 'Won'}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-4 group-hover:text-indigo-300 transition-colors">{dispute.title}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Buyer</p>
                          <p className="text-gray-200 font-medium">{dispute.buyer_username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Order</p>
                          <p className="text-gray-200 font-medium">#{dispute.order}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-gray-200 font-medium font-mono">{dispute.order_data?.total_amount || 'N/A'} BTC</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center mt-4 pt-4 border-t border-gray-800/50 text-xs text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> Created {new Date(dispute.created_at).toLocaleDateString()}
                      </span>
                      <span>Category: <span className="text-gray-300">{dispute.category.replace('_', ' ')}</span></span>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-3 mt-4 lg:mt-0 flex-shrink-0 lg:border-l border-gray-800/50 lg:pl-6 min-w-[140px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg justify-start"
                      onClick={() => handleViewDetails(dispute)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {(dispute.status === 'open' || dispute.status === 'in_progress') && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-lg justify-start"
                        disabled={respondingToDisputeId === dispute.id}
                        onClick={async () => {
                          const currentDisputeId = dispute.id;
                          setRespondingToDisputeId(currentDisputeId);
                          try {
                            const resp = await disputeService.getDisputeDetail(dispute.id);
                            const full = resp?.data?.dispute || null;
                            const productId = full?.product || dispute.product;
                            const buyerId = full?.buyer;

                            if (!productId || !buyerId) {
                              toast({ title: "Error", description: "Missing dispute details.", variant: "destructive" });
                              setRespondingToDisputeId(null);
                              return;
                            }
                            messagingService.setProductContextInStorage({
                              id: productId,
                              recipientId: buyerId,
                              title: dispute.title,
                              isDispute: true,
                              disputeId: dispute.id,
                              buyerUsername: dispute.buyer_username
                            });
                            navigate('/vendor/messages');
                            setRespondingToDisputeId(null);
                          } catch (e) {
                            console.error(e);
                            toast({ title: "Error", description: "Failed to open chat.", variant: "destructive" });
                            setRespondingToDisputeId(null);
                          }
                        }}
                      >
                        {respondingToDisputeId === dispute.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Respond
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
      {/* Dispute Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 text-white shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-800/50 sticky top-0 bg-gray-900/95 backdrop-blur-xl z-20">
            <DialogTitle className="text-2xl font-black flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg border border-purple-500/30 text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              Dispute Details
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {selectedDispute ? (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{selectedDispute.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {new Date(selectedDispute.created_at).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span>Category: {selectedDispute.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${getStatusColor(selectedDispute.status)} text-xs px-3 py-1`}>
                        {selectedDispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={`${getPriorityColor(selectedDispute.priority)} text-black border-0 text-xs px-3 py-1 font-bold`}>
                        {selectedDispute.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Parties Info */}
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
                        <Users className="w-4 h-4 mr-2 text-indigo-400" />
                        Parties Involved
                      </h4>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Buyer</p>
                            <p className="text-sm font-bold text-white">{selectedDispute.buyer_username}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Vendor</p>
                            <p className="text-sm font-bold text-white">{selectedDispute.vendor_username}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Info */}
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
                        <Package className="w-4 h-4 mr-2 text-indigo-400" />
                        Order Details
                      </h4>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Order ID</p>
                          <p className="text-sm font-bold text-white font-mono">#{selectedDispute.order}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium">Dispute ID</p>
                          <p className="text-sm font-bold text-gray-300 font-mono">#{selectedDispute.dispute_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Total Amount</p>
                            <p className="text-sm font-bold text-white">{selectedDispute.order_data?.total_amount || 'N/A'} BTC</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader className="pb-2">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-indigo-400" />
                      Dispute Description
                    </h4>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedDispute.description}
                    </div>
                  </CardContent>
                </Card>

                {/* Resolution Info */}
                {selectedDispute.resolution !== 'pending' && (
                  <Card className="bg-gray-800/30 border-gray-700/50 overflow-hidden relative">
                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${selectedDispute.resolution === 'buyer_wins' || selectedDispute.resolution === 'refund_full' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                        Resolution Details
                      </h4>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                          <p className="text-xs text-gray-500 mb-1">Decision</p>
                          <p className="font-bold text-white flex items-center">
                            {selectedDispute.resolution === 'buyer_wins' || selectedDispute.resolution.includes('refund') ? (
                              <XCircle className="w-4 h-4 mr-2 text-red-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                            )}
                            {selectedDispute.resolution.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                          <p className="text-xs text-gray-500 mb-1">Resolved By</p>
                          <p className="font-bold text-white">{selectedDispute.assigned_admin_username || 'Admin'}</p>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                        <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Resolution Notes</p>
                        <p className="text-sm text-gray-300 italic">{selectedDispute.resolution_notes || "No additional notes provided."}</p>
                      </div>

                      {selectedDispute.refund_amount && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                          <span className="text-red-400 font-medium text-sm">Amount Refunded to Buyer</span>
                          <span className="text-white font-bold font-mono">{selectedDispute.refund_amount} BTC</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                <p className="text-gray-400">Loading dispute details...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 text-white shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-800/50">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              Respond to Dispute
            </DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="p-6 space-y-6">
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">{selectedDispute.title}</h4>
                    <p className="text-sm text-gray-400">Responding to buyer <span className="text-white font-medium">{selectedDispute.buyer_username}</span></p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Your Response <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Provide a detailed response to the dispute claim..."
                    className="bg-gray-900/50 border-gray-700/50 text-white min-h-[160px] resize-none focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl p-4"
                    maxLength={2000}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded-md border border-gray-800">
                    {responseText.length}/2000
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleSendResponse}
                  disabled={submitting || !responseText.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 h-11"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Response...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Response
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsResponseModalOpen(false)}
                  className="sm:w-32 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800 h-11"
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
