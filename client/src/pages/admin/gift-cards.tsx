
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Search, Gift, Plus, Check, X, Eye, Edit } from "lucide-react";

export default function AdminGiftCards() {

  const sampleGiftCards = [
    {
      id: 1,
      vendor: "CryptoAccountsPlus",
      type: "Netflix Premium (1 Year)",
      value: "0.0012 BTC",
      usdValue: "$52",
      quantity: 25,
      sold: 18,
      status: "Active",
      statusType: "success" as const,
      validUntil: "2024-12-31",
      commission: "5%",
      approved: true
    },
    {
      id: 2,
      vendor: "DigitalVault",
      type: "Spotify Premium (6 Months)",
      value: "0.0008 BTC",
      usdValue: "$35",
      quantity: 50,
      sold: 12,
      status: "Pending",
      statusType: "warning" as const,
      validUntil: "2024-06-30",
      commission: "5%",
      approved: false
    },
    {
      id: 3,
      vendor: "PremiumSoft",
      type: "Adobe Creative Cloud (1 Year)",
      value: "0.0034 BTC",
      usdValue: "$149",
      quantity: 15,
      sold: 8,
      status: "Active",
      statusType: "success" as const,
      validUntil: "2025-03-31",
      commission: "4%",
      approved: true
    },
    {
      id: 4,
      vendor: "GameAccounts",
      type: "Steam Wallet ($50)",
      value: "0.0011 BTC",
      usdValue: "$50",
      quantity: 100,
      sold: 67,
      status: "Low Stock",
      statusType: "warning" as const,
      validUntil: "No Expiry",
      commission: "6%",
      approved: true
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gift Card Management</h1>
            <p className="text-gray-300 mt-1">Manage gift card listings and vendor submissions</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Gift Card
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Gift className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Gift Cards</p>
                  <p className="text-2xl font-bold text-white">45</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center mr-4">
                  <Gift className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold text-white">1,247</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-warning font-bold">₿</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-white">12.8 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-danger/20 rounded-lg flex items-center justify-center mr-4">
                  <Gift className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pending Approval</p>
                  <p className="text-2xl font-bold text-white">7</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="crypto-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search gift cards by type or vendor..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-gift-cards"
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  <SelectItem value="crypto-accounts">CryptoAccountsPlus</SelectItem>
                  <SelectItem value="digital-vault">DigitalVault</SelectItem>
                  <SelectItem value="premium-soft">PremiumSoft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Gift Cards Table */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white">Gift Card Listings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Gift Card Type</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Value</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Stock</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Sales</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Valid Until</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Commission</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sampleGiftCards.map((card) => (
                    <tr key={card.id} className="hover:bg-surface-2/50" data-testid={`gift-card-row-${card.id}`}>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                            <Gift className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{card.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{card.vendor}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-mono text-white">{card.value}</p>
                          <p className="text-sm text-gray-400">{card.usdValue}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-white">{card.quantity - card.sold}</p>
                          <p className="text-sm text-gray-400">of {card.quantity}</p>
                        </div>
                      </td>
                      <td className="p-4 text-white">{card.sold}</td>
                      <td className="p-4">
                        <StatusBadge status={card.status} type={card.statusType} />
                      </td>
                      <td className="p-4 text-gray-300">{card.validUntil}</td>
                      <td className="p-4 text-white">{card.commission}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {!card.approved && (
                            <>
                              <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`approve-card-${card.id}`}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`reject-card-${card.id}`}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-card-${card.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`edit-card-${card.id}`}>
                            <Edit className="w-4 h-4" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="crypto-card">
            <CardHeader>
              <CardTitle className="text-white">Popular Gift Card Types</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Netflix Premium</p>
                    <p className="text-sm text-gray-400">Streaming service</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">143 sold</p>
                    <p className="text-sm text-accent">45 in stock</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Steam Wallet</p>
                    <p className="text-sm text-gray-400">Gaming platform</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">89 sold</p>
                    <p className="text-sm text-accent">33 in stock</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Adobe Creative Cloud</p>
                    <p className="text-sm text-gray-400">Design software</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">67 sold</p>
                    <p className="text-sm text-warning">7 in stock</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardHeader>
              <CardTitle className="text-white">Gift Card Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <span className="text-gray-300">Auto-approve new listings</span>
                  <Badge variant="secondary">Disabled</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <span className="text-gray-300">Low stock threshold</span>
                  <Badge variant="outline">10 units</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <span className="text-gray-300">Expiry notifications</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                
                <Button variant="outline" className="w-full border-border text-gray-300 hover:bg-surface-2" data-testid="manage-settings">
                  Manage Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    
  );
}