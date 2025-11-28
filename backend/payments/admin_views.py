from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import AllowAny
from django.utils import timezone

from .models import RefundRequest
from orders.models import Order
from shared.models import Notification


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # Accept Django staff flag OR the project's custom user_type == 'admin'
        if not request.user or not request.user.is_authenticated:
            return False

        try:
            if getattr(request.user, 'is_staff', False):
                return True
            if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
                return True
        except Exception:
            pass

        return False


class AdminRefundListAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 20))
            status_filter = request.query_params.get('status')

            refunds = RefundRequest.objects.all().order_by('-created_at')
            if status_filter:
                refunds = refunds.filter(status=status_filter)

            total = refunds.count()
            start = (page - 1) * limit
            end = start + limit
            page_qs = refunds[start:end]

            data = []
            for r in page_qs:
                # Gather related info safely
                order = None
                try:
                    order = r.order
                except Exception:
                    order = None

                buyer_user = None
                vendor_user = None
                product = None
                if order:
                    try:
                        buyer_user = getattr(order, 'buyer', None)
                    except Exception:
                        buyer_user = None
                    try:
                        vendor_user = getattr(order, 'vendor', None)
                    except Exception:
                        vendor_user = r.vendor
                    try:
                        product = getattr(order, 'product', None)
                    except Exception:
                        product = None

                data.append({
                    'id': str(r.id),
                    'order_id': getattr(order, 'order_id', None) if order else None,
                    'order_pk': str(order.id) if order else None,
                    'vendor_id': r.vendor.id if r.vendor else (vendor_user.id if vendor_user else None),
                    'vendor_name': getattr(r.vendor, 'username', None) or (getattr(vendor_user, 'username', None) if vendor_user else None),
                    'buyer_id': (buyer_user.id if buyer_user else None),
                    'buyer_name': getattr(buyer_user, 'username', None) if buyer_user else None,
                    'buyer_email': getattr(buyer_user, 'email', None) if buyer_user else None,
                    'vendor_email': getattr(r.vendor, 'email', None) or (getattr(vendor_user, 'email', None) if vendor_user else None),
                    'amount': str(r.amount),
                    'refund_type': r.refund_type,
                    'reason': r.reason,
                    'notes': r.notes,
                    'status': r.status,
                    'created_at': r.created_at.isoformat(),
                    'order': {
                        'order_id': getattr(order, 'order_id', None) if order else None,
                        'total_amount': str(getattr(order, 'total_amount', None)) if order else None,
                        'unit_price': str(getattr(order, 'unit_price', None)) if order else None,
                        'quantity': getattr(order, 'quantity', None) if order else None,
                        'crypto_currency': getattr(order, 'crypto_currency', None) if order else None,
                        'order_status': getattr(order, 'order_status', None) if order else None,
                        'payment_status': getattr(order, 'payment_status', None) if order else None,
                    },
                    'product': {
                        'id': getattr(product, 'id', None) if product else None,
                        'headline': getattr(product, 'headline', None) if product else None,
                        'price': str(getattr(product, 'price', None)) if product else None,
                        'delivery_time': getattr(product, 'delivery_time', None) if product else None,
                        'credentials_visible': getattr(product, 'credentials_visible', None) if product else None,
                        'credentials': getattr(product, 'credentials', None) if (product and getattr(product, 'credentials_visible', False)) else None,
                    }
                })

            return Response({'success': True, 'data': data, 'total': total})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRefundDetailAPIView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, refund_id):
        try:
            refund = RefundRequest.objects.get(id=refund_id)
            data = {
                'id': str(refund.id),
                'order_id': getattr(refund.order, 'order_id', None),
                'order_pk': str(refund.order.id) if refund.order else None,
                'vendor_id': refund.vendor.id if refund.vendor else None,
                'vendor_name': getattr(refund.vendor, 'username', None) if refund.vendor else None,
                'vendor_email': getattr(refund.vendor, 'email', None) if refund.vendor else None,
                'buyer_id': (getattr(refund.order, 'buyer', None).id if refund.order and getattr(refund.order, 'buyer', None) else None),
                'buyer_name': getattr(getattr(refund.order, 'buyer', None), 'username', None) if refund.order and getattr(refund.order, 'buyer', None) else None,
                'buyer_email': getattr(getattr(refund.order, 'buyer', None), 'email', None) if refund.order and getattr(refund.order, 'buyer', None) else None,
                'amount': str(refund.amount),
                'refund_type': refund.refund_type,
                'reason': refund.reason,
                'notes': refund.notes,
                'status': refund.status,
                'rejection_reason': refund.rejection_reason,
                'transaction_hash': refund.transaction_hash,
                'created_at': refund.created_at.isoformat(),
                'updated_at': refund.updated_at.isoformat(),
            }
            # Add expanded order/product info if available
            try:
                order = refund.order
                product = getattr(order, 'product', None)
                data['order'] = {
                    'order_id': getattr(order, 'order_id', None),
                    'order_pk': str(order.id),
                    'total_amount': str(getattr(order, 'total_amount', None)),
                    'unit_price': str(getattr(order, 'unit_price', None)),
                    'quantity': getattr(order, 'quantity', None),
                    'crypto_currency': getattr(order, 'crypto_currency', None),
                    'order_status': getattr(order, 'order_status', None),
                    'payment_status': getattr(order, 'payment_status', None),
                    'product_credentials': getattr(order, 'product_credentials', None),
                }
                if product:
                    data['product'] = {
                        'id': getattr(product, 'id', None),
                        'headline': getattr(product, 'headline', None),
                        'price': str(getattr(product, 'price', None)),
                        'delivery_time': getattr(product, 'delivery_time', None),
                        'credentials_visible': getattr(product, 'credentials_visible', None),
                        'credentials': getattr(product, 'credentials', None) if getattr(product, 'credentials_visible', False) else None,
                        'main_images': getattr(product, 'main_images', None),
                        'description': getattr(product, 'description', None),
                    }
            except Exception:
                pass

            return Response({'success': True, 'data': data})
        except RefundRequest.DoesNotExist:
            return Response({'success': False, 'message': 'Refund not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRefundApproveAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, refund_id):
        try:
            refund = RefundRequest.objects.get(id=refund_id)
            if refund.status != 'pending':
                return Response({'success': False, 'message': 'Refund not pending'}, status=status.HTTP_400_BAD_REQUEST)

            refund.status = 'approved'
            refund.completed_at = timezone.now()
            refund.save()

            # Update order status
            try:
                order = refund.order
                order.order_status = 'refunded'
                order.save()
            except Exception:
                pass

            # Notify buyer and vendor
            try:
                Notification.objects.create(
                    user=order.buyer,
                    type='order',
                    title='Refund Approved',
                    message=f'Your refund for order {order.order_id} has been approved by admin.',
                    data={'refund_id': str(refund.id), 'order_id': order.order_id}
                )
            except Exception:
                pass

            try:
                Notification.objects.create(
                    user=refund.vendor,
                    type='order',
                    title='Refund Approved',
                    message=f'Refund request for order {order.order_id} has been approved by admin.',
                    data={'refund_id': str(refund.id), 'order_id': order.order_id}
                )
            except Exception:
                pass

            return Response({'success': True, 'message': 'Refund approved'})
        except RefundRequest.DoesNotExist:
            return Response({'success': False, 'message': 'Refund not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRefundRejectAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, refund_id):
        try:
            reason = request.data.get('reason', 'Rejected by admin')
            refund = RefundRequest.objects.get(id=refund_id)
            if refund.status != 'pending':
                return Response({'success': False, 'message': 'Refund not pending'}, status=status.HTTP_400_BAD_REQUEST)

            refund.status = 'rejected'
            refund.rejection_reason = reason
            refund.completed_at = timezone.now()
            refund.save()

            # Do not change order status on rejection

            # Notify buyer and vendor
            try:
                order = refund.order
                Notification.objects.create(
                    user=order.buyer,
                    type='order',
                    title='Refund Rejected',
                    message=f'Your refund for order {order.order_id} has been rejected by admin.',
                    data={'refund_id': str(refund.id), 'order_id': order.order_id}
                )
            except Exception:
                pass

            try:
                Notification.objects.create(
                    user=refund.vendor,
                    type='order',
                    title='Refund Rejected',
                    message=f'Refund request for order {order.order_id} has been rejected by admin.',
                    data={'refund_id': str(refund.id), 'order_id': order.order_id}
                )
            except Exception:
                pass

            return Response({'success': True, 'message': 'Refund rejected'})
        except RefundRequest.DoesNotExist:
            return Response({'success': False, 'message': 'Refund not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRefundPingAPIView(APIView):
    """Unauthenticated ping endpoint to verify routing is reachable."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'success': True, 'message': 'payments admin refunds endpoint reachable'})
