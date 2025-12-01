import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, User, Shield, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ticketService from "@/services/ticketService";

interface TicketConversationProps {
  ticketId: string;
  isAdmin?: boolean;
  onMessageSent?: () => void;
  templateText?: string;
}

interface TicketMessage {
  id: string;
  sender: string;
  sender_type: 'buyer' | 'vendor' | 'admin';
  message: string;
  is_internal: boolean;
  created_at: string;
  sender_username?: string;
  sender_email?: string;
}

export function TicketConversation({ ticketId, isAdmin = false, onMessageSent, templateText }: TicketConversationProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  // Insert template text when provided
  useEffect(() => {
    if (templateText) {
      setNewMessage(templateText);
    }
  }, [templateText]);

  useEffect(() => {
    fetchMessages();
  }, [ticketId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTicketMessages(ticketId);
      if (response.success) {
        setMessages(response.data || []);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch messages",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }

    try {
      setSending(true);
      const response = await ticketService.replyToTicket(ticketId, {
        message: newMessage.trim(),
        is_internal: isInternal
      });

      if (response.success) {
        setNewMessage("");
        setIsInternal(false);
        toast({
          title: "Success",
          description: "Message sent successfully"
        });
        
        // Refresh messages
        await fetchMessages();
        
        // Notify parent component
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'vendor':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getSenderColor = (senderType: string) => {
    switch (senderType) {
      case 'admin':
        return 'bg-blue-500';
      case 'vendor':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Conversation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="max-h-96 overflow-y-auto space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No messages yet</p>
              <p className="text-gray-500 text-sm">Start the conversation by sending a message</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_type === 'admin'
                      ? 'bg-blue-600 text-white'
                      : message.is_internal && isAdmin
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className={`${getSenderColor(message.sender_type)} text-white text-xs`}>
                          {getSenderIcon(message.sender_type)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {message.sender_username || message.sender_type}
                      </span>
                      {message.is_internal && (
                        <Badge variant="secondary" className="text-xs">
                          Internal
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-xs opacity-75">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(message.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.message}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-700 pt-4">
          <div className="space-y-3">
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="internal"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="internal" className="text-sm text-gray-300">
                  Internal note (visible only to admins)
                </label>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
