import { useState } from "react";
import { Search, Filter, Grid, List as ListIcon, ChevronDown } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { ProductCard } from "@/components/buyer/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categories = [
  { id: "all", name: "All Categories", count: 1432 },
  { id: "streaming", name: "Streaming Services", count: 247 },
  { id: "gaming", name: "Gaming Accounts", count: 189 },
  { id: "software", name: "Software & Tools", count: 156 },
  { id: "vpn", name: "VPN & Security", count: 98 }
];

const listings = [
  {
    id: 1,
    title: "Netflix Premium Account (1 Year)",
    vendor: "CryptoAccountsPlus",
    price: "0.0012 BTC",
    image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400",
    rating: 4.9,
    inStock: true
  },
  {
    id: 2,
    title: "Spotify Premium (6 Months)",
    vendor: "DigitalVault",
    price: "0.0008 BTC", 
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    rating: 4.7,
    inStock: true
  },
  {
    id: 3,
    title: "Adobe Creative Cloud (1 Year)",
    vendor: "PremiumSoft",
    price: "0.0034 BTC",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400", 
    rating: 4.8,
    inStock: false
  },
  {
    id: 4,
    title: "Discord Nitro (1 Year)",
    vendor: "GamersVault",
    price: "0.0009 BTC",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
    rating: 4.6,
    inStock: true
  },
  {
    id: 5,
    title: "YouTube Premium (6 Months)",
    vendor: "StreamingPro",
    price: "0.0007 BTC",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
    rating: 4.5,
    inStock: true
  },
  {
    id: 6,
    title: "Microsoft Office 365",
    vendor: "SoftwareHub",
    price: "0.0025 BTC",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    rating: 4.7,
    inStock: true
  }
];

export default function BuyerListings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState("grid");

  const filteredListings = listings.filter(listing => 
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <h1 className="text-2xl font-bold mb-2">Browse Listings</h1>
          <p className="text-gray-300">Discover products from trusted vendors</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products, vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-32">
                  Sort by: {sortBy === "popular" ? "Popular" : sortBy === "price-low" ? "Price: Low" : "Price: High"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("popular")}>
                  Most Popular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-low")}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-high")}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("rating")}>
                  Highest Rated
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 sticky top-6">
              <h3 className="font-semibold text-white mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                      selectedCategory === category.id
                        ? "bg-blue-900/30 text-blue-400"
                        : "hover:bg-gray-800 text-gray-300"
                    }`}
                  >
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400">
                Showing {filteredListings.length} of {listings.length} results
              </p>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <ProductCard key={listing.id} product={listing} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="bg-gray-900 rounded-xl p-6 border border-gray-700 flex items-center space-x-6">
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{listing.title}</h3>
                      <p className="text-gray-400">{listing.vendor}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-lg font-bold text-blue-400">{listing.price}</span>
                        <Badge variant={listing.inStock ? "default" : "destructive"}>
                          {listing.inStock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline">View</Button>
                      <Button disabled={!listing.inStock}>Order Now</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}