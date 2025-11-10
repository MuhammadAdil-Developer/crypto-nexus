import { useState, useEffect } from "react";
import { Menu, ExternalLink, Bell, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMessaging } from "@/contexts/MessagingContext";

interface HeaderProps {
  breadcrumbs: { label: string; href?: string }[];
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export function Header({ breadcrumbs, sidebarOpen, setSidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadCount, notifications, allNotifications, refreshNotifications } = useMessaging();
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countReset, setCountReset] = useState(false);
  
  // Initialize local count from context (only when not reset)
  useEffect(() => {
    if (!countReset) {
      setLocalUnreadCount(unreadCount);
    }
  }, [unreadCount, countReset]);
  
  // Auto-refresh notifications periodically when dropdown is open
  useEffect(() => {
    if (dropdownOpen) {
      // Refresh immediately when dropdown opens
      refreshNotifications(true);
      // Set up periodic refresh every 10 seconds when dropdown is open
      const interval = setInterval(() => {
        refreshNotifications(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [dropdownOpen, refreshNotifications]);

  // When dropdown opens, mark all as read in backend and animate count to 0
  const handleDropdownOpen = async (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      try {
        // Mark all notifications as read in backend
        const notificationService = (await import('@/services/notificationService')).default;
        await notificationService.markAllAsRead();
        // Refresh notifications to get latest
        refreshNotifications(true);
        // Animate count to 0 immediately (visual only - notifications stay visible in dropdown)
        setLocalUnreadCount(0);
        setCountReset(true);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        // Still refresh and animate even if mark as read fails
        refreshNotifications(true);
        setLocalUnreadCount(0);
        setCountReset(true);
      }
    }
    // When dropdown closes, count stays at 0 until new notifications arrive
  };
  
  // When new notifications arrive via WebSocket, update count (even if reset)
  useEffect(() => {
    if (countReset && unreadCount > localUnreadCount) {
      // New notifications arrived after reset - show the new count
      setLocalUnreadCount(unreadCount);
      setCountReset(false);
    } else if (!countReset) {
      // Normal case: sync with context count
      setLocalUnreadCount(unreadCount);
    }
  }, [unreadCount, countReset]);

  return (
    <header className="bg-surface border-b border-border px-2 md:px-4 py-2 md:py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden hover:text-text flex-shrink-0"
            data-testid="mobile-menu-button"
            onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          
          {/* Breadcrumbs - Hide on very small screens */}
          <nav className="hidden sm:flex" data-testid="breadcrumbs">
            <ol className="flex items-center space-x-2 text-xs md:text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  {crumb.href ? (
                    <Link to={crumb.href}>
                      <span className="hover:text-text cursor-pointer truncate">{crumb.label}</span>
                    </Link>
                  ) : (
                    <span className="text-accent font-medium truncate">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          
          {/* Mobile: Show only current page title */}
          <div className="sm:hidden text-accent font-medium text-sm truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.label || 'Admin'}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-4 flex-shrink-0">
          {/* View Marketplace Button - Hide text on mobile */}
          <Link to="/">
            <span className="inline-flex items-center px-2 md:px-3 py-1.5 border border-border text-xs md:text-sm font-medium rounded-md hover:text-text hover:bg-surface-2 cursor-pointer">
              <ExternalLink className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">View Marketplace</span>
            </span>
          </Link>
          
          {/* Notifications */}
          <DropdownMenu onOpenChange={handleDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative hover:text-text transition-all"
                data-testid="notifications-button"
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5" />
                {localUnreadCount > 0 && (
                  <Badge 
                    className={`absolute -top-1 -right-1 min-w-4 h-4 md:min-w-5 md:h-5 bg-red-500 text-white text-[10px] md:text-xs p-0 flex items-center justify-center transition-all duration-300 ${
                      dropdownOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                    }`}
                  >
                    {localUnreadCount > 99 ? '99+' : localUnreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <h3 className="font-semibold text-white">Notifications</h3>
                <p className="text-sm text-gray-400">
                  {localUnreadCount} unread
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Show all notifications (both read and unread) - notifications never get removed */}
                {(!allNotifications || allNotifications.length === 0) ? (
                  <div className="p-4 text-center text-gray-400">
                    No notifications yet
                  </div>
                ) : (
                  allNotifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-800"
                      onClick={() => {
                        // Navigate but DON'T mark as read - count stays same
                        if (notification.actionUrl) {
                          navigate(notification.actionUrl);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-white truncate">{notification.title}</p>
                          <p className="text-sm text-gray-400 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <div className="p-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/notifications');
                  }}
                  className="w-full text-xs text-blue-400 hover:text-blue-300"
                >
                  View All ({allNotifications?.length || 0})
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Settings */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:text-text"
            data-testid="settings-button"
            onClick={() => navigate('/admin/settings')}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
