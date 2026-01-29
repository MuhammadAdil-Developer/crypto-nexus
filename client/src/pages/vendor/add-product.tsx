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
import { ArrowLeft, ArrowLeftCircle, ArrowRightCircle, Upload, Plus, X, CheckCircle, Loader2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";
import vendorService from "@/services/vendorService";

// API Service
import { API_BASE_URL, getApiUrl } from '@/config/api';
import { productService } from "@/services/productService";
import { useCryptoPrices } from "@/contexts/PriceContext";

interface ProductFormData {
  // Step 1: Basic Listing Info
  listing_title: string;
  category: string;
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
  accepted_crypto: string[];
}

export default function VendorAddProduct() {
  const navigate = useNavigate();
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const { toast } = useToast();

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
    accepted_crypto: ['BTC', 'XMR'],

    // Escrow Settings
    escrow_enabled: false,

    // Legacy fields for compatibility
    listing_title: "",
    category: "",
    verification_level: "",
    region_restrictions: "",
    discount_percentage: "",
    delivery_method: "",
    special_features: [] as string[],
    auto_delivery_script: "",
    notes_for_buyer: "",
    is_giveaway: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVendorBlocked, setIsVendorBlocked] = useState(false);
  const [btcAddressSet, setBtcAddressSet] = useState(false);
  const [xmrAddressSet, setXmrAddressSet] = useState(false);
  const [localBtcPrice, setLocalBtcPrice] = useState("");

  // Check if vendor is blocked from non-escrow listings
  useEffect(() => {
    const checkVendorStatus = async () => {
      try {
        const token = authService.getToken();
        if (!token) return;

        const user = authService.getCurrentUser();
        if (!user || user.user_type !== 'vendor') return;

        // Fetch user profile to check status and payout addresses
        const response = await fetch(`${API_BASE_URL}/profile/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Check if blocked from non-escrow
            if (data.data.non_escrow_blocked) {
              setIsVendorBlocked(true);
              setFormData(prev => ({ ...prev, escrow_enabled: true }));
            }

            // Set address status from profile payout addresses
            setBtcAddressSet(!!data.data.btc_payout_address);
            setXmrAddressSet(!!data.data.xmr_payout_address);
          }
        }
      } catch (error) {
        console.error('Error checking vendor status:', error);
      }
    };

    checkVendorStatus();
  }, []);

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
    if (!formData.category) {
      newErrors.category = 'Category is required';
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
    if (formData.account_balance && !/^\d+(\.\d+)?$/.test(formData.account_balance)) {
      newErrors.account_balance = 'Balance must be a valid number (e.g., 50 or 50.00)';
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
        const response = await productService.getCategories();
        if (response.success && response.data) {
          setCategories(Array.isArray(response.data) ? response.data : []);
        } else {
          toast({
            title: "Error",
            description: "Failed to load categories",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
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



  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check for Preview Mode (Sticky Logic)
    const isPreviewMode = (new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('preview') === 'true') ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('vendorPreviewMode') === 'true');
    if (isPreviewMode) {
      toast({
        title: "Preview Mode",
        description: "You cannot create active listings while in preview mode.",
        variant: "destructive"
      });
      return;
    }

    // Check if vendor has required wallet addresses for the selected crypto
    const acceptsBTC = formData.accepted_crypto.includes('BTC');
    const acceptsXMR = formData.accepted_crypto.includes('XMR');
    const missingBTC = acceptsBTC && !btcAddressSet;
    const missingXMR = acceptsXMR && !xmrAddressSet;

    if (missingBTC || missingXMR) {
      const missingTypes = [];
      if (missingBTC) missingTypes.push("Bitcoin (BTC)");
      if (missingXMR) missingTypes.push("Monero (XMR)");

      toast({
        title: "Payout Address Required",
        description: `You are accepting ${missingTypes.join(' and ')} for this listing, but you haven't configured the payout address in your Settings.`,
        variant: "destructive",
      });
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
      submitData.append('additional_info', formData.additional_info);
      submitData.append('delivery_time', formData.delivery_time);
      submitData.append('credentials', formData.credentials);

      if (formData.category) submitData.append('category', formData.category);
      if (formData.sub_category) submitData.append('sub_category', formData.sub_category);

      // Optional Fields
      if (formData.account_age) submitData.append('account_age', formData.account_age);
      if (formData.access_method) submitData.append('access_method', formData.access_method);
      if (formData.quantity_available) submitData.append('quantity_available', formData.quantity_available);

      // Escrow Settings
      submitData.append('escrow_enabled', (formData.is_giveaway ? false : formData.escrow_enabled).toString());
      submitData.append('is_giveaway', formData.is_giveaway.toString());
      submitData.append('accepted_crypto', JSON.stringify(formData.accepted_crypto));

      // Force price to 0 if Giveaway
      const finalPrice = formData.is_giveaway ? "0" : formData.price;
      submitData.append('price', finalPrice);

      // Media files
      if (formData.main_image) {
        submitData.append('main_image', formData.main_image);
      }

      // Handle gallery images - only append if files exist
      if (formData.gallery_images.length > 0) {
        formData.gallery_images.forEach((file) => {
          submitData.append('gallery_images', file);
        });
      }

      // Handle documents - only append if files exist
      if (formData.documents.length > 0) {
        formData.documents.forEach((file) => {
          submitData.append('documents', file);
        });
      }

      // JSON fields - send as JSON strings
      if (formData.tags.length > 0) {
        submitData.append('tags', JSON.stringify(formData.tags));
      } else {
        submitData.append('tags', JSON.stringify([]));
      }

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
      const response = await fetch(getApiUrl('/products/create/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData
      });

      let result: any = { success: false };
      let parseError = false;
      let textResponse = "";

      try {
        textResponse = await response.text();
        try {
          result = JSON.parse(textResponse);
        } catch (e) {
          console.error('Error parsing response JSON:', e);
          parseError = true;
          // Result stays {success: false}
        }
      } catch (e) {
        console.error('Error reading response text:', e);
        parseError = true;
      }

      // If status is 201 (Created), it's a success regardless of the response body
      if (response.status === 201 || (response.ok && result.success)) {
        toast({
          title: "Success!",
          description: "Product created successfully!",
        });
        // Success: Redirect to listings
        navigate('/vendor/listings');
      } else {
        // Build a readable error message
        let errorMsg = "Failed to create product";
        if (result.message) {
          errorMsg = result.message;
        } else if (result.errors) {
          if (typeof result.errors === 'string') {
            errorMsg = result.errors;
          } else if (typeof result.errors === 'object') {
            // DRF error object: Flatten it
            errorMsg = Object.entries(result.errors)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
              .join(' | ');
          }
        } else if (parseError && textResponse) {
          errorMsg = `Server Response: ${textResponse.substring(0, 100)}`;
        } else {
          errorMsg = `Server Error (Status: ${response.status})`;
        }

        toast({
          title: "Error",
          description: String(errorMsg),
          variant: "destructive",
        });

        // Set backend validation errors if structured nicely
        if (result.errors && typeof result.errors === 'object') {
          setErrors(result.errors);
        }
      }
    } catch (error: any) {
      console.error('CRITICAL ERROR IN SUBMISSION:', error);
      toast({
        title: "Submission Failed",
        description: `Network or Browser Error: ${error.message || 'Unknown'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0f121d] text-white relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 hover:bg-gray-800 hover:text-white">
              <Link to="/vendor/listings">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Listings
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/vendor/listings/bulk-upload">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-center relative z-10">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">Add New Account</h1>
            <p className="text-gray-400 italic">Create a new account listing for the marketplace</p>
          </div>
        </div>

        {/* Single Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
          {/* Basic Information Card */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden relative z-10">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
              <CardDescription className="text-gray-400">
                Essential details about your account listing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="headline" className="text-white ">Headline *</Label>
                  <Input
                    id="headline"
                    placeholder="e.g., Zoom Account, PIC"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.headline ? 'border-red-500' : ''}`}
                  />
                  {errors.headline && <p className="text-red-500 text-sm mt-1">{errors.headline}</p>}
                </div>

                <div>
                  <Label htmlFor="website" className="text-white">Website *</Label>
                  <Input
                    id="website"
                    placeholder="e.g., Zoom.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.website ? 'border-red-500' : ''}`}
                  />
                  {errors.website && <p className="text-red-500 text-sm mt-1">{errors.website}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-white">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      const selectedCat = categories.find(c => c.id.toString() === value.toString());
                      setFormData(prev => ({
                        ...prev,
                        category: value,
                        account_type: selectedCat?.slug || 'other'
                      }));
                    }}
                  >
                    <SelectTrigger className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.category ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCategories ? (
                        <div className="flex items-center justify-center p-2 text-white">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Loading...</span>
                        </div>
                      ) : categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No categories found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>

                <div>
                  <Label htmlFor="access_type" className="text-white">Access Type *</Label>
                  <Select
                    value={formData.access_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, access_type: value }))}
                  >
                    <SelectTrigger className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.access_type ? 'border-red-500' : ''}`}>
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

              <div className="mb-4">
                <Label htmlFor="account_balance" className="text-white">Account Balance/Credit</Label>
                <Input
                  id="account_balance"
                  placeholder="e.g., 50.00"
                  value={formData.account_balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_balance: e.target.value }))}
                  className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.account_balance ? 'border-red-500' : ''}`}
                />
                {errors.account_balance && <p className="text-red-500 text-sm mt-1">{errors.account_balance}</p>}
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Aged Zoom Account from 2021 USA IP Female blabla..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.description ? 'border-red-500' : ''}`}
                  rows={4}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Delivery Card */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden relative z-10">
            <CardHeader>
              <CardTitle className="text-white">Pricing & Delivery</CardTitle>
              <CardDescription className="text-gray-400">
                Set your price and delivery options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="price" className="text-white">Price (USD) *</Label>
                    <span className="text-[10px] text-theme-cyan bg-theme-cyan/10 px-2 py-0.5 rounded border border-theme-cyan/20">Set product price in stable USD</span>
                  </div>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 10.00"
                    value={formData.price}
                    disabled={formData.is_giveaway}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, price: val });
                    }}
                    className={`bg-gray-900/50 border-gray-700/50 text-white font-mono rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.price ? 'border-red-500' : ''} ${formData.is_giveaway ? 'opacity-50 cursor-not-allowed border-cyan-500/30 bg-cyan-900/10' : ''}`}
                  />
                  {formData.is_giveaway && (
                    <p className="text-[10px] text-cyan-400 mt-1 font-medium animate-pulse">✨ Giveaway Mode active: Price locked to $0.00</p>
                  )}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex-1">
                      {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
                    </div>
                    <div className="flex justify-end gap-2">
                      <div className="text-right bg-green-500/10 px-3 py-1.5 rounded border border-green-500/20">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Storage (USD)</p>
                        <p className="text-green-400 font-bold font-mono text-sm">${formData.price || '0.00'}</p>
                      </div>
                      <div className="text-right bg-orange-500/10 px-3 py-1.5 rounded border border-orange-500/20">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bitcoin (BTC)</p>
                        <p className="text-orange-400 font-bold font-mono text-sm">
                          {formData.price ? (parseFloat(formData.price) / btcPrice).toFixed(8) : '0.00000000'}
                        </p>
                      </div>
                      <div className="text-right bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/20">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Monero (XMR)</p>
                        <p className="text-blue-400 font-bold font-mono text-sm">
                          {formData.price ? (parseFloat(formData.price) / xmrPrice).toFixed(4) : '0.0000'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="delivery_time" className="text-white">Delivery Time *</Label>
                  <Select
                    value={formData.delivery_time}
                    onValueChange={(value) => setFormData({ ...formData, delivery_time: value })}
                  >
                    <SelectTrigger className={`bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 ${errors.delivery_time ? 'border-red-500' : ''}`}>
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
                <Label className="text-white mb-2 block">Accepted Crypto *</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="btc_check_main"
                      checked={formData.accepted_crypto.includes('BTC')}
                      onCheckedChange={(checked) => {
                        const current = [...formData.accepted_crypto];
                        if (checked) {
                          if (!current.includes('BTC')) current.push('BTC');
                        } else {
                          if (current.includes('BTC') && current.length > 1) {
                            const idx = current.indexOf('BTC');
                            current.splice(idx, 1);
                          }
                        }
                        setFormData({ ...formData, accepted_crypto: current });
                      }}
                      className="border-gray-600 data-[state=checked]:bg-theme-cyan data-[state=checked]:border-theme-cyan"
                    />
                    <Label htmlFor="btc_check_main" className="text-white">Bitcoin (BTC)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="xmr_check_main"
                      checked={formData.accepted_crypto.includes('XMR')}
                      onCheckedChange={(checked) => {
                        const current = [...formData.accepted_crypto];
                        if (checked) {
                          if (!current.includes('XMR')) current.push('XMR');
                        } else {
                          if (current.includes('XMR') && current.length > 1) {
                            const idx = current.indexOf('XMR');
                            current.splice(idx, 1);
                          }
                        }
                        setFormData({ ...formData, accepted_crypto: current });
                      }}
                      className="border-gray-600 data-[state=checked]:bg-theme-cyan data-[state=checked]:border-theme-cyan"
                    />
                    <Label htmlFor="xmr_check_main" className="text-white">Monero (XMR)</Label>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Select at least one payment method.</p>
              </div>

              <div>
                <Label htmlFor="additional_info" className="text-white">Additional Info</Label>
                <Textarea
                  id="additional_info"
                  placeholder="e.g., Account is Shadowflagged by this and that"
                  value={formData.additional_info}
                  onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                  rows={3}
                  className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <Label htmlFor="credentials" className="text-white">Credentials</Label>
                <Textarea
                  id="credentials"
                  placeholder="e.g., testemail@test.com:testuser66:testpassword"
                  value={formData.credentials}
                  onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                  rows={3}
                  className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Credentials will be hidden until payment is confirmed
                </p>
              </div>

              {/* Escrow Settings */}
              <div className={`flex items-center justify-between p-4 rounded-lg ${isVendorBlocked ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800'}`}>
                <div>
                  <h4 className="font-medium text-white">Enable Escrow Protection</h4>
                  {isVendorBlocked ? (
                    <div className="mt-2">
                      <p className="text-sm text-red-400 font-semibold">
                        ⚠️ Only Escrow Enabled Listings Available
                      </p>
                      <p className="text-xs text-red-300 mt-1">
                        Your account is restricted to escrow-only listings. Escrow is automatically enabled and cannot be disabled.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Payment will be held until buyer approves the order. Disabled by default.
                    </p>
                  )}
                </div>
                <Switch
                  checked={formData.escrow_enabled}
                  disabled={isVendorBlocked || formData.is_giveaway}
                  onCheckedChange={(checked) => {
                    if (isVendorBlocked) {
                      toast({
                        title: "Escrow Required",
                        description: "Your account is restricted to escrow-only listings. Escrow cannot be disabled.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setFormData({ ...formData, escrow_enabled: checked });
                  }}
                  className="data-[state=checked]:bg-theme-cyan"
                />
              </div>

              {/* Giveaway Setting */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-cyan-900/10 border border-cyan-500/30">
                <div>
                  <h4 className="font-medium text-cyan-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Giveaway Mode
                  </h4>
                  <p className="text-sm text-gray-400">
                    If enabled, this product will be listed for $0.00 and will be delivered instantly to the first buyer.
                  </p>
                </div>
                <Switch
                  checked={formData.is_giveaway}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      is_giveaway: checked,
                      price: checked ? "0" : (prev.price === "0" ? "" : prev.price),
                      escrow_enabled: checked ? false : prev.escrow_enabled
                    }));
                  }}
                  className="data-[state=checked]:bg-cyan-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Optional Details Card */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden relative z-10">
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
                    onChange={(e) => setFormData({ ...formData, account_age: e.target.value })}
                    className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="access_method" className="text-white">Access Method</Label>
                  <Input
                    id="access_method"
                    placeholder="e.g., Email/Password, 2FA"
                    value={formData.access_method}
                    onChange={(e) => setFormData({ ...formData, access_method: e.target.value })}
                    className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"

                  />
                </div>

                <div>
                  <Label htmlFor="quantity_available" className="text-white">Quantity Available</Label>
                  <Input
                    id="quantity_available"
                    type="number"
                    placeholder="e.g., 1, 5, 10"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"

                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media & Documents Card */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden relative z-10">
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
                    onChange={(e) => setFormData({ ...formData, main_image: e.target.files?.[0] || null })}
                    className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"
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
                      setFormData({ ...formData, gallery_images: files });
                    }}
                    className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"
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
                    setFormData({ ...formData, documents: files });
                  }}
                  className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"

                />
              </div>
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden relative z-10">
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
                    className="bg-gray-900/50 border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50"
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
                    className="bg-theme-cyan hover:bg-theme-cyan/80 text-black font-semibold"
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
              className="bg-theme-cyan hover:bg-theme-cyan/80 text-black font-bold"
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
