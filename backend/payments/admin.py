from django.contrib import admin
from django.utils import timezone

from .models import RefundRequest
from orders.models import Order
from shared.models import Notification


@admin.register(RefundRequest)
class RefundRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'vendor', 'amount', 'refund_type', 'status', 'created_at')
    list_filter = ('status', 'refund_type', 'created_at')
    search_fields = ('order__order_id', 'vendor__username', 'vendor__email')
    actions = ['approve_refunds', 'reject_refunds']

    def approve_refunds(self, request, queryset):
        """Admin action to approve selected refund requests."""
        updated = 0
        for refund in queryset:
            if refund.status != 'pending':
                continue
            refund.status = 'approved'
            refund.completed_at = timezone.now()
            refund.save()

            # Update order status to refunded
            try:
                order = refund.order
                order.order_status = 'refunded'
                order.save()
            except Exception:
                pass

            # Notify buyer and vendor via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            
            send_user_notification(
                user=order.buyer,
                notification_type='refund',
                title='Refund Approved',
                message=f'Your refund for order {order.order_id} has been approved by admin.',
                data={'refund_id': str(refund.id), 'order_id': order.order_id}
            )

            send_user_notification(
                user=refund.vendor,
                notification_type='refund',
                title='Refund Approved',
                message=f'Refund request for order {order.order_id} has been approved by admin.',
                data={'refund_id': str(refund.id), 'order_id': order.order_id}
            )

            updated += 1

        self.message_user(request, f"Approved {updated} refund(s).")
    approve_refunds.short_description = 'Approve selected refund requests'

    def reject_refunds(self, request, queryset):
        """Admin action to reject selected refund requests."""
        updated = 0
        for refund in queryset:
            if refund.status != 'pending':
                continue
            refund.status = 'rejected'
            refund.rejection_reason = 'Rejected by admin'
            refund.completed_at = timezone.now()
            refund.save()

            # Update order status if needed (mark as refunded? keep as is)
            try:
                order = refund.order
                # Do not change order_status on rejection; leave as-is or set to paid/delivered
                order.save()
            except Exception:
                pass

            # Notify buyer and vendor via central helper (respects preferences)
            from shared.admin_notifications import send_user_notification
            
            send_user_notification(
                user=order.buyer,
                notification_type='refund',
                title='Refund Rejected',
                message=f'Your refund for order {order.order_id} has been rejected by admin.',
                data={'refund_id': str(refund.id), 'order_id': order.order_id}
            )

            send_user_notification(
                user=refund.vendor,
                notification_type='refund',
                title='Refund Rejected',
                message=f'Refund request for order {order.order_id} has been rejected by admin.',
                data={'refund_id': str(refund.id), 'order_id': order.order_id}
            )

            updated += 1

        self.message_user(request, f"Rejected {updated} refund(s).")
    reject_refunds.short_description = 'Reject selected refund requests'
