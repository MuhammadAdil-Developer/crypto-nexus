import { useState, useEffect } from "react";
import {
  Home,
  Package,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Star,
  Megaphone,
  AlertTriangle,
  Wallet,
  Settings,
  HelpCircle,
  Store,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useVendorCounts } from "@/contexts/VendorCountsContext";
import { api } from "@/services/authService";
import { authService } from "@/services/authService";

interface VendorSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const VENDOR_NAV_CATEGORIES = [
  {
    title: "Dashboard",
    items: [
      { title: "Overview", icon: Home, href: "/vendor/dashboard", countKey: null }
    ]
  },
  {
    title: "Products",
    items: [
      { title: "Listings", icon: Package, href: "/vendor/listings", countKey: "listings" },
      { title: "Add Product", icon: Package, href: "/vendor/listings/add", countKey: null }
    ]
  },
  {
    title: "Sales",
    items: [
      { title: "Orders", icon: ShoppingCart, href: "/vendor/orders", countKey: "orders" },
      { title: "Messages", icon: MessageSquare, href: "/vendor/messages", countKey: "messages" }
    ]
  },
  {
    title: "Analytics",
    items: [
      { title: "Reports", icon: BarChart3, href: "/vendor/analytics", countKey: null },
      { title: "Reviews", icon: Star, href: "/vendor/reviews", countKey: "reviews" }
    ]
  },
  {
    title: "Support",
    items: [
      { title: "Disputes", icon: AlertTriangle, href: "/vendor/disputes", countKey: "disputes" },
      { title: "Tickets", icon: HelpCircle, href: "/vendor/support", countKey: "tickets" }
    ]
  },
  {
    title: "Finance",
    items: [
      { title: "Payouts", icon: Wallet, href: "/vendor/payouts", countKey: "payouts" },
      { title: "Refunds", icon: RefreshCw, href: "/vendor/refunds", countKey: "refunds" }
    ]
  },
  {
    title: "Settings",
    items: [
      { title: "Profile", icon: Settings, href: "/vendor/settings", countKey: null }
    ]
  }
];

export function VendorSidebar({ expanded, onExpandedChange }: VendorSidebarProps) {
  const location = useLocation();
  const { localCounts } = useVendorCounts();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Dashboard", "Products", "Sales"]);
  const [userData, setUserData] = useState({
    username: "",
    business_name: ""
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/profile/');
        if (response.data && response.data.success) {
          setUserData({
            username: response.data.data.username || "",
            business_name: response.data.data.business_name || ""
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const [username, setUsername] = useState<string>("Vendor");

  // Get current user's username
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && user.username) {
      setUsername(user.username);
    } else {
      // Fallback: try to get from localStorage directly
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.username) {
            setUsername(userData.username);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Get count for a specific count key
  const getCount = (countKey: string | null): number => {
    if (!countKey) return 0;
    return localCounts[countKey as keyof typeof localCounts] || 0;
  };

  // Get badge type based on count key
  const getBadgeType = (countKey: string | null): string | null => {
    if (!countKey) return null;
    const count = getCount(countKey);
    if (count === 0) return null;

    // Use consistent badge type (same color for all)
    return "accent"; // Using accent (blue) for all counts as requested
  };

  // Check if any child item in a category has a count
  const hasCategoryCount = (category: typeof VENDOR_NAV_CATEGORIES[0]): boolean => {
    return category.items.some(item => getCount(item.countKey) > 0);
  };

  return (
    <div
      className={cn(
        "vendor-sidebar-background border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-lg h-full",
        expanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Logo */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center">
          <Link to="/" className="flex items-center flex-shrink-0 pr-8 cursor-pointer">
            <img
              src="/images/logo.png"
              alt="AccountzClub Logo"
              className="h-10 w-auto"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                transform: 'scale(1.0) translateY(0px)',
                transformOrigin: 'left center'
              }}
            />
          </Link>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-2 overflow-y-auto mt-1">
        {VENDOR_NAV_CATEGORIES.map((category) => (
          <div key={category.title}>
            {expanded ? (
              <Collapsible
                open={expandedCategories.includes(category.title)}
                onOpenChange={() => toggleCategory(category.title)}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider hover:text-pink-600 transition-colors relative">
                  <span>{category.title}</span>
                  <div className="flex items-center gap-2">
                    {hasCategoryCount(category) && (
                      <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                    )}
                    {expandedCategories.includes(category.title) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href || (item.href !== "/vendor/dashboard" && location.pathname.startsWith(item.href));
                    const count = getCount(item.countKey);
                    const badgeType = getBadgeType(item.countKey);

                    return (
                      <Link key={item.href} to={item.href}>
                        <div
                          className={cn(
                            "relative group flex items-center px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer",
                            isActive
                              ? "text-pink-600 bg-pink-600/10"
                              : "text-white hover:bg-gray-800 hover:text-pink-600"
                          )}
                          data-testid={`vendor-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <div className="ml-3 flex items-center justify-between w-full">
                            <span className="font-medium">{item.title}</span>
                            {count > 0 && badgeType && (
                              <Badge
                                className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center transition-all duration-300 animate-in fade-in zoom-in"
                              >
                                {count > 99 ? "99+" : count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              // Collapsed view - show first item of each category
              category.items.slice(0, 1).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || (item.href !== "/vendor/dashboard" && location.pathname.startsWith(item.href));
                const hasCount = hasCategoryCount(category);

                return (
                  <Link key={item.href} to={item.href}>
                    <div
                      className={cn(
                        "relative group flex items-center px-3 py-3 rounded-lg transition-all duration-200 cursor-pointer",
                        isActive
                          ? "text-pink-600 bg-pink-600/10"
                          : "text-white hover:bg-gray-800 hover:text-pink-600"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />

                      {hasCount && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-600 rounded-full"></div>
                      )}

                      {/* Tooltip */}
                      <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-sm font-medium whitespace-nowrap">{category.title}</div>
                        {hasCount && (
                          <div className="text-xs text-gray-300 mt-1">New items</div>
                        )}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
            <Store className="text-white w-4 h-4" />
          </div>
          {expanded && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userData.business_name || userData.username || "Vendor"}
              </p>
              <p className="text-xs text-gray-400">Vendor Panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}