import { Bell, Search, User, LogOut, Settings, AlertTriangle, ArrowRightLeft, Loader2, ChevronDown, Package, RefreshCw, MoreVertical } from "lucide-react";
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
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { realtimeService } from "@/services/realtimeService";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/authService";
import notificationService from "@/services/notificationService";
import { productService, Product } from "@/services/productService";

export function VendorHeader() {
  const { notifications, allNotifications, unreadCount, refreshNotifications, isLoading: isLoadingNotifications, setUnreadCount, setAllNotifications, setNotifications } = useMessaging() as any;
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
  
  // Search suggestions state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [allVendorProducts, setAllVendorProducts] = useState<Product[]>([]);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(384); // Default max-h-96 (384px)
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Use allNotifications from MessagingContext as the source of truth
  // Sort ALL notifications by time (latest first) - no grouping, just time-based sorting
  const sortedNotifications = [...allNotifications].sort((a, b) => {
    const timeA = new Date(a.time || 0).getTime();
    const timeB = new Date(b.time || 0).getTime();
    return timeB - timeA; // Latest first
  });
  
  // Show only 3 notifications by default, more on load more
  const displayedNotifications = sortedNotifications.slice(0, 3 * notificationPage);
  
  // Calculate badge count outside JSX for better reactivity
  const badgeCount = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null;
  
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLoadMoreNotifications = async () => {
    setLoadingMoreNotifications(true);
    try {
      const currentPageNum = notificationPage;
      const nextPageNum = currentPageNum + 1;
      
      // Recalculate sorted notifications
      const reviewNotifs = allNotifications.filter((n: any) => n.type === 'review');
      const disputeNotifs = allNotifications.filter((n: any) => n.type === 'dispute' || n.type === 'dispute_message' || n.type === 'dispute_resolved');
      const listingNotifs = allNotifications.filter((n: any) => n.type === 'listing_approval' || n.type === 'listing_rejection');
      const messageNotifs = allNotifications.filter((n: any) => n.type === 'message');
      const otherNotifs = [...reviewNotifs, ...disputeNotifs, ...listingNotifs];
      
      const sortedMsgs = [...messageNotifs].sort((a, b) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeB - timeA;
      });
      
      const sortedOthers = [...otherNotifs].sort((a, b) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeB - timeA;
      });
      
      const allSorted = [...sortedMsgs, ...sortedOthers];
      
      // Calculate which notifications will be newly loaded (next batch of 3)
      const startIndex = 3 * currentPageNum;
      const endIndex = 3 * nextPageNum;
      const newNotifications = allSorted.slice(startIndex, endIndex);
      
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

  // Auto-refresh notifications every 2 seconds (like admin header)
  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshNotifications) {
        refreshNotifications(true);
      }
    }, 2000);
    
    // Also refresh immediately when dropdown opens
    if (notificationDropdownOpen && refreshNotifications) {
      refreshNotifications(true);
    }
    
    return () => clearInterval(interval);
  }, [notificationDropdownOpen, refreshNotifications]);

  const handleNotificationDropdownOpen = async (open: boolean) => {
    setNotificationDropdownOpen(open);
    
    // When dropdown opens, mark as read and refresh
    if (open) {
      try {
        console.log('🔔 Vendor dropdown opened, marking notifications as read');
        console.log('🔔 Current unread count:', unreadCount);
        console.log('🔔 Current notifications:', allNotifications.length);
        
        // Mark all as read in backend
        await notificationService.markAllAsRead();
        
        // Refresh notifications to get latest
        if (refreshNotifications) {
          refreshNotifications(true);
        }
        
        // Immediately set unread count to 0
        if (setUnreadCount) {
          setUnreadCount(0);
          console.log('🔔 Set unread count to 0');
        }
        
        // Update all notifications to mark them as read in state (but keep them visible)
        if (setAllNotifications) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAllNotifications((prev: any) => {
            const updated = (prev || []).map((n: any) => ({ ...n, unread: false }));
            console.log('🔔 Marked all notifications as read, count:', updated.length);
            return updated;
          });
        }
        if (setNotifications) {
          setNotifications([]);
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        // Still refresh even if mark as read fails
        if (refreshNotifications) {
          refreshNotifications(true);
        }
      }
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchVendorProducts();
  }, []);

  // Fetch vendor products for search suggestions
  const fetchVendorProducts = async () => {
    try {
      const response = await productService.getVendorProducts();
      if (response.success && response.data) {
        setAllVendorProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching vendor products:', error);
    }
  };

  // Calculate dropdown max height based on available space
  useEffect(() => {
    const calculateDropdownHeight = () => {
      if (searchInputRef.current) {
        const inputRect = searchInputRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const availableSpace = viewportHeight - inputRect.bottom - 100; // More margin to avoid buttons
        
        // Reduced max height - ensure it doesn't touch buttons
        const calculatedHeight = Math.max(180, Math.min(280, availableSpace - 40));
        setDropdownMaxHeight(calculatedHeight);
      }
    };

    calculateDropdownHeight();
    window.addEventListener('resize', calculateDropdownHeight);
    window.addEventListener('scroll', calculateDropdownHeight, true);

    return () => {
      window.removeEventListener('resize', calculateDropdownHeight);
      window.removeEventListener('scroll', calculateDropdownHeight, true);
    };
  }, []);

  // Filter products based on search query
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const query = searchQuery.toLowerCase().trim();
      const filtered = allVendorProducts.filter((product: Product) => {
        const title = (product.listing_title || product.headline || "").toLowerCase();
        const description = (product.description || "").toLowerCase();
        const category = (product.category?.name || "").toLowerCase();
        return title.includes(query) || description.includes(query) || category.includes(query);
      });
      setSearchSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowSuggestions(true); // Always show dropdown when there's a query
      setIsSearching(false);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allVendorProducts]);

  // Update dropdown position dynamically (now using portal, so position updates on every render)
  useLayoutEffect(() => {
    if (showSuggestions && searchInputRef.current && suggestionsRef.current) {
      const updatePosition = () => {
        if (searchInputRef.current && suggestionsRef.current) {
          const inputRect = searchInputRef.current.getBoundingClientRect();
          suggestionsRef.current.style.top = `${inputRect.bottom + 8}px`;
          suggestionsRef.current.style.left = `${inputRect.left}px`;
          suggestionsRef.current.style.width = `${inputRect.width}px`;
          suggestionsRef.current.style.zIndex = '999999';
        }
      };
      
      updatePosition();
      
      // Update position on scroll/resize
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      
      // Update on a small interval to catch any position changes
      const interval = setInterval(updatePosition, 100);
      
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
        clearInterval(interval);
      };
    }
  }, [showSuggestions, searchQuery]);
  
  // Prevent page scroll when dropdown is open and scrolling inside it
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const preventPageScrollWheel = (e: WheelEvent) => {
        // Only prevent if we're inside the dropdown and can't scroll anymore
        if (suggestionsRef.current?.contains(e.target as Node)) {
          const scrollableDiv = (e.target as Element).closest('[style*="overflow-y-auto"]') as HTMLElement;
          if (scrollableDiv) {
            const { scrollTop, scrollHeight, clientHeight } = scrollableDiv;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
            
            // Only prevent if at boundaries
            if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
          } else {
            // Default: allow dropdown to handle it
            e.stopPropagation();
          }
        }
      };
      
      const preventPageScrollTouch = (e: TouchEvent) => {
        if (suggestionsRef.current?.contains(e.target as Node)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
      
      // Use capture phase to catch events early
      document.addEventListener("wheel", preventPageScrollWheel, { passive: false, capture: true });
      document.addEventListener("touchmove", preventPageScrollTouch, { passive: false, capture: true });
      
      return () => {
        document.removeEventListener("wheel", preventPageScrollWheel, true);
        document.removeEventListener("touchmove", preventPageScrollTouch, true);
      };
    }
  }, [showSuggestions]);

  // Close suggestions when clicking outside (but allow clicks inside)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };

    // Use capture phase to ensure we catch it early
    document.addEventListener("mousedown", handleClickOutside, true);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, []);

  const handleSuggestionClick = (productId: number) => {
    console.log('handleSuggestionClick called with:', productId);
    setSearchQuery("");
    setShowSuggestions(false);
    // Small delay to ensure state updates
    setTimeout(() => {
      navigate(`/vendor/listings/${productId}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };
  
  // Render dropdown using portal to ensure it's above everything
  const renderDropdown = () => {
    if (!showSuggestions || searchQuery.trim().length === 0) return null;
    
    if (!searchInputRef.current) return null;
    
    const inputRect = searchInputRef.current.getBoundingClientRect();
    const dropdownContent = (
      <div
        ref={suggestionsRef}
        className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
        style={{
          top: `${inputRect.bottom + 8}px`,
          left: `${inputRect.left}px`,
          width: `${inputRect.width}px`,
          maxHeight: `${dropdownMaxHeight}px`,
          zIndex: 999999,
          position: 'fixed',
          transform: 'translateZ(0)',
          isolation: 'isolate',
          pointerEvents: 'auto',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {isSearching ? (
          <div className="p-4 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            <div className="text-sm text-gray-400 mt-2">Searching...</div>
          </div>
        ) : searchSuggestions.length > 0 ? (
          <div 
            className="overflow-y-auto"
            style={{ 
              maxHeight: `${dropdownMaxHeight}px`,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(75 85 99) rgb(31 41 55)',
            }}
            onWheel={(e) => {
              const element = e.currentTarget;
              const delta = e.deltaY;
              const { scrollTop, scrollHeight, clientHeight } = element;
              
              // Calculate if we can scroll
              const canScrollUp = scrollTop > 0;
              const canScrollDown = scrollTop + clientHeight < scrollHeight;
              
              // If we can scroll in the direction requested, prevent default and scroll
              if ((delta > 0 && canScrollDown) || (delta < 0 && canScrollUp)) {
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop += delta;
              } else {
                // At boundaries, still prevent page scroll
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onMouseEnter={(e) => {
              // Ensure dropdown can receive scroll events
              e.currentTarget.style.overflowY = 'auto';
              if (suggestionsRef.current) {
                suggestionsRef.current.style.pointerEvents = 'auto';
              }
            }}
          >
            <div className="p-0">
              <div className="text-xs text-gray-400 pl-2 pr-3 py-2 mb-0 sticky top-0 bg-gray-900 z-10">
                Found {searchSuggestions.length} listing{searchSuggestions.length !== 1 ? 's' : ''}
              </div>
              {searchSuggestions.map((product) => (
                <div
                  key={product.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Clicking product:', product.id);
                    handleSuggestionClick(product.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(31 41 55)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  className="flex items-center space-x-3 pl-2 pr-3 py-3 rounded-lg cursor-pointer transition-all duration-200 select-none"
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    pointerEvents: 'auto',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <div className="flex-shrink-0">
                    {product.main_image ? (
                      <img
                        src={product.main_image}
                        alt={product.listing_title || product.headline}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {product.listing_title || product.headline}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {product.category?.name || 'Uncategorized'}
                      {product.status === 'approved' && (
                        <span className="ml-2 text-green-400">• Active</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {product.price} • {product.views_count} views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center">
            <Package className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <div className="text-sm text-gray-400">
              No listings found matching "{searchQuery}"
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Try a different search term
            </div>
          </div>
        )}
      </div>
    );
    
    return createPortal(dropdownContent, document.body);
  };

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
        {/* Search with Suggestions */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search your listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length > 0 && searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="pl-10 bg-white/10 border-gray-600 text-white placeholder-gray-400 backdrop-blur-sm"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
            )}
          </div>
          
          {/* Search Suggestions Dropdown - Rendered via Portal */}
          {renderDropdown()}
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
                      `${badgeCount || 0} unread`
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
                      handleNotificationDropdownOpen(false);
                      navigate('/vendor/notifications');
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
                {isLoadingNotifications && displayedNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Loading notifications...</p>
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  (() => {
                    const sortedNotifications = [...displayedNotifications].sort((a: any, b: any) => {
                      const timeA = new Date(a.time || 0).getTime();
                      const timeB = new Date(b.time || 0).getTime();
                      return timeB - timeA;
                    });
                    const displayList = sortedNotifications.slice(0, 10);
                    
                    return (
                      <>
                        {displayList.map((n: any) => (
                          <div
                      key={n.id} 
                            className="px-4 py-3 hover:bg-gray-800/50 cursor-pointer border-b border-gray-800/50 transition-colors"
                      onClick={() => handleNotificationClick(n)}
                    >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                n.unread 
                                  ? n.type === 'review' 
                                    ? 'bg-yellow-500' 
                                    : n.type === 'dispute' || n.type === 'listing_rejection'
                                    ? 'bg-red-500'
                                    : n.type === 'dispute_message'
                                    ? 'bg-orange-500'
                                    : n.type === 'dispute_resolved' || n.type === 'listing_approval'
                                    ? 'bg-green-500'
                                    : 'bg-blue-500'
                                  : 'bg-gray-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm text-white">{n.title}</p>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2">{n.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                      </div>
                      </div>
                    </div>
                        ))}
                        {sortedNotifications.length > 10 && (
                          <div className="px-4 py-3 border-t border-gray-700">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                                handleNotificationDropdownOpen(false);
                      navigate('/vendor/notifications');
                    }}
                              className="w-full text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                  >
                              View all ({sortedNotifications.length})
                  </Button>
                </div>
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
              className="bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50"
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
