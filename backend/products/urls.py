from django.urls import path
from . import views

urlpatterns = [
    # Product listing and details
    path('', views.list_products, name='list_products'),
    path('popular-searches/', views.get_popular_searches, name='get_popular_searches'),
    path('<int:product_id>/', views.product_detail, name='product_detail'),
    
    # Buyer listings
    path('buyer/listings/', views.buyer_listings, name='buyer_listings'),
    
    # Public vendor listings (must come before vendor/products to avoid conflicts)
    path('vendor-public/<str:vendor_username>/', views.get_vendor_public_products, name='get_vendor_public_products'),
    
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
    path('bulk-upload/debug/', views.debug_csv_columns, name='debug_csv_columns'),
    
    # Credentials
    path('<int:product_id>/reveal-credentials/', views.reveal_credentials, name='reveal_credentials'),
    
    # View tracking
    path('<int:product_id>/track-view/', views.track_product_view, name='track_product_view'),

    # Reviews
    path('<int:product_id>/reviews/', views.list_reviews, name='list_reviews'),
    path('<int:product_id>/reviews/create/', views.create_review, name='create_review'),
    path('<int:product_id>/reviews/modal/', views.get_product_reviews, name='get_product_reviews'),
    path('reviews/vendor/', views.list_vendor_reviews, name='list_vendor_reviews'),
    path('reviews/mine/', views.list_buyer_reviews, name='list_buyer_reviews'),
    path('reviews/<uuid:review_id>/reply/', views.reply_to_review, name='reply_to_review'),
    path('reviews/<uuid:review_id>/buyer-reply/', views.buyer_reply_to_vendor, name='buyer_reply_to_vendor'),
    # UI-friendly simple review endpoints
    path('vendor/products/<int:product_id>/reviews/', views.vendor_product_reviews_simple, name='vendor_product_reviews_simple'),
    path('reviews/mine/simple/', views.buyer_reviews_simple, name='buyer_reviews_simple'),
    path('<int:product_id>/reviews/summary/', views.product_reviews_summary, name='product_reviews_summary'),
    path('reviews/summary/bulk/', views.products_reviews_summary_bulk, name='products_reviews_summary_bulk'),
    
    # Admin endpoints
    path('admin/all/', views.admin_list_all_products, name='admin_list_all_products'),
    path('admin/<int:product_id>/approve/', views.admin_approve_product, name='admin_approve_product'),
    path('admin/<int:product_id>/reject/', views.admin_reject_product, name='admin_reject_product'),
    
    # Resubmit endpoint
    path('<int:product_id>/resubmit/', views.resubmit_product, name='resubmit_product'),
    
    # Product detail (must be last to avoid conflicts)
    path('<int:product_id>/', views.product_detail, name='product_detail'),
]
