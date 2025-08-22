import { ShoppingCart, Package, Heart, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const overviewData = [
  {
    title: "Total Orders",
    value: "24",
    icon: ShoppingCart,
    color: "from-blue-500 to-purple-600",
    textColor: "text-blue-600 dark:text-blue-400"
  },
  {
    title: "Active Orders",
    value: "3",
    icon: Package,
    color: "from-green-500 to-emerald-600",
    textColor: "text-green-600 dark:text-green-400"
  },
  {
    title: "Wishlist Items",
    value: "12",
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    textColor: "text-pink-600 dark:text-pink-400"
  },
  {
    title: "Unread Messages",
    value: "5",
    icon: MessageSquare,
    color: "from-orange-500 to-amber-600",
    textColor: "text-orange-600 dark:text-orange-400"
  }
];

export function OverviewCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {overviewData.map((item, index) => {
        const Icon = item.icon;
        
        return (
          <Card 
            key={item.title}
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-white dark:bg-gray-800"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {item.title}
                  </p>
                  <p className={`text-3xl font-bold ${item.textColor}`}>
                    {item.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}