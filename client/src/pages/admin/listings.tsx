import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Search, Filter, Check, X, Edit, Trash2, Eye, Star, MapPin, Calendar } from "lucide-react";
import { SAMPLE_LISTINGS } from "@/lib/constants";

export default function AdminListings() {
  const [viewListingModalOpen, setViewListingModalOpen] = useState(false);
  const [editListingModalOpen, setEditListingModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  
  const editForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      vendor: "",
      category: "",
      btcPrice: "",
      xmrPrice: "",
      delivery: "",
      status: "Pending"
    }
  });
  
  const handleViewListing = (listing: any) => {
    setSelectedListing(listing);
    setViewListingModalOpen(true);
  };
  
  const handleEditListing = (listing: any) => {
    setSelectedListing(listing);
    editForm.reset({
      title: listing.title,
      description: listing.description,
      vendor: listing.vendor,
      category: listing.category,
      btcPrice: listing.btcPrice,
      xmrPrice: listing.xmrPrice,
      delivery: listing.delivery,
      status: listing.status
    });
    setEditListingModalOpen(true);
  };
  
  const handleUpdateListing = (data: any) => {
    console.log("Updating listing:", selectedListing?.id, data);
    setEditListingModalOpen(false);
  };
  
  const handleDeleteListing = (listing: any) => {
    setSelectedListing(listing);
    setDeleteConfirmOpen(true);
  };
  
  const confirmDeleteListing = () => {
    console.log("Confirmed deleting listing:", selectedListing?.id);
    setDeleteConfirmOpen(false);
    setSelectedListing(null);
  };
  
  const handleApproveListing = (listingId: number) => {
    console.log("Approving listing:", listingId);
  };
  
  const handleRejectListing = (listingId: number) => {
    console.log("Rejecting listing:", listingId);
  };

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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white" 
                            onClick={() => handleViewListing(listing)}
                            data-testid={`view-listing-${listing.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {listing.status === "Pending" && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-success hover:text-green-400" 
                                onClick={() => handleApproveListing(listing.id)}
                                data-testid={`approve-listing-${listing.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-danger hover:text-red-400" 
                                onClick={() => handleRejectListing(listing.id)}
                                data-testid={`reject-listing-${listing.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-white" 
                            onClick={() => handleEditListing(listing)}
                            data-testid={`edit-listing-${listing.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-danger hover:text-red-400" 
                            onClick={() => handleDeleteListing(listing)}
                            data-testid={`delete-listing-${listing.id}`}
                          >
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
        
        {/* View Listing Modal */}
        <Dialog open={viewListingModalOpen} onOpenChange={setViewListingModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-card border border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-white">Listing Details</DialogTitle>
            </DialogHeader>
            {selectedListing && (
              <div className="space-y-6">
                {/* Listing Header */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-accent text-xl font-medium">{selectedListing.title[0]}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">{selectedListing.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">{selectedListing.rating || 'N/A'}</span>
                        <span className="text-gray-400">({selectedListing.reviews || 0} reviews)</span>
                      </div>
                      <StatusBadge status={selectedListing.status} type={selectedListing.statusType} />
                    </div>
                  </div>
                </div>
                
                {/* Listing Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Vendor</Label>
                    <p className="text-white mt-1">{selectedListing.vendor}</p>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Category</Label>
                    <p className="text-white mt-1">{selectedListing.category}</p>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Created</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-white">{selectedListing.created}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Last Updated</Label>
                    <p className="text-white mt-1">{selectedListing.lastUpdate}</p>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium">Description</Label>
                  <p className="text-gray-300 mt-2 leading-relaxed">{selectedListing.description}</p>
                </div>
                
                {/* Pricing */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium">Pricing</Label>
                  <div className="bg-surface-2 rounded-lg p-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Bitcoin Price</p>
                        <p className="text-white font-mono text-lg">{selectedListing.btcPrice} BTC</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Monero Price</p>
                        <p className="text-white font-mono text-lg">{selectedListing.xmrPrice} XMR</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Delivery */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium">Delivery Method</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <Badge variant="outline" className={`
                      ${selectedListing.deliveryType === 'success' ? 'border-success text-success' : 
                        selectedListing.deliveryType === 'accent' ? 'border-accent text-accent' : 
                        'border-gray-400 text-gray-400'}
                    `}>
                      {selectedListing.delivery}
                    </Badge>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewListingModalOpen(false)}
                    className="border-border text-gray-300 hover:bg-surface-2"
                    data-testid="btn-close-listing-details"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      setViewListingModalOpen(false);
                      handleEditListing(selectedListing);
                    }}
                    className="bg-accent text-bg hover:bg-accent-2"
                    data-testid="btn-edit-from-details"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Listing
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Edit Listing Modal */}
        <Dialog open={editListingModalOpen} onOpenChange={setEditListingModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-card border border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Listing</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateListing)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Product Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter product title" 
                          className="bg-surface-2 border-border text-white"
                          data-testid="edit-input-title"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter product description" 
                          className="bg-surface-2 border-border text-white min-h-[100px]"
                          data-testid="edit-textarea-description"
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Vendor</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Vendor name" 
                            className="bg-surface-2 border-border text-white"
                            data-testid="edit-input-vendor"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="edit-select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Streaming">Streaming</SelectItem>
                            <SelectItem value="Gaming">Gaming</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                            <SelectItem value="Social Media">Social Media</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="btcPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Bitcoin Price</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.0000" 
                            className="bg-surface-2 border-border text-white font-mono"
                            data-testid="edit-input-btc-price"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="xmrPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Monero Price</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0.00" 
                            className="bg-surface-2 border-border text-white font-mono"
                            data-testid="edit-input-xmr-price"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="delivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Delivery Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="edit-select-delivery">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Instant Delivery">Instant Delivery</SelectItem>
                            <SelectItem value="Manual Delivery">Manual Delivery</SelectItem>
                            <SelectItem value="24h Delivery">24h Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-2 border-border text-white" data-testid="edit-select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditListingModalOpen(false)}
                    className="border-border text-gray-300 hover:bg-surface-2"
                    data-testid="btn-cancel-edit-listing"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-accent text-bg hover:bg-accent-2"
                    data-testid="btn-update-listing"
                  >
                    Update Listing
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Listing</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to permanently delete the listing <strong className="text-white">"{selectedListing?.title}"</strong>? 
                This action cannot be undone and will remove the listing from the marketplace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-border text-gray-300 hover:bg-surface-2"
                data-testid="btn-cancel-delete-listing"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteListing}
                className="bg-danger text-white hover:bg-red-600"
                data-testid="btn-confirm-delete-listing"
              >
                Delete Listing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
  );
}