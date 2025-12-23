import { useState, useEffect, useRef } from "react";
import { MessageSquare, MoreVertical, Send, Search, Archive, Star, Package, X, ArrowDown, Copy, Loader2, Image as ImageIcon, File, Video, Paperclip, User, Shield, Flag, Lock, Camera, Mic, Trash2, Info } from "lucide-react";
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
import { realtimeService } from "@/services/realtimeService";
import { getRelativeTime } from "@/utils/timeUtils";
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
  const [localConversations, setLocalConversations] = useState<any[]>(conversations);

  // Update local conversations when prop changes
  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

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
  const [isConversationLocked, setIsConversationLocked] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [userAttachments, setUserAttachments] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Auto-select conversation if provided
  useEffect(() => {
    if (autoSelectConversation && localConversations.length > 0) {
      const conversation = localConversations.find(conv =>
        conv.vendor?.username === autoSelectConversation ||
        conv.vendor_username === autoSelectConversation
      );
      if (conversation && !selectedConversation) {
        setSelectedConversation(conversation);
        if (onConversationSelected) {
          onConversationSelected();
        }
      }
    }
  }, [autoSelectConversation, localConversations, selectedConversation, onConversationSelected]);

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
            title: "Copied",
            description: "Message copied",
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

      // If this is a new message and conversation is selected, update conversation list
      if (selectedConversation && (message.conversation === selectedConversation.id || message.conversation_id === selectedConversation.id)) {
        // Update local conversations to move this conversation to top
        setLocalConversations(prev => {
          const updated = prev.map(conv =>
            conv.id === selectedConversation.id
              ? { ...conv, last_message: message, updated_at: message.created_at }
              : conv
          );
          // Sort by updated_at descending
          return updated.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      }
    });

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

    messagingService.onConversationLocked((data) => {
      // Handle conversation locked event
      setIsConversationLocked(!data.is_active);
      if (!data.is_active) {
        toast({
          title: "Conversation Locked",
          description: "This conversation has been blocked. This chat has been locked.",
          variant: "destructive",
        });
      }
    });

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

    // Listen for conversation updates (when messages are sent/received)
    const handleConversationUpdate = (data: any) => {
      if (data?.conversation) {
        // Update local conversations list directly without full refresh
        setLocalConversations(prev => {
          // Remove old conversation if exists
          const filtered = prev.filter(conv => conv.id !== data.conversation.id);
          // Add updated conversation at the top
          return [data.conversation, ...filtered];
        });

        // If this is the selected conversation, update it
        if (selectedConversation?.id === data.conversation.id) {
          setSelectedConversation(data.conversation);
        }
      }
    };

    realtimeService.subscribe('message_edited', handleMessageEdited);
    realtimeService.subscribe('message_deleted', handleMessageDeleted);
    realtimeService.subscribe('conversation_updated', handleConversationUpdate);

    return () => {
      // Don't disconnect here - only disconnect when switching conversations
      realtimeService.unsubscribe('message_edited', handleMessageEdited);
      realtimeService.unsubscribe('message_deleted', handleMessageDeleted);
      realtimeService.unsubscribe('conversation_updated', handleConversationUpdate);
      window.removeEventListener('message_edited', handleWebSocketMessageEdited as EventListener);
      window.removeEventListener('message_deleted', handleWebSocketMessageDeleted as EventListener);
    };
  }, [selectedConversation]);

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

  // Load blocked users on mount
  useEffect(() => {
    const loadBlockedUsers = async () => {
      const response = await messagingService.getBlockedUsers();
      if (response.success && response.data) {
        setBlockedUsers(response.data.map((u: any) => u.id));
      }
    };
    loadBlockedUsers();
  }, []);

  const handleConversationSelect = async (conversation: any) => {
    // Don't reload if already selected
    if (selectedConversation?.id === conversation.id && messages.length > 0) {
      return;
    }

    setLoadingMessages(true);
    try {
      setSelectedConversation(conversation);

      // Get other participant
      // Check if conversation is locked (is_active = false means locked)
      setIsConversationLocked(!conversation.is_active);

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

  const handleBlockUser = () => {
    setShowBlockConfirm(true);
  };

  const confirmBlockUser = async () => {
    if (!selectedConversation) return;
    setShowBlockConfirm(false);

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
        setShowUserProfileModal(false);
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
        toast({
          title: "User Reported",
          description: response.message || "User has been reported. Admin will review.",
        });
        setShowReportModal(false);
        setReportReason('');
        setReportDescription('');
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 border border-gray-700 bg-gray-900 overflow-hidden h-full flex flex-col">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg mb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Messages</span>
            </div>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base bg-gray-800 border-gray-700"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-4 flex flex-col items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
              <p className="text-gray-400">Loading conversations...</p>
            </div>
          ) : (() => {
            const filtered = localConversations.filter(conv =>
              (conv.product?.headline || conv.product?.title)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              conv.participants?.some((p: any) => p.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
              conv.last_message?.content?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No conversations found</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 sm:p-4 cursor-pointer transition-colors duration-200 ${selectedConversation?.id === conv.id
                      ? 'bg-blue-900/20 border-r-2 border-blue-500'
                      : 'hover:bg-gray-800'
                      }`}
                    onClick={() => handleConversationSelect(conv)}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                        <AvatarFallback className="text-white font-semibold text-xs sm:text-sm">
                          {conv.product?.title?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate text-sm sm:text-base">
                              {conv.product?.headline || conv.product?.title || 'Product Chat'}
                            </h4>
                            <span className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
                              {getRelativeTime(conv.updated_at)}
                            </span>
                          </div>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-red-500 text-white text-[10px] sm:text-xs flex-shrink-0 min-w-[18px] h-[18px] px-1">
                              {conv.unread_count > 99 ? '99+' : conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5">
                          {(() => {
                            const lastMsg = conv.last_message;
                            if (!lastMsg) return 'No messages yet';
                            if (lastMsg.message_type === 'image') return '📷 Image';
                            if (lastMsg.message_type === 'video') return '🎥 Video';
                            if (lastMsg.message_type === 'pdf') return '📄 PDF';
                            if (lastMsg.message_type === 'file' || lastMsg.message_type === 'document') {
                              return `📎 ${lastMsg.metadata?.file_name || 'File'}`;
                            }
                            return lastMsg.content || 'No messages yet';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="lg:col-span-2 border border-gray-700 bg-gray-900 overflow-hidden flex flex-col h-full">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                    <AvatarFallback className="text-white font-semibold text-xs sm:text-sm">
                      {getVendorFromConversation(selectedConversation)?.username?.charAt(0) || 'V'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-semibold text-white text-sm sm:text-base truncate cursor-pointer hover:text-blue-400 transition-colors flex items-center space-x-2"
                      onClick={handleOpenUserProfile}
                    >
                      <span className="truncate">{getVendorFromConversation(selectedConversation)?.username || 'Vendor'}</span>
                      {/* Refund/Dispute badge */}
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
                              return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">DISPUTE CHAT</Badge>;
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
                              return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">REFUND CHAT</Badge>;
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
                                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">DISPUTE CHAT</Badge>;
                              }
                              if (context.isRefund) {
                                return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">REFUND CHAT</Badge>;
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
                              return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">REFUND CHAT</Badge>;
                            }
                            if (productRefMessage.metadata?.dispute_id) {
                              return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">DISPUTE CHAT</Badge>;
                            }
                          }
                        }

                        return null;
                      })()}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 flex items-center truncate">
                      <Package className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{selectedConversation.product?.headline || selectedConversation.product?.title || 'Product Discussion'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[90vw] sm:w-auto">
                      <DropdownMenuItem onClick={() => setShowReportModal(true)}>
                        <Flag className="w-4 h-4 mr-2" />
                        Report User
                      </DropdownMenuItem>
                      {isConversationLocked ? (
                        <DropdownMenuItem onClick={handleUnblockUser} className="text-green-600">
                          <Shield className="w-4 h-4 mr-2" />
                          Unblock Chat
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={handleBlockUser} className="text-red-600">
                          <Lock className="w-4 h-4 mr-2" />
                          Block Chat
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleDeleteChat} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            {/* Blocked/Locked Message */}
            {isConversationLocked && (
              <div className="bg-red-900/20 border-b border-red-500/30 p-3 text-center">
                <p className="text-red-400 text-sm flex items-center justify-center">
                  <Lock className="w-4 h-4 mr-2" />
                  This chat has been locked
                </p>
              </div>
            )}

            {/* Messages */}
            <CardContent className="flex-1 p-3 sm:p-4 flex flex-col min-h-0">
              <div className="space-y-3 sm:space-y-4 mb-4 flex-1 overflow-y-auto scroll-smooth min-h-0 h-[calc(100vh-240px)] sm:h-[calc(100vh-280px)] lg:h-full" style={{ scrollBehavior: 'smooth' }} onScroll={handleScroll}>
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

                      // Determine background color based on chat type
                      const isRefund = message.metadata?.refund_id;
                      const isDispute = message.metadata?.dispute_id;
                      let bgColor = 'bg-blue-300/80 border-blue-400/50'; // Normal chat
                      let textColor = 'text-blue-900';
                      let borderColor = 'border-blue-400/50';

                      if (isRefund) {
                        bgColor = 'bg-orange-300/80 border-orange-400/50';
                        textColor = 'text-orange-900';
                        borderColor = 'border-orange-400/50';
                      } else if (isDispute) {
                        bgColor = 'bg-red-300/80 border-red-400/50';
                        textColor = 'text-red-900';
                        borderColor = 'border-red-400/50';
                      }

                      return (
                        <div key={message.id} className={`flex ${isFirstMessageFromCurrentUser ? 'justify-end' : 'justify-start'} my-4`}>
                          <div className="relative max-w-md">
                            {/* Arrow pointing down */}
                            <div className={`absolute -bottom-3 z-10 ${isFirstMessageFromCurrentUser ? 'right-4' : 'left-4'}`}>
                              <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${isRefund ? 'border-t-orange-300/80' : isDispute ? 'border-t-red-300/80' : 'border-t-blue-300/80'}`}></div>
                            </div>

                            {/* Product reference box with color based on chat type */}
                            <div className={`${bgColor} backdrop-blur-sm ${textColor} px-4 py-3 rounded-lg border ${borderColor} shadow-lg`}>
                              <div className="flex items-center space-x-3">
                                {message.metadata?.product_image ? (
                                  <img
                                    src={message.metadata.product_image}
                                    alt={message.metadata.product_title}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded ${isRefund ? 'bg-orange-400' : isDispute ? 'bg-red-400' : 'bg-blue-400'} flex items-center justify-center`}>
                                    <Package className={`w-5 h-5 ${isRefund ? 'text-orange-900' : isDispute ? 'text-red-900' : 'text-blue-900'}`} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${isRefund ? 'text-orange-700' : isDispute ? 'text-red-700' : 'text-blue-700'} mb-1`}>This message is related to:</p>
                                  <h4 className={`font-medium text-sm ${textColor} truncate`}>{message.metadata?.product_title}</h4>
                                  <p className={`text-xs ${isRefund ? 'text-orange-800' : isDispute ? 'text-red-800' : 'text-blue-800'}`}>${message.metadata?.product_price} • {message.metadata?.vendor_username}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Handle different message types (WhatsApp-style)
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
                              <p className="text-sm">{message.content}</p>
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
                              <p className="text-sm">{message.content}</p>
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
                              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors"
                            >
                              {message.message_type === 'pdf' ? (
                                <File className="w-5 h-5 text-red-400" />
                              ) : (
                                <File className="w-5 h-5 text-blue-400" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.metadata?.file_name || 'File'}</p>
                                <p className="text-xs opacity-75">
                                  {message.metadata?.file_size ? `${(message.metadata.file_size / 1024).toFixed(1)} KB` : 'File'}
                                </p>
                              </div>
                            </a>
                            {message.content && (
                              <p className="text-sm">{message.content}</p>
                            )}
                          </div>
                        );
                      }

                      // Handle deleted messages (WhatsApp style)
                      if (message.is_deleted || message.message_type === 'system' && message.content === 'This message was deleted') {
                        return (
                          <div className="flex items-center space-x-2 text-gray-400 italic">
                            <Archive className="w-4 h-4" />
                            <p className="text-sm">This message was deleted</p>
                          </div>
                        );
                      }

                      // Default text message
                      return message.content ? (
                        <p className="text-sm">
                          {message.content}
                          {message.metadata?.edited && (
                            <span className="text-[10px] text-gray-400 italic ml-2">edited</span>
                          )}
                        </p>
                      ) : null;
                    };

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-2xl relative ${isOwnMessage
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-8'
                          : 'bg-gray-700 text-white mr-8'
                          }`}>
                          {renderMessageContent()}
                          <p className={`text-[10px] sm:text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                            }`}>
                            {formatTime(message.created_at)}
                          </p>

                          {/* Three-dot menu - Only show on own messages */}
                          {isOwnMessage && (
                            <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-white/30 text-blue-200 hover:text-white bg-white/10"
                                  >
                                    <MoreVertical className="w-4 h-4" />
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
                            <div className="absolute top-1 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-white/30 text-gray-300 hover:text-white bg-white/10"
                                  >
                                    <MoreVertical className="w-4 h-4" />
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

              {/* File Preview */}
              {filePreview && (
                <div className="border-t border-gray-700 pt-3 mb-2">
                  <div className="relative inline-block">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg object-cover"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={clearFileSelection}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedFile && !filePreview && (
                <div className="border-t border-gray-700 pt-3 mb-2">
                  <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
                    {selectedFile.type === 'application/pdf' ? (
                      <File className="w-5 h-5 text-red-400" />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <Video className="w-5 h-5 text-purple-400" />
                    ) : (
                      <File className="w-5 h-5 text-blue-400" />
                    )}
                    <span className="text-sm text-white flex-1 truncate">{selectedFile.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                      onClick={clearFileSelection}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="flex flex-col space-y-2 border-t border-gray-700 pt-3 sm:pt-4 mt-auto flex-shrink-0">
                {/* Lock Notification */}
                {isConversationLocked && (
                  <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg p-3 text-sm flex items-center space-x-2">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>This chat has been locked</span>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-400">Uploading file...</span>
                      <span className="text-xs text-blue-400">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 relative">
                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleFileSelect}
                    accept="video/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={audioInputRef}
                    onChange={handleFileSelect}
                    accept="audio/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={documentInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />

                  {/* File Picker Modal - WhatsApp Style - Compact */}
                  {showFilePicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-50">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            imageInputRef.current?.click();
                            setShowFilePicker(false);
                          }}
                          className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 transition-colors min-w-[60px]"
                          title="Camera"
                        >
                          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-1">
                            <Camera className="w-5 h-5 text-pink-400" />
                          </div>
                          <span className="text-[10px] text-gray-300">Camera</span>
                        </button>
                        <button
                          onClick={() => {
                            imageInputRef.current?.click();
                            setShowFilePicker(false);
                          }}
                          className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 transition-colors min-w-[60px]"
                          title="Gallery"
                        >
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-1">
                            <ImageIcon className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className="text-[10px] text-gray-300">Gallery</span>
                        </button>
                        <button
                          onClick={() => {
                            videoInputRef.current?.click();
                            setShowFilePicker(false);
                          }}
                          className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 transition-colors min-w-[60px]"
                          title="Video"
                        >
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-1">
                            <Video className="w-5 h-5 text-green-400" />
                          </div>
                          <span className="text-[10px] text-gray-300">Video</span>
                        </button>
                        <button
                          onClick={() => {
                            audioInputRef.current?.click();
                            setShowFilePicker(false);
                          }}
                          className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 transition-colors min-w-[60px]"
                          title="Audio"
                        >
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-1">
                            <Mic className="w-5 h-5 text-orange-400" />
                          </div>
                          <span className="text-[10px] text-gray-300">Audio</span>
                        </button>
                        <button
                          onClick={() => {
                            documentInputRef.current?.click();
                            setShowFilePicker(false);
                          }}
                          className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-700 transition-colors min-w-[60px]"
                          title="Document"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-1">
                            <File className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="text-[10px] text-gray-300">Document</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 sm:h-10 w-9 sm:w-10 p-0 flex-shrink-0"
                    onClick={() => setShowFilePicker(!showFilePicker)}
                    disabled={isConversationLocked || isBlocked}
                  >
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (!isConversationLocked) {
                        handleTyping(true);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && (newMessage.trim() || selectedFile) && !isConversationLocked) {
                        handleSendMessage();
                      }
                    }}
                    onFocus={() => setShowFilePicker(false)}
                    disabled={isConversationLocked}
                    className="flex-1 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Button
                    size="sm"
                    className="bg-theme-cyan text-black hover:bg-theme-cyan/90 h-9 sm:h-10 px-3 sm:px-4 flex-shrink-0"
                    disabled={(!newMessage.trim() && !selectedFile) || isConversationLocked}
                    onClick={handleSendMessage}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
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

      {/* Block Confirmation Dialog */}
      {showBlockConfirm && (
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
      )}

      {/* User Profile Modal - WhatsApp Style (Right Side) - Dark Theme */}
      {showUserProfileModal && selectedConversation && (
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
                <Avatar className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 mb-3">
                  <AvatarFallback className="text-white font-semibold text-2xl">
                    {getVendorFromConversation(selectedConversation)?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h4 className="text-lg font-semibold text-white">
                  {getVendorFromConversation(selectedConversation)?.username || 'User'}
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
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Info className="w-4 h-4 text-blue-400" />
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
      )}

      {/* See All Attachments Modal - Same position as user profile modal */}
      {showAllAttachmentsModal && (
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
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setAttachmentFilter('image')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'image'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                Images
              </button>
              <button
                onClick={() => setAttachmentFilter('video')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'video'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                Videos
              </button>
              <button
                onClick={() => setAttachmentFilter('pdf')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'pdf'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                PDFs
              </button>
              <button
                onClick={() => setAttachmentFilter('file')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${attachmentFilter === 'file'
                  ? 'bg-blue-500 text-white'
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
      )}

      {/* Report User Modal */}
      {showReportModal && selectedConversation && (
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
      )}
    </div>
  );
}
