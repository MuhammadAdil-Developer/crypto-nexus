import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = <div>Loading...</div> 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = authService.isAuthenticated();
        const isTokenValid = authService.isTokenValid();
        
        console.log('🔐 AuthGuard check:', {
          isAuthenticated: isAuth,
          isTokenValid: isTokenValid,
          hasToken: !!authService.getAccessToken(),
          user: authService.getCurrentUser()?.username
        });

        if (isAuth && isTokenValid) {
          setIsAuthenticated(true);
        } else if (isAuth && !isTokenValid) {
          // Try to refresh token
          console.log('🔐 Token expired, attempting refresh...');
          const refreshed = await authService.refreshToken();
          if (refreshed) {
            setIsAuthenticated(true);
          } else {
            console.log('🔐 Token refresh failed, redirecting to login');
            authService.logout();
            navigate('/sign-in');
          }
        } else {
          console.log('🔐 Not authenticated, redirecting to login');
          navigate('/sign-in');
        }
      } catch (error) {
        console.error('🔐 AuthGuard error:', error);
        authService.logout();
        navigate('/sign-in');
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <>{fallback}</>;
  }

  if (isAuthenticated === false) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
};

export default AuthGuard;
