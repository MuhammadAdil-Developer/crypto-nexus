import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, FileText, Clock, User, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import disputeService from '@/services/disputeService';
import { orderService } from '@/services/orderService';

interface Order {
  id: string; // UUID
  product: {
    id: number;
    headline: string;
    main_image?: string;
  };
  vendor: {
    username: string;
  };
  order_status: string;
  total_amount: string;
  created_at: string;
}

function CreateDisputeContent() {
  console.log('🔍 CreateDisputeContent component rendering...');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');

  // Get order ID and refund ID from URL params or location state
  const orderId = new URLSearchParams(location.search).get('orderId') || location.state?.orderId;
  const refundId = new URLSearchParams(location.search).get('refund_id') || location.state?.refundId;

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      if (refundId) {
        fetchRefundDetails();
      }
    } else {
      toast({
        title: "Error",
        description: "No order ID provided. Please access this page from an order or refund request.",
        variant: "destructive"
      });
      navigate('/buyer/orders');
    }
  }, [orderId, refundId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const order = await orderService.getOrder(orderId);
      setOrder(order);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive"
      });
      navigate('/buyer/orders');
    } finally {
      // If we are also fetching refund details, don't set loading to false yet
      if (!refundId) {
        setLoading(false);
      }
    }
  };

  const fetchRefundDetails = async () => {
    try {
      const { refundService } = await import('@/services/refundService');
      const response = await refundService.getBuyerRefundRequests(1, 100);
      if (response.success && response.data) {
        const refund = response.data.find((r: any) => r.id === refundId);
        if (refund) {
          setTitle(`Escalation: Order #${refund.order_id}`);
          setCategory('refund_issue');
          setDescription(
            `Escalating rejected refund request.\n\n` +
            `Original Refund Reason: ${refund.reason}\n\n` +
            `Vendor Rejection Notes: ${refund.vendor_decision_notes || 'No notes provided'}`
          );
        }
      }
    } catch (error) {
      console.error('Error fetching refund details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      console.log('🔍 Submitting dispute with data:', {
        order: order.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority: priority as any,
        refund_request: refundId
      });

      const response = await disputeService.createDispute({
        order: order.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority: priority as any,
        refund_request: refundId || undefined
      });

      console.log('🔍 Dispute creation response:', response);

      if (response.success) {
        // Success case
        toast({
          title: 'Success',
          description: response.message || 'Your dispute has been created successfully. Admin will review it soon.',
        });

        // Wait for toast to be visible before navigating
        setTimeout(() => {
          navigate('/buyer/orders');
        }, 1500);
      } else {
        // Error case - response.success is false
        let errorDescription = response.message || 'Failed to create dispute';

        // If there are specific field errors, extract them
        if (response.errors) {
          const errors: any = response.errors;
          const firstError =
            errors.order?.[0] ||
            errors.title?.[0] ||
            errors.description?.[0] ||
            errors.category?.[0] ||
            errors.priority?.[0] ||
            (typeof errors === 'string' ? errors : JSON.stringify(errors));

          errorDescription = firstError;
        }

        toast({
          title: 'Error',
          description: errorDescription,
          variant: 'destructive'
        });
      }
    } catch (error) {
      // This should rarely happen since disputeService catches errors
      console.error('❌ Unexpected error:', error);

      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Order Not Found</h2>
        <p className="text-gray-400 mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate('/buyer/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const disputeCategories = disputeService.getDisputeCategories();
  const disputePriorities = disputeService.getDisputePriorities();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/buyer/orders')}
          className="border-gray-600 text-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Dispute</h1>
          <p className="text-gray-400">File a dispute for your order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-1">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Order ID:</span>
                <span className="text-white font-medium">#{order.id.slice(0, 8)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Product:</span>
                <span className="text-white font-medium truncate ml-2">{order.product.headline}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Vendor:</span>
                <span className="text-white font-medium">{order.vendor.username}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-green-400 font-medium">{order.total_amount} BTC</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {order.order_status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-white font-medium">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Guidelines */}
          <Card className="bg-gray-900 border-gray-700 mt-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Dispute Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• Provide clear and detailed description of the issue</p>
                <p>• Include any relevant evidence or screenshots</p>
                <p>• Admin will review and make a fair decision</p>
                <p>• Resolution may take 3-5 business days</p>
                <p>• All communications will be recorded</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dispute Form */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Dispute Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dispute Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title describing the issue"
                    className="bg-gray-800 border-gray-600 text-white"
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">{title.length}/200 characters</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Issue Category *
                  </label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select the type of issue" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {disputeCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-white">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority Level
                  </label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {disputePriorities.map((prio) => (
                        <SelectItem key={prio.value} value={prio.value} className="text-white">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${prio.color} mr-2`}></div>
                            {prio.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Detailed Description *
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please provide a detailed description of the issue. Include any relevant information that would help resolve this dispute..."
                    className="bg-gray-800 border-gray-600 text-white min-h-32"
                    maxLength={2000}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">{description.length}/2000 characters</p>
                </div>

                {/* Submit Buttons */}
                <div className="flex space-x-4 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Dispute...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Create Dispute
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/buyer/orders')}
                    className="border-gray-600 text-gray-300"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CreateDispute() {
  console.log('🔍 CreateDispute component rendering...');
  return <CreateDisputeContent />;
}
