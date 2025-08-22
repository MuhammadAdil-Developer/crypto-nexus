import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { MessagesPanel } from "@/components/buyer/MessagesPanel";
import { MessageSquare, Users, Clock } from "lucide-react";

const messageStats = [
  { label: "Total Conversations", value: "12", color: "from-blue-500 to-purple-600" },
  { label: "Unread Messages", value: "5", color: "from-red-500 to-pink-600" },
  { label: "Active Vendors", value: "8", color: "from-green-500 to-emerald-600" },
  { label: "Avg Response Time", value: "2h", color: "from-yellow-500 to-orange-600" }
];

export default function BuyerMessages() {
  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Messages</h1>
              <p className="text-blue-100">Chat with vendors and get support</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {messageStats.map((stat, index) => {
            const icons = [MessageSquare, MessageSquare, Users, Clock];
            const Icon = icons[index];
            
            return (
              <div 
                key={stat.label}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Messages Panel */}
        <MessagesPanel />

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left">
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Contact Support</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get help with orders or account issues</p>
            </button>
            
            <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left">
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Report Issue</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Report a problem with a vendor or order</p>
            </button>
            
            <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left">
              <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-2">Message Settings</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configure notification preferences</p>
            </button>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}