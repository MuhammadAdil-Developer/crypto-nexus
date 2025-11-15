import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, Upload, X, Image as ImageIcon, Plus, FileText, Download } from "lucide-react";
import vendorService, { VendorProduct } from "@/services/vendorService";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/ToastContainer";

export default function VendorEditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<VendorProduct | null>(null);
  
  const [formData, setFormData] = useState({
    // Client Required Fields
    headline: '',
    website: '',
    account_type: '',
    access_type: '',
    account_balance: '',
    description: '',
    price: '',
    additional_info: '',
    delivery_time: '',
    credentials: '',
    
    // Optional Fields
    account_age: '',
    access_method: '',
    quantity_available: '',
    main_image: null as File | null,
    gallery_images: [] as File[],
    documents: [] as File[],
    tags: [] as string[],
    
    // Legacy fields for compatibility
    listing_title: '',
    category: '',
    sub_category: '',
    discount_percentage: '',
    delivery_method: '',
    special_features: [] as string[],
    auto_delivery_script: '',
    notes_for_buyer: '',
    
    // Status
    status: 'pending_approval'
  });

  // Image management state
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching product for edit with ID:', id);
        
        // Use dedicated product detail endpoint
        const response = await vendorService.getProductDetail(id);
        
        console.log('🔍 Edit product response:', response);
        
        if (response.success && response.data) {
          const foundProduct = response.data;
          console.log('✅ Setting product for edit:', foundProduct);
          
            setProduct(foundProduct);
            setFormData({
            // Client Required Fields
            headline: foundProduct.headline || '',
            website: foundProduct.website || '',
            account_type: foundProduct.account_type || '',
            access_type: foundProduct.access_type || '',
            account_balance: foundProduct.account_balance?.toString() || '',
              description: foundProduct.description || '',
              price: foundProduct.price?.toString() || '',
            additional_info: foundProduct.additional_info || '',
            delivery_time: foundProduct.delivery_time || '',
            credentials: foundProduct.credentials || '',
            
            // Optional Fields
              account_age: foundProduct.account_age || '',
              access_method: foundProduct.access_method || '',
            quantity_available: foundProduct.quantity_available?.toString() || '',
            main_image: null, // Will be set by handleMainImageChange
            gallery_images: [] as File[], // Will be set by handleGalleryImageChange
            documents: [] as File[], // Assuming documents are not directly managed in this form
            tags: foundProduct.tags || [],
            
            // Legacy fields for compatibility
            listing_title: foundProduct.listing_title || '',
            category: foundProduct.category || '',
            sub_category: foundProduct.sub_category || '',
            discount_percentage: foundProduct.discount_percentage?.toString() || '',
              delivery_method: foundProduct.delivery_method || '',
            special_features: foundProduct.special_features || [],
            auto_delivery_script: foundProduct.auto_delivery_script || '',
              notes_for_buyer: foundProduct.notes_for_buyer || '',
            
            // Status
            status: foundProduct.status || 'pending_approval'
            });
            
            // Set existing images
            if (foundProduct.main_image) {
              console.log('🔍 Setting main image preview:', foundProduct.main_image);
              const mainImgUrl = foundProduct.main_image.startsWith('http') 
                ? foundProduct.main_image 
                : `http://localhost:8000${foundProduct.main_image}`;
              setMainImagePreview(mainImgUrl);
            } else if (foundProduct.main_images && foundProduct.main_images.length > 0) {
              console.log('🔍 Setting main image from main_images array:', foundProduct.main_images[0]);
              const mainImgUrl = foundProduct.main_images[0].startsWith('http')
                ? foundProduct.main_images[0]
                : `http://localhost:8000${foundProduct.main_images[0]}`;
              setMainImagePreview(mainImgUrl);
            }
            if (foundProduct.gallery_images && foundProduct.gallery_images.length > 0) {
              console.log('🔍 Setting gallery image previews:', foundProduct.gallery_images);
              setGalleryImagePreviews(foundProduct.gallery_images.map((img: string) => 
                img.startsWith('http') ? img : `http://localhost:8000${img}`
              ));
            }
          } else {
          console.error('❌ Edit product error:', response);
          setError(response.message || 'Failed to fetch product');
        }
      } catch (err: any) {
        console.error('❌ Error fetching product for edit:', err);
        setError(err.message || 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Image handling functions
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setMainImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newGalleryImages = [...galleryImages, ...files];
    setGalleryImages(newGalleryImages);
    
    // Generate previews for new images
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setGalleryImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMainImage = () => {
    setMainImage(null);
    setMainImagePreview('');
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setGalleryImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'main' | 'gallery') => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (type === 'main' && imageFiles.length > 0) {
      const file = imageFiles[0];
      setMainImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setMainImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (type === 'gallery') {
      const newGalleryImages = [...galleryImages, ...imageFiles];
      setGalleryImages(newGalleryImages);
      
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setGalleryImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await vendorService.updateProductStatus(id, formData.status);
      if (response.success) {
        showToast({
          type: 'success',
          title: 'Product status updated successfully!',
          message: 'Your product status has been updated.',
        });
        navigate(`/vendor/listings/${id}`);
      } else {
        setError(response.message || 'Failed to update product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      console.error('Error updating product:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResubmit = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/products/${id}/resubmit/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Product resubmitted for review',
        });
        navigate('/vendor/listings');
      } else {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to resubmit product',
        });
      }
    } catch (error) {
      console.error('Error resubmitting product:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to resubmit product',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading product...</p>
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
              <ArrowLeft className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Error loading product</h3>
            <p className="text-gray-400 mb-4">{error || 'Product not found'}</p>
            <Button onClick={() => navigate('/vendor/listings')} className="bg-blue-500 hover:bg-blue-600">
              Back to Listings
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
            onClick={() => navigate(`/vendor/listings/${id}`)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Product</h1>
            <p className="text-gray-400">Update your product information</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Details Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline" className="text-gray-300">Headline *</Label>
                <Input
                  id="headline"
                  name="headline"
                  value={formData.headline}
                  onChange={handleInputChange}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="e.g., Premium Zoom Pro Account 2021"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website" className="text-gray-300">Website *</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="e.g., zoom.us"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                  placeholder="Enter detailed product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-gray-300">Price ($) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity_available" className="text-gray-300">Stock Quantity</Label>
                  <Input
                    id="quantity_available"
                    name="quantity_available"
                    type="number"
                    value={formData.quantity_available}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Image Upload */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Main Product Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Image Display */}
              {(mainImagePreview || (product?.main_image && !mainImage) || (product?.main_images && product.main_images.length > 0 && !mainImage)) && (
                <div className="relative">
                  <img
                    src={mainImagePreview || 
                      (product?.main_image 
                        ? (product.main_image.startsWith('http') ? product.main_image : `http://localhost:8000${product.main_image}`)
                        : (product?.main_images && product.main_images.length > 0
                            ? (product.main_images[0].startsWith('http') ? product.main_images[0] : `http://localhost:8000${product.main_images[0]}`)
                            : ''))}
                    alt="Main product image"
                    className="w-full h-48 object-cover rounded-lg border border-gray-600"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400";
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeMainImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'main')}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-300 mb-2">
                  {isDragging ? 'Drop your image here' : 'Drag & drop an image here, or click to select'}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Recommended: 800x600px, Max size: 5MB
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageChange}
                  className="hidden"
                  id="main-image-upload"
                />
                <Label
                  htmlFor="main-image-upload"
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
                >
                  Choose Image
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Images Upload */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Gallery Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Gallery Images */}
              {galleryImagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {galleryImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-600"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'gallery')}
              >
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-300 mb-2">
                  {isDragging ? 'Drop your images here' : 'Drag & drop multiple images here, or click to select'}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  You can add multiple images to showcase your product
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryImageChange}
                  className="hidden"
                  id="gallery-images-upload"
                />
                <Label
                  htmlFor="gallery-images-upload"
                  className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-block"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Images
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_type" className="text-gray-300">Account Type</Label>
                  <Input
                    id="account_type"
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="e.g., social"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_type" className="text-gray-300">Access Type</Label>
                  <Input
                    id="access_type"
                    name="access_type"
                    value={formData.access_type}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="e.g., access"
                  />
                </div>
                </div>
                
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_balance" className="text-gray-300">Account Balance</Label>
                  <Input
                    id="account_balance"
                    name="account_balance"
                    value={formData.account_balance}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter account balance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_method" className="text-gray-300">Access Method</Label>
                  <Input
                    id="access_method"
                    name="access_method"
                    value={formData.access_method}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter access method"
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="account_age" className="text-gray-300">Account Age</Label>
                  <Input
                    id="account_age"
                    name="account_age"
                    value={formData.account_age}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                  placeholder="e.g., N/A"
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Restrictions */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Delivery & Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_method" className="text-gray-300">Delivery Method</Label>
                  <Input
                    id="delivery_method"
                    name="delivery_method"
                    value={formData.delivery_method}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="e.g., instant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_time" className="text-gray-300">Delivery Time</Label>
                  <Input
                    id="delivery_time"
                    name="delivery_time"
                    value={formData.delivery_time}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="e.g., manual_24h"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-gray-300">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setFormData(prev => ({ ...prev, tags: tags }));
                  }}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="e.g., crypto, exchange, verified, premium"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="additional_info" className="text-gray-300">Additional Information</Label>
                <Textarea
                  id="additional_info"
                  name="additional_info"
                  value={formData.additional_info}
                  onChange={handleInputChange}
                  className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                  placeholder="Any extra information about the listing"
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents Display */}
          {product?.documents && product.documents.length > 0 && (
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Existing Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.documents.map((doc: string, index: number) => {
                    const docUrl = doc.startsWith('http') ? doc : `http://localhost:8000${doc}`;
                    const docName = doc.split('/').pop() || `Document ${index + 1}`;
                    return (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">Document {index + 1}</p>
                          <p className="text-gray-400 text-xs truncate">{docName}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-blue-400 border-blue-400 hover:bg-blue-400/10 flex-shrink-0"
                          onClick={() => window.open(docUrl, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes for Buyer */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Notes for Buyer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes_for_buyer" className="text-gray-300">Additional Notes</Label>
                <Textarea
                  id="notes_for_buyer"
                  name="notes_for_buyer"
                  value={formData.notes_for_buyer}
                  onChange={handleInputChange}
                  className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                  placeholder="Enter any special instructions or notes for buyers..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            
            {product?.status === 'rejected' && (
              <Button
                type="button"
                onClick={handleResubmit}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Resubmit for Review
                  </>
                )}
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/vendor/listings/${id}`)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Product Preview */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <img
                src={mainImagePreview || 
                  (product?.main_image 
                    ? (product.main_image.startsWith('http') ? product.main_image : `http://localhost:8000${product.main_image}`)
                    : (product?.main_images && product.main_images.length > 0
                        ? (product.main_images[0].startsWith('http') ? product.main_images[0] : `http://localhost:8000${product.main_images[0]}`)
                        : "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=300"))}
                alt={formData.listing_title || formData.headline}
                className="w-full h-48 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=300";
                }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{formData.listing_title || 'Untitled Product'}</h3>
              <p className="text-gray-400">
                {product?.category_name || 'No Category'} • {product?.sub_category_name || 'No Sub-category'}
              </p>
              <div className="mt-2">
                <span className="text-2xl font-bold text-blue-500">${formData.price || 0}</span>
                <span className="text-sm text-gray-400 ml-2">Stock: {formData.quantity_available || 0}</span>
              </div>
              <div className="mt-2">
                <Badge className={`border ${getStatusColor(formData.status)}`}>
                  {getStatusDisplayName(formData.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
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

