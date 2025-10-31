import { Bell, Search, User, LogOut, Settings, AlertTriangle, ArrowRightLeft, Loader2, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useMessaging } from "@/contexts/MessagingContext";
import { useEffect, useMemo, useState } from "react";
import { realtimeService } from "@/services/realtimeService";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import notificationService from "@/services/notificationService";

export function VendorHeader() {
  const { notifications, allNotifications, unreadCount, refreshNotifications } = useMessaging() as any;
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    business_name: ""
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  
  // Use allNotifications from MessagingContext as the source of truth
  const reviewNotifications = allNotifications.filter((n: any) => n.type === 'review');
  const disputeNotifications = allNotifications.filter((n: any) => n.type === 'dispute' || n.type === 'dispute_message' || n.type === 'dispute_resolved');
  const listingNotifications = allNotifications.filter((n: any) => n.type === 'listing_approval' || n.type === 'listing_rejection');
  const allRelevantNotifications = [...reviewNotifications, ...disputeNotifications, ...listingNotifications];
  
  // Show only 3 notifications by default, more on load more
  const displayedNotifications = allRelevantNotifications.slice(0, 3 * notificationPage);
  
  // Calculate badge count outside JSX for better reactivity
  const badgeCount = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null;
  
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLoadMoreNotifications = async () => {
    setLoadingMoreNotifications(true);
    try {
      const currentPageNum = notificationPage;
      const nextPageNum = currentPageNum + 1;
      
      // Calculate which notifications will be newly loaded (next batch of 3)
      const startIndex = 3 * currentPageNum;
      const endIndex = 3 * nextPageNum;
      const newNotifications = allRelevantNotifications.slice(startIndex, endIndex);
      
      // Mark only the newly loaded notifications as read
      for (const notification of newNotifications) {
        try {
          await notificationService.markAsRead(notification.id);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }
      
      // Increment page after marking as read
      setNotificationPage(nextPageNum);
      
      // Refresh to update the count
      if (refreshNotifications) {
        await refreshNotifications();
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMoreNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Just show notification details, don't mark as read
    // The notification will be marked as read when bell icon is clicked
  };

  const handleNotificationDropdownOpen = async (open: boolean) => {
    setNotificationDropdownOpen(open);
    if (open) {
      // Mark only the currently displayed notifications as read (the ones visible on this page)
      try {
        for (const notification of displayedNotifications) {
          try {
            await notificationService.markAsRead(notification.id);
          } catch (error) {
            console.error('Error marking notification as read:', error);
          }
        }
        
        // Refresh to update the count
        if (refreshNotifications) {
          await refreshNotifications();
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
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
          email: response.data.data.email || "",
          business_name: response.data.data.business_name || ""
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

  const handleSwitchToBuyer = () => {
    setIsTransitioning(true);
    toast({
      title: "Switching to Buyer Dashboard",
      description: "Redirecting you to the buyer interface...",
    });
    
    // Temporarily store vendor flag and redirect to buyer dashboard
    localStorage.setItem('switchToBuyer', 'true');
    localStorage.setItem('fromVendor', 'true');
    
    // Add a smooth transition effect and use window.location to bypass ProtectedRoute
    setTimeout(() => {
      window.location.href = '/buyer/dashboard';
    }, 500);
  };

  return (
    <header className={`bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4 transition-all duration-500 ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search orders, products, customers..."
              className="pl-10 bg-white/10 border-gray-600 text-white placeholder-gray-400 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <DropdownMenu onOpenChange={handleNotificationDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5 text-gray-300" />
                {badgeCount && (
                  <Badge className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs p-0 flex items-center justify-center">
                    {badgeCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96">
              <div className="px-2 py-1 text-sm text-gray-400">Notifications</div>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {displayedNotifications.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-400">No notifications</div>
                ) : (
                  displayedNotifications.map((n: any) => (
                    <DropdownMenuItem 
                      key={n.id} 
                      className="flex flex-col items-start gap-1 cursor-pointer"
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-center gap-2 text-sm text-white">
                        {n.type === 'review' && <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />}
                        {n.type === 'dispute' && <span className="inline-block w-2 h-2 rounded-full bg-red-400" />}
                        {n.type === 'dispute_message' && <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />}
                        {n.type === 'dispute_resolved' && <span className="inline-block w-2 h-2 rounded-full bg-green-400" />}
                        {n.type === 'listing_approval' && <span className="inline-block w-2 h-2 rounded-full bg-green-400" />}
                        {n.type === 'listing_rejection' && <span className="inline-block w-2 h-2 rounded-full bg-red-400" />}
                        <div>{n.title}</div>
                      </div>
                      <div 
                        className="text-xs text-gray-400 w-full break-words" 
                        title={n.message}
                      >
                        {(() => {
                          // Only truncate rejection reasons over 80 chars
                          if (n.type === 'listing_rejection' && n.message && n.message.length > 80) {
                            return n.message.substring(0, 80) + '...';
                          }
                          return n.message;
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">{n.time}</div>
                    </DropdownMenuItem>
                  ))
                )}
                {allRelevantNotifications.length > 3 * notificationPage && (
                  <div className="px-3 py-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleLoadMoreNotifications}
                      disabled={loadingMoreNotifications}
                      className="w-full text-xs"
                    >
                      {loadingMoreNotifications ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Load More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {loading ? "..." : (userData.business_name ? userData.business_name.substring(0, 2).toUpperCase() : userData.username.substring(0, 2).toUpperCase())}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userData.business_name || userData.username}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {userData.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/vendor/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSwitchToBuyer}
                className="text-blue-400 focus:text-blue-300 hover:bg-blue-900/20 transition-colors duration-200"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                <span>Buyer Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowLogoutDialog(true)}
                className="text-red-400 focus:text-red-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
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
