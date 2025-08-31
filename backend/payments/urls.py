from django.urls import path
from .views import (
    CreatePaymentAddressView,
    PaymentStatusView,
    EscrowActionView,
    BTCPayWebhookView,
    MoneroWebhookView,
    SupportedCurrenciesView,
    AdminEscrowView,
    PaymentAnalyticsView
)

urlpatterns = [
    # Payment address creation
    path('create/', CreatePaymentAddressView.as_view(), name='create_payment_address'),
    
    # Payment status checking
    path('status/<str:order_id>/', PaymentStatusView.as_view(), name='payment_status'),
    
    # Escrow actions
    path('escrow/<str:order_id>/', EscrowActionView.as_view(), name='escrow_action'),
    
    # Webhooks
    path('webhooks/btcpay/', BTCPayWebhookView.as_view(), name='btcpay_webhook'),
    path('webhooks/monero/', MoneroWebhookView.as_view(), name='monero_webhook'),
    
    # Supported currencies
    path('currencies/', SupportedCurrenciesView.as_view(), name='supported_currencies'),
    
    # Admin endpoints
    path('admin/escrows/', AdminEscrowView.as_view(), name='admin_escrows'),
    path('admin/escrows/<int:escrow_id>/', AdminEscrowView.as_view(), name='admin_escrow_action'),
    path('admin/analytics/', PaymentAnalyticsView.as_view(), name='payment_analytics'),
] 