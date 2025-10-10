import { CheckCircle, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function VendorApplySuccess() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Your Vendor Application Has Been Sent
          </h1>
          <p className="text-gray-400 text-lg">
            Your request is pending admin approval. You will be notified once approved.
          </p>
        </div>

        {/* Status Card */}
        <Card className="border border-gray-700 bg-gray-900 mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-4 py-2">
                Request Pending
              </Badge>
            </div>
            
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Application ID</span>
                <span className="text-white font-mono">#VA-2024-0015</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Submitted</span>
                <span className="text-white">January 15, 2024</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400">Status</span>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Under Review
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Expected Response</span>
                <span className="text-white">1-3 business days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card className="border border-gray-700 bg-gray-900 mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">What happens next?</h2>
            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Admin Review</h3>
                  <p className="text-gray-400 text-sm">Our team will review your application and verify the information provided.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Email Notification</h3>
                  <p className="text-gray-400 text-sm">You'll receive an email notification once your application is approved or if we need additional information.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Dashboard Access</h3>
                  <p className="text-gray-400 text-sm">Once approved, you'll gain full access to your vendor dashboard and can start listing products.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/buyer">
            <Button variant="outline" className="border-gray-700">
              <ArrowRight className="w-4 h-4 mr-2" />
              Back to Buyer Dashboard
            </Button>
          </Link>
          
          <Link href="/vendor/dashboard">
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Eye className="w-4 h-4 mr-2" />
              Go to Vendor Dashboard (Preview Mode)
            </Button>
          </Link>
        </div>

        {/* Support Note */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">
            Have questions about your application? Contact our support team at{" "}
            <span className="text-blue-400">vendor-support@cryptomarket.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}