import { useState } from "react";
import { MessageSquare, MoreVertical, Send } from "lucide-react";
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

const conversations = [
  {
    id: 1,
    vendor: "CryptoAccountsPlus",
    vendorAvatar: "CA",
    lastMessage: "Your Netflix account details have been sent",
    time: "2 min ago",
    unread: 2,
    product: "Netflix Premium Account"
  },
  {
    id: 2,
    vendor: "DigitalVault",
    vendorAvatar: "DV",
    lastMessage: "Thank you for your order! Processing now...",
    time: "5 min ago",
    unread: 1,
    product: "Spotify Premium"
  },
  {
    id: 3,
    vendor: "PremiumSoft",
    vendorAvatar: "PS",
    lastMessage: "Hi! Do you have any questions about the Adobe license?",
    time: "1 hour ago",
    unread: 0,
    product: "Adobe Creative Cloud"
  },
  {
    id: 4,
    vendor: "StreamingAccounts",
    vendorAvatar: "SA",
    lastMessage: "Order has been delivered successfully",
    time: "2 hours ago",
    unread: 0,
    product: "YouTube Premium"
  }
];

const messages = [
  {
    id: 1,
    sender: "vendor",
    content: "Hello! Thank you for your order. I'll have your Netflix Premium account ready within the next hour.",
    time: "10:30 AM"
  },
  {
    id: 2,
    sender: "buyer",
    content: "Great! How long is the warranty on this account?",
    time: "10:32 AM"
  },
  {
    id: 3,
    sender: "vendor", 
    content: "This account comes with a 6-month warranty. If there are any issues, I'll replace it immediately.",
    time: "10:35 AM"
  },
  {
    id: 4,
    sender: "vendor",
    content: "Your Netflix account details have been sent. Please check and let me know if you have any issues!",
    time: "11:15 AM"
  }
];

interface MessagesPanelProps {
  compact?: boolean;
}

export function MessagesPanel({ compact = false }: MessagesPanelProps) {
  const [selectedConversation, setSelectedConversation] = useState(compact ? null : conversations[0]);
  const [newMessage, setNewMessage] = useState("");

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
                      {conv.vendorAvatar}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">
                        {conv.vendor}
                      </h4>
                      <span className="text-xs text-gray-400">{conv.time}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>

                {conv.unread > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {conv.unread}
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Conversations List */}
      <Card className="lg:col-span-1 border border-gray-700 bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div 
                key={conv.id}
                className={`p-4 cursor-pointer transition-colors duration-200 ${
                  selectedConversation?.id === conv.id 
                    ? 'bg-blue-900/20 border-r-2 border-blue-500' 
                    : 'hover:bg-gray-800'
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="text-white font-semibold">
                      {conv.vendorAvatar}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {conv.vendor}
                      </h4>
                      {conv.unread > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
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
      <Card className="lg:col-span-2 border border-gray-700 bg-gray-900">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="text-white font-semibold">
                      {selectedConversation.vendorAvatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedConversation.vendor}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Re: {selectedConversation.product}
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
            <CardContent className="flex-1 p-4">
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.sender === 'buyer' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-white'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'buyer' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex items-center space-x-2 border-t pt-4">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      // Handle send message
                      setNewMessage("");
                    }
                  }}
                />
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                  disabled={!newMessage.trim()}
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
                Choose a vendor to start chatting
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}