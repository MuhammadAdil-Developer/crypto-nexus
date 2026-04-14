from django.urls import path
from . import views

urlpatterns = [
    path('admin/counts/', views.admin_counts, name='admin-counts'),
    path('vendor/counts/', views.vendor_counts, name='vendor-counts'),
    path('buyer/counts/', views.buyer_counts, name='buyer-counts'),
]


