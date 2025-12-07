import { useState, useEffect } from "react";
import { BuyerSidebar } from "./BuyerSidebar";
import { BuyerHeader } from "./BuyerHeader";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { PendingOrderProvider, usePendingOrder } from "@/contexts/PendingOrderContext";
import { Button } from "@/components/ui/button";
import { Clock, Copy, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface BuyerLayoutProps {
  children: React.ReactNode;
  hasBanner?: boolean;
}

function PendingOrderBanner() {
  const { activeOrder, timeRemaining, pendingOrdersCount } = usePendingOrder();
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    // Basic fallback for unsecure contexts (HTTP)
    if (!navigator.clipboard && document.execCommand) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast({
            title: "Copied!",
            description: "Payment address copied",
          });
        }
      } catch (err) {
        // fail silently
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Payment address copied to clipboard",
      });
    }, () => {
      toast({
        title: "Error",
        description: "Failed to copy payment address",
        variant: "destructive"
      });
    });
  };

  if (!activeOrder || timeRemaining <= 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-b border-blue-700/50 text-white" style={{ position: 'fixed', top: 0 }}>
      <div className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 sm:flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap text-sm sm:text-base">Payment Required:</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm min-w-0">
              <span className="whitespace-nowrap">
                ID: <span className="font-mono">{activeOrder.order_id}</span>
              </span>
              <span className="whitespace-nowrap truncate max-w-[120px] sm:max-w-none">
                Product: <span className="font-semibold">{activeOrder.product?.headline || 'N/A'}</span>
              </span>
              <span className="whitespace-nowrap">
                Amount: <span className="font-mono font-semibold">{activeOrder.total_amount} {activeOrder.crypto_currency}</span>
              </span>
              <span className="whitespace-nowrap truncate max-w-[100px] sm:max-w-none">
                Address: <span className="font-mono">{activeOrder.payment_address ? activeOrder.payment_address.slice(0, 12) + '...' : 'Loading...'}</span>
              </span>
              <span className="flex items-center space-x-1 whitespace-nowrap">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                <span className="hidden sm:inline">left</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeOrder.payment_address && copyToClipboard(activeOrder.payment_address)}
              className="text-white hover:bg-blue-700 h-8 px-2 sm:px-3"
              disabled={!activeOrder.payment_address}
            >
              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            {pendingOrdersCount > 1 && (
              <Link to="/buyer/orders">
                <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-800 h-8 px-2 sm:px-3 text-xs sm:text-sm">
                  View All ({pendingOrdersCount})
                </Button>
              </Link>
            )}
            <Link to="/buyer/orders">
              <Button size="sm" className="bg-white text-blue-600 hover:bg-gray-100 h-8 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                Pay Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyerLayoutContent({ children, hasBanner }: BuyerLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { activeOrder, timeRemaining } = usePendingOrder();
  const showBanner = hasBanner || (activeOrder && timeRemaining > 0);

  return (
    <div className="h-screen buyer-main-background overflow-hidden flex flex-col">
      {showBanner && <PendingOrderBanner />}
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: showBanner ? '0' : '0' }}>
        <div className="hidden lg:block h-full">
          <BuyerSidebar
            expanded={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
            hasBanner={showBanner}
          />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 bg-gray-950 shadow-2xl">
              <BuyerSidebar
                expanded={true}
                onExpandedChange={() => { }}
                hasBanner={showBanner}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div style={{ marginTop: showBanner ? '60px' : '0' }}>
            <BuyerHeader
              hasBanner={showBanner}
              onMenuClick={() => setMobileSidebarOpen(true)}
            />
          </div>
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function BuyerLayout({ children, hasBanner = false }: BuyerLayoutProps) {
  return (
    <MessagingProvider>
      <PendingOrderProvider>
        <BuyerLayoutContent hasBanner={hasBanner}>
          {children}
        </BuyerLayoutContent>
      </PendingOrderProvider>
    </MessagingProvider>
  );
}
