import { useState } from "react";
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
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VendorSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const VENDOR_NAV_CATEGORIES = [
  {
    title: "Dashboard",
    items: [
      { title: "Overview", icon: Home, href: "/vendor/dashboard", badge: null }
    ]
  },
  {
    title: "Products",
    items: [
      { title: "Listings", icon: Package, href: "/vendor/listings", badge: { text: "12", type: "success" } },
      { title: "Add Product", icon: Package, href: "/vendor/listings/add", badge: null }
    ]
  },
  {
    title: "Sales",
    items: [
      { title: "Orders", icon: ShoppingCart, href: "/vendor/orders", badge: { text: "8", type: "accent" } },
      { title: "Messages", icon: MessageSquare, href: "/vendor/messages", badge: { text: "3", type: "danger" } }
    ]
  },
  {
    title: "Analytics",
    items: [
      { title: "Reports", icon: BarChart3, href: "/vendor/analytics", badge: null },
      { title: "Reviews", icon: Star, href: "/vendor/reviews", badge: { text: "5", type: "warning" } }
    ]
  },
  // Commented out Marketing section temporarily
  // {
  //   title: "Marketing",
  //   items: [
  //     { title: "Advertisements", icon: Megaphone, href: "/vendor/ads", badge: null }
  //   ]
  // },
  {
    title: "Support",
    items: [
      { title: "Disputes", icon: AlertTriangle, href: "/vendor/disputes", badge: { text: "1", type: "danger" } },
      { title: "Tickets", icon: HelpCircle, href: "/vendor/support", badge: null }
    ]
  },
  {
    title: "Finance",
    items: [
      { title: "Payouts", icon: Wallet, href: "/vendor/payouts", badge: null }
    ]
  },
  {
    title: "Settings",
    items: [
      { title: "Profile", icon: Settings, href: "/vendor/settings", badge: null }
    ]
  }
];

export function VendorSidebar({ expanded, onExpandedChange }: VendorSidebarProps) {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Dashboard", "Products", "Sales"]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div 
      className={cn(
        "vendor-sidebar-background border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col shadow-lg",
        expanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center">
          <Link href="/" className="flex items-center flex-shrink-0 pr-8">
              <img 
                src="/images/logo.png" 
                alt="AccountzClub Logo" 
                className="h-16 w-auto"
                style={{ 
                  imageRendering: '-webkit-optimize-contrast',
                  transform: 'scale(1.5) translateY(3px)',
                  transformOrigin: 'left center'
                }}
              />
            </Link>
      
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
        {VENDOR_NAV_CATEGORIES.map((category) => (
          <div key={category.title}>
            {expanded ? (
              <Collapsible
                open={expandedCategories.includes(category.title)}
                onOpenChange={() => toggleCategory(category.title)}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider hover:text-pink-600 transition-colors">
                  <span>{category.title}</span>
                  {expandedCategories.includes(category.title) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href || (item.href !== "/vendor/dashboard" && location.pathname.startsWith(item.href));
                    
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
                            {item.badge && (
                              <Badge 
                                className="bg-pink-600 text-white text-xs px-2 py-1 rounded-full"
                              >
                                {item.badge.text}
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
                      
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-600 rounded-full"></div>
                      )}
                      
                      {/* Tooltip */}
                      <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-sm font-medium whitespace-nowrap">{category.title}</div>
                        {item.badge && (
                          <div className="text-xs text-gray-300 mt-1">{item.badge.text} new</div>
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
            <div className="ml-3">
              <p className="text-sm font-medium text-white">CryptoAccountsPlus</p>
              <p className="text-xs text-gray-400">Verified Vendor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}