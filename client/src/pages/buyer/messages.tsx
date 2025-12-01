import { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { MessagesPanel } from "@/components/buyer/MessagesPanel";
import { MessageSquare, Users, Clock } from "lucide-react";
import { messagingService } from "@/services/messagingService";
import { realtimeService } from "@/services/realtimeService";
import { useToast } from "@/hooks/use-toast";

const messageStats = [
  { label: "Total Conversations", value: "12", color: "from-blue-500 to-purple-600" },
  { label: "Unread Messages", value: "5", color: "from-red-500 to-pink-600" },
  { label: "Active Vendors", value: "8", color: "from-green-500 to-emerald-600" },
  { label: "Avg Response Time", value: "2h", color: "from-yellow-500 to-orange-600" }
];

export default function BuyerMessages() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productContext, setProductContext] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for product context from ProductDetailModal
    const context = messagingService.getProductContextFromStorage();
    if (context) {
      setProductContext(context);
      handleProductConversation(context);
    }
    
    loadConversations();
    
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
    
    // Listen for new messages to update conversation list
    const handleNewMessage = (data: any) => {
      if (data?.conversation_id) {
        // Update conversation in list without full refresh
        setConversations(prev => {
          const updated = prev.map(conv => 
            conv.id === data.conversation_id
              ? { ...conv, updated_at: new Date().toISOString(), last_message: data }
              : conv
          );
          // Sort by updated_at descending
          return updated.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      }
    };
    
    realtimeService.subscribe('new_message', handleNewMessage);

    realtimeService.subscribe('conversation_updated', handleConversationUpdate);

    return () => {
      window.removeEventListener('messages_marked_read', handleMessagesMarkedRead);
      realtimeService.unsubscribe('conversation_updated', handleConversationUpdate);
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [autoSelectConversation, setAutoSelectConversation] = useState<string | null>(null);

  const handleProductConversation = async (context: any) => {
    try {
      // Ensure vendorId is available and properly formatted
      if (!context.vendorId) {
        toast({
          title: "Error",
          description: "Vendor information not available. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Try to get existing conversation for this product
      let conversation;
      try {
        conversation = await messagingService.getConversationByProduct(context.id);
      } catch (error: any) {
        // If no conversation exists (404), create one
        if (error.message?.includes('No conversation found')) {
          // Both IDs should be UUID strings - ensure they are strings
          const productId = String(context.id);
          const vendorId = String(context.vendorId);
          
          conversation = await messagingService.createProductConversation(
            productId,
            vendorId
          );
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
      
      // Update conversations list
      await loadConversations();
      
      // Auto-select the conversation
      if (conversation && conversation.id) {
        setAutoSelectConversation(conversation.id);
      }
      
      toast({
        title: "Conversation Started",
        description: `Chatting about ${context.title}`,
      });
    } catch (error: any) {
      console.error('Error handling product conversation:', error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to start conversation";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <BuyerLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 sm:p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Messages</h1>
              <p className="text-gray-300 text-sm sm:text-base">Chat with vendors and get support</p>
            </div>
          </div>
        </div>

        {/* Product Context Banner */}
        {productContext && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-3 sm:p-4 text-white">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {productContext.image && (
                <img 
                  src={productContext.image} 
                  alt={productContext.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base truncate">Chatting about: {productContext.title}</h3>
                <p className="text-green-100 text-xs sm:text-sm truncate">Vendor: {productContext.vendor}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {messageStats.map((stat, index) => {
            const icons = [MessageSquare, MessageSquare, Users, Clock];
            const Icon = icons[index];
            
            return (
              <div 
                key={stat.label}
                className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1 truncate">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Messages Panel */}
        <MessagesPanel 
          conversations={conversations}
          loading={loading}
          onRefresh={loadConversations}
          autoSelectConversation={autoSelectConversation}
          onConversationSelected={() => setAutoSelectConversation(null)}
        />

        {/* Quick Actions */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h3 className="font-semibold text-white mb-3 sm:mb-4 text-base sm:text-lg">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <button 
              onClick={() => window.location.href = '/buyer/support'}
              className="p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600 cursor-pointer"
            >
              <h4 className="font-medium text-blue-400 mb-1 sm:mb-2 text-sm sm:text-base">Contact Support</h4>
              <p className="text-xs sm:text-sm text-gray-300">Get help with orders or account issues</p>
            </button>
            
            <button 
              onClick={() => window.location.href = '/buyer/support'}
              className="p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600 cursor-pointer"
            >
              <h4 className="font-medium text-green-400 mb-1 sm:mb-2 text-sm sm:text-base">Report Issue</h4>
              <p className="text-xs sm:text-sm text-gray-300">Report a problem with a vendor or order</p>
            </button>
            
            <button 
              onClick={() => window.location.href = '/buyer/settings'}
              className="p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600 cursor-pointer sm:col-span-2 lg:col-span-1"
            >
              <h4 className="font-medium text-purple-400 mb-1 sm:mb-2 text-sm sm:text-base">Message Settings</h4>
              <p className="text-xs sm:text-sm text-gray-300">Configure notification preferences</p>
            </button>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
