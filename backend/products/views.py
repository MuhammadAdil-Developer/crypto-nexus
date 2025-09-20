from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework import status
from .models import Product, ProductCategory, ProductSubCategory, ProductView
from .serializers import ProductSerializer, ProductDetailSerializer, ProductCreateSerializer, ProductSubCategorySerializer, ProductCategorySerializer
from users.models import User
import json
import csv
import io
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
from django.conf import settings
from django.utils.text import slugify
import uuid
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class IsAdminUser(BasePermission):
    """Custom permission to only allow admin users"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'admin'
        )

class IsVendorOrAdmin(BasePermission):
    """Custom permission to allow vendor and admin users"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type in ['vendor', 'admin']
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def list_products(request):
    """List all approved products with filtering and search"""
    try:
        # Get query parameters
        search = request.GET.get('search', '')
        category = request.GET.get('category', '')
        account_type = request.GET.get('account_type', '')
        min_price = request.GET.get('min_price', '')
        max_price = request.GET.get('max_price', '')
        sort_by = request.GET.get('sort_by', 'created_at')
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        # Start with approved products
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False
        ).select_related('vendor', 'category', 'sub_category')
        
        # Apply filters
        if search:
            products = products.filter(
                Q(headline__icontains=search) |
                Q(description__icontains=search) |
                Q(website__icontains=search) |
                Q(tags__icontains=search)
            )
        
        if category:
            products = products.filter(category__name__icontains=category)
            
        if account_type:
            products = products.filter(account_type=account_type)
            
        if min_price:
            products = products.filter(price__gte=Decimal(min_price))
            
        if max_price:
            products = products.filter(price__lte=Decimal(max_price))
        
        # Apply sorting
        if sort_by == 'price_low':
            products = products.order_by('price')
        elif sort_by == 'price_high':
            products = products.order_by('-price')
        elif sort_by == 'rating':
            products = products.order_by('-rating')
        elif sort_by == 'views':
            products = products.order_by('-views_count')
        else:  # created_at
            products = products.order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        # Serialize products
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_product_detail(request, product_id):
    """Get detailed product information"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, is_deleted=False)
        
        # Track view if user is authenticated
        if request.user.is_authenticated:
            product.track_view(request.user, request)
        
        serializer = ProductDetailSerializer(product, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Product details retrieved successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error getting product detail: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve product details',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_product_view(request, product_id):
    """Track a product view (separate endpoint for frontend)"""
    try:
        product = get_object_or_404(Product, id=product_id)
        
        # Track the view (removed vendor restriction)
        view_created = product.track_view(request.user, request)
        
        return Response({
            'success': True,
            'message': 'View tracked successfully' if view_created else 'View already tracked',
            'view_created': view_created,
            'views_count': product.views_count
        })
        
    except Exception as e:
        logger.error(f"Error tracking product view: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to track product view',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_products(request):
    """Get products for the authenticated vendor"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            vendor=request.user,
            is_deleted=False
        ).select_related('category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Vendor products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting vendor products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve vendor products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_products(request):
    """Get products for buyer (approved products only)"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False
        ).select_related('vendor', 'category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Buyer products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting buyer products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve buyer products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
    """Create a new product"""
    try:
        # Add vendor information to the data
        data = request.data.copy()
        data['vendor'] = request.user.id
        
        serializer = ProductCreateSerializer(data=data, context={"request": request})
        if serializer.is_valid():
            product = serializer.save()
            
            return Response({
                'success': True,
                'message': 'Product created successfully',
                'data': ProductSerializer(product, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'message': 'Failed to create product',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to create product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_products(request):
    """Get all products for admin"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            is_deleted=False
        ).select_related('vendor', 'category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'All products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting all products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAdminUser])
def approve_product(request, product_id):
    """Approve a product"""
    try:
        product = get_object_or_404(Product, id=product_id)
        product.approve_product(request.user)
        
        return Response({
            'success': True,
            'message': 'Product approved successfully',
            'data': ProductSerializer(product, context={'request': request}).data
        })
        
    except Exception as e:
        logger.error(f"Error approving product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to approve product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAdminUser])
def reject_product(request, product_id):
    """Reject a product"""
    try:
        product = get_object_or_404(Product, id=product_id)
        rejection_notes = request.data.get('rejection_notes', '')
        product.reject_product(rejection_notes, request.user)
        
        return Response({
            'success': True,
            'message': 'Product rejected successfully',
            'data': ProductSerializer(product, context={'request': request}).data
        })
        
    except Exception as e:
        logger.error(f"Error rejecting product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to reject product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_categories(request):
    """Get all product categories"""
    try:
        categories = ProductCategory.objects.filter(is_active=True, is_deleted=False).order_by('sort_order', 'name')
        serializer = ProductCategorySerializer(categories, many=True)
        
        return Response({
            'success': True,
            'message': 'Categories retrieved successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve categories',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_subcategories(request, category_id):
    """Get subcategories for a category"""
    try:
        subcategories = ProductSubCategory.objects.filter(
            category_id=category_id,
            is_active=True,
            is_deleted=False
        ).order_by('sort_order', 'name')
        serializer = ProductSubCategorySerializer(subcategories, many=True)
        
        return Response({
            'success': True,
            'message': 'Subcategories retrieved successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error getting subcategories: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve subcategories',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsVendorOrAdmin])
def bulk_upload_products(request):
    """Bulk upload products from CSV"""
    try:
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({
                'success': False,
                'message': 'File must be a CSV'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Read CSV
        content = file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))
        
        products_created = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Check if CSV parsing failed (all data in one column)
                if len(row) == 1 and ',' in list(row.keys())[0]:
                    # CSV parsing failed, manually parse the data
                    header_key = list(row.keys())[0]
                    data_value = list(row.values())[0]
                    
                    # Split the header and data
                    headers = [h.strip() for h in header_key.split(',')]
                    values = [v.strip() for v in data_value.split(',')]
                    
                    # Create a proper row dictionary
                    row = {}
                    for i, header in enumerate(headers):
                        if i < len(values):
                            row[header] = values[i]
                        else:
                            row[header] = ''
                
                # Handle credentials field - replace \n with actual newlines
                credentials = (row.get('credentials') or '').strip()
                if credentials:
                    credentials = credentials.replace('\\n', '\n')
                
                # Handle account balance
                account_balance = (row.get('account_balance') or '').strip()
                
                # Map CSV columns to product fields
                product_data = {
                    'headline': (row.get('headline') or '').strip(),
                    'website': (row.get('website') or '').strip(),
                    'account_type': (row.get('account_type') or 'other').strip(),
                    'access_type': (row.get('access_type') or 'full_ownership').strip(),
                    'description': (row.get('description') or '').strip(),
                    'price': (row.get('price') or '0').strip(),
                    'additional_info': (row.get('additional_info') or '').strip(),
                    'delivery_time': (row.get('delivery_time') or 'instant_auto').strip(),
                    'credentials': credentials,
                    'account_balance': account_balance,
                    'vendor': request.user.id,
                    'category_id': 1,  # Default category
                }
                
                serializer = ProductCreateSerializer(data=product_data)
                if serializer.is_valid():
                    serializer.save()
                    products_created += 1
                else:
                    errors.append(f"Row {row_num}: {serializer.errors}")
                    
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Bulk upload completed. {products_created} products created.',
            'products_created': products_created,
            'errors': errors
        })
        
    except Exception as e:
        logger.error(f"Error in bulk upload: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to process bulk upload',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_products_csv(request):
    """Export products to CSV"""
    try:
        products = Product.objects.filter(is_deleted=False).select_related('vendor', 'category')
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="products.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Headline', 'Website', 'Account Type', 'Access Type', 
            'Price', 'Status', 'Vendor', 'Category', 'Created At'
        ])
        
        for product in products:
            writer.writerow([
                product.id,
                product.headline,
                product.website,
                product.account_type,
                product.access_type,
                str(product.price),
                product.status,
                product.vendor.username,
                product.category.name if product.category else '',
                product.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
        
        return response
        
    except Exception as e:
        logger.error(f"Error exporting products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to export products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_listings(request):
    """Get products for buyer (approved products only)"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False
        ).select_related('vendor', 'category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Buyer products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting buyer products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve buyer products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_products(request):
    """Get products for the authenticated vendor"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            vendor=request.user,
            is_deleted=False
        ).select_related('category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Vendor products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting vendor products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve vendor products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_product(request, product_id):
    """Update a product"""
    try:
        product = get_object_or_404(Product, id=product_id, vendor=request.user)
        
        serializer = ProductCreateSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            return Response({
                'success': True,
                'message': 'Product updated successfully',
                'data': ProductSerializer(product, context={'request': request}).data
            })
        else:
            return Response({
                'success': False,
                'message': 'Failed to update product',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error updating product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to update product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_product(request, product_id):
    """Delete a product (soft delete)"""
    try:
        product = get_object_or_404(Product, id=product_id, vendor=request.user)
        product.is_deleted = True
        product.save()
        
        return Response({
            'success': True,
            'message': 'Product deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error deleting product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to delete product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_category_subcategories(request, category_id):
    """Get subcategories for a category"""
    try:
        subcategories = ProductSubCategory.objects.filter(
            category_id=category_id,
            is_active=True,
            is_deleted=False
        ).order_by('sort_order', 'name')
        serializer = ProductSubCategorySerializer(subcategories, many=True)
        
        return Response({
            'success': True,
            'message': 'Subcategories retrieved successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error getting subcategories: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve subcategories',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsVendorOrAdmin])
def bulk_upload_csv(request):
    """Bulk upload products from CSV"""
    try:
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({
                'success': False,
                'message': 'File must be a CSV'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Read CSV
        content = file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))
        
        products_created = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Check if CSV parsing failed (all data in one column)
                if len(row) == 1 and ',' in list(row.keys())[0]:
                    # CSV parsing failed, manually parse the data
                    header_key = list(row.keys())[0]
                    data_value = list(row.values())[0]
                    
                    # Split the header and data
                    headers = [h.strip() for h in header_key.split(',')]
                    values = [v.strip() for v in data_value.split(',')]
                    
                    # Create a proper row dictionary
                    row = {}
                    for i, header in enumerate(headers):
                        if i < len(values):
                            row[header] = values[i]
                        else:
                            row[header] = ''
                
                # Handle credentials field - replace \n with actual newlines
                credentials = (row.get('credentials') or '').strip()
                if credentials:
                    credentials = credentials.replace('\\n', '\n')
                
                # Handle account balance
                account_balance = (row.get('account_balance') or '').strip()
                
                # Map CSV columns to product fields
                product_data = {
                    'headline': (row.get('headline') or '').strip(),
                    'website': (row.get('website') or '').strip(),
                    'account_type': (row.get('account_type') or 'other').strip(),
                    'access_type': (row.get('access_type') or 'full_ownership').strip(),
                    'description': (row.get('description') or '').strip(),
                    'price': (row.get('price') or '0').strip(),
                    'additional_info': (row.get('additional_info') or '').strip(),
                    'delivery_time': (row.get('delivery_time') or 'instant_auto').strip(),
                    'credentials': credentials,
                    'account_balance': account_balance,
                    'vendor': request.user.id,
                    'category_id': 1,  # Default category
                }
                
                serializer = ProductCreateSerializer(data=product_data)
                if serializer.is_valid():
                    serializer.save()
                    products_created += 1
                else:
                    errors.append(f"Row {row_num}: {serializer.errors}")
                    
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Bulk upload completed. {products_created} products created.',
            'products_created': products_created,
            'errors': errors
        })
        
    except Exception as e:
        logger.error(f"Error in bulk upload: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to process bulk upload',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsVendorOrAdmin])
def bulk_upload_simple(request):
    """Simple bulk upload for text format"""
    try:
        # Handle both string and array formats
        if isinstance(request.data, str):
            # If it's a string, parse it as text format
            text_data = request.data
            products_data = parse_text_format(text_data)
        else:
            # If it's already an array, use it directly
            products_data = request.data.get('products', [])
        
        if not products_data:
            return Response({
                'success': False,
                'message': 'No products data provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        products_created = 0
        errors = []
        
        for product_data in products_data:
            try:
                # Add vendor and category
                product_data['vendor'] = request.user.id
                product_data['category_id'] = 1  # Default category
                
                serializer = ProductCreateSerializer(data=product_data)
                if serializer.is_valid():
                    serializer.save()
                    products_created += 1
                else:
                    errors.append(f"Product validation failed: {serializer.errors}")
                    
            except Exception as e:
                errors.append(f"Error creating product: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Bulk upload completed. {products_created} products created.',
            'products_created': products_created,
            'errors': errors
        })
        
    except Exception as e:
        logger.error(f"Error in bulk upload simple: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to process bulk upload',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def parse_text_format(text_data):
    """Parse text format into product objects"""
    products = []
    lines = text_data.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Try different parsing methods
        if '|' in line:
            # Format: Product Name | Website | Account Type | Price | Description
            parts = [part.strip() for part in line.split('|')]
            if len(parts) >= 5:
                product = {
                    'headline': parts[0],
                    'website': parts[1],
                    'account_type': parts[2],
                    'price': parts[3],
                    'description': parts[4],
                    'access_type': 'full_ownership',
                    'delivery_time': 'instant_auto',
                    'additional_info': '',
                    'credentials': '',
                    'account_balance': ''
                }
                products.append(product)
        elif ',' in line:
            # Format: Product Name, Website, Account Type, Price, Description
            parts = [part.strip() for part in line.split(',')]
            if len(parts) >= 5:
                product = {
                    'headline': parts[0],
                    'website': parts[1],
                    'account_type': parts[2],
                    'price': parts[3],
                    'description': parts[4],
                    'access_type': 'full_ownership',
                    'delivery_time': 'instant_auto',
                    'additional_info': '',
                    'credentials': '',
                    'account_balance': ''
                }
                products.append(product)
    
    return products

@api_view(['POST'])
@permission_classes([IsVendorOrAdmin])
def debug_csv_columns(request):
    """Debug endpoint to see what columns are in the CSV"""
    try:
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({
                'success': False,
                'message': 'File must be a CSV'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Read CSV
        content = file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))
        
        # Get first few rows for debugging
        rows = []
        for i, row in enumerate(csv_reader):
            if i < 3:  # First 3 rows
                rows.append(row)
            else:
                break
        
        return Response({
            'success': True,
            'message': 'CSV debug info',
            'csv_columns': csv_reader.fieldnames,
            'sample_rows': rows,
            'expected_columns': ['headline', 'website', 'description', 'account_type', 'access_type', 'price', 'additional_info', 'delivery_time']
        })
        
    except Exception as e:
        logger.error(f"Error in CSV debug: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to debug CSV',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_bulk_upload_template(request):
    """Get bulk upload template"""
    try:
        template = {
            'headers': [
                'headline', 'website', 'account_type', 'access_type', 
                'description', 'price', 'additional_info', 'delivery_time'
            ],
            'sample_data': [
                'Sample Product', 'example.com', 'social', 'full_ownership',
                'Sample description', '10.00', 'Additional info', 'instant_auto'
            ]
        }
        
        return Response({
            'success': True,
            'message': 'Template retrieved successfully',
            'data': template
        })
        
    except Exception as e:
        logger.error(f"Error getting template: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve template',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reveal_credentials(request, product_id):
    """Reveal credentials after payment"""
    try:
        product = get_object_or_404(Product, id=product_id)
        
        # Check if user has permission to view credentials
        # This should be enhanced with proper order/payment verification
        if request.user != product.vendor:
            return Response({
                'success': False,
                'message': 'You do not have permission to view these credentials'
            }, status=status.HTTP_403_FORBIDDEN)
        
        product.reveal_credentials()
        
        return Response({
            'success': True,
            'message': 'Credentials revealed successfully',
            'credentials': product.credentials
        })
        
    except Exception as e:
        logger.error(f"Error revealing credentials: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to reveal credentials',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_all_products(request):
    """Get all products for admin"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            is_deleted=False
        ).select_related('vendor', 'category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'All products retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting all products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve products',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAdminUser])
def admin_approve_product(request, product_id):
    """Approve a product"""
    try:
        product = get_object_or_404(Product, id=product_id)
        product.approve_product(request.user)
        
        return Response({
            'success': True,
            'message': 'Product approved successfully',
            'data': ProductSerializer(product, context={'request': request}).data
        })
        
    except Exception as e:
        logger.error(f"Error approving product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to approve product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAdminUser])
def admin_reject_product(request, product_id):
    """Reject a product"""
    try:
        product = get_object_or_404(Product, id=product_id)
        rejection_notes = request.data.get('rejection_notes', '')
        product.reject_product(rejection_notes, request.user)
        
        return Response({
            'success': True,
            'message': 'Product rejected successfully',
            'data': ProductSerializer(product, context={'request': request}).data
        })
        
    except Exception as e:
        logger.error(f"Error rejecting product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to reject product',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def product_detail(request, product_id):
    """Get detailed product information"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, is_deleted=False)
        
        # Track view if user is authenticated
        if request.user.is_authenticated:
            product.track_view(request.user, request)
        
        serializer = ProductDetailSerializer(product, context={'request': request})
        
        return Response({
            'success': True,
            'message': 'Product details retrieved successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error getting product detail: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve product details',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
