import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { OverviewCards } from "@/components/buyer/OverviewCards";
import { ProductCard } from "@/components/buyer/ProductCard";
import { OrdersTable } from "@/components/buyer/OrdersTable";
import { MessagesPanel } from "@/components/buyer/MessagesPanel";
import { RecommendationsSection } from "@/components/buyer/RecommendationsSection";

// Sample data for featured listings
const featuredListings = [
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
  }
];

export default function BuyerHome() {
  return (
    <BuyerLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome back, crypto_buyer!</h1>
          <p className="text-blue-100">Discover amazing deals from trusted vendors in our marketplace</p>
        </div>

        {/* Overview Cards */}
        <OverviewCards />

        {/* Featured Listings */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Listings</h2>
            <a href="/buyer/listings" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((listing) => (
              <ProductCard key={listing.id} product={listing} />
            ))}
          </div>
        </section>

        {/* Recent Orders */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Orders</h2>
            <a href="/buyer/orders" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </a>
          </div>
          <OrdersTable compact={true} />
        </section>

        {/* Messages */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Messages</h2>
            <a href="/buyer/messages" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </a>
          </div>
          <MessagesPanel compact={true} />
        </section>

        {/* Recommendations */}
        <RecommendationsSection />
      </div>
    </BuyerLayout>
  );
}