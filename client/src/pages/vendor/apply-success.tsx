import { CheckCircle, Clock, Mail, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function VendorApplySuccess() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
          <p className="text-gray-400 text-lg">
            Thank you for applying to become a vendor on CryptoNexus
          </p>
        </div>

        {/* Success Card */}
        <Card className="border border-gray-700 bg-gray-900 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Review Process</h3>
                <p className="text-gray-400 text-sm">
                  Our admin team will review your application within 24-48 hours. 
                  We'll check your business details, category, and payment information.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Email Notification</h3>
                <p className="text-gray-400 text-sm">
                  You'll receive an email notification once your application is reviewed. 
                  We'll let you know if you're approved or if we need additional information.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Vendor Dashboard</h3>
                <p className="text-gray-400 text-sm">
                  Once approved, you'll get access to your vendor dashboard where you can 
                  add products, manage orders, and grow your business.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Details */}
        <Card className="border border-gray-700 bg-gray-900 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Application ID</p>
                <p className="text-white font-mono">VA-{Date.now().toString().slice(-6)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <span className="inline-block bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Pending Review
                </span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Submitted</p>
                <p className="text-white">{new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Estimated Review Time</p>
                <p className="text-white">24-48 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/buyer">
            <Button variant="outline" className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-800">
              Back to Dashboard
            </Button>
          </Link>
          
          <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Have questions about your application? 
            <a href="mailto:support@cryptonexus.com" className="text-blue-400 hover:text-blue-300 ml-1">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}