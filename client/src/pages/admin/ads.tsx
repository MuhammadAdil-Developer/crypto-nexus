
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Eye, BarChart3, Plus, Edit, Trash2, Play, Pause } from "lucide-react";

export default function AdminAds() {

  const sampleAds = [
    {
      id: 1,
      title: "Premium VPN Services - 70% Off",
      description: "Get secure, anonymous browsing with our premium VPN. Special offer for crypto marketplace users.",
      placement: "Homepage Banner",
      status: "Active",
      statusType: "success" as const,
      impressions: 24567,
      clicks: 234,
      ctr: "0.95%",
      budget: "0.05 BTC",
      spent: "0.023 BTC",
      startDate: "2024-03-01",
      endDate: "2024-03-31"
    },
    {
      id: 2,
      title: "Secure Bitcoin Wallet",
      description: "Hardware wallet for ultimate crypto security. Free shipping worldwide.",
      placement: "Sidebar",
      status: "Paused",
      statusType: "warning" as const,
      impressions: 8934,
      clicks: 127,
      ctr: "1.42%",
      budget: "0.02 BTC",
      spent: "0.015 BTC",
      startDate: "2024-03-10",
      endDate: "2024-04-10"
    },
    {
      id: 3,
      title: "Anonymous Email Service",
      description: "Protect your privacy with encrypted email. No logs, no tracking.",
      placement: "Category Pages",
      status: "Draft",
      statusType: "muted" as const,
      impressions: 0,
      clicks: 0,
      ctr: "0.00%",
      budget: "0.03 BTC",
      spent: "0.000 BTC",
      startDate: "2024-04-01",
      endDate: "2024-04-30"
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Advertisement Management</h1>
            <p className="text-gray-300 mt-1">Create and manage marketplace advertisements</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Ad
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Megaphone className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Ads</p>
                  <p className="text-2xl font-bold text-white">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Impressions</p>
                  <p className="text-2xl font-bold text-white">1.2M</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Click-Through Rate</p>
                  <p className="text-2xl font-bold text-white">1.2%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-accent font-bold">₿</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Revenue This Month</p>
                  <p className="text-2xl font-bold text-white">2.4 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="active" className="text-gray-300 data-[state=active]:text-white">
              Active Ads
            </TabsTrigger>
            <TabsTrigger value="create" className="text-gray-300 data-[state=active]:text-white">
              Create New
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-gray-300 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Current Advertisements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Ad Title</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Placement</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Impressions</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Clicks</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">CTR</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Budget</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sampleAds.map((ad) => (
                        <tr key={ad.id} className="hover:bg-surface-2/50" data-testid={`ad-row-${ad.id}`}>
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">{ad.title}</p>
                              <p className="text-sm text-gray-400 line-clamp-1">{ad.description}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-gray-300">
                              {ad.placement}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={ad.status} type={ad.statusType} />
                          </td>
                          <td className="p-4 text-white">{ad.impressions.toLocaleString()}</td>
                          <td className="p-4 text-white">{ad.clicks}</td>
                          <td className="p-4 text-white">{ad.ctr}</td>
                          <td className="p-4">
                            <div className="text-sm">
                              <p className="text-white font-mono">{ad.spent}</p>
                              <p className="text-gray-400">of {ad.budget}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {ad.status === "Active" ? (
                                <Button variant="ghost" size="sm" className="text-warning hover:text-yellow-400" data-testid={`pause-ad-${ad.id}`}>
                                  <Pause className="w-4 h-4" />
                                </Button>
                              ) : ad.status === "Paused" ? (
                                <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`resume-ad-${ad.id}`}>
                                  <Play className="w-4 h-4" />
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`edit-ad-${ad.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-ad-${ad.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`delete-ad-${ad.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Ad Content</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="adTitle" className="text-white">Ad Title</Label>
                      <Input 
                        id="adTitle"
                        placeholder="Enter compelling ad title..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="ad-title-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="adDescription" className="text-white">Description</Label>
                      <Textarea 
                        id="adDescription"
                        placeholder="Describe your product or service..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="ad-description-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="adUrl" className="text-white">Target URL</Label>
                      <Input 
                        id="adUrl"
                        placeholder="https://example.com"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="ad-url-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="adImage" className="text-white">Ad Image</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <p className="text-gray-400">Upload ad image (recommended: 728x90 px)</p>
                        <Button variant="outline" className="mt-2 border-border text-gray-300" data-testid="upload-ad-image">
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Targeting & Budget</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="placement" className="text-white">Ad Placement</Label>
                      <Select>
                        <SelectTrigger className="mt-2 bg-surface-2 border-border text-white">
                          <SelectValue placeholder="Select placement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="homepage">Homepage Banner</SelectItem>
                          <SelectItem value="sidebar">Sidebar</SelectItem>
                          <SelectItem value="category">Category Pages</SelectItem>
                          <SelectItem value="search">Search Results</SelectItem>
                          <SelectItem value="footer">Footer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="budget" className="text-white">Budget (BTC)</Label>
                      <Input 
                        id="budget"
                        type="number"
                        step="0.001"
                        placeholder="0.01"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="ad-budget-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-white">Start Date</Label>
                        <Input 
                          id="startDate"
                          type="date"
                          className="mt-2 bg-surface-2 border-border text-white"
                          data-testid="ad-start-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-white">End Date</Label>
                        <Input 
                          id="endDate"
                          type="date"
                          className="mt-2 bg-surface-2 border-border text-white"
                          data-testid="ad-end-date"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-white">Target Audience</Label>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="allUsers" className="rounded" />
                          <Label htmlFor="allUsers" className="text-gray-300">All Users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="vendors" className="rounded" />
                          <Label htmlFor="vendors" className="text-gray-300">Vendors Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="buyers" className="rounded" />
                          <Label htmlFor="buyers" className="text-gray-300">Buyers Only</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button className="w-full bg-accent text-bg hover:bg-accent-2" data-testid="create-ad-button">
                        Create Advertisement
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Performance Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-surface-2 rounded-xl">
                      <h3 className="text-3xl font-bold text-white">1.2M</h3>
                      <p className="text-gray-400">Total Impressions</p>
                      <p className="text-sm text-success mt-2">↑ 15% from last month</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-surface-2 rounded-lg">
                        <h4 className="text-xl font-bold text-white">14.8K</h4>
                        <p className="text-sm text-gray-400">Total Clicks</p>
                      </div>
                      <div className="text-center p-4 bg-surface-2 rounded-lg">
                        <h4 className="text-xl font-bold text-white">1.23%</h4>
                        <p className="text-sm text-gray-400">Avg CTR</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Top Performing Ads</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {sampleAds.filter(ad => ad.status === "Active").map((ad) => (
                      <div key={ad.id} className="p-4 bg-surface-2 rounded-lg">
                        <h4 className="font-medium text-white mb-2">{ad.title}</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400">Impressions</p>
                            <p className="text-white">{ad.impressions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Clicks</p>
                            <p className="text-white">{ad.clicks}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">CTR</p>
                            <p className="text-accent">{ad.ctr}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Advertisement Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Enable Advertisements</p>
                      <p className="text-sm text-gray-400">Allow ads to be displayed on the marketplace</p>
                    </div>
                    <Switch defaultChecked data-testid="enable-ads-toggle" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Auto-approve Ads</p>
                      <p className="text-sm text-gray-400">Automatically approve ads after payment</p>
                    </div>
                    <Switch data-testid="auto-approve-toggle" />
                  </div>
                  
                  <div>
                    <Label htmlFor="maxDailyBudget" className="text-white">Maximum Daily Budget (BTC)</Label>
                    <Input 
                      id="maxDailyBudget"
                      type="number"
                      step="0.001"
                      defaultValue="0.1"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="max-daily-budget"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reviewTime" className="text-white">Ad Review Time (hours)</Label>
                    <Input 
                      id="reviewTime"
                      type="number"
                      defaultValue="24"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="review-time"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="save-ad-settings">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    
  );
}