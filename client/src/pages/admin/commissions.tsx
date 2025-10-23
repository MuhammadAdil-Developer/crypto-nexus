import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Save, AlertCircle, History, Users } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic example inputs to avoid build break; extend as needed */}
            <div>
              <Label className="text-gray-300">Platform Fee %</Label>
              <Input
                type="number"
                value={(formData.platform_fee_rate as any) ?? ''}
                onChange={(e) => handleInputChange('platform_fee_rate', e.target.value)}
                className="bg-surface text-white border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">Escrow Fee %</Label>
              <Input
                type="number"
                value={(formData.escrow_fee_rate as any) ?? ''}
                onChange={(e) => handleInputChange('escrow_fee_rate', e.target.value)}
                className="bg-surface text-white border-gray-700"
              />
            </div>
            <div className="md:col-span-2 text-sm text-gray-400">
              Adjust additional category rates below as needed.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <Card className="bg-surface-2 border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Vendor-Specific Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-400 text-sm">
                Configure per-vendor overrides in a future update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-surface-2 border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Commission History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-gray-400">Loading history...</div>
              ) : historyError ? (
                <div className="text-red-400">{historyError}</div>
              ) : (
                <div className="space-y-2">
                  {commissionHistory.length === 0 ? (
                    <div className="text-gray-400">No history available.</div>
                  ) : (
                    commissionHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-300 border-b border-gray-800 py-2">
                        <span>{item.vendor}</span>
                        <span>{item.period}</span>
                        <span>{item.commission_rate}%</span>
                        <span>{item.commission_earned}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}