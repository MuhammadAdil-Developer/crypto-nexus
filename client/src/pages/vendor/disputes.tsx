import { useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, Clock, CheckCircle, XCircle, MessageSquare, FileText, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const disputes = [
  {
    id: "DISP-2024-001",
    orderId: "ORD-VN-4521",
    buyer: "crypto_buyer_01",
    product: "Netflix Premium Account (1 Year)",
    amount: "0.0012 BTC",
    issue: "Account not working",
    description: "The Netflix account provided stops working after 2 days. Login credentials are correct but Netflix says the account is suspended.",
    status: "Open",
    priority: "High",
    openedDate: "2024-01-15",
    lastActivity: "2024-01-15",
    escrowHeld: true,
    responses: 2
  },
  {
    id: "DISP-2024-002",
    orderId: "ORD-VN-4518",
    buyer: "crypto_buyer_03",
    product: "Adobe Creative Cloud (1 Year)",
    amount: "0.0034 BTC",
    issue: "Wrong account type",
    description: "Received a personal account instead of the business account that was ordered. Need the business version for team collaboration features.",
    status: "In Review",
    priority: "Medium",
    openedDate: "2024-01-13",
    lastActivity: "2024-01-14",
    escrowHeld: true,
    responses: 4
  },
  {
    id: "DISP-2024-003",
    orderId: "ORD-VN-4515",
    buyer: "anonymous_buyer",
    product: "Spotify Premium (6 Months)",
    amount: "0.0008 BTC",
    issue: "Late delivery",
    description: "Order was supposed to be delivered within 1 hour but it's been 6 hours with no communication from vendor.",
    status: "Resolved",
    priority: "Low",
    openedDate: "2024-01-12",
    lastActivity: "2024-01-12",
    escrowHeld: false,
    responses: 3
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return "bg-red-100 text-red-800 border-red-200";
    case "In Review":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Resolved":
      return "bg-green-100 text-green-800 border-green-200";
    case "Closed":
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-500";
    case "Medium":
      return "bg-yellow-500";
    case "Low":
      return "bg-green-500";
    default:
      return "bg-gray-8000";
  }
};

export default function VendorDisputes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [responseText, setResponseText] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.issue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalDisputes = disputes.length;
  const openDisputes = disputes.filter(d => d.status === "Open").length;
  const escrowAmount = disputes
    .filter(d => d.escrowHeld)
    .reduce((sum, d) => sum + parseFloat(d.amount.replace(' BTC', '')), 0);

  const handleResponse = (disputeId: string) => {
    // Handle response submission
    console.log(`Responding to dispute ${disputeId}: ${responseText}`);
    setResponseText("");
    setSelectedDispute(null);
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Disputes & Resolution</h1>
            <p className="text-gray-400">Manage customer disputes and resolve issues</p>
          </div>
          <div className="flex items-center space-x-4">
            {openDisputes > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {openDisputes} urgent
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{totalDisputes}</div>
                  <p className="text-sm text-gray-400">Total Disputes</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{openDisputes}</div>
                  <p className="text-sm text-gray-400">Open Cases</p>
                </div>
                <Clock className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {disputes.filter(d => d.status === "Resolved").length}
                  </div>
                  <p className="text-sm text-gray-400">Resolved</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{escrowAmount.toFixed(4)} BTC</div>
                  <p className="text-sm text-gray-400">Escrow Held</p>
                </div>
                <XCircle className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search disputes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Disputes ({filteredDisputes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredDisputes.map((dispute) => (
                <div key={dispute.id} className="border border-gray-700 bg-gray-900 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(dispute.priority)} mb-1`}></div>
                        <span className="text-xs text-gray-400 uppercase">{dispute.priority}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-white">{dispute.id}</h3>
                          <Badge className={`border ${getStatusColor(dispute.status)}`}>
                            {dispute.status}
                          </Badge>
                          {dispute.escrowHeld && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              Escrow Held
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-1">
                          Order: {dispute.orderId} • {dispute.product}
                        </p>
                        <p className="text-sm text-gray-400">
                          Buyer: {dispute.buyer} • Amount: {dispute.amount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-gray-400">
                      <p>Opened: {dispute.openedDate}</p>
                      <p>Last activity: {dispute.lastActivity}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-white mb-2">Issue: {dispute.issue}</h4>
                    <p className="text-gray-700 bg-gray-800 p-3 rounded-lg">{dispute.description}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-400">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {dispute.responses} responses
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Dispute Details - {dispute.id}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-400">Order ID</label>
                                <p className="text-white">{dispute.orderId}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-400">Buyer</label>
                                <p className="text-white">{dispute.buyer}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-400">Product</label>
                                <p className="text-white">{dispute.product}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-400">Amount</label>
                                <p className="text-white">{dispute.amount}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-400">Issue Description</label>
                              <p className="text-white bg-gray-800 p-3 rounded mt-1">{dispute.description}</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {dispute.status === "Open" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Respond
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Respond to Dispute</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-800 p-4 rounded-lg">
                                <h4 className="font-medium text-white mb-2">{dispute.issue}</h4>
                                <p className="text-gray-700">{dispute.description}</p>
                              </div>
                              <Textarea
                                placeholder="Write your response..."
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                className="min-h-32"
                              />
                              <div className="flex items-center space-x-3">
                                <Button variant="outline" size="sm">
                                  <Upload className="w-4 h-4 mr-2" />
                                  Attach Evidence
                                </Button>
                              </div>
                              <div className="flex justify-end space-x-3">
                                <Button variant="outline">Cancel</Button>
                                <Button 
                                  onClick={() => handleResponse(dispute.id)}
                                  className="bg-blue-500 hover:bg-blue-600"
                                >
                                  Send Response
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredDisputes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <CheckCircle className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No disputes found</h3>
                <p className="text-gray-400">Great! No active disputes to resolve.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution Guidelines */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Resolution Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-3">Best Practices</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Respond to disputes within 24 hours</li>
                  <li>• Provide clear evidence and documentation</li>
                  <li>• Maintain professional communication</li>
                  <li>• Offer reasonable solutions when possible</li>
                  <li>• Keep detailed records of all interactions</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-3">Common Resolutions</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Replacement account/product</li>
                  <li>• Partial or full refund</li>
                  <li>• Additional warranty/support</li>
                  <li>• Store credit for future purchases</li>
                  <li>• Technical assistance and guidance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}