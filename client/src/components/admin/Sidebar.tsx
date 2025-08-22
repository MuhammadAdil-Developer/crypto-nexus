import { useState } from "react";
import { Shield, User, ChevronDown, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ADMIN_GROUPED_NAV } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const isCategoryExpanded = (category: string) => expandedCategories.includes(category);
  
  const isCategoryActive = (items: any[]) => {
    return items.some(item => 
      location === item.href || (item.href !== "/admin" && location.startsWith(item.href))
    );
  };

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
          {ADMIN_GROUPED_NAV.map((group) => {
            const CategoryIcon = group.icon;
            const isExpanded = isCategoryExpanded(group.category);
            const isCatActive = isCategoryActive(group.items);
            
            return (
              <div key={group.category} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(group.category)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    isCatActive
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "text-gray-300 hover:bg-surface-2 hover:text-white"
                  )}
                  data-testid={`category-${group.category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CategoryIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">{group.category}</span>
                  <ChevronRight 
                    className={cn(
                      "w-4 h-4 ml-2 flex-shrink-0 transition-transform duration-300 ease-in-out",
                      isExpanded ? "transform rotate-90" : "transform rotate-0"
                    )}
                  />
                </button>
                
                {/* Category Items */}
                <div 
                  className={cn(
                    "ml-4 border-l border-border pl-4 overflow-hidden transition-all duration-500 ease-in-out",
                    isExpanded 
                      ? "max-h-96 opacity-100 transform translate-y-0" 
                      : "max-h-0 opacity-0 transform -translate-y-2"
                  )}
                >
                  <div className="space-y-1 py-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
                      
                      return (
                        <Link key={item.href} href={item.href}>
                          <span 
                            className={cn(
                              "nav-item cursor-pointer text-sm transition-all duration-300 ease-in-out",
                              isActive ? "nav-item-active" : "nav-item-inactive"
                            )}
                            data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <ItemIcon className="w-3.5 h-3.5 mr-2" />
                            {item.title}
                            {item.badge && (
                              <StatusBadge
                                status={item.badge.text}
                                type={item.badge.type as any}
                                className="ml-auto text-xs"
                              />
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
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
