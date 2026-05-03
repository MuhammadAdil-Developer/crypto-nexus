import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Star, AlertTriangle, Package, MessageSquare, RefreshCw, CheckCircle, XCircle, Shield } from "lucide-react";
import { useMessaging } from "@/contexts/MessagingContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import notificationService from "@/services/notificationService";

export default function VendorNotifications() {
  const { allNotifications, refreshNotifications, isLoading, setUnreadCount } = useMessaging();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'messages' | 'reviews' | 'disputes' | 'listings'>('all');

  useEffect(() => {
    refreshNotifications(true);

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

  const getFilteredNotifications = () => {
    let filtered = allNotifications;

    if (filter === 'unread') {
      filtered = filtered.filter(n => n.unread);
    } else if (filter === 'messages') {
      filtered = filtered.filter(n => n.type === 'message');
    } else if (filter === 'reviews') {
      filtered = filtered.filter(n => n.type === 'review');
    } else if (filter === 'disputes') {
      filtered = filtered.filter(n => n.type === 'dispute' || n.type === 'dispute_message' || n.type === 'dispute_resolved');
    } else if (filter === 'listings') {
      filtered = filtered.filter(n => n.type === 'listing_approval' || n.type === 'listing_rejection');
    }

    // Sort by time (latest first)
    return filtered.sort((a, b) => {
      const timeA = new Date(a.time || 0).getTime();
      const timeB = new Date(b.time || 0).getTime();
      return timeB - timeA;
    });
  };

  const sortedNotifications = getFilteredNotifications();

  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'message' && notification.productId) {
      navigate('/vendor/messages');
    } else if (notification.type === 'review' && notification.productId) {
      navigate('/vendor/products');
    } else if (notification.type === 'dispute' || notification.type === 'dispute_message') {
      navigate('/vendor/disputes');
    } else if (notification.type === 'listing_approval' || notification.type === 'listing_rejection') {
      navigate('/vendor/listings');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-theme-cyan" />;
      case 'review':
        return <Star className="w-5 h-5 text-theme-cyan" />;
      case 'listing_approval':
        return <CheckCircle className="w-5 h-5 text-theme-cyan" />;
      case 'listing_rejection':
        return <XCircle className="w-5 h-5 text-theme-red" />;
      case 'dispute':
        return <AlertTriangle className="w-5 h-5 text-theme-red" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-theme-cyan/10 border-theme-cyan/20';
      case 'review':
        return 'bg-theme-cyan/10 border-theme-cyan/20';
      case 'listing_approval':
        return 'bg-theme-cyan/10 border-theme-cyan/20';
      case 'listing_rejection':
        return 'bg-theme-red/10 border-theme-red/20';
      case 'dispute':
        return 'bg-theme-red/10 border-theme-red/20';
      case 'security':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const messageCount = allNotifications.filter(n => n.type === 'message').length;
  const reviewCount = allNotifications.filter(n => n.type === 'review').length;
  const disputeCount = allNotifications.filter(n => n.type === 'dispute' || n.type === 'dispute_message' || n.type === 'dispute_resolved').length;
  const listingCount = allNotifications.filter(n => n.type === 'listing_approval' || n.type === 'listing_rejection').length;
  const unreadCount = allNotifications.filter(n => n.unread).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">Manage your vendor notifications</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshNotifications(true)}
          disabled={isLoading}
          className="border-gray-600"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-2xl font-bold text-white mt-1">{allNotifications.length}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Unread</p>
                <p className="text-2xl font-bold text-theme-cyan mt-1">{unreadCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-theme-cyan/50 group-hover:text-theme-cyan transition-colors" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Messages</p>
                <p className="text-2xl font-bold text-theme-cyan mt-1">{messageCount}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-theme-cyan/50 group-hover:text-theme-cyan transition-colors" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Reviews</p>
                <p className="text-2xl font-bold text-theme-cyan mt-1">{reviewCount}</p>
              </div>
              <Star className="w-8 h-8 text-theme-cyan/50 group-hover:text-theme-cyan transition-colors" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden group hover:border-red-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Disputes</p>
                <p className="text-2xl font-bold text-theme-red mt-1">{disputeCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-theme-red/50 group-hover:text-theme-red transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-gray-900 border-gray-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-gray-800">All</TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-gray-800">Unread</TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-gray-800">Messages</TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-gray-800">Reviews</TabsTrigger>
          <TabsTrigger value="disputes" className="data-[state=active]:bg-gray-800">Disputes</TabsTrigger>
          <TabsTrigger value="listings" className="data-[state=active]:bg-gray-800">Listings</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {/* Notifications List */}
          {isLoading && sortedNotifications.length === 0 ? (
            <Card className="border-gray-700 bg-gray-900">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-theme-cyan mx-auto mb-4" />
                <p className="text-gray-400">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : sortedNotifications.length === 0 ? (
            <Card className="border-gray-700 bg-gray-900">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-gray-600" />
                </div>
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
                  className={`border-gray-700/50 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-lg hover:bg-gray-800/60 transition-all cursor-pointer ${getNotificationColor(notification.type)} ${notification.unread ? 'border-l-4 border-l-cyan-500' : ''}`}
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
                            <Badge className="bg-theme-cyan text-black font-bold text-xs uppercase">New</Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
