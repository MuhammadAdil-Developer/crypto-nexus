
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, DollarSign, TrendingUp, Save, Settings, Edit } from "lucide-react";

export default function AdminCommissions() {

  const commissionHistory = [
    {
      id: 1,
      vendor: "CryptoAccountsPlus",
      period: "March 2024",
      totalSales: "12.8 BTC",
      commissionRate: "5%",
      commissionEarned: "0.64 BTC",
      usdValue: "$28,430",
      paidOut: true
    },
    {
      id: 2,
      vendor: "PremiumSoft",
      period: "March 2024",
      totalSales: "8.4 BTC",
      commissionRate: "4%",
      commissionEarned: "0.336 BTC",
      usdValue: "$14,890",
      paidOut: true
    },
    {
      id: 3,
      vendor: "DigitalVault",
      period: "March 2024",
      totalSales: "4.2 XMR",
      commissionRate: "5%",
      commissionEarned: "0.21 XMR",
      usdValue: "$3,420",
      paidOut: false
    }
  ];

  const vendorCommissions = [
    {
      id: 1,
      vendor: "CryptoAccountsPlus",
      currentRate: "5",
      category: "Streaming Services",
      totalSales: "12.8 BTC",
      joinDate: "2023-08-15",
      performance: "Excellent"
    },
    {
      id: 2,
      vendor: "PremiumSoft",
      currentRate: "4",
      category: "Software & Tools",
      totalSales: "8.4 BTC",
      joinDate: "2023-12-03",
      performance: "Good"
    },
    {
      id: 3,
      vendor: "DigitalVault",
      currentRate: "5",
      category: "Software & Tools",
      totalSales: "0 BTC",
      joinDate: "2024-03-22",
      performance: "New"
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Commission Management</h1>
            <p className="text-gray-300 mt-1">Configure commission rates and track earnings</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Commissions</p>
                  <p className="text-2xl font-bold text-white">23.4 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Percent className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Avg Commission Rate</p>
                  <p className="text-2xl font-bold text-white">4.8%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-2xl font-bold text-white">2.1 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-danger/20 rounded-lg flex items-center justify-center mr-4">
                  <DollarSign className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pending Payouts</p>
                  <p className="text-2xl font-bold text-white">0.84 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white">
              Commission Settings
            </TabsTrigger>
            <TabsTrigger value="vendors" className="text-gray-300 data-[state=active]:text-white">
              Vendor Rates
            </TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white">
              Commission History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Global Settings */}
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Global Commission Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="defaultRate" className="text-white">Default Commission Rate (%)</Label>
                      <Input 
                        id="defaultRate"
                        type="number"
                        defaultValue="5"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="default-commission-rate"
                      />
                      <p className="text-sm text-gray-400 mt-2">Applied to new vendors by default</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="minRate" className="text-white">Minimum Commission Rate (%)</Label>
                      <Input 
                        id="minRate"
                        type="number"
                        defaultValue="3"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="minimum-commission-rate"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxRate" className="text-white">Maximum Commission Rate (%)</Label>
                      <Input 
                        id="maxRate"
                        type="number"
                        defaultValue="15"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="maximum-commission-rate"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category-Based Rates */}
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Category-Based Rates</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Streaming Services</p>
                        <p className="text-sm text-gray-400">Digital entertainment accounts</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="number"
                          defaultValue="5"
                          className="w-20 bg-surface border-border text-white text-center"
                          data-testid="streaming-commission-rate"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Software & Tools</p>
                        <p className="text-sm text-gray-400">Software licenses and applications</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="number"
                          defaultValue="4"
                          className="w-20 bg-surface border-border text-white text-center"
                          data-testid="software-commission-rate"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Gaming</p>
                        <p className="text-sm text-gray-400">Game accounts and in-game items</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="number"
                          defaultValue="6"
                          className="w-20 bg-surface border-border text-white text-center"
                          data-testid="gaming-commission-rate"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Digital Services</p>
                        <p className="text-sm text-gray-400">VPNs, hosting, and online services</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="number"
                          defaultValue="7"
                          className="w-20 bg-surface border-border text-white text-center"
                          data-testid="services-commission-rate"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Settings */}
            <Card className="crypto-card mt-6">
              <CardHeader>
                <CardTitle className="text-white">Payment & Processing Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="payoutSchedule" className="text-white">Automatic Payout Schedule</Label>
                    <select 
                      id="payoutSchedule"
                      className="mt-2 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-white"
                      data-testid="payout-schedule"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="manual">Manual Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="minPayout" className="text-white">Minimum Payout Amount (BTC)</Label>
                    <Input 
                      id="minPayout"
                      type="number"
                      step="0.001"
                      defaultValue="0.01"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="minimum-payout-amount"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="holdPeriod" className="text-white">Commission Hold Period (days)</Label>
                    <Input 
                      id="holdPeriod"
                      type="number"
                      defaultValue="7"
                      className="mt-2 bg-surface-2 border-border text-white"
                      data-testid="hold-period"
                    />
                    <p className="text-sm text-gray-400 mt-2">Days to hold commission before payout eligibility</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="currency" className="text-white">Default Payout Currency</Label>
                    <select 
                      id="currency"
                      className="mt-2 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-white"
                      data-testid="default-currency"
                    >
                      <option value="btc">Bitcoin (BTC)</option>
                      <option value="xmr">Monero (XMR)</option>
                      <option value="vendor_choice">Vendor's Choice</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Individual Vendor Commission Rates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Current Rate</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Total Sales</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Performance</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Member Since</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {vendorCommissions.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-surface-2/50" data-testid={`vendor-commission-${vendor.id}`}>
                          <td className="p-4">
                            <p className="font-medium text-white">{vendor.vendor}</p>
                          </td>
                          <td className="p-4 text-gray-300">{vendor.category}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number"
                                defaultValue={vendor.currentRate}
                                className="w-20 bg-surface-2 border-border text-white text-center"
                                data-testid={`rate-input-${vendor.id}`}
                              />
                              <span className="text-gray-400">%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-white">{vendor.totalSales}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              vendor.performance === "Excellent" ? "bg-success/20 text-success" :
                              vendor.performance === "Good" ? "bg-warning/20 text-warning" :
                              "bg-accent/20 text-accent"
                            }`}>
                              {vendor.performance}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">{vendor.joinDate}</td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`edit-commission-${vendor.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Commission Earnings History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Period</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Total Sales</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Commission Rate</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Commission Earned</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">USD Value</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {commissionHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-surface-2/50" data-testid={`commission-history-${record.id}`}>
                          <td className="p-4 text-white">{record.vendor}</td>
                          <td className="p-4 text-gray-300">{record.period}</td>
                          <td className="p-4">
                            <span className="font-mono text-white">{record.totalSales}</span>
                          </td>
                          <td className="p-4 text-white">{record.commissionRate}</td>
                          <td className="p-4">
                            <span className="font-mono text-accent">{record.commissionEarned}</span>
                          </td>
                          <td className="p-4 text-gray-300">{record.usdValue}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              record.paidOut ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                            }`}>
                              {record.paidOut ? "Paid Out" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    
  );
}