import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Star, AlertTriangle, Package, MessageSquare, RefreshCw } from "lucide-react";
import { useMessaging } from "@/contexts/MessagingContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import notificationService from "@/services/notificationService";

export default function AdminNotifications() {
  const { allNotifications, refreshNotifications, isLoading, setUnreadCount } = useMessaging();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    refreshNotifications();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshNotifications(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const filteredNotifications = filter === 'unread' 
    ? allNotifications.filter(n => n.unread)
    : allNotifications;

  // Sort by time (latest first)
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const timeA = new Date(a.time || 0).getTime();
    const timeB = new Date(b.time || 0).getTime();
    return timeB - timeA;
  });

  const handleNotificationClick = (notification: any) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-5 h-5" />;
      case 'message':
        return <MessageSquare className="w-5 h-5" />;
      case 'system':
        return <Bell className="w-5 h-5" />;
      case 'listing_approval':
        return <Star className="w-5 h-5" />;
      case 'listing_rejection':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-500';
      case 'message':
        return 'bg-green-500';
      case 'system':
        return 'bg-purple-500';
      case 'listing_approval':
        return 'bg-green-500';
      case 'listing_rejection':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">Manage and view all your notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshNotifications(true)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({allNotifications?.length || 0})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread ({allNotifications?.filter(n => n.unread).length || 0})
        </Button>
      </div>

      {isLoading && sortedNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : sortedNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-400">No notifications found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer hover:bg-gray-800 transition-colors ${
                notification.unread ? 'border-blue-500' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`${getNotificationColor(notification.type)} p-2 rounded-lg flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{notification.title}</h3>
                          {notification.unread && (
                            <Badge variant="default" className="bg-blue-500">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


