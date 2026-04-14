import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Save, AlertCircle, History, Users, Loader2, Banknote, Info } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import axios from "axios";
import { CRYPTO_PRICES, refreshCryptoPrices } from "@/lib/priceUtils";

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
  auto_sweep_enabled: boolean;
  auto_sweep_btc_address: string;
  auto_sweep_xmr_address: string;
  auto_sweep_time: string;
  auto_sweep_whatsapp_number: string;
  auto_sweep_min_buffer: number;
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
    realtime_btc?: number;
    realtime_xmr?: number;
    pending_obligations_usd?: number;
    total_withdrawn_usd?: number;
    sales_volume_explanation?: string;
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




  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalLookups, setWithdrawalLookups] = useState<{ id: string, symbol: string, name: string }[]>([]);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    usdAmount: '',
    crypto_currency: 'BTC',
    destination_address: '',
    notes: '',
    password: ''
  });

  // Sync USD and Crypto amounts
  const handleAmountChange = (val: string, type: 'crypto' | 'usd') => {
    const price = CRYPTO_PRICES[withdrawalForm.crypto_currency as keyof typeof CRYPTO_PRICES] || 1;
    if (type === 'crypto') {
      const usdVal = val ? (parseFloat(val) * price).toFixed(2) : '';
      setWithdrawalForm({ ...withdrawalForm, amount: val, usdAmount: usdVal });
    } else {
      const cryptoVal = val ? (parseFloat(val) / price).toFixed(8) : '';
      setWithdrawalForm({ ...withdrawalForm, usdAmount: val, amount: cryptoVal });
    }
  };

  const fetchWithdrawalLookups = async () => {
    try {
      const response = await api.get('/payments/admin/manual-withdrawal/lookups/');
      if (response.data.success) {
        setWithdrawalLookups(response.data.cryptos);
      }
    } catch (error) {
      console.error('Error fetching withdrawal lookups:', error);
    }
  };

  const handleManualWithdrawal = async () => {
    try {
      if (!withdrawalForm.amount || !withdrawalForm.destination_address || !withdrawalForm.password) {
        toast.error('Please fill in required fields (Amount, Destination, Password)');
        return;
      }
      setWithdrawalLoading(true);
      const payload = {
        amount: withdrawalForm.amount,
        crypto_currency: withdrawalForm.crypto_currency,
        destination_address: withdrawalForm.destination_address,
        notes: withdrawalForm.notes,
        password: withdrawalForm.password
      };
      const response = await api.post('/payments/admin/manual-withdrawal/', payload);
      if (response.data.success) {
        toast.success(response.data.message || 'Funds sent successfully');
        setWithdrawalModalOpen(false);
        setWithdrawalForm({
          amount: '',
          usdAmount: '',
          crypto_currency: 'BTC',
          destination_address: '',
          notes: '',
          password: ''
        });
        fetchCommissionHistory(1);
      } else {
        toast.error(response.data.error || 'Failed to send funds');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error during transfer');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  useEffect(() => {
    refreshCryptoPrices();
    fetchSettings();
    fetchWithdrawalLookups();
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
  const handleInputChange = (field: keyof CommissionSettings, value: any) => {
    const numericFields: (keyof CommissionSettings)[] = [
      'platform_fee_rate', 'escrow_fee_rate', 'streaming_commission_rate',
      'software_commission_rate', 'gaming_commission_rate', 'services_commission_rate',
      'default_commission_rate', 'min_commission_rate', 'max_commission_rate',
      'auto_sweep_min_buffer'
    ];

    setFormData(prev => ({
      ...prev,
      [field]: numericFields.includes(field) && typeof value === 'string' ? (value === '' ? '' : parseFloat(value)) : value
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Commissions & Fees</h1>
          <p className="text-gray-400 text-xs sm:text-sm">Manage platform commission rates and track financial performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setWithdrawalModalOpen(true)}
            className="bg-accent hover:bg-accent/90 text-white font-bold h-9 sm:h-10 px-4 sm:px-6 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Banknote className="w-4 h-4 mr-2" />
            Log Manual Withdrawal
          </Button>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className={`bg-surface-2 border border-blue-500/20 transition-opacity ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardContent className="p-4 flex flex-col relative">
            <span className="text-gray-400 text-sm font-medium uppercase text-[10px] tracking-tight flex items-center gap-1.5">
              Total Sales Volume (GMV)
              <div className="group relative">
                <Info className="w-3 h-3 text-gray-500 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-surface border border-gray-700 rounded-lg text-[10px] leading-tight text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  {stats?.sales_volume_explanation || "Sum of all order totals across the platform."}
                </div>
              </div>
            </span>
            {historyLoading && !stats ? (
              <div className="h-8 w-24 bg-surface rounded animate-pulse mt-1" />
            ) : (
              <>
                <span className="text-2xl font-bold text-white mt-1">
                  ${stats?.total_sales_vol?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                  Processed Volume
                </span>
              </>
            )}
            {historyLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 text-blue-400 animate-spin" />}
          </CardContent>
        </Card>

        <Card className={`bg-surface-2 border border-green-500/20 transition-opacity ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardContent className="p-4 flex flex-col relative">
            <span className="text-gray-400 text-sm font-medium uppercase text-[10px] tracking-tight">Lifetime Profits (USD)</span>
            {historyLoading && !stats ? (
              <div className="h-8 w-24 bg-surface rounded animate-pulse mt-1" />
            ) : (
              <>
                <span className="text-2xl font-bold text-green-400 mt-1">
                  ${stats?.total_earnings_usd?.toFixed(2) || '0.00'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                  Inc. Withdrawn: ${stats?.total_withdrawn_usd?.toFixed(2) || '0.00'}
                </span>
              </>
            )}
            {historyLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 text-green-400 animate-spin" />}
          </CardContent>
        </Card>

        <Card className={`bg-surface-2 border border-purple-500/20 transition-opacity ${historyLoading ? 'opacity-50' : 'opacity-100'}`}>
          <CardContent className="p-4 flex flex-col relative">
            <span className="text-gray-400 text-sm font-medium uppercase text-[10px] tracking-tight">Available Profit (Net USD)</span>
            {historyLoading && !stats ? (
              <div className="h-8 w-24 bg-surface rounded animate-pulse mt-1" />
            ) : (
              <>
                <span className="text-2xl font-bold text-white mt-1">
                  ${stats?.total_commissions?.toFixed(2) || '0.00'}
                </span>
                <span className="text-[10px] text-accent mt-1 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mr-1.5 animate-pulse"></span>
                  Ready for Withdrawal
                </span>
              </>
            )}
            {historyLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 text-purple-400 animate-spin" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-surface-2 border border-blue-500/10">
          <CardContent className="p-4 flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">BTC Balance</span>
            <span className="text-lg font-mono font-bold text-white mt-1">
              {stats?.realtime_btc?.toFixed(8) || '0.00000000'} <span className="text-[10px] text-gray-500">BTC</span>
            </span>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border border-orange-500/10">
          <CardContent className="p-4 flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">XMR Balance</span>
            <span className="text-lg font-mono font-bold text-white mt-1">
              {stats?.realtime_xmr?.toFixed(8) || '0.00000000'} <span className="text-[10px] text-gray-500">XMR</span>
            </span>
          </CardContent>
        </Card>
        <Card className="bg-surface-2 border border-red-500/10">
          <CardContent className="p-4 flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Pending Payouts</span>
            <span className="text-lg font-mono font-bold text-red-400 mt-1">
              -${stats?.pending_obligations_usd?.toFixed(2) || '0.00'} <span className="text-[10px] text-gray-500">USD</span>
            </span>
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
          <TabsTrigger value="sweep" className="text-gray-300 data-[state=active]:text-white text-xs sm:text-sm">
            <Banknote className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Profit Forwarding</span>
            <span className="sm:hidden">Forwarding</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-bold uppercase tracking-wider">PLATFORM FEE %</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={(formData.platform_fee_rate as any) ?? ''}
                  onChange={(e) => handleInputChange('platform_fee_rate', e.target.value)}
                  className="bg-gray-950 border-gray-700 text-white focus:border-accent w-full h-12 text-lg"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</div>
              </div>
              <p className="text-xs text-gray-500 italic">This rate will be applied as the default for all vendors.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-bold uppercase tracking-wider">ESCROW FEE %</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={(formData.escrow_fee_rate as any) ?? ''}
                  onChange={(e) => handleInputChange('escrow_fee_rate', e.target.value)}
                  className="bg-gray-950 border-gray-700 text-white focus:border-accent w-full h-12 text-lg"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</div>
              </div>
              <p className="text-xs text-gray-500 italic">Standard processing fee for escrowed transactions.</p>
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
                              <tr key={idx} className={`border-b border-gray-800 transition-colors ${item.is_withdrawal ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-surface/50'}`}>
                                {viewMode === 'detailed' && (
                                  <>
                                    <td className="p-3 text-xs sm:text-sm text-gray-300 whitespace-nowrap">
                                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className={`p-3 text-xs sm:text-sm font-mono whitespace-nowrap ${item.is_withdrawal ? 'text-red-400 font-bold' : 'text-accent cursor-help'}`} title={item.order_id}>
                                      {item.is_withdrawal ? 'WITHDRAWAL' : (item.order_id?.substring(0, 8) + '...')}
                                    </td>
                                  </>
                                )}
                                <td className="p-3 text-xs sm:text-sm text-gray-300 font-medium">
                                  {item.vendor}
                                  {item.ip_address && (
                                    <div className="text-[10px] text-gray-500 mt-0.5">IP: {item.ip_address}</div>
                                  )}
                                </td>
                                {viewMode === 'aggregated' && (
                                  <td className="p-3 text-xs sm:text-sm text-gray-300">{item.period}</td>
                                )}
                                {viewMode === 'detailed' && (
                                  <td className="p-3 text-xs sm:text-sm text-gray-400 capitalize">
                                    {item.type}
                                    {item.notes && <div className="text-[9px] text-gray-600 truncate max-w-[100px]">{item.notes}</div>}
                                  </td>
                                )}
                                {viewMode === 'detailed' && (
                                  <td className={`p-3 text-xs sm:text-sm font-mono ${item.total_sales.startsWith('-') ? 'text-red-400' : 'text-gray-300'}`}>
                                    {item.total_sales}
                                  </td>
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
                                    <td className="p-3 text-xs sm:text-sm font-mono text-white">
                                      {item.platform_earnings}
                                    </td>
                                    <td className={`p-3 text-xs sm:text-sm font-mono ${item.vendor_earnings.startsWith('-') ? 'text-orange-400' : 'text-green-400'}`}>
                                      {item.vendor_earnings}
                                    </td>
                                    <td className="p-3 text-xs sm:text-sm text-gray-400 capitalize text-right">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.status.toLowerCase() === 'completed' || item.status.includes('logged') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
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

        <TabsContent value="sweep">
          <div className="space-y-6">
            <div className="bg-[#0B1221] border border-blue-500/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
                <div>
                  <h3 className="text-white text-xl font-bold flex items-center gap-2">
                    <Banknote className="w-6 h-6 text-accent" />
                    Automated Profit Sweep
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">Configure daily automatic forwarding of administrative earnings.</p>
                </div>
                <div className="flex items-center space-x-4 bg-gray-900/50 p-2 px-4 rounded-full border border-gray-800">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.auto_sweep_enabled ? 'text-accent' : 'text-gray-500'}`}>
                    {formData.auto_sweep_enabled ? 'Active' : 'Inactive'}
                  </span>
                  <div
                    onClick={() => handleInputChange('auto_sweep_enabled', !formData.auto_sweep_enabled)}
                    className={`w-11 h-5 rounded-full cursor-pointer transition-all relative ${formData.auto_sweep_enabled ? 'bg-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${formData.auto_sweep_enabled ? 'left-7' : 'left-1'}`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">BTC Forwarding Address</Label>
                    <div className="relative group">
                      <Input
                        placeholder="Personal Bitcoin Address (bc1...)"
                        value={formData.auto_sweep_btc_address || ''}
                        onChange={(e) => handleInputChange('auto_sweep_btc_address', e.target.value)}
                        className="bg-[#05070D] border-gray-800 text-white h-12 focus:border-accent group-hover:border-gray-700 transition-colors font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">XMR Forwarding Address</Label>
                    <div className="relative group">
                      <Input
                        placeholder="Personal Monero Address (4...)"
                        value={formData.auto_sweep_xmr_address || ''}
                        onChange={(e) => handleInputChange('auto_sweep_xmr_address', e.target.value)}
                        className="bg-[#05070D] border-gray-800 text-white h-12 focus:border-accent group-hover:border-gray-700 transition-colors font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Sweep Schedule (LT)</Label>
                        <Input
                          type="time"
                          value={formData.auto_sweep_time || '17:00'}
                          onChange={(e) => handleInputChange('auto_sweep_time', e.target.value)}
                          className="bg-[#05070D] border-gray-800 text-white h-12 focus:border-accent text-center font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Min. BTC Buffer</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.00001"
                            value={formData.auto_sweep_min_buffer || 0.00005}
                            onChange={(e) => handleInputChange('auto_sweep_min_buffer', e.target.value)}
                            className="bg-[#05070D] border-gray-800 text-white h-12 focus:border-accent pr-10 font-bold"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">BTC</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">WhatsApp Notification</Label>
                      <Input
                        placeholder="+923..."
                        value={formData.auto_sweep_whatsapp_number || ''}
                        onChange={(e) => handleInputChange('auto_sweep_whatsapp_number', e.target.value)}
                        className="bg-[#05070D] border-gray-800 text-white h-12 focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex flex-col justify-center">
                    <Label className="text-accent text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Info className="w-3 h-3" />
                      Sweep Algorithm
                    </Label>
                    <div className="text-[11px] text-gray-400 space-y-2 leading-relaxed">
                      <p>
                        <span className="text-white font-bold">1. Verified Profits Only:</span> System calculates admin share from confirmed orders.
                      </p>
                      <p>
                        <span className="text-white font-bold">2. Strict Isolation:</span> Funds in active Escrows or Payout stages are <span className="text-red-400">never</span> touched.
                      </p>
                      <p>
                        <span className="text-white font-bold">3. Localized:</span> Scheduled for 5 PM PKT daily.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs >

      {/* Manual Withdrawal Modal */}
      <Dialog open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen}>
        <DialogContent className="bg-[#0B0F1A] border border-gray-800 text-white max-w-md shadow-2xl">
          <DialogHeader className="border-b border-gray-800 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-accent">
              <Banknote className="w-6 h-6" />
              Send Funds (Manual Withdrawal)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type USD</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawalForm.usdAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'usd')}
                    className="bg-[#05070D] border-gray-800 text-white h-11 pl-7 focus:border-accent/50 ring-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Crypto Amount</label>
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="0.000"
                  value={withdrawalForm.amount}
                  onChange={(e) => handleAmountChange(e.target.value, 'crypto')}
                  className="bg-[#05070D] border-gray-800 text-white h-11 focus:border-accent/50 ring-0 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Coin</label>
                <button
                  onClick={() => {
                    const balance = withdrawalForm.crypto_currency === 'BTC' ? stats?.realtime_btc : stats?.realtime_xmr;
                    if (balance) handleAmountChange(balance.toString(), 'crypto');
                  }}
                  className="text-[10px] text-accent hover:text-white transition-colors uppercase font-bold"
                >
                  Use Max Balance
                </button>
              </div>
              <select
                value={withdrawalForm.crypto_currency}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, crypto_currency: e.target.value })}
                className="w-full bg-[#05070D] border border-gray-800 rounded-md h-11 px-3 text-white focus:outline-none focus:border-accent/50"
              >
                {withdrawalLookups.map((c) => (
                  <option key={c.id} value={c.symbol}>{c.symbol} ({c.name})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Destination Address</label>
              <Input
                placeholder="External wallet address..."
                value={withdrawalForm.destination_address}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, destination_address: e.target.value })}
                className="bg-[#05070D] border-gray-800 text-white h-11 font-mono text-sm focus:border-accent/50 ring-0 focus-visible:ring-0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                Admin Password Required
              </label>
              <Input
                type="password"
                placeholder="Authorize with password..."
                value={withdrawalForm.password}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, password: e.target.value })}
                className="bg-[#05070D] border-red-900/30 text-white h-11 focus:border-red-500/50 ring-0 focus-visible:ring-0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes (Internal Audit)</label>
              <textarea
                placeholder="Reason for this manual send..."
                value={withdrawalForm.notes}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
                className="w-full bg-[#05070D] border border-gray-800 rounded-md p-3 text-white h-20 text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-gray-800 pt-4 flex items-center justify-between sm:justify-between w-full">
            <p className="text-[10px] text-gray-500 hidden sm:block">Action will be logged with IP</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setWithdrawalModalOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 h-10 px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualWithdrawal}
                disabled={withdrawalLoading}
                className="bg-accent hover:bg-accent/90 text-white font-bold h-10 px-8 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"
              >
                {withdrawalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : 'Execute Send'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main >
  );
}