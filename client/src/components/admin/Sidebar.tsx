import { useState } from "react";
import { Shield, User, ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ADMIN_GROUPED_NAV } from "@/lib/constants";
import { authService } from "@/services/authService";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useAdminCounts } from "@/contexts/AdminCountsContext";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const location = useLocation();
  const { localCounts } = useAdminCounts();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const currentUser = authService.getCurrentUser();

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
      location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href))
    );
  };

  // Get count for a navigation item based on its href
  const getCountForItem = (href: string): number => {
    if (href === "/admin/users") return localCounts.users;
    if (href === "/admin/vendors") return localCounts.vendors;
    if (href === "/admin/listings") return localCounts.listings;
    if (href === "/admin/orders") return localCounts.orders;
    if (href === "/admin/disputes") return localCounts.disputes;
    if (href === "/admin/messages") return localCounts.messages;
    if (href === "/admin/tickets") return localCounts.tickets;
    if (href === "/admin/payouts") return localCounts.payouts;
    if (href === "/admin/commissions") return localCounts.commissions;
    return 0;
  };

  // Get badge type based on count and item type
  const getBadgeType = (href: string, count: number): "accent" | "warning" | "danger" | "success" | null => {
    if (count === 0) return null;
    if (href === "/admin/disputes") return "danger";
    if (href === "/admin/tickets") return "warning";
    if (href === "/admin/listings") return "success";
    if (href === "/admin/orders") return "accent";
    if (href === "/admin/messages") return "accent";
    if (href === "/admin/vendors") return "warning";
    if (href === "/admin/payouts") return "warning";
    return "accent";
  };

  // Check if any child item in a category has a count
  const hasCategoryCount = (group: any): boolean => {
    return group.items.some((item: any) => {
      const count = getCountForItem(item.href);
      return count > 0;
    });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:h-full">
        <div className="flex flex-col h-full bg-surface border-r border-border">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-border">
            <Link to="/" className="flex items-center flex-shrink-0 cursor-pointer">
              <img
                src="/images/logo.png"
                alt="AccountzClub Logo"
                className="h-10 w-auto"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  transformOrigin: 'left center'
                }}
              />
            </Link>
          </div>

          {/* Navigation - Takes available space */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {ADMIN_GROUPED_NAV.map((group) => {
              const CategoryIcon = group.icon;
              const isExpanded = isCategoryExpanded(group.category);
              const isCatActive = isCategoryActive(group.items);
              const categoryHasCount = hasCategoryCount(group);

              return (
                <div key={group.category} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(group.category)}
                    className={cn(
                      "w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                      isCatActive
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "text-gray-300 hover:bg-surface-2 hover:text-white"
                    )}
                    data-testid={`category-${group.category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <CategoryIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-left whitespace-nowrap">{group.category}</span>
                    <div className="flex items-center gap-2">
                      {categoryHasCount && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 ml-2 flex-shrink-0 transition-transform duration-300 ease-in-out",
                          isExpanded ? "transform rotate-90" : "transform rotate-0"
                        )}
                      />
                    </div>
                  </button>

                  {/* Category Items */}
                  <div
                    className={cn(
                      "ml-6 border-l border-border pl-4 overflow-hidden transition-all duration-500 ease-in-out",
                      isExpanded
                        ? "max-h-96 opacity-100 transform translate-y-0"
                        : "max-h-0 opacity-0 transform -translate-y-2"
                    )}
                  >
                    <div className="space-y-1 py-2">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
                        const count = getCountForItem(item.href);
                        const badgeType = getBadgeType(item.href, count);

                        return (
                          <Link key={item.href} to={item.href}>
                            <span
                              className={cn(
                                "nav-item cursor-pointer text-sm transition-all duration-300 ease-in-out px-3 py-2 rounded-md flex items-center justify-between w-full",
                                isActive ? "nav-item-active" : "nav-item-inactive"
                              )}
                              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <div className="flex items-center whitespace-nowrap">
                                <ItemIcon className="w-4 h-4 mr-3" />
                                {item.title}
                              </div>
                              {count > 0 && badgeType && (
                                <Badge
                                  className={cn(
                                    "ml-auto text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5 transition-all duration-300 animate-in fade-in zoom-in",
                                    badgeType === "danger" && "bg-red-500 text-white",
                                    badgeType === "warning" && "bg-yellow-500 text-white",
                                    badgeType === "success" && "bg-green-500 text-white",
                                    badgeType === "accent" && "bg-blue-500 text-white"
                                  )}
                                >
                                  {count > 99 ? "99+" : count}
                                </Badge>
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

          {/* User Profile - Fixed at bottom */}
          <div className="flex-shrink-0 flex border-t border-border p-6 bg-surface">
            <div className="flex items-center w-full">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="text-accent w-5 h-5" />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-text truncate">{currentUser?.username || "Admin"}</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-accent hover:text-accent-2 transition-colors duration-200">Admin</p>
                  <button
                    onClick={() => {
                      authService.logout();
                      window.location.href = '/login';
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - Same structure but without hidden class */}
      <div className="md:hidden flex w-64 flex-col h-full">
        <div className="flex flex-col h-full bg-surface border-r border-border">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-border">
            <Link to="/" className="flex items-center flex-shrink-0 cursor-pointer">
              <img
                src="/images/logo.png"
                alt="AccountzClub Logo"
                className="h-10 w-auto"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  transformOrigin: 'left center'
                }}
              />
            </Link>
          </div>

          {/* Navigation - Takes available space */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {ADMIN_GROUPED_NAV.map((group) => {
              const CategoryIcon = group.icon;
              const isExpanded = isCategoryExpanded(group.category);
              const isCatActive = isCategoryActive(group.items);
              const categoryHasCount = hasCategoryCount(group);

              return (
                <div key={group.category} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(group.category)}
                    className={cn(
                      "w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                      isCatActive
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "text-gray-300 hover:bg-surface-2 hover:text-white"
                    )}
                    data-testid={`category-${group.category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <CategoryIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-left whitespace-nowrap">{group.category}</span>
                    <div className="flex items-center gap-2">
                      {categoryHasCount && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 ml-2 flex-shrink-0 transition-transform duration-300 ease-in-out",
                          isExpanded ? "transform rotate-90" : "transform rotate-0"
                        )}
                      />
                    </div>
                  </button>

                  {/* Category Items */}
                  <div
                    className={cn(
                      "ml-6 border-l border-border pl-4 overflow-hidden transition-all duration-500 ease-in-out",
                      isExpanded
                        ? "max-h-96 opacity-100 transform translate-y-0"
                        : "max-h-0 opacity-0 transform -translate-y-2"
                    )}
                  >
                    <div className="space-y-1 py-2">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
                        const count = getCountForItem(item.href);
                        const badgeType = getBadgeType(item.href, count);

                        return (
                          <Link key={item.href} to={item.href}>
                            <span
                              className={cn(
                                "nav-item cursor-pointer text-sm transition-all duration-300 ease-in-out px-3 py-2 rounded-md flex items-center justify-between w-full",
                                isActive ? "nav-item-active" : "nav-item-inactive"
                              )}
                              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <div className="flex items-center whitespace-nowrap">
                                <ItemIcon className="w-4 h-4 mr-3" />
                                {item.title}
                              </div>
                              {count > 0 && badgeType && (
                                <Badge
                                  className={cn(
                                    "ml-auto text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5 transition-all duration-300 animate-in fade-in zoom-in",
                                    badgeType === "danger" && "bg-red-500 text-white",
                                    badgeType === "warning" && "bg-yellow-500 text-white",
                                    badgeType === "success" && "bg-green-500 text-white",
                                    badgeType === "accent" && "bg-blue-500 text-white"
                                  )}
                                >
                                  {count > 99 ? "99+" : count}
                                </Badge>
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

          {/* User Profile - Fixed at bottom */}
          <div className="flex-shrink-0 flex border-t border-border p-6 bg-surface">
            <div className="flex items-center w-full">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="text-accent w-5 h-5" />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-text truncate">{currentUser?.username || "admin"}</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-accent transition-colors duration-200">Admin</p>
                  <button
                    onClick={() => {
                      authService.logout();
                      window.location.href = '/login';
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
