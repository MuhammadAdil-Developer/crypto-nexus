import { TrendingUp, TrendingDown, Bitcoin, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ADMIN_NAV_ITEMS, SAMPLE_ORDERS, SAMPLE_ACTIVITY } from "@/lib/constants";

export function Overview() {
  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {/* Alert Banner */}
      <div className="mb-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-warning">Action Required</h3>
            <div className="mt-2 text-sm text-warning/80">
              <p>7 vendor applications pending review • 3 disputes awaiting resolution • BTC node requires update</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Users");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted">Total Users</p>
                <p className="text-2xl font-bold text-text">2,847</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                12%
              </span>
              <span className="text-muted ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Vendors");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted">Active Vendors</p>
                <p className="text-2xl font-bold text-text">127</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                8%
              </span>
              <span className="text-muted ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Listings");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted">Live Listings</p>
                <p className="text-2xl font-bold text-text">1,432</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                24%
              </span>
              <span className="text-muted ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  {(() => {
                    const item = ADMIN_NAV_ITEMS.find(item => item.title === "Orders");
                    if (item?.icon) {
                      const Icon = item.icon;
                      return <Icon className="text-accent w-4 h-4" />;
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-muted">Orders Today</p>
                <p className="text-2xl font-bold text-text">89</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-danger flex items-center">
                <TrendingDown className="w-3 h-3 mr-1" />
                3%
              </span>
              <span className="text-muted ml-2">vs yesterday</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Order Volume Chart */}
        <Card className="lg:col-span-2 crypto-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Order Volume</h3>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-accent/20 text-accent rounded-md">7D</button>
                <button className="px-3 py-1 text-sm text-muted hover:bg-surface-2 rounded-md">30D</button>
                <button className="px-3 py-1 text-sm text-muted hover:bg-surface-2 rounded-md">90D</button>
              </div>
            </div>
            
            <div className="h-64 bg-surface-2 rounded-xl flex items-center justify-center border border-border relative overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                alt="Trading chart visualization" 
                className="w-full h-full object-cover rounded-xl opacity-60" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center text-muted bg-surface/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                  </svg>
                  <span>Chart: Order volume trends</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {SAMPLE_ACTIVITY.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === "success" ? "bg-success" :
                    activity.type === "warning" ? "bg-warning" :
                    activity.type === "accent" ? "bg-accent" :
                    activity.type === "danger" ? "bg-danger" :
                    "bg-muted"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-text">{activity.title}</p>
                    <p className="text-xs text-muted">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Node Status and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Crypto Node Status */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Crypto Nodes</h3>
            
            {/* BTC Node */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                  <Bitcoin className="text-warning w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-text">Bitcoin Node</p>
                  <p className="text-sm text-muted">Block #820,847 • Synced 2 min ago</p>
                </div>
              </div>
              <StatusBadge status="Connected" type="success" />
            </div>
            
            {/* XMR Node */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Monero Node</p>
                  <p className="text-sm text-muted">Block #3,021,456 • Synced 1 min ago</p>
                </div>
              </div>
              <StatusBadge status="Connected" type="success" />
            </div>
          </CardContent>
        </Card>
        
        {/* Escrow Status */}
        <Card className="crypto-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Escrow Overview</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-surface-2 rounded-xl">
                <p className="text-2xl font-bold text-text font-mono">12.847</p>
                <p className="text-sm text-muted">BTC in Escrow</p>
                <p className="text-xs text-muted mt-1">~$525,847</p>
              </div>
              <div className="text-center p-4 bg-surface-2 rounded-xl">
                <p className="text-2xl font-bold text-text font-mono">847.23</p>
                <p className="text-sm text-muted">XMR in Escrow</p>
                <p className="text-xs text-muted mt-1">~$145,623</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Pending Releases</span>
                <span className="text-text">23 orders</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Auto-Release (48h)</span>
                <span className="text-text">156 orders</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Disputed</span>
                <span className="text-danger">3 orders</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Orders Table */}
      <Card className="crypto-card">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Recent Orders</h3>
            <a href="#" className="text-sm text-accent hover:text-accent-2">View all orders →</a>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Listing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SAMPLE_ORDERS.map((order) => (
                <tr key={order.id} className="hover:bg-surface-2">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-accent">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text">{order.buyer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text">{order.vendor}</td>
                  <td className="px-6 py-4 text-sm text-text">{order.listing}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text font-mono">{order.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={order.status} type={order.statusType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">{order.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
