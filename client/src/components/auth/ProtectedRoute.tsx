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
          navigate('/auth/sign-in');
          return;
        }

        const user = authService.getCurrentUser();
        if (!user) {
          navigate('/auth/sign-in');
          return;
        }

        // Check user type permissions
        if (requiredUserType) {
          if (user.user_type === requiredUserType) {
            setIsAuthorized(true);
          } else {
            // Redirect based on user type
            if (user.user_type === 'admin') {
              navigate('/admin/dashboard');
            } else if (user.user_type === 'vendor') {
              navigate('/vendor/dashboard');
            } else {
              navigate('/buyer/dashboard');
            }
            return;
          }
        } else {
          // No specific user type required - allow access
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/auth/sign-in');
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