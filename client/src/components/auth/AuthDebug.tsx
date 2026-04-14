import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';

export const AuthDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = () => {
      const token = authService.getAccessToken();
      const user = authService.getCurrentUser();
      const isAuth = authService.isAuthenticated();
      const isTokenValid = authService.isTokenValid();

      setDebugInfo({
        isAuthenticated: isAuth,
        isTokenValid: isTokenValid,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'None',
        user: user ? user.username : 'None',
        userId: user ? user.id : 'None',
        userType: user ? user.user_type : 'None'
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefreshToken = async () => {
    try {
      const success = await authService.refreshToken();
      console.log('Manual token refresh result:', success);
    } catch (error) {
      console.error('Manual token refresh error:', error);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#ff6b6b' }}>🔐 Auth Debug</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Status:</strong> {debugInfo.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Token Valid:</strong> {debugInfo.isTokenValid ? '✅ Valid' : '❌ Invalid/Expired'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>User:</strong> {debugInfo.user || 'None'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>User Type:</strong> {debugInfo.userType || 'None'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Token:</strong> {debugInfo.tokenPreview}
      </div>
      
      <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
        <button 
          onClick={handleRefreshToken}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Refresh Token
        </button>
        
        <button 
          onClick={handleLogout}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default AuthDebug;
