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
      case 'open': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'escalated': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Disputes & Resolution</h1>
          <p className="text-gray-400">Manage customer disputes and resolve issues</p>
        </div>
        <div className="flex items-center space-x-4">
          {openDisputes > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {openDisputes} urgent
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mr-4" />
              <div>
                <p className="text-sm text-gray-400">Total Disputes</p>
                <p className="text-2xl font-bold text-white">{totalDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-400 mr-4" />
              <div>
                <p className="text-sm text-gray-400">Open</p>
                <p className="text-2xl font-bold text-white">{openDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-blue-400 mr-4" />
              <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{inProgressDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
              <div>
                <p className="text-sm text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-white">{resolvedDisputes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Search disputes..." 
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
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
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Loading disputes...</span>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Disputes Found</h3>
              <p className="text-gray-400">No disputes match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="bg-gray-900 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="font-mono text-blue-400">#{dispute.dispute_id}</span>
                      </div>
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className="bg-gray-700 text-gray-300 border-gray-600">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(dispute.priority)} mr-2`}></div>
                          {dispute.priority.toUpperCase()} PRIORITY
                        </div>
                      </Badge>
                      
                      {/* Resolution Badge */}
                      {dispute.resolution !== 'pending' && (
                        <Badge className={
                          dispute.resolution === 'buyer_wins' || dispute.resolution === 'refund_full' || dispute.resolution === 'refund_partial'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-green-500/20 text-green-400 border-green-500/30'
                        }>
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
                    
                    <h3 className="text-lg font-semibold text-white mb-2">{dispute.title}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-400">Buyer</p>
                          <p className="text-white">{dispute.buyer_username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-400">Order</p>
                          <p className="text-white">#{dispute.order}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-400">Amount</p>
                          <p className="text-white font-mono">{dispute.order_data?.total_amount || 'N/A'} BTC</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Created {new Date(dispute.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Category: {dispute.category.replace('_', ' ')}</span>
                      {dispute.assigned_admin_username && (
                        <>
                          <span>•</span>
                          <span>Admin: {dispute.assigned_admin_username}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-6">
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      onClick={() => handleViewDetails(dispute)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {(dispute.status === 'open' || dispute.status === 'in_progress') && (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={respondingToDisputeId === dispute.id}
                        onClick={async () => {
                          setRespondingToDisputeId(dispute.id);
                          try {
                            // Fetch full dispute detail to get buyer id and product id
                            const resp = await disputeService.getDisputeDetail(dispute.id);
                            const full = resp?.data?.dispute || null;
                            const productId = full?.product || dispute.product;
                            const buyerId = full?.buyer;
                            // Store context so Messages page can auto-open or create conversation
                            messagingService.setProductContextInStorage({
                              id: productId,
                              recipientId: buyerId,
                              title: dispute.title,
                              isDispute: true,
                              disputeId: dispute.id,
                              buyerUsername: dispute.buyer_username
                            });
                          } catch (e) {
                            // Fallback: still set minimal context
                            messagingService.setProductContextInStorage({
                              id: dispute.product,
                              recipientId: undefined,
                              title: dispute.title,
                              isDispute: true,
                              disputeId: dispute.id,
                              buyerUsername: dispute.buyer_username
                            });
                          } finally {
                            navigate('/vendor/messages');
                            setRespondingToDisputeId(null);
                          }
                        }}
                      >
                        {respondingToDisputeId === dispute.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Opening…
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
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Dispute Details</DialogTitle>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Dispute Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ID:</span>
                      <span className="text-white">{selectedDispute.dispute_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge className={getStatusColor(selectedDispute.status)}>
                        {selectedDispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Priority:</span>
                      <Badge className="bg-gray-700 text-gray-300 border-gray-600">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedDispute.priority)} mr-2`}></div>
                          {selectedDispute.priority.toUpperCase()}
                        </div>
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-white">{selectedDispute.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">Parties</h4>
                  <div className="space-y-2 text-sm">
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
                      <span className="text-white">{selectedDispute.order_data?.total_amount || 'N/A'} BTC</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div>
                <h4 className="text-white font-medium mb-2">Description</h4>
                <p className="text-gray-300 bg-gray-800 p-3 rounded-lg">{selectedDispute.description}</p>
              </div>
              
              {/* Resolution Info */}
              {selectedDispute.resolution !== 'pending' && (
                <div>
                  <h4 className="text-white font-medium mb-2">Resolution Details</h4>
                  <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Decision:</span>
                      <span className="text-white">{selectedDispute.resolution.replace('_', ' ')}</span>
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
                          {selectedDispute.resolution === 'buyer_wins' || selectedDispute.resolution === 'refund_full' || selectedDispute.resolution === 'refund_partial' ? (
                            <div className="flex items-center space-x-2 text-red-400">
                              <XCircle className="w-4 h-4" />
                              <span>Decision was in buyer's favor</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span>Decision was in your favor</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedDispute.refund_amount && (
                        <div className="flex justify-between mt-3">
                          <span className="text-gray-400">Refund Amount:</span>
                          <span className="text-red-400 font-semibold">{selectedDispute.refund_amount} BTC</span>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Respond to Dispute</DialogTitle>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-2">Dispute: {selectedDispute.title}</h4>
                <p className="text-gray-400">Respond to buyer: {selectedDispute.buyer_username}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Response *
                </label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response to the buyer..."
                  className="bg-gray-800 border-gray-600 text-white min-h-32"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400 mt-1">{responseText.length}/2000 characters</p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSendResponse}
                  disabled={submitting || !responseText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  className="border-gray-600 text-gray-300"
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