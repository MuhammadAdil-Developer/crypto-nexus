import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, Store, DollarSign, ShoppingCart, Check, X, Clock } from "lucide-react";
import { SAMPLE_VENDORS } from "@/lib/constants";

export default function AdminVendors() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Vendors" }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Vendor Management</h1>
            <p className="text-gray-300 mt-1">Manage vendor applications and shop settings</p>
          </div>
          <Button className="bg-accent text-bg hover:bg-accent-2">
            Invite Vendor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Store className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Total Vendors</p>
                  <p className="text-2xl font-bold text-white">127</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-warning mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Pending Applications</p>
                  <p className="text-2xl font-bold text-white">7</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShoppingCart className="w-8 h-8 text-success mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Listings</p>
                  <p className="text-2xl font-bold text-white">1,432</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Commission Earned</p>
                  <p className="text-2xl font-bold text-white">23.4 BTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approved" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="approved" className="text-gray-300 data-[state=active]:text-white">
              Approved Vendors
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-gray-300 data-[state=active]:text-white">
              Pending Applications
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-gray-300 data-[state=active]:text-white">
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved">
            {/* Search and Filters */}
            <Card className="crypto-card mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        placeholder="Search vendors by shop name..." 
                        className="pl-10 bg-surface-2 border-border text-white"
                        data-testid="search-vendors"
                      />
                    </div>
                  </div>
                  <Select>
                    <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="streaming">Streaming Services</SelectItem>
                      <SelectItem value="software">Software & Tools</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Vendors Table */}
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Approved Vendors</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Shop Name</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Owner</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Listings</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Sales</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Rating</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Commission</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SAMPLE_VENDORS.filter(v => v.status === "Approved").map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-surface-2/50" data-testid={`vendor-row-${vendor.id}`}>
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center mr-3">
                                <Store className="w-5 h-5 text-accent" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{vendor.shopName}</p>
                                <p className="text-sm text-gray-400">Since {vendor.joinDate}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-300">{vendor.owner}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-gray-300">
                              {vendor.category}
                            </Badge>
                          </td>
                          <td className="p-4 text-white font-mono">{vendor.listings}</td>
                          <td className="p-4 text-white font-mono">{vendor.totalSales}</td>
                          <td className="p-4">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-warning fill-current mr-1" />
                              <span className="text-white">{vendor.rating}</span>
                              <span className="text-gray-400 ml-1">({vendor.reviews})</span>
                            </div>
                          </td>
                          <td className="p-4 text-white">{vendor.commission}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" className="border-border hover:bg-surface-2 text-gray-300" data-testid={`view-vendor-${vendor.id}`}>
                                View Shop
                              </Button>
                              <Button variant="outline" size="sm" className="border-border hover:bg-surface-2 text-gray-300" data-testid={`edit-vendor-${vendor.id}`}>
                                Settings
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

          <TabsContent value="pending">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="text-white">Pending Vendor Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {SAMPLE_VENDORS.filter(v => v.status === "Pending").map((vendor) => (
                    <div key={vendor.id} className="border border-border rounded-lg p-6" data-testid={`pending-vendor-${vendor.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-4">
                            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mr-4">
                              <Store className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{vendor.shopName}</h3>
                              <p className="text-gray-300">Owner: {vendor.owner}</p>
                              <p className="text-sm text-gray-400">Applied {vendor.joinDate}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Category</p>
                              <p className="text-white">{vendor.category}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Commission Rate</p>
                              <p className="text-white">{vendor.commission}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm text-gray-400 mb-2">Business Description</p>
                            <p className="text-gray-300">We provide premium digital accounts with instant delivery and 24/7 support. All accounts are sourced legally and come with warranty protection.</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-6">
                          <Button className="bg-success text-white hover:bg-green-600" data-testid={`approve-vendor-${vendor.id}`}>
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button variant="outline" className="border-danger text-danger hover:bg-danger hover:text-white" data-testid={`reject-vendor-${vendor.id}`}>
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid={`review-vendor-${vendor.id}`}>
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {SAMPLE_VENDORS.filter(v => v.status === "Pending").length === 0 && (
                    <div className="text-center py-12">
                      <Store className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No pending applications</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card className="crypto-card">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <X className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No rejected applications</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AdminLayout>
  );
}