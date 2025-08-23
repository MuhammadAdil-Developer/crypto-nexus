import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Download, TrendingUp, Clock, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const payoutHistory = [
  {
    id: "PAY-2024-015",
    amount: "0.245 BTC",
    usdAmount: "$9,870.50",
    address: "bc1q...xyz789",
    method: "BTC",
    status: "Completed",
    date: "2024-01-15",
    txHash: "a1b2c3d4e5f6789..."
  },
  {
    id: "PAY-2024-014",
    amount: "0.189 BTC",
    usdAmount: "$7,623.40",
    address: "bc1q...abc123",
    method: "BTC",
    status: "Completed",
    date: "2024-01-08",
    txHash: "z9y8x7w6v5u4321..."
  },
  {
    id: "PAY-2024-013",
    amount: "2.45 XMR",
    usdAmount: "$4,321.90",
    address: "4A1B...789XYZ",
    method: "XMR",
    status: "Processing",
    date: "2024-01-14",
    txHash: null
  },
  {
    id: "PAY-2024-012",
    amount: "0.156 BTC",
    usdAmount: "$6,291.60",
    address: "bc1q...def456",
    method: "BTC",
    status: "Completed",
    date: "2024-01-01",
    txHash: "m3n4o5p6q7r8901..."
  }
];

const pendingEarnings = {
  btc: { amount: "0.0892", usd: "$3,594.80", orders: 23 },
  xmr: { amount: "1.234", usd: "$2,176.60", orders: 15 },
  total: { usd: "$5,771.40", orders: 38 }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "Processing":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function VendorPayouts() {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("BTC");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");

  const filteredPayouts = payoutHistory.filter(payout =>
    filterMethod === "all" || payout.method === filterMethod
  );

  const totalPaidOut = payoutHistory
    .filter(p => p.status === "Completed")
    .reduce((sum, p) => sum + parseFloat(p.usdAmount.replace('$', '').replace(',', '')), 0);

  const handleWithdraw = () => {
    // Handle withdrawal logic
    console.log("Withdrawal request:", { withdrawAmount, withdrawMethod, withdrawAddress });
    setWithdrawAmount("");
    setWithdrawAddress("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payouts & Earnings</h1>
            <p className="text-gray-600">Manage your earnings and withdrawal history</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600">
                <Wallet className="w-4 h-4 mr-2" />
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cryptocurrency</label>
                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="XMR">Monero (XMR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <Input
                    placeholder={`Enter amount in ${withdrawMethod}`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {withdrawMethod === "BTC" ? pendingEarnings.btc.amount + " BTC" : pendingEarnings.xmr.amount + " XMR"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Wallet Address</label>
                  <Input
                    placeholder={`Your ${withdrawMethod} address`}
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                  />
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Withdrawals are processed within 24 hours. A small network fee will be deducted from your withdrawal amount.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleWithdraw} className="bg-blue-500 hover:bg-blue-600">
                    Submit Request
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-orange-600">
                  <Wallet className="w-8 h-8" />
                </div>
                <Badge className="bg-orange-500 text-white">BTC</Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900">{pendingEarnings.btc.amount} BTC</div>
              <p className="text-sm text-gray-600">≈ {pendingEarnings.btc.usd}</p>
              <p className="text-xs text-gray-500 mt-1">{pendingEarnings.btc.orders} pending orders</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-600">
                  <Wallet className="w-8 h-8" />
                </div>
                <Badge className="bg-gray-600 text-white">XMR</Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900">{pendingEarnings.xmr.amount} XMR</div>
              <p className="text-sm text-gray-600">≈ {pendingEarnings.xmr.usd}</p>
              <p className="text-xs text-gray-500 mt-1">{pendingEarnings.xmr.orders} pending orders</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-blue-600">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <Badge className="bg-blue-500 text-white">TOTAL</Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900">{pendingEarnings.total.usd}</div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-xs text-gray-500 mt-1">{pendingEarnings.total.orders} total orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">${totalPaidOut.toLocaleString()}</div>
              <p className="text-sm text-gray-600">Total Paid Out</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{payoutHistory.length}</div>
              <p className="text-sm text-gray-600">Total Withdrawals</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">24h</div>
              <p className="text-sm text-gray-600">Processing Time</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">
                {payoutHistory.filter(p => p.status === "Completed").length}
              </div>
              <p className="text-sm text-gray-600">Successful Payouts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="XMR">Monero (XMR)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Withdrawal History ({filteredPayouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{payout.id}</h3>
                        <Badge className={`text-xs ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {payout.method}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        To: {payout.address.substring(0, 8)}...{payout.address.substring(payout.address.length - 6)}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2 h-auto p-0"
                          onClick={() => copyToClipboard(payout.address)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </p>
                      <p className="text-xs text-gray-500">{payout.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{payout.amount}</div>
                      <div className="text-sm text-gray-600">{payout.usdAmount}</div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {payout.status === "Completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : payout.status === "Processing" ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : null}
                      
                      {payout.txHash && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(`https://blockchair.com/${payout.method.toLowerCase()}/transaction/${payout.txHash}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredPayouts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Wallet className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No withdrawals found</h3>
                <p className="text-gray-600">Your withdrawal history will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Information */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">Payout Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Withdrawal Limits</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum BTC:</span>
                    <span className="font-medium">0.001 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum XMR:</span>
                    <span className="font-medium">0.1 XMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Limit:</span>
                    <span className="font-medium">10 BTC / 100 XMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="font-medium">6-24 hours</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Network Fees</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">BTC Network Fee:</span>
                    <span className="font-medium">~0.0001 BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">XMR Network Fee:</span>
                    <span className="font-medium">~0.001 XMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee Calculation:</span>
                    <span className="font-medium">Dynamic</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Network fees are automatically calculated based on current network conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}