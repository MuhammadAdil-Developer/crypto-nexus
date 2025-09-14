import React from 'react';
import { CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const VendorApplySuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Application Submitted Successfully!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your vendor application has been received and is under review
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-700">
              Review Process: 24-48 hours
            </span>
              </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              What happens next?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Our team will review your application</li>
              <li>• We'll verify your business information</li>
              <li>• You'll receive an email notification</li>
              <li>• Once approved, you can start selling</li>
            </ul>
            </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Need to make changes?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You can update your application anytime before approval
            </p>
            <Link
              to="/vendor/apply"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Application
            </Link>
              </div>
            </div>

        <div className="text-center">
          <Link
            to="/buyer/dashboard"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorApplySuccess;