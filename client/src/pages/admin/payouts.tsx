
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, Wallet, RefreshCw, Check, X, Clock, Download } from "lucide-react";

export default function AdminPayouts() {

  const samplePayouts = [
    {
      id: 1,
      vendor: "CryptoAccountsPlus",
      amount: "2.4567 BTC",
      usdValue: "$108,432",
      commission: "0.1234 BTC",
      status: "Pending",
      statusType: "warning" as const,
      method: "Bitcoin Address",
      requestDate: "2 hours ago",
      lastSale: "1 hour ago",
      totalSales: "12.8 BTC"
    },
    {
      id: 2,
      vendor: "PremiumSoft",
      amount: "1.8943 BTC",
      usdValue: "$83,567",
      commission: "0.0947 BTC",
      status: "Processing",
      statusType: "accent" as const,
      method: "Bitcoin Address",
      requestDate: "6 hours ago",
      lastSale: "3 hours ago",
      totalSales: "8.4 BTC"
    },
    {
      id: 3,
      vendor: "DigitalVault",
      amount: "0.5612 XMR",
      usdValue: "$89,230",
      commission: "0.0281 XMR",
      status: "Completed",
      statusType: "success" as const,
      method: "Monero Address",
      requestDate: "1 day ago",
      lastSale: "2 days ago",
      totalSales: "4.2 XMR"
    }
  ];

  const sampleRefunds = [
    {
      id: 1,
      orderId: "ORD-2844",
      buyer: "privacy_first",
      vendor: "PremiumDigital",
      amount: "0.0015 BTC",
      reason: "Account credentials not working",
      status: "Pending",
      statusType: "warning" as const,
      requestDate: "1 hour ago",
      escrowReleased: false
    },
    {
      id: 2,
      orderId: "ORD-2831",
      buyer: "crypto_buyer_89",
      vendor: "StreamAccounts",
      amount: "0.0008 BTC",
      reason: "Wrong account type delivered",
      status: "Approved",
      statusType: "success" as const,
      requestDate: "4 hours ago",
      escrowReleased: true
    },
    {
      id: 3,
      orderId: "ORD-2823",
      buyer: "anon_user_423",
      vendor: "DigitalServices",
      amount: "0.0012 BTC",
      reason: "Vendor not responding",
      status: "Processing",
      statusType: "accent" as const,
      requestDate: "1 day ago",
      escrowReleased: false
    }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Payouts & Refunds</h1>
            <p className="text-gray-300 mt-1">Manage vendor payouts and customer refund requests</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              Process All
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Pending Payouts</p>
                  <p className="text-2xl font-bold text-white">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Wallet className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Pending</p>
                  <p className="text-2xl font-bold text-white">45.2 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <RefreshCw className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Refund Requests</p>
                  <p className="text-2xl font-bold text-white">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Check className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Processed Today</p>
                  <p className="text-2xl font-bold text-white">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payouts" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="payouts" className="text-gray-300 data-[state=active]:text-white">
              Vendor Payouts
            </TabsTrigger>
            <TabsTrigger value="refunds" className="text-gray-300 data-[state=active]:text-white">
              Customer Refunds
            </TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payouts">
            {/* Filters */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        placeholder="Search by vendor name..." 
                        className="pl-10 bg-surface-2 border-border text-white"
                        data-testid="search-payouts"
                      />
                    </div>
                  </div>
                  <Select>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currency</SelectItem>
                      <SelectItem value="btc">BTC</SelectItem>
                      <SelectItem value="xmr">XMR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payouts Table */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Vendor Payout Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Payout Amount</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Commission</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Method</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Requested</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {samplePayouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-surface-2/50" data-testid={`payout-row-${payout.id}`}>
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">{payout.vendor}</p>
                              <p className="text-sm text-gray-400">Total Sales: {payout.totalSales}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-mono text-white">{payout.amount}</p>
                              <p className="text-sm text-gray-400">{payout.usdValue}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-accent">{payout.commission}</span>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={payout.status} type={payout.statusType} />
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-gray-300">
                              {payout.method}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-300">{payout.requestDate}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {payout.status === "Pending" && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`approve-payout-${payout.id}`}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`reject-payout-${payout.id}`}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-payout-${payout.id}`}>
                                View
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

          <TabsContent value="refunds">
            {/* Refunds Table */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Customer Refund Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Order ID</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Buyer</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Amount</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Reason</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Requested</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sampleRefunds.map((refund) => (
                        <tr key={refund.id} className="hover:bg-surface-2/50" data-testid={`refund-row-${refund.id}`}>
                          <td className="p-4">
                            <span className="font-mono text-accent">{refund.orderId}</span>
                          </td>
                          <td className="p-4 text-white">{refund.buyer}</td>
                          <td className="p-4 text-gray-300">{refund.vendor}</td>
                          <td className="p-4">
                            <span className="font-mono text-white">{refund.amount}</span>
                          </td>
                          <td className="p-4">
                            <div className="max-w-xs">
                              <p className="text-gray-300 truncate">{refund.reason}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={refund.status} type={refund.statusType} />
                          </td>
                          <td className="p-4 text-gray-300">{refund.requestDate}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {refund.status === "Pending" && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`approve-refund-${refund.id}`}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`reject-refund-${refund.id}`}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-refund-${refund.id}`}>
                                View Order
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

          <TabsContent value="history">
            <Card className="crypto-card">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Transaction history will appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Complete payment records and audit trails</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    
  );
}