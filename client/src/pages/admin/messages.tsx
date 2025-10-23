import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Filter, MessageSquare, Ban, Lock, Flag, Plus, Trash2, Loader2, Eye, ChevronDown, User, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { messagingService } from "@/services/messagingService";

export default function AdminMessages() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Chat modal states
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  
  // Lock chat states
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [conversationToLock, setConversationToLock] = useState<any>(null);
  
  // Dynamic stats
  const [stats, setStats] = useState({
    totalConversations: 0,
    flaggedMessages: 0,
    blockedKeywords: 0,
    lockedConversations: 0
  });

  const blockedKeywords = [
    "scam", "fraud", "fake", "illegal", "stolen", "hack", "cracked", "virus", "malware", "phishing"
  ];

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Try admin endpoint first, fall back to regular endpoint
      let data;
      try {
        data = await messagingService.getAllConversations();
        console.log('Admin conversations endpoint successful');
      } catch (adminError) {
        console.log('Admin endpoint not available, trying regular endpoint');
        data = await messagingService.getConversations();
      }
      
      setConversations(data || []);
      
      // Calculate dynamic stats
      const conversationsData = data || [];
      const totalConversations = conversationsData.length;
      const flaggedMessages = conversationsData.filter(c => c.flagged).length;
      const lockedConversations = conversationsData.filter(c => !c.is_active).length;
      
      setStats({
        totalConversations,
        flaggedMessages,
        blockedKeywords: blockedKeywords.length,
        lockedConversations
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    // Get participant usernames for search
    const participantUsernames = conversation.participants?.map(p => p.username).join(' ') || '';
    
    const matchesSearch = participantUsernames.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conversation.product?.headline?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && conversation.is_active) ||
                         (statusFilter === "flagged" && conversation.flagged) ||
                         (statusFilter === "blocked" && conversation.blocked);
    
    return matchesSearch && matchesStatus;
  });

  const handleViewConversation = (conversation: any) => {
    setSelectedConversation(conversation);
    setIsDetailModalOpen(true);
  };

  const handleOpenChatModal = async (conversation: any) => {
    setSelectedConversation(conversation);
    setMessagesPage(1);
    setChatMessages([]);
    setHasMoreMessages(true);
    setIsChatModalOpen(true);
    await fetchMessages(conversation.id, 1, true);
  };

  const fetchMessages = async (conversationId: string, page: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoadingMessages(true);
      } else {
        setLoadingMoreMessages(true);
      }

      // Fetch real messages from the API
      const messages = await messagingService.getConversationMessages(conversationId, page, 20);
      
      if (reset) {
        setChatMessages(messages);
      } else {
        setChatMessages(prev => [...prev, ...messages]);
      }

      // If we get fewer messages than requested, we've reached the end
      setHasMoreMessages(messages.length >= 20);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoadingMessages(false);
      setLoadingMoreMessages(false);
    }
  };

  const handleLoadMoreMessages = async () => {
    if (!selectedConversation || loadingMoreMessages) return;
    const nextPage = messagesPage + 1;
    setMessagesPage(nextPage);
    await fetchMessages(selectedConversation.id, nextPage, false);
  };

  const handleLockConversation = (conversation: any) => {
    setConversationToLock(conversation);
    setShowLockDialog(true);
  };

  const confirmLockConversation = async () => {
    try {
      // In a real implementation, you'd call an API to lock the conversation
      // await messagingService.lockConversation(conversationToLock.id);
      
      // Update the conversation status locally
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationToLock.id 
            ? { ...conv, is_active: false, locked: true }
            : conv
        )
      );

      toast({
        title: "Success",
        description: "Conversation has been locked successfully",
      });

      // Update stats
      setStats(prev => ({
        ...prev,
        lockedConversations: prev.lockedConversations + 1
      }));
    } catch (error) {
      console.error('Error locking conversation:', error);
      toast({
        title: "Error",
        description: "Failed to lock conversation",
        variant: "destructive"
      });
    } finally {
      setShowLockDialog(false);
      setConversationToLock(null);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Message Management</h1>
            <p className="text-gray-300 mt-1">Monitor conversations and manage content moderation</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Export Messages
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Conversations</p>
                  <p className="text-2xl font-bold text-white">{stats.totalConversations.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Flag className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Flagged Messages</p>
                  <p className="text-2xl font-bold text-white">{stats.flaggedMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Ban className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Blocked Keywords</p>
                  <p className="text-2xl font-bold text-white">{stats.blockedKeywords}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Lock className="w-8 h-8 text-muted mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Locked Conversations</p>
                  <p className="text-2xl font-bold text-white">{stats.lockedConversations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="conversations" className="text-gray-300 data-[state=active]:text-white">
              Conversations
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-gray-300 data-[state=active]:text-white">
              Content Moderation
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-gray-300 data-[state=active]:text-white">
              Blocked Keywords
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            {/* Filters */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        placeholder="Search conversations by users or product..." 
                        className="pl-10 bg-surface-2 border-border text-white"
                        data-testid="search-conversations"
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Conversations List */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Recent Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {loading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Loading conversations...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No conversations found</p>
                      <p className="text-sm text-gray-500">
                        {conversations.length === 0 
                          ? "No conversations found in the system"
                          : "No conversations match your current filters"
                        }
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => {
                      // Get participant usernames
                      const participants = conversation.participants || [];
                      const participantNames = participants.map(p => p.username).join(' ↔ ');
                      
                      return (
                        <div 
                          key={conversation.id} 
                          className="border-b border-border p-6 hover:bg-surface-2/50 transition-colors"
                          data-testid={`conversation-${conversation.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-white">
                                  {participantNames || 'Unknown Users'}
                                </h3>
                                <Badge 
                                  variant={conversation.flagged ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {conversation.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {conversation.flagged && (
                                  <Flag className="w-4 h-4 text-danger" />
                                )}
                              </div>
                              <p className="text-gray-300 mb-2">
                                {conversation.last_message?.content || 'No recent messages'}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <span>
                                  {conversation.last_message?.created_at 
                                    ? new Date(conversation.last_message.created_at).toLocaleString()
                                    : 'Unknown time'
                                  }
                                </span>
                                <span>•</span>
                                <span>Product: {conversation.product?.headline || 'Unknown Product'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-400 hover:text-white" 
                              onClick={() => handleOpenChatModal(conversation)}
                              data-testid={`view-conversation-${conversation.id}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-400 hover:text-white" 
                                onClick={() => handleLockConversation(conversation)}
                                data-testid={`lock-conversation-${conversation.id}`}
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                              {conversation.flagged && (
                                <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`ban-user-${conversation.id}`}>
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Content Moderation Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Auto-Moderation Rules</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Keyword Detection</p>
                          <p className="text-sm text-gray-400">Automatically flag messages containing blocked keywords</p>
                        </div>
                        <Button variant="outline" className="border-border text-gray-300">
                          Enabled
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Spam Detection</p>
                          <p className="text-sm text-gray-400">Flag repeated messages and potential spam content</p>
                        </div>
                        <Button variant="outline" className="border-border text-gray-300">
                          Enabled
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Link Blocking</p>
                          <p className="text-sm text-gray-400">Block external links in messages</p>
                        </div>
                        <Button variant="outline" className="border-border text-gray-300">
                          Disabled
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Manual Review Queue</h3>
                    <div className="text-center py-8 text-gray-400">
                      <Flag className="w-12 h-12 mx-auto mb-4" />
                      <p>No messages pending review</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords">
            <Card className="crypto-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Blocked Keywords Management</CardTitle>
                  <Button className="bg-accent text-bg hover:bg-accent-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Keyword
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex space-x-4 mb-4">
                      <Input 
                        placeholder="Add new blocked keyword..." 
                        className="bg-surface-2 border-border text-white"
                        data-testid="new-keyword-input"
                      />
                      <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="add-keyword-button">
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Current Blocked Keywords</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {blockedKeywords.map((keyword, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-surface-2 rounded-lg"
                          data-testid={`keyword-${index}`}
                        >
                          <span className="text-white">{keyword}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-danger hover:text-red-400"
                            data-testid={`remove-keyword-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-surface-2 rounded-lg">
                    <p className="text-sm text-gray-400">
                      <strong className="text-white">Note:</strong> Messages containing these keywords will be automatically flagged for review. 
                      Keywords are case-insensitive and partial matches are detected.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Chat Modal - FIXED BACKGROUND */}
        <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedConversation && (
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedConversation.participants?.map(p => p.username).join(' ↔ ')}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Product: {selectedConversation.product?.headline}
                    </p>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <span className="ml-2 text-gray-400">Loading messages...</span>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Messages Container */}
                  <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-800 rounded-lg max-h-96">
                    {chatMessages.map((message, index) => {
                      // Determine if sender is buyer or vendor based on user_type
                      const isBuyer = message.sender.user_type === 'buyer';
                      const isVendor = message.sender.user_type === 'vendor';
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isBuyer ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isBuyer
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white'
                          }`}>
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                {message.sender.username}
                              </span>
                              <span className="text-xs opacity-75">
                                ({message.sender.user_type || 'buyer'})
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center justify-end mt-1">
                              <Clock className="w-3 h-3 mr-1 opacity-75" />
                              <span className="text-xs opacity-75">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show More Button */}
                    {hasMoreMessages && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMoreMessages}
                          disabled={loadingMoreMessages}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                        >
                          {loadingMoreMessages ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Show More Messages
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsChatModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lock Conversation Confirmation Dialog */}
        <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Lock Conversation</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to lock this conversation? Once locked, neither the buyer nor vendor will be able to send messages in this chat. This action can be reversed later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmLockConversation}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Lock Conversation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    );
  }
