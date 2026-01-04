import { useState, useEffect } from "react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Star, AlertTriangle, Package, MessageSquare, RefreshCw, Shield } from "lucide-react";
import { useMessaging } from "@/contexts/MessagingContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import notificationService from "@/services/notificationService";

export default function BuyerNotifications() {
  const { allNotifications, refreshNotifications, isLoading, setUnreadCount } = useMessaging();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    refreshNotifications();

    // Simple: When page opens, mark all as read and set count to 0
    const markAllRead = async () => {
      try {
        await notificationService.markAllAsRead();
        // Immediately set unread count to 0
        setUnreadCount(0);
        // Refresh to update notification state
        refreshNotifications(true);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    markAllRead();
  }, []);

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
    if (notification.type === 'vendor_invitation' && notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.type === 'message' && notification.productId) {
      navigate('/buyer/messages');
    } else if (notification.type === 'review' && notification.orderId) {
      navigate('/buyer/orders');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case 'review':
        return <Star className="w-5 h-5 text-yellow-400" />;
      case 'vendor_invitation':
        return <Package className="w-5 h-5 text-purple-400" />;
      case 'dispute':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500/20 border-blue-500/30';
      case 'review':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'vendor_invitation':
        return 'bg-purple-500/20 border-purple-500/30';
      case 'dispute':
        return 'bg-red-500/20 border-red-500/30';
      case 'security':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-gray-400 mt-1">Stay updated with your activity</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshNotifications}
              disabled={isLoading}
              className="border-gray-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? '' : 'border-gray-600'}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
                className={filter === 'unread' ? '' : 'border-gray-600'}
              >
                Unread
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Notifications</p>
                  <p className="text-2xl font-bold text-white mt-1">{allNotifications.length}</p>
                </div>
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Unread</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {allNotifications.filter(n => n.unread).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-700 bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Messages</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {allNotifications.filter(n => n.type === 'message').length}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        {isLoading && sortedNotifications.length === 0 ? (
          <Card className="border-gray-700 bg-gray-900">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : sortedNotifications.length === 0 ? (
          <Card className="border-gray-700 bg-gray-900">
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No notifications found</p>
              <p className="text-gray-500 text-sm mt-2">
                {filter === 'unread' ? 'All notifications have been read' : 'You\'re all caught up!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border-gray-700 bg-gray-900 hover:bg-gray-800/50 transition-all cursor-pointer ${getNotificationColor(notification.type)} ${notification.unread ? 'border-l-4' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{notification.title}</h3>
                        {notification.unread && (
                          <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{notification.time}</p>
                        {notification.productTitle && (
                          <p className="text-xs text-gray-500">Product: {notification.productTitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
