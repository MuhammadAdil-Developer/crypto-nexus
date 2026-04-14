import { useState, useEffect, useRef } from "react";
import { BuyerSidebar } from "./BuyerSidebar";
import { BuyerHeader } from "./BuyerHeader";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { PendingOrderProvider, usePendingOrder } from "@/contexts/PendingOrderContext";
import { Button } from "@/components/ui/button";
import { Clock, Copy, AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
    if (!text) {
      toast({ title: "Error", description: "No address to copy", variant: "destructive" });
      return;
    }

    // Simple and robust copy
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Address copied to clipboard.",
      });
    }).catch((err) => {
      console.error('Copy failed:', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ title: "Copied!", description: "Address copied to clipboard." });
      } catch (e) {
        toast({ title: "Error", description: "Failed to copy.", variant: "destructive" });
      }
      document.body.removeChild(textArea);
    });
  };

  if (!activeOrder || timeRemaining <= 0) {
    return null;
  }

  return (
    <div className="w-full z-10 bg-gradient-to-br from-[#0B1521] to-[#162A41] border-b border-blue-500/30 text-white shadow-md relative shrink-0">
      <div className="px-3 py-2">
        {/* Mobile Layout (< md) */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                <Clock className="w-3 h-3 text-red-400" />
                <span className="font-mono font-bold text-red-400 text-xs">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-gray-400 font-bold uppercase">Pay:</span>
              <span className="font-medium text-green-400">{activeOrder.total_amount} {activeOrder.crypto_currency}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                copyToClipboard(activeOrder.payment_address);
              }}
              className="flex-1 h-8 text-xs border-gray-600 text-gray-300 hover:text-white hover:bg-white/5 hover:border-gray-500"
              disabled={!activeOrder.payment_address}
            >
              <Copy className="w-3 h-3 mr-1.5" />
              Copy
            </Button>
            <Link to="/buyer/orders" className="flex-1">
              <Button size="sm" className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium border-0">
                Pay Now
              </Button>
            </Link>
          </div>
        </div>

        {/* Desktop Layout (>= md) */}
        <div className="hidden md:flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span className="font-semibold text-sm whitespace-nowrap text-yellow-500">Payment Pending</span>
            </div>

            <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              <span className="font-mono font-bold text-red-400 text-sm">{formatTime(timeRemaining)}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs uppercase font-bold">Pay:</span>
              <span className="font-mono font-medium text-green-400 text-sm">{activeOrder.total_amount} {activeOrder.crypto_currency}</span>
            </div>

            <div className="flex items-center gap-1 opacity-75">
              <span className="text-gray-500 text-[10px] uppercase font-bold">ID:</span>
              <span className="font-mono text-xs text-blue-300">#{activeOrder.order_id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                copyToClipboard(activeOrder.payment_address);
              }}
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/5"
              disabled={!activeOrder.payment_address}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy Address
            </Button>

            <Link to="/buyer/orders">
              <Button size="sm" className="h-7 px-4 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium border-0">
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
  const [paymentPulse, setPaymentPulse] = useState<{
    order_id: string;
    amount: string;
    crypto: string;
    confirmations: number;
    required_confirmations: number;
  } | null>(null);
  const [pulseClosing, setPulseClosing] = useState(false);
  const lastPulseRef = useRef<{ order_id: string; shownAt: number } | null>(null);
  const { activeOrder, timeRemaining } = usePendingOrder();
  const showBanner = Boolean(hasBanner || (activeOrder && timeRemaining > 0));

  useEffect(() => {
    const playSoftSound = () => {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.value = 0.03;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch {
        // optional UX sound only
      }
    };

    const onPaymentPulse = (event: Event) => {
      const e = event as CustomEvent<any>;
      const d = e.detail || {};
      if (!d.order_id) return;
      const nowTs = Date.now();
      // Ignore noisy repeats for same order in short window to avoid UI jitter.
      if (
        lastPulseRef.current &&
        lastPulseRef.current.order_id === d.order_id &&
        nowTs - lastPulseRef.current.shownAt < 10000
      ) {
        return;
      }
      lastPulseRef.current = { order_id: d.order_id, shownAt: nowTs };
      setPulseClosing(false);
      setPaymentPulse({
        order_id: d.order_id,
        amount: String(d.amount || "0"),
        crypto: String(d.crypto || ""),
        confirmations: Number(d.confirmations || 0),
        required_confirmations: Number(d.required_confirmations || 0),
      });
      playSoftSound();
    };

    window.addEventListener("buyer_payment_received", onPaymentPulse as EventListener);
    return () => {
      window.removeEventListener("buyer_payment_received", onPaymentPulse as EventListener);
    };
  }, []);

  const closePaymentPulse = () => {
    setPulseClosing(true);
    window.setTimeout(() => setPaymentPulse(null), 260);
  };

  return (
    <div className="h-screen buyer-main-background overflow-hidden flex flex-col">
      {paymentPulse && (
        <div className="fixed top-4 right-4 z-[80] pointer-events-none">
          <div
            className={cn(
              "pointer-events-auto w-[360px] max-w-[92vw] rounded-xl border border-emerald-500/30 bg-[#0b1520]/95 backdrop-blur-xl shadow-2xl px-4 py-3 transition-all duration-300",
              pulseClosing ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold mb-1">Payment Received</p>
              <button
                type="button"
                onClick={closePaymentPulse}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close payment notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white text-sm font-semibold">Order {paymentPulse.order_id}</p>
            <p className="text-cyan-300 text-sm font-mono mt-1">
              {paymentPulse.amount} {paymentPulse.crypto}
            </p>
            <p className="text-gray-300 text-xs mt-2">
              Payment received. Waiting for sufficient confirmations ({paymentPulse.confirmations}/{paymentPulse.required_confirmations}).
              As soon as confirmations complete, your credentials will be available.
            </p>
          </div>
        </div>
      )}
      {/* Sidebar Section */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="hidden lg:block h-full">
          <BuyerSidebar
            expanded={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 bg-gray-950 shadow-2xl border-r border-gray-800">
              <BuyerSidebar
                expanded={true}
                onExpandedChange={() => { }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Banner moved here - Inside content area so sidebar stays full height */}
          {showBanner && <PendingOrderBanner />}

          <BuyerHeader
            hasBanner={showBanner}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 relative z-10 max-w-[1600px] mx-auto w-full">
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
