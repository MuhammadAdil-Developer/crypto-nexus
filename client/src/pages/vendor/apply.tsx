import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { getApiUrl } from "@/config/api";

interface VendorApplicationData {
  vendorUsername: string;
  applicationMessage: string;
}

export default function VendorApply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<VendorApplicationData>({
    vendorUsername: "",
    applicationMessage: ""
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: formData
  });

  const watchedValues = watch();

  // Get current user's username and auto-fill vendor username
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.username) {
      setFormData(prev => ({
        ...prev,
        vendorUsername: currentUser.username
      }));
      // Also set the form value directly
      setValue("vendorUsername", currentUser.username);
    }
  }, [setValue]);

  const onSubmit = async (data: any) => {
    console.log('🚀 Form submission started with data:', data);
    setIsSubmitting(true);
    
    try {
      // Get authentication token
      const token = authService.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again to continue",
          variant: "destructive",
        });
        return;
      }

      // Submit to backend API with just the message
      const response = await fetch(getApiUrl('/vendors/applications/create/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendor_username: data.vendorUsername,
          application_message: data.applicationMessage
        })
      });

      console.log('📥 API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API response success:', result);
        
        // Show success message
        toast({
          title: "Application Submitted!",
          description: "Your vendor application has been submitted successfully. We'll review it and get back to you soon.",
        });

        console.log('🔄 Navigating to success page...');
        // Navigate to success page
        navigate("/vendor/apply/success");
      } else {
        const errorData = await response.json();
        console.error('❌ API response error:', errorData);
        throw new Error(errorData.message || 'Failed to submit application');
      }
      
    } catch (error) {
      console.error('💥 Form submission error:', error);
      
      toast({
        title: "Submission Failed",
        description: (error as Error)?.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/buyer">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Apply as Vendor</h1>
          <p className="text-gray-400">Send us a message to apply. No personal information required - this is an anonymous marketplace.</p>
        </div>

        {/* Form Content */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Vendor Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="vendorUsername">Vendor Username</Label>
                <Input
                  id="vendorUsername"
                  {...register("vendorUsername", { required: "Username is required" })}
                  value={watchedValues.vendorUsername || ""}
                  disabled
                  readOnly
                  className="bg-blue-900/30 border-blue-500 text-white cursor-not-allowed font-medium"
                  style={{ color: 'white' }}
                />
                <p className="text-blue-300 text-sm">This field is automatically filled with your username</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationMessage">Application Message *</Label>
                <Textarea
                  id="applicationMessage"
                  {...register("applicationMessage", { 
                    required: "Please write a message to apply",
                    minLength: {
                      value: 50,
                      message: "Please write at least 50 characters"
                    }
                  })}
                  placeholder="Tell us about yourself, your products or services, and why you'd like to become a vendor. You don't need to provide any personal information - this is an anonymous marketplace."
                  className="bg-gray-800 border-gray-700 h-48"
                  onChange={(e) => {
                    setValue("applicationMessage", e.target.value);
                    setFormData(prev => ({ ...prev, applicationMessage: e.target.value }));
                  }}
                  value={watchedValues.applicationMessage || ""}
                />
                {errors.applicationMessage && (
                  <p className="text-red-400 text-sm">{errors.applicationMessage.message}</p>
                )}
                <p className="text-xs text-gray-400">
                  Write a message explaining why you want to become a vendor. No personal information is required.
                </p>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-300">
                  <strong className="text-white">Privacy Notice:</strong> This is an anonymous marketplace. 
                  You are not required to provide any personal information such as phone numbers, addresses, 
                  business licenses, or tax IDs. Simply write us a message and we'll review your application.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!watchedValues.applicationMessage || watchedValues.applicationMessage.length < 50 || isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 min-w-[150px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
