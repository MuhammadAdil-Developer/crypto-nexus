import { useState } from "react";
import { 
  Home, 
  List, 
  ShoppingCart, 
  MessageSquare, 
  Heart, 
  Settings, 
  HelpCircle,
  User
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BuyerSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const BUYER_NAV_ITEMS = [
  {
    title: "Home",
    icon: Home,
    href: "/buyer",
    badge: null
  },
  {
    title: "Listings",
    icon: List,
    href: "/buyer/listings",
    badge: null
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/buyer/orders",
    badge: { text: "3", type: "accent" }
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/buyer/messages",
    badge: { text: "5", type: "danger" }
  },
  {
    title: "Wishlist",
    icon: Heart,
    href: "/buyer/wishlist",
    badge: { text: "12", type: "success" }
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/buyer/settings",
    badge: null
  },
  {
    title: "Support",
    icon: HelpCircle,
    href: "/buyer/support",
    badge: null
  }
];

export function BuyerSidebar({ expanded, onExpandedChange }: BuyerSidebarProps) {
  const [location] = useLocation();

  return (
    <div 
      className={cn(
        "bg-gray-950 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col",
        expanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <User className="text-white w-4 h-4" />
          </div>
          {expanded && (
            <div className="ml-3 transition-opacity duration-200">
              <h1 className="text-lg font-bold text-white">CryptoMarket</h1>
              <p className="text-xs text-gray-400">Buyer Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {BUYER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/buyer" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "relative group flex items-center px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
                data-testid={`buyer-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                
                {expanded ? (
                  <div className="ml-3 flex items-center justify-between w-full">
                    <span className="font-medium">{item.title}</span>
                    {item.badge && (
                      <Badge 
                        variant={item.badge.type === 'danger' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {item.badge.text}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <>
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="text-sm font-medium whitespace-nowrap">{item.title}</div>
                      {item.badge && (
                        <div className="text-xs text-gray-300 mt-1">{item.badge.text} new</div>
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

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <User className="text-white w-4 h-4" />
          </div>
          {expanded && (
            <div className="ml-3">
              <p className="text-sm font-medium text-white">crypto_buyer</p>
              <p className="text-xs text-gray-400">Premium Member</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}