import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Eye, MessageSquare, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { SAMPLE_DISPUTES } from "@/lib/constants";

export default function AdminDisputes() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Disputes" }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dispute Management</h1>
            <p className="text-gray-300 mt-1">Resolve conflicts between buyers and vendors</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Export Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-danger mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Open Disputes</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">In Review</p>
                  <p className="text-2xl font-bold text-white">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Resolved Today</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-accent font-bold">%</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Resolution Rate</p>
                  <p className="text-2xl font-bold text-white">94.2%</p>
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
                    placeholder="Search by order ID, buyer, or vendor..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-disputes"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        <div className="space-y-6">
          {SAMPLE_DISPUTES.map((dispute) => (
            <Card key={dispute.id} className="crypto-card" data-testid={`dispute-${dispute.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-danger" />
                        <span className="font-mono text-accent">#{dispute.orderId}</span>
                      </div>
                      <StatusBadge status={dispute.status} type={dispute.statusType} />
                      <Badge 
                        variant={
                          dispute.priority === "High" ? "destructive" :
                          dispute.priority === "Medium" ? "secondary" :
                          "outline"
                        }
                        className="text-xs"
                      >
                        {dispute.priority} Priority
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-2">{dispute.reason}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Buyer</p>
                        <p className="text-white">{dispute.buyer}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Vendor</p>
                        <p className="text-white">{dispute.vendor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Amount</p>
                        <p className="text-white font-mono">{dispute.amount}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Created {dispute.created}</span>
                      <span>•</span>
                      <span>Order #{dispute.orderId}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-6">
                    <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`view-dispute-${dispute.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`messages-dispute-${dispute.id}`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Messages
                    </Button>
                    {dispute.status === "Open" && (
                      <Button className="bg-accent text-bg hover:bg-accent-2" data-testid={`assign-dispute-${dispute.id}`}>
                        Assign to Me
                      </Button>
                    )}
                  </div>
                </div>
                
                {dispute.status === "In Review" && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-white font-medium mb-4">Resolution Decision</h4>
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="Add resolution notes..."
                        className="bg-surface-2 border-border text-white"
                        data-testid={`resolution-notes-${dispute.id}`}
                      />
                      <div className="flex space-x-3">
                        <Button className="bg-success text-white hover:bg-green-600" data-testid={`resolve-buyer-${dispute.id}`}>
                          Resolve for Buyer
                        </Button>
                        <Button className="bg-warning text-white hover:bg-yellow-600" data-testid={`resolve-vendor-${dispute.id}`}>
                          Resolve for Vendor
                        </Button>
                        <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`request-info-${dispute.id}`}>
                          Request More Info
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </AdminLayout>
  );
}