import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { refundService } from "@/services/refundService";
import { useToast } from "@/hooks/use-toast";

interface RequestRefundModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderAmount: string;
  currency: string;
  onSuccess: () => void;
}

export function RequestRefundModal({
  open,
  onClose,
  orderId,
  orderAmount,
  currency,
  onSuccess,
}: RequestRefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the refund",
        variant: "destructive",
      });
      return;
    }

    if (refundType === 'partial' && (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(orderAmount))) {
      toast({
        title: "Error",
        description: `Amount must be between 0 and ${orderAmount} ${currency}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await refundService.requestRefund(orderId, {
        refund_type: refundType,
        amount: refundType === 'partial' ? amount : undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Success",
        description: "Refund request submitted successfully. Vendor will be notified.",
      });

      // Reset form
      setRefundType('full');
      setAmount('');
      setReason('');
      setNotes('');
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit refund request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Request a refund for order {orderId}. The vendor will be notified and has 48 hours to respond.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refundType">Refund Type</Label>
            <Select value={refundType} onValueChange={(value: 'full' | 'partial') => setRefundType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Refund ({orderAmount} {currency})</SelectItem>
                <SelectItem value="partial">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {refundType === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount ({currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                min="0"
                max={orderAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter refund amount"
                required={refundType === 'partial'}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {orderAmount} {currency}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need a refund..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


