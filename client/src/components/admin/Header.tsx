import { useState, useEffect } from "react";
import { Menu, ExternalLink, Bell, Settings, User, RefreshCw, ExternalLink as ExternalLinkIcon, MoreVertical } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  const { unreadCount, notifications, allNotifications, refreshNotifications, isLoading } = useMessaging();
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countReset, setCountReset] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'watching'>('direct');
  
  // Initialize local count from context (only when not reset)
  useEffect(() => {
    if (!countReset) {
      setLocalUnreadCount(unreadCount);
    }
  }, [unreadCount, countReset]);
  
  // Auto-refresh notifications aggressively - every 2 seconds
  useEffect(() => {
    // Always refresh every 2 seconds (aggressive approach)
    const interval = setInterval(() => {
      refreshNotifications(true);
    }, 2000);
    
    // Also refresh immediately when dropdown opens
    if (dropdownOpen) {
      refreshNotifications(true);
    }
    
    return () => clearInterval(interval);
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
          
          {/* Notifications - GitHub Style */}
          <DropdownMenu onOpenChange={handleDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative hover:text-text transition-all p-2"
                data-testid="notifications-button"
              >
                <Bell className="w-5 h-5 text-blue-400" />
                {localUnreadCount > 0 && (
                  <Badge 
                    className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] p-0 flex items-center justify-center rounded-full transition-all duration-300 ${
                      dropdownOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                    }`}
                  >
                    {localUnreadCount > 99 ? '99+' : localUnreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] p-0 bg-gray-900 border-gray-700">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white text-sm">Notifications</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-xs text-gray-400">Only show unread</span>
                    <Switch 
                      checked={showUnreadOnly}
                      onCheckedChange={setShowUnreadOnly}
                      className="h-4 w-7"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshNotifications(true);
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-800"
                    title="Refresh notifications"
                  >
                    <RefreshCw className={`w-3 h-3 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(false);
                      navigate('/admin/notifications');
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-800"
                    title="Open in new page"
                  >
                    <ExternalLinkIcon className="w-3 h-3 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(false);
                      navigate('/admin/notifications');
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-800"
                    title="View all notifications"
                  >
                    <MoreVertical className="w-3 h-3 text-gray-400" />
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('direct')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'direct'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Direct
                </button>
                <button
                  onClick={() => setActiveTab('watching')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'watching'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Watching
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-[320px] overflow-y-auto">
                {(() => {
                  const filtered = showUnreadOnly 
                    ? allNotifications.filter(n => n.unread)
                    : allNotifications;
                  
                  const displayNotifications = filtered.slice(0, 20);
                  
                  if (displayNotifications.length === 0) {
                    return (
                      <div className="p-8 text-center text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    );
                  }

                  // Group by time
                  const grouped: { [key: string]: typeof displayNotifications } = {};
                  displayNotifications.forEach(notif => {
                    const time = notif.time || 'Older';
                    const group = time.includes('hour') || time.includes('minute') || time === 'Just now' 
                      ? 'Today' 
                      : time.includes('Yesterday') 
                      ? 'Yesterday' 
                      : 'Older';
                    if (!grouped[group]) grouped[group] = [];
                    grouped[group].push(notif);
                  });

                  return Object.entries(grouped).map(([groupName, groupNotifications]) => (
                    <div key={groupName}>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-800/50">
                        {groupName}
                  </div>
                      {groupNotifications.map((notification) => (
                        <div
                      key={notification.id} 
                          className="px-4 py-3 hover:bg-gray-800/50 cursor-pointer border-b border-gray-800/50 transition-colors"
                      onClick={() => {
                        if (notification.actionUrl) {
                          navigate(notification.actionUrl);
                              setDropdownOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                            
                            {/* Content */}
                        <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white leading-snug">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-400 leading-snug mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                            </div>
                            
                            {/* Unread indicator */}
                            {notification.unread && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      ))}
                      </div>
                  ));
                })()}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-700">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/notifications');
                  }}
                  className="w-full text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                >
                  View all notifications
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
