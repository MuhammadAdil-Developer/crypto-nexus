import { ChevronLeft, ChevronRight, Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const recommendedVendors = [
  {
    id: 1,
    name: "CryptoAccountsPlus",
    rating: 4.9,
    products: 47,
    totalSales: "12.8 BTC",
    specialty: "Streaming Services",
    avatar: "CA"
  },
  {
    id: 2,
    name: "DigitalVault",
    rating: 4.7,
    products: 23,
    totalSales: "8.4 BTC", 
    specialty: "Software & Tools",
    avatar: "DV"
  },
  {
    id: 3,
    name: "PremiumSoft",
    rating: 4.8,
    products: 31,
    totalSales: "15.2 BTC",
    specialty: "Creative Software",
    avatar: "PS"
  }
];

const popularProducts = [
  {
    id: 1,
    title: "Discord Nitro (1 Year)",
    price: "0.0009 BTC",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
    orders: 145
  },
  {
    id: 2,
    title: "Microsoft Office 365",
    price: "0.0025 BTC",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    orders: 89
  },
  {
    id: 3,
    title: "HBO Max Premium",
    price: "0.0011 BTC", 
    image: "https://images.unsplash.com/photo-1489599417076-1e36a7bb28a3?w=400",
    orders: 67
  }
];

export function RecommendationsSection() {
  return (
    <div className="space-y-8">
      {/* Recommended Vendors */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recommended Vendors</h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedVendors.map((vendor) => (
            <Card key={vendor.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-lg">{vendor.avatar}</span>
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {vendor.name}
                </h3>
                
                <div className="flex items-center justify-center space-x-1 mb-3">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{vendor.rating}</span>
                  <span className="text-sm text-gray-500">({vendor.products} products)</span>
                </div>
                
                <Badge variant="secondary" className="mb-3">
                  {vendor.specialty}
                </Badge>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Total Sales: {vendor.totalSales}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  size="sm"
                >
                  View Vendor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Products */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Popular This Week</h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {popularProducts.map((product) => (
            <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
              <div className="relative h-32 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-red-500 text-white text-xs">
                    🔥 {product.orders} orders
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {product.title}
                </h3>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {product.price}
                  </span>
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    Order Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}