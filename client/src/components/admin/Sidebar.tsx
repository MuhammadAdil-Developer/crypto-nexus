import { Shield, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-surface border-r border-border">
        {/* Logo/Brand */}
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Shield className="text-bg w-4 h-4" />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-text">CryptoMarket</h1>
              <p className="text-xs text-muted">Admin Panel</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <span 
                  className={cn(
                    "nav-item cursor-pointer",
                    isActive ? "nav-item-active" : "nav-item-inactive"
                  )}
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.title}
                  {item.badge && (
                    <StatusBadge
                      status={item.badge.text}
                      type={item.badge.type as any}
                      className="ml-auto"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="flex-shrink-0 flex border-t border-border p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
              <User className="text-accent w-4 h-4" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-text">admin_user</p>
              <p className="text-xs text-muted">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
