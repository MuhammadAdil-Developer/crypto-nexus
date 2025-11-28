# orders/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, 
    RefundRequestAPIView, 
    VendorRefundsAPIView,
    VendorRefundStatsAPIView
)

# Create router
router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

# Direct URL patterns (WITHOUT 'orders/' prefix - router already handles it!)
direct_patterns = [
    path('refund-request/', RefundRequestAPIView.as_view(), name='refund-request'),
    path('vendor-refunds/', VendorRefundsAPIView.as_view(), name='vendor-refunds'),
    path('vendor-refund-stats/', VendorRefundStatsAPIView.as_view(), name='vendor-refund-stats'),
]

# Combine both
urlpatterns = [
    path('', include(router.urls)),
    *direct_patterns,
]