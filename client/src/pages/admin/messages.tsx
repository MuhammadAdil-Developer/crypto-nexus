import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, MessageSquare, Ban, Lock, Flag, Plus, Trash2 } from "lucide-react";

export default function AdminMessages() {

  const sampleMessages = [
    {
      id: 1,
      conversation: "crypto_buyer_89 ↔ CryptoAccountsPlus",
      lastMessage: "Thank you for the quick delivery! Account works perfectly.",
      timestamp: "5 min ago",
      status: "Active",
      statusType: "success" as const,
      flagged: false,
      orderId: "ORD-2847"
    },
    {
      id: 2,
      conversation: "privacy_first ↔ PremiumDigital",
      lastMessage: "The account credentials you provided are not working...",
      timestamp: "2 hours ago",
      status: "Flagged",
      statusType: "danger" as const,
      flagged: true,
      orderId: "ORD-2844"
    },
    {
      id: 3,
      conversation: "anon_user_423 ↔ DigitalVault",
      lastMessage: "When will you deliver the Spotify account?",
      timestamp: "4 hours ago",
      status: "Active",
      statusType: "success" as const,
      flagged: false,
      orderId: "ORD-2846"
    }
  ];

  const blockedKeywords = [
    "scam", "fraud", "fake", "illegal", "stolen", "hack", "cracked", "virus", "malware", "phishing"
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Message Management</h1>
            <p className="text-gray-300 mt-1">Monitor conversations and manage content moderation</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Export Messages
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
                  <p className="text-2xl font-bold text-white">2,847</p>
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
                  <p className="text-2xl font-bold text-white">12</p>
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
                  <p className="text-2xl font-bold text-white">{blockedKeywords.length}</p>
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
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="conversations" className="text-gray-300 data-[state=active]:text-white">
              Conversations
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-gray-300 data-[state=active]:text-white">
              Content Moderation
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-gray-300 data-[state=active]:text-white">
              Blocked Keywords
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
                        placeholder="Search conversations by users or order ID..." 
                        className="pl-10 bg-surface-2 border-border text-white"
                        data-testid="search-conversations"
                      />
                    </div>
                  </div>
                  <Select>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
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
                  {sampleMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className="border-b border-border p-6 hover:bg-surface-2/50 transition-colors"
                      data-testid={`conversation-${message.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-white">{message.conversation}</h3>
                            <Badge 
                              variant={message.flagged ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {message.status}
                            </Badge>
                            {message.flagged && (
                              <Flag className="w-4 h-4 text-danger" />
                            )}
                          </div>
                          <p className="text-gray-300 mb-2">{message.lastMessage}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>{message.timestamp}</span>
                            <span>•</span>
                            <span>Order #{message.orderId}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-6">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-conversation-${message.id}`}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`lock-conversation-${message.id}`}>
                            <Lock className="w-4 h-4" />
                          </Button>
                          {message.flagged && (
                            <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`ban-user-${message.id}`}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Keyword Detection</p>
                          <p className="text-sm text-gray-400">Automatically flag messages containing blocked keywords</p>
                        </div>
                        <Button variant="outline" className="border-border text-gray-300">
                          Enabled
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Spam Detection</p>
                          <p className="text-sm text-gray-400">Flag repeated messages and potential spam content</p>
                        </div>
                        <Button variant="outline" className="border-border text-gray-300">
                          Enabled
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Link Blocking</p>
                          <p className="text-sm text-gray-400">Block external links in messages</p>
                        </div>
                        <Button variant="outline" className="border-border text-gray-300">
                          Disabled
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Manual Review Queue</h3>
                    <div className="text-center py-8 text-gray-400">
                      <Flag className="w-12 h-12 mx-auto mb-4" />
                      <p>No messages pending review</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords">
            <Card className="crypto-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Blocked Keywords Management</CardTitle>
                  <Button className="bg-accent text-bg hover:bg-accent-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Keyword
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex space-x-4 mb-4">
                      <Input 
                        placeholder="Add new blocked keyword..." 
                        className="bg-surface-2 border-border text-white"
                        data-testid="new-keyword-input"
                      />
                      <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="add-keyword-button">
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Current Blocked Keywords</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {blockedKeywords.map((keyword, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-surface-2 rounded-lg"
                          data-testid={`keyword-${index}`}
                        >
                          <span className="text-white">{keyword}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-danger hover:text-red-400"
                            data-testid={`remove-keyword-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-surface-2 rounded-lg">
                    <p className="text-sm text-gray-400">
                      <strong className="text-white">Note:</strong> Messages containing these keywords will be automatically flagged for review. 
                      Keywords are case-insensitive and partial matches are detected.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
  );
}