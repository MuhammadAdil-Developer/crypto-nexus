# orders/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, 
    RefundRequestAPIView, 
    VendorRefundsAPIView,
    VendorRefundStatsAPIView
)
from .refund_views import (
    buyer_request_refund,
    buyer_refund_requests,
    vendor_approve_refund,
    vendor_reject_refund,
    vendor_refund_requests,
    vendor_pending_refunds,
)
from .dispute_views import (
    buyer_open_dispute,
    buyer_disputes,
    admin_resolve_dispute,
    vendor_process_refund,
)
from .admin_refund_views import (
    admin_refund_requests,
    admin_disputes,
    admin_refund_detail,
    admin_force_refund,
)
from .wallet_views import (
    wallet_balance,
    wallet_transactions,
    wallet_withdraw,
)

# Create router
router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

# Direct URL patterns - These are at /api/v1/ level (same as router)
# So they need 'orders/' prefix to match frontend expectations
direct_patterns = [
    # Legacy refund endpoints (kept for backward compatibility)
    path('orders/refund-request/', RefundRequestAPIView.as_view(), name='refund-request'),
    path('orders/vendor-refunds/', VendorRefundsAPIView.as_view(), name='vendor-refunds'),
    path('orders/vendor-refund-stats/', VendorRefundStatsAPIView.as_view(), name='vendor-refund-stats'),
    
    # New refund endpoints
    path('orders/buyer/refund-request/', buyer_request_refund, name='buyer-request-refund'),
    path('orders/buyer/refund-requests/', buyer_refund_requests, name='buyer-refund-requests'),
    path('orders/vendor/refund-requests/', vendor_refund_requests, name='vendor-refund-requests'),
    path('orders/vendor/refund-requests/pending/', vendor_pending_refunds, name='vendor-pending-refunds'),
    path('orders/vendor/refunds/<uuid:refund_id>/approve/', vendor_approve_refund, name='vendor-approve-refund'),
    path('orders/vendor/refunds/<uuid:refund_id>/reject/', vendor_reject_refund, name='vendor-reject-refund'),
    path('orders/vendor/refunds/<uuid:refund_id>/process/', vendor_process_refund, name='vendor-process-refund'),
    
    # Dispute endpoints
    path('orders/buyer/disputes/open/', buyer_open_dispute, name='buyer-open-dispute'),
    path('orders/buyer/disputes/', buyer_disputes, name='buyer-disputes'),
    path('orders/admin/disputes/<uuid:dispute_id>/resolve/', admin_resolve_dispute, name='admin-resolve-dispute'),
    
    # Admin endpoints
    path('orders/admin/refunds/', admin_refund_requests, name='admin-refund-requests'),
    path('orders/admin/refunds/<uuid:refund_id>/', admin_refund_detail, name='admin-refund-detail'),
    path('orders/admin/refunds/<uuid:refund_id>/force/', admin_force_refund, name='admin-force-refund'),
    path('orders/admin/disputes/', admin_disputes, name='admin-disputes'),
    
    # Wallet endpoints
    path('orders/wallet/balance/', wallet_balance, name='wallet-balance'),
    path('orders/wallet/transactions/', wallet_transactions, name='wallet-transactions'),
    path('orders/wallet/withdraw/', wallet_withdraw, name='wallet-withdraw'),
]

# Combine both
urlpatterns = [
    path('', include(router.urls)),
    *direct_patterns,
]