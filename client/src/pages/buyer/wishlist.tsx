import { useState } from "react";
import { Heart, Trash2, ShoppingCart, Share2 } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { ProductCard } from "@/components/buyer/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const wishlistItems = [
  {
    id: 1,
    title: "Netflix Premium Account (1 Year)",
    vendor: "CryptoAccountsPlus",
    price: "0.0012 BTC",
    image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400",
    rating: 4.9,
    inStock: true,
    addedDate: "2024-01-10",
    priceChange: "down"
  },
  {
    id: 2,
    title: "Adobe Creative Cloud (1 Year)",
    vendor: "PremiumSoft",
    price: "0.0034 BTC",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400", 
    rating: 4.8,
    inStock: false,
    addedDate: "2024-01-08",
    priceChange: "up"
  },
  {
    id: 3,
    title: "Spotify Premium (6 Months)",
    vendor: "DigitalVault",
    price: "0.0008 BTC", 
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    rating: 4.7,
    inStock: true,
    addedDate: "2024-01-05",
    priceChange: "same"
  },
  {
    id: 4,
    title: "Discord Nitro (1 Year)",
    vendor: "GamersVault",
    price: "0.0009 BTC",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
    rating: 4.6,
    inStock: true,
    addedDate: "2024-01-03",
    priceChange: "down"
  }
];

export default function BuyerWishlist() {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(wishlistItems.map(item => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const removeSelectedItems = () => {
    // Handle remove selected items
    setSelectedItems([]);
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
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
                <p className="text-2xl font-bold text-white">{wishlistItems.length}</p>
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
                  {wishlistItems.filter(item => item.inStock).length}
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
                  {wishlistItems.filter(item => item.priceChange === "down").length}
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
                <p className="text-2xl font-bold text-white">0.0063 BTC</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="relative">
              {/* Selection Checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleItemSelection(item.id)}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {/* Price Change Indicator */}
              {item.priceChange !== "same" && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge 
                    className={`text-xs ${
                      item.priceChange === "down" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.priceChange === "down" ? "↓ Price Drop" : "↑ Price Up"}
                  </Badge>
                </div>
              )}

              <ProductCard product={item} />

              {/* Added Date */}
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-400">
                  Added on {new Date(item.addedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {wishlistItems.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-700 text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-400 mb-6">
              Start browsing and add items you'd like to purchase later
            </p>
            <Button className="bg-gray-700">
              Browse Products
            </Button>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}