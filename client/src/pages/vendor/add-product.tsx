import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowLeftCircle, ArrowRightCircle, Upload, Plus, X, CheckCircle, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// API Service
const API_BASE_URL = 'http://localhost:8000/api/v1';

interface ProductFormData {
  // Step 1: Basic Listing Info
  listing_title: string;
  category: string;
  sub_category: string;
  description: string;
  
  // Step 2: Account/Product Details
  account_type: string;
  verification_level: string;
  account_age: string;
  access_method: string;
  special_features: string[];
  region_restrictions: string;
  
  // Step 3: Pricing & Availability
  price: string;
  discount_percentage: string;
  quantity_available: string;
  delivery_method: string;
  
  // Step 4: Media & Proof
  main_images: File[];
  gallery_images: File[];
  documents: File[];
  
  // Step 5: Additional Metadata
  tags: string[];
  auto_delivery_script: string;
  notes_for_buyer: string;
}

export default function VendorAddProduct() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ProductFormData>({
    // Step 1: Basic Listing Info
    listing_title: "",
    category: "",
    sub_category: "",
    description: "",
    
    // Step 2: Account/Product Details
    account_type: "",
    verification_level: "",
    account_age: "",
    access_method: "",
    special_features: [],
    region_restrictions: "",
    
    // Step 3: Pricing & Availability
    price: "",
    discount_percentage: "",
    quantity_available: "",
    delivery_method: "",
    
    // Step 4: Media & Proof
    main_images: [],
    gallery_images: [],
    documents: [],
    
    // Step 5: Additional Metadata
    tags: [],
    auto_delivery_script: "",
    notes_for_buyer: ""
  });

  const [newTag, setNewTag] = useState("");

  const accountTypes = ["personal", "business", "premium", "trial", "demo", "vip"];
  const verificationLevels = ["unverified", "email_verified", "kyc_verified", "2fa_enabled", "phone_verified"];
  const accessMethods = ["username_password", "api_keys", "seed_phrase", "software_license", "access_token"];
  const specialFeaturesOptions = [
    "Trading Limits", "Balances Included", "Bonuses", "Referral Rewards", 
    "Bot Attached", "Premium Features", "No Restrictions", "24/7 Support"
  ];
  const deliveryMethods = ["instant_auto", "manual_approval"];

  // Load categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch(`${API_BASE_URL}/products/categories/`);
        if (response.ok) {
          const data = await response.json();
          // Backend returns paginated response, extract results array
          const categoriesData = data.results || data;
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        } else {
          toast({
            title: "Error",
            description: "Failed to load categories",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [toast]);

  const loadSubCategories = async (categoryId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories/${categoryId}/subcategories/`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns paginated response, extract results array
        const subCategoriesData = data.results || data;
        setSubCategories(Array.isArray(subCategoriesData) ? subCategoriesData : []);
      } else {
        setSubCategories([]);
      }
    } catch (error) {
      setSubCategories([]);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleSpecialFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      special_features: prev.special_features.includes(feature)
        ? prev.special_features.filter(f => f !== feature)
        : [...prev.special_features, feature]
    }));
  };

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.listing_title && formData.category && formData.sub_category && formData.description;
      case 2:
        return formData.account_type && formData.verification_level && formData.access_method;
      case 3:
        return formData.price && formData.quantity_available && formData.delivery_method;
      case 4:
        return formData.main_images.length > 0;
      case 5:
        return formData.tags.length > 0;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid()) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login to create products",
          variant: "destructive",
        });
        navigate('/sign-in');
        return;
      }

      // Prepare form data
      const submitData = new FormData();
      
      // Basic info
      submitData.append('listing_title', formData.listing_title);
      submitData.append('category', formData.category);
      submitData.append('sub_category', formData.sub_category);
      submitData.append('description', formData.description);
      
      // Account details
      submitData.append('account_type', formData.account_type);
      submitData.append('verification_level', formData.verification_level);
      if (formData.account_age) submitData.append('account_age', formData.account_age);
      submitData.append('access_method', formData.access_method);
      submitData.append('special_features', JSON.stringify(formData.special_features));
      if (formData.region_restrictions) submitData.append('region_restrictions', formData.region_restrictions);
      
      // Pricing
      submitData.append('price', formData.price);
      if (formData.discount_percentage) submitData.append('discount_percentage', formData.discount_percentage);
      submitData.append('quantity_available', formData.quantity_available);
      submitData.append('delivery_method', formData.delivery_method);
      
      // Media files
      formData.main_images.forEach((file) => {
        submitData.append('main_images', file);
      });
      
      formData.gallery_images.forEach((file) => {
        submitData.append('gallery_images', file);
      });
      
      formData.documents.forEach((file) => {
        submitData.append('documents', file);
      });
      
      // Metadata
      submitData.append('tags', JSON.stringify(formData.tags));
      if (formData.auto_delivery_script) submitData.append('auto_delivery_script', formData.auto_delivery_script);
      if (formData.notes_for_buyer) submitData.append('notes_for_buyer', formData.notes_for_buyer);

      // Submit to API
      const response = await fetch(`${API_BASE_URL}/products/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success!",
          description: "Product created successfully!",
        });
        
        // Redirect to products list
        navigate('/vendor/listings');
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to create product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
            step <= currentStep 
              ? "bg-blue-600 border-blue-600 text-white" 
              : "border-gray-600 text-gray-400"
          }`}>
            {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
          </div>
          {step < 5 && (
            <div className={`w-16 h-1 mx-2 ${
              step < currentStep ? "bg-blue-600" : "bg-gray-600"
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Step 1: Basic Listing Info</CardTitle>
        <p className="text-gray-400">Provide essential information about your listing</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="listingTitle" className="text-gray-300">Listing Title *</Label>
          <Input
            id="listingTitle"
            value={formData.listing_title}
            onChange={(e) => setFormData(prev => ({ ...prev, listing_title: e.target.value }))}
            placeholder="e.g., Binance Pro Account with KYC Verification"
            className="bg-gray-800 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Keep it short and clear</p>
        </div>

        <div>
          <Label htmlFor="category" className="text-gray-300">Category *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, category: value, sub_category: "" }));
              loadSubCategories(value);
            }}
            disabled={isLoadingCategories}
          >
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subCategory" className="text-gray-300">Sub-Category *</Label>
          <Select 
            value={formData.sub_category} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, sub_category: value }))} 
            disabled={!formData.category}
          >
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder={formData.category ? "Select sub-category" : "Select category first"} />
            </SelectTrigger>
            <SelectContent>
              {subCategories.map((subCat) => (
                <SelectItem key={subCat.id} value={subCat.id}>{subCat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description" className="text-gray-300">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="One-liner pitch about your product..."
            maxLength={150}
            className="bg-gray-800 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.description.length}/150 characters</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Step 2: Account / Digital Product Details</CardTitle>
        <p className="text-gray-400">Specify the details of your account or digital product</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="accountType" className="text-gray-300">Account Type *</Label>
          <Select value={formData.account_type} onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map((type) => (
                <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="verificationLevel" className="text-gray-300">Verification Level *</Label>
          <Select value={formData.verification_level} onValueChange={(value) => setFormData(prev => ({ ...prev, verification_level: value }))}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Select verification level" />
            </SelectTrigger>
            <SelectContent>
              {verificationLevels.map((level) => (
                <SelectItem key={level} value={level}>{level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="accountAge" className="text-gray-300">Account Age / Creation Date</Label>
          <Input
            id="accountAge"
            type="date"
            value={formData.account_age}
            onChange={(e) => setFormData(prev => ({ ...prev, account_age: e.target.value }))}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>

        <div>
          <Label htmlFor="accessMethod" className="text-gray-300">Access Method *</Label>
          <Select value={formData.access_method} onValueChange={(value) => setFormData(prev => ({ ...prev, access_method: value }))}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Select access method" />
            </SelectTrigger>
            <SelectContent>
              {accessMethods.map((method) => (
                <SelectItem key={method} value={method}>{method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-300">Special Features</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {specialFeaturesOptions.map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox
                  id={feature}
                  checked={formData.special_features.includes(feature)}
                  onCheckedChange={() => toggleSpecialFeature(feature)}
                />
                <Label htmlFor={feature} className="text-sm text-gray-300">{feature}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="regionRestrictions" className="text-gray-300">Region / Country Restrictions (Optional)</Label>
          <Input
            id="regionRestrictions"
            value={formData.region_restrictions}
            onChange={(e) => setFormData(prev => ({ ...prev, region_restrictions: e.target.value }))}
            placeholder="e.g., US, EU, Worldwide"
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Step 3: Pricing & Availability</CardTitle>
        <p className="text-gray-400">Set your pricing and availability options</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="price" className="text-gray-300">Price *</Label>
          <div className="flex space-x-2">
            <Input
              id="price"
              type="number"
              step="0.00000001"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.001"
              className="bg-gray-800 border-gray-600 text-white"
            />
            <div className="bg-gray-800 border border-gray-600 text-white px-3 py2 rounded-md flex items-center">
              BTC
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="discount" className="text-gray-300">Discount % (Optional)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            max="100"
            value={formData.discount_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
            placeholder="0"
            className="bg-gray-800 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Can be auto-applied by admin panel</p>
        </div>

        <div>
          <Label htmlFor="quantityAvailable" className="text-gray-300">Quantity Available *</Label>
          <Input
            id="quantityAvailable"
            type="number"
            min="1"
            value={formData.quantity_available}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity_available: e.target.value }))}
            placeholder="1"
            className="bg-gray-800 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">For bulk accounts/digital goods</p>
        </div>

        <div>
          <Label className="text-gray-300">Delivery Method *</Label>
          <RadioGroup value={formData.delivery_method} onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_method: value }))}>
            {deliveryMethods.map((method) => (
              <div key={method} className="flex items-center space-x-2">
                <RadioGroupItem value={method} id={method} />
                <Label htmlFor={method} className="text-gray-300">
                  {method === 'instant_auto' ? 'Instant Auto-delivery' : 'Manual after order approval'}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Step 4: Media & Proof</CardTitle>
        <p className="text-gray-400">Upload images and documents to showcase your product</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Product Images */}
        <div>
          <Label className="text-gray-300">Main Product Images *</Label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-500">PNG, JPG up to 10MB each. Blur sensitive information!</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setFormData(prev => ({ ...prev, main_images: [...prev.main_images, ...files] }));
              }}
              className="hidden"
              id="main-images-upload"
            />
            <Button 
              className="mt-2" 
              variant="outline"
              onClick={() => document.getElementById('main-images-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Images
            </Button>
          </div>
          
          {/* Display uploaded images */}
          {formData.main_images.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Uploaded Images ({formData.main_images.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {formData.main_images.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          main_images: prev.main_images.filter((_, i) => i !== index)
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gallery Images */}
        <div>
          <Label className="text-gray-300">Gallery Images (Optional)</Label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 mb-2">Additional images for product gallery</p>
            <p className="text-xs text-gray-500">PNG, JPG up to 10MB each. Showcase different angles/features</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setFormData(prev => ({ ...prev, gallery_images: [...prev.gallery_images, ...files] }));
              }}
              className="hidden"
              id="gallery-images-upload"
            />
            <Button 
              className="mt-2" 
              variant="outline"
              onClick={() => document.getElementById('gallery-images-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Gallery Images
            </Button>
          </div>
          
          {/* Display gallery images */}
          {formData.gallery_images.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Gallery Images ({formData.gallery_images.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {formData.gallery_images.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          gallery_images: prev.gallery_images.filter((_, i) => i !== index)
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents Upload */}
        <div>
          <Label className="text-gray-300">Upload Documents (Optional)</Label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 mb-2">Upload verification proof or additional documents</p>
            <p className="text-xs text-gray-500">PDF, DOC up to 5MB each</p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setFormData(prev => ({ ...prev, documents: [...prev.documents, ...files] }));
              }}
              className="hidden"
              id="documents-upload"
            />
            <Button 
              className="mt-2" 
              variant="outline"
              onClick={() => document.getElementById('documents-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Documents
            </Button>
          </div>
          
          {/* Display uploaded documents */}
          {formData.documents.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Uploaded Documents ({formData.documents.length})</p>
              <div className="space-y-2">
                {formData.documents.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 text-blue-400">📄</div>
                      <span className="text-white text-sm">{file.name}</span>
                      <span className="text-gray-400 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documents: prev.documents.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">Step 5: Additional Metadata</CardTitle>
        <p className="text-gray-400">Add tags, scripts, and notes for buyers</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-300">Tags/Keywords *</Label>
          <div className="flex space-x-2 mb-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g., crypto account, Binance, trading bot"
              className="bg-gray-800 border-gray-600 text-white"
            />
            <Button onClick={addTag} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-gray-700 text-white">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="autoDeliveryScript" className="text-gray-300">Auto-Delivery Script (Optional)</Label>
          <Textarea
            id="autoDeliveryScript"
            value={formData.auto_delivery_script}
            onChange={(e) => setFormData(prev => ({ ...prev, auto_delivery_script: e.target.value }))}
            placeholder="System sends account credentials automatically after payment..."
            className="bg-gray-800 border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">For automated delivery systems</p>
        </div>

        <div>
          <Label htmlFor="notesForBuyer" className="text-gray-300">Notes for Buyer</Label>
          <Textarea
            id="notesForBuyer"
            value={formData.notes_for_buyer}
            onChange={(e) => setFormData(prev => ({ ...prev, notes_for_buyer: e.target.value }))}
            placeholder="e.g., Change password after login, Contact support for issues..."
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/vendor/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Listings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Add New Product</h1>
            <p className="text-gray-400">Create a new product listing with our step-by-step wizard</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Current Step Content */}
      <div className="max-w-4xl mx-auto">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between max-w-4xl mx-auto">
        <Button
          onClick={prevStep}
          disabled={currentStep === 1}
          variant="outline"
          className="flex items-center"
        >
          <ArrowLeftCircle className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex space-x-2">
          {currentStep < 5 ? (
            <Button
              onClick={nextStep}
              disabled={!isStepValid()}
              className="flex items-center"
            >
              Next
              <ArrowRightCircle className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || isSubmitting}
              className="flex items-center bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Product...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Listing
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 