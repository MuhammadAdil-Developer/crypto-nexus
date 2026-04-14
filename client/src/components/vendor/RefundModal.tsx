import React, { useState } from 'react';
import { X, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { refundService } from '@/services/refundService';

interface RefundModalProps {
  isOpen: boolean;
  order: any;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
  onError
}) => {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const commonReasons = [
    'Account already had issues',
    'Product quality not as described',
    'Account credentials invalid',
    'Buyer filed legitimate dispute',
    'System error',
    'Customer satisfaction',
    'Other'
  ];

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      onError('Please provide a reason for the refund');
      return;
    }

    if (refundType === 'partial' && !refundAmount.trim()) {
      onError('Please specify the refund amount for partial refunds');
      return;
    }

    if (refundType === 'partial') {
      const amount = parseFloat(refundAmount);
      const orderAmount = parseFloat(order.total_amount);
      if (isNaN(amount) || amount <= 0 || amount > orderAmount) {
        onError(`Refund amount must be between 0 and ${orderAmount}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const refundData = {
        order_id: order.order_id,
        reason: reason.trim(),
        refund_type: refundType,
        amount: refundType === 'partial' ? refundAmount : undefined,
        notes: notes.trim() || undefined
      };

      const result = await refundService.requestRefund(refundData);

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        onError(result.message || 'Failed to process refund request');
      }
    } catch (error: any) {
      const errorMsg = typeof error === 'string' ? error : error.message || 'Failed to process refund request';
      onError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRefundType('full');
    setRefundAmount('');
    setReason('');
    setNotes('');
    setShowSuccess(false);
    onClose();
  };

  const maxRefundAmount = order.total_amount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 bg-gray-900 border-b border-gray-700">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-white">Request Refund</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Order ID: {order.order_id}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success State */}
        {showSuccess && (
          <div className="p-4 sm:p-6 bg-green-500/10 border-b border-green-500/30">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <p className="text-sm sm:text-base">Refund request submitted successfully!</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!showSuccess && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Product:</span>
                <span className="text-white font-medium text-sm sm:text-base truncate">{order.product}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Order Amount:</span>
                <span className="text-blue-400 font-semibold text-sm sm:text-base">{order.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Buyer:</span>
                <span className="text-white text-sm sm:text-base">{order.buyer}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">Order Status:</span>
                <Badge className="bg-green-500/20 text-green-400 text-xs sm:text-sm">{order.status}</Badge>
              </div>
            </div>

            {/* Refund Type */}
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-sm sm:text-base font-medium text-white">
                Refund Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRefundType('full')}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    refundType === 'full'
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-sm sm:text-base">Full Refund</div>
                  <div className="text-xs sm:text-sm mt-1">
                    {order.total_amount} {order.crypto_currency}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundType('partial')}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    refundType === 'partial'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-sm sm:text-base">Partial Refund</div>
                  <div className="text-xs sm:text-sm mt-1">Custom Amount</div>
                </button>
              </div>
            </div>

            {/* Partial Refund Amount */}
            {refundType === 'partial' && (
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-sm sm:text-base font-medium text-white">
                  Refund Amount ({order.crypto_currency})
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={`Enter amount (max: ${order.total_amount})`}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    step="0.00000001"
                    min="0"
                    max={order.total_amount}
                    className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm sm:text-base"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                    {order.crypto_currency}
                  </span>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-sm sm:text-base font-medium text-white">
                Reason for Refund <span className="text-red-400">*</span>
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-gray-800 border border-gray-700 text-white text-xs sm:text-sm">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700">
                  {commonReasons.map((r) => (
                    <SelectItem key={r} value={r} className="text-white text-xs sm:text-sm">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-sm sm:text-base font-medium text-white">
                Additional Notes (Optional)
              </label>
              <Textarea
                placeholder="Provide any additional details about this refund..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 resize-none text-xs sm:text-sm"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-300">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                  <li>Refunds will be processed within 24-48 hours</li>
                  <li>Funds will be returned to the buyer's wallet</li>
                  <li>All refund requests are logged for compliance</li>
                  <li>False refund claims may result in account suspension</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 pt-4">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                disabled={isSubmitting}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Submit Refund Request</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RefundModal;
