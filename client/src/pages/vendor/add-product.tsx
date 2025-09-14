import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowLeftCircle, ArrowRightCircle, Upload, Plus, X, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";

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

  const [formData, setFormData] = useState({
    // Client Required Fields
    headline: "",
    website: "",
    account_type: "",
    access_type: "",
    account_balance: "",
    description: "",
    price: "",
    additional_info: "",
    delivery_time: "",
    credentials: "",
    
    // Optional Fields
    account_age: "",
    access_method: "",
    quantity_available: "",
    main_image: null as File | null,
    gallery_images: [] as File[],
    documents: [] as File[],
    tags: [] as string[],
    
    // Escrow Settings
    escrow_enabled: false,
    
    // Legacy fields for compatibility
    listing_title: "",
    category: "",
    sub_category: "",
    verification_level: "",
    region_restrictions: "",
    discount_percentage: "",
    delivery_method: "",
    special_features: [] as string[],
    auto_delivery_script: "",
    notes_for_buyer: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Client Required Fields
    if (!formData.headline.trim()) {
      newErrors.headline = 'Headline is required';
    }
    if (!formData.website.trim()) {
      newErrors.website = 'Website is required';
    }
    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required';
    }
    if (!formData.access_type) {
      newErrors.access_type = 'Access type is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.price) {
      newErrors.price = 'Price is required';
    }
    if (!formData.delivery_time) {
      newErrors.delivery_time = 'Delivery time is required';
    }

    // Optional fields - no validation required
    // account_age, access_method, quantity_available, images, documents, tags are optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/products/categories/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Backend returns paginated response, extract results array
          const categoriesData = data.data?.categories || data.results || data;
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
      const token = authService.getToken();
      const response = await fetch(`${API_BASE_URL}/products/categories/${categoryId}/subcategories/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns paginated response, extract results array
        const subCategoriesData = data.data?.subcategories || data.results || data;
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
        // Basic info - match backend model
        return formData.listing_title && formData.category && formData.sub_category && formData.description;
      case 2:
        // Account details - match backend model choices
        return formData.account_type && formData.verification_level && formData.access_method;
      case 3:
        // Pricing & delivery - match backend model
        return formData.price && formData.quantity_available && formData.delivery_method;
      case 4:
        // Media - at least one main image required
        return formData.main_image !== null;
      case 5:
        // Metadata - tags required
        return formData.tags.length > 0;
      default:
        return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
    setIsSubmitting(true);

      // Prepare form data with client required fields
      const submitData = new FormData();
      
      // Client Required Fields
      submitData.append('headline', formData.headline);
      submitData.append('website', formData.website);
      submitData.append('account_type', formData.account_type);
      submitData.append('access_type', formData.access_type);
      submitData.append('account_balance', formData.account_balance);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('additional_info', formData.additional_info);
      submitData.append('delivery_time', formData.delivery_time);
      submitData.append('credentials', formData.credentials);
      
      // Optional Fields
      if (formData.account_age) submitData.append('account_age', formData.account_age);
      if (formData.access_method) submitData.append('access_method', formData.access_method);
      if (formData.quantity_available) submitData.append('quantity_available', formData.quantity_available);
      
      // Escrow Settings
      submitData.append('escrow_enabled', formData.escrow_enabled.toString());
      
      // Media files
      if (formData.main_image) {
        submitData.append('main_image', formData.main_image);
      }
      
      formData.gallery_images.forEach((file) => {
        submitData.append('gallery_images', file);
      });
      
      formData.documents.forEach((file) => {
        submitData.append('documents', file);
      });
      
      // JSON fields - send as JSON strings
      if (formData.tags.length > 0) {
      submitData.append('tags', JSON.stringify(formData.tags));
      } else {
        submitData.append('tags', JSON.stringify([]));
      }
      
      // Set empty arrays for other JSON fields
      submitData.append('gallery_images', JSON.stringify([]));
      submitData.append('main_images', JSON.stringify([]));
      submitData.append('documents', JSON.stringify([]));
      
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

      // Submit to API
      const response = await fetch('http://localhost:8000/api/v1/products/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData
      });

        const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success!",
          description: "Product created successfully!",
        });
        navigate('/vendor/listings');
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create product",
          variant: "destructive",
        });
        
        // Set backend validation errors
        if (result.errors) {
          setErrors(result.errors);
        }
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
              <CardDescription className="text-gray-400">
                Enter the basic details of your account listing
              </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                  <Label htmlFor="headline" className="text-white">Headline *</Label>
          <Input
                    id="headline"
                    placeholder="e.g., Zoom Account, PIC"
                    value={formData.headline}
                    onChange={(e) => setFormData({...formData, headline: e.target.value})}
                    className={errors.headline ? 'border-red-500' : ''}
                  />
                  {errors.headline && <p className="text-red-500 text-sm mt-1">{errors.headline}</p>}
        </div>

        <div>
                  <Label htmlFor="website" className="text-white">Website *</Label>
                  <Input
                    id="website"
                    placeholder="e.g., Zoom.com"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className={errors.website ? 'border-red-500' : ''}
                  />
                  {errors.website && <p className="text-red-500 text-sm mt-1">{errors.website}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_type" className="text-white">Account Type *</Label>
          <Select 
                    value={formData.account_type} 
                    onValueChange={(value) => setFormData({...formData, account_type: value})}
                  >
                    <SelectTrigger className={errors.account_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
                      <SelectItem value="messengers">Messengers</SelectItem>
                      <SelectItem value="streaming">Streaming</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="trading">Trading/Exchange</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
                  {errors.account_type && <p className="text-red-500 text-sm mt-1">{errors.account_type}</p>}
        </div>

        <div>
                  <Label htmlFor="access_type" className="text-white">Access Type *</Label>
          <Select 
                    value={formData.access_type} 
                    onValueChange={(value) => setFormData({...formData, access_type: value})}
          >
                    <SelectTrigger className={errors.access_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select access type" />
            </SelectTrigger>
            <SelectContent>
                      <SelectItem value="full_ownership">Full Ownership</SelectItem>
                      <SelectItem value="access">Access</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
                  {errors.access_type && <p className="text-red-500 text-sm mt-1">{errors.access_type}</p>}
                </div>
        </div>

        <div>
                <Label htmlFor="account_balance" className="text-white">Account Balance</Label>
                <Input
                  id="account_balance"
                  placeholder="e.g., $15 welcome credit"
                  value={formData.account_balance}
                  onChange={(e) => setFormData({...formData, account_balance: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description *</Label>
          <Textarea
            id="description"
                  placeholder="e.g., Aged Zoom Account from 2021 USA IP Female blabla..."
            value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={errors.description ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>
      </CardContent>
    </Card>
  );

      case 2:
        return (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
              <CardTitle className="text-white">Pricing & Delivery</CardTitle>
              <CardDescription className="text-gray-400">
                Set your price and delivery options
              </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                  <Label htmlFor="price" className="text-white">Price *</Label>
          <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 7.00"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
        </div>

        <div>
                  <Label htmlFor="delivery_time" className="text-white">Delivery Time *</Label>
                  <Select 
                    value={formData.delivery_time} 
                    onValueChange={(value) => setFormData({...formData, delivery_time: value})}
                  >
                    <SelectTrigger className={errors.delivery_time ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select delivery time" />
            </SelectTrigger>
            <SelectContent>
                      <SelectItem value="instant_auto">Instant Auto-delivery</SelectItem>
                      <SelectItem value="manual_24h">Manual delivery within 24hrs</SelectItem>
            </SelectContent>
          </Select>
                  {errors.delivery_time && <p className="text-red-500 text-sm mt-1">{errors.delivery_time}</p>}
                </div>
        </div>

        <div>
                <Label htmlFor="additional_info" className="text-white">Additional Info</Label>
                <Textarea
                  id="additional_info"
                  placeholder="e.g., Account is Shadowflagged by this and that"
                  value={formData.additional_info}
                  onChange={(e) => setFormData({...formData, additional_info: e.target.value})}
                  rows={3}
                />
        </div>

        <div>
                <Label htmlFor="credentials" className="text-white">Credentials</Label>
                <Textarea
                  id="credentials"
                  placeholder="e.g., testemail@test.com:testuser66:testpassword"
                  value={formData.credentials}
                  onChange={(e) => setFormData({...formData, credentials: e.target.value})}
                  rows={3}
                />
                <p className="text-gray-400 text-sm mt-1">
                  Credentials will be hidden until payment is confirmed
                </p>
        </div>
      </CardContent>
    </Card>
  );

      case 3:
        return (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
              <CardTitle className="text-white">Optional Details</CardTitle>
              <CardDescription className="text-gray-400">
                Additional information (optional)
              </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                  <Label htmlFor="account_age" className="text-white">Account Age / Creation Date</Label>
            <Input
                    id="account_age"
                    placeholder="e.g., 2021, 2 years old"
                    value={formData.account_age}
                    onChange={(e) => setFormData({...formData, account_age: e.target.value})}
                  />
        </div>

        <div>
                  <Label htmlFor="access_method" className="text-white">Access Method</Label>
          <Input
                    id="access_method"
                    placeholder="e.g., Email/Password, 2FA"
                    value={formData.access_method}
                    onChange={(e) => setFormData({...formData, access_method: e.target.value})}
                  />
                </div>
        </div>

        <div>
                <Label htmlFor="quantity_available" className="text-white">Quantity Available</Label>
          <Input
                  id="quantity_available"
            type="number"
                  placeholder="e.g., 1, 5, 10"
            value={formData.quantity_available}
                  onChange={(e) => setFormData({...formData, quantity_available: e.target.value})}
                />
        </div>
      </CardContent>
    </Card>
  );

      case 4:
        return (
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
              <CardTitle className="text-white">Media & Documents</CardTitle>
              <CardDescription className="text-gray-400">
                Upload images and documents (optional)
              </CardDescription>
      </CardHeader>
            <CardContent className="space-y-4">
        <div>
                <Label htmlFor="main_image" className="text-white">Account Image</Label>
                <Input
                  id="main_image"
              type="file"
              accept="image/*"
                  onChange={(e) => setFormData({...formData, main_image: e.target.files?.[0] || null})}
                />
              </div>

              <div>
                <Label htmlFor="gallery_images" className="text-white">Gallery Images</Label>
                <Input
                  id="gallery_images"
                  type="file"
                  accept="image/*"
                  multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                    setFormData({...formData, gallery_images: files});
                  }}
                />
          </div>
          
        <div>
                <Label htmlFor="documents" className="text-white">Documents</Label>
                <Input
                  id="documents"
              type="file"
                  accept=".pdf,.doc,.docx"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                    setFormData({...formData, documents: files});
                  }}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white">Tags & Keywords</CardTitle>
              <CardDescription className="text-gray-400">
                Add tags to help buyers find your product (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newTag" className="text-white">Tags/Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    id="newTag"
                    placeholder="e.g., zoom, account, verified"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim()) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, newTag.trim()]
                          });
                          setNewTag('');
                        }
                      }
                    }}
            />
            <Button 
                    type="button"
                    onClick={() => {
                      if (newTag.trim()) {
                        setFormData({
                          ...formData,
                          tags: [...formData.tags, newTag.trim()]
                        });
                        setNewTag('');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add
            </Button>
                </div>
          </div>
          
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                      {tag}
                    <button
                      onClick={() => {
                          setFormData({
                            ...formData,
                            tags: formData.tags.filter((_, i) => i !== index)
                          });
                        }}
                        className="ml-2 text-gray-400 hover:text-white"
                      >
                        ×
                    </button>
                    </Badge>
                ))}
            </div>
          )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link to="/vendor/listings">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Listings
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/vendor/listings/bulk-upload">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Add New Product</h1>
            <p className="text-gray-400">Create a new account listing for the marketplace</p>
          </div>
        </div>

        {/* Single Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Basic Information Card */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
              <CardDescription className="text-gray-400">
                Essential details about your account listing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                  <Label htmlFor="headline" className="text-white">Headline *</Label>
                  <Input
                    id="headline"
                    placeholder="e.g., Zoom Account, PIC"
                    value={formData.headline}
                    onChange={(e) => setFormData({...formData, headline: e.target.value})}
                    className={errors.headline ? 'border-red-500' : ''}
                  />
                  {errors.headline && <p className="text-red-500 text-sm mt-1">{errors.headline}</p>}
          </div>
          
                <div>
                  <Label htmlFor="website" className="text-white">Website *</Label>
                  <Input
                    id="website"
                    placeholder="e.g., Zoom.com"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className={errors.website ? 'border-red-500' : ''}
                  />
                  {errors.website && <p className="text-red-500 text-sm mt-1">{errors.website}</p>}
                    </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_type" className="text-white">Account Type *</Label>
                  <Select 
                    value={formData.account_type} 
                    onValueChange={(value) => setFormData({...formData, account_type: value})}
                  >
                    <SelectTrigger className={errors.account_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="messengers">Messengers</SelectItem>
                      <SelectItem value="streaming">Streaming</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="trading">Trading/Exchange</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.account_type && <p className="text-red-500 text-sm mt-1">{errors.account_type}</p>}
                  </div>

                <div>
                  <Label htmlFor="access_type" className="text-white">Access Type *</Label>
                  <Select 
                    value={formData.access_type} 
                    onValueChange={(value) => setFormData({...formData, access_type: value})}
                  >
                    <SelectTrigger className={errors.access_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select access type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_ownership">Full Ownership</SelectItem>
                      <SelectItem value="access">Access</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.access_type && <p className="text-red-500 text-sm mt-1">{errors.access_type}</p>}
              </div>
            </div>

              <div>
                <Label htmlFor="account_balance" className="text-white">Account Balance</Label>
                <Input
                  id="account_balance"
                  placeholder="e.g., $15 welcome credit"
                  value={formData.account_balance}
                  onChange={(e) => setFormData({...formData, account_balance: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Aged Zoom Account from 2021 USA IP Female blabla..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className={errors.description ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>
      </CardContent>
    </Card>

          {/* Pricing & Delivery Card */}
    <Card className="border border-gray-700 bg-gray-900">
      <CardHeader>
              <CardTitle className="text-white">Pricing & Delivery</CardTitle>
              <CardDescription className="text-gray-400">
                Set your price and delivery options
              </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                  <Label htmlFor="price" className="text-white">Price *</Label>
            <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 7.00"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>

                <div>
                  <Label htmlFor="delivery_time" className="text-white">Delivery Time *</Label>
                  <Select 
                    value={formData.delivery_time} 
                    onValueChange={(value) => setFormData({...formData, delivery_time: value})}
                  >
                    <SelectTrigger className={errors.delivery_time ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select delivery time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant_auto">Instant Auto-delivery</SelectItem>
                      <SelectItem value="manual_24h">Manual delivery within 24hrs</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.delivery_time && <p className="text-red-500 text-sm mt-1">{errors.delivery_time}</p>}
          </div>
        </div>

        <div>
                <Label htmlFor="additional_info" className="text-white">Additional Info</Label>
          <Textarea
                  id="additional_info"
                  placeholder="e.g., Account is Shadowflagged by this and that"
                  value={formData.additional_info}
                  onChange={(e) => setFormData({...formData, additional_info: e.target.value})}
                  rows={3}
                />
        </div>

        <div>
                <Label htmlFor="credentials" className="text-white">Credentials</Label>
          <Textarea
                  id="credentials"
                  placeholder="e.g., testemail@test.com:testuser66:testpassword"
                  value={formData.credentials}
                  onChange={(e) => setFormData({...formData, credentials: e.target.value})}
                  rows={3}
                />
                <p className="text-gray-400 text-sm mt-1">
                  Credentials will be hidden until payment is confirmed
                </p>
        </div>

        {/* Escrow Settings */}
        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div>
            <h4 className="font-medium text-white">Enable Escrow Protection</h4>
            <p className="text-sm text-gray-400">
              Payment will be held until buyer approves the order. Disabled by default.
            </p>
          </div>
          <Switch
            checked={formData.escrow_enabled}
            onCheckedChange={(checked) => setFormData({...formData, escrow_enabled: checked})}
          />
        </div>
      </CardContent>
    </Card>

          {/* Optional Details Card */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white">Optional Details</CardTitle>
              <CardDescription className="text-gray-400">
                Additional information to enhance your listing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="account_age" className="text-white">Account Age</Label>
                  <Input
                    id="account_age"
                    placeholder="e.g., 2021, 2 years old"
                    value={formData.account_age}
                    onChange={(e) => setFormData({...formData, account_age: e.target.value})}
                  />
                </div>

          <div>
                  <Label htmlFor="access_method" className="text-white">Access Method</Label>
                  <Input
                    id="access_method"
                    placeholder="e.g., Email/Password, 2FA"
                    value={formData.access_method}
                    onChange={(e) => setFormData({...formData, access_method: e.target.value})}
                  />
          </div>

                <div>
                  <Label htmlFor="quantity_available" className="text-white">Quantity Available</Label>
                  <Input
                    id="quantity_available"
                    type="number"
                    placeholder="e.g., 1, 5, 10"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({...formData, quantity_available: e.target.value})}
                  />
        </div>
      </div>
            </CardContent>
          </Card>

          {/* Media & Documents Card */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white">Media & Documents</CardTitle>
              <CardDescription className="text-gray-400">
                Upload images and documents to showcase your product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="main_image" className="text-white">Account Image</Label>
                  <Input
                    id="main_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, main_image: e.target.files?.[0] || null})}
                  />
                </div>

                <div>
                  <Label htmlFor="gallery_images" className="text-white">Gallery Images</Label>
                  <Input
                    id="gallery_images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFormData({...formData, gallery_images: files});
                    }}
                  />
                </div>
      </div>

              <div>
                <Label htmlFor="documents" className="text-white">Documents</Label>
                <Input
                  id="documents"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFormData({...formData, documents: files});
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white">Tags & Keywords</CardTitle>
              <CardDescription className="text-gray-400">
                Add tags to help buyers find your product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newTag" className="text-white">Tags/Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    id="newTag"
                    placeholder="e.g., zoom, account, verified"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim()) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, newTag.trim()]
                          });
                          setNewTag('');
                        }
                      }
                    }}
                  />
        <Button
                    type="button"
                    onClick={() => {
                      if (newTag.trim()) {
                        setFormData({
                          ...formData,
                          tags: [...formData.tags, newTag.trim()]
                        });
                        setNewTag('');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add
        </Button>
                </div>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                      {tag}
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            tags: formData.tags.filter((_, i) => i !== index)
                          });
                        }}
                        className="ml-2 text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/vendor/listings')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Product...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Product
                </>
              )}
            </Button>
        </div>
        </form>
      </div>
    </div>
  );
} 