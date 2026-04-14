import { useEffect, useState } from "react";
import { 
  Sparkles, 
  Target, 
  Zap, 
  Trash2, 
  Loader2, 
  Check, 
  ChevronRight,
  Plus, 
  Megaphone,
  Bell,
  Info,
  TrendingUp,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  X,
  Copy,
  Loader
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastContainer";
import vendorService, { VendorProduct } from "@/services/vendorService";
import { useCryptoPrices } from "@/contexts/PriceContext";
import { Switch } from "@/components/ui/switch";
import { getImageUrl } from "@/config/api";

const VendorAds = () => {
  const { showToast } = useToast();
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHighlights, setActiveHighlights] = useState<VendorProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isGiveaway, setIsGiveaway] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [currency, setCurrency] = useState<'BTC' | 'XMR'>('BTC');
  const [blastProducts, setBlastProducts] = useState<number[]>([]);
  const [blastSearch, setBlastSearch] = useState("");
  const [showBlastConfirm, setShowBlastConfirm] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [blastInvoice, setBlastInvoice] = useState<any>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [blastHistory, setBlastHistory] = useState<any[]>([]);

  const isHighlightLive = (product: VendorProduct) => {
    const liveFlag = (product as any).is_currently_highlighted;
    if (typeof liveFlag === "boolean") return liveFlag;
    if (!(product as any).is_highlighted) return false;
    const until = (product as any).highlighted_until;
    return !!until && new Date(until) > new Date();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, activeHighlightsResponse, blastHistoryResponse] = await Promise.all([
        vendorService.getMyProducts(),
        vendorService.getMyActiveHighlights(),
        vendorService.getBlastHistory(),
      ]);

      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
      }
      if (activeHighlightsResponse?.success) {
        setActiveHighlights(activeHighlightsResponse.data || []);
      } else {
        const fallback = productsResponse.data?.filter((p: VendorProduct) => isHighlightLive(p)) || [];
        setActiveHighlights(fallback);
      }
      if (blastHistoryResponse?.success) {
        setBlastHistory(blastHistoryResponse.data || []);
      } else {
        setBlastHistory([]);
      }
      
      const profileRes = await vendorService.getProfile();
      if (profileRes.success) {
        setVendorProfile(profileRes.data);
      }
    } catch (error) {
      console.error("Error fetching ads data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (id: number) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBulkHighlight = async () => {
    if (selectedProductIds.length === 0) return;
    
    setIsPromoting(true);
    try {
      const results = await Promise.allSettled(
        selectedProductIds.map((id) => vendorService.promoteHighlight(id, isGiveaway))
      );
      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value?.success
      ).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        showToast({ 
          title: "Promotions Active", 
          message: `Successfully highlighted ${successCount} products! Multi-ad mode is confirmed active.`, 
          type: "success" 
        });
        setSelectedProductIds([]);
        fetchData();
      }
      if (failCount > 0) {
        showToast({
          title: "Some promotions failed",
          message: `${failCount} selected listings could not be highlighted (already live or validation issue).`,
          type: "error",
        });
      }
    } finally {
      setIsPromoting(false);
    }
  };

  const handleStopHighlight = async (productId: number) => {
    try {
      const response = await vendorService.promoteUnhighlight(productId);
      if (response.success) {
        showToast({ title: "Removed", message: "Product highlight removed.", type: "info" });
        fetchData();
      }
    } catch (error) {
      console.error("Error stopping highlight:", error);
    }
  };

  const getBlastPricingUsd = () => {
    const count = blastProducts.length;
    const base = count;
    const discountRate = count >= 8 ? 0.2 : count >= 5 ? 0.12 : count >= 3 ? 0.05 : 0;
    const discount = base * discountRate;
    const final = Math.max(0, base - discount);
    return { count, base, discountRate, discount, final };
  };

  const getCryptoPrice = () => {
    const costUsd = getBlastPricingUsd().final;
    const priceAtTime = currency === 'BTC' ? btcPrice : xmrPrice;
    if (!priceAtTime || priceAtTime <= 0) return "0.00000000";
    return (costUsd / priceAtTime).toFixed(8);
  };

  // Polling for payment confirmation
  useEffect(() => {
    let interval: any;
    if (showBlastConfirm && blastInvoice && !paymentConfirmed) {
      interval = setInterval(async () => {
        try {
          const res = await vendorService.checkBlastPayment(blastInvoice.invoice_id, blastProducts);
          if (res.success && res.is_paid) {
            setPaymentConfirmed(true);
            showToast({ title: "Payment Received", message: "Your Global Blast is being prepared!", type: "success" });
            
            // Allow a brief moment for the user to see the confirmation
            setTimeout(() => {
              setShowBlastConfirm(false);
              setBlastInvoice(null);
              setBlastProducts([]);
              setPaymentConfirmed(false);
              fetchData();
            }, 3000);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [showBlastConfirm, blastInvoice, paymentConfirmed, blastProducts]);

  const handleSendNotification = () => {
    if (blastProducts.length === 0) return;
    setShowBlastConfirm(true);
    setBlastInvoice(null);
    setPaymentConfirmed(false);
  };

  const processBlast = async () => {
    // If we already have an active invoice, don't generate a new one!
    // This prevents "Ghost Payments" where you pay one address but we check another.
    if (blastInvoice && !paymentConfirmed) {
      showToast({ title: "Resuming Payment", message: "Continuing to watch your active crypto invoice...", type: "info" });
      return;
    }

    setIsPromoting(true);
    try {
      showToast({ 
        title: "Initializing Blast", 
        message: "Generating a secure direct payment link for your promotion...", 
        type: "info" 
      });
      
      const invoiceRes = await vendorService.createBlastPayment(blastProducts, currency);
      if (invoiceRes.success) {
        setBlastInvoice(invoiceRes);
      }
    } catch (err: any) {
      showToast({ title: "System Error", message: err.message || "Failed to process blast request.", type: "error" });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRemoveBlast = async (blastId: string) => {
    const ok = window.confirm("Remove this blast for all users? This will hide it from banners and notification feeds.");
    if (!ok) return;
    try {
      const res = await vendorService.removeBlast(blastId);
      if (res.success) {
        showToast({ title: "Blast Removed", message: "Blast removed from all users.", type: "success" });
        fetchData();
      }
    } catch (err: any) {
      showToast({ title: "Failed", message: err.message || "Could not remove blast.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-theme-cyan animate-spin" />
      </div>
    );
  }

  const approvedProducts = products.filter(
    (p) => p.status === "approved" && Number((p as any).quantity_available ?? 0) > 0
  );
  const blastSelectedProducts = approvedProducts.filter((p) => blastProducts.includes(p.id));
  const filteredBlastProducts = approvedProducts.filter((p) =>
    `${p.headline || p.listing_title || ""}`.toLowerCase().includes(blastSearch.toLowerCase())
  );
  const pricing = getBlastPricingUsd();

  return (
    <div className="space-y-6 p-0 sm:p-2 lg:p-3 2xl:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-7">
        
        {/* Left Column: Promotion Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 xl:p-7 bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl space-y-6 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-theme-cyan/10 blur-[100px] rounded-full group-hover:bg-theme-cyan/20 transition-all duration-700" />
            
            <div className="space-y-2 relative">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <div className="p-2 bg-theme-cyan/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-theme-cyan" />
                </div>
                Promotion Manager
              </h2>
              <p className="text-sm text-gray-400">Select multiple products to run simultaneous ad campaigns. Each highlight stays active for 12 hours.</p>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Available Products ({approvedProducts.length})</span>
                {selectedProductIds.length > 0 && (
                  <span className="text-xs font-black text-theme-cyan uppercase tracking-tighter">
                    {selectedProductIds.length} SELECTED
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[410px] overflow-y-auto pr-2 custom-scrollbar">
                {approvedProducts.map(product => {
                  const isActive = isHighlightLive(product);
                  const isSelected = selectedProductIds.includes(product.id);
                  
                  return (
                    <div 
                      key={product.id}
                      onClick={() => !isActive && toggleProductSelection(product.id)}
                      className={`relative p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-3 group/card
                        ${isActive ? 'bg-theme-cyan/5 border-theme-cyan/20 opacity-60 cursor-default' : 
                          isSelected ? 'bg-theme-cyan/10 border-theme-cyan shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-theme-cyan/30' : 
                          'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-xl'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-950 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.main_image ? (
                            <img src={getImageUrl(product.main_image)} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Plus className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[11px] font-black text-white truncate group-hover/card:text-theme-cyan transition-colors">{product.headline || product.listing_title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-[9px] text-gray-400 font-mono">${product.price}</span>
                             <div className="w-1 h-1 rounded-full bg-gray-700" />
                             <span className="text-[8px] font-bold text-gray-500 uppercase">{product.account_type || 'Account'}</span>
                             <div className="w-1 h-1 rounded-full bg-gray-700" />
                             <span className={`text-[8px] font-bold uppercase tracking-tighter ${Number(product.quantity_available) < 5 ? 'text-theme-red' : 'text-gray-500'}`}>
                               Stock: {product.quantity_available}
                             </span>
                          </div>
                        </div>
                        {!isActive && (
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 shrink-0
                            ${isSelected ? 'bg-theme-cyan border-theme-cyan shadow-[0_0_10px_rgba(34,211,238,0.3)] scale-110' : 'border-white/10 group-hover/card:border-white/30'}
                          `}>
                            {isSelected && <Check className="w-3 h-3 text-black font-bold" />}
                          </div>
                        )}
                      </div>
                      
                      {isActive && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-theme-cyan/20 text-theme-cyan text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                          <Zap className="w-2 h-2 fill-current" /> Active
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${isGiveaway ? 'bg-emerald-500/10' : 'bg-gray-800'}`}>
                      <Zap className={`w-5 h-5 ${isGiveaway ? 'text-emerald-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Free Giveaway Mode</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">List for $0.00 to boost ratings</p>
                    </div>
                  </div>
                  <Switch 
                    checked={isGiveaway} 
                    onCheckedChange={setIsGiveaway}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="p-4 bg-theme-cyan/5 rounded-2xl border border-theme-cyan/10">
                  <p className="text-[10px] text-theme-cyan/80 font-bold uppercase tracking-[0.15em] mb-1">Fee Transparency</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Promotion adds +1% to the platform's standard commission. You only pay if the item sells. 
                    <span className="text-white font-bold ml-1">Simultaneous highlights are fully supported.</span>
                  </p>
                </div>

                <Button 
                  onClick={handleBulkHighlight}
                  disabled={selectedProductIds.length === 0 || isPromoting}
                  className="w-full h-14 bg-theme-cyan hover:bg-theme-cyan/90 text-black font-black uppercase tracking-widest text-sm rounded-2xl shadow-[0_10px_30px_rgba(34,211,238,0.2)] disabled:opacity-20 transition-all duration-500 group"
                >
                  {isPromoting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                       Highlight Selected ({selectedProductIds.length})
                       <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-5 xl:p-6 bg-theme-cyan/5 border border-theme-cyan/20 rounded-3xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Sparkles className="w-20 h-20 text-theme-cyan" />
            </div>
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-theme-cyan uppercase tracking-[0.2em]">Active Highlights</p>
                <div className="h-2 w-2 rounded-full bg-theme-cyan animate-pulse" />
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {activeHighlights.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-theme-cyan/10 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-white/[0.02] rounded-full">
                      <Target className="w-6 h-6 text-gray-700" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No Active Highlights</p>
                  </div>
                ) : (
                  activeHighlights.map((highlight) => {
                    const untilStr = (highlight as any).highlighted_until as string | undefined;
                    const until = untilStr ? new Date(untilStr).getTime() : null;
                    const now = Date.now();
                    const msLeft = until ? Math.max(0, until - now) : 0;
                    const hoursLeft = until ? Math.floor(msLeft / 36e5) : null;
                    const minsLeft = until ? Math.floor((msLeft % 36e5) / 6e4) : null;
                    const pct = until ? Math.min(100, Math.max(0, (msLeft / (12 * 36e5)) * 100)) : 0;

                    return (
                      <div
                        key={highlight.id}
                        className="p-3.5 bg-black/30 border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:border-theme-cyan/25 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[12px] font-semibold text-white truncate">
                              {highlight.headline || highlight.listing_title}
                            </h4>
                            <span className="text-[9px] font-bold text-theme-cyan bg-theme-cyan/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              Live
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-[10px] text-gray-400">
                            <span className="font-mono">#{highlight.id}</span>
                            <span>{highlight.views_count || 0} views</span>
                            {until ? (
                              <span className="text-gray-300">
                                {hoursLeft}h {minsLeft}m left
                              </span>
                            ) : null}
                          </div>
                          {until ? (
                            <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-theme-cyan/70" style={{ width: `${pct}%` }} />
                            </div>
                          ) : null}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStopHighlight(highlight.id)}
                          className="h-9 w-9 rounded-xl bg-theme-red/10 text-theme-red hover:bg-theme-red hover:text-white border border-theme-red/20 p-0 shrink-0 transition-all"
                          title="Stop highlight"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-theme-cyan/10 space-y-3 relative text-center">
              <p className="text-[9px] text-gray-500 leading-relaxed italic">
                * Active ads are automatically prioritized in buyer search results.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Global Announcement */}
        <div className="space-y-6 lg:sticky lg:top-4 self-start">
          <div className="p-5 xl:p-6 bg-theme-red/5 border border-theme-red/20 rounded-3xl space-y-5 min-h-[460px]">
            <div className="space-y-1">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-theme-red" />
                Global Blast
              </h3>
              <p className="text-[10px] text-gray-500">Notify everyone on the platform.</p>
            </div>

            <input
              value={blastSearch}
              onChange={(e) => setBlastSearch(e.target.value)}
              placeholder="Search products for blast..."
              className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-theme-red/40"
            />

            <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredBlastProducts.slice(0, 20).map(p => {
                const isSelected = blastProducts.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setBlastProducts(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}
                    className={`h-9 px-3 rounded-lg border flex items-center justify-between transition-all ${isSelected ? 'bg-theme-red border-theme-red text-white' : 'bg-white/[0.02] border-white/5 text-gray-300 hover:border-white/20'}`}
                    title={p.headline || p.listing_title}
                  >
                    <span className="text-[11px] font-semibold truncate text-left">
                      {p.headline || p.listing_title || `Product #${p.id}`}
                    </span>
                    {isSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-400">
                <Info className="w-3.5 h-3.5" />
                Selected for blast ({blastSelectedProducts.length})
              </div>
              {blastSelectedProducts.length === 0 ? (
                <p className="text-[11px] text-gray-500">No products selected yet.</p>
              ) : (
                <div className="max-h-[90px] overflow-y-auto pr-1 custom-scrollbar space-y-1">
                  {blastSelectedProducts.map((p) => (
                    <p key={p.id} className="text-[11px] text-gray-300 truncate">
                      - {p.headline || p.listing_title || `Product #${p.id}`}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-gray-400">Estimated Cost:</span>
                <span className="text-white">{getCryptoPrice()} {currency}</span>
              </div>
              <div className="rounded-lg border border-theme-red/20 bg-theme-red/5 p-2.5 text-[11px] space-y-1">
                <p className="text-gray-300">Base: ${pricing.base.toFixed(2)} ({pricing.count} x $1.00)</p>
                <p className="text-emerald-300">Discount: -${pricing.discount.toFixed(2)} ({Math.round(pricing.discountRate * 100)}%)</p>
                <p className="text-white font-semibold">Final: ${pricing.final.toFixed(2)}</p>
              </div>
              <Button 
                onClick={handleSendNotification}
                disabled={blastProducts.length === 0 || isPromoting}
                className="w-full bg-theme-red hover:bg-theme-red/90 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl"
              >
                Launch Global Blast
              </Button>
            </div>
          </div>

          <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-theme-cyan" />
                Blast Performance
              </h4>
              <span className="text-[10px] text-gray-500">{blastHistory.length} campaigns</span>
            </div>
            {blastHistory.length === 0 ? (
              <p className="text-[11px] text-gray-500">No blast stats yet.</p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {blastHistory.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] text-white font-semibold truncate">{item.title}</p>
                      {item.is_active ? (
                        <button
                          onClick={() => handleRemoveBlast(item.id)}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/15"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-md border border-gray-600 text-gray-400">
                          Removed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                      <span>Sent: {item.sent_count}</span>
                      <span>Seen: {item.seen_count}</span>
                      <span>Rate: {item.seen_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Blast Confirmation Modal */}
      <AnimatePresence>
        {showBlastConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlastConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-theme-red/10 border-b border-theme-red/20 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-theme-red/20 rounded-xl">
                    <Megaphone className="w-6 h-6 text-theme-red" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Blast Confirmation</h3>
                    <p className="text-[10px] text-theme-red/80 font-bold uppercase tracking-widest">Global Network Transmission</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBlastConfirm(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {!blastInvoice ? (
                  <>
                    {/* Standard Confirmation View */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Fee</p>
                          <p className="text-xl font-black text-white">${pricing.final.toFixed(2)}</p>
                          <p className="text-[10px] text-theme-red font-bold uppercase mt-1">{getCryptoPrice()} {currency}</p>
                       </div>
                       <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Target Reach</p>
                          <p className="text-xl font-black text-white">ALL USERS</p>
                          <p className="text-[10px] text-theme-cyan font-bold uppercase mt-1">Direct Ping</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        How the Magic Works
                      </p>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <Bell className="w-4 h-4 text-theme-cyan shrink-0 mt-1" />
                          <p className="text-xs text-gray-400 leading-relaxed font-medium">
                            Every active user receives an **instant system notification** with links to your items.
                          </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <Clock className="w-4 h-4 text-theme-red shrink-0 mt-1" />
                          <p className="text-xs text-gray-400 leading-relaxed font-medium">
                            Your promotion is pinned to the **Global Announcements** feed for 24 hours.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-theme-cyan/[0.03] border border-theme-cyan/20 rounded-2xl flex items-center gap-4">
                       <div className="p-2 bg-theme-cyan/10 rounded-lg">
                          <ShieldCheck className="w-5 h-5 text-theme-cyan" />
                       </div>
                       <div>
                          <p className="text-[11px] text-white font-bold">Direct Payment Activation</p>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                             To launch your blast, please send a direct payment from your personal wallet.
                          </p>
                       </div>
                    </div>
                  </>
                ) : (
                  /* PAY-BY-QR INVOICE VIEW */
                  <div className="space-y-6 py-2">
                    {paymentConfirmed ? (
                       <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-4 py-8"
                       >
                          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                             <Check className="w-8 h-8 text-emerald-400" />
                          </div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tight">Payment Verified!</h4>
                          <p className="text-xs text-gray-400">Broadcasting your products to the global network...</p>
                       </motion.div>
                    ) : (
                      <>
                        <div className="text-center space-y-1">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Send Exactly</p>
                          <h4 className="text-2xl font-mono font-black text-white">{blastInvoice.amount_crypto} {blastInvoice.currency}</h4>
                          <p className="text-[11px] text-theme-cyan font-bold uppercase tracking-widest">${blastInvoice.amount_usd} USD</p>
                        </div>

                        <div className="flex justify-center p-4 bg-white/[0.02] rounded-[2rem] border border-white/10 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-theme-cyan/5 blur-xl group-hover:bg-theme-cyan/10 transition-all opacity-0 group-hover:opacity-100" />
                           <div className="relative p-3 bg-white rounded-2xl">
                              <QRCodeCanvas 
                                value={`${blastInvoice.currency === 'BTC' ? 'bitcoin' : 'monero'}:${blastInvoice.address}?amount=${blastInvoice.amount_crypto}`}
                                size={140}
                                level="H"
                              />
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-white/20 transition-all"
                             onClick={() => {
                               navigator.clipboard.writeText(blastInvoice.address);
                               showToast({ title: "Copied", message: "Address copied to clipboard", type: "info" });
                             }}
                           >
                              <div className="min-w-0 pr-3">
                                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Payment Address</p>
                                 <p className="text-[10px] font-mono text-gray-400 truncate">{blastInvoice.address}</p>
                              </div>
                              <Copy className="w-3.5 h-3.5 text-gray-600 group-hover:text-theme-cyan" />
                           </div>

                           <div className="flex items-center justify-center gap-2 py-2">
                              <Loader className="w-3.5 h-3.5 text-theme-cyan animate-spin" />
                              <span className="text-[10px] font-bold text-theme-cyan uppercase animate-pulse">Waiting for network confirmation...</span>
                           </div>
                        </div>

                        <div className="bg-theme-red/5 border border-theme-red/20 rounded-xl p-3 flex items-start gap-3">
                           <AlertCircle className="w-4 h-4 text-theme-red mt-0.5 shrink-0" />
                          <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                            Please do not close this window. Your blast will launch automatically once the payment is detected on the blockchain.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!paymentConfirmed && (
                <div className="p-6 bg-white/[0.02] border-t border-white/10 flex gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowBlastConfirm(false)}
                    className="flex-1 h-12 rounded-xl text-gray-400 hover:text-white font-black uppercase tracking-widest text-[10px]"
                  >
                    {blastInvoice ? "Cancel Payment" : "Maybe Later"}
                  </Button>
                  {!blastInvoice && (
                    <Button 
                      onClick={processBlast}
                      disabled={isPromoting}
                      className="flex-[2] h-12 rounded-xl bg-theme-red hover:bg-theme-red/90 text-white font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(239,68,68,0.2)] group"
                    >
                      {isPromoting ? (
                         <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Confirm & Blast Now
                          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-8 bg-gray-900/40 p-6 rounded-3xl border border-gray-800 flex items-center gap-6">
        <div className="p-4 bg-theme-cyan/10 rounded-2xl">
          <Bell className="w-8 h-8 text-theme-cyan" />
        </div>
        <div>
          <h4 className="text-white font-bold text-lg">Marketing Tip</h4>
          <p className="text-gray-400 text-sm">
            Highlight multiple products for different niches to maximize your cross-selling potential.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorAds;
