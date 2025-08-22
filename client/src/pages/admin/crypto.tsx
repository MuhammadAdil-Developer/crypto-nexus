import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bitcoin, Wallet, RefreshCw, Settings, Lock, Unlock, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminCrypto() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Crypto" }
  ];

  const cryptoNodes = [
    {
      id: 1,
      name: "Bitcoin Node",
      symbol: "BTC",
      status: "Connected",
      statusType: "success" as const,
      blockHeight: "820,847",
      lastSync: "2 min ago",
      peers: 8,
      mempool: "4.2 MB",
      version: "v25.0"
    },
    {
      id: 2,
      name: "Monero Node", 
      symbol: "XMR",
      status: "Connected",
      statusType: "success" as const,
      blockHeight: "3,021,456",
      lastSync: "1 min ago",
      peers: 12,
      mempool: "2.1 MB",
      version: "v0.18.3.1"
    }
  ];

  const escrowWallets = [
    {
      currency: "BTC",
      balance: "12.84739281",
      usdValue: "$525,847",
      pendingOrders: 23,
      autoReleaseOrders: 156,
      disputedOrders: 3
    },
    {
      currency: "XMR",
      balance: "847.23841567",
      usdValue: "$145,623",
      pendingOrders: 8,
      autoReleaseOrders: 67,
      disputedOrders: 1
    }
  ];

  const recentTransactions = [
    {
      id: 1,
      txHash: "a1b2c3d4e5f6...9876543210",
      type: "Deposit",
      amount: "0.0012 BTC",
      status: "Confirmed",
      statusType: "success" as const,
      confirmations: 6,
      timestamp: "5 min ago",
      orderId: "ORD-2847"
    },
    {
      id: 2,
      txHash: "9f8e7d6c5b4a...1234567890",
      type: "Escrow Release",
      amount: "0.0008 BTC", 
      status: "Confirmed",
      statusType: "success" as const,
      confirmations: 3,
      timestamp: "12 min ago",
      orderId: "ORD-2846"
    },
    {
      id: 3,
      txHash: "5a4b3c2d1e0f...abcdef1234",
      type: "Refund",
      amount: "1.24 XMR",
      status: "Pending",
      statusType: "warning" as const,
      confirmations: 1,
      timestamp: "1 hour ago",
      orderId: "ORD-2845"
    }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Crypto Management</h1>
            <p className="text-gray-300 mt-1">Monitor blockchain nodes, wallets, and transactions</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Nodes
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs defaultValue="nodes" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="nodes" className="text-gray-300 data-[state=active]:text-white">
              Blockchain Nodes
            </TabsTrigger>
            <TabsTrigger value="wallets" className="text-gray-300 data-[state=active]:text-white">
              Escrow Wallets
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-gray-300 data-[state=active]:text-white">
              Transaction Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nodes">
            {/* Node Status Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {cryptoNodes.map((node) => (
                <Card key={node.id} className="crypto-card" data-testid={`node-${node.symbol.toLowerCase()}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {node.symbol === "BTC" ? (
                          <Bitcoin className="w-8 h-8 text-warning mr-3" />
                        ) : (
                          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z"/>
                            </svg>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-white">{node.name}</h3>
                          <p className="text-sm text-gray-400">{node.symbol} • {node.version}</p>
                        </div>
                      </div>
                      <StatusBadge status={node.status} type={node.statusType} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Block Height</p>
                        <p className="text-white font-mono">{node.blockHeight}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Last Sync</p>
                        <p className="text-white">{node.lastSync}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Connected Peers</p>
                        <p className="text-white">{node.peers}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Mempool Size</p>
                        <p className="text-white">{node.mempool}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-6">
                      <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`restart-node-${node.symbol.toLowerCase()}`}>
                        Restart
                      </Button>
                      <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`settings-node-${node.symbol.toLowerCase()}`}>
                        Configure
                      </Button>
                      <Button variant="outline" size="sm" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`logs-node-${node.symbol.toLowerCase()}`}>
                        View Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Node Management Actions */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Node Management</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Security Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="text-gray-300">RPC Authentication</span>
                        <StatusBadge status="Enabled" type="success" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="text-gray-300">SSL/TLS Encryption</span>
                        <StatusBadge status="Enabled" type="success" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                        <span className="text-gray-300">IP Whitelist</span>
                        <StatusBadge status="Active" type="success" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Node Actions</h4>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full border-border text-gray-300 hover:bg-surface-2 justify-start" data-testid="backup-wallets">
                        <Lock className="w-4 h-4 mr-2" />
                        Backup Wallet Files
                      </Button>
                      <Button variant="outline" className="w-full border-border text-gray-300 hover:bg-surface-2 justify-start" data-testid="rotate-keys">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Rotate API Keys
                      </Button>
                      <Button variant="outline" className="w-full border-border text-gray-300 hover:bg-surface-2 justify-start" data-testid="rescan-blockchain">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Rescan Blockchain
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallets">
            {/* Escrow Wallet Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {escrowWallets.map((wallet) => (
                <Card key={wallet.currency} className="crypto-card" data-testid={`wallet-${wallet.currency.toLowerCase()}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">{wallet.currency} Escrow Wallet</h3>
                      <Wallet className="w-6 h-6 text-accent" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-surface-2 rounded-xl">
                        <p className="text-3xl font-bold text-white font-mono">{wallet.balance}</p>
                        <p className="text-sm text-gray-400">{wallet.currency}</p>
                        <p className="text-lg text-accent mt-2">{wallet.usdValue}</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-white">{wallet.pendingOrders}</p>
                          <p className="text-xs text-gray-400">Pending Release</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{wallet.autoReleaseOrders}</p>
                          <p className="text-xs text-gray-400">Auto-Release</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{wallet.disputedOrders}</p>
                          <p className="text-xs text-gray-400">Disputed</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1 border-border text-gray-300 hover:bg-surface-2" data-testid={`release-funds-${wallet.currency.toLowerCase()}`}>
                          <Unlock className="w-4 h-4 mr-2" />
                          Release Funds
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 border-border text-gray-300 hover:bg-surface-2" data-testid={`view-transactions-${wallet.currency.toLowerCase()}`}>
                          View History
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Escrow Management Actions */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Escrow Management</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Bulk Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid="release-all-expired">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Release All Expired (48h)
                      </Button>
                      <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid="export-escrow-report">
                        Export Escrow Report
                      </Button>
                      <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid="backup-escrow-keys">
                        <Lock className="w-4 h-4 mr-2" />
                        Backup Escrow Keys
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Security Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center p-3 bg-surface-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-success mr-3" />
                        <span className="text-gray-300">All escrow wallets are secure and synced</span>
                      </div>
                      <div className="flex items-center p-3 bg-surface-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-success mr-3" />
                        <span className="text-gray-300">Multi-signature verification active</span>
                      </div>
                      <div className="flex items-center p-3 bg-surface-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-success mr-3" />
                        <span className="text-gray-300">Cold storage backup completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            {/* Transaction Filters */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input 
                      placeholder="Search by transaction hash or order ID..." 
                      className="bg-surface-2 border-border text-white"
                      data-testid="search-transactions"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <select className="bg-surface-2 border border-border rounded-md px-3 py-2 text-white">
                      <option value="all">All Types</option>
                      <option value="deposit">Deposits</option>
                      <option value="release">Escrow Releases</option>
                      <option value="refund">Refunds</option>
                    </select>
                    <select className="bg-surface-2 border border-border rounded-md px-3 py-2 text-white">
                      <option value="all">All Currencies</option>
                      <option value="btc">BTC</option>
                      <option value="xmr">XMR</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Table */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Transaction Hash</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Type</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Amount</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Confirmations</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Order ID</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-surface-2/50" data-testid={`transaction-${tx.id}`}>
                          <td className="p-4">
                            <span className="font-mono text-accent text-sm">{tx.txHash}</span>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={
                                tx.type === "Deposit" ? "secondary" :
                                tx.type === "Escrow Release" ? "default" :
                                "outline"
                              }
                              className="text-xs"
                            >
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-white">{tx.amount}</span>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={tx.status} type={tx.statusType} />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center">
                              <span className="text-white mr-2">{tx.confirmations}</span>
                              {tx.confirmations >= 3 ? (
                                <CheckCircle className="w-4 h-4 text-success" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-warning" />
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-accent">{tx.orderId}</span>
                          </td>
                          <td className="p-4 text-gray-300">{tx.timestamp}</td>
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
    </AdminLayout>
  );
}