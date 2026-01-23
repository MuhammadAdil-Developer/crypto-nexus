import { useState, useEffect, useCallback } from "react";
import { Heart, Trash2, ShoppingCart, Share2, Loader2, User, Star, Eye } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import wishlistService, { WishlistItem, WishlistStats } from "@/services/wishlistService";
import { PageBanner } from "@/components/PageBanner";
import { CRYPTO_PRICES } from "@/lib/priceUtils";

// Helper functions for price formatting
const formatUSD = (price: string) => {
  return parseFloat(price).toFixed(2);
};

const formatCryptoPrice = (price: string, currency: 'BTC' | 'XMR') => {
  const usdPrice = parseFloat(price);
  let cryptoAmount = 0;

  if (currency === 'BTC') {
    cryptoAmount = usdPrice / CRYPTO_PRICES.BTC;
    return parseFloat(cryptoAmount.toFixed(8)).toString();
  } else {
    cryptoAmount = usdPrice / CRYPTO_PRICES.XMR;
    return parseFloat(cryptoAmount.toFixed(8)).toString();
  }
};

// Remove static data - we'll use dynamic data from API

export default function BuyerWishlist() {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<WishlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingItems, setRemovingItems] = useState<number[]>([]);
  const { toast } = useToast();

  const [wishlistFetched, setWishlistFetched] = useState(false);

  // Cache keys for localStorage
  const CACHE_KEYS = {
    WISHLIST_ITEMS: 'buyer_wishlist_items',
    WISHLIST_STATS: 'buyer_wishlist_stats',
  };
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Helper function to get cached data
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  // Helper function to set cached data
  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error caching data:', e);
    }
  };

  const fetchWishlistData = useCallback(async (force = false) => {
    // Don't fetch if already fetched and not forcing
    if (wishlistFetched && !force) return;

    // Try cache first if not forcing
    if (!force) {
      const cachedItems = getCachedData(CACHE_KEYS.WISHLIST_ITEMS);
      const cachedStats = getCachedData(CACHE_KEYS.WISHLIST_STATS);

      if (cachedItems !== null && cachedStats !== null) {
        setWishlistItems(cachedItems);
        setStats(cachedStats);
        setLoading(false);
        setWishlistFetched(true);
        return;
      }
    }

    try {
      setLoading(true);
      // Only fetch stats if not cached or forcing
      const promises = [wishlistService.getWishlist()];
      if (!getCachedData(CACHE_KEYS.WISHLIST_STATS) || force) {
        promises.push(wishlistService.getWishlistStats());
      } else {
        promises.push(Promise.resolve({ success: true, data: getCachedData(CACHE_KEYS.WISHLIST_STATS) }));
      }

      const [wishlistResponse, statsResponse] = await Promise.all(promises);

      if (wishlistResponse.success) {
        const items = wishlistResponse.data || [];
        setWishlistItems(items);
        setCachedData(CACHE_KEYS.WISHLIST_ITEMS, items);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
        setCachedData(CACHE_KEYS.WISHLIST_STATS, statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching wishlist data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wishlist data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setWishlistFetched(true);
    }
  }, [toast]);

  useEffect(() => {
    fetchWishlistData();
  }, []);

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(wishlistItems.map(item => parseInt(item.id)));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const removeSelectedItems = async () => {
    try {
      setRemovingItems(selectedItems);

      const removePromises = selectedItems.map(itemId =>
        wishlistService.removeFromWishlist(itemId)
      );

      await Promise.all(removePromises);

      // Update wishlist items and cache
      const updatedItems = wishlistItems.filter(item => !selectedItems.includes(parseInt(item.id)));
      setWishlistItems(updatedItems);
      setCachedData(CACHE_KEYS.WISHLIST_ITEMS, updatedItems);

      // Update stats cache
      const statsResponse = await wishlistService.getWishlistStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
        setCachedData(CACHE_KEYS.WISHLIST_STATS, statsResponse.data);
      }

      setSelectedItems([]);
      toast({
        title: "Success",
        description: "Selected items removed from wishlist",
      });
    } catch (error) {
      console.error('Error removing items:', error);
      toast({
        title: "Error",
        description: "Failed to remove some items",
        variant: "destructive"
      });
    } finally {
      setRemovingItems([]);
    }
  };

  return (
    <BuyerLayout>
      <div className="min-h-screen bg-gray-950 -m-6 p-6 space-y-6">
        {/* Header Banner */}
        <PageBanner
          title="Wishlist"
          subtitle={`${wishlistItems.length} items saved for later`}
          type="buyer"
        />

        {/* Wishlist Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-white">{stats?.total_items || wishlistItems.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <Heart className="w-6 h-6 text-theme-red" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">In Stock</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.in_stock_items || wishlistItems.filter(item => item.product_data?.quantity_available > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-theme-cyan" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Price Drops</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.price_drops || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <span className="text-theme-cyan font-bold text-sm">↓</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.total_value ? `$${Number(stats.total_value).toFixed(2)}` : '$0.00'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <span className="text-theme-cyan font-bold text-sm">$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h3 className="font-semibold text-white">Manage Wishlist</h3>
              {selectedItems.length > 0 && (
                <Badge variant="secondary" className="bg-theme-cyan text-black">
                  {selectedItems.length} selected
                </Badge>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedItems.length === wishlistItems.length ? clearSelection : selectAllItems}
              >
                {selectedItems.length === wishlistItems.length ? "Clear Selection" : "Select All"}
              </Button>

              {selectedItems.length > 0 && (
                <>
                  <Button size="sm" className="bg-theme-red hover:bg-theme-red-dark text-white" onClick={removeSelectedItems}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading your wishlist...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="relative bg-gray-900 rounded-xl border border-gray-700 overflow-hidden group hover:border-gray-500 hover:shadow-lg transition-all duration-300">
                {/* Selection Checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(parseInt(item.id))}
                    onChange={() => toggleItemSelection(parseInt(item.id))}
                    className="w-4 h-4 text-theme-cyan bg-gray-800 border-gray-600 rounded focus:ring-theme-cyan focus:ring-offset-0"
                  />
                </div>

                {/* Loading indicator for removing items */}
                {removingItems.includes(parseInt(item.id)) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-xl backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-theme-cyan" />
                  </div>
                )}

                {/* Image Section */}
                <div className="relative aspect-[4/3] bg-gray-800">
                  {item.product_data?.main_image ? (
                    <img
                      src={item.product_data.main_image}
                      alt={item.product_data?.headline || 'Product'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center text-gray-600">
                                <span class="text-4xl">📦</span>
                              </div>
                            `;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <Badge className="bg-black/80 backdrop-blur-md text-white border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] px-3 py-1.5 underline-offset-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-bold text-lg text-theme-cyan font-mono leading-none">
                          {formatCryptoPrice(item.product_data?.price || '0', 'BTC')} BTC
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium leading-none">
                          ≈ ${formatUSD(item.product_data?.price || '0')}
                        </span>
                      </div>
                    </Badge>
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col h-[180px]">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1 line-clamp-2 group-hover:text-theme-cyan transition-colors">
                      {item.product_data?.headline || item.product_data?.listing_title || 'Unknown Product'}
                    </h3>
                    {item.product_data?.account_balance && (
                      <div className="flex mb-2">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="bg-theme-cyan/20 text-theme-cyan border border-theme-cyan/30 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-help transition-all hover:bg-theme-cyan/30">
                                BALANCE: ${item.product_data.account_balance}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black/90 backdrop-blur-md border-theme-cyan/30 p-2 rounded-lg">
                              <p className="text-[10px] font-bold text-white uppercase tracking-wider">BALANCE: ${item.product_data.account_balance}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="w-4 h-4 text-theme-cyan" />
                        <span className="text-gray-300 font-medium">{item.vendor_username}</span>
                      </div>
                      <div className="flex items-center space-x-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold">{item.product_data?.rating || '0.0'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <div className="flex items-center space-x-2">
                      {item.product_data?.quantity_available > 0 ? (
                        <span className="flex items-center text-xs font-medium text-theme-cyan">
                          <div className="w-1.5 h-1.5 rounded-full bg-theme-cyan mr-1.5 animate-pulse" />
                          In Stock
                        </span>
                      ) : (
                        <span className="flex items-center text-xs font-medium text-theme-red">
                          <div className="w-1.5 h-1.5 rounded-full bg-theme-red mr-1.5" />
                          Out of Stock
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        const productId = item.product_data?.id || item.product;
                        window.location.href = `/buyer/product/${productId}`;
                      }}
                      className="bg-gray-800 hover:bg-theme-cyan hover:text-black text-white border border-gray-700 hover:border-theme-cyan transition-all"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && wishlistItems.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-700 text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-400 mb-6">
              Start browsing and add items you'd like to purchase later
            </p>
            <Button
              className="bg-theme-red hover:bg-theme-red-dark text-white cursor-pointer"
              onClick={() => window.location.href = '/buyer/listings'}
            >
              Browse Products
            </Button>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
