import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'buyer' | 'vendor' | 'admin';
  allowPendingVendor?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredUserType, 
  allowPendingVendor = false 
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          navigate('/sign-in');
          return;
        }

        const user = authService.getCurrentUser();
        if (!user) {
          navigate('/sign-in');
          return;
        }

        // Check vendor application status
        const vendorStatus = await authService.getVendorApplicationStatus();
        
        // Smart routing logic
        if (requiredUserType === 'vendor') {
          if (vendorStatus === 'pending') {
            // Vendor application pending - redirect to success page
            navigate('/vendor/apply/success');
            return;
          } else if (vendorStatus === 'approved') {
            // Vendor application approved - allow access
            setIsAuthorized(true);
          } else {
            // No application or rejected - redirect to buyer dashboard
            navigate('/buyer');
            return;
          }
        } else if (requiredUserType === 'admin') {
          if (authService.isAdmin()) {
            setIsAuthorized(true);
          } else {
            // Not admin - redirect based on user type
            const redirectPath = await authService.getSmartRedirectPath();
            navigate(redirectPath);
            return;
          }
        } else if (requiredUserType === 'buyer') {
          // For buyer routes, check if user is trying to access vendor features
          if (vendorStatus === 'pending') {
            // Vendor application pending - redirect to success page
            navigate('/vendor/apply/success');
            return;
          } else if (vendorStatus === 'approved') {
            // Vendor application approved - redirect to vendor dashboard
            navigate('/vendor/dashboard');
            return;
          } else {
            // No vendor application - allow buyer access
            setIsAuthorized(true);
          }
        } else {
          // No specific user type required - allow access
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/sign-in');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [navigate, requiredUserType, allowPendingVendor]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect, so don't render anything
  }

  return <>{children}</>;
} 