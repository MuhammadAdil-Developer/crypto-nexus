import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, Eye, MessageSquare, Clock, AlertTriangle, CheckCircle, Loader2, User, Package, DollarSign, History, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { messagingService } from "@/services/messagingService";
import disputeService, { Dispute, DisputeStatistics } from "@/services/disputeService";

export default function AdminDisputes() {
  const { toast } = useToast();
  
  // State
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [statistics, setStatistics] = useState<DisputeStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDisputeDetail, setLoadingDisputeDetail] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isMessageHistoryModalOpen, setIsMessageHistoryModalOpen] = useState(false);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatSummary, setChatSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  // Resolution form
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [winningParty, setWinningParty] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [resolving, setResolving] = useState(false);
  
  useEffect(() => {
    fetchDisputes();
    fetchStatistics();
  }, [page, statusFilter, priorityFilter]);
  
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
      
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
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
  
  const fetchStatistics = async () => {
    try {
      const response = await disputeService.getDisputeStatistics();
      
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };
  
  const handleViewDetails = async (dispute: Dispute) => {
    // Open modal immediately with basic data
    setSelectedDispute(dispute);
    setIsDetailModalOpen(true);
    setLoadingDisputeDetail(true);
    
    try {
      // Fetch detailed dispute data
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
    } finally {
      setLoadingDisputeDetail(false);
    }
  };

  const handleViewMessageHistory = async (dispute: Dispute) => {
    try {
      setSelectedDispute(dispute);
      setIsMessageHistoryModalOpen(true);
      setLoadingMessages(true);
      setChatSummary('');
      setMessagePage(1);
      setHasMoreMessages(false);
      
      // Get the product ID - could be string or number
      let productId = dispute.product || dispute.product_data?.id;
      
      // Multiple fallbacks: try to get product ID from order data
      if (!productId && dispute.order_data?.product) {
        productId = dispute.order_data.product;
      }
      
      // Another fallback: try to get from order_data.product_data
      if (!productId && dispute.order_data?.product_data?.id) {
        productId = dispute.order_data.product_data.id;
      }
      
      console.log('🔍 Debug dispute data:', {
        dispute_id: dispute.id,
        buyer: dispute.buyer,
        vendor: dispute.vendor,
        product: dispute.product,
        product_data: dispute.product_data,
        order_data: dispute.order_data,
        productId: productId
      });
      
      if (!productId) {
        setMessageHistory([]);
        setChatSummary('No product information available for this dispute. Please refresh the page and try again.');
        return;
      }
      
      // Get conversation by product ID
      console.log('🔍 Attempting to get conversation for product ID:', productId);
      const conversation = await messagingService.getConversationByProduct(productId);
      console.log('🔍 Conversation result:', conversation);
      
      if (conversation) {
        // Get messages for this conversation
        console.log('🔍 Getting messages for conversation ID:', conversation.id);
        const messages = await messagingService.getMessages(conversation.id);
        console.log('🔍 Messages result:', messages);
        console.log('🔍 Messages length:', messages?.length);
        console.log('🔍 First message:', messages?.[0]);
        
        setMessageHistory(messages || []);
        setHasMoreMessages((messages?.length || 0) >= 20); // Assuming 20 messages per page
        
        // Generate AI summary
        await generateChatSummary(messages || []);
      } else {
        setMessageHistory([]);
        setChatSummary('No conversation found for this dispute. The buyer and vendor may not have exchanged messages yet.');
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
      toast({
        title: "Error",
        description: "Failed to load message history",
        variant: "destructive"
      });
      setMessageHistory([]);
      setChatSummary('Error loading conversation. Please try again.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedDispute || loadingMoreMessages) return;
    
    try {
      setLoadingMoreMessages(true);
      
      let productId = selectedDispute.product || selectedDispute.product_data?.id;
      if (!productId && selectedDispute.order_data?.product) {
        productId = selectedDispute.order_data.product;
      }
      if (!productId && selectedDispute.order_data?.product_data?.id) {
        productId = selectedDispute.order_data.product_data.id;
      }
      
      if (!productId) return;
      
      const conversation = await messagingService.getConversationByProduct(productId);
      if (conversation) {
        // Load more messages (you might need to implement pagination in your API)
        const moreMessages = await messagingService.getMessages(conversation.id);
        if (moreMessages && moreMessages.length > 0) {
          setMessageHistory(prev => [...prev, ...moreMessages]);
          setMessagePage(prev => prev + 1);
          setHasMoreMessages(moreMessages.length >= 20);
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  const generateChatSummary = async (messages: any[]) => {
    try {
      setLoadingSummary(true);
      
      // Prepare conversation for AI analysis
      const conversationText = messages.map(msg => {
        const sender = msg.sender?.username || 'Unknown';
        const timestamp = new Date(msg.created_at).toLocaleString();
        return `${sender} (${timestamp}): ${msg.content}`;
      }).join('\n');
      
      // Call AI summarization service (you can integrate with OpenAI, Claude, etc.)
      const summary = await generateAISummary(conversationText);
      setChatSummary(summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      setChatSummary('Failed to generate summary. Please review messages manually.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Robust AI summary with multiple fallback options
const generateAISummary = async (conversationText: string): Promise<string> => {
   // Format the conversation better for AI processing
   const formattedConversation = conversationText.replace(/\n/g, ' ').trim();
   
   // Use the best summarization model with proper prompts
   const models = [
     {
       name: 'google/pegasus-cnn_dailymail',
       prompt: `Customer Support Dispute Analysis:\n\n${formattedConversation}\n\nProvide a professional summary focusing on the customer's main concerns and issues.`,
       isSummarization: true
     },
     {
       name: 'google/flan-t5-large',
       prompt: `Analyze this customer dispute conversation for administrative review:\n\nConversation: ${formattedConversation}\n\nProvide analysis covering:\n- Customer complaints/issues\n- Communication effectiveness\n- Recommended resolution\n\nFormat as a professional dispute summary.`,
       isSummarization: false
     },
     {
       name: 'facebook/bart-large-cnn',
       prompt: formattedConversation,
       isSummarization: true
     }
   ];

   for (const model of models) {
     try {
       console.log(`🔍 Trying model: ${model.name}`);
       
       const response = await fetch(`https://api-inference.huggingface.co/models/${model.name}`, {
         method: 'POST',
         headers: {
           'Authorization': 'Bearer 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',
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           inputs: model.prompt,
           parameters: model.isSummarization ? {
             max_length: 200,
             min_length: 30,
             do_sample: false
           } : {
             max_new_tokens: 200,
             temperature: 0.7,
             top_p: 0.9,
             do_sample: true
           },
           options: {
             wait_for_model: true // Wait if model is loading
           }
         }),
       });

       
       if (!response.ok) {
         const errorText = await response.text();
         console.error('API Error:', errorText);
         throw new Error(`API call failed: ${response.status}`);
       }
       
       const result = await response.json();
       
       if (result.error) {
         throw new Error(result.error);
       }
       
       // Extract the generated text
       let aiSummary = result[0]?.generated_text || result[0]?.summary_text || 'Unable to generate summary';
       
       console.log(`🔍 Raw AI response from ${model.name}:`, aiSummary);
       
       // Clean up the response - remove the prompt if it's included in the response
       if (aiSummary.includes(conversationText.substring(0, 100))) {
         aiSummary = aiSummary.replace(conversationText.substring(0, 100), '').trim();
       }
       
       // Check if the response is just repeating the conversation or too similar
       const conversationWords = conversationText.split(' ').slice(0, 20).join(' ');
       if (aiSummary.includes(conversationWords) || aiSummary === conversationText || aiSummary.length < 50) {
         throw new Error('Model returned insufficient or repetitive summary');
       }
       
       // Post-process the AI response to ensure it's a proper summary
       let processedSummary = aiSummary;
       
       // If the AI response seems incomplete, enhance it
       if (processedSummary.length < 100) {
         // Extract key information from the conversation manually
         const lines = conversationText.split('\n');
         const issues = lines.filter(line => 
           line.toLowerCase().includes('issue') || 
           line.toLowerCase().includes('problem') || 
           line.toLowerCase().includes('illegal') || 
           line.toLowerCase().includes('ban')
         );
         
         if (issues.length > 0) {
           processedSummary = `${processedSummary}\n\n**Key Issues Identified:**\n${issues.map(issue => `• ${issue.trim()}`).join('\n')}`;
         }
       }
       
       // Add additional analysis for dispute context
       const enhancedSummary = model.isSummarization 
         ? `**📋 AI Summary:** ${processedSummary}\n\n**🎯 Admin Analysis:** This conversation has been analyzed to identify key communication patterns and issues for dispute resolution.`
         : `**📊 AI Analysis:** ${processedSummary}`;
       
       return `**🤖 AI Dispute Analysis (${model.name}):**\n\n${enhancedSummary}\n\n---\n*This analysis was generated using AI to help with dispute resolution decisions.*`;
     } catch (error) {
       console.error(`Model ${model.name} failed:`, error);
       continue; // Try next model
     }
   }
   
   // If all models fail, use enhanced fallback analysis
   console.log('🔄 All AI models failed, using enhanced fallback analysis');
   const lines = conversationText.split('\n');
   const buyerMessages = lines.filter(line => line.toLowerCase().includes('buyer'));
   const vendorMessages = lines.filter(line => line.toLowerCase().includes('vendor'));
   
   const allMessages = lines.map(line => {
     const parts = line.split(': ');
     return parts.length > 1 ? parts.slice(1).join(': ') : '';
   }).filter(msg => msg.trim());
   
   const issues: string[] = [];
   const negativeWords = ['issue', 'problem', 'broken', 'not working', 'defective', 'wrong', 'bad', 'disappointed', 'illegal', 'ban', 'not', 'big right'];
   
   allMessages.forEach(msg => {
     const lowerMsg = msg.toLowerCase();
     if (negativeWords.some(word => lowerMsg.includes(word))) {
       issues.push(`• ${msg.substring(0, 80)}${msg.length > 80 ? '...' : ''}`);
     }
   });
   
   const uniqueIssues = Array.from(new Set(issues)).slice(0, 5);
   
   return `**📊 Dispute Communication Analysis:**\n\n**📈 Statistics:**\n• Total Messages: ${lines.length}\n• Buyer Messages: ${buyerMessages.length}\n• Vendor Messages: ${vendorMessages.length}\n\n**⚠️ Key Issues Identified:**\n${uniqueIssues.length > 0 ? uniqueIssues.join('\n') : '• No specific issues clearly identified in conversation'}\n\n**💬 Communication Pattern:**\n• ${vendorMessages.length === 0 ? '🚨 Vendor has not responded to buyer messages' : '✅ Both parties are actively communicating'}\n• ${buyerMessages.length > vendorMessages.length * 2 ? '📢 Buyer appears more active in conversation' : '⚖️ Balanced communication between parties'}\n\n**🎯 Recommended Resolution:**\nBased on the conversation analysis, ${vendorMessages.length === 0 ? 'consider the vendor\'s lack of response as a key factor in your decision' : 'review the communication patterns and specific issues mentioned to determine fair resolution'}.\n\n---\n*Analysis completed using local processing (AI service unavailable)*`;
 };
  
  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionType) {
      toast({
        title: "Validation Error",
        description: "Please select a resolution type",
        variant: "destructive"
      });
      return;
    }
    
    if (!resolutionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Resolution reason is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!winningParty) {
      toast({
        title: "Validation Error",
        description: "Please select the winning party",
        variant: "destructive"
      });
      return;
    }
    
    setResolving(true);
    
    try {
      const response = await disputeService.resolveDispute(selectedDispute.id, {
        resolution: resolutionType,
        resolution_notes: resolutionNotes,
        resolution_reason: resolutionReason,
        winning_party: winningParty,
        refund_amount: refundAmount ? parseFloat(refundAmount) : undefined
      });
      
      if (response.success) {
        toast({
          title: "Dispute Resolved",
          description: "The dispute has been resolved successfully",
        });
        
        setIsResolutionModalOpen(false);
        setIsDetailModalOpen(false);
        setSelectedDispute(null);
        setResolutionNotes('');
        setResolutionType('');
        setResolutionReason('');
        setWinningParty('');
        setRefundAmount('');
        
        // Refresh data
        fetchDisputes();
        fetchStatistics();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to resolve dispute",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast({
        title: "Error",
        description: "Failed to resolve dispute",
        variant: "destructive"
      });
    } finally {
      setResolving(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'escalated': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const disputeCategories = disputeService.getDisputeCategories();
  const disputeResolutions = disputeService.getDisputeResolutions();

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dispute Management</h1>
            <p className="text-gray-300 mt-1">Resolve conflicts between buyers and vendors</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Export Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Open Disputes</p>
                <p className="text-2xl font-bold text-white">
                  {statistics ? statistics.open_disputes : '...'}
                </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-400 mr-4" />
                <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {statistics ? statistics.in_progress_disputes : '...'}
                </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
                <div>
                <p className="text-sm text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-white">
                  {statistics ? statistics.resolved_disputes : '...'}
                </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-accent font-bold">%</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Resolution Rate</p>
                <p className="text-2xl font-bold text-white">
                  {statistics && statistics.total_disputes > 0 
                    ? ((statistics.resolved_disputes / statistics.total_disputes) * 100).toFixed(1)
                    : '0.0'
                  }%
                </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                  placeholder="Search by dispute ID, buyer, or vendor..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
        ) : disputes.length === 0 ? (
          <Card className="crypto-card">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Disputes Found</h3>
              <p className="text-gray-400">No disputes match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          disputes.map((dispute) => (
            <Card key={dispute.id} className="crypto-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="font-mono text-accent">#{dispute.dispute_id}</span>
                      </div>
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(dispute.priority)}>
                        {dispute.priority.toUpperCase()} PRIORITY
                      </Badge>
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
                        <p className="text-sm text-gray-400">Vendor</p>
                          <p className="text-white">{dispute.vendor_username}</p>
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
                      <span>Order #{dispute.order}</span>
                      {dispute.assigned_admin_username && (
                        <>
                      <span>•</span>
                          <span>Assigned to {dispute.assigned_admin_username}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-6">
                    <Button 
                      variant="outline" 
                      className="border-border text-gray-300 hover:bg-surface-2"
                      onClick={() => handleViewDetails(dispute)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-border text-gray-300 hover:bg-surface-2"
                      onClick={() => handleViewMessageHistory(dispute)}
                    >
                      <History className="w-4 h-4 mr-2" />
                      View Message History
                    </Button>
                    {dispute.status === 'open' && (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setIsResolutionModalOpen(true);
                        }}
                      >
                        Assign to Me
                      </Button>
                    )}
                    {dispute.status === 'in_progress' && (
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setIsResolutionModalOpen(true);
                        }}
                      >
                        Resolve Dispute
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
          
          {loadingDisputeDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-gray-400">Loading dispute details...</p>
              </div>
            </div>
          ) : selectedDispute && (
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
                      <Badge className={getPriorityColor(selectedDispute.priority)}>
                        {selectedDispute.priority.toUpperCase()}
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
                  <h4 className="text-white font-medium mb-2">Resolution</h4>
                  <div className="bg-gray-800 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Decision:</span>
                      <span className="text-white">
                        {disputeResolutions.find(r => r.value === selectedDispute.resolution)?.label || selectedDispute.resolution}
                      </span>
                    </div>
                    {selectedDispute.resolution_notes && (
                      <div>
                        <span className="text-gray-400">Notes:</span>
                        <p className="text-gray-300 mt-1">{selectedDispute.resolution_notes}</p>
                      </div>
                    )}
                    {selectedDispute.refund_amount && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Refund Amount:</span>
                        <span className="text-white">{selectedDispute.refund_amount} BTC</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolution Modal */}
      <Dialog open={isResolutionModalOpen} onOpenChange={setIsResolutionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Resolve Dispute</DialogTitle>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-2">Dispute: {selectedDispute.title}</h4>
                <p className="text-gray-400">Order #{selectedDispute.order} • {selectedDispute.buyer_username} vs {selectedDispute.vendor_username}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Decision *
                </label>
                <Select value={resolutionType} onValueChange={setResolutionType}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeResolutions.map((resolution) => (
                      <SelectItem key={resolution.value} value={resolution.value} className="text-white">
                        {resolution.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Reason *
                </label>
                <Textarea 
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Explain the reason for this resolution decision..."
                  className="bg-gray-800 border-gray-600 text-white min-h-24"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Winning Party *
                </label>
                <Select value={winningParty} onValueChange={setWinningParty}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select winning party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer" className="text-white">Buyer</SelectItem>
                    <SelectItem value="vendor" className="text-white">Vendor</SelectItem>
                    <SelectItem value="neutral" className="text-white">Neutral/Shared Responsibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Notes
                </label>
                <Textarea 
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add detailed resolution notes..."
                  className="bg-gray-800 border-gray-600 text-white min-h-24"
                />
              </div>
              
              {(resolutionType === 'refund_full' || resolutionType === 'refund_partial') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Refund Amount (BTC)
                  </label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00000000"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleResolveDispute}
                  disabled={resolving || !resolutionType}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    'Resolve Dispute'
                  )}
                        </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setIsResolutionModalOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                        </Button>
                      </div>
                    </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message History Modal */}
      <Dialog open={isMessageHistoryModalOpen} onOpenChange={setIsMessageHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <History className="w-5 h-5 mr-2" />
              Message History - {selectedDispute?.title}
            </DialogTitle>
            {/* Fix aria-describedby warning by providing description */}
            <p className="sr-only">Conversation history between buyer and vendor for admin review and resolution.</p>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-6">
              {/* Dispute Info */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">Dispute Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Buyer:</span>
                    <span className="text-white ml-2">{selectedDispute.buyer_username}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Vendor:</span>
                    <span className="text-white ml-2">{selectedDispute.vendor_username}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Order:</span>
                    <span className="text-white ml-2">#{selectedDispute.order}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white ml-2">{selectedDispute.status}</span>
                  </div>
                </div>
              </div>

              {/* AI Chat Summary */}
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg border border-blue-500/30">
                <div className="flex items-center mb-3">
                  <Sparkles className="w-5 h-5 text-blue-400 mr-2" />
                  <h4 className="text-white font-medium">AI Chat Summary</h4>
                </div>
                {loadingSummary ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-gray-400">Generating summary...</span>
                  </div>
                ) : (
                  <div className="text-gray-300 whitespace-pre-line">
                    {chatSummary || 'No summary available'}
                  </div>
                )}
              </div>

              {/* Message History */}
              <div>
                <h4 className="text-white font-medium mb-3">Full Conversation</h4>
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span className="text-gray-400">Loading messages...</span>
                  </div>
                ) : messageHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No messages found for this dispute.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {messageHistory.map((message, index) => {
                      // Better sender detection using IDs from selectedDispute
                      const buyerId = selectedDispute.buyer;
                      const vendorId = selectedDispute.vendor;
                      const senderId = message.sender?.id;
                      const senderUsername = message.sender?.username || 'Unknown';
                      
                      console.log('🔍 Admin sender debug:', {
                        senderId,
                        buyerId,
                        vendorId,
                        senderUsername,
                        isEqual: senderId === buyerId,
                        isEqualVendor: senderId === vendorId
                      });
                      
                      // Better sender detection - check if sender is in the dispute participants
                      // First try ID comparison
                      let isBuyer = String(senderId) === String(buyerId);
                      let isVendor = String(senderId) === String(vendorId);
                      
                      // If ID comparison fails, try username comparison as fallback
                      if (!isBuyer && !isVendor) {
                        const buyerUsername = selectedDispute.buyer_username?.toLowerCase();
                        const vendorUsername = selectedDispute.vendor_username?.toLowerCase();
                        const senderUsernameLower = senderUsername.toLowerCase();
                        
                        // Check if sender username matches buyer or vendor
                        if (buyerUsername && senderUsernameLower.includes(buyerUsername.replace(/\s+/g, ''))) {
                          isBuyer = true;
                        } else if (vendorUsername && senderUsernameLower.includes(vendorUsername.replace(/\s+/g, ''))) {
                          isVendor = true;
                        }
                        // Additional fallback: check for common buyer/vendor patterns
                        else if (senderUsernameLower.includes('buyer')) {
                          isBuyer = true;
                        } else if (senderUsernameLower.includes('vendor') || senderUsernameLower.includes('seller')) {
                          isVendor = true;
                        }
                      }
                      
                      console.log('🔍 Final admin sender detection:', {
                        senderUsername,
                        isBuyer,
                        isVendor,
                        buyerId,
                        vendorId,
                        senderId
                      });

                      // Determine alignment and colors
                      const alignment = isBuyer ? 'justify-start' : 'justify-end';
                      const bgColor = isBuyer
                        ? 'bg-blue-500 text-white'
                        : isVendor
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-600 text-white';

                      return (
                        <div key={message.id || index} className={`flex ${alignment} mb-2`}>
                          <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl ${bgColor} shadow-sm`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium opacity-90">
                                {senderUsername}
                              </span>
                              <span className="text-xs opacity-75">
                                {message.created_at ? new Date(message.created_at).toLocaleTimeString() : 'Unknown time'}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content || 'No content'}</p>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Load More Button */}
                    {hasMoreMessages && (
                      <div className="flex justify-center pt-4">
                        <Button
                          onClick={loadMoreMessages}
                          disabled={loadingMoreMessages}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                        >
                          {loadingMoreMessages ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More Messages'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <Button
                  onClick={() => {
                    setSelectedDispute(selectedDispute);
                    setIsResolutionModalOpen(true);
                    setIsMessageHistoryModalOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve Dispute
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsMessageHistoryModalOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Close
                </Button>
              </div>
        </div>
          )}
        </DialogContent>
      </Dialog>
      </main>
  );
}
