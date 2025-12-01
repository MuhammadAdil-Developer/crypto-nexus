from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.utils.dateparse import parse_date
import hashlib
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework import status
from .models import Product, ProductCategory, ProductSubCategory, ProductView, ProductReview
from shared.models import Notification
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
def get_popular_searches(request):
    """Get popular search suggestions based on most viewed/searched products"""
    try:
        limit = int(request.GET.get('limit', 10))
        
        # Get products ordered by views_count, favorites_count, and created_at
        # This gives us the most popular products which are likely to be searched
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False
        ).order_by('-views_count', '-favorites_count', '-created_at')[:limit * 2]
        
        # Extract unique search terms from popular products
        suggestions = []
        seen = set()
        
        for product in products:
            # Use headline as primary suggestion
            if product.headline and product.headline.lower() not in seen:
                suggestions.append({
                    'term': product.headline,
                    'count': product.views_count + product.favorites_count,
                    'type': 'product'
                })
                seen.add(product.headline.lower())
            
            # Use website/domain as suggestion if available
            if product.website:
                domain = product.website.replace('https://', '').replace('http://', '').split('/')[0]
                if domain and domain.lower() not in seen and len(domain) > 3:
                    suggestions.append({
                        'term': domain,
                        'count': product.views_count,
                        'type': 'website'
                    })
                    seen.add(domain.lower())
            
            # Add tags as suggestions
            if product.tags:
                for tag in product.tags.split(',')[:2]:  # Max 2 tags per product
                    tag_clean = tag.strip()
                    if tag_clean and tag_clean.lower() not in seen and len(tag_clean) > 2:
                        suggestions.append({
                            'term': tag_clean,
                            'count': product.views_count // 2,
                            'type': 'tag'
                        })
                        seen.add(tag_clean.lower())
            
            if len(suggestions) >= limit:
                break
        
        # Sort by count (popularity) and return
        suggestions.sort(key=lambda x: x['count'], reverse=True)
        
        return Response({
            'success': True,
            'data': suggestions[:limit]
        })
        
    except Exception as e:
        logger.error(f"Error getting popular searches: {str(e)}")
        # Return default popular searches on error
        default_suggestions = [
            {'term': 'Netflix', 'count': 1000, 'type': 'product'},
            {'term': 'Spotify', 'count': 900, 'type': 'product'},
            {'term': 'Steam', 'count': 800, 'type': 'product'},
            {'term': 'Adobe', 'count': 700, 'type': 'product'},
            {'term': 'Amazon Prime', 'count': 600, 'type': 'product'},
        ]
        return Response({
            'success': True,
            'data': default_suggestions[:limit]
        })

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
@permission_classes([AllowAny])
def get_vendor_public_products(request, vendor_username):
    """Get public products for a specific vendor by username"""
    print(f"🔍 get_vendor_public_products called with vendor_username: {vendor_username}")
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        # Get products by vendor username
        products = Product.objects.filter(
            vendor__username=vendor_username,
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
            'message': f'Products for vendor {vendor_username} retrieved successfully',
            'data': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting vendor public products for {vendor_username}: {str(e)}")
        return Response({
            'success': False,
            'message': f'Failed to retrieve products for vendor {vendor_username}',
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
        # Prepare incoming data and allow admins to create listings for a specified vendor
        data = request.data.copy()
        # If admin provided a vendor username, resolve it to the user's id
        try:
            if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
                vendor_username = data.get('vendor_username') or data.get('vendor')
                if vendor_username:
                    from users.models import User
                    # If vendor_username looks like a UUID or id, the serializer will handle it; otherwise try username
                    try:
                        vendor_obj = User.objects.get(username=str(vendor_username))
                        data['vendor'] = vendor_obj.id
                    except User.DoesNotExist:
                        # leave vendor as-is (serializer will validate)
                        pass
                else:
                    # No vendor provided by admin, fall back to admin as vendor (rare)
                    data['vendor'] = request.user.id
            else:
                # Non-admins must be the vendor
                data['vendor'] = request.user.id
        except Exception:
            # Best-effort: ensure vendor fallback
            data['vendor'] = request.user.id
        
        # Debug logging
        logger.info(f"Request data keys: {list(data.keys())}")
        logger.info(f"Request FILES keys: {list(request.FILES.keys()) if hasattr(request, 'FILES') else 'No FILES'}")
        logger.info(f"gallery_images type: {type(data.get('gallery_images'))}, value: {data.get('gallery_images')}")
        logger.info(f"documents type: {type(data.get('documents'))}, value: {data.get('documents')}")
        
        serializer = ProductCreateSerializer(data=data, context={"request": request})
        if serializer.is_valid():
            product = serializer.save()
            
            # Notify admin about new product
            try:
                from shared.admin_notifications import notify_admin_product_created
                notify_admin_product_created(product)
            except Exception as e:
                logger.error(f"Failed to notify admin about product: {e}")
            
            # Notify the vendor (if different from creator) about the new listing
            try:
                from shared.models import Notification
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer

                vendor_user = getattr(product, 'vendor', None)
                # Create DB notification for vendor
                if vendor_user:
                    Notification.objects.create(
                        user=vendor_user,
                        type='listing_approval',
                        title='New product listing created',
                        message=f'An admin created a new listing "{product.headline}" for your vendor account. Please review your listing.',
                        data={'product_id': str(product.id), 'action_url': '/vendor/listings'}
                    )

                # Create a confirmation notification for the admin who created it
                try:
                    Notification.objects.create(
                        user=request.user,
                        type='system',
                        title='Product created',
                        message=f'You created the product "{product.headline}" successfully.',
                        data={'product_id': str(product.id), 'action_url': '/admin/listings'}
                    )
                except Exception:
                    pass

                # Send realtime events to vendor and admin creator
                try:
                    channel_layer = get_channel_layer()
                    if channel_layer and vendor_user:
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{vendor_user.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'id': f'prod_{product.id}',
                                    'type': 'listing_approval',
                                    'title': 'New product listing',
                                    'message': f'An admin created "{product.headline}" for your vendor account',
                                    'is_read': False,
                                    'data': {'product_id': str(product.id), 'action_url': '/vendor/listings'},
                                    'action_url': '/vendor/listings',
                                    'created_at': product.created_at.isoformat(),
                                    'priority': 'normal'
                                }
                            }
                        )

                    # Notify the creating admin specifically (single user)
                    try:
                        if channel_layer:
                            async_to_sync(channel_layer.group_send)(
                                f'realtime_{request.user.id}',
                                {
                                    'type': 'order_notification',
                                    'data': {
                                        'id': f'prod_admin_{product.id}',
                                        'type': 'system',
                                        'title': 'Product created',
                                        'message': f'You created the product "{product.headline}" successfully',
                                        'is_read': False,
                                        'data': {'product_id': str(product.id), 'action_url': '/admin/listings'},
                                        'action_url': '/admin/listings',
                                        'created_at': product.created_at.isoformat(),
                                        'priority': 'low'
                                    }
                                }
                            )
                    except Exception:
                        pass
                except Exception as e:
                    logger.error(f"Error sending real-time notifications for product create: {e}")
            except Exception as e:
                logger.error(f"Failed to notify vendor/admin about product creation: {e}")
            
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

@api_view(['PUT'])
@permission_classes([IsVendorOrAdmin])
def resubmit_product(request, product_id):
    """Resubmit a rejected product for review"""
    try:
        product = get_object_or_404(Product, id=product_id)
        
        # Only allow resubmission if product is rejected
        if product.status != 'rejected':
            return Response({
                'success': False,
                'message': 'Only rejected products can be resubmitted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Change status back to pending_approval
        product.status = 'pending_approval'
        product.save()
        
        # Notify admin about product resubmission
        try:
            from shared.admin_notifications import notify_admin_product_resubmitted
            notify_admin_product_resubmitted(product)
        except Exception as _:
            pass
        
        return Response({
            'success': True,
            'message': 'Product resubmitted successfully',
            'data': ProductSerializer(product, context={'request': request}).data
        })
        
    except Exception as e:
        logger.error(f"Error resubmitting product: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to resubmit product',
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

@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_category(request):
    """Create a new category (admin only)"""
    try:
        from django.utils.text import slugify
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        slug = request.data.get('slug', '').strip() or slugify(name)
        sort_order = int(request.data.get('sort_order', 0))
        is_active = request.data.get('is_active', True)
        
        if not name:
            return Response({
                'success': False,
                'message': 'Category name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if slug already exists
        if ProductCategory.objects.filter(slug=slug).exists():
            return Response({
                'success': False,
                'message': 'A category with this slug already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        category = ProductCategory.objects.create(
            name=name,
            description=description,
            slug=slug,
            sort_order=sort_order,
            is_active=is_active
        )
        
        serializer = ProductCategorySerializer(category)
        return Response({
            'success': True,
            'message': 'Category created successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to create category',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAdminUser])
def update_category(request, category_id):
    """Update a category (admin only)"""
    try:
        from django.utils.text import slugify
        import uuid
        # Handle both UUID string and UUID object
        try:
            if isinstance(category_id, str):
                category_id = uuid.UUID(category_id)
            category = get_object_or_404(ProductCategory, id=category_id)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'message': 'Invalid category ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        slug = request.data.get('slug', '').strip()
        sort_order = request.data.get('sort_order')
        is_active = request.data.get('is_active')
        
        if name:
            category.name = name
        if description is not None:
            category.description = description
        if slug:
            # Check if slug already exists for another category
            if ProductCategory.objects.filter(slug=slug).exclude(id=category_id).exists():
                return Response({
                    'success': False,
                    'message': 'A category with this slug already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            category.slug = slug
        elif name and not slug:
            category.slug = slugify(name)
        if sort_order is not None:
            category.sort_order = int(sort_order)
        if is_active is not None:
            category.is_active = bool(is_active)
        
        category.save()
        
        serializer = ProductCategorySerializer(category)
        return Response({
            'success': True,
            'message': 'Category updated successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to update category',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_category(request, category_id):
    """Delete a category (soft delete, admin only)"""
    try:
        import uuid
        # Handle both UUID string and UUID object
        try:
            if isinstance(category_id, str):
                category_id = uuid.UUID(category_id)
            category = get_object_or_404(ProductCategory, id=category_id)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'message': 'Invalid category ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        category.is_deleted = True
        category.is_active = False
        category.save()
        
        return Response({
            'success': True,
            'message': 'Category deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to delete category',
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
    """Get products for buyer with sophisticated rotating sorting (like Fiverr)"""
    try:
        from orders.models import Order
        from django.db.models import Sum, Count
        
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 50))  # Increased page size
        
        # Base queryset
        products_qs = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False
        ).select_related('vendor', 'category', 'sub_category')

        # Get unique vendor IDs
        vendor_ids = list(set([p.vendor_id for p in products_qs]))
        
        # Get vendor statistics for sophisticated sorting using bulk queries
        vendor_stats = {}
        
        # Bulk query completed orders per vendor
        orders_by_vendor = Order.objects.filter(
            vendor_id__in=vendor_ids,
            order_status__in=['delivered', 'confirmed', 'paid']
        ).values('vendor_id').annotate(
            completed_orders=Count('id'),
            total_sales=Sum('total_amount')
        )
        
        orders_dict = {item['vendor_id']: item for item in orders_by_vendor}
        
        # Bulk query product statistics per vendor
        products_by_vendor = Product.objects.filter(
            vendor_id__in=vendor_ids,
            status='approved'
        ).values('vendor_id').annotate(
            avg_rating=Avg('rating'),
            total_views=Sum('views_count'),
            total_favorites=Sum('favorites_count'),
            product_count=Count('id')
        )
        
        products_dict = {item['vendor_id']: item for item in products_by_vendor}
        
        # Get all vendor users
        vendors = User.objects.filter(id__in=vendor_ids).select_related()
        vendors_dict = {v.id: v for v in vendors}
        
        # Combine all statistics
        for vendor_id in vendor_ids:
            vendor = vendors_dict.get(vendor_id)
            if not vendor:
                vendor_stats[vendor_id] = {
                    'completed_orders': 0,
                    'total_sales': 0.0,
                    'avg_rating': 0.0,
                    'total_views': 0,
                    'total_favorites': 0,
                    'is_new_vendor': False,
                    'days_as_vendor': 999999,
                    'product_count': 0,
                }
                continue
                
            order_stats = orders_dict.get(vendor_id, {})
            product_stats = products_dict.get(vendor_id, {})
            
            # Check if vendor is new (member for less than 30 days)
            days_as_vendor = (timezone.now() - vendor.date_joined).days
            is_new_vendor = days_as_vendor < 30
            
            vendor_stats[vendor_id] = {
                'completed_orders': order_stats.get('completed_orders', 0),
                'total_sales': float(order_stats.get('total_sales') or 0),
                'avg_rating': float(product_stats.get('avg_rating') or 0),
                'total_views': product_stats.get('total_views') or 0,
                'total_favorites': product_stats.get('total_favorites') or 0,
                'is_new_vendor': is_new_vendor,
                'days_as_vendor': days_as_vendor,
                'product_count': product_stats.get('product_count', 0),
            }

        # Sorting / personalization options
        sort_mode = request.GET.get('sort_mode', 'personalized')
        bucket = request.GET.get('bucket') or timezone.now().strftime('%Y-%m-%d')
        seed = request.GET.get('seed', '')

        # Load into list to allow custom ordering before pagination
        products_list = list(products_qs)

        if sort_mode == 'personalized':
            # Multi-criteria rotating sorting based on buyer
            user_id = getattr(request.user, 'id', 'anon')
            
            # Determine which sorting criteria to use for this buyer
            # Use user_id + bucket to create different strategies for different buyers
            strategy_seed = int(hashlib.sha256(f"{user_id}-{bucket}".encode()).hexdigest()[:8], 16)
            
            # Select one of 7 rotating strategies for this buyer
            strategies = [
                'highest_rated',      # Sort by highest vendor ratings
                'newest_vendors',     # Sort by newest vendors
                'top_sellers',        # Sort by most completed orders
                'recent_listings',    # Sort by newly uploaded products
                'most_views',         # Sort by products with most views
                'best_value',         # Sort by price/rating ratio
                'mixed_rotation',     # Mix multiple criteria with rotation
            ]
            strategy_index = strategy_seed % len(strategies)
            selected_strategy = strategies[strategy_index]
            
            logger.info(f"Buyer {user_id} assigned strategy: {selected_strategy}")
            
            # Apply the selected strategy
            if selected_strategy == 'highest_rated':
                # Sort by vendor's average rating (highest first)
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    return (-float(stats.get('avg_rating', 0)), -stats.get('completed_orders', 0))
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'newest_vendors':
                # Sort by newest vendors first
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    is_new = stats.get('is_new_vendor', False)
                    days = stats.get('days_as_vendor', 999999)
                    return (not is_new, days)  # New vendors first, then by days
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'top_sellers':
                # Sort by vendors with most completed orders
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    return -stats.get('completed_orders', 0)
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'recent_listings':
                # Sort by newly uploaded products (created_at)
                def _sort_key(p):
                    return -(p.created_at.timestamp() if p.created_at else 0)
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'most_views':
                # Sort by products with most views, with vendor diversity
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    # Combine product views with vendor diversity
                    vendor_hash = (abs(hash(str(p.vendor_id))) * 7919) % 1000  # For diversity
                    return (-(p.views_count or 0), -stats.get('total_views', 0), vendor_hash)
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'best_value':
                # Sort by best price/rating ratio
                def _sort_key(p):
                    try:
                        price = float(p.price)
                        stats = vendor_stats.get(p.vendor_id, {})
                        rating = stats.get('avg_rating', 0) or 1
                        # Lower price and higher rating = better value
                        value_score = -price / max(rating, 0.1)
                        return (value_score, -stats.get('completed_orders', 0))
                    except:
                        return (0, 0)
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'mixed_rotation':
                # Mix multiple criteria with rotation: weight different factors
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    vendor_hash = (abs(hash(str(p.vendor_id))) * 7919) % 1000
                    
                    # Weighted score: rating (40%) + orders (30%) + views (20%) + diversity (10%)
                    rating_score = (stats.get('avg_rating', 0) or 0) * 4
                    order_score = (stats.get('completed_orders', 0) / 100.0) * 3
                    view_score = ((p.views_count or 0) / 1000.0) * 2
                    diversity_score = (vendor_hash / 1000.0) * 1
                    
                    total_score = rating_score + order_score + view_score + diversity_score
                    return -total_score
                products_list.sort(key=_sort_key)

        elif sort_mode == 'newest':
            products_list.sort(key=lambda p: -(p.created_at.timestamp() if p.created_at else 0))

        elif sort_mode == 'oldest':
            products_list.sort(key=lambda p: p.created_at.timestamp() if p.created_at else 0)

        elif sort_mode == 'rating':
            def _sort_key(p):
                stats = vendor_stats.get(p.vendor_id, {})
                return -stats.get('avg_rating', 0)
            products_list.sort(key=_sort_key)

        elif sort_mode == 'views':
            products_list.sort(key=lambda p: -(p.views_count or 0))

        elif sort_mode == 'random':
            import random
            random.shuffle(products_list)

        # Pagination
        total_count = len(products_list)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = products_list[start:end]

        serializer = ProductSerializer(paginated, many=True, context={'request': request})

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
        # Allow admins to update any product, vendors can only update their own
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            product = get_object_or_404(Product, id=product_id)
        else:
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
    """Delete a product (soft delete) - Admins can delete any product"""
    try:
        # Allow admins to delete any product, vendors can only delete their own
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            product = get_object_or_404(Product, id=product_id)
        else:
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
        elif 'text_data' in request.data:
            # Handle JSON with text_data field
            text_data = request.data['text_data']
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
                # Get the first available category (default category)
                from .models import ProductCategory
                default_category = ProductCategory.objects.filter(is_active=True, is_deleted=False).first()
                if default_category:
                    product_data['category_id'] = default_category.id
                else:
                    errors.append("No active category found")
                    continue
                
                # Ensure credentials field is not empty for bulk upload
                if not product_data.get('credentials', '').strip():
                    product_data['credentials'] = 'Credentials will be provided after purchase'
                
                # Add vendor ID to product data
                product_data['vendor'] = request.user.id
                
                # Create serializer with request context for vendor validation
                serializer = ProductCreateSerializer(data=product_data, context={'request': request})
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
        
        # Skip header lines and comments
        if line.startswith('#') or line.startswith('##') or line.startswith('Format:'):
            continue
            
        # Try different parsing methods
        if '|' in line:
            # Format: Product Name | Website | Account Type | Price | Description | Credentials
            # Handle numbered lists like "1. Product Name | Website | ..."
            if line[0].isdigit() and '. ' in line:
                line = line.split('. ', 1)[1]  # Remove "1. " prefix
            
            parts = [part.strip() for part in line.split('|')]
            if len(parts) >= 5:
                # Handle credentials field (6th field if present)
                credentials = parts[5] if len(parts) > 5 and parts[5].strip() else 'Credentials will be provided after purchase'
                
                product = {
                    'headline': parts[0],
                    'website': parts[1],
                    'account_type': parts[2],
                    'price': parts[3],
                    'description': parts[4],
                    'credentials': credentials,
                    'access_type': 'full_ownership',
                    'delivery_time': 'instant_auto',
                    'additional_info': '',
                    'account_balance': ''
                }
                products.append(product)
        elif ',' in line:
            # Format: Product Name, Website, Account Type, Price, Description, Credentials
            # Handle numbered lists like "1. Product Name, Website, ..."
            if line[0].isdigit() and '. ' in line:
                line = line.split('. ', 1)[1]  # Remove "1. " prefix
            
            parts = [part.strip() for part in line.split(',')]
            if len(parts) >= 5:
                # Handle credentials field (6th field if present)
                credentials = parts[5] if len(parts) > 5 and parts[5].strip() else 'Credentials will be provided after purchase'
                
                product = {
                    'headline': parts[0],
                    'website': parts[1],
                    'account_type': parts[2],
                    'price': parts[3],
                    'description': parts[4],
                    'credentials': credentials,
                    'access_type': 'full_ownership',
                    'delivery_time': 'instant_auto',
                    'additional_info': '',
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
@permission_classes([IsVendorOrAdmin])
def get_bulk_upload_template(request):
    """Get bulk upload template"""
    try:
        template = {
            'headers': [
                'headline', 'website', 'account_type', 'access_type', 
                'description', 'price', 'credentials', 'delivery_time', 'additional_info', 'account_balance'
            ],
            'sample_data': [
                'Sample Product', 'example.com', 'social', 'full_ownership',
                'Sample description', '10.00', '{"username":"sample_user","password":"sample_pass"}', 'instant_auto', 'Additional info', '100.00'
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


@api_view(['GET'])
@permission_classes([AllowAny])
def list_reviews(request, product_id):
    """List reviews for a product"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, is_deleted=False)
        reviews = ProductReview.objects.filter(product=product).select_related('user').order_by('-created_at')
        data = [
            {
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'images': r.images,
                'vendor_reply': r.vendor_reply,
                'vendor_reply_date': r.vendor_reply_date.isoformat() if r.vendor_reply_date else None,
                'conversation': r.conversation or [],
                'user': {
                    'id': r.user.id,
                    'username': getattr(r.user, 'username', ''),
                },
                'created_at': r.created_at.isoformat(),
            }
            for r in reviews
        ]
        return Response({
            'success': True,
            'message': 'Reviews retrieved successfully',
            'data': data,
        })
    except Exception as e:
        logger.error(f"Error listing reviews: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve reviews', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_review(request, product_id):
    """Create a review for a purchased product, then notify vendor in realtime"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, is_deleted=False)
        rating = int(request.data.get('rating', 0))
        comment = (request.data.get('comment') or '').strip()
        images = request.data.get('images') or []

        if rating < 1 or rating > 5:
            return Response({'success': False, 'message': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        if not comment:
            return Response({'success': False, 'message': 'Comment is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Optional: ensure the user bought this product
        from orders.models import Order
        # Use product_id explicitly to avoid any potential FK instance casting issues
        has_order = Order.objects.filter(
            buyer=request.user,
            product_id=product.id,
            order_status__in=['paid','delivered','confirmed']
        ).exists()
        if not has_order:
            return Response({'success': False, 'message': 'You can only review products you purchased'}, status=status.HTTP_403_FORBIDDEN)

        review, created = ProductReview.objects.update_or_create(
            product=product,
            user=request.user,
            defaults={'rating': rating, 'comment': comment, 'images': images}
        )

        # Update product aggregates
        try:
            agg = ProductReview.objects.filter(product=product).aggregate(
                avg=Avg('rating'),
                cnt=Count('id')
            )
            product.rating = (agg.get('avg') or 0) or 0
            product.review_count = agg.get('cnt') or 0
            product.save(update_fields=['rating', 'review_count'])
        except Exception:
            pass

        # Notify vendor (DB notification)
        try:
            Notification.objects.create(
                user=product.vendor,
                type='system',
                title='New product review',
                message=f"{getattr(request.user,'username','Buyer')} reviewed {product.headline}",
                data={'product_id': product.id, 'rating': rating}
            )
        except Exception as _:
            pass

        # Realtime notify vendor via channel layer
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'realtime_{product.vendor.id}',
                {
                    'type': 'new_review',
                    'data': {
                        'product_id': product.id,
                        'product_title': product.headline,
                        'rating': rating,
                        'comment': comment,
                        'buyer_username': getattr(request.user,'username','Buyer')
                    }
                }
            )
        except Exception as _:
            pass

        # Notify admin about review submission
        try:
            from shared.admin_notifications import notify_admin_review_submitted
            notify_admin_review_submitted(review, product)
        except Exception as _:
            pass

        return Response({'success': True, 'message': 'Review submitted', 'data': {'id': str(review.id)}})
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        return Response({'success': False, 'message': 'Failed to submit review', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsVendorOrAdmin])
def list_vendor_reviews(request):
    """List all reviews for the authenticated vendor's products"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))

        product_id = request.GET.get('product_id')
        search = (request.GET.get('search') or '').strip()
        min_rating = request.GET.get('min_rating')
        max_rating = request.GET.get('max_rating')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        ordering = request.GET.get('ordering', '-created_at')

        reviews_qs = ProductReview.objects.filter(product__vendor=request.user)
        if product_id:
            reviews_qs = reviews_qs.filter(product_id=product_id)
        if search:
            reviews_qs = reviews_qs.filter(
                Q(comment__icontains=search) |
                Q(product__headline__icontains=search) |
                Q(user__username__icontains=search)
            )
        if min_rating:
            reviews_qs = reviews_qs.filter(rating__gte=min_rating)
        if max_rating:
            reviews_qs = reviews_qs.filter(rating__lte=max_rating)
        if date_from:
            df = parse_date(date_from)
            if df:
                reviews_qs = reviews_qs.filter(created_at__date__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                reviews_qs = reviews_qs.filter(created_at__date__lte=dt)

        if ordering not in ['created_at', '-created_at', 'rating', '-rating']:
            ordering = '-created_at'
        reviews_qs = reviews_qs.select_related('user', 'product').order_by(ordering)

        total_count = reviews_qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        reviews = reviews_qs[start:end]

        data = [
            {
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'images': r.images,
                'vendor_reply': r.vendor_reply,
                'vendor_reply_date': r.vendor_reply_date.isoformat() if r.vendor_reply_date else None,
                'conversation': r.conversation or [],
                'product': {
                    'id': r.product.id,
                    'headline': r.product.headline,
                },
                'buyer': {
                    'id': r.user.id,
                    'username': getattr(r.user, 'username', ''),
                },
                'created_at': r.created_at.isoformat(),
            }
            for r in reviews
        ]

        return Response({
            'success': True,
            'message': 'Vendor product reviews retrieved successfully',
            'data': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
    except Exception as e:
        logger.error(f"Error listing vendor reviews: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve vendor reviews', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reply_to_review(request, review_id):
    """Vendor can reply to a review"""
    try:
        from django.utils import timezone
        
        # Get the review
        review = get_object_or_404(ProductReview, id=review_id)
        
        # Check if the current user is the vendor of the product
        if review.product.vendor != request.user:
            return Response({
                'success': False,
                'message': 'You can only reply to reviews for your own products'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get reply text from request
        reply_text = request.data.get('reply', '').strip()
        if not reply_text:
            return Response({
                'success': False,
                'message': 'Reply text is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update review with vendor reply
        review.vendor_reply = reply_text
        review.vendor_reply_date = timezone.now()
        
        # Add to conversation chain
        if not review.conversation:
            review.conversation = []
        
        is_chain_reply = len(review.conversation) > 0
        review.conversation.append({
            'author': 'vendor',
            'message': reply_text,
            'date': timezone.now().isoformat(),
        })
        review.save()
        
        # Create notification for the buyer (for both first reply and chain replies)
        notification_title = 'Vendor replied to your review response' if is_chain_reply else 'Vendor replied to your review'
        notification_message = f'Vendor replied to your review conversation for "{review.product.headline}"' if is_chain_reply else f'Vendor replied to your review for "{review.product.headline}"'
        
        Notification.objects.create(
            user=review.user,
            type='message',
            title=notification_title,
            message=notification_message,
            data={
                'review_id': str(review.id),
                'product_id': review.product.id,
                'product_headline': review.product.headline,
                'vendor_username': request.user.username,
                'is_chain_reply': is_chain_reply,
            }
        )
        
        return Response({
            'success': True,
            'message': 'Reply posted successfully',
            'data': {
                'id': str(review.id),
                'vendor_reply': review.vendor_reply,
                'vendor_reply_date': review.vendor_reply_date.isoformat(),
            }
        })
    except Exception as e:
        logger.error(f"Error replying to review: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to post reply',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buyer_reply_to_vendor(request, review_id):
    """Buyer can reply to vendor's reply on their review"""
    try:
        from django.utils import timezone
        
        # Get the review
        review = get_object_or_404(ProductReview, id=review_id)
        
        # Check if the current user is the buyer who wrote the review
        if review.user != request.user:
            return Response({
                'success': False,
                'message': 'You can only reply to your own reviews'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if vendor has replied
        if not review.vendor_reply:
            return Response({
                'success': False,
                'message': 'Vendor has not replied to this review yet'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get reply text from request
        reply_text = request.data.get('reply', '').strip()
        if not reply_text:
            return Response({
                'success': False,
                'message': 'Reply text is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Add to conversation chain
        if not review.conversation:
            review.conversation = []
        
        is_chain_reply = len(review.conversation) > 0
        review.conversation.append({
            'author': 'buyer',
            'message': reply_text,
            'date': timezone.now().isoformat(),
        })
        review.save()
        
        # Create notification for the vendor (for both first reply and chain replies)
        notification_title = 'Buyer replied to your review response' if is_chain_reply else 'Buyer replied to your review'
        notification_message = f'Buyer replied to your review conversation for "{review.product.headline}"' if is_chain_reply else f'Buyer replied to your response on review for "{review.product.headline}"'
        
        Notification.objects.create(
            user=review.product.vendor,
            type='message',
            title=notification_title,
            message=notification_message,
            data={
                'review_id': str(review.id),
                'product_id': review.product.id,
                'product_headline': review.product.headline,
                'buyer_username': request.user.username,
                'is_chain_reply': is_chain_reply,
            }
        )
        
        return Response({
            'success': True,
            'message': 'Reply posted successfully',
            'data': {
                'id': str(review.id),
                'conversation': review.conversation,
            }
        })
    except Exception as e:
        logger.error(f"Error posting buyer reply: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to post reply',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_buyer_reviews(request):
    """List all reviews written by the authenticated buyer"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))

        product_id = request.GET.get('product_id')
        search = (request.GET.get('search') or '').strip()
        min_rating = request.GET.get('min_rating')
        max_rating = request.GET.get('max_rating')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        ordering = request.GET.get('ordering', '-created_at')

        reviews_qs = ProductReview.objects.filter(user=request.user)
        if product_id:
            reviews_qs = reviews_qs.filter(product_id=product_id)
        if search:
            reviews_qs = reviews_qs.filter(
                Q(comment__icontains=search) |
                Q(product__headline__icontains=search)
            )
        if min_rating:
            reviews_qs = reviews_qs.filter(rating__gte=min_rating)
        if max_rating:
            reviews_qs = reviews_qs.filter(rating__lte=max_rating)
        if date_from:
            df = parse_date(date_from)
            if df:
                reviews_qs = reviews_qs.filter(created_at__date__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                reviews_qs = reviews_qs.filter(created_at__date__lte=dt)

        if ordering not in ['created_at', '-created_at', 'rating', '-rating']:
            ordering = '-created_at'
        reviews_qs = reviews_qs.select_related('product').order_by(ordering)

        total_count = reviews_qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        reviews = reviews_qs[start:end]

        data = [
            {
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'images': r.images,
                'vendor_reply': r.vendor_reply,
                'vendor_reply_date': r.vendor_reply_date.isoformat() if r.vendor_reply_date else None,
                'conversation': r.conversation or [],
                'product': {
                    'id': r.product.id,
                    'headline': r.product.headline,
                },
                'created_at': r.created_at.isoformat(),
            }
            for r in reviews
        ]

        return Response({
            'success': True,
            'message': 'Buyer reviews retrieved successfully',
            'data': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
    except Exception as e:
        logger.error(f"Error listing buyer reviews: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve buyer reviews', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsVendorOrAdmin])
def vendor_product_reviews_simple(request, product_id):
    """UI-friendly: list reviews for a specific vendor product by product_id.
    Ensures the product belongs to the authenticated vendor.
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        ordering = request.GET.get('ordering', '-created_at')

        product = get_object_or_404(Product, id=product_id, vendor=request.user)

        if ordering not in ['created_at', '-created_at', 'rating', '-rating']:
            ordering = '-created_at'

        qs = ProductReview.objects.filter(product=product).select_related('user').order_by(ordering)
        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        data = [
            {
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'images': r.images,
                'buyer': {
                    'id': r.user.id,
                    'username': getattr(r.user, 'username', ''),
                },
                'product': {
                    'id': product.id,
                    'headline': product.headline,
                },
                'created_at': r.created_at.isoformat(),
            }
            for r in items
        ]

        return Response({
            'success': True,
            'message': 'Product reviews retrieved successfully',
            'data': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
    except Exception as e:
        logger.error(f"Error in vendor_product_reviews_simple: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve product reviews', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_reviews_simple(request):
    """UI-friendly: list reviews created by the authenticated buyer."""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        ordering = request.GET.get('ordering', '-created_at')

        if ordering not in ['created_at', '-created_at', 'rating', '-rating']:
            ordering = '-created_at'

        qs = ProductReview.objects.filter(user=request.user).select_related('product').order_by(ordering)
        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        data = [
            {
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'images': r.images,
                'vendor_reply': r.vendor_reply,
                'vendor_reply_date': r.vendor_reply_date.isoformat() if r.vendor_reply_date else None,
                'conversation': r.conversation or [],
                'product': {
                    'id': r.product.id,
                    'headline': r.product.headline,
                },
                'created_at': r.created_at.isoformat(),
            }
            for r in items
        ]

        return Response({
            'success': True,
            'message': 'My reviews retrieved successfully',
            'data': data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
    except Exception as e:
        logger.error(f"Error in buyer_reviews_simple: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve my reviews', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def product_reviews_summary(request, product_id):
    """Get summary stats for a product's reviews (rating dist, avg, count)"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, is_deleted=False)
        qs = ProductReview.objects.filter(product=product)
        total = qs.count()
        avg = qs.aggregate(a=Avg('rating'))['a'] or 0
        # Distribution 1..5
        dist = {i: 0 for i in range(1, 6)}
        for row in qs.values('rating').annotate(c=Count('id')):
            dist[row['rating']] = row['c']
        return Response({
            'success': True,
            'message': 'Review summary retrieved',
            'data': {
                'product_id': product.id,
                'average_rating': avg,
                'review_count': total,
                'distribution': dist,
            }
        })
    except Exception as e:
        logger.error(f"Error getting product reviews summary: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve summary', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def products_reviews_summary_bulk(request):
    """Get review summaries for multiple product IDs in one call"""
    try:
        product_ids = request.data.get('product_ids', [])
        if not isinstance(product_ids, list) or not product_ids:
            return Response({'success': False, 'message': 'product_ids (list) is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Preload counts and averages
        qs = ProductReview.objects.filter(product_id__in=product_ids)
        counts = qs.values('product_id').annotate(c=Count('id'))
        avgs = qs.values('product_id').annotate(a=Avg('rating'))
        dists = qs.values('product_id', 'rating').annotate(c=Count('id'))

        count_map = {row['product_id']: row['c'] for row in counts}
        avg_map = {row['product_id']: row['a'] for row in avgs}
        dist_map = {pid: {i: 0 for i in range(1, 6)} for pid in product_ids}
        for row in dists:
            dist_map[row['product_id']][row['rating']] = row['c']

        result = []
        for pid in product_ids:
            result.append({
                'product_id': pid,
                'average_rating': avg_map.get(pid, 0) or 0,
                'review_count': count_map.get(pid, 0) or 0,
                'distribution': dist_map.get(pid, {i: 0 for i in range(1, 6)}),
            })

        return Response({'success': True, 'message': 'Bulk review summaries retrieved', 'data': result})
    except Exception as e:
        logger.error(f"Error getting bulk reviews summary: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve summaries', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_product_reviews(request, product_id):
    """Get reviews for a specific product for the product modal"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, is_deleted=False)
        
        # Get reviews with pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        
        reviews = ProductReview.objects.filter(product=product).order_by('-created_at')
        
        # Calculate pagination
        total_count = reviews.count()
        start = (page - 1) * page_size
        end = start + page_size
        paginated_reviews = reviews[start:end]
        
        # Format reviews data
        reviews_data = []
        for review in paginated_reviews:
            reviews_data.append({
                'id': review.id,
                'rating': review.rating,
                'comment': review.comment,
                'images': review.images or [],
                'vendor_reply': review.vendor_reply,
                'vendor_reply_date': review.vendor_reply_date.strftime('%Y-%m-%d %H:%M') if review.vendor_reply_date else None,
                'buyer_username': review.user.username if review.user else 'Anonymous',
                'created_at': review.created_at.strftime('%Y-%m-%d %H:%M'),
                'time_ago': _get_time_ago(review.created_at)
            })
        
        # Calculate product statistics
        product_stats = {
            'average_rating': product.rating or 0,
            'total_reviews': product.review_count or 0,
            'rating_distribution': _get_rating_distribution(product.id)
        }
        
        return Response({
            'success': True,
            'data': {
                'reviews': reviews_data,
                'product_stats': product_stats,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'has_next': end < total_count,
                    'has_previous': page > 1
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting product reviews: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch reviews',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _get_time_ago(created_at):
    """Helper function to format time ago"""
    from django.utils import timezone
    now = timezone.now()
    diff = now - created_at
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"


def _get_rating_distribution(product_id):
    """Helper function to get rating distribution for a product"""
    from django.db.models import Count
    distribution = ProductReview.objects.filter(product_id=product_id).values('rating').annotate(count=Count('id')).order_by('rating')
    dist_map = {i: 0 for i in range(1, 6)}
    for item in distribution:
        dist_map[item['rating']] = item['count']
    return dist_map
