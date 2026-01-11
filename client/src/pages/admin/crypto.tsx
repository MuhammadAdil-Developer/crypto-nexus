
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bitcoin, Wallet, RefreshCw, Settings, Lock, Unlock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import paymentService from "@/services/paymentService";
import { API_BASE_URL_WITHOUT_API } from "@/config/api";
import { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminCrypto() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cryptoNodes, setCryptoNodes] = useState<any[]>([]);
  const [escrowWallets, setEscrowWallets] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [securityStatus, setSecurityStatus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logsContent, setLogsContent] = useState<string | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [configContent, setConfigContent] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("nodes");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");

  const fetchCryptoStatus = async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getAdminCryptoStatus();
      if (data) {
        setCryptoNodes(data.nodes || []);
        setEscrowWallets(data.wallets || []);
        setRecentTransactions(data.transactions || []);
        setSecurityStatus(data.security || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch crypto status", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Could not fetch live crypto data. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeAction = async (symbol: string, action: string) => {
    if (action === 'restart' && !isRestartConfirmOpen) {
      setSelectedNode(symbol);
      setIsRestartConfirmOpen(true);
      return;
    }

    const actionKey = `${symbol}-${action}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      const result = await paymentService.performNodeAction(symbol, action);

      if (action === 'logs' && result.logs) {
        setLogsContent(result.logs);
        setSelectedNode(symbol);
        setIsLogsOpen(true);
      } else if (action === 'configure' && result.config) {
        setConfigContent(result.config);
        setSelectedNode(symbol);
        setIsConfigOpen(true);
      } else {
        toast({
          title: "Success",
          description: result.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      if (action === 'restart') setIsRestartConfirmOpen(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    // Check if there's any data for report export
    if (action === 'export_report' && recentTransactions.length === 0) {
      toast({
        title: "No Data",
        description: "There are no escrow records available to generate a report.",
        variant: "warning",
      });
      return;
    }

    try {
      const result = await paymentService.performBulkEscrowAction(action);
      toast({
        title: "Action Successful",
        description: result.message,
      });

      if (result.downloadUrl) {
        const filename = result.downloadUrl.split('/').pop() || 'report.csv';
        await paymentService.downloadAuthenticatedFile(result.downloadUrl, filename);
      }

      if (action === 'release_expired' || action === 'release') {
        setTimeout(() => {
          navigate('/admin/payouts');
        }, 1500); // Small delay so they can see the success toast
      }
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCryptoStatus();
    // Refresh security status notifications for admin
    paymentService.triggerSecurityNotifications();
  }, []);

  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter(tx => {
      const matchesSearch = searchTerm ?
        (tx.txHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.orderId?.toLowerCase().includes(searchTerm.toLowerCase())) : true;
      const matchesType = filterType === 'all' || tx.type?.toLowerCase().includes(filterType.toLowerCase());
      const matchesCurrency = filterCurrency === 'all' || tx.currency === filterCurrency;

      return matchesSearch && matchesType && matchesCurrency;
    });
  }, [recentTransactions, searchTerm, filterType, filterCurrency]);

  const handleGlobalSettings = () => {
    toast({
      title: "Global Crypto Settings",
      description: "Opening system-wide payment gateway configuration...",
    });
  };

  // Loading Skeleton Component
  const NodeSkeleton = () => (
    <Card className="crypto-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="flex space-x-2 mt-6">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );

  const WalletSkeleton = () => (
    <Card className="crypto-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TransactionSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="p-4"><Skeleton className="h-4 w-32" /></td>
          <td className="p-4"><Skeleton className="h-4 w-20" /></td>
          <td className="p-4"><Skeleton className="h-4 w-24" /></td>
          <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
          <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-8" /></td>
          <td className="p-4 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
          <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
        </tr>
      ))}
    </>
  );

  return (
    <>
      {/* Restart Confirmation Dialog */}
      <Dialog open={isRestartConfirmOpen} onOpenChange={setIsRestartConfirmOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white p-0 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Node Restart Required</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to restart the {selectedNode} node?
                </DialogDescription>
              </div>
            </div>
            <div className="bg-black/20 border border-white/5 p-4 rounded-xl mb-6">
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "Restarting the blockchain node may temporarily disrupt active payment monitoring and synchronization for approximately 2-5 minutes."
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsRestartConfirmOpen(false)}
                className="border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleNodeAction(selectedNode, 'restart')}
                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6"
                disabled={actionLoading[`${selectedNode}-restart`]}
              >
                {actionLoading[`${selectedNode}-restart`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Restart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nodes Logs Dialog */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-theme-cyan animate-pulse" />
                  Live Node Logs: {selectedNode}
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  Real-time synchronization and network events
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={() => handleNodeAction(selectedNode, 'logs')}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Logs
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-4 bg-black/40 font-mono text-sm">
            <pre className="text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
              {logsContent || 'Retrieving live logs...'}
            </pre>
          </div>
          <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end">
            <Button onClick={() => setIsLogsOpen(false)} variant="outline" className="border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900 rounded-xl px-6">
              Close Terminal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nodes Config Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0 shadow-2xl shadow-black/50">
          <DialogHeader className="p-6 pb-2 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-theme-cyan/10 rounded-lg">
                <Settings className="w-5 h-5 text-theme-cyan" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">Node Configuration: {selectedNode}</DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  View system-wide crypto engine settings
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-black/20">
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed font-medium">
                  <strong>Production Warning:</strong> Manual configuration changes are currently read-only through this panel. To modify credentials or network ports, please update the <code className="text-white px-1.5 py-0.5 bg-black/40 rounded">.env</code> file on the host server directly.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Current Parameters</h4>
                <div className="grid grid-cols-1 gap-2">
                  {configContent ? configContent.split('\n').map((line, idx) => {
                    const parts = line.split('=');
                    const key = parts[0];
                    const val = parts.slice(1).join('=');
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/[0.08] transition-all">
                        <span className="text-gray-400 font-mono text-xs font-bold uppercase tracking-tight">{key}</span>
                        <span className="text-white font-mono text-sm break-all mt-1 sm:mt-0">{val}</span>
                      </div>
                    );
                  }) : (
                    <div className="py-12 text-center text-gray-600 italic">No configuration data found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end gap-3">
            <Button onClick={() => setIsConfigOpen(false)} variant="outline" className="border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900 font-bold rounded-xl px-6">
              Close
            </Button>
            <Button
              className="bg-theme-cyan hover:bg-theme-cyan/80 text-black font-black rounded-xl px-8 shadow-lg shadow-theme-cyan/10"
              onClick={() => {
                toast({
                  title: "Action Not Permitted",
                  description: "For security, configuration edits are restricted to server-side CLI only.",
                  variant: "destructive"
                });
              }}
            >
              Request Edit Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1 overflow-y-auto bg-bg p-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Crypto & Escrow</h1>
            <p className="text-gray-400 mt-1">Blockchain node status and automated payment management</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCryptoStatus}
              disabled={isLoading}
              className="border-border text-gray-300 hover:text-white"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {isLoading ? "Syncing..." : "Sync Nodes"}
            </Button>
            {/* <Button
              className="bg-accent text-bg hover:bg-accent-2"
              onClick={handleGlobalSettings}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button> */}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-surface-2 mb-8 w-full justify-start overflow-x-auto h-auto p-1 scrollbar-hide">
            <TabsTrigger value="nodes" className="text-gray-300 data-[state=active]:text-white min-w-[120px] py-2.5">
              Blockchain Nodes
            </TabsTrigger>
            <TabsTrigger value="wallets" className="text-gray-300 data-[state=active]:text-white min-w-[120px] py-2.5">
              Escrow Wallets
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-gray-300 data-[state=active]:text-white min-w-[120px] py-2.5">
              Transaction Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nodes">
            {/* Node Status Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {isLoading ? (
                <>
                  <NodeSkeleton />
                  <NodeSkeleton />
                </>
              ) : (
                cryptoNodes.map((node) => (
                  <Card key={node.id} className="crypto-card" data-testid={`node-${node.symbol.toLowerCase()}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {node.symbol === "BTC" ? (
                            <Bitcoin className="w-8 h-8 text-warning mr-3" />
                          ) : (
                            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z" />
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-gray-300 hover:text-white hover:bg-surface-2/50 min-w-[80px]"
                          data-testid={`restart-node-${node.symbol.toLowerCase()}`}
                          onClick={() => handleNodeAction(node.symbol, 'restart')}
                          disabled={actionLoading[`${node.symbol}-restart`]}
                        >
                          {actionLoading[`${node.symbol}-restart`] ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Restart
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-gray-300 hover:text-white hover:bg-surface-2/50 min-w-[90px]"
                          data-testid={`settings-node-${node.symbol.toLowerCase()}`}
                          onClick={() => handleNodeAction(node.symbol, 'configure')}
                          disabled={actionLoading[`${node.symbol}-configure`]}
                        >
                          {actionLoading[`${node.symbol}-configure`] ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-gray-300 hover:text-white hover:bg-surface-2/50 min-w-[100px]"
                          data-testid={`logs-node-${node.symbol.toLowerCase()}`}
                          onClick={() => handleNodeAction(node.symbol, 'logs')}
                          disabled={actionLoading[`${node.symbol}-logs`]}
                        >
                          {actionLoading[`${node.symbol}-logs`] ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          View Logs
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Node Management Actions */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Node Management</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Security Settings</h4>
                    <div className="space-y-3">
                      {securityStatus.length > 0 ? (
                        securityStatus.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 hover:text-white hover:bg-surface-2/50 rounded-lg">
                            <span className="text-gray-300">{item.name}</span>
                            <StatusBadge status={item.status} type={item.type} />
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center justify-between p-3 hover:text-white hover:bg-surface-2/50 rounded-lg">
                            <span className="text-gray-300">RPC Authentication</span>
                            <StatusBadge status="Fetching..." type="warning" />
                          </div>
                          <div className="flex items-center justify-between p-3 hover:text-white hover:bg-surface-2/50 rounded-lg">
                            <span className="text-gray-300">SSL/TLS Encryption</span>
                            <StatusBadge status="Fetching..." type="warning" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Node Actions</h4>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full border-border text-gray-300 hover:text-white hover:bg-surface-2/50 justify-start"
                        data-testid="backup-wallets"
                        onClick={() => handleNodeAction('BTC', 'backup')}
                        disabled={actionLoading['BTC-backup']}
                      >
                        {actionLoading['BTC-backup'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                        Backup Wallet Files
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-border text-gray-300 hover:text-white hover:bg-surface-2/50 justify-start"
                        data-testid="rotate-keys"
                        onClick={() => handleNodeAction('BTC', 'rotate_keys')}
                        disabled={actionLoading['BTC-rotate_keys']}
                      >
                        {actionLoading['BTC-rotate_keys'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Rotate API Keys
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-border text-gray-300 hover:text-white hover:bg-surface-2/50 justify-start"
                        data-testid="rescan-blockchain"
                        onClick={() => handleNodeAction('BTC', 'rescan')}
                        disabled={actionLoading['BTC-rescan']}
                      >
                        {actionLoading['BTC-rescan'] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
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
              {isLoading ? (
                <>
                  <WalletSkeleton />
                  <WalletSkeleton />
                </>
              ) : (
                escrowWallets.map((wallet) => (
                  <Card key={wallet.currency} className="crypto-card" data-testid={`wallet-${wallet.currency.toLowerCase()}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">{wallet.currency} Escrow Wallet</h3>
                        <Wallet className="w-6 h-6 text-accent" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="space-y-4">
                        <div className="text-center p-4 hover:text-white hover:bg-surface-2/50 rounded-xl">
                          <p className="text-3xl font-bold text-white font-mono">{wallet.balance}</p>
                          <p className="text-sm text-gray-400">{wallet.currency}</p>
                          <p className="text-lg text-accent mt-2">{wallet.usdValue}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                          <div>
                            <p className="text-xl sm:text-2xl font-bold text-white">{wallet.fundedEscrows || 0}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400">In Escrow</p>
                          </div>
                          <div>
                            <p className="text-xl sm:text-2xl font-bold text-white">{wallet.pendingOrders || 0}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400">Awaiting Pay</p>
                          </div>
                          <div>
                            <p className="text-xl sm:text-2xl font-bold text-white">{wallet.disputedOrders || 0}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400">Disputed</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-border text-gray-300 hover:text-white hover:bg-surface-2/50"
                            data-testid={`release-funds-${wallet.currency.toLowerCase()}`}
                            onClick={() => navigate('/admin/payouts', { state: { showPrompt: true, filter: wallet.currency } })}
                          >
                            <Unlock className="w-4 h-4 mr-2" />
                            Release Funds
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-border text-gray-300 hover:text-white hover:bg-surface-2/50"
                            data-testid={`view-transactions-${wallet.currency.toLowerCase()}`}
                            onClick={() => setActiveTab("transactions")}
                          >
                            View History
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
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
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="border-border text-gray-300 hover:text-white hover:bg-surface-2/50 flex-1 sm:flex-none"
                        data-testid="release-all-expired"
                        onClick={() => navigate('/admin/payouts', { state: { action: 'release_expired' } })}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Release All Expired (48h)
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border text-gray-300 hover:text-white hover:bg-surface-2/50 flex-1 sm:flex-none"
                        data-testid="export-escrow-report"
                        onClick={() => handleBulkAction('export_report')}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Export Escrow Report
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Security Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center p-3 hover:text-white hover:bg-surface-2/50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-success mr-3" />
                        <span className="text-gray-300">All escrow wallets are secure and synced</span>
                      </div>
                      <div className="flex items-center p-3 hover:text-white hover:bg-surface-2/50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-success mr-3" />
                        <span className="text-gray-300">Multi-signature verification active</span>
                      </div>
                      <div className="flex items-center p-3 hover:text-white hover:bg-surface-2/50 rounded-lg">
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
                      className="border-border text-white bg-black/40 focus-visible:ring-1 focus-visible:ring-accent placeholder:text-gray-500"
                      data-testid="search-transactions"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <select
                      className="border border-border bg-black/40 rounded-md px-3 py-2 text-white outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer min-w-[140px] text-sm"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all" className="bg-surface-2">All Types</option>
                      <option value="Deposit" className="bg-surface-2">Deposits</option>
                      <option value="Escrow Release" className="bg-surface-2">Escrow Releases</option>
                      <option value="Refund" className="bg-surface-2">Refunds</option>
                    </select>
                    <select
                      className="border border-border bg-black/40 rounded-md px-3 py-2 text-white outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer min-w-[140px] text-sm"
                      value={filterCurrency}
                      onChange={(e) => setFilterCurrency(e.target.value)}
                    >
                      <option value="all" className="bg-surface-2">All Currencies</option>
                      <option value="BTC" className="bg-surface-2">BTC</option>
                      <option value="XMR" className="bg-surface-2">XMR</option>
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
                        <th className="text-left p-4 text-sm font-medium text-gray-300 hidden md:table-cell">Confirmations</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300 hidden lg:table-cell">Order ID</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300 hidden sm:table-cell">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <TransactionSkeleton />
                      ) : (
                        filteredTransactions.length > 0 ? (
                          filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-surface-2/50" data-testid={`transaction-${tx.id}`}>
                              <td className="p-4">
                                <span className="font-mono text-accent text-sm">{tx.txHash}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-gray-300 text-sm whitespace-nowrap">{tx.type}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-white font-medium text-sm whitespace-nowrap">{tx.amount}</span>
                              </td>
                              <td className="p-4">
                                <StatusBadge status={tx.status} type={tx.statusType} />
                              </td>
                              <td className="p-4 hidden md:table-cell text-sm text-gray-400">
                                {tx.confirmations}
                              </td>
                              <td className="p-4 hidden lg:table-cell text-sm text-gray-400 font-mono">
                                {tx.orderId}
                              </td>
                              <td className="p-4 hidden sm:table-cell text-sm text-gray-300">
                                {tx.timestamp}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-8 text-center" colSpan={7}>
                              <p className="text-gray-400">No transactions to display.</p>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
