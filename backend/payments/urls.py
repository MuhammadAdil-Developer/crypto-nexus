from django.urls import path
from .views import (
    CreatePaymentAddressView,
    PaymentStatusView,
    EscrowActionView,
    BTCPayWebhookView,
    MoneroWebhookView,
    SupportedCurrenciesView,
    AdminEscrowView,
    PaymentAnalyticsView,
    AdminPayoutView,
    PayoutStatsView,
    CreateEscrowPayoutView,
    VendorPayoutsView,
    TransactionHistoryView,
    BuyerTransactionHistoryView,
    VendorTransactionHistoryView,
    DirectPaymentMonitorView
)
from .commission_views import CommissionSettingsView, CommissionHistoryView

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
    path('admin/payouts/', AdminPayoutView.as_view(), name='admin_payouts'),
    path('admin/payouts/stats/', PayoutStatsView.as_view(), name='payout_stats'),
    path('admin/payouts/create-escrow/', CreateEscrowPayoutView.as_view(), name='create_escrow_payout'),
    
    # Vendor endpoints
    path('vendor/payouts/', VendorPayoutsView.as_view(), name='vendor_payouts'),
    
    # Transaction history
    path('admin/transaction-history/', TransactionHistoryView.as_view(), name='transaction_history'),
    path('buyer/transaction-history/', BuyerTransactionHistoryView.as_view(), name='buyer_transaction_history'),
    path('vendor/transaction-history/', VendorTransactionHistoryView.as_view(), name='vendor_transaction_history'),
    
    # Direct payment monitoring
    path('admin/direct-payment-monitor/', DirectPaymentMonitorView.as_view(), name='direct_payment_monitor'),
    
    # Commission settings
    path('admin/commission-settings/', CommissionSettingsView.as_view(), name='commission_settings'),
    path('admin/commission-history/', CommissionHistoryView.as_view(), name='commission_history'),
] 