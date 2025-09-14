from django.urls import path
from . import views

urlpatterns = [
    # Product listing and details
    path('', views.list_products, name='list_products'),
    
    # Buyer listings
    path('buyer/listings/', views.buyer_listings, name='buyer_listings'),
    
    # Vendor product management
    path('vendor/products/', views.vendor_products, name='vendor_products'),
    path('create/', views.create_product, name='create_product'),
    path('update/<int:product_id>/', views.update_product, name='update_product'),
    path('delete/<int:product_id>/', views.delete_product, name='delete_product'),
    
    # Categories
    path('categories/', views.get_categories, name='get_categories'),
    path('categories/<int:category_id>/subcategories/', views.get_category_subcategories, name='get_category_subcategories'),
    
    # Bulk operations
    path('bulk-upload/csv/', views.bulk_upload_csv, name='bulk_upload_csv'),
    path('bulk-upload/simple/', views.bulk_upload_simple, name='bulk_upload_simple'),
    path('bulk-upload/template/', views.get_bulk_upload_template, name='get_bulk_upload_template'),
    
    # Credentials
    path('<int:product_id>/reveal-credentials/', views.reveal_credentials, name='reveal_credentials'),
    
    # View tracking
    path('<int:product_id>/track-view/', views.track_product_view, name='track_product_view'),
    
    # Admin endpoints
    path('admin/all/', views.admin_list_all_products, name='admin_list_all_products'),
    path('admin/<int:product_id>/approve/', views.admin_approve_product, name='admin_approve_product'),
    path('admin/<int:product_id>/reject/', views.admin_reject_product, name='admin_reject_product'),
    
    # Product detail (must be last to avoid conflicts)
    path('<int:product_id>/', views.product_detail, name='product_detail'),
]
