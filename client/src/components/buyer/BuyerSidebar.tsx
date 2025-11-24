import { useState } from "react";
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
  AlertTriangle
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useBuyerCounts } from "@/contexts/BuyerCountsContext";

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
    countKey: null as keyof { messages: number; orders: number; support: number } | null
  },
  {
    title: "Listings",
    icon: List,
    href: "/buyer/listings",
    countKey: null as keyof { messages: number; orders: number; support: number } | null
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/buyer/orders",
    countKey: "orders" as keyof { messages: number; orders: number; support: number }
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/buyer/messages",
    countKey: "messages" as keyof { messages: number; orders: number; support: number }
  },
  {
    title: "My Disputes",
    icon: AlertTriangle,
    href: "/buyer/my-disputes",
    countKey: null as keyof { messages: number; orders: number; support: number } | null
  },
  {
    title: "My Reviews",
    icon: User,
    href: "/buyer/my-reviews",
    countKey: null as keyof { messages: number; orders: number; support: number } | null
  },
  {
    title: "Wishlist",
    icon: Heart,
    href: "/buyer/wishlist",
    countKey: null as keyof { messages: number; orders: number; support: number } | null
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/buyer/settings",
    countKey: null as keyof { messages: number; orders: number; support: number } | null
  },
  {
    title: "Support",
    icon: HelpCircle,
    href: "/buyer/support",
    countKey: "support" as keyof { messages: number; orders: number; support: number }
  }
];

export function BuyerSidebar({ expanded, onExpandedChange, hasBanner = false }: BuyerSidebarProps) {
  const location = useLocation();
  const { localCounts } = useBuyerCounts();

  const getCount = (countKey: keyof { messages: number; orders: number; support: number } | null): number | null => {
    if (!countKey) return null;
    const count = localCounts[countKey];
    return count > 0 ? count : null;
  };

  const getBadgeColor = (title: string, count: number | null): string => {
    if (!count) return '';
    if (title === 'Messages') return 'bg-red-500'; // Red for Messages
    if (title === 'Orders' || title === 'Wishlist') return 'bg-blue-500'; // Light blue for Orders/Wishlist
    return 'bg-blue-500'; // Default blue
  };

  return (
    <div 
      className={cn(
        "buyer-sidebar-background border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-lg relative z-10",
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
                  "relative group flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "text-pink-600 bg-pink-600/10" 
                    : "text-white hover:bg-gray-800 hover:text-pink-600"
                )}
                data-testid={`buyer-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                
                {expanded ? (
                  <div className="ml-3 flex items-center justify-between w-full">
                    <span className="font-medium">{item.title}</span>
                    {count !== null && count > 0 && (
                      <Badge 
                        className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center transition-all duration-300 animate-in fade-in zoom-in"
                      >
                        {count > 99 ? '99+' : count}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <>
                    {count !== null && count > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-600 rounded-full"></div>
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
        <Link to="/vendor/apply">
          <div 
            className="relative group flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer text-white hover:bg-gray-800 hover:text-pink-600"
          >
            <Store className="w-5 h-5 flex-shrink-0" />
            
            {expanded ? (
              <div className="ml-3 flex items-center justify-between w-full">
                <span className="font-medium">Apply as Vendor</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            ) : (
              <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-sm font-medium whitespace-nowrap">Apply as Vendor</div>
                <div className="text-xs text-gray-300 mt-1">Start selling</div>
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
            <User className="text-white w-4 h-4" />
          </div>
          {expanded && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">crypto_buyer</p>
              <p className="text-xs text-gray-400">Premium Member</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
