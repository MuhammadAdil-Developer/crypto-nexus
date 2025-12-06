import { useState, useEffect, useCallback } from "react";
import { Heart, Trash2, ShoppingCart, Share2, Loader2, User, Star, Eye } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import wishlistService, { WishlistItem, WishlistStats } from "@/services/wishlistService";

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
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Your Wishlist</h1>
                <p className="text-gray-300">{wishlistItems.length} items saved for later</p>
              </div>
            </div>
            <Button variant="outline" className="text-white border-gray-500 hover:bg-gray-600">
              <Share2 className="w-4 h-4 mr-2" />
              Share Wishlist
            </Button>
          </div>
        </div>

        {/* Wishlist Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-white">{stats?.total_items || wishlistItems.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
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
                <ShoppingCart className="w-6 h-6 text-white" />
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
                <span className="text-white font-bold text-sm">↓</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.total_value ? `${Number(stats.total_value).toFixed(8)} BTC` : '0.00000000 BTC'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">₿</span>
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
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
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
                  <Button variant="outline" size="sm">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="destructive" size="sm" onClick={removeSelectedItems}>
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
              <div key={item.id} className="relative">
                {/* Selection Checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(parseInt(item.id))}
                    onChange={() => toggleItemSelection(parseInt(item.id))}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Loading indicator for removing items */}
                {removingItems.includes(parseInt(item.id)) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}

                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="relative">
                    {item.product_data?.main_image ? (
                      <img
                        src={item.product_data.main_image}
                        alt={item.product_data?.headline || 'Product'}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          // Hide the broken image and show default icon instead
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-48 bg-gray-800 flex items-center justify-center">
                                <span class="text-gray-400 text-4xl">📦</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">📦</span>
                      </div>
                    )}
                    
                    {/* Price Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-black/70 text-white border-gray-500">
                        {parseFloat(item.product_data?.price || '0').toFixed(8)} BTC
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-2 line-clamp-2">
                      {item.product_data?.headline || item.product_data?.listing_title || 'Unknown Product'}
                    </h3>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300 text-sm">{item.vendor_username}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-gray-300 text-sm">4.5</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {item.product_data?.quantity_available > 0 ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            In Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        onClick={() => {
                          // Navigate to product detail page
                          const productId = item.product_data?.id || item.product;
                          window.location.href = `/buyer/product/${productId}`;
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Added Date */}
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-400">
                    Added on {item.added_at || item.created_at ? (() => {
                      const date = new Date(item.added_at || item.created_at);
                      return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
                    })() : 'Unknown Date'}
                  </p>
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
              className="bg-gray-700 cursor-pointer"
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
