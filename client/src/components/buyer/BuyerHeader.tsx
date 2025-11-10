import { useState, useEffect } from "react";
import { Search, Bell, ChevronDown, Settings, LogOut, User, RefreshCw, Star, AlertTriangle, Loader2, MoreVertical } from "lucide-react";
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
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMessaging } from "@/contexts/MessagingContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import notificationService from "@/services/notificationService";

export function BuyerHeader({ hasBanner = false }: { hasBanner?: boolean }) {
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userData, setUserData] = useState({
    username: "",
    email: ""
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Get real-time messaging data
  const { unreadCount, notifications, allNotifications, refreshNotifications, isLoading: isLoadingNotifications, setUnreadCount: setMessagingUnreadCount } = useMessaging();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hide search bar on all buyer pages (home page has its own search)
  const shouldHideSearchBar = true; // Always hide header search bar

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buyer/listings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit(e as any);
    }
  };

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
    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout/');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      setShowLogoutDialog(false);
      navigate('/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage and redirect even if API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setShowLogoutDialog(false);
      navigate('/sign-in');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Navigate based on notification type
    if (notification.type === 'vendor_invitation' && notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.type === 'review') {
      // Navigate to orders page or open review modal
      console.log('🔍 Review notification clicked:', notification);
      // You can add navigation logic here
    }
  };

  const handleNotificationDropdownOpen = async (open: boolean) => {
    setNotificationDropdownOpen(open);
    
    // Simple: When dropdown opens, mark all as read and update state
    if (open) {
      try {
        await notificationService.markAllAsRead();
        // Immediately set unread count to 0
        setMessagingUnreadCount(0);
        // Update all notifications to mark them as read in state
        refreshNotifications(true);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
  };

  return (
    <header className={`bg-gray-950 border-b border-gray-800 px-6 py-4 ${hasBanner ? 'mt-16' : ''}`}>
      <div className="flex items-center justify-between">
        {/* Right Controls - Search bar removed from header */}
        <div className="flex items-center space-x-4 ml-auto">
          {/* Notifications */}
          <DropdownMenu onOpenChange={handleNotificationDropdownOpen}>
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
            <DropdownMenuContent align="end" className="w-[360px] p-0 bg-gray-900 border-gray-700">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm">Notifications</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isLoadingNotifications ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      `${unreadCount} unread`
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshNotifications(true);
                    }}
                    disabled={isLoadingNotifications}
                    className="h-6 w-6 p-0 hover:bg-gray-800"
                    title="Refresh notifications"
                  >
                    <RefreshCw className={`w-3 h-3 text-gray-400 ${isLoadingNotifications ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotificationDropdownOpen(false);
                      navigate('/buyer/notifications');
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-800"
                    title="View all notifications"
                  >
                    <MoreVertical className="w-3 h-3 text-gray-400" />
                  </Button>
                </div>
              </div>
              
              {/* Notifications List */}
              <div className="max-h-[320px] overflow-y-auto">
                {isLoadingNotifications && allNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Loading notifications...</p>
                  </div>
                ) : allNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  (() => {
                    // Sort by time (latest first) and show only top 3
                    const sortedNotifications = [...allNotifications].sort((a, b) => {
                      const timeA = new Date(a.time || 0).getTime();
                      const timeB = new Date(b.time || 0).getTime();
                      return timeB - timeA; // Descending order (latest first)
                    });
                    const displayedNotifications = sortedNotifications.slice(0, 3);
                    const hasMore = sortedNotifications.length > 3;
                    
                    return (
                      <>
                        {displayedNotifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="p-3 border-b last:border-b-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
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
                              : notification.type === 'vendor_invitation'
                              ? 'bg-purple-500'
                              : 'bg-blue-500'
                            : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-white truncate">{notification.title}</p>
                            {notification.type === 'review' && (
                              <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className={`text-xs text-gray-400 mt-1 ${notification.type === 'vendor_invitation' ? '' : notification.type === 'message' ? 'line-clamp-2' : 'line-clamp-2'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          {notification.type === 'review' && (
                            <p className="text-xs text-yellow-400 mt-1">⭐ Click to leave review</p>
                          )}
                          {notification.type === 'vendor_invitation' && (
                            <p className="text-xs text-purple-400 mt-1">👈 Click to apply as vendor</p>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                        ))}
                        {hasMore && (
                          <DropdownMenuSeparator />
                        )}
                        {hasMore && (
                          <DropdownMenuItem 
                            className="p-3 text-center justify-center cursor-pointer"
                            onClick={() => {
                              setNotificationDropdownOpen(false);
                              navigate('/buyer/notifications');
                            }}
                          >
                            <span className="text-sm text-blue-400 hover:text-blue-300">View All ({sortedNotifications.length})</span>
                          </DropdownMenuItem>
                        )}
                      </>
                    );
                  })()
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
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
