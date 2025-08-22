import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Check, X, Edit, Trash2, Eye } from "lucide-react";
import { SAMPLE_LISTINGS } from "@/lib/constants";

export default function AdminListings() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Listings" }
  ];

  const extendedListings = [
    ...SAMPLE_LISTINGS.map(listing => ({
      ...listing,
      status: "Approved" as const,
      statusType: "success" as const,
      category: "Streaming",
      created: "2 days ago",
      lastUpdate: "1 hour ago"
    })),
    {
      id: 4,
      title: "Steam Account with 100+ Games",
      description: "Premium Steam account with extensive game library including AAA titles.",
      vendor: "GamingAccounts",
      rating: 4.6,
      reviews: 78,
      btcPrice: "0.0025",
      xmrPrice: "1.84",
      delivery: "Manual Delivery",
      deliveryType: "accent" as const,
      status: "Pending" as const,
      statusType: "warning" as const,
      category: "Gaming",
      created: "1 day ago",
      lastUpdate: "6 hours ago"
    },
    {
      id: 5,
      title: "Office 365 Business License",
      description: "Complete Office 365 business suite with all applications included.",
      vendor: "BusinessSoft",
      rating: 0,
      reviews: 0,
      btcPrice: "0.0045",
      xmrPrice: "3.21",
      delivery: "Instant Delivery",
      deliveryType: "success" as const,
      status: "Rejected" as const,
      statusType: "danger" as const,
      category: "Software",
      created: "3 days ago",
      lastUpdate: "2 days ago"
    }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Listing Management</h1>
            <p className="text-gray-300 mt-1">Review and manage product listings from vendors</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              Bulk Actions
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              Export Data
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Check className="w-6 h-6 text-success" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-white">1,432</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <div className="w-6 h-6 bg-warning rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Pending Review</p>
                  <p className="text-2xl font-bold text-white">47</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-danger/20 rounded-lg">
                  <X className="w-6 h-6 text-danger" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Rejected</p>
                  <p className="text-2xl font-bold text-white">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Edit className="w-6 h-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Draft</p>
                  <p className="text-2xl font-bold text-white">12</p>
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
                    placeholder="Search listings by title, vendor, or category..." 
                    className="pl-10 bg-surface-2 border-border text-white"
                    data-testid="search-listings"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-40 bg-surface-2 border-border text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-border hover:bg-surface-2">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Listings Table */}
        <Card className="crypto-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Product Listings</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox id="selectAll" className="border-border" />
                <label htmlFor="selectAll" className="text-sm text-gray-300">Select All</label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300 w-8"></th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Price</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Created</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extendedListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-surface-2/50" data-testid={`listing-row-${listing.id}`}>
                      <td className="p-4">
                        <Checkbox className="border-border" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-start">
                          <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-accent text-sm font-medium">{listing.title[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{listing.title}</p>
                            <p className="text-sm text-gray-400 line-clamp-2">{listing.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{listing.vendor}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-gray-300">
                          {listing.category}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-white font-mono text-sm">{listing.btcPrice} BTC</div>
                          <div className="text-gray-400 font-mono text-xs">{listing.xmrPrice} XMR</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={listing.status} type={listing.statusType} />
                      </td>
                      <td className="p-4 text-gray-300">{listing.created}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`view-listing-${listing.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {listing.status === "Pending" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-success hover:text-green-400" data-testid={`approve-listing-${listing.id}`}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`reject-listing-${listing.id}`}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid={`edit-listing-${listing.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-danger hover:text-red-400" data-testid={`delete-listing-${listing.id}`}>
                            <Trash2 className="w-4 h-4" />
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
      </main>
    </AdminLayout>
  );
}