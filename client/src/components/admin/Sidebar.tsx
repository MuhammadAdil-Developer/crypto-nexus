import { Shield, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:w-16 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-surface border-r border-border">
        {/* Logo/Brand - Collapsed */}
        <div className="flex items-center flex-shrink-0 px-3 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center mx-auto">
            <Shield className="text-bg w-4 h-4" />
          </div>
        </div>
        
        {/* Navigation - Icons Only */}
        <nav className="flex-1 px-2 space-y-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "relative group flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-200 cursor-pointer",
                    isActive 
                      ? "bg-accent text-bg shadow-lg" 
                      : "text-gray-400 hover:bg-surface-2 hover:text-white"
                  )}
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  title={item.title}
                >
                  <Icon className="w-5 h-5" />
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full"></div>
                  )}
                  
                  {/* Tooltip */}
                  <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-card border border-border px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="text-sm font-medium text-white whitespace-nowrap">{item.title}</div>
                    {item.badge && (
                      <div className="text-xs text-gray-400 mt-1">{item.badge.text}</div>
                    )}
                    {/* Arrow */}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-card border-l border-t border-border rotate-45"></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile - Collapsed */}
        <div className="flex-shrink-0 flex border-t border-border p-3">
          <div className="relative group flex items-center justify-center w-10 h-10 mx-auto">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-accent/30 transition-colors">
              <User className="text-accent w-4 h-4" />
            </div>
            
            {/* User Tooltip */}
            <div className="absolute left-14 bottom-0 bg-card border border-border px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-sm font-medium text-white whitespace-nowrap">admin_user</div>
              <div className="text-xs text-gray-400">Super Admin</div>
              {/* Arrow */}
              <div className="absolute left-0 bottom-2 transform -translate-x-1 w-2 h-2 bg-card border-l border-b border-border rotate-45"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
