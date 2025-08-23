import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Store, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";

const STEPS = [
  { id: 1, title: "Basic Info", icon: User, description: "Personal and business details" },
  { id: 2, title: "Store Info", icon: Store, description: "Your store information" },
  { id: 3, title: "Payment Info", icon: CreditCard, description: "Crypto payment setup" }
];

const CATEGORIES = [
  "Electronics & Tech",
  "Digital Goods & Software", 
  "Streaming Accounts",
  "Gaming Accounts",
  "Educational Services",
  "VPN & Security",
  "Design & Creative",
  "Business Tools",
  "Other"
];

interface VendorApplicationData {
  // Basic Info
  businessName: string;
  vendorUsername: string;
  email: string;
  contact: string;
  
  // Store Info
  storeDescription: string;
  category: string;
  
  // Payment Info
  btcAddress: string;
  xmrAddress: string;
  
  // Agreement
  agreement: boolean;
}

export default function VendorApply() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<VendorApplicationData>({
    businessName: "",
    vendorUsername: "",
    email: "crypto_buyer@example.com", // Pre-filled
    contact: "",
    storeDescription: "",
    category: "",
    btcAddress: "",
    xmrAddress: "",
    agreement: false
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: formData
  });

  const watchedValues = watch();

  const updateFormData = (data: Partial<VendorApplicationData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: any) => {
    updateFormData(data);
    // Navigate to confirmation page
    setLocation("/vendor/apply/success");
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return watchedValues.businessName && watchedValues.vendorUsername && watchedValues.email;
      case 2:
        return watchedValues.storeDescription && watchedValues.category;
      case 3:
        return watchedValues.agreement;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business/Shop Name *</Label>
                <Input
                  id="businessName"
                  {...register("businessName", { required: "Business name is required" })}
                  onChange={(e) => {
                    setValue("businessName", e.target.value);
                    setFormData(prev => ({ ...prev, businessName: e.target.value }));
                  }}
                  value={watchedValues.businessName || ""}
                  placeholder="Enter your business name"
                  className="bg-gray-800 border-gray-700"
                />
                {errors.businessName && (
                  <p className="text-red-400 text-sm">{errors.businessName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorUsername">Vendor Username *</Label>
                <Input
                  id="vendorUsername"
                  {...register("vendorUsername", { required: "Username is required" })}
                  placeholder="Choose a unique username"
                  className="bg-gray-800 border-gray-700"
                />
                {errors.vendorUsername && (
                  <p className="text-red-400 text-sm">{errors.vendorUsername.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  className="bg-gray-800 border-gray-700"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact (Optional)</Label>
                <Input
                  id="contact"
                  {...register("contact")}
                  placeholder="Phone or Telegram"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="storeDescription">Store Description *</Label>
              <Textarea
                id="storeDescription"
                {...register("storeDescription", { required: "Store description is required" })}
                placeholder="Describe your store and what you sell..."
                className="bg-gray-800 border-gray-700 h-32"
              />
              {errors.storeDescription && (
                <p className="text-red-400 text-sm">{errors.storeDescription.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select onValueChange={(value) => setValue("category", value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select your primary category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-red-400 text-sm">{errors.category.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="documents">Upload Documents (Optional)</Label>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  className="bg-gray-800 border-gray-700"
                />
                <p className="text-xs text-gray-400">ID, License, Verification files</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Shop Logo/Banner (Optional)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="bg-gray-800 border-gray-700"
                />
                <p className="text-xs text-gray-400">PNG, JPG (max 2MB)</p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="btcAddress">Bitcoin Address (Optional)</Label>
                <Input
                  id="btcAddress"
                  {...register("btcAddress")}
                  onChange={(e) => {
                    setValue("btcAddress", e.target.value);
                    setFormData(prev => ({ ...prev, btcAddress: e.target.value }));
                  }}
                  value={watchedValues.btcAddress || ""}
                  placeholder="bc1q..."
                  className="bg-gray-800 border-gray-700"
                />
                <p className="text-xs text-gray-400">For receiving BTC payments</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="xmrAddress">Monero Address (Optional)</Label>
                <Input
                  id="xmrAddress"
                  {...register("xmrAddress")}
                  onChange={(e) => {
                    setValue("xmrAddress", e.target.value);
                    setFormData(prev => ({ ...prev, xmrAddress: e.target.value }));
                  }}
                  value={watchedValues.xmrAddress || ""}
                  placeholder="4..."
                  className="bg-gray-800 border-gray-700"
                />
                <p className="text-xs text-gray-400">For receiving XMR payments</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-2">Payment Information</h3>
                <p className="text-sm text-gray-400 mb-4">
                  You can add your crypto addresses now or later in your vendor dashboard settings. 
                  The marketplace also supports escrow payments for buyer protection.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreement"
                  checked={watchedValues.agreement}
                  onCheckedChange={(checked) => {
                    setValue("agreement", checked as boolean);
                    setFormData(prev => ({ ...prev, agreement: checked as boolean }));
                  }}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="agreement" className="text-sm text-white">
                    I agree to the marketplace policies and terms of service *
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">
                    By checking this box, you agree to our vendor guidelines, commission structure, and marketplace rules.
                  </p>
                </div>
              </div>
              {errors.agreement && (
                <p className="text-red-400 text-sm">{errors.agreement.message}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/buyer">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Apply as Vendor</h1>
          <p className="text-gray-400">Join our marketplace and start selling your products</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isValid = isStepValid(step.id);

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                      isCompleted 
                        ? "bg-green-500 border-green-500 text-white" 
                        : isActive 
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`font-medium ${isActive ? "text-white" : "text-gray-400"}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? "bg-green-500" : "bg-gray-700"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white">
              Step {currentStep}: {STEPS[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="border-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isStepValid(currentStep)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!isStepValid(currentStep)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Submit Application
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}