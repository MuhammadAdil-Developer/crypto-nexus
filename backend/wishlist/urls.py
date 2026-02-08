from django.urls import path
from . import views

urlpatterns = [
    path('', views.wishlist_view, name='wishlist'),
    path('stats/', views.wishlist_stats, name='wishlist_stats'),
    path('product/<int:product_id>/count/', views.product_wishlist_count, name='product_wishlist_count'),
    path('vendor/stats/', views.vendor_wishlist_stats, name='vendor_wishlist_stats'),
    path('notifications/', views.wishlist_notifications, name='wishlist_notifications'),
]


