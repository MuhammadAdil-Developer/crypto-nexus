import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Filter, MessageSquare, Ban, Lock, Flag, Plus, Trash2, Loader2, Eye, ChevronDown, ChevronLeft, ChevronRight, User, Clock, Download, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { messagingService } from "@/services/messagingService";
import { format } from "date-fns";

export default function AdminMessages() {
  const { toast } = useToast();

  const handleExportMessages = async () => {
    try {
      // Collect all messages from all conversations
      let allMessages: any[] = [];

      for (const conversation of conversations) {
        try {
          const messages = await messagingService.getConversationMessages(conversation.id, 1, 1000);
          messages.forEach((msg: any) => {
            allMessages.push({
              conversation_id: conversation.id,
              message_id: msg.id,
              sender: msg.sender?.username || 'Unknown',
              content: msg.content || '',
              timestamp: msg.created_at || msg.timestamp || '',
              flagged: msg.flagged || false
            });
          });
        } catch (error) {
          console.error(`Error fetching messages for conversation ${conversation.id}:`, error);
        }
      }

      // Create CSV content
      const headers = ['Conversation ID', 'Message ID', 'Sender', 'Content', 'Timestamp', 'Flagged'];
      const rows = allMessages.map(msg => [
        msg.conversation_id,
        msg.message_id,
        msg.sender,
        msg.content,
        msg.timestamp,
        msg.flagged ? 'Yes' : 'No'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          const stringCell = String(cell);
          if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        }).join(','))
      ].join('\n');

      // Create and download CSV file (robust handling)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `messages_export_${new Date().toISOString().split('T')[0]}.csv`;

      if ((window as any).navigator && (window as any).navigator.msSaveBlob) {
        try {
          (window as any).navigator.msSaveBlob(blob, filename);
        } catch (err) {
          console.error('msSaveBlob failed:', err);
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        try {
          link.click();
        } catch (err) {
          window.open(url, '_blank');
        }
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 500);
      }

      toast({
        title: "Export Successful",
        description: `Successfully exported ${allMessages.length} messages to CSV`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export messages",
        variant: "destructive"
      });
    }
  };
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
  const [adminMessageInput, setAdminMessageInput] = useState("");
  const [sendingAdminMessage, setSendingAdminMessage] = useState(false);

  // Lock chat states
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [conversationToLock, setConversationToLock] = useState<any>(null);

  // User Reports states
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [conversationsPage, setConversationsPage] = useState(1);
  const conversationsPerPage = 10;

  useEffect(() => {
    setConversationsPage(1);
  }, [searchQuery, statusFilter]);

  // Dynamic stats
  const [stats, setStats] = useState({
    totalConversations: 0,
    flaggedMessages: 0,
    blockedKeywordsCount: 0,
    lockedConversations: 0
  });

  const [dbKeywords, setDbKeywords] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loadingKeywords, setLoadingKeywords] = useState(false);

  const [moderationSettings, setModerationSettings] = useState<any[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchReports();
    fetchKeywords();
    fetchSettings();
  }, []);

  const fetchKeywords = async () => {
    try {
      setLoadingKeywords(true);
      const data = await messagingService.getBlockedKeywords();
      setDbKeywords(data);
      setStats(prev => ({ ...prev, blockedKeywordsCount: data.length }));
    } catch (error) {
      console.error('Error fetching keywords:', error);
    } finally {
      setLoadingKeywords(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const data = await messagingService.getModerationSettings();
      setModerationSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    try {
      await messagingService.addBlockedKeyword(newKeyword);
      setNewKeyword("");
      fetchKeywords();
      toast({ title: "Success", description: "Keyword added successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveKeyword = async (id: string) => {
    try {
      await messagingService.deleteBlockedKeyword(id);
      fetchKeywords();
      toast({ title: "Success", description: "Keyword removed successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleSetting = async (id: string, currentEnabled: boolean) => {
    try {
      await messagingService.updateModerationSetting(id, !currentEnabled);
      fetchSettings();
      toast({ title: "Success", description: "Setting updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const data = await messagingService.getUserReports(reportStatusFilter === "all" ? undefined : reportStatusFilter);
      setReports(data || []);
      setCurrentPage(1); // Reset to first page when fetching new data
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load user reports",
        variant: "destructive"
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      await messagingService.updateReportStatus(reportId, newStatus);

      // Update local state
      setReports(prev => prev.map(report =>
        report.id === reportId ? { ...report, status: newStatus } : report
      ));

      toast({
        title: "Success",
        description: `Report status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive"
      });
    }
  };

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
        blockedKeywordsCount: dbKeywords.length,
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
    const participantUsernames = conversation.participants?.map((p: any) => p.username).join(' ') || '';

    const matchesSearch = participantUsernames.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.product?.headline?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && conversation.is_active) ||
      (statusFilter === "flagged" && conversation.flagged) ||
      (statusFilter === "blocked" && conversation.blocked);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredConversations.length / conversationsPerPage);
  const paginatedConversations = filteredConversations.slice(
    (conversationsPage - 1) * conversationsPerPage,
    conversationsPage * conversationsPerPage
  );

  const handleViewConversation = (conversation: any) => {
    setSelectedConversation(conversation);
    setIsDetailModalOpen(true);
  };

  const handleSendAdminMessage = async () => {
    if (!selectedConversation || !adminMessageInput.trim()) return;

    try {
      setSendingAdminMessage(true);
      await messagingService.sendMessage(adminMessageInput, selectedConversation.id);

      // Refresh messages to show the new one
      await fetchMessages(selectedConversation.id, 1, true);

      setAdminMessageInput("");
      toast({
        title: "Message Sent",
        description: "Admin message sent successfully",
      });
    } catch (error) {
      console.error("Error sending admin message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSendingAdminMessage(false);
    }
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
      // Call API to lock the conversation
      await messagingService.lockConversation(conversationToLock.id);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Message Management</h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">Monitor conversations and manage content moderation</p>
        </div>
        <Button
          size="sm"
          className="bg-accent text-bg hover:bg-accent/90 transition-colors w-full sm:w-auto"
          onClick={handleExportMessages}
        >
          <Download className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Export Messages</span>
          <span className="sm:hidden">Export</span>
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
                <p className="text-2xl font-bold text-white">{stats.blockedKeywordsCount}</p>
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
        <TabsList className="bg-surface-2 p-1 h-auto mb-8 grid grid-cols-1 sm:grid-cols-3 gap-1">
          <TabsTrigger
            value="conversations"
            className="py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Conversations
          </TabsTrigger>
          <TabsTrigger
            value="moderation"
            className="py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Content Moderation
          </TabsTrigger>
          <TabsTrigger
            value="keywords"
            className="py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            Blocked Keywords
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
          >
            User Reports
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
                      className="pl-10 border-border text-white"
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
                  paginatedConversations.map((conversation) => {
                    // Get participant usernames
                    const participants = conversation.participants || [];
                    const participantNames = participants.map((p: any) => p.username).join(' ↔ ');

                    return (
                      <div
                        key={conversation.id}
                        className="border-b border-border p-6 hover:bg-surface-2/50 transition-colors"
                        data-testid={`conversation-${conversation.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

                          <div className="flex items-center space-x-2 sm:ml-6">
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

              {/* Pagination Controls */}
              {filteredConversations.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-border bg-surface-2/30">
                  <div className="text-sm text-gray-400">
                    Showing {((conversationsPage - 1) * conversationsPerPage) + 1} to {Math.min(conversationsPage * conversationsPerPage, filteredConversations.length)} of {filteredConversations.length} conversation{filteredConversations.length !== 1 && 's'}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConversationsPage(prev => Math.max(prev - 1, 1))}
                      disabled={conversationsPage === 1}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-300 px-2 font-medium">
                      Page {conversationsPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConversationsPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={conversationsPage === totalPages || totalPages === 0}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                  {loadingSettings ? (
                    <div className="py-4 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {moderationSettings.map((setting) => (
                        <div key={setting.id} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg border border-gray-800 hover:border-accent/30 transition-colors">
                          <div className="pr-4">
                            <p className="text-white font-medium">{setting.label}</p>
                            <p className="text-sm text-gray-400">{setting.description}</p>
                          </div>
                          <Button
                            variant={setting.is_enabled ? "default" : "outline"}
                            className={setting.is_enabled ? "bg-accent/20 text-accent border-accent/30" : "border-gray-600 text-gray-400"}
                            onClick={() => handleToggleSetting(setting.id, setting.is_enabled)}
                          >
                            {setting.is_enabled ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Manual Review Queue</h3>
                  <div className="text-center py-8 text-gray-400 bg-surface-2 rounded-lg border border-gray-800 border-dashed">
                    <Flag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No messages pending manual review</p>
                    <p className="text-xs mt-1 text-gray-500">Flagged messages will appear here for final decision</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords">
          <Card className="crypto-card">
            <CardHeader>
              <CardTitle className="text-white">Blocked Keywords Management</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex space-x-4 mb-4">
                    <Input
                      placeholder="Add new blocked keyword..."
                      className="bg-surface-2 border-border text-white flex-1"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    />
                    <Button
                      className="bg-accent text-bg hover:bg-accent/90"
                      onClick={handleAddKeyword}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Current Blocked Keywords</h3>
                  {loadingKeywords ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
                    </div>
                  ) : dbKeywords.length === 0 ? (
                    <div className="text-center py-8 bg-surface-2 rounded-lg border border-gray-800 border-dashed">
                      <p className="text-gray-500">No blocked keywords configured</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {dbKeywords.map((kw) => (
                        <div
                          key={kw.id}
                          className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-gray-800 hover:border-accent/30 transition-all group"
                        >
                          <span className="text-white font-medium truncate mr-2" title={kw.keyword}>{kw.keyword}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-danger hover:bg-danger/10 p-1 h-auto"
                            onClick={() => handleRemoveKeyword(kw.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/10">
                  <div className="flex items-start">
                    <div className="p-1 mt-0.5 bg-accent/20 rounded mr-3">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      <strong className="text-accent">Moderation Note:</strong> Messages containing these keywords will be automatically flagged for review.
                      Checks are case-insensitive and apply to partial word matches.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="crypto-card mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">User Reports</CardTitle>
              <Select
                value={reportStatusFilter}
                onValueChange={(val) => {
                  setReportStatusFilter(val);
                  // Trigger refetch when filter changes
                  setTimeout(() => fetchReports(), 0);
                }}
              >
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              {loadingReports ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
                  <p className="text-gray-400">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="p-8 text-center">
                  <Flag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No reports found matching criteria</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {reports
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((report) => (
                      <div
                        key={report.id}
                        className="border-b border-border p-6 hover:bg-surface-2/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                report.status === 'pending' ? 'destructive' :
                                  report.status === 'resolved' ? 'default' :
                                    report.status === 'dismissed' ? 'secondary' : 'outline'
                              } className="uppercase text-[10px]">
                                {report.status}
                              </Badge>
                              <span className="text-gray-400 text-sm">
                                {/* Using fallback since date-fns format call might need valid Date object */}
                                {new Date(report.created_at).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-start gap-2">
                              <div className="font-semibold text-white">
                                Reporter: <span className="text-accent">{report.reporter}</span>
                              </div>
                              <span className="text-gray-500">reported</span>
                              <div className="font-semibold text-white">
                                Target: <span className="text-danger">{report.reported_user}</span>
                              </div>
                            </div>

                            <div className="bg-surface-1 p-3 rounded text-sm text-gray-300 border border-gray-800">
                              <p><strong className="text-gray-400">Reason:</strong> {report.reason}</p>
                              <p className="mt-1"><strong className="text-gray-400">Description:</strong> {report.description}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[140px]">
                            {report.status !== 'resolved' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white w-full"
                                onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                              >
                                <CheckCircle className="w-3 h-3 mr-2" /> Resolve
                              </Button>
                            )}

                            {report.status !== 'dismissed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full"
                                onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                              >
                                Dismiss
                              </Button>
                            )}

                            {report.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full"
                                onClick={() => handleUpdateReportStatus(report.id, 'reviewing')}
                              >
                                Mark Reviewing
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            {reports.length > itemsPerPage && (
              <div className="p-4 border-t border-gray-800 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, reports.length)} to {Math.min(currentPage * itemsPerPage, reports.length)} of {reports.length} reports
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:bg-gray-800"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(reports.length / itemsPerPage) }).map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? "default" : "ghost"}
                        size="sm"
                        className={`w-8 h-8 p-0 ${currentPage === i + 1 ? 'bg-accent text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:bg-gray-800"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reports.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(reports.length / itemsPerPage)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chat Modal - responsive */}
      <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[80vh] bg-gray-900 border-gray-700 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedConversation && (
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedConversation.participants?.map((p: any) => p.username).join(' ↔ ')}
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
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isBuyer
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

                {/* Message Input Area - Dark Theme */}
                <div className="mt-4 p-4 bg-gray-900 border-t border-gray-700 rounded-lg">
                  <div className="flex items-end space-x-2">
                    <Textarea
                      placeholder="Type your message as admin..."
                      value={adminMessageInput}
                      onChange={(e) => setAdminMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAdminMessage();
                        }
                      }}
                      className="flex-1 min-h-[60px] max-h-[120px] bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-accent focus:ring-accent resize-none"
                      disabled={sendingAdminMessage}
                    />
                    <Button
                      onClick={handleSendAdminMessage}
                      disabled={!adminMessageInput.trim() || sendingAdminMessage}
                      className="bg-accent hover:bg-accent-2 text-white px-6"
                    >
                      {sendingAdminMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Send'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
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
