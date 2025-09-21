import { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { MessagesPanel } from "@/components/buyer/MessagesPanel";
import { MessageSquare, Users, Clock } from "lucide-react";
import { messagingService } from "@/services/messagingService";
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
      // Try to get existing conversation for this product
      let conversation;
      try {
        conversation = await messagingService.getConversationByProduct(context.id);
      } catch (error) {
        // If no conversation exists, create one
        conversation = await messagingService.createProductConversation(
          context.id,
          context.vendorId
        );
      }
      
      // Update conversations list
      await loadConversations();
      
      // Auto-select the conversation
      if (conversation) {
        setAutoSelectConversation(conversation.id);
      }
      
      toast({
        title: "Conversation Started",
        description: `Chatting about ${context.title}`,
      });
    } catch (error) {
      console.error('Error handling product conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Messages</h1>
              <p className="text-gray-300">Chat with vendors and get support</p>
            </div>
          </div>
        </div>

        {/* Product Context Banner */}
        {productContext && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white">
            <div className="flex items-center space-x-3">
              {productContext.image && (
                <img 
                  src={productContext.image} 
                  alt={productContext.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold">Chatting about: {productContext.title}</h3>
                <p className="text-green-100 text-sm">Vendor: {productContext.vendor}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {messageStats.map((stat, index) => {
            const icons = [MessageSquare, MessageSquare, Users, Clock];
            const Icon = icons[index];
            
            return (
              <div 
                key={stat.label}
                className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
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
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600">
              <h4 className="font-medium text-blue-400 mb-2">Contact Support</h4>
              <p className="text-sm text-gray-300">Get help with orders or account issues</p>
            </button>
            
            <button className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600">
              <h4 className="font-medium text-green-400 mb-2">Report Issue</h4>
              <p className="text-sm text-gray-300">Report a problem with a vendor or order</p>
            </button>
            
            <button className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600">
              <h4 className="font-medium text-purple-400 mb-2">Message Settings</h4>
              <p className="text-sm text-gray-300">Configure notification preferences</p>
            </button>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}