import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { OrdersTable } from "@/components/buyer/OrdersTable";
import { MessagesPanel } from "@/components/buyer/MessagesPanel";
import { RecommendationsSection } from "@/components/buyer/RecommendationsSection";


export default function BuyerHome() {
  return (
    <BuyerLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-8 text-white border border-gray-700">
          <h1 className="text-3xl font-bold mb-2">Welcome back, crypto_buyer!</h1>
          <p className="text-gray-300">Discover amazing deals from trusted vendors in our marketplace</p>
        </div>


        {/* Recent Orders */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Orders</h2>
            <a href="/buyer/orders" className="text-blue-400 hover:text-blue-300 font-medium">
              View all →
            </a>
          </div>
          <OrdersTable compact={true} />
        </section>

        {/* Messages */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Messages</h2>
            <a href="/buyer/messages" className="text-blue-400 hover:text-blue-300 font-medium">
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