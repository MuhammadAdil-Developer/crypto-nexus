import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TokenExpirationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [userType, setUserType] = useState<'buyer' | 'vendor' | 'admin' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for token expiration events
    const handleTokenExpired = (event: CustomEvent) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const type = user.user_type || 'buyer';
      setUserType(type as 'buyer' | 'vendor' | 'admin');
      setIsOpen(true);
    };

    window.addEventListener('token_expired' as any, handleTokenExpired as EventListener);

    return () => {
      window.removeEventListener('token_expired' as any, handleTokenExpired as EventListener);
    };
  }, []);

  const handleLogin = () => {
    // Clear all auth data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');

    // Navigate to appropriate login page
    if (userType === 'vendor') {
      navigate('/vender-sign-in');
    } else if (userType === 'admin') {
      navigate('//6f2c9b681c3b4cf9a8c4-admin-access-control-panel-login');
    } else {
      navigate('/sign-in');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center text-center space-y-6 p-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Session Expired</h2>
            <p className="text-gray-400">
              Your session has expired. Please log in again to continue.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 py-6 text-lg"
            size="lg"
          >
            <LogIn className="w-5 h-5" />
            <span>Click here to login again</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

