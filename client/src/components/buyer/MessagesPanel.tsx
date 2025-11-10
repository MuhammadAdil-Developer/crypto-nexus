import { useState, useEffect, useRef } from "react";
import { MessageSquare, MoreVertical, Send, Search, Archive, Star, Package, X, ArrowDown, Copy, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { messagingService } from "@/services/messagingService";
import { useToast } from "@/hooks/use-toast";

interface MessagesPanelProps {
  compact?: boolean;
  conversations?: any[];
  loading?: boolean;
  onRefresh?: () => void;
  autoSelectConversation?: string | null;
  onConversationSelected?: () => void;
}

export function MessagesPanel({ 
  compact = false, 
  conversations = [], 
  loading = false,
  onRefresh,
  autoSelectConversation,
  onConversationSelected
}: MessagesPanelProps) {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showProductReference, setShowProductReference] = useState(false);
  const [productReferenceData, setProductReferenceData] = useState<any>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Get current user ID on component mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end",
        inline: "nearest"
      });
    }
  }, [messages]);

  // Check if user has scrolled up to show scroll button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
  const [showReportConfirm, setShowReportConfirm] = useState<any>(null);

  // Message action handlers
  const handleReplyMessage = (message: any) => {
    setReplyToMessage(message);
    // Focus on message input
    const input = document.querySelector('input[placeholder="Type your message..."]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const handleCopyMessage = async (message: any) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = (message: any) => {
    setShowDeleteConfirm(message);
  };

  const confirmDeleteMessage = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      await messagingService.deleteMessage(showDeleteConfirm.id);
      setMessages(prev => prev.filter(m => m.id !== showDeleteConfirm.id));
      setShowDeleteConfirm(null);
      toast({
        title: "Deleted",
        description: "Message deleted successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handleEditMessage = (message: any) => {
    setEditingMessage(message);
    setEditMessageContent(message.content);
  };

  const handleReportMessage = (message: any) => {
    setShowReportConfirm(message);
  };

  const confirmReportMessage = async () => {
    if (!showReportConfirm) return;
    
    try {
      await messagingService.reportMessage(showReportConfirm.id);
      setShowReportConfirm(null);
      toast({
        title: "Reported",
        description: "Message reported successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to report message:', error);
      toast({
        title: "Error",
        description: "Failed to report message",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editMessageContent.trim()) return;
    
    try {
      await messagingService.editMessage(editingMessage.id, editMessageContent);
      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id 
          ? { ...m, content: editMessageContent, edited: true }
          : m
      ));
      setEditingMessage(null);
      setEditMessageContent('');
      toast({
        title: "Updated",
        description: "Message updated successfully",
      });
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditMessageContent('');
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end",
        inline: "nearest"
      });
    }
  };

  // WebSocket event handlers
  useEffect(() => {
    messagingService.onMessage((message) => {
      setMessages(prev => {
        // Check if message already exists (by ID or content + sender + timestamp)
        const messageExists = prev.some(msg => 
          msg.id === message.id || 
          (msg.content === message.content && 
           msg.sender?.id === message.sender?.id &&
           Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
        );
        
        if (messageExists) {
          // Update existing message if it's a temporary one being replaced
          if (message.isTemporary === false) {
            return prev.map(msg => 
              (msg.isTemporary && msg.content === message.content && msg.sender?.id === message.sender?.id)
                ? message 
                : msg
            );
          }
          return prev;
        }
        
        // Add new message
        return [...prev, message];
      });
    });

    messagingService.onTyping((data) => {
      if (data.is_typing) {
        setTypingUsers(prev => [...prev.filter(user => user !== data.username), data.username]);
      } else {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      }
    });

    messagingService.onConversationInfo((data) => {
      // Handle conversation info updates
    });

    return () => {
      messagingService.disconnect();
    };
  }, []);

  // Restore selected conversation from localStorage when conversations load
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const savedConversation = localStorage.getItem('selectedConversation');
      if (savedConversation && !selectedConversation) {
        try {
          const conversation = JSON.parse(savedConversation);
          const foundConversation = conversations.find(conv => conv.id === conversation.id);
          if (foundConversation) {
            handleConversationSelect(foundConversation);
          }
        } catch (error) {
          console.error('Error parsing saved conversation:', error);
        }
      }
    }
  }, [conversations]);

  // Auto-select conversation when coming from product page
  useEffect(() => {
    if (autoSelectConversation && conversations.length > 0) {
      const targetConversation = conversations.find(conv => conv.id === autoSelectConversation);
      if (targetConversation) {
        handleConversationSelect(targetConversation);
        onConversationSelected?.();
      }
    }
  }, [autoSelectConversation, conversations]);

  const handleConversationSelect = async (conversation: any) => {
    setLoadingMessages(true);
    try {
      setSelectedConversation(conversation);
      
      // Store selected conversation in localStorage
      localStorage.setItem('selectedConversation', JSON.stringify(conversation));
      
      // Disconnect from previous conversation
      messagingService.disconnect();
      
      // Load messages for this conversation
      const messagesData = await messagingService.getMessages(conversation.id);
      setMessages(messagesData);
      
      // Check if this is a product conversation with no messages yet
      if (conversation.product && messagesData.length === 0) {
        setShowProductReference(true);
        setProductReferenceData({
          product_id: conversation.product.id,
          product_title: conversation.product.title,
          product_price: conversation.product.price,
          product_image: conversation.product.image,
          vendor_username: conversation.product.vendor_username
        });
      } else {
        setShowProductReference(false);
        setProductReferenceData(null);
      }
      
      // Connect to WebSocket for real-time messaging
      messagingService.connectToConversation(conversation.id);
      
      // Mark messages as read
      await messagingService.markMessagesRead(conversation.id);
      
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      // Send message (will use WebSocket if available, otherwise REST API)
      await messagingService.sendMessage(messageText, selectedConversation.id);
      
      // Clear reply state after sending
      if (replyToMessage) {
        setReplyToMessage(null);
      }
      
      // Hide product reference preview after sending first message
      if (showProductReference) {
        setShowProductReference(false);
        setProductReferenceData(null);
      }
      
      // Note: Messages are updated via the onMessage callback, no need to refresh
    } catch (error: any) {
      // Restore message text if sending failed
      setNewMessage(messageText);
      
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    messagingService.sendTyping(isTyping);
    setIsTyping(isTyping);

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        messagingService.sendTyping(false);
        setIsTyping(false);
      }, 3000);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getVendorFromConversation = (conversation: any) => {
    if (!conversation.participants) return null;
    // Find the participant who is not the current user
    return conversation.participants.find((p: any) => p.id !== localStorage.getItem('userId'));
  };

  if (compact) {
    return (
      <Card className="border border-gray-700 bg-gray-900">
        <CardContent className="p-0">
          <div className="space-y-3">
            {conversations.slice(0, 3).map((conv) => (
              <div 
                key={conv.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                onClick={() => window.location.href = '/buyer/messages'}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="text-white font-semibold">
                      {getVendorFromConversation(conv)?.username?.charAt(0) || 'V'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">
                        {getVendorFromConversation(conv)?.username || 'Vendor'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(conv.updated_at).toLocaleDateString().replace(/\//g, ' • ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                </div>

                {conv.unread_count > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 border border-gray-700 bg-gray-900 overflow-hidden h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
            </div>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <Search className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-4 flex flex-col items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
              <p className="text-gray-400">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No conversations yet</div>
          ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div 
                key={conv.id}
                className={`p-4 cursor-pointer transition-colors duration-200 ${
                  selectedConversation?.id === conv.id 
                    ? 'bg-blue-900/20 border-r-2 border-blue-500' 
                    : 'hover:bg-gray-800'
                }`}
                  onClick={() => handleConversationSelect(conv)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="text-white font-semibold">
                        {conv.product?.title?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white truncate">
                          {conv.product?.headline || conv.product?.title || 'Product Chat'}
                      </h4>
                        {conv.unread_count > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                            {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                        {conv.last_message?.content || 'No messages yet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                    </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="lg:col-span-2 border border-gray-700 bg-gray-900 overflow-hidden flex flex-col h-full">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="text-white font-semibold">
                      {getVendorFromConversation(selectedConversation)?.username?.charAt(0) || 'V'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-white">
                      {getVendorFromConversation(selectedConversation)?.username || 'Vendor'}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center">
                      <Package className="w-3 h-3 mr-1" />
                      {selectedConversation.product?.headline || selectedConversation.product?.title || 'Product Discussion'}
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Product</DropdownMenuItem>
                    <DropdownMenuItem>Report Issue</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Block Vendor</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-4 flex flex-col min-h-0">
              <div className="space-y-4 mb-4 flex-1 overflow-y-auto scroll-smooth min-h-0 max-h-[800px]" style={{ scrollBehavior: 'smooth' }} onScroll={handleScroll}>
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                      <p className="text-gray-400">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                  // Improved sender detection logic
                  let isOwnMessage = false;
                  
                  // Get current user info
                  const userStr = localStorage.getItem('user');
                  let currentUser = null;
                  if (userStr) {
                    try {
                      currentUser = JSON.parse(userStr);
                    } catch (error) {
                      console.error('Error parsing user data:', error);
                    }
                  }
                  
                  // Method 1: Direct ID comparison (most reliable)
                  if (currentUserId && message.sender?.id) {
                    isOwnMessage = String(message.sender.id) === String(currentUserId);
                  }
                  
                  // Method 2: Username comparison (fallback)
                  if (!isOwnMessage && currentUser && message.sender?.username) {
                    isOwnMessage = message.sender.username === currentUser.username;
                  }
                  
                  // Method 3: Check if sender ID matches current user ID from localStorage
                  if (!isOwnMessage && currentUser && message.sender?.id) {
                    isOwnMessage = String(message.sender.id) === String(currentUser.id);
                  }
                  
                  // Special handling for product reference messages
                  if (message.message_type === 'product_reference') {
                    // Find the first message to determine alignment
                    const firstMessage = messages.find(m => m.message_type === 'text');
                    const isFirstMessageFromCurrentUser = firstMessage && currentUserId && firstMessage.sender?.id === currentUserId;
                    
                    return (
                      <div key={message.id} className={`flex ${isFirstMessageFromCurrentUser ? 'justify-end' : 'justify-start'} my-4`}>
                        <div className="relative max-w-md">
                          {/* Clear arrow pointing up */}
                          <div className={`absolute -top-3 z-10 ${isFirstMessageFromCurrentUser ? 'right-4' : 'left-4'}`}>
                            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-300"></div>
                          </div>
                          
                          {/* Product reference box with grey transparent glass shade */}
                          <div className="bg-gray-300/80 backdrop-blur-sm text-gray-800 px-4 py-3 rounded-lg border border-gray-400/50 shadow-lg">
                            <div className="flex items-center space-x-3">
                              {message.metadata?.product_image ? (
                                <img 
                                  src={message.metadata.product_image} 
                                  alt={message.metadata.product_title}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gray-400 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 mb-1">This message is related to:</p>
                                <h4 className="font-medium text-sm text-gray-800 truncate">{message.metadata?.product_title}</h4>
                                <p className="text-xs text-gray-700">${message.metadata?.product_price} • {message.metadata?.vendor_username}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div 
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                          : 'bg-gray-700 text-white'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                        
                        {/* Three-dot menu - Only show on own messages */}
                        {isOwnMessage && (
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 hover:bg-white/20 text-blue-100 hover:text-white"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleReplyMessage(message)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyMessage(message)}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditMessage(message)}>
                                  <Star className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteMessage(message)}
                                  className="text-red-600"
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        
                        {/* Three-dot menu for other messages - Only Reply, Copy, Report */}
                        {!isOwnMessage && (
                          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 hover:bg-white/20 text-gray-400 hover:text-white"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => handleReplyMessage(message)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyMessage(message)}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleReportMessage(message)}
                                  className="text-red-600"
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  })
                )}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-white px-4 py-2 rounded-2xl">
                      <p className="text-sm text-gray-400">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {showScrollButton && (
                <div className="absolute bottom-24 right-6 z-10">
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
                    onClick={scrollToBottom}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Product Reference Preview (WhatsApp-style) - Show when auto-opening chat */}
              {showProductReference && productReferenceData && (
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg mb-4 border border-green-500">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {productReferenceData.product_image ? (
                        <img 
                          src={productReferenceData.product_image} 
                          alt={productReferenceData.product_title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-100 mb-1">This message is related to:</p>
                      <h4 className="font-semibold text-white truncate">{productReferenceData.product_title}</h4>
                      <p className="text-xs text-green-200">${productReferenceData.product_price} • {productReferenceData.vendor_username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-100 hover:text-white hover:bg-green-700 p-1"
                      onClick={() => {
                        setShowProductReference(false);
                        setProductReferenceData(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Reply Preview */}
              {replyToMessage && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">Replying to:</p>
                      <p className="text-sm text-gray-300 truncate">{replyToMessage.content}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setReplyToMessage(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit Message */}
              {editingMessage && (
                <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-blue-400">Editing message:</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="text-blue-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    value={editMessageContent}
                    onChange={(e) => setEditMessageContent(e.target.value)}
                    className="mb-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit();
                      }
                    }}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleSaveEdit} className="bg-blue-500 hover:bg-blue-600">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="flex items-center space-x-2 border-t border-gray-700 pt-4 mt-auto flex-shrink-0">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(true);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                  disabled={!newMessage.trim()}
                  onClick={handleSendMessage}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-400">
                Choose a product conversation to start chatting
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Message</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex space-x-3">
              <Button 
                onClick={confirmDeleteMessage}
                className="bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                Delete
              </Button>
              <Button 
                onClick={() => setShowDeleteConfirm(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Report Confirmation Dialog */}
      {showReportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Report Message</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to report this message? This will flag it for review.</p>
            <div className="flex space-x-3">
              <Button 
                onClick={confirmReportMessage}
                className="bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                Report
              </Button>
              <Button 
                onClick={() => setShowReportConfirm(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
