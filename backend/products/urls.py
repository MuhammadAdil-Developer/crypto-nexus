from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# API URLs for products
urlpatterns = [
    # Categories
    path('categories/', views.ProductCategoryView.as_view(), name='product-categories'),
    path('categories/<int:category_id>/subcategories/', views.ProductSubCategoryView.as_view(), name='product-subcategories'),
    
    # Admin Management (MUST come before generic product patterns)
    path('admin/pending/', views.AdminPendingProductsView.as_view(), name='admin-pending-products'),
    path('admin/all/', views.AdminAllProductsView.as_view(), name='admin-all-products'),
    path('admin/<int:id>/approve/', views.AdminApproveProductView.as_view(), name='admin-approve-product'),
    path('admin/<int:id>/reject/', views.AdminRejectProductView.as_view(), name='admin-reject-product'),
    
    # Product CRUD
    path('create/', views.ProductCreateView.as_view(), name='product-create'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('<int:pk>/update/', views.ProductUpdateView.as_view(), name='product-update'),
    path('<int:pk>/status/', views.ProductStatusUpdateView.as_view(), name='product-status-update'),
    path('<int:pk>/delete/', views.ProductDeleteView.as_view(), name='product-delete'),
    
    # Product Lists
    path('list/', views.ProductListView.as_view(), name='product-list'),
    path('buyer/listings/', views.BuyerListingsView.as_view(), name='buyer-listings'),
    path('search/', views.ProductSearchView.as_view(), name='product-search'),
    path('vendor/<int:vendor_id>/', views.VendorProductListView.as_view(), name='vendor-products'),
    path('my-products/', views.MyProductsView.as_view(), name='my-products'),
    
    # Actions
    path('<int:product_id>/favorite/', views.toggle_product_favorite, name='toggle-favorite'),
    path('stats/', views.get_product_stats, name='product-stats'),
    path('bulk-update/', views.bulk_update_products, name='bulk-update-products'),
] 