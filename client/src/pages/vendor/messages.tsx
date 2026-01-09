import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Search, MoreVertical, Archive, Star, Package, Users, X, ArrowDown, Copy, Image as ImageIcon, File, Video, Paperclip, User, Shield, Flag, Lock, Loader2, Camera, Mic, Trash2, Info, ChevronLeft, RotateCw, CheckCircle, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { messagingService } from "@/services/messagingService";
import { realtimeService } from "@/services/realtimeService";
import { getRelativeTime } from "@/utils/timeUtils";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";

export default function VendorMessages() {
  const location = useLocation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showProductReference, setShowProductReference] = useState(false);
  const [productReferenceData, setProductReferenceData] = useState<any>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
  const [showReportConfirm, setShowReportConfirm] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [userAttachments, setUserAttachments] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isConversationLocked, setIsConversationLocked] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showAllAttachmentsModal, setShowAllAttachmentsModal] = useState(false);
  const [attachmentFilter, setAttachmentFilter] = useState<string>('all'); // 'all', 'image', 'video', 'file', 'pdf'
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const [autoSelectConversation, setAutoSelectConversation] = useState<string | null>(null);

  // Get current user ID on component mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
        console.log('🔍 Vendor currentUserId set to:', user.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Handle auto-open logic from navigation state
  useEffect(() => {
    const navState: any = location.state;

    // Priority 1: Open specific product conversation (Context Aware)
    if (navState?.autoOpenProductId && navState?.autoOpenBuyerId) {
      console.log('🔄 Auto-opening product conversation:', navState.autoOpenProductId);
      handleProductConversation({
        id: navState.autoOpenProductId,
        recipientId: navState.autoOpenBuyerId
      });

      // Clean navigation state immediately to prevent re-triggering
      window.history.replaceState({}, document.title);
      return;
    }

    // Priority 2: Fallback to username match (Legacy/General)
    if (navState?.autoOpenBuyerUsername && conversations.length > 0) {
      const buyerUsername = navState.autoOpenBuyerUsername;
      // Find conversation with this buyer
      const buyerConversation = conversations.find((conv: any) => {
        // Check participants for buyer username
        if (conv.participants && Array.isArray(conv.participants)) {
          return conv.participants.some((p: any) =>
            p.username === buyerUsername || p.user?.username === buyerUsername
          );
        }
        return false;
      });

      if (buyerConversation) {
        setTimeout(() => {
          handleConversationSelect(buyerConversation);
        }, 300);
      } else {
        // Create new conversation with buyer
        // This would require API call to create conversation
        toast({
          title: "Opening Chat",
          description: `Creating conversation with ${buyerUsername}...`,
          variant: "default"
        });
        // You may need to implement createConversation API call here
      }

      // Clean navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations]);

  useEffect(() => {
    const context = messagingService.getProductContextFromStorage();
    if (context && context.id) {
      handleProductConversation(context);
    } else {
      loadConversations();
    }

    // Restore selected conversation from localStorage ONLY if no auto-open action is pending
    const navState: any = location.state;
    const hasAutoOpenAction = navState?.autoOpenProductId || navState?.autoOpenBuyerUsername;

    if (!hasAutoOpenAction) {
      const savedConversation = localStorage.getItem('selectedConversation');
      if (savedConversation) {
        try {
          const conversation = JSON.parse(savedConversation);
          // Find the conversation in the loaded conversations
          setTimeout(() => {
            const foundConversation = conversations.find(conv => conv.id === conversation.id);
            if (foundConversation) {
              handleConversationSelect(foundConversation);
            }
          }, 1000); // Wait for conversations to load
        } catch (error) {
          console.error('Error parsing saved conversation:', error);
        }
      }
    } else {
      console.log('🚫 Skipping localStorage restore due to pending auto-open action');
    }

    // WebSocket event handlers
    messagingService.onMessage((message) => {
      // Simple duplicate check by ID only
      setMessages(prev => {
        // Check if message already exists by ID
        const existingById = prev.find(msg => msg.id === message.id);
        if (existingById) {
          return prev; // Don't add duplicate
        }

        // Check for duplicate by content + sender + timestamp (within 2 seconds) - safety check
        const duplicateExists = prev.some(msg =>
          msg.id !== message.id &&
          msg.content === message.content &&
          msg.sender?.id === message.sender?.id &&
          Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 2000
        );

        if (duplicateExists) {
          return prev; // Don't add duplicate
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

    // Listen for messages marked as read to update conversation unread counts
    const handleMessagesMarkedRead = () => {
      loadConversations();
    };

    window.addEventListener('messages_marked_read', handleMessagesMarkedRead);

    // Listen for real-time conversation updates
    const handleConversationUpdate = (data: any) => {
      if (data?.conversation) {
        setConversations(prev => {
          // Remove old conversation if exists
          const filtered = prev.filter(conv => conv.id !== data.conversation.id);
          // Add updated conversation at the top
          return [data.conversation, ...filtered];
        });
      }
    };

    // Listen for real-time message edit/delete
    const handleMessageEdited = (data: any) => {
      // Handle both data structures: {message: {...}} or direct message object
      const message = data?.message || data;
      const conversationId = message?.conversation || data?.conversation_id;

      // Update message if it's in the current conversation
      if (message && message.id && selectedConversation?.id === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg.id === message.id ? { ...msg, ...message, metadata: { ...msg.metadata, ...message.metadata, edited: true } } : msg
        ));
      }
    };

    const handleMessageDeleted = (data: any) => {
      // Handle both data structures
      const messageId = data?.message_id || data?.id;
      const conversationId = data?.conversation_id || data?.conversation;

      // Mark as deleted instead of removing (WhatsApp style)
      if (messageId && selectedConversation?.id === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, is_deleted: true, content: 'This message was deleted', message_type: 'system' }
            : msg
        ));
      }
    };

    // Also listen for message_edited and message_deleted from WebSocket directly
    const handleWebSocketMessageEdited = (event: CustomEvent) => {
      const message = event.detail;
      const conversationId = message?.conversation || message?.conversation_id;
      if (message && message.id && selectedConversation?.id === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg.id === message.id ? { ...msg, ...message, metadata: { ...msg.metadata, ...message.metadata, edited: true } } : msg
        ));
      }
    };

    const handleWebSocketMessageDeleted = (event: CustomEvent) => {
      const data = event.detail;
      const messageId = data?.message_id || data?.id;
      const conversationId = data?.conversation_id || data?.conversation;
      if (messageId && selectedConversation?.id === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, is_deleted: true, content: 'This message was deleted', message_type: 'system' }
            : msg
        ));
      }
    };

    window.addEventListener('message_edited', handleWebSocketMessageEdited as EventListener);
    window.addEventListener('message_deleted', handleWebSocketMessageDeleted as EventListener);

    realtimeService.subscribe('conversation_updated', handleConversationUpdate);
    realtimeService.subscribe('message_edited', handleMessageEdited);
    realtimeService.subscribe('message_deleted', handleMessageDeleted);

    return () => {
      messagingService.disconnect();
      window.removeEventListener('messages_marked_read', handleMessagesMarkedRead);
      realtimeService.unsubscribe('conversation_updated', handleConversationUpdate);
      realtimeService.unsubscribe('message_edited', handleMessageEdited);
      realtimeService.unsubscribe('message_deleted', handleMessageDeleted);
      window.removeEventListener('message_edited', handleWebSocketMessageEdited as EventListener);
      window.removeEventListener('message_deleted', handleWebSocketMessageDeleted as EventListener);
    };
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleProductConversation = async (context: any) => {
    try {
      let convo: any = null;

      // For refunds/disputes, always create a new conversation (don't reuse existing ones)
      if (context.isRefund || context.isDispute) {
        if (context.recipientId) {
          convo = await messagingService.createProductConversation(
            context.id,
            context.recipientId,
            context.refundId,
            context.disputeId
          );
        } else {
          throw new Error('Recipient ID required for refund/dispute conversations');
        }
      } else {
        // For regular product conversations
        if (context.recipientId) {
          // If we have a specific recipient (Vendor side), use createProductConversation
          // This endpoint is specific (Product + Recipient) and handles "Get or Create"
          console.log('🔄 Fetching specific conversation for product + recipient:', context.id, context.recipientId);
          convo = await messagingService.createProductConversation(context.id, context.recipientId);
        } else {
          // If no recipient specified (Buyer side), get the general conversation for this product
          try {
            convo = await messagingService.getConversationByProduct(context.id);
          } catch (e) {
            console.warn('Could not find existing product conversation:', e);
            throw e;
          }
        }
      }

      // Load conversations and wait for it to complete
      await loadConversations();

      // IMMEDIATE SELECTION LOGIC
      if (convo && convo.id) {
        console.log('✅ Conversation ready, selecting:', convo.id);

        // If the conversation object from creation is minimal, fetch full details first
        // This is often safer to ensure we have participants, product info, etc.
        try {
          const fullConvo = await messagingService.getConversation(convo.id);
          if (fullConvo) {
            // Add to local state if not present (prevents flicker)
            setConversations(prev => {
              const exists = prev.find(c => c.id === fullConvo.id);
              return exists ? prev : [fullConvo, ...prev];
            });

            // Select it immediately
            handleConversationSelect(fullConvo);
          }
        } catch (e) {
          console.error('Error fetching full conversation details:', e);
          // Fallback to minimal object if fetch fails
          handleConversationSelect(convo);
        }

        // Handle special context storage (Refunds/Disputes)
        if (context.isRefund) {
          const refundContext = { refundId: context.refundId, conversationId: convo.id };
          localStorage.setItem('refundContext', JSON.stringify(refundContext));
        }
        if (context.isDispute) {
          const disputeContext = { disputeId: context.disputeId, conversationId: convo.id };
          localStorage.setItem('disputeContext', JSON.stringify(disputeContext));
        }
      }

    } else {
      // For regular conversations (legacy path or non-immediate finding), use auto-select fallback
      // prefer exact match: same product AND same buyer (recipient)
      if (conversations.length > 0) {
        const exact = conversations.find((c: any) =>
          (c.product?.id === context.id || c.product === context.id) &&
          (Array.isArray(c.participants) && c.participants.some((p: any) => p.id === context.recipientId))
        );
        if (exact) {
          setAutoSelectConversation(exact.id);
        } else if (convo && convo.id) {
          setAutoSelectConversation(convo.id);
        }
      } else if (convo && convo.id) {
        // If conversations not loaded yet, set auto select
        setAutoSelectConversation(convo.id);
      }
    }

    if (context.isDispute) {
      toast({ title: 'Dispute Chat', description: `Opened chat for dispute ${context.disputeId}` });
    }
    if (context.isRefund) {
      toast({ title: 'Refund Chat', description: `Opened chat for refund request ${context.refundId}` });
    }
  } catch (error) {
    console.error('Error handling product conversation:', error);
    await loadConversations();
  }
};

useEffect(() => {
  if (autoSelectConversation && conversations.length > 0) {
    const convo = conversations.find(c => c.id === autoSelectConversation);
    if (convo) {
      // Small delay to ensure everything is ready
      setTimeout(() => {
        handleConversationSelect(convo);
        setAutoSelectConversation(null);
      }, 100);
    }
  }
}, [autoSelectConversation, conversations]);

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

const scrollToBottom = () => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest"
    });
  }
};

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
  // Basic fallback for unsecure contexts (HTTP)
  if (!navigator.clipboard && document.execCommand) {
    const textArea = document.createElement("textarea");
    textArea.value = message.content;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast({
          title: "Copied!",
          description: "Message copied",
          duration: 2000,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
    document.body.removeChild(textArea);
    return;
  }

  try {
    await navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
      duration: 2000,
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

const handleEditMessage = (message: any) => {
  setEditingMessage(message);
  setEditMessageContent(message.content);
};

const handleDeleteMessage = (message: any) => {
  setShowDeleteConfirm(message);
};

const confirmDeleteMessage = async () => {
  if (!showDeleteConfirm) return;

  try {
    await messagingService.deleteMessage(showDeleteConfirm.id);
    // Instead of removing, mark as deleted (WhatsApp style)
    setMessages(prev => prev.map(m =>
      m.id === showDeleteConfirm.id
        ? { ...m, is_deleted: true, content: 'This message was deleted', message_type: 'system' }
        : m
    ));
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

  const oldContent = editingMessage.content;

  try {
    // Optimistically update the message
    setMessages(prev => prev.map(m =>
      m.id === editingMessage.id
        ? { ...m, content: editMessageContent, metadata: { ...m.metadata, edited: true, edited_at: new Date().toISOString() } }
        : m
    ));

    setEditingMessage(null);
    setEditMessageContent('');

    // Call API to update message
    // The real-time WebSocket update will handle updating the message with server response
    await messagingService.editMessage(editingMessage.id, editMessageContent);

    toast({
      title: "Updated",
      description: "Message updated successfully",
    });
  } catch (error) {
    // Revert on error
    setMessages(prev => prev.map(m =>
      m.id === editingMessage.id
        ? { ...m, content: oldContent }
        : m
    ));
    setEditingMessage({ ...editingMessage, content: oldContent });
    setEditMessageContent(oldContent);
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

const handleOpenUserProfile = async () => {
  if (!selectedConversation) return;
  const otherParticipant = selectedConversation.participants?.find((p: any) => p.id !== currentUserId);
  if (!otherParticipant) return;

  try {
    const response = await messagingService.getUserAttachments(otherParticipant.id);
    if (response.success) {
      setUserAttachments(response.data || []);
      setShowUserProfileModal(true);
    }
  } catch (error) {
    console.error('Error loading attachments:', error);
  }
};

const handleBlockUser = () => {
  setShowBlockConfirm(true);
};

const confirmBlockUser = async () => {
  if (!selectedConversation) return;
  setShowBlockConfirm(false);
  const otherParticipant = selectedConversation.participants?.find((p: any) => p.id !== currentUserId);
  if (!otherParticipant) return;

  try {
    // Lock this specific conversation instead of blocking the user globally
    const response = await messagingService.lockConversation(selectedConversation.id, true);
    if (response.success) {
      setIsConversationLocked(true);
      setShowUserProfileModal(false);
      toast({
        title: "Chat Blocked",
        description: "This conversation has been blocked",
      });
      // Refresh conversation to get updated status
      await handleConversationSelect(selectedConversation);
    } else {
      toast({
        title: "Error",
        description: response.error || "Failed to block conversation",
        variant: "destructive",
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to block conversation",
      variant: "destructive",
    });
  }
};

const handleUnblockUser = async () => {
  if (!selectedConversation) return;

  try {
    // Unlock this specific conversation
    const response = await messagingService.lockConversation(selectedConversation.id, false);
    if (response.success) {
      setIsConversationLocked(false);
      toast({
        title: "Chat Unblocked",
        description: "This conversation has been unblocked",
      });
      // Refresh conversation to get updated status
      await handleConversationSelect(selectedConversation);
    } else {
      toast({
        title: "Error",
        description: response.error || "Failed to unblock conversation",
        variant: "destructive",
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to unblock conversation",
      variant: "destructive",
    });
  }
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast({
      title: "File too large",
      description: "Maximum file size is 10MB",
      variant: "destructive",
    });
    return;
  }

  setSelectedFile(file);
  setShowFilePicker(false);

  // Create preview for images
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  } else {
    setFilePreview(null);
  }
};

const clearFileSelection = () => {
  setSelectedFile(null);
  setFilePreview(null);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
  if (imageInputRef.current) {
    imageInputRef.current.value = '';
  }
  if (videoInputRef.current) {
    videoInputRef.current.value = '';
  }
  if (audioInputRef.current) {
    audioInputRef.current.value = '';
  }
  if (documentInputRef.current) {
    documentInputRef.current.value = '';
  }
};

const handleDeleteChat = async () => {
  if (!selectedConversation) return;

  // For now, just lock the conversation
  // In future, you can implement actual deletion
  try {
    const response = await messagingService.lockConversation(selectedConversation.id, true);
    if (response.success) {
      setIsConversationLocked(true);
      setShowUserProfileModal(false);
      toast({
        title: "Chat Deleted",
        description: "This conversation has been deleted",
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to delete chat",
      variant: "destructive",
    });
  }
};

const handleReportUser = async () => {
  if (!selectedConversation || !reportReason) return;
  const otherParticipant = selectedConversation.participants?.find((p: any) => p.id !== currentUserId);
  if (!otherParticipant) return;

  try {
    const response = await messagingService.reportUser(
      otherParticipant.id,
      reportReason,
      reportDescription,
      selectedConversation.id
    );
    if (response.success) {
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      toast({
        title: "Reported",
        description: response.message || "User reported successfully",
      });
    } else {
      toast({
        title: "Error",
        description: response.error || "Failed to report user",
        variant: "destructive",
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to report user",
      variant: "destructive",
    });
  }
};

const handleConversationSelect = async (conversation: any) => {
  // Don't reload if already selected
  if (selectedConversation?.id === conversation.id && messages.length > 0) {
    return;
  }

  try {
    setSelectedConversation(conversation);
    setLoadingMessages(true);

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
        product_title: conversation.product.headline || conversation.product.title,
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

// Dispute/Refund badge in chat header
const renderChatHeader = () => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-700">
      <div className="flex items-center space-x-3">
        <MessageSquare className="w-5 h-5 text-theme-cyan" />
        <span className="text-white font-semibold">Conversation</span>
      </div>
      {(() => {
        // Check if this conversation was opened with dispute or refund context
        const disputeContext = localStorage.getItem('disputeContext');
        const refundContext = localStorage.getItem('refundContext');
        const productContext = localStorage.getItem('productContext');

        // Check dispute context
        if (disputeContext && selectedConversation?.product) {
          try {
            const context = JSON.parse(disputeContext);
            if (context.conversationId === selectedConversation.id && context.disputeId) {
              return <Badge className="bg-theme-red/20 text-theme-red border-theme-red/30">DISPUTE CHAT</Badge>;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Check refund context
        if (refundContext && selectedConversation?.product) {
          try {
            const context = JSON.parse(refundContext);
            if (context.conversationId === selectedConversation.id && context.refundId) {
              return <Badge className="bg-theme-red/20 text-theme-red border-theme-red/30 uppercase">Refund Request</Badge>;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Check product context
        if (productContext && selectedConversation?.product) {
          try {
            const context = JSON.parse(productContext);
            const matchesProduct = (context.id === selectedConversation.product?.id || context.productId === selectedConversation.product?.id);
            const matchesRecipient = selectedConversation.participants?.some((p: any) => p.id === context.recipientId) ||
              (context.recipientId && Array.isArray(selectedConversation.participants) &&
                selectedConversation.participants.some((p: any) => String(p.id) === String(context.recipientId)));

            if (matchesProduct && (matchesRecipient || !context.recipientId)) {
              if (context.isDispute) {
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">DISPUTE CHAT</Badge>;
              }
              if (context.isRefund) {
                return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">REFUND CHAT</Badge>;
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Check messages for refund/dispute metadata (fallback)
        if (messages && Array.isArray(messages)) {
          const productRefMessage = messages.find((m: any) =>
            m.message_type === 'product_reference' && (m.metadata?.refund_id || m.metadata?.dispute_id)
          );
          if (productRefMessage) {
            if (productRefMessage.metadata?.refund_id) {
              return <Badge className="bg-theme-red/20 text-theme-red border-theme-red/30 uppercase">Refund Request</Badge>;
            }
            if (productRefMessage.metadata?.dispute_id) {
              return <Badge className="bg-theme-red/20 text-theme-red border-theme-red/30">DISPUTE CHAT</Badge>;
            }
          }
        }

        return null;
      })()}
    </div>
  );
};

const handleSendMessage = async () => {
  if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;
  if (isConversationLocked) {
    toast({
      title: "Cannot send message",
      description: "This chat has been locked",
      variant: "destructive",
    });
    return;
  }

  const messageText = newMessage.trim();
  const fileToSend = selectedFile;

  // Clear inputs immediately for better UX
  setNewMessage("");
  clearFileSelection();

  try {
    // Send message with or without attachment
    let response: any = null;
    if (fileToSend) {
      setIsUploading(true);
      setUploadProgress(0);

      response = await messagingService.sendMessageWithAttachment(
        selectedConversation.id,
        messageText,
        fileToSend,
        (progress) => setUploadProgress(progress)
      );
      setIsUploading(false);
      setUploadProgress(0);
    } else {
      response = await messagingService.sendMessage(messageText, selectedConversation.id);
    }

    // Immediately show message to sender (will be replaced by WebSocket if duplicate)
    if (response && response.id) {
      setMessages(prev => {
        // Check if already exists (from WebSocket)
        const exists = prev.find(msg => msg.id === response.id);
        if (exists) return prev;
        return [...prev, response];
      });
    }

    // Clear reply state after sending
    if (replyToMessage) {
      setReplyToMessage(null);
    }

    // Hide product reference preview after sending first message
    if (showProductReference) {
      setShowProductReference(false);
      setProductReferenceData(null);
    }

    // Message will also appear via WebSocket onMessage callback (will replace if duplicate)
  } catch (error: any) {
    setIsUploading(false);
    setUploadProgress(0);
    // Restore message text if sending failed
    setNewMessage(messageText);
    if (fileToSend) {
      setSelectedFile(fileToSend);
      if (fileToSend.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(fileToSend);
      }
    }

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

const filteredConversations = conversations.filter(conv =>
  (conv.product?.headline || conv.product?.title)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  conv.participants?.some((p: any) => p.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
  conv.last_message?.content?.toLowerCase().includes(searchTerm.toLowerCase())
);

const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

// Calculate Average Response Time
const avgResponseTime = conversations.length > 0
  ? conversations.reduce((sum, conv) => {
    const start = new Date(conv.created_at).getTime();
    const end = new Date(conv.updated_at).getTime();
    return sum + (end - start);
  }, 0) / conversations.length
  : 0;

const formatResponseTime = (ms: number) => {
  if (ms <= 0) return "N/A";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getBuyerFromConversation = (conversation: any) => {
  if (!conversation.participants) return null;
  // Find the participant who is not the current user (vendor)
  return conversation.participants.find((p: any) => p.id !== localStorage.getItem('userId'));
};

return (
  <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
    <PageBanner
      title="Messages"
      subtitle="Communicate seamlessly with your customers"
      type="vendor"
    />

    {totalUnread > 0 && (
      <div className="flex justify-end mb-4 sm:mb-6">
        <Badge className="bg-theme-red/20 text-theme-red border border-theme-red/30 text-xs px-4 py-1.5 rounded-full animate-pulse font-bold tracking-wide uppercase shadow-lg shadow-theme-red/10">
          {totalUnread} New Messages
        </Badge>
      </div>
    )}

    {/* Premium Stats Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
      <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
            </div>
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 bg-indigo-500/5">Total</Badge>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white">{conversations.length}</h3>
            <p className="text-gray-400 text-sm font-medium">Conversations</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <MessageSquare className="w-6 h-6 text-red-500" />
            </div>
            <Badge variant="outline" className="border-red-500/20 text-red-400 bg-red-500/5">Unread</Badge>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white">{totalUnread}</h3>
            <p className="text-gray-400 text-sm font-medium">New Messages</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl">
              <Users className="w-6 h-6 text-cyan-500" />
            </div>
            <Badge variant="outline" className="border-cyan-500/20 text-cyan-400 bg-cyan-500/5">Active</Badge>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white">{new Set(conversations.map(c => c.participants?.find((p: any) => p.id !== localStorage.getItem('userId'))?.id).filter(Boolean)).size}</h3>
            <p className="text-gray-400 text-sm font-medium">Unique Buyers</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/40 backdrop-blur-sm border-gray-700/50 rounded-2xl overflow-hidden relative group hover:bg-gray-800/40 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <Star className="w-6 h-6 text-amber-500" />
            </div>
            <Badge variant="outline" className="border-amber-500/20 text-amber-400 bg-amber-500/5">Speed</Badge>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white">{formatResponseTime(avgResponseTime)}</h3>
            <p className="text-gray-400 text-sm font-medium">Avg Response</p>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Main Messages Interface */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Conversations List */}
      <div className={`lg:col-span-1 flex flex-col h-full bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Chats</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadConversations}
              className="hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
              title="Refresh Conversations"
            >
              <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative group mb-2">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
            </div>
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 placeholder:text-gray-600 transition-all"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-cyan-500" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const buyer = getBuyerFromConversation(conv);
            const isSelected = selectedConversation?.id === conv.id;

            // Safe access to last message content
            const lastMsgContent = (() => {
              const lastMsg = conv.last_message;
              if (!lastMsg) return <span className="italic opacity-50">No messages yet</span>;
              if (lastMsg.message_type === 'image') return <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1" /> Image</span>;
              if (lastMsg.message_type === 'video') return <span className="flex items-center"><Video className="w-3 h-3 mr-1" /> Video</span>;
              if (lastMsg.message_type === 'pdf') return <span className="flex items-center"><File className="w-3 h-3 mr-1" /> PDF</span>;
              if (lastMsg.message_type === 'file' || lastMsg.message_type === 'document') {
                return <span className="flex items-center"><File className="w-3 h-3 mr-1" /> File</span>;
              }
              return lastMsg.content || <span className="italic opacity-50">No content</span>;
            })();

            return (
              <div
                key={conv.id}
                onClick={() => handleConversationSelect(conv)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent group relative ${isSelected
                  ? 'bg-cyan-600/20 border-cyan-500/30'
                  : 'hover:bg-gray-800/50 hover:border-gray-700/50'
                  }`}
              >
                {/* Active Indicator Bar for Selected */}
                {isSelected && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-500 rounded-r-full" />
                )}

                <div className="flex items-center space-x-3 pl-2">
                  <div className="relative flex-shrink-0">
                    <Avatar className={`w-10 h-10 ring-2 ${isSelected ? 'ring-cyan-500/50' : 'ring-transparent group-hover:ring-gray-600'}`}>
                      <AvatarFallback className={`${isSelected ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                        {buyer?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center text-[10px] text-white font-bold">{conv.unread_count}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                        {buyer?.username || 'Buyer'}
                      </h4>
                      <span className={`text-[10px] ${isSelected ? 'text-cyan-300' : 'text-gray-500'}`}>
                        {getRelativeTime(conv.updated_at)}
                      </span>
                    </div>
                    <p className={`text-xs truncate mb-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                      {lastMsgContent}
                    </p>
                    <p className="text-[10px] text-indigo-400 truncate flex items-center">
                      <Package className="w-3 h-3 mr-1 opacity-70" />
                      {conv.product?.headline || conv.product?.title || 'Product'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Premium Chat Window */}
      <div className={`lg:col-span-2 h-full bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Glassmorphism Chat Header */}
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-900/60 backdrop-blur-md relative z-20">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8 -ml-2 text-gray-400 hover:text-white"
                  onClick={() => {
                    setSelectedConversation(null);
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="relative cursor-pointer group" onClick={handleOpenUserProfile}>
                  <Avatar className="w-10 h-10 ring-2 ring-cyan-500/30 group-hover:ring-cyan-500/60 transition-all">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-blue-600 text-white font-bold">
                      {getBuyerFromConversation(selectedConversation)?.username?.charAt(0).toUpperCase() || 'B'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></span>
                </div>

                <div className="min-w-0 cursor-pointer" onClick={handleOpenUserProfile}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base hover:text-cyan-400 transition-colors truncate">
                      {getBuyerFromConversation(selectedConversation)?.username || 'Buyer'}
                    </h3>
                    {(() => {
                      // Check if this conversation was opened with dispute or refund context
                      const disputeContext = localStorage.getItem('disputeContext');
                      const refundContext = localStorage.getItem('refundContext');
                      const productContext = localStorage.getItem('productContext');

                      // Only show if we have context AND it matches the current conversation
                      if (disputeContext && selectedConversation?.product) {
                        try {
                          const context = JSON.parse(disputeContext);
                          // Only show if conversation ID matches
                          if (context.conversationId === selectedConversation.id && context.disputeId) {
                            return (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0.5">DISPUTE</Badge>
                            );
                          }
                        } catch (e) {
                          // Ignore parse errors
                        }
                      }

                      // Check refund context
                      if (refundContext && selectedConversation?.product) {
                        try {
                          const context = JSON.parse(refundContext);
                          // Only show if conversation ID matches
                          if (context.conversationId === selectedConversation.id && context.refundId) {
                            return (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0.5">REFUND</Badge>
                            );
                          }
                        } catch (e) {
                          // Ignore parse errors
                        }
                      }

                      // Also check productContext for dispute/refund flag - check by conversation ID or product match
                      if (productContext && selectedConversation?.product) {
                        try {
                          const context = JSON.parse(productContext);
                          // Check if this conversation matches the context (by product ID and recipient)
                          const matchesProduct = (context.id === selectedConversation.product?.id || context.productId === selectedConversation.product?.id);
                          const matchesRecipient = selectedConversation.participants?.some((p: any) => p.id === context.recipientId) ||
                            (context.recipientId && Array.isArray(selectedConversation.participants) &&
                              selectedConversation.participants.some((p: any) => String(p.id) === String(context.recipientId)));

                          if (matchesProduct && (matchesRecipient || !context.recipientId)) {
                            if (context.isDispute) {
                              return (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0.5">DISPUTE</Badge>
                              );
                            }
                            if (context.isRefund) {
                              return (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0.5">REFUND</Badge>
                              );
                            }
                          }
                        } catch (e) {
                          // Ignore parse errors
                        }
                      }

                      // Also check messages for refund/dispute metadata (fallback)
                      if (selectedConversation?.messages && Array.isArray(selectedConversation.messages)) {
                        const productRefMessage = selectedConversation.messages.find((m: any) =>
                          m.message_type === 'product_reference' && (m.metadata?.refund_id || m.metadata?.dispute_id)
                        );
                        if (productRefMessage) {
                          if (productRefMessage.metadata?.refund_id) {
                            return (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0.5">REFUND</Badge>
                            );
                          }
                          if (productRefMessage.metadata?.dispute_id) {
                            return (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0.5">DISPUTE</Badge>
                            );
                          }
                        }
                      }

                      return null;
                    })()}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center truncate">
                    <Package className="w-3 h-3 mr-1 text-cyan-400" />
                    <span className="truncate hover:text-gray-300 transition-colors">
                      {selectedConversation.product?.headline || selectedConversation.product?.title || 'Product Discussion'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-9 w-9">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700 text-white rounded-xl shadow-xl">
                    <DropdownMenuItem onClick={() => setShowReportModal(true)} className="cursor-pointer hover:bg-gray-800 rounded-lg m-1 transition-colors">
                      <Flag className="w-4 h-4 mr-2" /> Report User
                    </DropdownMenuItem>
                    {isConversationLocked ? (
                      <DropdownMenuItem onClick={handleUnblockUser} className="text-green-400 cursor-pointer hover:bg-gray-800 rounded-lg m-1 transition-colors">
                        <Shield className="w-4 h-4 mr-2" /> Unblock Chat
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={handleBlockUser} className="text-red-400 cursor-pointer hover:bg-gray-800 rounded-lg m-1 transition-colors">
                        <Lock className="w-4 h-4 mr-2" /> Block Chat
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleOpenUserProfile} className="cursor-pointer hover:bg-gray-800 rounded-lg m-1 transition-colors">
                      <User className="w-4 h-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteChat} className="text-red-400 cursor-pointer hover:bg-gray-800 rounded-lg m-1 transition-colors">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Premium Messages List */}
            <div className="flex-1 p-4 flex flex-col min-h-0 relative overflow-hidden">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto scroll-smooth custom-scrollbar pr-2" style={{ scrollBehavior: 'smooth' }} onScroll={handleScroll}>
                  {messages.map((message) => {
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

                      // Determine background color based on chat type
                      const isRefund = message.metadata?.refund_id;
                      const isDispute = message.metadata?.dispute_id;
                      let bgColor = 'bg-blue-500/10 border-blue-500/20'; // Normal chat
                      let textColor = 'text-blue-400';
                      let borderColor = 'border-blue-500/20';

                      if (isRefund || isDispute) {
                        bgColor = 'bg-red-500/10 border-red-500/20';
                        textColor = 'text-red-400';
                        borderColor = 'border-red-500/20';
                      }

                      return (
                        <div key={message.id} className="flex justify-center my-6">
                          <div className={`${bgColor} backdrop-blur-md px-4 py-3 rounded-2xl border ${borderColor} shadow-lg max-w-sm w-full mx-4`}>
                            <div className="flex items-center space-x-3">
                              {message.metadata?.product_image ? (
                                <img
                                  src={message.metadata.product_image}
                                  alt={message.metadata.product_title}
                                  className="w-12 h-12 rounded-xl object-cover shadow-sm"
                                />
                              ) : (
                                <div className={`w-12 h-12 rounded-xl ${isRefund || isDispute ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'} flex items-center justify-center`}>
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${isRefund || isDispute ? 'text-red-300' : 'text-blue-300'} mb-1 uppercase tracking-wider font-bold opacity-80`}>
                                  {isDispute ? 'Dispute Context' : isRefund ? 'Refund Context' : 'Product Context'}
                                </p>
                                <h4 className={`font-bold text-sm text-white truncate`}>{message.metadata?.product_title}</h4>
                                <p className="text-xs text-gray-400">${message.metadata?.product_price}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Handle different message types
                    const renderMessageContent = () => {
                      const fileUrl = message.attachment_url || message.metadata?.file_url;

                      if (message.message_type === 'image' && fileUrl) {
                        return (
                          <div className="space-y-2">
                            <img
                              src={fileUrl}
                              alt="Shared image"
                              className="max-w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(fileUrl, '_blank')}
                            />
                            {message.content && (
                              <p className="text-sm break-words">{message.content}</p>
                            )}
                          </div>
                        );
                      }

                      if (message.message_type === 'video' && fileUrl) {
                        return (
                          <div className="space-y-2">
                            <video
                              src={fileUrl}
                              controls
                              className="max-w-full rounded-lg"
                            />
                            {message.content && (
                              <p className="text-sm break-words">{message.content}</p>
                            )}
                          </div>
                        );
                      }

                      if ((message.message_type === 'pdf' || message.message_type === 'file' || message.message_type === 'document') && fileUrl) {
                        return (
                          <div className="space-y-2">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${isOwnMessage ? 'bg-black/20 hover:bg-black/30' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                              <div className={`p-2 rounded-lg ${isOwnMessage ? 'bg-white/20' : 'bg-black/20'}`}>
                                <File className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-bold truncate">{message.metadata?.file_name || 'Attached File'}</p>
                                <p className="text-[10px] opacity-70">
                                  {message.metadata?.file_size ? `${(message.metadata.file_size / 1024).toFixed(1)} KB` : 'File'}
                                </p>
                              </div>
                            </a>
                            {message.content && (
                              <p className="text-sm break-words">{message.content}</p>
                            )}
                          </div>
                        );
                      }

                      // Handle deleted messages
                      if (message.is_deleted || message.message_type === 'system' && message.content === 'This message was deleted') {
                        return (
                          <div className="flex items-center space-x-2 italic opacity-60">
                            <Archive className="w-4 h-4" />
                            <p className="text-sm">This message was deleted</p>
                          </div>
                        );
                      }

                      // Default text message
                      return message.content ? (
                        <p className="text-sm sm:text-[15px] leading-relaxed break-words relative">
                          {message.content}
                          {message.metadata?.edited && (
                            <span className="text-[10px] opacity-60 italic ml-1 align-bottom">(edited)</span>
                          )}
                        </p>
                      ) : null;
                    };

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group mb-4 px-2`}
                      >

                        <div className={`relative max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] px-5 py-3 rounded-2xl shadow-lg transition-transform ${isOwnMessage
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-500/20'
                          : 'bg-gray-800/80 backdrop-blur-sm text-gray-100 rounded-tl-sm border border-gray-700/50 shadow-black/20'
                          }`}>

                          {renderMessageContent()}


                          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isOwnMessage ? 'justify-end text-indigo-100' : 'justify-start text-gray-500'}`}>
                            {formatTime(message.created_at)}
                            {isOwnMessage && (
                              <span className="opacity-80">
                                {message.read ? <CheckCircle className="w-3 h-3 text-blue-200" /> : <div className="w-2 h-2 rounded-full border border-white/60" />}
                              </span>
                            )}
                          </div>

                          {/* Message Actions Dropdown */}
                          <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -ml-10' : 'right-0 -mr-10'} opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col gap-1 z-10`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-400 backdrop-blur-sm border border-gray-700/50 shadow-xl ring-1 ring-black/20">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white shadow-xl">
                                <DropdownMenuItem onClick={() => {
                                  setEditingMessage(message);
                                  setEditMessageContent(message.content);
                                }}>
                                  <span className="flex items-center text-sm"><Info className="w-4 h-4 mr-2" /> Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReportMessage(message)}>
                                  <span className="flex items-center text-sm text-yellow-400"><AlertTriangle className="w-4 h-4 mr-2" /> Report</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteMessage(message)}>
                                  <span className="flex items-center text-sm text-red-400"><Trash2 className="w-4 h-4 mr-2" /> Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="absolute bottom-20 left-6 z-10 pointer-events-none">
                      <div className="bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700/50 shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <p className="text-xs text-purple-400 flex items-center font-medium">
                          <span className="flex space-x-1 mr-2">
                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></span>
                          </span>
                          {typingUsers.join(', ')} typing...
                        </p>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Scroll to bottom button */}
              {showScrollButton && (
                <Button
                  size="icon"
                  className="absolute bottom-24 right-6 z-20 rounded-full bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/30 transition-all duration-300 animate-in zoom-in"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="w-5 h-5" />
                </Button>
              )}

              {/* Input Area */}
              <div className="flex-shrink-0 z-30 bg-gray-900/60 backdrop-blur-xl border-t border-gray-700/50">
                {/* Context Previews Section */}
                <div className="px-4 pt-2 empty:hidden space-y-2">
                  {/* Dispute reference banner */}
                  {showProductReference && productReferenceData && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {productReferenceData.product_image ? (
                          <img
                            src={productReferenceData.product_image}
                            alt={productReferenceData.product_title}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <Package className="w-5 h-5 text-red-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide">Dispute Context</p>
                          <h4 className="text-sm font-medium text-white truncate">{productReferenceData.product_title}</h4>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-full"
                        onClick={() => {
                          setShowProductReference(false);
                          setProductReferenceData(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Reply Preview */}
                  {replyToMessage && (
                    <div className="bg-gray-800/80 border-l-4 border-purple-500 rounded-r-xl p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
                      <div className="min-w-0">
                        <p className="text-xs text-purple-400 font-medium mb-0.5">Replying to message</p>
                        <p className="text-sm text-gray-300 truncate">{replyToMessage.content}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-white rounded-full"
                        onClick={() => setReplyToMessage(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Edit Message */}
                  {editingMessage && (
                    <div className="bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl p-3 animate-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-blue-400 font-medium">Editing message</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-blue-400 hover:text-white rounded-full"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={editMessageContent}
                          onChange={(e) => setEditMessageContent(e.target.value)}
                          className="h-9 bg-gray-900/50 border-blue-500/30 focus:border-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                          }}
                        />
                        <Button size="sm" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-500 text-white">Save</Button>
                      </div>
                    </div>
                  )}

                  {/* File Preview */}
                  {(filePreview || (selectedFile && !filePreview)) && (
                    <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center">
                            {selectedFile?.type === 'application/pdf' ? <File className="w-6 h-6 text-red-400" /> : <File className="w-6 h-6 text-blue-400" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 font-medium">Selected File</p>
                          <p className="text-sm text-white truncate">{selectedFile?.name}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-white rounded-full"
                        onClick={clearFileSelection}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Main Input Bar */}
                <div className="p-4">
                  {isConversationLocked && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-3 text-sm flex items-center justify-center font-medium animate-in fade-in">
                      <Lock className="w-4 h-4 mr-2" />
                      This conversation is locked
                    </div>
                  )}

                  {isUploading && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-blue-400 mb-1">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2 sm:gap-3">
                    <input type="file" ref={imageInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    <input type="file" ref={videoInputRef} onChange={handleFileSelect} accept="video/*" className="hidden" />
                    <input type="file" ref={audioInputRef} onChange={handleFileSelect} accept="audio/*" className="hidden" />
                    <input type="file" ref={documentInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.rtf" className="hidden" />
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="*" className="hidden" />

                    <div className="relative">
                      {showFilePicker && (
                        <div className="absolute bottom-full left-0 mb-4 bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-2 min-w-[280px] grid grid-cols-3 gap-2 animate-in slide-in-from-bottom-5 zoom-in-95 z-50">
                          <button onClick={() => { imageInputRef.current?.click(); setShowFilePicker(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 group-hover:bg-pink-500/20 flex items-center justify-center mb-1 transition-colors">
                              <Camera className="w-5 h-5 text-pink-400" />
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white">Camera</span>
                          </button>
                          <button onClick={() => { imageInputRef.current?.click(); setShowFilePicker(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center mb-1 transition-colors">
                              <ImageIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white">Gallery</span>
                          </button>
                          <button onClick={() => { videoInputRef.current?.click(); setShowFilePicker(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 group-hover:bg-green-500/20 flex items-center justify-center mb-1 transition-colors">
                              <Video className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white">Video</span>
                          </button>
                          <button onClick={() => { audioInputRef.current?.click(); setShowFilePicker(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center mb-1 transition-colors">
                              <Mic className="w-5 h-5 text-orange-400" />
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white">Audio</span>
                          </button>
                          <button onClick={() => { documentInputRef.current?.click(); setShowFilePicker(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center mb-1 transition-colors">
                              <File className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white">Document</span>
                          </button>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 rounded-full transition-all border ${showFilePicker ? 'bg-purple-500/20 text-purple-400 rotate-45 border-purple-500/30' : 'bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white border-transparent'}`}
                        onClick={() => setShowFilePicker(!showFilePicker)}
                        disabled={isConversationLocked}
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="flex-1 relative">
                      <Input
                        placeholder={isConversationLocked ? "Conversation is locked" : "Type a message..."}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          if (!isConversationLocked) handleTyping(true);
                        }}
                        className="h-11 rounded-2xl bg-gray-800/50 border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 pl-4 pr-12 text-white placeholder:text-gray-500 transition-all shadow-inner"
                        disabled={isConversationLocked}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && (newMessage.trim() || selectedFile) && !isConversationLocked) {
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>

                    <Button
                      size="icon"
                      className={`h-11 w-11 rounded-full transition-all shadow-lg ${(!newMessage.trim() && !selectedFile) || isConversationLocked ? 'bg-gray-800 text-gray-500 opacity-50' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 text-white shadow-purple-900/20'}`}
                      disabled={(!newMessage.trim() && !selectedFile) || isConversationLocked}
                      onClick={handleSendMessage}
                    >
                      <Send className="w-5 h-5 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-900/30">
            <div className="relative mb-6 group">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative w-24 h-24 bg-gray-800/50 rounded-3xl border border-gray-700/50 flex items-center justify-center shadow-2xl">
                <MessageSquare className="w-10 h-10 text-gray-500 group-hover:text-purple-400 transition-colors duration-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">My Messages</h3>
            <p className="text-gray-400 max-w-md">Select a conversation from the list or start a new inquiry to begin chatting.</p>
          </div>
        )}
      </div>
    </div>

    {/* Custom Delete Confirmation Dialog */}
    {
      showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full mx-auto">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Delete Message</h3>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={confirmDeleteMessage}
                className="bg-red-500 hover:bg-red-600 text-white flex-1 text-sm sm:text-base"
              >
                Delete
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(null)}
                variant="outline"
                className="flex-1 text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )
    }

    {/* Custom Report Confirmation Dialog */}
    {
      showReportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full mx-auto">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Report Message</h3>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">Are you sure you want to report this message? This will flag it for review.</p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={confirmReportMessage}
                className="bg-red-500 hover:bg-red-600 text-white flex-1 text-sm sm:text-base"
              >
                Report
              </Button>
              <Button
                onClick={() => setShowReportConfirm(null)}
                variant="outline"
                className="flex-1 text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )
    }

    {/* Block Confirmation Dialog */}
    {
      showBlockConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Block Chat</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to block this chat? This will lock the conversation for both users.</p>
            <div className="flex space-x-3">
              <Button
                onClick={confirmBlockUser}
                className="bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                Block
              </Button>
              <Button
                onClick={() => setShowBlockConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )
    }

    {/* User Profile Modal - WhatsApp Style (Right Side) - Dark Theme */}
    {
      showUserProfileModal && selectedConversation && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowUserProfileModal(false)}
          />
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-gray-900 border-l border-gray-700 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-white">Info</h3>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserProfileModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              {/* User Avatar and Name */}
              <div className="flex flex-col items-center mb-6">
                <Avatar className="w-20 h-20 bg-theme-cyan-dim mb-3">
                  <AvatarFallback className="text-theme-cyan font-semibold text-2xl">
                    {getBuyerFromConversation(selectedConversation)?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h4 className="text-lg font-semibold text-white">
                  {getBuyerFromConversation(selectedConversation)?.username || 'User'}
                </h4>
              </div>

              {/* Attachments Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-sm font-semibold text-gray-300">Attachments</h5>
                  {userAttachments.length > 0 && (
                    <button
                      onClick={() => setShowAllAttachmentsModal(true)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      See All
                    </button>
                  )}
                </div>
                {userAttachments.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">No attachments yet</p>
                ) : (
                  <div className="attachments-grid grid grid-cols-3 gap-2">
                    {userAttachments.slice(0, 6).map((attachment) => (
                      <div key={attachment.id} className="relative aspect-square">
                        {attachment.file_type === 'image' ? (
                          <img
                            src={attachment.file_url}
                            alt={attachment.file_name}
                            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(attachment.file_url, '_blank')}
                          />
                        ) : attachment.file_type === 'video' ? (
                          <div className="relative w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                            <Video className="w-6 h-6 text-gray-400" />
                            <video
                              src={attachment.file_url}
                              className="absolute inset-0 w-full h-full object-cover rounded-lg"
                              controls
                            />
                          </div>
                        ) : (
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center w-full h-full bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            <File className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-[10px] text-gray-300 text-center px-1 truncate w-full">{attachment.file_name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy & Support Chat Section */}
              <div className="border-t border-gray-700 pt-4">
                <h5 className="text-sm font-semibold text-gray-300 mb-3">Privacy & Support Chat</h5>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setShowUserProfileModal(false);
                      setShowReportModal(true);
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Info className="w-4 h-4 text-theme-cyan" />
                    </div>
                    <span className="text-sm text-gray-300">Report User</span>
                  </button>
                  {isConversationLocked ? (
                    <button
                      onClick={handleUnblockUser}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-sm text-gray-300">Unblock Chat</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBlockUser}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-orange-400" />
                      </div>
                      <span className="text-sm text-gray-300">Block User</span>
                    </button>
                  )}
                  <button
                    onClick={handleDeleteChat}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-sm text-red-400">Delete Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    }

    {/* See All Attachments Modal - Same position as user profile modal */}
    {
      showAllAttachmentsModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAllAttachmentsModal(false)}
          />
          {/* Sidebar - Same position and size as user profile modal */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-gray-900 border-l border-gray-700 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-white">All Attachments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllAttachmentsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Filter Buttons */}
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setAttachmentFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'all'
                  ? 'bg-theme-cyan text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setAttachmentFilter('image')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'image'
                  ? 'bg-theme-cyan text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                Images
              </button>
              <button
                onClick={() => setAttachmentFilter('video')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'video'
                  ? 'bg-theme-cyan text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                Videos
              </button>
              <button
                onClick={() => setAttachmentFilter('pdf')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'pdf'
                  ? 'bg-theme-cyan text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                PDFs
              </button>
              <button
                onClick={() => setAttachmentFilter('file')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'file'
                  ? 'bg-theme-cyan text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                Files
              </button>
            </div>

            {/* Attachments Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filtered = attachmentFilter === 'all'
                  ? userAttachments
                  : userAttachments.filter(att => {
                    if (attachmentFilter === 'image') return att.file_type === 'image';
                    if (attachmentFilter === 'video') return att.file_type === 'video';
                    if (attachmentFilter === 'pdf') return att.file_type === 'pdf';
                    if (attachmentFilter === 'file') return att.file_type === 'file' || att.file_type === 'document';
                    return true;
                  });

                return filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <File className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No {attachmentFilter === 'all' ? '' : attachmentFilter} attachments found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filtered.map((attachment) => (
                      <div key={attachment.id} className="relative group">
                        {attachment.file_type === 'image' ? (
                          <div className="relative aspect-video">
                            <img
                              src={attachment.file_url}
                              alt={attachment.file_name}
                              className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(attachment.file_url, '_blank')}
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white truncate">{attachment.file_name}</p>
                            </div>
                          </div>
                        ) : attachment.file_type === 'video' ? (
                          <div className="relative aspect-video bg-gray-700 rounded-lg overflow-hidden">
                            <video
                              src={attachment.file_url}
                              className="w-full h-full object-cover rounded-lg"
                              controls
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white truncate">{attachment.file_name}</p>
                            </div>
                          </div>
                        ) : (
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 w-full bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors p-4"
                          >
                            <File className="w-12 h-12 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-300 truncate">{attachment.file_name}</p>
                              {attachment.file_size && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {(attachment.file_size / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )
    }

    {/* Report User Modal */}
    {
      showReportModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Report User</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                  >
                    <option value="">Select a reason</option>
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment</option>
                    <option value="inappropriate_content">Inappropriate Content</option>
                    <option value="scam">Scam/Fraud</option>
                    <option value="fake_account">Fake Account</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Please provide details..."
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 resize-none"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleReportUser}
                    disabled={!reportReason}
                    className="bg-red-500 hover:bg-red-600 text-white flex-1"
                  >
                    Submit Report
                  </Button>
                  <Button
                    onClick={() => {
                      setShowReportModal(false);
                      setReportReason('');
                      setReportDescription('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  </div>
);
}
