import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Trash2, Eye, Calendar, DollarSign, Package, Star, Eye as EyeIcon, Heart, Tag, Folder, FolderOpen, User, Shield, Clock, Key, Truck, FileText, Download, CheckCircle, XCircle } from "lucide-react";
import vendorService, { VendorProduct } from "@/services/vendorService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/ToastContainer";

export default function VendorProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<VendorProduct | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // For now, we'll fetch from the products list and find the specific one
        // In a real app, you'd have a dedicated endpoint for single product
        const response = await vendorService.getMyProducts();
        
        if (response.results) {
          const foundProduct = response.results.find(p => {
            return p.id == id; // Use loose equality to handle string vs number
          });
          
          if (foundProduct) {
            setProduct(foundProduct);
          } else {
            setError('Product not found');
          }
        } else {
          setError('Failed to fetch product');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch product');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!product) return;
    
    try {
      const response = await vendorService.deleteProduct(product.id);
      if (response.success) {
        showToast({
          type: 'success',
          title: 'Product deleted successfully!',
          message: 'Your product has been deleted.',
        });
        navigate('/vendor/listings');
      } else {
        showToast({
          type: 'error',
          title: 'Failed to delete product',
          message: response.message || 'Failed to delete product',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to delete product',
        message: err.message || 'Failed to delete product',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Eye className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Error loading product</h3>
            <p className="text-gray-400 mb-4">{error || 'Product not found'}</p>
            <Button onClick={() => navigate('/vendor/listings')} className="bg-blue-500 hover:bg-blue-600">
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Additional safety check to ensure product has all required properties
  if (!product || typeof product !== 'object') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Eye className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Invalid product data</h3>
            <p className="text-gray-400 mb-4">The product data is not in the expected format.</p>
            <Button onClick={() => navigate('/vendor/listings')} className="bg-blue-500 hover:bg-blue-600">
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/vendor/listings')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Product Details</h1>
            <p className="text-gray-400">View and manage your product</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => navigate(`/vendor/listings/edit/${product.id}`)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
          
          {/* Delete Product Icon with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete Product</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-300">
                  Are you sure you want to delete your listing "{product.listing_title}"? 
                  This action cannot be undone and will permanently remove your product from the marketplace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Delete Listing
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Image */}
        <div className="lg:col-span-1">
          <Card className="border border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <img
                src={product.main_image || "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400"}
                alt={product.listing_title}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Product Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">{product.listing_title}</h2>
            <div className="flex items-center space-x-4 mb-4">
              <Badge className={`border ${getStatusColor(product.status)}`}>
                {getStatusDisplayName(product.status)}
              </Badge>
              <span className="text-gray-400">ID: {product.id}</span>
            </div>
          </div>

          {/* Product Information */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Product ID:</span>
                  <span className="text-white font-mono">{product.id}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Status:</span>
                  <Badge className={getStatusColor(product.status)}>
                    {getStatusDisplayName(product.status)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Category:</span>
                  <span className="text-white">{product.category_name || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Sub-category:</span>
                  <span className="text-white">{product.sub_category_name || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">
                    {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Stock:</span>
                  <span className="text-white">{product.quantity_available || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Description */}
          {product.description && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-sm leading-relaxed">{product.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Pricing */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Base Price:</span>
                  <span className="text-white">${product.price || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Final Price:</span>
                  <span className="text-green-500 font-bold">${product.final_price || 0}</span>
                </div>
                {(product.discount_percentage || 0) > 0 && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Discount:</span>
                    <span className="text-green-500">-{product.discount_percentage || 0}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Account Type:</span>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {product.account_type || 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Verification:</span>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    {product.verification_level || 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Account Age:</span>
                  <span className="text-white">
                    {product.account_age ? new Date(product.account_age).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Access Method:</span>
                  <span className="text-white">{product.access_method || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Features & Restrictions */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Special Features & Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.special_features && product.special_features.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Special Features:</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.special_features.map((feature: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {product.region_restrictions && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Region Restrictions:</h4>
                  <p className="text-white text-sm">{product.region_restrictions}</p>
                </div>
              )}

              {product.tags && product.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-purple-400 border-purple-400">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Delivery Method:</span>
                  <Badge variant="outline" className="text-orange-400 border-orange-400">
                    {product.delivery_method || 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Delivery Time:</span>
                  <span className="text-white">
                    {product.delivery_method === 'instant_auto' ? 'Instant' : 'Manual Approval'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
                    {/* Performance Metrics */}
            <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{product.views_count || 0}</div>
                  <p className="text-sm text-gray-400">Views</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{product.favorites_count || 0}</div>
                  <p className="text-sm text-gray-400">Favorites</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{product.review_count || 0}</div>
                  <p className="text-sm text-gray-400">Reviews</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {typeof product.rating === 'number' && !isNaN(product.rating) ? product.rating.toFixed(1) : '0.0'}
                  </div>
                  <p className="text-sm text-gray-400">Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes for Buyer */}
          {product.notes_for_buyer && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Notes for Buyer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-sm leading-relaxed">{product.notes_for_buyer}</p>
              </CardContent>
            </Card>
          )}

          {/* Gallery Images */}
          {product.gallery_images && product.gallery_images.length > 0 && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Gallery Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.gallery_images.map((image: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-600 group-hover:border-blue-400 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {product.documents && product.documents.length > 0 && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.documents.map((doc: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">Document {index + 1}</p>
                        <p className="text-gray-400 text-xs">{doc}</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400/10">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Information */}
          {product.status === 'approved' && product.approved_by && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Approval Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Approved By:</span>
                    <span className="text-white">{product.approved_by || 'Admin'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Approved At:</span>
                    <span className="text-white">
                      {product.approved_at ? new Date(product.approved_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                {product.approval_notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Approval Notes:</h4>
                    <p className="text-white text-sm">{product.approval_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rejection Information */}
          {product.status === 'rejected' && product.rejection_reason && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Rejection Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-gray-400">Rejected By:</span>
                    <span className="text-white">{product.rejected_by || 'Admin'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Rejected At:</span>
                    <span className="text-white">
                      {product.rejected_at ? new Date(product.rejected_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Rejection Reason:</h4>
                  <p className="text-white text-sm">{product.rejection_reason}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending_approval":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-700 text-gray-800 border-gray-700 bg-gray-900";
  }
};

const getStatusDisplayName = (status: string) => {
  switch (status) {
    case "approved":
      return "Active";
    case "pending_approval":
      return "Under Review";
    case "rejected":
      return "Rejected";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}; 