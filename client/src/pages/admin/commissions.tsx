import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Save, AlertCircle, History, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import axios from "axios";

import { API_BASE_URL } from '@/config/api';

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
  period?: string;
  total_sales: string;
  commission_rate: string;
  platform_earnings: string;
  platform_earnings_usd?: string;
  vendor_earnings: string;
  vendor_earnings_usd?: string;
  status: string;
  order_count?: number;
  type: string;
  date?: string;
  order_id?: string;
}

interface VendorFee {
  vendor_id: string;
  vendor_username: string;
  commission_rate: number | null;
  updated_by: string | null;
  updated_at: string | null;
  uses_default: boolean;
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
  const [viewMode, setViewMode] = useState<'aggregated' | 'detailed'>('aggregated');

  // Vendor fees state
  const [vendorFees, setVendorFees] = useState<VendorFee[]>([]);
  const [vendorFeesLoading, setVendorFeesLoading] = useState(false);
  const [vendorFeesError, setVendorFeesError] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [editFeeValue, setEditFeeValue] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

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

  // Stats state
  const [stats, setStats] = useState<{
    total_earnings_usd: number;
    total_sales_vol: number;
    total_commissions: number;
    commissions_breakdown?: string;
  } | null>(null);

  // ... (keep load settings)

  // Fetch commission history
  const fetchCommissionHistory = async (page: number = 1, limit: number = itemsPerPage, period: string = 'all') => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await api.get(`/payments/admin/commission-history/`, {
        params: {
          period,
          page,
          limit,
          mode: viewMode
        }
      });

      if (response.data.success) {
        setCommissionHistory(response.data.data);
        setTotalItems(response.data.total || response.data.data.length);
        setTotalPages(response.data.total_pages || 1);
        setCurrentPage(page);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (error: any) {
      console.error('Error fetching commission history:', error);
      setHistoryError('Failed to fetch commission history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ... (keep useEffects and other handlers)




  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (currentPage === 1) {
      fetchCommissionHistory(1);
    } else {
      setCurrentPage(1);
    }
  }, [viewMode]);

  // Fetch vendor fees
  const fetchVendorFees = async (page: number = 1, limit: number = itemsPerPage) => {
    try {
      setVendorFeesLoading(true);
      setVendorFeesError(null);
      const response = await api.get('/payments/admin/vendor-fees/', {
        params: {
          page,
          limit
        }
      });

      if (response.data.success) {
        setVendorFees(response.data.data);
        setTotalItems(response.data.total || response.data.data.length);
        setTotalPages(response.data.total_pages || 1);
        setCurrentPage(page);
      } else {
        setVendorFeesError('Failed to fetch vendor fees');
      }
    } catch (error: any) {
      console.error('Error fetching vendor fees:', error);
      setVendorFeesError('Failed to fetch vendor fees');
    } finally {
      setVendorFeesLoading(false);
    }
  };

  // Update vendor fee
  const updateVendorFee = async (vendorId: string, commissionRate: number | null) => {
    try {
      const response = await api.put('/payments/admin/vendor-fees/', {
        vendor_id: vendorId,
        commission_rate: commissionRate
      });

      if (response.data.success) {
        toast.success(`Vendor fee updated successfully!`);
        setEditingVendor(null);
        setEditFeeValue("");
        fetchVendorFees();
      } else {
        toast.error(response.data.error || 'Failed to update vendor fee');
      }
    } catch (error: any) {
      console.error('Error updating vendor fee:', error);
      toast.error(error.response?.data?.error || 'Failed to update vendor fee');
    }
  };

  // Handle tab change to fetch commission history or vendor fees
  const handleTabChange = (value: string) => {
    setCurrentPage(1);
    if (value === 'history') {
      fetchCommissionHistory(1);
    } else if (value === 'vendors') {
      fetchVendorFees(1);
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
    <main className="flex-1 overflow-y-auto bg-bg p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Commission Management</h1>
          <p className="text-gray-300 mt-1 text-sm sm:text-base">Configure commission rates for the platform</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-accent text-bg hover:bg-accent-2 w-full sm:w-auto"
        >
          <Save className="w-4 h-4 sm:mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className={`bg-surface-2 border border-blue-500/20 transition-opacity ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardContent className="p-4 flex flex-col relative">
            <span className="text-gray-400 text-sm font-medium uppercase text-[10px] tracking-tight">Total Earnings (Approx USD)</span>
            {historyLoading && !stats ? (
              <div className="h-8 w-24 bg-surface rounded animate-pulse mt-1" />
            ) : (
              <span className="text-2xl font-bold text-white mt-1">
                ${stats?.total_earnings_usd?.toFixed(2) || '0.00'}
              </span>
            )}
            {historyLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 text-blue-400 animate-spin" />}
          </CardContent>
        </Card>
        <Card className={`bg-surface-2 border border-green-500/20 transition-opacity ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardContent className="p-4 flex flex-col relative">
            <span className="text-gray-400 text-sm font-medium uppercase text-[10px] tracking-tight">Total Sales Volume (Approx USD)</span>
            {historyLoading && !stats ? (
              <div className="h-8 w-32 bg-surface rounded animate-pulse mt-1" />
            ) : (
              <span className="text-2xl font-bold text-white mt-1">
                ${stats?.total_sales_vol?.toFixed(2) || '0.00'}
              </span>
            )}
            {historyLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 text-green-400 animate-spin" />}
          </CardContent>
        </Card>
        <Card className={`bg-surface-2 border border-purple-500/20 transition-opacity ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardContent className="p-4 flex flex-col relative">
            <span className="text-gray-400 text-sm font-medium uppercase text-[10px] tracking-tight">Total Commissions (Approx USD)</span>
            {historyLoading && !stats ? (
              <div className="h-8 w-24 bg-surface rounded animate-pulse mt-1" />
            ) : (
              <>
                <span className="text-2xl font-bold text-white mt-1">
                  ${stats?.total_commissions?.toFixed(2) || '0.00'}
                </span>
                {stats?.commissions_breakdown && (
                  <span className="text-xs text-gray-500 mt-1 truncate">{stats.commissions_breakdown}</span>
                )}
              </>
            )}
            {historyLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 text-purple-400 animate-spin" />}
          </CardContent>
        </Card>
      </div>


      {/* Info Alert */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start">
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
        <div className="text-xs sm:text-sm text-gray-300">
          <p className="font-medium text-white mb-1">Commission Settings</p>
          <p>These rates will be applied to all new orders. Platform fee and escrow fee are combined for direct payments.</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="bg-surface-2 mb-4 sm:mb-6 flex-wrap">
          <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            <Percent className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Commission Settings</span>
            <span className="sm:hidden">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Vendor Rates</span>
            <span className="sm:hidden">Vendors</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            <History className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Commission History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label className="text-gray-300 text-sm sm:text-base mb-2 block font-bold uppercase tracking-wider">Platform Fee %</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={(formData.platform_fee_rate as any) ?? ''}
                  onChange={(e) => handleInputChange('platform_fee_rate', e.target.value)}
                  className="bg-gray-950 border-gray-700 text-white focus:border-accent w-full"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</div>
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-sm sm:text-base mb-2 block font-bold uppercase tracking-wider">Escrow Fee %</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={(formData.escrow_fee_rate as any) ?? ''}
                  onChange={(e) => handleInputChange('escrow_fee_rate', e.target.value)}
                  className="bg-gray-950 border-gray-700 text-white focus:border-accent w-full"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <Card className="bg-surface-2 border border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg sm:text-xl">Vendor-Specific Rates</CardTitle>
              <p className="text-gray-400 text-sm mt-2">Set custom commission rates for individual vendors. Leave empty to use default platform rate.</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {vendorFeesLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-gray-800">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Loading Vendor Data</p>
                    <p className="text-gray-500 text-sm">Synchronizing custom commission rates...</p>
                  </div>
                </div>
              ) : vendorFeesError ? (
                <div className="text-red-400 text-sm sm:text-base py-8 text-center">{vendorFeesError}</div>
              ) : vendorFees.length === 0 ? (
                <div className="text-gray-400 text-sm sm:text-base py-8 text-center italic">No vendors found.</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[600px] px-4 sm:px-0">
                      <table className="w-full">
                        <thead className="bg-surface border-b border-gray-800">
                          <tr>
                            <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Vendor</th>
                            <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Commission Rate</th>
                            <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Updated By</th>
                            <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Last Updated</th>
                            <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorFees.map((vendorFee) => (
                            <tr key={vendorFee.vendor_id} className="border-b border-gray-800 hover:bg-surface/50">
                              <td className="p-3 text-xs sm:text-sm text-white font-medium">{vendorFee.vendor_username}</td>
                              <td className="p-3 text-xs sm:text-sm text-gray-300">
                                {editingVendor === vendorFee.vendor_id ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={settings?.min_commission_rate || 3}
                                    max={settings?.max_commission_rate || 15}
                                    value={editFeeValue}
                                    onChange={(e) => setEditFeeValue(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white w-24"
                                    placeholder="Default"
                                  />
                                ) : (
                                  <span className={vendorFee.uses_default ? "text-gray-500 italic" : "text-white"}>
                                    {vendorFee.uses_default ? "Default" : `${vendorFee.commission_rate}%`}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-xs sm:text-sm text-gray-300">
                                {vendorFee.updated_by || "-"}
                              </td>
                              <td className="p-3 text-xs sm:text-sm text-gray-300">
                                {vendorFee.updated_at ? new Date(vendorFee.updated_at).toLocaleDateString() : "-"}
                              </td>
                              <td className="p-3 text-xs sm:text-sm">
                                {editingVendor === vendorFee.vendor_id ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const rate = editFeeValue === "" ? null : parseFloat(editFeeValue);
                                        if (rate !== null && (isNaN(rate) || rate < (settings?.min_commission_rate || 3) || rate > (settings?.max_commission_rate || 15))) {
                                          toast.error(`Rate must be between ${settings?.min_commission_rate || 3}% and ${settings?.max_commission_rate || 15}%`);
                                          return;
                                        }
                                        updateVendorFee(vendorFee.vendor_id, rate);
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingVendor(null);
                                        setEditFeeValue("");
                                      }}
                                      className="border-gray-600 text-gray-300 hover:bg-gray-700 h-7 px-3"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingVendor(vendorFee.vendor_id);
                                      setEditFeeValue(vendorFee.commission_rate?.toString() || "");
                                    }}
                                    className="border-gray-600 text-gray-300 hover:bg-gray-700 h-7 px-3"
                                  >
                                    Edit
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            {vendorFees.length > 0 && !vendorFeesLoading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => fetchVendorFees(page)}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={(limit) => setItemsPerPage(limit)}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-surface-2 border border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-lg sm:text-xl">Commission History</CardTitle>
              <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-gray-700">
                <Button
                  variant={viewMode === 'aggregated' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('aggregated')}
                  className={`text-xs h-7 ${viewMode === 'aggregated' ? 'bg-surface-3 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Summary
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                  className={`text-xs h-7 ${viewMode === 'detailed' ? 'bg-surface-3 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Detailed
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {historyLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-gray-800">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Fetching History</p>
                    <p className="text-gray-500 text-sm">Processing real-time commission data...</p>
                  </div>
                </div>
              ) : historyError ? (
                <div className="text-red-400 text-sm sm:text-base py-8 text-center">{historyError}</div>
              ) : (
                <div className="space-y-2">
                  {commissionHistory.length === 0 ? (
                    <div className="text-gray-400 text-sm sm:text-base py-8 text-center italic">No history available.</div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="min-w-[700px] px-4 sm:px-0">
                        <table className="w-full">
                          <thead className="bg-surface border-b border-gray-800">
                            <tr>
                              {viewMode === 'detailed' && (
                                <>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Date</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Order ID</th>
                                </>
                              )}
                              <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Vendor</th>
                              {viewMode === 'aggregated' && (
                                <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Period</th>
                              )}
                              {viewMode === 'detailed' && (
                                <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Type</th>
                              )}
                              {viewMode === 'aggregated' && (
                                <>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Rate</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Platform Earnings</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Vendor Earnings</th>
                                </>
                              )}
                              {viewMode === 'detailed' && (
                                <>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Sales</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Rate</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Platform</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300">Vendor</th>
                                  <th className="text-left p-3 text-xs sm:text-sm font-medium text-gray-300 text-right">Status</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className={`${historyLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            {commissionHistory.map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-800 hover:bg-surface/50">
                                {viewMode === 'detailed' && (
                                  <>
                                    <td className="p-3 text-xs sm:text-sm text-gray-300 whitespace-nowrap">
                                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-3 text-xs sm:text-sm text-accent font-mono cursor-help" title={item.order_id}>
                                      {item.order_id?.substring(0, 8)}...
                                    </td>
                                  </>
                                )}
                                <td className="p-3 text-xs sm:text-sm text-gray-300 font-medium">{item.vendor}</td>
                                {viewMode === 'aggregated' && (
                                  <td className="p-3 text-xs sm:text-sm text-gray-300">{item.period}</td>
                                )}
                                {viewMode === 'detailed' && (
                                  <td className="p-3 text-xs sm:text-sm text-gray-400 capitalize">{item.type}</td>
                                )}
                                {viewMode === 'detailed' && (
                                  <td className="p-3 text-xs sm:text-sm text-gray-300 font-mono">{item.total_sales}</td>
                                )}
                                {viewMode === 'aggregated' && (
                                  <>
                                    <td className="p-3 text-xs sm:text-sm text-gray-300 font-mono">{item.commission_rate}</td>
                                    <td className="p-3 text-xs sm:text-sm text-white font-mono">
                                      <div className="flex flex-col">
                                        <span>{item.platform_earnings}</span>
                                        {item.platform_earnings_usd && <span className="text-[10px] text-gray-500 whitespace-nowrap">{item.platform_earnings_usd}</span>}
                                      </div>
                                    </td>
                                    <td className="p-3 text-xs sm:text-sm text-green-400 font-mono">
                                      <div className="flex flex-col">
                                        <span>{item.vendor_earnings}</span>
                                        {item.vendor_earnings_usd && <span className="text-[10px] text-gray-500 whitespace-nowrap">{item.vendor_earnings_usd}</span>}
                                      </div>
                                    </td>
                                  </>
                                )}
                                {viewMode === 'detailed' && (
                                  <>
                                    <td className="p-3 text-xs sm:text-sm text-gray-400 font-mono">{item.commission_rate}</td>
                                    <td className="p-3 text-xs sm:text-sm text-white font-mono">{item.platform_earnings}</td>
                                    <td className="p-3 text-xs sm:text-sm text-green-400 font-mono">{item.vendor_earnings}</td>
                                    <td className="p-3 text-xs sm:text-sm text-gray-400 capitalize text-right">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.status.toLowerCase() === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                        {item.status}
                                      </span>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {commissionHistory.length > 0 && !historyLoading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => fetchCommissionHistory(page)}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={(limit) => setItemsPerPage(limit)}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}