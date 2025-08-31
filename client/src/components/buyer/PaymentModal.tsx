import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Copy, QrCode, Shield, Clock, CheckCircle, AlertTriangle, Wallet, Bitcoin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import paymentService, { PaymentAddress, PaymentStatus } from '@/services/paymentService';

interface Product {
  id: number;
  listing_title: string;
  price: string;
  vendor: {
    username: string;
  };
  accepted_cryptocurrencies?: string[];
  escrow_available?: boolean;
}

interface PaymentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ product, isOpen, onClose, onBack }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Payment Method, 2: Payment Type, 3: Payment Details, 4: Confirmation
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>(''); // 'wallet', 'buy', 'exchange'
  const [useEscrow, setUseEscrow] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [paymentAddress, setPaymentAddress] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [orderId, setOrderId] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [addressVisible, setAddressVisible] = useState(false);
  
  // Real API integration states
  const [realPaymentAddress, setRealPaymentAddress] = useState<PaymentAddress | null>(null);
  const [realPaymentStatus, setRealPaymentStatus] = useState<PaymentStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  
  // Credit card form data
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    holderName: ''
  });
  
  // Exchange connection data
  const [exchangeData, setExchangeData] = useState({
    selectedExchange: '',
    apiKey: '',
    isConnected: false
  });

  // Real payment creation
  const createRealPayment = async () => {
    if (!product || !selectedCrypto || !paymentType) return;

    setIsCreatingPayment(true);
    setApiError(null);

    try {
      const orderIdGenerated = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const paymentData = await paymentService.createPaymentAddress({
        order_id: orderIdGenerated,
        crypto_currency: selectedCrypto,
        amount: totalPrice,
        payment_type: paymentType as 'wallet' | 'buy' | 'exchange',
        use_escrow: useEscrow
      });

      setRealPaymentAddress(paymentData);
      setOrderId(orderIdGenerated);
      setPaymentAddress(paymentData.payment_address);
      setPaymentAmount(paymentData.expected_amount);

      // Start polling for payment status
      if (pollingInterval) {
        paymentService.stopPaymentPolling(pollingInterval);
      }

      const interval = paymentService.startPaymentPolling(
        orderIdGenerated,
        (status: PaymentStatus) => {
          setRealPaymentStatus(status);
          
          if (status.status === 'paid') {
            toast({
              title: "Payment Confirmed! ✅",
              description: "Your payment has been successfully confirmed.",
            });
            setStep(4); // Move to confirmation step
          } else if (status.status === 'expired') {
            toast({
              title: "Payment Expired ⏰",
              description: "Payment window has expired. Please try again.",
              variant: "destructive"
            });
          }
        }
      );

      setPollingInterval(interval);

      toast({
        title: "Payment Address Created! 🚀",
        description: `Send ${paymentData.expected_amount} ${selectedCrypto} to the address below.`,
      });

      setStep(3); // Move to payment details step

    } catch (error: any) {
      setApiError(error.message);
      toast({
        title: "Error Creating Payment",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const totalPrice = product ? (parseFloat(product.price) * quantity) : 0;

  // Timer countdown
  useEffect(() => {
    if (step === 3 && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotal = () => {
    const basePrice = parseFloat(product?.price || '0');
    const total = basePrice * quantity;
    const escrowFee = useEscrow ? total * 0.02 : 0; // 2% escrow fee
    return {
      subtotal: total,
      escrowFee,
      total: total + escrowFee
    };
  };

  const generatePaymentAddress = (crypto: string) => {
    // Mock payment address generation
    const addresses = {
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      XMR: '4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRJ5CA4JpMkr7Jjrx1Hn6uFvFvN1fA8jWtUMqKGDVkGaFaFy42'
    };
    return addresses[crypto as keyof typeof addresses] || '';
  };

  const handlePaymentMethodSubmit = () => {
    if (!selectedCrypto) {
      toast({
        title: "Cryptocurrency Required",
        description: "Please select a cryptocurrency",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handlePaymentTypeSubmit = async () => {
    if (!paymentType) {
      toast({
        title: "Payment Method Required",
        description: "Please select how you want to pay",
        variant: "destructive"
      });
      return;
    }

    // Create real payment address using API
    await createRealPayment();
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const handlePaymentComplete = () => {
    setStep(4);
    toast({
      title: "Payment Submitted",
      description: "We're monitoring the blockchain for your payment",
    });
  };

  const handleCreditCardPayment = () => {
    if (!cardData.cardNumber || !cardData.expiryDate || !cardData.cvv || !cardData.holderName) {
      toast({
        title: "Card Details Required",
        description: "Please fill in all card details",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Processing Payment",
      description: "Buying crypto and processing your order...",
    });
    
    // Simulate crypto purchase
    setTimeout(() => {
      handlePaymentComplete();
    }, 3000);
  };

  const handleExchangeConnection = () => {
    if (!exchangeData.selectedExchange) {
      toast({
        title: "Exchange Required",
        description: "Please select an exchange",
        variant: "destructive"
      });
      return;
    }
    
    setExchangeData(prev => ({ ...prev, isConnected: true }));
    toast({
      title: "Exchange Connected",
      description: "Successfully connected to your exchange",
    });
    
    setTimeout(() => {
      handlePaymentComplete();
    }, 2000);
  };

  if (!isOpen || !product) return null;

  const pricing = calculateTotal();
  const availableCryptos = product.accepted_cryptocurrencies || ['BTC', 'XMR'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-xl shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-10 h-10 p-0"
                onClick={step === 1 ? onBack : () => setStep(step - 1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {step === 1 && "Select Cryptocurrency"}
                  {step === 2 && "Choose Payment Method"}
                  {step === 3 && "Complete Payment"}
                  {step === 4 && "Payment Status"}
                </h1>
                <p className="text-gray-400 text-sm">{product.listing_title}</p>
              </div>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((stepNum) => (
                <div 
                  key={stepNum}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum === step 
                      ? 'bg-blue-600 text-white' 
                      : stepNum < step 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {stepNum < step ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Payment Method Selection */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Product</span>
                    <span className="text-white">{product.listing_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Seller</span>
                    <span className="text-white">@{product.vendor.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Quantity</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 p-0"
                      >
                        -
                      </Button>
                      <span className="text-white w-8 text-center">{quantity}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <Separator className="bg-gray-600" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Subtotal</span>
                      <span className="text-white">${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {useEscrow && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Escrow Fee (2%)</span>
                        <span className="text-white">${pricing.escrowFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-white">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Select Payment Method</CardTitle>
                  <p className="text-gray-400 text-sm">Choose your preferred cryptocurrency</p>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedCrypto} onValueChange={setSelectedCrypto}>
                    {availableCryptos.map((crypto) => (
                      <div key={crypto} className="flex items-center space-x-3 p-3 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                        <RadioGroupItem value={crypto} id={crypto} />
                        <div className="flex items-center gap-3 flex-1">
                          {crypto === 'BTC' ? (
                            <Bitcoin className="w-6 h-6 text-orange-500" />
                          ) : (
                            <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">XMR</span>
                            </div>
                          )}
                          <div>
                            <Label htmlFor={crypto} className="text-white font-medium cursor-pointer">
                              {crypto === 'BTC' ? 'Bitcoin' : 'Monero'} ({crypto})
                            </Label>
                            <p className="text-gray-400 text-sm">
                              {crypto === 'BTC' ? 'Fast confirmation, widely accepted' : 'Private, anonymous transactions'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Available
                        </Badge>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Escrow Option */}
              {product.escrow_available && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="escrow" 
                        checked={useEscrow}
                        onCheckedChange={setUseEscrow}
                      />
                      <div className="flex-1">
                        <Label htmlFor="escrow" className="text-white font-medium cursor-pointer flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          Use Escrow Protection (2% fee)
                        </Label>
                        <p className="text-gray-400 text-sm mt-1">
                          Your payment will be held securely until you confirm receipt of the product. Recommended for first-time purchases.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handlePaymentMethodSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Payment Type Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">How do you want to pay?</CardTitle>
                  <p className="text-gray-400 text-sm">Choose your preferred payment method for {selectedCrypto}</p>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentType} onValueChange={setPaymentType}>
                    {/* Option 1: Existing Wallet */}
                    <div className="flex items-center space-x-3 p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                      <RadioGroupItem value="wallet" id="wallet" />
                      <div className="flex items-center gap-3 flex-1">
                        <Wallet className="w-6 h-6 text-blue-500" />
                        <div>
                          <Label htmlFor="wallet" className="text-white font-medium cursor-pointer">
                            Pay with My Crypto Wallet
                          </Label>
                          <p className="text-gray-400 text-sm">
                            I already have {selectedCrypto} and want to send from my own wallet
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Instant
                      </Badge>
                    </div>

                    {/* Option 2: Buy Crypto */}
                    <div className="flex items-center space-x-3 p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                      <RadioGroupItem value="buy" id="buy" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">$</span>
                        </div>
                        <div>
                          <Label htmlFor="buy" className="text-white font-medium cursor-pointer">
                            Buy Crypto with Credit Card
                          </Label>
                          <p className="text-gray-400 text-sm">
                            I want to buy {selectedCrypto} now and pay automatically
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        Easy
                      </Badge>
                    </div>

                    {/* Option 3: Exchange Connection */}
                    <div className="flex items-center space-x-3 p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                      <RadioGroupItem value="exchange" id="exchange" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Ex</span>
                        </div>
                        <div>
                          <Label htmlFor="exchange" className="text-white font-medium cursor-pointer">
                            Connect My Exchange Account
                          </Label>
                          <p className="text-gray-400 text-sm">
                            Use my Binance, Coinbase, or other exchange account
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-purple-400 border-purple-400">
                        Secure
                      </Badge>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Payment Type Info */}
              {paymentType === 'wallet' && (
                <Card className="bg-blue-900/20 border-blue-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Wallet className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h3 className="text-white font-medium mb-2">Using Your Own Wallet</h3>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• You'll get a payment address to send {selectedCrypto} to</li>
                          <li>• Send the exact amount from your wallet app</li>
                          <li>• Payment is detected automatically</li>
                          <li>• No extra fees (just network fees)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentType === 'buy' && (
                <Card className="bg-green-900/20 border-green-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">$</span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium mb-2">Buy Crypto with Card</h3>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• Enter your credit/debit card details</li>
                          <li>• We'll buy {selectedCrypto} instantly for you</li>
                          <li>• Payment is sent automatically to the seller</li>
                          <li>• Small processing fee applies (~3%)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentType === 'exchange' && (
                <Card className="bg-purple-900/20 border-purple-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">Ex</span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium mb-2">Exchange Connection</h3>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>• Connect your exchange account securely</li>
                          <li>• Transfer {selectedCrypto} directly from your balance</li>
                          <li>• Uses read-only API keys (safe)</li>
                          <li>• Lower fees than buying new crypto</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handlePaymentTypeSubmit}
                disabled={isCreatingPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Payment...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Real Payment Status */}
              {realPaymentStatus && (
                <Card className={`${
                  realPaymentStatus.status === 'paid' ? 'bg-green-900/20 border-green-700' :
                  realPaymentStatus.status === 'pending' ? 'bg-yellow-900/20 border-yellow-700' :
                  'bg-red-900/20 border-red-700'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      {realPaymentStatus.status === 'paid' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : realPaymentStatus.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <h3 className="font-medium text-white">Payment Status: {realPaymentStatus.status.toUpperCase()}</h3>
                        <p className="text-sm text-gray-300">
                          Received: {realPaymentStatus.received_amount} / {realPaymentStatus.expected_amount} {selectedCrypto}
                        </p>
                        <p className="text-sm text-gray-300">
                          Confirmations: {realPaymentStatus.confirmations} / {realPaymentStatus.required_confirmations}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* API Error Display */}
              {apiError && (
                <Card className="bg-red-900/20 border-red-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <div>
                        <h3 className="font-medium text-red-200">Error</h3>
                        <p className="text-sm text-red-100">{apiError}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Timer */}
              <Card className="bg-red-900/20 border-red-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-white font-medium">Payment expires in {formatTime(timeRemaining)}</p>
                      <p className="text-gray-400 text-sm">Complete your payment before the timer expires</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Instructions - Wallet */}
              {paymentType === 'wallet' && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Send {selectedCrypto} Payment
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Order ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={orderId} 
                        readOnly 
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(orderId, 'Order ID')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Send exactly this amount</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={`${paymentAmount} ${selectedCrypto}`} 
                        readOnly 
                        className="bg-gray-700 border-gray-600 text-white font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(paymentAmount, 'Amount')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Payment Address</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddressVisible(!addressVisible)}
                        className="text-gray-400 hover:text-white"
                      >
                        {addressVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={addressVisible ? paymentAddress : '••••••••••••••••••••••••••••••••'} 
                        readOnly 
                        className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(paymentAddress, 'Address')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => toast({ title: "QR Code", description: "QR code feature coming soon!" })}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Show QR Code
                  </Button>
                </CardContent>
              </Card>
              )}

              {/* Credit Card Payment Form */}
              {paymentType === 'buy' && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">$</span>
                      </div>
                      Buy {selectedCrypto} with Credit Card
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label className="text-gray-300">Card Number</Label>
                        <Input 
                          placeholder="1234 5678 9012 3456"
                          value={cardData.cardNumber}
                          onChange={(e) => setCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Expiry Date</Label>
                        <Input 
                          placeholder="MM/YY"
                          value={cardData.expiryDate}
                          onChange={(e) => setCardData(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">CVV</Label>
                        <Input 
                          placeholder="123"
                          value={cardData.cvv}
                          onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-gray-300">Cardholder Name</Label>
                        <Input 
                          placeholder="John Doe"
                          value={cardData.holderName}
                          onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Secure Purchase</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        We'll instantly buy {paymentAmount} {selectedCrypto} (≈ ${pricing.total.toFixed(2)}) and send it to the seller automatically.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exchange Connection */}
              {paymentType === 'exchange' && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Ex</span>
                      </div>
                      Connect Exchange Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!exchangeData.isConnected ? (
                      <>
                        <div>
                          <Label className="text-gray-300">Select Exchange</Label>
                          <RadioGroup 
                            value={exchangeData.selectedExchange} 
                            onValueChange={(value) => setExchangeData(prev => ({ ...prev, selectedExchange: value }))}
                          >
                            <div className="flex items-center space-x-3 p-3 border border-gray-700 rounded-lg">
                              <RadioGroupItem value="binance" id="binance" />
                              <Label htmlFor="binance" className="text-white cursor-pointer flex items-center gap-3 flex-1">
                                <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
                                Binance
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-gray-700 rounded-lg">
                              <RadioGroupItem value="coinbase" id="coinbase" />
                              <Label htmlFor="coinbase" className="text-white cursor-pointer flex items-center gap-3 flex-1">
                                <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                                Coinbase
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border border-gray-700 rounded-lg">
                              <RadioGroupItem value="kraken" id="kraken" />
                              <Label htmlFor="kraken" className="text-white cursor-pointer flex items-center gap-3 flex-1">
                                <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                                Kraken
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-purple-400 mb-2">
                            <Shield className="w-4 h-4" />
                            <span className="font-medium">Secure Connection</span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            We'll securely connect to your exchange and transfer {paymentAmount} {selectedCrypto} to complete your purchase.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Connected to {exchangeData.selectedExchange}</h3>
                          <p className="text-gray-400 text-sm">Ready to transfer {paymentAmount} {selectedCrypto}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payment Instructions */}
              <Card className="bg-blue-900/20 border-blue-700">
                <CardContent className="pt-6">
                  <h3 className="text-white font-medium mb-3">Payment Instructions:</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Send the exact amount to the provided address</li>
                    <li>• Include any required memos or payment IDs</li>
                    <li>• Payment will be automatically detected</li>
                    <li>• You'll receive confirmation once payment is confirmed</li>
                    {useEscrow && <li>• Funds will be held in escrow until you confirm receipt</li>}
                  </ul>
                </CardContent>
              </Card>

              {/* Payment Action Buttons */}
              {paymentType === 'wallet' && (
                <Button 
                  onClick={handlePaymentComplete}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  size="lg"
                >
                  I've Sent the Payment
                </Button>
              )}

              {paymentType === 'buy' && (
                <Button 
                  onClick={handleCreditCardPayment}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  size="lg"
                >
                  Buy {selectedCrypto} & Pay Now
                </Button>
              )}

              {paymentType === 'exchange' && (
                <Button 
                  onClick={handleExchangeConnection}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                  size="lg"
                >
                  {exchangeData.isConnected ? 'Transfer from Exchange' : 'Connect Exchange'}
                </Button>
              )}
            </div>
          )}

          {/* Step 4: Payment Confirmation */}
          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-white animate-pulse" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Payment Submitted</h3>
                <p className="text-gray-400">
                  We're monitoring the blockchain for your payment. You'll be notified once it's confirmed.
                </p>
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Order ID</span>
                      <span className="text-white font-mono">{orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Amount</span>
                      <span className="text-white">{paymentAmount} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Status</span>
                      <Badge className="bg-yellow-600 text-white">Pending Confirmation</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => toast({ title: "Order Tracking", description: "Redirecting to order tracking..." })}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Track Order
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal; 