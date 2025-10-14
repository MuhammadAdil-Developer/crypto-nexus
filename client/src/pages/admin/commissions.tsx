import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Save, AlertCircle, History, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://88.99.143.151:8000/api/v1';

// Create axios instance for API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface CommissionSettings {
  platform_fee_rate: number;
  escrow_fee_rate: number;
  streaming_commission_rate: number;
  software_commission_rate: number;
  gaming_commission_rate: number;
  services_commission_rate: number;
  default_commission_rate: number;
  min_commission_rate: number;
  max_commission_rate: number;
  updated_at: string;
}

interface CommissionHistoryItem {
  vendor: string;
  period: string;
  total_sales: string;
  commission_rate: string;
  commission_earned: string;
  usd_value: string;
  status: string;
  order_count: number;
  type: string;
}

export default function AdminCommissions() {
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<CommissionSettings>>({});
  
  // Commission history state
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Fetch commission settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/payments/admin/commission-settings/");
      
      if (response.data.success) {
        setSettings(response.data.settings);
        setFormData(response.data.settings);
      } else {
        console.error("API returned unsuccessful response:", response.data);
        toast.error("Failed to load commission settings");
        // Set default values if API fails
        const defaultSettings = {
          platform_fee_rate: 5,
          escrow_fee_rate: 1,
          streaming_commission_rate: 5,
          software_commission_rate: 4,
          gaming_commission_rate: 6,
          services_commission_rate: 7,
          default_commission_rate: 5,
          min_commission_rate: 3,
          max_commission_rate: 15,
          updated_at: new Date().toISOString()
        };
        setSettings(defaultSettings);
        setFormData(defaultSettings);
      }
    } catch (error: any) {
      console.error("Error fetching commission settings:", error);
      toast.error("Failed to load commission settings. Using default values.");
      // Set default values if API fails
      const defaultSettings = {
        platform_fee_rate: 5,
        escrow_fee_rate: 1,
        streaming_commission_rate: 5,
        software_commission_rate: 4,
        gaming_commission_rate: 6,
        services_commission_rate: 7,
        default_commission_rate: 5,
        min_commission_rate: 3,
        max_commission_rate: 15,
        updated_at: new Date().toISOString()
      };
      setSettings(defaultSettings);
      setFormData(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  // Fetch commission history
  const fetchCommissionHistory = async (period: string = 'all') => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await api.get(`/payments/admin/commission-history/?period=${period}`);
      
      if (response.data.success) {
        setCommissionHistory(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching commission history:', error);
      setHistoryError('Failed to fetch commission history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle tab change to fetch commission history
  const handleTabChange = (value: string) => {
    if (value === 'history') {
      fetchCommissionHistory();
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof CommissionSettings, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? '' : parseFloat(value)
    }));
  };

  // Save commission settings
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put("/payments/admin/commission-settings/", formData);
      
      if (response.data.success) {
        setSettings(response.data.settings);
        toast.success("Commission settings updated successfully!");
      } else {
        toast.error("Failed to update commission settings");
      }
    } catch (error: any) {
      console.error("Error updating commission settings:", error);
      toast.error("Failed to update commission settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading commission settings...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Commission Management</h1>
          <p className="text-gray-300 mt-1">Configure commission rates for the platform</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-bg hover:bg-accent-2"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Info Alert */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start">
        <AlertCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-white mb-1">Commission Settings</p>
          <p>These rates will be applied to all new orders. Platform fee and escrow fee are combined for direct payments.</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="bg-surface-2 mb-6">
          <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white">
            <Percent className="w-4 h-4 mr-2" />
            Commission Settings
          </TabsTrigger>
          <TabsTrigger value="vendors" className="text-gray-300 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Vendor Rates
          </TabsTrigger>
          <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" />
            Commission History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Commission Settings */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Percent className="w-5 h-5 mr-2 text-accent" />
              Global Commission Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Platform Fee */}
              <div>
                <Label htmlFor="platform_fee_rate" className="text-white">
                  Platform Fee Rate (%)
                </Label>
                <Input 
                  id="platform_fee_rate"
                  type="number"
                  step="0.01"
                  value={formData.platform_fee_rate ?? ''}
                  onChange={(e) => handleInputChange('platform_fee_rate', e.target.value)}
                  className="mt-2 bg-[#1a1f2e] border-border text-white"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Platform commission rate (applied to all orders)
                </p>
              </div>

              {/* Escrow Fee */}
              <div>
                <Label htmlFor="escrow_fee_rate" className="text-white">
                  Escrow Fee Rate (%)
                </Label>
                <Input 
                  id="escrow_fee_rate"
                  type="number"
                  step="0.01"
                  value={formData.escrow_fee_rate ?? ''}
                  onChange={(e) => handleInputChange('escrow_fee_rate', e.target.value)}
                  className="mt-2 bg-[#1a1f2e] border-border"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Escrow fee rate (additional fee for escrow orders)
                </p>
              </div>

              {/* Default Commission */}
              <div>
                <Label htmlFor="default_commission_rate" className="text-white">
                  Default Commission Rate (%)
                </Label>
                <Input 
                  id="default_commission_rate"
                  type="number"
                  step="0.01"
                  value={formData.default_commission_rate ?? ''}
                  onChange={(e) => handleInputChange('default_commission_rate', e.target.value)}
                  className="mt-2 bg-[#1a1f2e] border-border text-white"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Default rate for new vendors
                </p>
              </div>

              {/* Min/Max Rates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_commission_rate" className="text-white">
                    Min Rate (%)
                  </Label>
                  <Input 
                    id="min_commission_rate"
                    type="number"
                    step="0.01"
                    value={formData.min_commission_rate ?? ''}
                    onChange={(e) => handleInputChange('min_commission_rate', e.target.value)}
                    className="mt-2 bg-[#1a1f2e] border-border text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="max_commission_rate" className="text-white">
                    Max Rate (%)
                  </Label>
                  <Input 
                    id="max_commission_rate"
                    type="number"
                    step="0.01"
                    value={formData.max_commission_rate ?? ''}
                    onChange={(e) => handleInputChange('max_commission_rate', e.target.value)}
                    className="mt-2 bg-[#1a1f2e] border-border text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category-Based Commission Rates */}
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Percent className="w-5 h-5 mr-2 text-accent" />
              Category-Based Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Streaming Services */}
              <div className="p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Streaming Services</p>
                    <p className="text-sm text-gray-400">Digital entertainment accounts</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.streaming_commission_rate ?? ''}
                      onChange={(e) => handleInputChange('streaming_commission_rate', e.target.value)}
                      className="w-20 bg-surface border-border text-white text-center"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              </div>

              {/* Software & Tools */}
              <div className="p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Software & Tools</p>
                    <p className="text-sm text-gray-400">Software licenses and applications</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.software_commission_rate ?? ''}
                      onChange={(e) => handleInputChange('software_commission_rate', e.target.value)}
                      className="w-20 bg-surface border-border text-white text-center"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              </div>

              {/* Gaming */}
              <div className="p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Gaming</p>
                    <p className="text-sm text-gray-400">Game accounts and in-game items</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.gaming_commission_rate ?? ''}
                      onChange={(e) => handleInputChange('gaming_commission_rate', e.target.value)}
                      className="w-20 bg-surface border-border text-white text-center"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              </div>

              {/* Digital Services */}
              <div className="p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Digital Services</p>
                    <p className="text-sm text-gray-400">VPNs, hosting, and online services</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.services_commission_rate ?? ''}
                      onChange={(e) => handleInputChange('services_commission_rate', e.target.value)}
                      className="w-20 bg-surface border-border text-white text-center"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Last Updated Info */}
          {settings && (
            <div className="mt-6 text-sm text-gray-400 text-center">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendors">
          <Card className="crypto-card">
            <CardHeader>
              <CardTitle className="text-white">Individual Vendor Commission Rates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Current Rate</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Total Sales</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Performance</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">Member Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-surface-2/50">
                      <td className="p-4">
                        <p className="font-medium text-white">CryptoAccountsPlus</p>
                      </td>
                      <td className="p-4 text-gray-300">Streaming Services</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Input 
                            type="number"
                            defaultValue="5"
                            className="w-20 bg-surface-2 border-border text-white text-center"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-white">12.8 BTC</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs bg-success/20 text-success">
                          Excellent
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">2023-08-15</td>
                    </tr>
                    <tr className="hover:bg-surface-2/50">
                      <td className="p-4">
                        <p className="font-medium text-white">PremiumSoft</p>
                      </td>
                      <td className="p-4 text-gray-300">Software & Tools</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Input 
                            type="number"
                            defaultValue="4"
                            className="w-20 bg-surface-2 border-border text-white text-center"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-white">8.4 BTC</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs bg-warning/20 text-warning">
                          Good
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">2023-12-03</td>
                    </tr>
                    <tr className="hover:bg-surface-2/50">
                      <td className="p-4">
                        <p className="font-medium text-white">DigitalVault</p>
                      </td>
                      <td className="p-4 text-gray-300">Software & Tools</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Input 
                            type="number"
                            defaultValue="5"
                            className="w-20 bg-surface-2 border-border text-white text-center"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-white">0 BTC</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs bg-accent/20 text-accent">
                          New
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">2024-03-22</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="crypto-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Commission Earnings History</CardTitle>
                <div className="flex gap-2">
                  <select 
                    className="bg-[#1a1f2e] border border-border text-white px-3 py-1 rounded"
                    onChange={(e) => fetchCommissionHistory(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400">Loading commission history...</div>
                </div>
              ) : historyError ? (
                <div className="p-8 text-center">
                  <div className="text-red-400">{historyError}</div>
                </div>
              ) : commissionHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400">No commission history found</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Vendor</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Period</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Total Sales</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Commission Rate</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Commission Earned</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">USD Value</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {commissionHistory.map((item, index) => (
                        <tr key={index} className="hover:bg-surface-2/50">
                          <td className="p-4 text-white">{item.vendor}</td>
                          <td className="p-4 text-gray-300">{item.period}</td>
                          <td className="p-4">
                            <span className="font-mono text-white">{item.total_sales}</span>
                          </td>
                          <td className="p-4 text-white">{item.commission_rate}</td>
                          <td className="p-4">
                            <span className="font-mono text-accent">{item.commission_earned}</span>
                          </td>
                          <td className="p-4 text-gray-300">{item.usd_value}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.status === 'Paid Out' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
