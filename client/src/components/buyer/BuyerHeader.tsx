import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, Settings, LogOut, User, RefreshCw, Star, AlertTriangle, Loader2, MoreVertical, Menu, Shield } from "lucide-react";
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

export function BuyerHeader({ hasBanner = false, onMenuClick }: { hasBanner?: boolean; onMenuClick?: () => void }) {
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

  // State for lazy loading notifications
  const [visibleCount, setVisibleCount] = useState(10);
  const observerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!notificationDropdownOpen || visibleCount >= allNotifications.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 10, allNotifications.length));
        }
      },
      {
        threshold: 0.1,
        root: document.querySelector('.notifications-scroll-area')
      }
    );

    // Wait a bit for the dropdown to render and sentinel to be available
    const timer = setTimeout(() => {
      if (observerRef.current) {
        observer.observe(observerRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [notificationDropdownOpen, visibleCount, allNotifications.length]);

  // Reset count when dropdown closes
  useEffect(() => {
    if (!notificationDropdownOpen) {
      setVisibleCount(10);
    }
  }, [notificationDropdownOpen]);

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
    <header className={`bg-transparent border-b border-gray-800/50 backdrop-blur-[1px] px-6 py-4 relative z-10`} style={{ backdropFilter: 'blur(1px)' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
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
              <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
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
                    // Sort by time (latest first)
                    const sortedNotifications = [...allNotifications].sort((a, b) => {
                      const timeA = new Date(a.time || 0).getTime();
                      const timeB = new Date(b.time || 0).getTime();
                      return timeB - timeA;
                    });

                    const displayedNotifications = sortedNotifications.slice(0, visibleCount);

                    return (
                      <div className="notifications-scroll-area max-h-[380px] overflow-y-auto custom-scrollbar">
                        <div className="divide-y divide-gray-800/50">
                          {displayedNotifications.map((notification) => (
                            <DropdownMenuItem
                              key={notification.id}
                              className="p-3 cursor-pointer focus:bg-gray-800 transition-colors"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start space-x-3 w-full">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.unread
                                  ? notification.type === 'message'
                                    ? 'bg-green-500'
                                    : notification.type === 'order'
                                      ? 'bg-blue-500'
                                      : notification.type === 'review'
                                        ? 'bg-yellow-500'
                                        : notification.type === 'security'
                                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                          : notification.type === 'vendor_invitation'
                                            ? 'bg-purple-500'
                                            : 'bg-blue-500'
                                  : 'bg-gray-800'
                                  }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-white truncate">{notification.title}</p>
                                    {notification.type === 'review' && (
                                      <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                    )}
                                    {notification.type === 'security' && (
                                      <Shield className="w-3 h-3 text-red-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-1">{notification.time}</p>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ))}

                          {/* Sentinel for infinite scroll */}
                          {visibleCount < allNotifications.length && (
                            <div ref={observerRef} className="p-4 flex justify-center">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="p-3 border-t border-gray-700 bg-gray-900 sticky bottom-0 z-20">
                          <div
                            className="w-full py-2.5 px-4 rounded-xl border border-theme-red/20 flex items-center justify-center cursor-pointer hover:bg-theme-red/10 hover:border-theme-red/50 transition-all duration-300 group"
                            onClick={() => {
                              setNotificationDropdownOpen(false);
                              navigate('/buyer/notifications');
                            }}
                          >
                            <span className="text-xs font-bold text-[#A6033E] drop-shadow-[0_0_8px_rgba(166,3,62,0.3)]">
                              View All Notifications ({allNotifications.length})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-transparent shadow-none border-none flex items-center space-x-2 hover:bg-theme-red/10 group transition-all duration-200">
                <div className="w-8 h-8 bg-gradient-to-br from-[#A6033E] via-[#8a0234] to-[#70022a] rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(166,3,62,0.4)] group-hover:shadow-[0_0_20px_rgba(166,3,62,0.6)] transition-all">
                  <User className="text-white w-4 h-4 shadow-sm" />
                </div>
                <span className="hidden md:block font-medium text-gray-300 group-hover:text-white transition-colors">
                  {loading ? "Loading..." : userData.username}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-theme-red transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-[#0E1A26]/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl p-2 mt-2">
              <div className="px-4 py-3 border-b border-white/5 mb-2">
                <p className="font-bold text-white tracking-wide">{userData.username}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{userData.email}</p>
              </div>

              <DropdownMenuItem
                onClick={() => navigate('/buyer/settings')}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-theme-red/20 transition-colors">
                  <Settings className="w-4 h-4 group-hover:text-theme-red" />
                </div>
                <span className="text-sm font-medium">Account Settings</span>
              </DropdownMenuItem>

              <div className="my-2 h-px bg-white/5" />

              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer group"
                onClick={() => setShowLogoutDialog(true)}
              >
                <div className="w-8 h-8 rounded-lg bg-red-400/5 flex items-center justify-center group-hover:bg-red-400/10 transition-colors">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Logout</span>
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
              className="bg-theme-red hover:bg-theme-red/80 text-white disabled:opacity-50"
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
