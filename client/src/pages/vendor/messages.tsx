import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Search, MoreVertical, Archive, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const conversations = [
  {
    id: 1,
    buyer: "crypto_buyer_01",
    buyerAvatar: "CB",
    lastMessage: "Hello, when will the account be ready?",
    time: "2 min ago",
    unread: 2,
    product: "Netflix Premium Account",
    priority: "urgent",
    status: "active"
  },
  {
    id: 2,
    buyer: "anonymous_buyer",
    buyerAvatar: "AB",
    lastMessage: "Thanks for the quick delivery!",
    time: "1 hour ago",
    unread: 0,
    product: "Spotify Premium",
    priority: "normal",
    status: "resolved"
  },
  {
    id: 3,
    buyer: "crypto_buyer_02", 
    buyerAvatar: "C2",
    lastMessage: "Can you provide more details about the warranty?",
    time: "3 hours ago",
    unread: 1,
    product: "Disney+ Account",
    priority: "normal",
    status: "active"
  },
  {
    id: 4,
    buyer: "crypto_buyer_03",
    buyerAvatar: "C3",
    lastMessage: "I'm having trouble logging in, can you help?",
    time: "5 hours ago",
    unread: 3,
    product: "Adobe Creative Cloud",
    priority: "high",
    status: "active"
  },
  {
    id: 5,
    buyer: "anonymous_buyer_2",
    buyerAvatar: "A2",
    lastMessage: "Order received successfully, great service!",
    time: "1 day ago",
    unread: 0,
    product: "VPN Service",
    priority: "normal",
    status: "resolved"
  }
];

const messages = [
  {
    id: 1,
    sender: "buyer",
    content: "Hello! I just placed an order for the Netflix Premium account. When should I expect to receive the details?",
    time: "2:30 PM"
  },
  {
    id: 2,
    sender: "vendor",
    content: "Hi! Thank you for your order. I'm preparing your account now and you should receive the details within the next 30 minutes.",
    time: "2:32 PM"
  },
  {
    id: 3,
    sender: "buyer",
    content: "Great! One quick question - what's the warranty period for this account?",
    time: "2:35 PM"
  },
  {
    id: 4,
    sender: "vendor",
    content: "The account comes with a 6-month warranty. If there are any issues during this period, I'll replace it immediately at no extra cost.",
    time: "2:37 PM"
  },
  {
    id: 5,
    sender: "buyer",
    content: "Perfect! And when will the account be ready?",
    time: "2:45 PM"
  }
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "normal":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};

export default function VendorMessages() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter(conv =>
    conv.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread, 0);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle send message logic
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Communicate with your customers</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-red-100 text-red-800">
              {totalUnread} unread
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">{conversations.length}</div>
              <p className="text-sm text-gray-600">Total Conversations</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">{totalUnread}</div>
              <p className="text-sm text-gray-600">Unread Messages</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {conversations.filter(c => c.status === "active").length}
              </div>
              <p className="text-sm text-gray-600">Active Chats</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {conversations.filter(c => c.status === "resolved").length}
              </div>
              <p className="text-sm text-gray-600">Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Messages Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 border border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Conversations</span>
                </CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full overflow-y-auto">
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <div 
                    key={conv.id}
                    className={`p-4 cursor-pointer transition-colors duration-200 border-l-4 ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-blue-50 border-blue-500' 
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                          <AvatarFallback className="text-white font-semibold">
                            {conv.buyerAvatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getPriorityColor(conv.priority)}`}></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 truncate">
                            {conv.buyer}
                          </h4>
                          {conv.unread > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{conv.product}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{conv.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 border border-gray-200 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                        <AvatarFallback className="text-white font-semibold">
                          {selectedConversation.buyerAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedConversation.buyer}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Re: {selectedConversation.product}
                        </p>
                      </div>
                      <Badge 
                        className={`text-xs ${selectedConversation.priority === 'urgent' ? 'bg-red-100 text-red-800' : selectedConversation.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {selectedConversation.priority}
                      </Badge>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Star className="w-4 h-4 mr-2" />
                          Mark as Important
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.sender === 'vendor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          message.sender === 'vendor' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-2 ${
                            message.sender === 'vendor' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {message.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newMessage.trim()) {
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600"
                      disabled={!newMessage.trim()}
                      onClick={handleSendMessage}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600">
                    Choose a customer to start chatting
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </VendorLayout>
  );
}