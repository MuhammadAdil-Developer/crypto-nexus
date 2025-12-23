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
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-br from-[#0B1521] to-[#162A41] border-b border-blue-500/30 text-white shadow-xl isolate" style={{ position: 'fixed', top: 0 }}>
      <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          {/* Left Section - Order Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0 w-full lg:w-auto">
            {/* Header */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-yellow-400" />
              <span className="font-semibold text-sm sm:text-base whitespace-nowrap">Payment Required:</span>
            </div>

            {/* Order Details */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-1 text-xs sm:text-sm min-w-0 w-full sm:w-auto">
              <span className="whitespace-nowrap flex items-center gap-1">
                <span className="text-gray-400 font-bold uppercase text-[9px]">ID:</span> <span className="font-mono font-medium text-blue-300">{activeOrder.order_id}</span>
              </span>
              <span className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-none flex items-center gap-1">
                <span className="text-gray-400 font-bold uppercase text-[9px]">Product:</span> <span className="font-medium text-white truncate">{activeOrder.product?.headline || 'N/A'}</span>
              </span>
              <span className="whitespace-nowrap flex items-center gap-1">
                <span className="text-gray-400 font-bold uppercase text-[9px]">Amount:</span> <span className="font-mono font-semibold text-green-400">{activeOrder.total_amount} {activeOrder.crypto_currency}</span>
              </span>
              <span className="whitespace-nowrap hidden md:flex items-center gap-1">
                <span className="text-gray-400 font-bold uppercase text-[9px]">Address:</span> <span className="font-mono text-xs">{activeOrder.payment_address ? activeOrder.payment_address.slice(0, 10) + '...' : 'Loading...'}</span>
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-red-500" />
                <span className="font-mono text-red-500">{formatTime(timeRemaining)}</span>
              </span>
            </div>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeOrder.payment_address && copyToClipboard(activeOrder.payment_address)}
              className="text-white hover:bg-blue-700/50 h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
              disabled={!activeOrder.payment_address}
            >
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            {pendingOrdersCount > 1 && (
              <Link to="/buyer/orders">
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 h-8 px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">
                  All ({pendingOrdersCount})
                </Button>
              </Link>
            )}
            <Link to="/buyer/orders">
              <Button size="sm" className="bg-white text-blue-600 hover:bg-gray-100 h-8 px-3 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap shadow-md">
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
          <div className="transition-[margin] duration-300" style={{ marginTop: showBanner ? 'var(--banner-height, 100px)' : '0' }}>
            <style dangerouslySetInnerHTML={{
              __html: `
              :root { --banner-height: 100px; }
              @media (min-width: 640px) { :root { --banner-height: 80px; } }
              @media (min-width: 1024px) { :root { --banner-height: 56px; } }
            `}} />
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
