import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { MessagesPanel } from "@/components/buyer/MessagesPanel";
import { MessageSquare, Users, Clock } from "lucide-react";
import { messagingService } from "@/services/messagingService";
import { realtimeService } from "@/services/realtimeService";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";

export default function BuyerMessages() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productContext, setProductContext] = useState<any>(null);
  const [autoSelectConversation, setAutoSelectConversation] = useState<string | null>(null);
  const { toast } = useToast();
  const location = useLocation();

  // Calculate dynamic message stats from conversations
  const messageStats = useMemo(() => {
    // Total conversations
    const totalConversations = conversations.length;

    // Unread messages count
    const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

    // Active vendors (unique vendors from conversations)
    const uniqueVendors = new Set(
      conversations
        .map(conv => conv.other_user?.id || conv.vendor?.id)
        .filter(Boolean)
    );
    const activeVendors = uniqueVendors.size;

    // Average response time calculation
    const calculateAvgResponseTime = () => {
      const conversationsWithMessages = conversations.filter(conv =>
        conv.last_message && conv.last_message.created_at
      );

      if (conversationsWithMessages.length === 0) return "N/A";

      // Calculate average time difference between messages
      let totalMinutes = 0;
      let count = 0;

      conversationsWithMessages.forEach(conv => {
        if (conv.updated_at && conv.created_at) {
          const diff = new Date(conv.updated_at).getTime() - new Date(conv.created_at).getTime();
          totalMinutes += diff / (1000 * 60); // Convert to minutes
          count++;
        }
      });

      if (count === 0) return "N/A";

      const avgMinutes = totalMinutes / count;

      if (avgMinutes < 60) {
        return `${Math.round(avgMinutes)}m`;
      } else if (avgMinutes < 1440) {
        return `${Math.round(avgMinutes / 60)}h`;
      } else {
        return `${Math.round(avgMinutes / 1440)}d`;
      }
    };

    return [
      { label: "Total Conversations", value: totalConversations.toString(), color: "from-blue-500 to-purple-600" },
      { label: "Unread Messages", value: unreadMessages.toString(), color: "from-red-500 to-pink-600" },
      { label: "Active Vendors", value: activeVendors.toString(), color: "from-green-500 to-emerald-600" },
      { label: "Avg Response Time", value: calculateAvgResponseTime(), color: "from-yellow-500 to-orange-600" }
    ];
  }, [conversations]);

  // Track initialization per location key to allow re-runs on new navigation intent
  const lastProcessedKey = useRef<string | null>(null);

  useEffect(() => {
    const navState: any = location.state;
    const currentKey = location.key;

    // Only run if we haven't processed this specific navigation yet
    if (lastProcessedKey.current === currentKey) return;

    const initializeChat = async () => {
      console.log('🚀 Buyer Chat Initialization - Key:', currentKey, 'NavState:', navState);

      // 1. Load conversations first
      setLoading(true);
      let allConversations: any[] = [];
      try {
        allConversations = await messagingService.getConversations();
        setConversations(allConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }

      // 2. Check for Actions (Navigation State)
      // Priority 1: Open specific product chat (Precise IDs)
      if (navState?.autoOpenProductId && navState?.autoOpenRecipientId) {
        console.log('🎯 Priority 1: Opening product chat for:', navState.autoOpenProductId, 'vendor:', navState.autoOpenRecipientId);
        await handleProductConversation({
          id: navState.autoOpenProductId,
          vendorId: navState.autoOpenRecipientId,
          title: navState.autoOpenRecipientUsername ? `Chat with ${navState.autoOpenRecipientUsername}` : 'Product Chat'
        });
        lastProcessedKey.current = currentKey;
        // Commented out replaceState to avoid losing context on re-renders, 
        // using the key-based check instead for stability.
        return;
      }

      // Priority 2: Fallback to username
      if (navState?.openVendorChat && navState?.autoOpenChat) {
        console.log('🎯 Priority 2: Searching by vendor username:', navState.openVendorChat);
        const vendorUsername = navState.openVendorChat;
        const target = allConversations.find(conv =>
          conv.other_user?.username === vendorUsername ||
          conv.vendor?.username === vendorUsername ||
          conv.vendor_username === vendorUsername
        );

        if (target) {
          setAutoSelectConversation(target.id);
        }
        lastProcessedKey.current = currentKey;
        return;
      }

      // Priority 3: Check for stored product context
      const context = messagingService.getProductContextFromStorage();
      if (context && context.id) {
        console.log('🎯 Priority 3: Opening stored product context');
        setProductContext(context);
        await handleProductConversation(context);
        lastProcessedKey.current = currentKey;
        return;
      }

      // Priority 4: Restore from localStorage
      const savedConversation = localStorage.getItem('selectedConversation');
      if (savedConversation) {
        try {
          const conversation = JSON.parse(savedConversation);
          const found = allConversations.find(conv => conv.id === conversation.id);
          if (found) {
            console.log('🎯 Priority 4: Restoring previous session:', found.id);
            setAutoSelectConversation(found.id);
          }
        } catch (error) {
          console.error('Error restoring saved conversation:', error);
        }
      }

      lastProcessedKey.current = currentKey;
    };

    initializeChat();

    // WebSocket event handlers (Mount once)
    const handleMessagesMarkedRead = () => {
      loadConversations();
    };
    window.addEventListener('messages_marked_read', handleMessagesMarkedRead);

    const handleConversationUpdate = (data: any) => {
      if (data?.conversation) {
        setConversations(prev => {
          const filtered = prev.filter(conv => conv.id !== data.conversation.id);
          return [data.conversation, ...filtered];
        });
      }
    };

    const handleNewMessage = (data: any) => {
      if (data?.conversation_id) {
        setConversations(prev => {
          const updated = prev.map(conv =>
            conv.id === data.conversation_id
              ? { ...conv, updated_at: new Date().toISOString(), last_message: data }
              : conv
          );
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
  }, [location.state]);

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

  const handleProductConversation = async (context: any) => {
    try {
      // 1. Validate Context
      if (!context.id || !context.vendorId) {
        console.warn('⚠️ handleProductConversation: Missing product or vendor ID', context);
        return;
      }

      console.log('🔄 Handling product conversation for:', context.id, 'with vendor:', context.vendorId);

      // 2. Get or Create Conversation (Backend handles the lookup logic)
      const conversation = await messagingService.createProductConversation(
        context.id,
        context.vendorId
      );

      if (!conversation || !conversation.id) {
        throw new Error("Failed to resolve conversation");
      }

      // 3. Update local list (to ensure it exists in the UI)
      const freshConversations = await messagingService.getConversations();
      setConversations(freshConversations);

      // 4. Select by ID
      console.log('✅ Selecting conversation:', conversation.id);
      setAutoSelectConversation(conversation.id);

      toast({
        title: "Conversation Ready",
        description: `Chatting about ${context.title || 'Product'}`,
      });
    } catch (error: any) {
      console.error('Error handling product conversation:', error);
      const errorMessage = error.message || "Failed to start conversation";
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
        {/* Header Banner */}
        <PageBanner
          title="Messages"
          subtitle="Chat with vendors and get support"
          type="buyer"
        />

        {/* Product Context Banner */}
        {productContext && (
          <div className="bg-theme-cyan-dim border border-theme-cyan/30 rounded-xl p-3 sm:p-4 text-white">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {productContext.image && (
                <img
                  src={productContext.image}
                  alt={productContext.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base truncate text-theme-cyan">Chatting about: {productContext.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm truncate">Vendor: {productContext.vendor}</p>
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
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${index === 0 ? 'text-theme-cyan' : index === 1 ? 'text-theme-red' : 'text-gray-400'}`} />
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
              <h4 className="font-medium text-theme-cyan mb-1 sm:mb-2 text-sm sm:text-base">Contact Support</h4>
              <p className="text-xs sm:text-sm text-gray-300">Get help with orders or account issues</p>
            </button>

            <button
              onClick={() => window.location.href = '/buyer/support'}
              className="p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600 cursor-pointer"
            >
              <h4 className="font-medium text-theme-red mb-1 sm:mb-2 text-sm sm:text-base">Report Issue</h4>
              <p className="text-xs sm:text-sm text-gray-300">Report a problem with a vendor or order</p>
            </button>

            <button
              onClick={() => window.location.href = '/buyer/settings'}
              className="p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left border border-gray-600 cursor-pointer sm:col-span-2 lg:col-span-1"
            >
              <h4 className="font-medium text-gray-300 mb-1 sm:mb-2 text-sm sm:text-base">Message Settings</h4>
              <p className="text-xs sm:text-sm text-gray-300">Configure notification preferences</p>
            </button>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
