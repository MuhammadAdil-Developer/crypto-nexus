import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Bitcoin, 
  Wallet,
  Loader2,
  AlertCircle,
  Copy,
  QrCode,
  Search,
  RefreshCw
} from "lucide-react";

interface Order {
  orderId: string;
  amount: string;
  cryptoCurrency: string;
  paymentAddress: string;
  status: string;
  createdAt: string;
}

export default function PaymentTest() {
  const [paymentAddress, setPaymentAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cryptoCurrency, setCryptoCurrency] = useState("BTC");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const { toast } = useToast();

  // Fetch real orders from backend
  const fetchRealOrders = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch('http://localhost:8000/api/v1/orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const ordersData = await response.json();
        const orders = ordersData.results || ordersData || [];
        
        console.log('Raw orders from backend:', orders);
        
        // Transform backend orders to match our interface
        const transformedOrders: Order[] = orders.map((order: any) => ({
          orderId: order.order_id,
          amount: order.total_amount,
          cryptoCurrency: order.crypto_currency,
          paymentAddress: order.payment_address || '',
          status: order.payment_status || 'pending_payment',
          createdAt: order.created_at
        }));
        
        console.log('Transformed orders:', transformedOrders);
        
        // Check if new orders were added
        if (previousOrderCount > 0 && transformedOrders.length > previousOrderCount) {
          const newOrdersCount = transformedOrders.length - previousOrderCount;
          toast({
            title: "New Orders Detected!",
            description: `${newOrdersCount} new order${newOrdersCount > 1 ? 's' : ''} available for testing`,
          });
        }
        
        setRealOrders(transformedOrders);
        setPreviousOrderCount(transformedOrders.length);
        setLastUpdated(new Date());
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      // Fallback to mock orders if API fails
      setRealOrders(mockOrders);
      setIsRefreshing(false);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchRealOrders();
    
    // Set up polling to refresh orders every 5 seconds
    const interval = setInterval(() => {
      setIsRefreshing(true);
      fetchRealOrders();
    }, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Mock orders database (fallback)
  const mockOrders: Order[] = [
    {
      orderId: "ORD-12345678",
      amount: "0.001",
      cryptoCurrency: "BTC",
      paymentAddress: "tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      status: "pending_payment",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      orderId: "ORD-87654321",
      amount: "0.0005",
      cryptoCurrency: "XMR",
      paymentAddress: "8BpY5sK2mN9qR4vX7wL3zC6hJ1fG8tY4uI7oP2aE",
      status: "pending_payment",
      createdAt: "2024-01-15T11:45:00Z"
    },
    {
      orderId: "ORD-11111111",
      amount: "0.002",
      cryptoCurrency: "BTC",
      paymentAddress: "tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      status: "pending_payment",
      createdAt: "2024-01-15T12:15:00Z"
    },
    {
      orderId: "ORD-TEST-001",
      amount: "20",
      cryptoCurrency: "BTC",
      paymentAddress: "tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      status: "pending_payment",
      createdAt: "2024-01-15T13:00:00Z"
    }
  ];

  // Use real orders if available, otherwise fallback to mock orders
  const ordersToSearch = realOrders.length > 0 ? realOrders : mockOrders;

  const findOrderByAddress = async (address: string) => {
    console.log('Searching for address:', address);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return null;
      }

      console.log("DEBUG: Address being sent:", address);
      console.log("DEBUG: Encoded address:", encodeURIComponent(address));
      console.log("DEBUG: Full URL:", );
      const response = await fetch('http://localhost:8000/api/v1/orders/find_by_payment_address/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address
        })
      });

      if (response.ok) {
        const orderData = await response.json();
        console.log('Found order by address:', orderData);
        
        // Transform to match our interface
        const order: Order = {
          orderId: orderData.order_id,
          amount: orderData.total_amount,
          cryptoCurrency: orderData.crypto_currency,
          paymentAddress: orderData.payment_address || '',
          status: orderData.payment_status || 'pending_payment',
          createdAt: orderData.created_at
        };
        
        return order;
      } else {
        console.log('Order not found for address:', address);
        return null;
      }
    } catch (error) {
      console.error('Error finding order by address:', error);
      return null;
    }
  };

  const findOrderByAmount = (amount: string, crypto: string) => {
    console.log('Searching for amount:', amount, 'crypto:', crypto);
    console.log('Available orders:', ordersToSearch);
    const found = ordersToSearch.find(order => 
      order.amount === amount && order.cryptoCurrency === crypto
    );
    console.log('Found order by amount:', found);
    return found;
  };

  const handleAddressChange = async (address: string) => {
    setPaymentAddress(address);
    
    // Only search if address is not empty
    if (!address || address.trim() === "") {
      setFoundOrder(null);
      return;
    }
    
    // Try to find order by address
    const orderByAddress = await findOrderByAddress(address);
    if (orderByAddress) {
      setFoundOrder(orderByAddress);
      setPaymentAmount(orderByAddress.amount);
      setCryptoCurrency(orderByAddress.cryptoCurrency);
      toast({
        title: "Order Found!",
        description: `Order ID: ${orderByAddress.orderId} - Amount: ${orderByAddress.amount} ${orderByAddress.cryptoCurrency}`,
      });
    } else {
      setFoundOrder(null);
    }
  };

  const handleAmountChange = (amount: string) => {
    setPaymentAmount(amount);
    
    // Try to find order by amount and crypto
    const orderByAmount = findOrderByAmount(amount, cryptoCurrency);
    if (orderByAmount && !foundOrder) {
      setFoundOrder(orderByAmount);
      setPaymentAddress(orderByAmount.paymentAddress);
      toast({
        title: "Order Found!",
        description: `Order ID: ${orderByAmount.orderId} - Address: ${orderByAmount.paymentAddress}`,
      });
    }
  };

  // Real-time order detection display
  const renderOrderDetection = () => {
    if (foundOrder) {
      return (
        <Card className="border border-green-500 bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Order Detected!</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Order ID:</span>
                <span className="text-white font-mono">{foundOrder.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Amount:</span>
                <span className="text-green-400">{foundOrder.amount} {foundOrder.cryptoCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Status:</span>
                <Badge className="text-yellow-400 bg-yellow-900/20">Pending Payment</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else if (paymentAddress || paymentAmount) {
      return (
        <Card className="border border-yellow-500 bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Order Not Found</span>
            </div>
            <p className="text-yellow-300 text-sm">
              No matching order found for the provided details. Please check the payment address and amount.
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentAddress || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter payment address and amount.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        setPaymentStatus('success');
        toast({
          title: "Payment Successful!",
          description: foundOrder 
            ? `Payment for Order ${foundOrder.orderId} completed successfully.`
            : `Payment of ${paymentAmount} ${cryptoCurrency} completed successfully.`,
        });
      } else {
        setPaymentStatus('failed');
        toast({
          title: "Payment Failed",
          description: "Payment was not completed. Please try again.",
          variant: "destructive",
        });
      }
    }, 3000);
  };

  const handleReset = () => {
    setPaymentAddress("");
    setPaymentAmount("");
    setCryptoCurrency("BTC");
    setPaymentStatus('idle');
    setIsProcessing(false);
    setFoundOrder(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard.",
    });
  };

  const handlePaymentSimulation = async () => {
    if (!foundOrder) return;

    setIsProcessing(true);
    
    setTimeout(async () => {
      setIsProcessing(false);
      
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        // Update backend order status
        try {
          const response = await fetch(`http://localhost:8000/api/v1/payments/status/${foundOrder.orderId}/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });

          if (response.ok) {
            setPaymentStatus('success');
            toast({
              title: "Payment Successful!",
              description: `Payment of ${foundOrder.amount} ${foundOrder.cryptoCurrency} completed successfully. Order status updated.`,
            });
            
            // Update local order status
            setFoundOrder(prev => prev ? { ...prev, status: 'paid' } : null);
            
            // Update orders list
            setRealOrders(prev => prev.map(order => 
              order.orderId === foundOrder.orderId 
                ? { ...order, payment_status: 'paid', order_status: 'processing' }
                : order
            ));
          } else {
            throw new Error('Failed to update order status');
          }
        } catch (error) {
          setPaymentStatus('failed');
          toast({
            title: "Payment Failed",
            description: "Payment completed but failed to update order status. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        setPaymentStatus('failed');
        toast({
          title: "Payment Failed",
          description: "Payment was not completed. Please try again.",
          variant: "destructive",
        });
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Payment Testing</h1>
          <p className="text-gray-400">Enter payment details - Order will be auto-detected</p>
          <Badge variant="outline" className="border-blue-500 text-blue-400 mt-2">
            Auto-Detection Mode
          </Badge>
        </div>

        {/* Auto-Refresh Status */}
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span className="text-gray-400">
              {isRefreshing ? 'Refreshing orders...' : 'Auto-refresh active'}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-gray-500">
              • Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setIsRefreshing(true);
              fetchRealOrders();
            }}
            disabled={isRefreshing}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>

        {/* Payment Form */}
        {paymentStatus === 'idle' && (
          <Card className="border border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-blue-400" />
                <span>Payment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAddress" className="text-gray-300">Payment Address *</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="paymentAddress"
                      type="text"
                      placeholder="Enter the payment address"
                      value={paymentAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentAddress)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-gray-300">Payment Amount *</Label>
                    <Input
                      id="amount"
                      type="text"
                      placeholder="e.g., 0.001"
                      value={paymentAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cryptoCurrency" className="text-gray-300">Cryptocurrency</Label>
                    <select
                      id="cryptoCurrency"
                      value={cryptoCurrency}
                      onChange={(e) => setCryptoCurrency(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="XMR">Monero (XMR)</option>
                    </select>
                  </div>
                </div>

                {/* Order Detection Display */}
                {renderOrderDetection()}

                {/* Debug Information */}
                {(paymentAddress || paymentAmount) && (
                  <Card className="border border-gray-600 bg-gray-800">
                    <CardContent className="p-4">
                      <h4 className="text-white font-medium mb-2">Debug Info:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Entered Address:</span>
                          <span className="text-white font-mono">{paymentAddress || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Entered Amount:</span>
                          <span className="text-white">{paymentAmount || 'None'} {cryptoCurrency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Orders Available:</span>
                          <span className="text-white">{ordersToSearch.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Order Found:</span>
                          <span className="text-white">{foundOrder ? foundOrder.orderId : 'None'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center space-x-2 p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-300 text-sm">
                    The system will automatically detect which order this payment belongs to.
                  </span>
                </div>

                {/* Payment Action */}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handlePaymentSimulation}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Bitcoin className="w-5 h-5 mr-2" />
                        Simulate Payment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Processing State */}
        {paymentStatus === 'processing' && (
          <Card className="border border-blue-500 bg-blue-900/20">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-blue-400 mb-2">Processing Payment...</h2>
              <p className="text-blue-300">
                Please wait while we process your payment of {paymentAmount} {cryptoCurrency}
              </p>
              {foundOrder && (
                <p className="text-blue-300 mt-2">
                  Order ID: {foundOrder.orderId}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {paymentStatus === 'success' && (
          <Card className="border border-green-500 bg-green-900/20">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-400 mb-2">Payment Successful!</h2>
              <p className="text-green-300 mb-6">
                Payment of {paymentAmount} {cryptoCurrency} completed successfully.
              </p>
              {foundOrder && (
                <div className="space-y-2 text-left max-w-md mx-auto mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Order ID:</span>
                    <span className="text-white">{foundOrder.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Amount:</span>
                    <span className="text-green-400">{foundOrder.amount} {foundOrder.cryptoCurrency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Status:</span>
                    <Badge className="text-green-400 bg-green-900/20">Paid</Badge>
                  </div>
                </div>
              )}
              <Button onClick={handleReset}>
                Test Another Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Failed State */}
        {paymentStatus === 'failed' && (
          <Card className="border border-red-500 bg-red-900/20">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-400 mb-2">Payment Failed</h2>
              <p className="text-red-300 mb-6">
                Payment was not completed. Please try again.
              </p>
              <div className="space-y-4">
                <Button onClick={handleReset} variant="outline" className="border-red-500 text-red-400 hover:bg-red-900/20">
                  Try Again
                </Button>
                <Button onClick={handleReset} className="ml-2">
                  New Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Orders for Testing */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-400" />
              <span>Available Orders for Testing</span>
              {isLoadingOrders && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ordersToSearch.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No orders available</p>
              ) : (
                ordersToSearch.map((order) => (
                  <div key={order.orderId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <h3 className="font-medium text-white">{order.orderId}</h3>
                      <p className="text-sm text-gray-400">{order.amount} {order.cryptoCurrency}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="text-yellow-400 bg-yellow-900/20">
                        {order.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {order.paymentAddress ? order.paymentAddress.slice(0, 10) + '...' : 'No address'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white">How Order Detection Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-gray-300">Each order gets a unique payment address</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-gray-300">When user enters payment address, system finds matching order</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-gray-300">Payment amount is also verified against order amount</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <p className="text-gray-300">Order is automatically linked to the payment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
 