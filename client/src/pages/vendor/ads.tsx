import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, BarChart3, Play, Pause, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ads = [
  {
    id: 1,
    title: "Netflix Premium - Special Offer",
    product: "Netflix Premium Account (1 Year)",
    budget: "0.002 BTC",
    spent: "0.0015 BTC",
    clicks: 1247,
    impressions: 15823,
    ctr: 7.88,
    status: "Active",
    placement: "Homepage Banner",
    startDate: "2024-01-10",
    endDate: "2024-02-10"
  },
  {
    id: 2,
    title: "Spotify Premium Deal",
    product: "Spotify Premium (6 Months)",
    budget: "0.001 BTC",
    spent: "0.0008 BTC",
    clicks: 892,
    impressions: 12456,
    ctr: 7.16,
    status: "Active",
    placement: "Category Sidebar",
    startDate: "2024-01-12",
    endDate: "2024-02-12"
  },
  {
    id: 3,
    title: "Adobe Creative Suite",
    product: "Adobe Creative Cloud (1 Year)",
    budget: "0.003 BTC",
    spent: "0.003 BTC",
    clicks: 567,
    impressions: 8932,
    ctr: 6.35,
    status: "Completed",
    placement: "Search Results",
    startDate: "2024-01-05",
    endDate: "2024-01-20"
  },
  {
    id: 4,
    title: "VPN Security Bundle",
    product: "VPN Service (1 Year)",
    budget: "0.0015 BTC",
    spent: "0.0005 BTC",
    clicks: 234,
    impressions: 4567,
    ctr: 5.12,
    status: "Paused",
    placement: "Footer Banner",
    startDate: "2024-01-15",
    endDate: "2024-02-15"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-200";
    case "Paused":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Expired":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

export default function VendorAds() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAds = ads.filter(ad => {
    const matchesSearch = 
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ad.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBudget = ads.reduce((sum, ad) => sum + parseFloat(ad.budget.replace(' BTC', '')), 0);
  const totalSpent = ads.reduce((sum, ad) => sum + parseFloat(ad.spent.replace(' BTC', '')), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Advertisement Management</h1>
            <p className="text-gray-400">Create and manage your product advertisements</p>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Create New Ad
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">{ads.length}</div>
              <p className="text-sm text-gray-400">Total Campaigns</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{totalBudget.toFixed(4)} BTC</div>
              <p className="text-sm text-gray-400">Total Budget</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">{totalSpent.toFixed(4)} BTC</div>
              <p className="text-sm text-gray-400">Total Spent</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{totalClicks.toLocaleString()}</div>
              <p className="text-sm text-gray-400">Total Clicks</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">{avgCTR.toFixed(2)}%</div>
              <p className="text-sm text-gray-400">Average CTR</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ads List */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Campaigns ({filteredAds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAds.map((ad) => (
                <div key={ad.id} className="flex items-center justify-between p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex items-center space-x-6">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{ad.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{ad.product}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{ad.placement}</span>
                        <span>•</span>
                        <span>{ad.startDate} - {ad.endDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8">
                    {/* Performance Metrics */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">{ad.impressions.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Impressions</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">{ad.clicks.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Clicks</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">{ad.ctr}%</div>
                      <div className="text-xs text-gray-400">CTR</div>
                    </div>

                    {/* Budget Info */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">{ad.spent}</div>
                      <div className="text-xs text-gray-400">of {ad.budget}</div>
                      <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ 
                            width: `${(parseFloat(ad.spent.replace(' BTC', '')) / parseFloat(ad.budget.replace(' BTC', ''))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Status */}
                    <Badge className={`border ${getStatusColor(ad.status)}`}>
                      {ad.status}
                    </Badge>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {ad.status === "Active" ? (
                        <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-300">
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : ad.status === "Paused" ? (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                          <Play className="w-4 h-4" />
                        </Button>
                      ) : null}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Campaign
                          </DropdownMenuItem>
                          {ad.status !== "Active" && (
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Campaign
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAds.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <BarChart3 className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No campaigns found</h3>
                <p className="text-gray-400 mb-4">Create your first advertisement to promote your products.</p>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Campaign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">Homepage Banner</div>
                <p className="text-sm text-gray-400">Best performing placement</p>
                <p className="text-xs text-green-700 mt-1">7.88% CTR</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">Netflix Ads</div>
                <p className="text-sm text-gray-400">Top converting product</p>
                <p className="text-xs text-blue-700 mt-1">1,247 clicks</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">Peak Hours</div>
                <p className="text-sm text-gray-400">2-6 PM daily</p>
                <p className="text-xs text-purple-700 mt-1">Highest engagement</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h4 className="font-semibold text-white mb-2">Optimization Tips</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Homepage banner ads perform 23% better than sidebar placements</li>
                <li>• Netflix and streaming account ads have the highest click-through rates</li>
                <li>• Consider increasing budget for high-performing campaigns</li>
                <li>• Best performance times are between 2-6 PM daily</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}