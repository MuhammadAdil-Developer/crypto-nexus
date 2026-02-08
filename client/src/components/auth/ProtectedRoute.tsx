import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'buyer' | 'vendor' | 'admin';
}

export function ProtectedRoute({
  children,
  requiredUserType
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

        // Check user type permissions
        if (requiredUserType) {
          // Hierarchical Permissions:
          // 1. Exact match is always allowed
          if (user.user_type === requiredUserType) {
            setIsAuthorized(true);
            return;
          }

          // 2. Vendors are also Buyers (Allow vendor -> buyer)
          if (requiredUserType === 'buyer' && user.user_type === 'vendor') {
            setIsAuthorized(true);
            return;
          }

          // 3. Admins can see everything (Allow admin -> vendor/buyer)
          if (user.user_type === 'admin') {
            setIsAuthorized(true);
            return;
          }

          // 4. Special cases (Preview Mode)
          const searchParams = new URLSearchParams(window.location.search);
          const hasPreviewParam = searchParams.get('preview') === 'true';
          const isPreviewPersisted = sessionStorage.getItem('vendorPreviewMode') === 'true';

          if (requiredUserType === 'vendor' && user.user_type === 'buyer') {
            if (hasPreviewParam) {
              sessionStorage.setItem('vendorPreviewMode', 'true');
              setIsAuthorized(true);
              return;
            } else if (isPreviewPersisted) {
              // If they removed it from URL but we have it in session, add it back
              const newSearch = new URLSearchParams(window.location.search);
              newSearch.set('preview', 'true');
              const newUrl = `${window.location.pathname}?${newSearch.toString()}${window.location.hash}`;
              window.history.replaceState(null, '', newUrl);
              setIsAuthorized(true);
              return;
            }
          }

          // If we are a vendor but still have preview flags, clear them
          if (user.user_type === 'vendor') {
            sessionStorage.removeItem('vendorPreviewMode');
          }

          // Redirect based on user type
          if (user.user_type === 'admin') {
            navigate('/admin/dashboard');
          } else if (user.user_type === 'vendor') {
            navigate('/vendor/dashboard');
          } else {
            navigate('/buyer/dashboard');
          }
          return;
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
  }, [navigate, requiredUserType]);

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
    return null;
  }

  return <>{children}</>;
} 
