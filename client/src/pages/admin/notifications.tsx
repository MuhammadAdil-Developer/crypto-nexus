import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Star, AlertTriangle, Package, MessageSquare, RefreshCw, User, DollarSign, FileText, Shield, XCircle, CheckCircle } from "lucide-react";
import { useMessaging } from "@/contexts/MessagingContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import notificationService from "@/services/notificationService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCryptoAmountInString } from "@/lib/utils";

type NotificationType = 'all' | 'order' | 'payment' | 'message' | 'system' | 'listing_approval' | 'listing_rejection' | 'dispute' | 'payout' | 'security';

export default function AdminNotifications() {
  const { allNotifications, refreshNotifications, isLoading, setUnreadCount } = useMessaging();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');

  useEffect(() => {
    refreshNotifications();

    // Auto-refresh aggressively every 3 seconds
    const interval = setInterval(() => {
      refreshNotifications(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const filteredNotifications = (() => {
    let filtered = allNotifications;

    // Filter by read/unread
    if (filter === 'unread') {
      filtered = filtered.filter(n => n.unread);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    return filtered;
  })();

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
        return <Package className="w-5 h-5 text-white" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-white" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-white" />;
      case 'system':
        return <Bell className="w-5 h-5 text-white" />;
      case 'listing_approval':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'listing_rejection':
        return <XCircle className="w-5 h-5 text-white" />;
      case 'dispute':
        return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'payout':
        return <DollarSign className="w-5 h-5 text-white" />;
      case 'security':
        return <Shield className="w-5 h-5 text-white" />;
      default:
        return <Bell className="w-5 h-5 text-white" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-500';
      case 'payment':
        return 'bg-green-500';
      case 'message':
        return 'bg-purple-500';
      case 'system':
        return 'bg-gray-500';
      case 'listing_approval':
        return 'bg-green-500';
      case 'listing_rejection':
        return 'bg-red-500';
      case 'dispute':
        return 'bg-orange-500';
      case 'payout':
        return 'bg-emerald-500';
      case 'security':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-gray-400">Manage and view all your notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshNotifications(true)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
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

        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as NotificationType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="listing_approval">Listing Approvals</SelectItem>
            <SelectItem value="listing_rejection">Listing Rejections</SelectItem>
            <SelectItem value="dispute">Disputes</SelectItem>
            <SelectItem value="payout">Payouts</SelectItem>
            <SelectItem value="security">Security</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="space-y-3">
          {sortedNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer hover:bg-gray-800/50 transition-all border ${notification.unread ? 'border-blue-500/50 bg-blue-500/5' : 'border-gray-700'
                }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`${getNotificationColor(notification.type)} p-3 rounded-lg flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-white text-base">{formatCryptoAmountInString(notification.title)}</h3>
                          {notification.unread && (
                            <Badge variant="default" className="bg-blue-500 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        {/* Subtitle/Details Line */}
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">
                          {notification.orderId ? notification.orderId : formatCryptoAmountInString(notification.message)}
                        </p>

                        {/* Additional Details */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {notification.type}
                          </span>
                          <span>{notification.time}</span>
                          {notification.productTitle && (
                            <span className="truncate max-w-[200px]" title={notification.productTitle}>
                              {notification.productTitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {notification.unread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
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
  );
}


