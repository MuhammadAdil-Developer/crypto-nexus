import { useState, useEffect } from "react";
import { Search, Bell, ChevronDown, Settings, LogOut, User, RefreshCw, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { useMessaging } from "@/contexts/MessagingContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";

export function BuyerHeader({ hasBanner = false }: { hasBanner?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userData, setUserData] = useState({
    username: "",
    email: ""
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Get real-time messaging data
  const { unreadCount, notifications, refreshNotifications } = useMessaging();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/profile/');
      if (response.data && response.data.success) {
        setUserData({
          username: response.data.data.username || "User",
          email: response.data.data.email || ""
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout/');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      setShowLogoutDialog(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage and redirect even if API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setShowLogoutDialog(false);
      navigate('/');
    }
  };

  return (
    <header className={`bg-gray-950 border-b border-gray-800 px-6 py-4 ${hasBanner ? 'mt-16' : ''}`}>
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products, vendors, or orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-800 border-gray-700 text-white placeholder-gray-400 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Notifications</h3>
                    <p className="text-sm text-gray-400">{unreadCount} unread</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refreshNotifications}
                    className="text-gray-400 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="p-3 border-b last:border-b-0"
                      onClick={() => {
                        if (notification.type === 'review') {
                          // Navigate to orders page or open review modal
                          console.log('🔍 Review notification clicked:', notification);
                          // You can add navigation logic here
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.unread 
                            ? notification.type === 'message' 
                              ? 'bg-green-500' 
                              : notification.type === 'order'
                              ? 'bg-blue-500'
                              : notification.type === 'review'
                              ? 'bg-yellow-500'
                              : 'bg-purple-500'
                            : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-white">{notification.title}</p>
                            {notification.type === 'review' && (
                              <Star className="w-3 h-3 text-yellow-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                          {notification.type === 'message' && (
                            <p className="text-xs text-green-400 mt-1">💬 Real-time message</p>
                          )}
                          {notification.type === 'review' && (
                            <p className="text-xs text-yellow-400 mt-1">⭐ Click to leave review</p>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="text-white w-4 h-4" />
                </div>
                <span className="hidden md:block font-medium text-gray-300">
                  {loading ? "Loading..." : userData.username}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-3 border-b">
                <p className="font-medium text-white">{userData.username}</p>
                <p className="text-sm text-gray-400">{userData.email}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate('/buyer/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-400" 
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Custom Logout Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowLogoutDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}