import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Megaphone, Bell, Check, Loader2, AlertCircle, Info, Sparkles, Rocket } from "lucide-react";
import { useToast } from "@/components/ui/ToastContainer";
import vendorService, { VendorProduct } from "@/services/vendorService";
import { useCryptoPrices } from "@/contexts/PriceContext";

export default function VendorAds() {
  const { showToast } = useToast();
  const { btc: btcPrice, xmr: xmrPrice } = useCryptoPrices();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHighlight, setActiveHighlight] = useState<VendorProduct | null>(null);

  // Notification state
  const [promoType, setPromoType] = useState<'standard' | 'premium'>('standard');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [currency, setCurrency] = useState('BTC');
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getMyProducts();
      if (response.success) {
        setProducts(response.data || []);
        const highlighted = response.data?.find((p: any) => p.is_highlighted);
        setActiveHighlight(highlighted || null);
      }
    } catch (error) {
      console.error("Error fetching ads data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHighlight = async (productId: number) => {
    try {
      const response = await vendorService.promoteHighlight(productId);
      if (response.success) {
        showToast({ title: "Success", message: "Product highlighted at top of search!", type: "success" });
        fetchData();
      }
    } catch (error: any) {
      showToast({ title: "Error", message: error.message || "Failed to highlight", type: "error" });
    }
  };

  const handleStopHighlight = async (productId: number) => {
    try {
      const response = await vendorService.promoteUnhighlight(productId);
      if (response.success) {
        showToast({ title: "Success", message: "Promotion stopped.", type: "success" });
        fetchData();
      }
    } catch (error: any) {
      showToast({ title: "Error", message: error.message || "Failed to stop promotion", type: "error" });
    }
  };

  const handleSendNotification = async () => {
    if (selectedProductIds.length === 0) {
      showToast({ title: "Warning", message: "Select at least 1 product", type: "error" });
      return;
    }
    
    try {
      setIsPromoting(true);
      const response = await vendorService.promoteNotification(selectedProductIds, currency, promoType);
      if (response.success) {
        showToast({ title: "Blast Sent!", message: response.message, type: "success" });
        setSelectedProductIds([]);
      }
    } catch (error: any) {
      showToast({ title: "Promotion Failed", message: error.message || "Insufficient funds?", type: "error" });
    } finally {
      setIsPromoting(false);
    }
  };

  const getCryptoPrice = () => {
    const costUsd = promoType === 'premium' ? 100 : 10;
    const price = currency === 'BTC' ? btcPrice : xmrPrice;
    if (!price) return "?.????";
    return (costUsd / price).toFixed(8);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-theme-cyan" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <Rocket className="w-10 h-10 text-theme-cyan" />
          Promotion Center
        </h1>
        <p className="text-gray-400 text-lg">Boost your sales with our premium visibility tools.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Top of Search Highlight */}
        <Card className="bg-gray-900/60 border-gray-800 shadow-2xl backdrop-blur-md hover:border-theme-cyan/30 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-theme-cyan/10 rounded-2xl">
                <Zap className="w-8 h-8 text-theme-cyan" />
              </div>
              <Badge className="bg-theme-cyan/20 text-theme-cyan border-none">10% COMMISSION</Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Featured Offer</CardTitle>
            <CardDescription className="text-gray-400">
              Pin one product to the <strong>top of search results</strong> for 12 hours. 
              No upfront cost—we only take 10% commission when it sells!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeHighlight ? (
              <div className="p-4 bg-gray-800/50 rounded-xl border border-theme-cyan/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2">
                   <Sparkles className="w-5 h-5 text-theme-cyan animate-pulse" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-theme-cyan uppercase tracking-widest mb-2">Currently Active</p>
                    <h3 className="text-white font-bold">{activeHighlight.headline}</h3>
                    <p className="text-gray-500 text-sm">Valid for 12 hours from start</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleStopHighlight(activeHighlight.id)}
                    className="text-gray-500 hover:text-theme-red hover:bg-theme-red/10 h-8"
                  >
                    Stop Promotion
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Select a product to highlight:</p>
                <div className="flex gap-2">
                  <Select onValueChange={(val) => handleHighlight(Number(val))}>
                    <SelectTrigger className="bg-gray-950 border-gray-800 text-white rounded-xl">
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {products.filter(p => p.status === 'approved').map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.headline}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="bg-black/20 p-4 rounded-xl border border-gray-800/50">
               <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-theme-cyan" />
                  How it works
               </h4>
               <ul className="text-xs text-gray-500 space-y-1">
                 <li>• Your product stays at the absolute top of search</li>
                 <li>• Duration: 12 Hours (one product at a time)</li>
                 <li>• Fee: 10% on sales instead of standard rate</li>
               </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Blast Notifications */}
        <Card className="bg-gray-900/60 border-gray-800 shadow-2xl backdrop-blur-md hover:border-theme-red/30 transition-all">
          <CardHeader>
             <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-theme-red/10 rounded-2xl">
                <Megaphone className="w-8 h-8 text-theme-red" />
              </div>
              <div className="flex gap-1">
                <Badge variant="outline" className="border-gray-700 text-gray-400">$10</Badge>
                <Badge variant="outline" className="border-theme-red/30 text-theme-red">$100</Badge>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Global Announcement</CardTitle>
            <CardDescription className="text-gray-400">
              Blast a notification to <strong>all users</strong> on the platform. 
              Perfect for new drops or limited quantity sales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex bg-gray-950 p-1 rounded-xl gap-1">
               <button 
                 onClick={() => setPromoType('standard')}
                 className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${promoType === 'standard' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'}`}
               >
                 STANDARD ($10)
               </button>
               <button 
                 onClick={() => setPromoType('premium')}
                 className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${promoType === 'premium' ? 'bg-theme-red/10 text-theme-red border border-theme-red/20 shadow-lg' : 'text-gray-500 hover:text-gray-400'}`}
               >
                 PREMIUM ($100)
               </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <p className="text-sm text-gray-400">Products to include (max 10):</p>
                 <Badge variant="secondary" className="bg-gray-800 text-gray-400">{selectedProductIds.length}/10</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {products.filter(p => p.status === 'approved').map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (selectedProductIds.includes(p.id)) {
                        setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                      } else if (selectedProductIds.length < 10) {
                        setSelectedProductIds(prev => [...prev, p.id]);
                      }
                    }}
                    className={`text-left p-2 rounded-lg text-xs border transition-all truncate ${selectedProductIds.includes(p.id) ? 'bg-theme-red/10 border-theme-red/50 text-white' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                  >
                    {p.headline}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-2">
               <div className="flex-1 space-y-2">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Pay With</p>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="bg-gray-950 border-gray-800 text-white h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="XMR">Monero (XMR)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="flex-1 space-y-1 text-right">
                  <p className="text-xs text-gray-500">Estimated Cost</p>
                  <div className="text-xl font-black text-white">{getCryptoPrice()} {currency}</div>
               </div>
            </div>

            <Button 
               onClick={handleSendNotification}
               disabled={isPromoting || selectedProductIds.length === 0}
               className={`w-full h-14 rounded-2xl font-black text-lg transition-all shadow-xl ${promoType === 'premium' ? 'bg-theme-red hover:bg-theme-red-dark shadow-theme-red/20' : 'bg-white hover:bg-gray-100 text-black shadow-white/10'}`}
            >
              {isPromoting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <span className="flex items-center gap-2">
                   {promoType === 'premium' ? <Sparkles className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
                   SEND BLAST NOW
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-900/40 p-6 rounded-3xl border border-gray-800 flex items-center gap-6">
         <div className="p-4 bg-theme-cyan/10 rounded-2xl">
            <Bell className="w-8 h-8 text-theme-cyan" />
         </div>
         <div>
            <h4 className="text-white font-bold text-lg">Did you know?</h4>
            <p className="text-gray-400 text-sm">
              Sellers who use **Premium Notifications** see an average of **234% increase** in profile views within the first 6 hours.
            </p>
         </div>
         <div className="ml-auto hidden md:block">
            <Button variant="outline" className="border-gray-700 text-gray-400 rounded-xl">Read Seller Guide</Button>
         </div>
      </div>
    </div>
  );
}
