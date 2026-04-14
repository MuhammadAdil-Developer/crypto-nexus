import { useState, useEffect } from "react";
import {
  Home,
  List,
  ShoppingCart,
  MessageSquare,
  Heart,
  Settings,
  HelpCircle,
  User,
  Store,
  ArrowRight,
  AlertTriangle,
  Wallet,
  RefreshCw
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useBuyerCounts } from "@/contexts/BuyerCountsContext";
import { authService } from "@/services/authService";
import { getImageUrl } from '@/config/api';

interface BuyerSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  hasBanner?: boolean;
}

const BUYER_NAV_ITEMS = [
  {
    title: "Home",
    icon: Home,
    href: "/buyer",
    countKey: null as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "Listings",
    icon: List,
    href: "/buyer/listings",
    countKey: null as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/buyer/orders",
    countKey: "orders" as keyof { messages: number; orders: number; support: number; billing: number; refunds: number }
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/buyer/messages",
    countKey: "messages" as keyof { messages: number; orders: number; support: number; billing: number; refunds: number }
  },
  {
    title: "My Disputes",
    icon: AlertTriangle,
    href: "/buyer/my-disputes",
    countKey: null as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "My Reviews",
    icon: User,
    href: "/buyer/my-reviews",
    countKey: null as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "Wishlist",
    icon: Heart,
    href: "/buyer/wishlist",
    countKey: null as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "Billing",
    icon: Wallet,
    href: "/buyer/billing",
    countKey: "billing" as keyof { messages: number; orders: number; support: number; billing: number; refunds: number }
  },
  {
    title: "Refund Requests",
    icon: RefreshCw,
    href: "/buyer/refund-requests",
    countKey: "refunds" as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/buyer/settings",
    countKey: null as keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null
  },
  {
    title: "Support",
    icon: HelpCircle,
    href: "/buyer/support",
    countKey: "support" as keyof { messages: number; orders: number; support: number; billing: number; refunds: number }
  }
];

export function BuyerSidebar({ expanded, onExpandedChange, hasBanner = false }: BuyerSidebarProps) {
  const location = useLocation();
  // Safely get counts with fallback - check if provider is available
  let localCounts: any = {};
  try {
    const counts = useBuyerCounts();
    localCounts = counts?.localCounts || {};
  } catch (error) {
    // Provider not available, use empty counts - this should not happen in normal flow
    console.warn('BuyerCountsProvider not available, using empty counts');
  }
  const [username, setUsername] = useState<string>("Buyer");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isVendorApproved, setIsVendorApproved] = useState(false);
  const [isApplicationPending, setIsApplicationPending] = useState(false);

  // Get current user's username and vendor status
  useEffect(() => {
    fetchUserStatus();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchUserStatus();
    };

    window.addEventListener('profileUpdate', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdate', handleProfileUpdate);
    };
  }, []);

  const fetchUserStatus = async () => {
    const user = authService.getCurrentUser();
    if (user) {
      setUsername(user.username);

      // Initial check from local storage
      if (user.user_type === 'vendor') {
        setIsVendorApproved(true);
      }

      // Deep check from backend to see if status changed and get profile pic
      try {
        const profileRes = await authService.getProfile();
        if (profileRes.success && profileRes.data) {
          const latestUser = profileRes.data;
          setProfilePic(latestUser.profile_picture || null);

          // Update local storage to keep it in sync
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...currentUser, ...latestUser }));

          if (latestUser.user_type === 'vendor') {
            setIsVendorApproved(true);
          }
        }

        // Check application status
        if (!isVendorApproved) {
          const vendorStatus = await authService.checkVendorStatus();
          if (vendorStatus.applicationStatus?.toLowerCase() === 'pending') {
            setIsApplicationPending(true);
          }
        }
      } catch (error) {
        console.error('Error syncing user status in BuyerSidebar:', error);
      }
    } else {
      // Fallback: try to get from localStorage directly
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.username) {
            setUsername(userData.username);
          }
          if (userData.user_type === 'vendor') {
            setIsVendorApproved(true);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  };

  const getCount = (countKey: keyof { messages: number; orders: number; support: number; billing: number; refunds: number } | null): number | null => {
    if (!countKey) return null;
    const count = localCounts[countKey];
    return count > 0 ? count : null;
  };

  const getBadgeColor = (title: string, count: number | null): string => {
    if (!count) return '';
    if (title === 'Messages') return 'bg-theme-red text-white'; // Red for Messages
    return 'bg-theme-cyan text-black'; // Cyan for others
  };

  return (
    <div
      className={cn(
        "buyer-sidebar-background border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-lg relative z-10 h-full",
        expanded ? "w-64" : "w-16",
        hasBanner ? "pt-16" : ""
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Logo */}
      <div className="px-3 py-2 border-b border-gray-800 relative z-[100] bg-transparent" style={{ isolation: 'isolate' }}>
        <div className="flex items-center relative z-[100]">
          <Link to="/" className="flex items-center flex-shrink-0 pr-8 cursor-pointer relative z-[100]" style={{ filter: 'none', backdropFilter: 'none', isolation: 'isolate' }}>
            <img
              src="/images/logo.png"
              alt="AccountzClub Logo"
              className="h-10 w-auto relative z-[100]"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                transform: 'scale(1.0) translateY(0px)',
                transformOrigin: 'left center',
                position: 'relative',
                zIndex: 100,
                filter: 'none !important',
                backdropFilter: 'none !important',
                WebkitBackdropFilter: 'none !important',
                isolation: 'isolate',
                willChange: 'auto'
              }}
            />
          </Link>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {BUYER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || (item.href !== "/buyer" && location.pathname.startsWith(item.href));
          const count = getCount(item.countKey);
          const badgeColor = getBadgeColor(item.title, count);

          return (
            <Link key={item.href} to={item.href}>
              <div
                className={cn(
                  "relative group flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer overflow-hidden",
                  isActive
                    ? "text-theme-red bg-theme-red/10"
                    : "text-white hover:text-theme-red hover:bg-gray-800/40"
                )}
                data-testid={`buyer-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {/* Active state vertical line indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-theme-red rounded-full shadow-[0_0_8px_rgba(166,3,62,0.6)]" />
                )}
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110", isActive ? "text-theme-red" : "text-white")} />

                {expanded ? (
                  <div className="ml-3 flex items-center justify-between w-full">
                    <span className={cn("font-medium transition-colors", isActive ? "text-theme-red font-semibold" : "")}>{item.title}</span>
                    {count !== null && count > 0 && (
                      <Badge
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0 min-w-[18px] h-4.5 flex items-center justify-center rounded-md border-none shadow-md",
                          badgeColor
                        )}
                      >
                        {count > 99 ? '99+' : count}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <>
                    {count !== null && count > 0 && (
                      <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 shadow-sm", item.title === 'Messages' ? 'bg-theme-red' : 'bg-theme-cyan')}></div>
                    )}

                    {/* Tooltip */}
                    <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="text-sm font-medium whitespace-nowrap">{item.title}</div>
                      {count !== null && count > 0 && (
                        <div className="text-xs text-gray-300 mt-1">{count} new</div>
                      )}
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Apply as Vendor Section */}
      <div className="p-2 border-t border-gray-800">
        <Link to={isVendorApproved ? "/vendor" : (isApplicationPending ? "/vendor/apply/success" : "/vendor/apply")}>
          <div
            className="relative group flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer text-white hover:bg-gray-800/40 hover:text-theme-red"
          >
            <Store className="w-5 h-5 flex-shrink-0 group-hover:text-theme-red" />

            {expanded ? (
              <div className="ml-3 flex items-center justify-between w-full">
                <span className="font-medium group-hover:text-theme-red transition-colors">
                  {isVendorApproved ? "Go to Vendor Panel" : (isApplicationPending ? "Application Pending" : "Apply as Vendor")}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:text-theme-red transition-transform group-hover:translate-x-1" />
              </div>
            ) : (
              <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-sm font-medium whitespace-nowrap">
                  {isVendorApproved ? "Go to Vendor Panel" : (isApplicationPending ? "Application Pending" : "Apply as Vendor")}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {isVendorApproved ? "Full Dashboard Access" : (isApplicationPending ? "Under Review" : "Start selling today")}
                </div>
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
              </div>
            )}
          </div>
        </Link>
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-[#A6033E] via-[#8a0234] to-[#70022a] rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_12px_rgba(166,3,62,0.3)] overflow-hidden">
            {profilePic ? (
              <img src={getImageUrl(profilePic)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="text-white w-4 h-4 shadow-sm" />
            )}
          </div>
          {expanded && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">{username}</p>
              <p className="text-xs text-gray-400">Buyer Panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
