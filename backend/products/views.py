from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
import hashlib
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework import status
from .models import Product, ProductCategory, ProductSubCategory, ProductView, ProductReview
from shared.models import Notification, UserWallet, WalletTransaction, Announcement
from django.db import transaction
from .serializers import ProductSerializer, ProductDetailSerializer, ProductCreateSerializer, ProductUpdateSerializer, ProductSubCategorySerializer, ProductCategorySerializer
from users.models import User
from orders.models import Order
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
import requests
import logging
import random

logger = logging.getLogger(__name__)
 
def smart_parse_price(price_str):
    """
    Intelligently parse price. 
    If price < 0.1 or contains 'btc', assume it's BTC and convert to USD.
    If contains 'xmr', convert using XMR rate (170).
    Using fixed rate of 100,000 USD/BTC as per application standard.
    """
    try:
        if not price_str:
            return "0"
        
        price_lower = str(price_str).lower()
        clean_price = price_lower.replace('btc', '').replace('xmr', '').replace('$', '').replace('usd', '').strip()
        d_price = Decimal(clean_price)
        
        # Determine conversion rate
        rate = Decimal('1')
        
        # Dynamic rate fetching
        if 'btc' in price_lower or 'xmr' in price_lower or (d_price < Decimal('0.1') and 'usd' not in price_lower):
            try:
                from payments.services import PaymentService
                service = PaymentService()
                
                if 'btc' in price_lower:
                    rate = service.get_fiat_to_crypto_rate('BTC')
                elif 'xmr' in price_lower:
                    rate = service.get_fiat_to_crypto_rate('XMR')
                elif d_price < Decimal('0.1'):
                    # Auto-detect BTC if very small (less than 10 cents USD) and no currency specified
                    rate = service.get_fiat_to_crypto_rate('BTC')
            except Exception as e:
                logger.warning(f"Failed to fetch dynamic rate in smart_parse_price: {e}")
                # Fallback only if service fails
                if 'btc' in price_lower:
                    rate = Decimal('98000')
                elif 'xmr' in price_lower:
                    rate = Decimal('165')
                elif d_price < Decimal('0.1'):
                    rate = Decimal('98000')

        d_price = d_price * rate
        # Return as string (DRF DecimalField will handle the decimals)
        return str(d_price)
    except Exception as e:
        return str(price_str)

class IsAdminUser(BasePermission):
    """Custom permission to only allow admin users"""
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check if user is active and NOT deleted
        if not request.user.is_active or getattr(request.user, 'is_deleted', False):
            return False
            
        # Check if user has admin user_type or is superuser/staff
        if (hasattr(request.user, 'user_type') and request.user.user_type == 'admin') or \
           request.user.is_superuser or \
           request.user.is_staff:
            return True
        
        return False

class IsVendorOrAdmin(BasePermission):
    """Custom permission to allow vendor and admin users"""
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check if user is active and NOT deleted
        if not request.user.is_active or getattr(request.user, 'is_deleted', False):
            return False
            
        # Check if user has vendor/admin user_type or is superuser/staff
        if (hasattr(request.user, 'user_type') and request.user.user_type in ['vendor', 'admin']) or \
           request.user.is_superuser or \
           request.user.is_staff:
            return True
            
        return False

@api_view(['GET'])
@permission_classes([AllowAny])
def list_products(request):
    """List all approved products with filtering and search"""
    try:
        from shared.utils.security import get_safe_int, get_safe_decimal, clean_error_response
        
        # Get query parameters with safe parsing to prevent SQLi/Error leaks
        search = request.GET.get('search', '')
        category = request.GET.get('category', '')
        account_type = request.GET.get('account_type', '')
        min_price = get_safe_decimal(request.GET.get('min_price'))
        max_price = get_safe_decimal(request.GET.get('max_price'))
        crypto = request.GET.get('crypto', '')
        sort_by = request.GET.get('sort_by', 'created_at')
        
        # Safe pagination params (max 100 per page to prevent DoS)
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
        
        # Start with approved and in-stock products
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False,
            vendor__is_active=True,
            vendor__is_deleted=False,
            quantity_available__gt=0
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
            
        if min_price is not None:
            products = products.filter(price__gte=min_price)
            
        if max_price is not None:
            products = products.filter(price__lte=max_price)
        
        if crypto:
            # Handle list field filtering for JSONField
            products = products.filter(accepted_crypto__contains=[crypto])
        
        # Apply ordering
        # Highlighted items first (ensure they are still within the highlight period), then based on sort_by
        from django.db.models import Case, When, Value, BooleanField
        now = timezone.now()
        
        # Determine for each product if it's currently highlighted
        products = products.annotate(
            is_currently_highlighted=Case(
                When(is_highlighted=True, highlighted_until__gt=now, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            )
        )
        
        order_fields = ['-is_currently_highlighted']
        
        if sort_by == 'price_low':
            order_fields.append('price')
        elif sort_by == 'price_high':
            order_fields.append('-price')
        elif sort_by == 'rating':
            order_fields.append('-rating')
        elif sort_by == 'views':
            order_fields.append('-views_count')
        else:  # created_at
            order_fields.append('-created_at')
            
        products = products.order_by(*order_fields)
        
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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_popular_searches(request):
    """Get popular search suggestions based on most viewed/searched products"""
    from shared.utils.security import get_safe_int
    limit = get_safe_int(request.GET.get('limit'), default=10, min_val=1, max_val=50)
    
    try:
        
        # Get products ordered by views_count, favorites_count, and created_at
        # This gives us the most popular products which are likely to be searched
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False,
            vendor__is_active=True,
            vendor__is_deleted=False,
            quantity_available__gt=0
        ).order_by('-views_count', '-favorites_count', '-created_at')[:limit * 2]
        
        # Extract unique search terms from popular products
        suggestions = []
        seen = set()
        
        for product in products:
            # Use headline as primary suggestion
            if product.headline:
                term = product.headline.strip()
                if term.lower() not in seen:
                    suggestions.append({
                        'term': term,
                        'count': product.views_count + product.favorites_count + 50, # Boost product names
                        'type': 'product',
                        'id': product.id
                    })
                    seen.add(term.lower())
            
            # Use website/domain as suggestion if available
            if product.website:
                domain = product.website.replace('https://', '').replace('http://', '').split('/')[0]
                if domain and domain.lower() not in seen and len(domain) > 3:
                    suggestions.append({
                        'term': domain,
                        'count': product.views_count + 20,
                        'type': 'website'
                    })
                    seen.add(domain.lower())
            
            # Handle tags (as list)
            tags = product.tags
            if isinstance(tags, str):
                try:
                    import json
                    tags = json.loads(tags)
                except:
                    tags = tags.split(',')
            
            if isinstance(tags, list):
                for tag in tags[:3]:  # Process up to 3 tags
                    tag_clean = str(tag).strip()
                    if tag_clean and tag_clean.lower() not in seen and len(tag_clean) > 2:
                        suggestions.append({
                            'term': tag_clean,
                            'count': product.views_count // 2 + 10,
                            'type': 'tag'
                        })
                        seen.add(tag_clean.lower())
            
            if len(suggestions) >= limit * 1.5:
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
def autocomplete_suggestions(request):
    """Dynamic autocomplete suggestions based on product titles, tags, and categories"""
    query = request.GET.get('q', '').strip()
    if not query or len(query) < 2:
        return Response({'success': True, 'data': []})
    
    from shared.utils.security import get_safe_int
    limit = get_safe_int(request.GET.get('limit'), default=10, min_val=1, max_val=20)
    
    try:
        # Search in Product titles (listing_title or headline)
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False,
            vendor__is_active=True,
            vendor__is_deleted=False,
            quantity_available__gt=0
        ).filter(
            Q(listing_title__icontains=query) | 
            Q(headline__icontains=query) |
            Q(tags__icontains=query)
        ).values('listing_title', 'headline', 'id', 'views_count').distinct()[:limit]
        
        suggestions = []
        seen = set()
        
        for p in products:
            term = p['listing_title'] or p['headline']
            if term and term.lower() not in seen:
                suggestions.append({
                    'term': term,
                    'type': 'product',
                    'id': p['id'],
                    'count': p['views_count']
                })
                seen.add(term.lower())
                
        if len(suggestions) < limit:
            # Also search categories for variety
            categories = ProductCategory.objects.filter(
                is_active=True, 
                is_deleted=False
            ).filter(
                Q(name__icontains=query) | Q(slug__icontains=query)
            ).values('name', 'slug')[:5]
            
            for c in categories:
                term = c['name']
                if term.lower() not in seen:
                    suggestions.append({
                        'term': term,
                        'type': 'category',
                        'slug': c['slug'],
                        'count': 0
                    })
                    seen.add(term.lower())
                
        return Response({
            'success': True,
            'data': suggestions[:limit]
        })
    except Exception as e:
        logger.error(f"Error in autocomplete_suggestions: {str(e)}")
        return Response({'success': False, 'data': [], 'error': str(e)}, status=500)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve product details'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to track product view'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_products(request):
    """Get products for the authenticated vendor"""
    try:
        from shared.utils.security import get_safe_int, clean_error_response
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
        
        products = Product.objects.filter(
            vendor=request.user,
            is_deleted=False,
        ).select_related('category', 'sub_category').order_by('-created_at')
        
        # Pagination
        total_count = products.count()
        start = (page - 1) * page_size
        end = start + page_size
        products = products[start:end]
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        
        # Debug logging for image URLs
        if len(serializer.data) > 0:
            logger.info(f"Debug Vendor Products Image: {serializer.data[0].get('main_image')}")
            print(f"DEBUG_IMAGE_URL: {serializer.data[0].get('main_image')}")
        
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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve vendor products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_vendor_public_products(request, vendor_username):
    """Get public products for a specific vendor by username"""
    print(f"get_vendor_public_products called with vendor_username: {vendor_username}")
    try:
        from shared.utils.security import get_safe_int, clean_error_response
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
        
        # Get products by vendor username - Approved and in-stock only
        products = Product.objects.filter(
            vendor__username=vendor_username,
            status='approved',
            is_active=True,
            is_deleted=False,
            vendor__is_active=True,
            vendor__is_deleted=False,
            quantity_available__gt=0
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
        from shared.utils.security import get_safe_int
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
        
        products = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False,
            vendor__is_active=True,
            vendor__is_deleted=False,
            quantity_available__gt=0
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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve buyer products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
    """Create a new product - with non-escrow block check"""
    """Create a new product"""
    try:
        # Prepare incoming data and allow admins to create listings for a specified vendor
        # Use a shallow copy logic that handles QueryDict (standard for multipart/form-data)
        # to avoid wrapping everything in lists as dict(request.data) does.
        if hasattr(request.data, 'dict'):
            data = request.data.dict() # Shallow copy for QueryDict
        else:
            data = request.data.copy() # Standard dict copy (shallow for DRF data dicts)
            
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
        
        # Check if vendor is blocked from creating non-escrow listings
        vendor_id = data.get('vendor') or request.user.id
        try:
            from users.models import User
            vendor_user = User.objects.get(id=vendor_id)
            
            # Handle escrow_enabled as boolean (it might be a string "true"/"false" from FormData)
            escrow_enabled = data.get('escrow_enabled', False)
            if isinstance(escrow_enabled, str):
                escrow_enabled = escrow_enabled.lower() == 'true'
            
            if vendor_user.non_escrow_blocked and not escrow_enabled:
                logger.warning(f"Vendor {vendor_user.username} is blocked from non-escrow listings")
                return Response({
                    'success': False,
                    'message': 'This vendor is blocked from creating non-escrow listings. Please enable escrow for this product.',
                    'error_code': 'NON_ESCROW_BLOCKED'
                }, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            pass  # Will be caught by serializer validation
        

        # Prepare clean data for the serializer
        import json
        serializer_data = {}
        
        # Process regular fields from request.data
        for key in data.keys():
            if key in ['accepted_crypto', 'tags', 'special_features']:
                val = data.get(key)
                if isinstance(val, str) and val.strip():
                    try:
                        serializer_data[key] = json.loads(val)
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse JSON for {key}: {val}")
                        serializer_data[key] = []
                else:
                    serializer_data[key] = val or []
            elif key == 'escrow_enabled':
                val = data.get(key)
                serializer_data[key] = str(val).lower() == 'true'
            else:
                serializer_data[key] = data.get(key)
        
        # Add files to serializer data
        for key in request.FILES:
            if key not in ['gallery_images', 'documents']:
                serializer_data[key] = request.FILES.get(key)
        
        # Debug logging
        logger.info(f"Serializer Data keys: {list(serializer_data.keys())}")
        logger.info(f"Accepted Crypto value: {serializer_data.get('accepted_crypto')} (type: {type(serializer_data.get('accepted_crypto'))})")
        
        # Selective Address Check logic - Only check for coins being accepted
        try:
            accepted_cryptos = serializer_data.get('accepted_crypto', [])
            if not isinstance(accepted_cryptos, list):
                accepted_cryptos = [str(accepted_cryptos)]
            
            # Normalize to uppercase
            accepted_cryptos = [str(c).upper() for c in accepted_cryptos]
            
            if 'vendor_user' not in locals():
                vendor_user = User.objects.get(id=vendor_id)
            
            if getattr(vendor_user, 'user_type', None) == 'vendor':
                missing = []
                if 'BTC' in accepted_cryptos and not vendor_user.btc_payout_address:
                    missing.append("Bitcoin (BTC)")
                if 'XMR' in accepted_cryptos and not vendor_user.xmr_payout_address:
                    missing.append("Monero (XMR)")
                
                if missing:
                    logger.warning(f"Vendor {vendor_user.username} missing payout addresses for accepted coins: {missing}")
                    return Response({
                        'success': False,
                        'message': f'You are accepting {", ".join(missing)} for this listing, but you haven\'t configured the payout address in your settings.',
                        'error_code': 'MISSING_PAYOUT_ADDRESSES'
                    }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error checking selective wallet addresses: {e}")
        
        serializer = ProductCreateSerializer(data=serializer_data, context={"request": request})
        if serializer.is_valid():
            product = serializer.save()
            
            # Notify admin about new product - Only if vendor created it
            if getattr(request.user, 'user_type', None) != 'admin':
                try:
                    from shared.admin_notifications import notify_admin_product_created
                    notify_admin_product_created(product)
                except Exception as e:
                    logger.error(f"Failed to notify admin about product: {e}")
            
            # Notify the vendor (ONLY if an admin created it for them)
            vendor_user = getattr(product, 'vendor', None)
            if vendor_user and vendor_user != request.user and getattr(request.user, 'user_type', None) == 'admin':
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=vendor_user,
                    notification_type='listing_approval',
                    title='New product listing created',
                    message=f'An admin created a new listing "{product.headline}" for your vendor account. Please review your listing.',
                    data={
                        'product_id': str(product.id),
                        'action_url': '/vendor/listings'
                    }
                )

            # Create a confirmation notification for the creator
            from shared.admin_notifications import send_user_notification
            is_admin = getattr(request.user, 'user_type', None) == 'admin'
            send_user_notification(
                user=request.user,
                notification_type='system',
                title='Product created',
                message=f'You created the product "{product.headline}" successfully.',
                data={
                    'product_id': str(product.id),
                    'action_url': '/admin/listings' if is_admin else '/vendor/listings'
                },
                priority='low'
            )
            
            return Response({
                'success': True,
                'message': 'Product created successfully',
                'data': ProductSerializer(product, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Serializer validation failed for product creation: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Failed to create product',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to create product'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_products(request):
    """Get all products for admin"""
    try:
        from shared.utils.security import get_safe_int, clean_error_response
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
        
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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to approve product'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to reject product'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to resubmit product'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve categories'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to update category'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to delete category'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve subcategories'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                    'price': smart_parse_price(row.get('price') or '0'),
                    'additional_info': (row.get('additional_info') or '').strip(),
                    'delivery_time': (row.get('delivery_time') or 'instant_auto').strip(),
                    'credentials': credentials,
                    'account_balance': account_balance,
                    'vendor': request.user.id,
                }
                
                # Set default category
                from .models import ProductCategory
                default_category = ProductCategory.objects.filter(is_active=True, is_deleted=False).first()
                if default_category:
                    product_data['category'] = default_category.id
                
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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to process bulk upload'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to export products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_listings(request):
    """Get products for buyer with sophisticated rotating sorting (like Fiverr)"""
    try:
        from shared.utils.security import get_safe_int, get_safe_decimal, clean_error_response
        
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=50, min_val=1, max_val=100)
        search = request.GET.get('search', '')
        crypto = request.GET.get('crypto', '')
        min_price = get_safe_decimal(request.GET.get('min_price'))
        max_price = get_safe_decimal(request.GET.get('max_price'))
        category = request.GET.get('category', '')
        
        from django.db.models import Case, When, Value, BooleanField, Q, Count, Sum, Avg
        
        # Base queryset - approved and in-stock only
        now = timezone.now()
        products_qs = Product.objects.filter(
            status='approved',
            is_active=True,
            is_deleted=False,
            vendor__is_active=True,
            vendor__is_deleted=False,
            quantity_available__gt=0
        ).annotate(
            is_currently_highlighted=Case(
                When(is_highlighted=True, highlighted_until__gt=now, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            )
        ).select_related('vendor', 'category', 'sub_category')

        # Apply search filter
        if search:
            products_qs = products_qs.filter(
                Q(listing_title__icontains=search) |
                Q(description__icontains=search) |
                Q(headline__icontains=search) |
                Q(tags__icontains=search)
            )

        # Apply crypto filter
        if crypto:
            # More robust check for JSONField list
            products_qs = products_qs.filter(accepted_crypto__icontains=crypto)

        # Apply price filters
        if min_price:
            products_qs = products_qs.filter(price__gte=Decimal(min_price))
        if max_price:
            products_qs = products_qs.filter(price__lte=Decimal(max_price))

        # Apply category filter
        if category:
            products_qs = products_qs.filter(
                Q(category__name__icontains=category) | 
                Q(category__slug__icontains=category)
            )

        featured_only = str(request.GET.get('featured_only', '')).lower() in ('1', 'true', 'yes')
        if featured_only:
            products_qs = products_qs.filter(is_highlighted=True, highlighted_until__gt=now)

        premium_listings = str(request.GET.get('premium_listings', '')).lower() in ('1', 'true', 'yes')
        if premium_listings:
            products_qs = products_qs.filter(
                Q(verification_level__in=['premium', 'verified']) | Q(rating__gte=Decimal('4'))
            )

        # Get unique vendor IDs efficiently
        vendor_ids = products_qs.values_list('vendor_id', flat=True).distinct()
        
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
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    return (-int(is_hlt), -float(stats.get('avg_rating', 0)), -stats.get('completed_orders', 0))
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'newest_vendors':
                # Sort by newest vendors first
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    is_new = stats.get('is_new_vendor', False)
                    days = stats.get('days_as_vendor', 999999)
                    return (-int(is_hlt), not is_new, days)  # New vendors first, then by days
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'top_sellers':
                # Sort by vendors with most completed orders
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    return (-int(is_hlt), -stats.get('completed_orders', 0))
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'recent_listings':
                # Sort by newly uploaded products (created_at)
                def _sort_key(p):
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    return (-int(is_hlt), -(p.created_at.timestamp() if p.created_at else 0))
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'most_views':
                # Sort by products with most views, with vendor diversity
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    # Combine product views with vendor diversity
                    vendor_hash = (abs(hash(str(p.vendor_id))) * 7919) % 1000  # For diversity
                    return (-int(is_hlt), -(p.views_count or 0), -stats.get('total_views', 0), vendor_hash)
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'best_value':
                # Sort by best price/rating ratio
                def _sort_key(p):
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    try:
                        price = float(p.price)
                        stats = vendor_stats.get(p.vendor_id, {})
                        rating = stats.get('avg_rating', 0) or 1
                        # Lower price and higher rating = better value
                        value_score = -price / max(rating, 0.1)
                        return (-int(is_hlt), value_score, -stats.get('completed_orders', 0))
                    except:
                        return (-int(is_hlt), 0, 0)
                products_list.sort(key=_sort_key)
                
            elif selected_strategy == 'mixed_rotation':
                # Mix multiple criteria with rotation: weight different factors
                def _sort_key(p):
                    stats = vendor_stats.get(p.vendor_id, {})
                    vendor_hash = (abs(hash(str(p.vendor_id))) * 7919) % 1000
                    is_hlt = getattr(p, 'is_currently_highlighted', False)
                    
                    # Weighted score: rating (40%) + orders (30%) + views (20%) + diversity (10%)
                    rating_score = (stats.get('avg_rating', 0) or 0) * 4
                    order_score = (stats.get('completed_orders', 0) / 100.0) * 3
                    view_score = ((p.views_count or 0) / 1000.0) * 2
                    diversity_score = (vendor_hash / 1000.0) * 1
                    
                    total_score = rating_score + order_score + view_score + diversity_score
                    return (-int(is_hlt), -total_score)
                products_list.sort(key=_sort_key)

        elif sort_mode == 'newest':
            products_list.sort(key=lambda p: (-int(getattr(p, 'is_currently_highlighted', False)), -(p.created_at.timestamp() if p.created_at else 0)))

        elif sort_mode == 'oldest':
            products_list.sort(key=lambda p: (-int(getattr(p, 'is_currently_highlighted', False)), p.created_at.timestamp() if p.created_at else 0))

        elif sort_mode == 'rating':
            def _sort_key(p):
                stats = vendor_stats.get(p.vendor_id, {})
                return (-int(getattr(p, 'is_currently_highlighted', False)), -stats.get('avg_rating', 0))
            products_list.sort(key=_sort_key)

        elif sort_mode == 'views':
            products_list.sort(key=lambda p: (-int(getattr(p, 'is_currently_highlighted', False)), -(p.views_count or 0)))

        elif sort_mode == 'random':
            import random
            random.shuffle(products_list)
            # still keep highlighted at top
            products_list.sort(key=lambda p: -int(getattr(p, 'is_currently_highlighted', False)))

        elif sort_mode == 'price-low':
            products_list.sort(key=lambda p: (-int(getattr(p, 'is_currently_highlighted', False)), float(p.price)))

        elif sort_mode == 'price-high':
            products_list.sort(key=lambda p: (-int(getattr(p, 'is_currently_highlighted', False)), -float(p.price)))

        elif sort_mode == 'popular':
            products_list.sort(key=lambda p: (-int(getattr(p, 'is_currently_highlighted', False)), -(p.review_count or 0)))

        elif sort_mode == 'best_sellers':
            def _sort_key_bs(p):
                stats = vendor_stats.get(p.vendor_id, {})
                is_hlt = getattr(p, 'is_currently_highlighted', False)
                return (
                    -int(is_hlt),
                    -stats.get('completed_orders', 0),
                    -float(stats.get('avg_rating', 0) or 0),
                    -(p.review_count or 0),
                )
            products_list.sort(key=_sort_key_bs)

        elif sort_mode == 'hot':
            def _sort_key_hot(p):
                stats = vendor_stats.get(p.vendor_id, {})
                is_hlt = getattr(p, 'is_currently_highlighted', False)
                hot_score = (
                    (p.review_count or 0) * 2
                    + (p.views_count or 0) / 40.0
                    + float(stats.get('completed_orders', 0) or 0) * 1.5
                )
                return (-int(is_hlt), -hot_score)
            products_list.sort(key=_sort_key_hot)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve buyer products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_active_highlights(request):
    """
    All marketplace listings that are in an active highlight window (any seller).
    One row per vendor if duplicates exist. Order: vendor merit (sales, rating,
    views) with an inclusion boost so smaller sellers still appear toward the top.
    """
    try:
        import math

        now = timezone.now()
        qs = (
            Product.objects.filter(
                is_highlighted=True,
                highlighted_until__gt=now,
                status='approved',
                is_active=True,
                is_deleted=False,
                quantity_available__gt=0,
                vendor__is_active=True,
                vendor__is_deleted=False,
            )
            .select_related('vendor', 'category', 'sub_category')
            .order_by('vendor_id', '-highlighted_until', '-id')
        )

        rows = list(qs)
        unique_list = rows # Allow all highlighted products
        vendor_ids = list({p.vendor_id for p in unique_list})

        orders_by_vendor = Order.objects.filter(
            vendor_id__in=vendor_ids,
            order_status__in=['delivered', 'confirmed', 'paid'],
        ).values('vendor_id').annotate(
            completed_orders=Count('id'),
            total_sales=Sum('total_amount'),
        )
        orders_dict = {item['vendor_id']: item for item in orders_by_vendor}

        products_by_vendor = Product.objects.filter(
            vendor_id__in=vendor_ids,
            status='approved',
        ).values('vendor_id').annotate(
            avg_rating=Avg('rating'),
            total_views=Sum('views_count'),
        )
        products_dict = {item['vendor_id']: item for item in products_by_vendor}

        vendor_stats = {}
        for vid in vendor_ids:
            o_row = orders_dict.get(vid, {})
            p_row = products_dict.get(vid, {})
            vendor_stats[vid] = {
                'completed_orders': o_row.get('completed_orders', 0) or 0,
                'total_sales': float(o_row.get('total_sales') or 0),
                'avg_rating': float(p_row.get('avg_rating') or 0),
                'total_views': p_row.get('total_views') or 0,
            }

        def highlight_merit_score(vid):
            s = vendor_stats.get(vid, {})
            o = int(s.get('completed_orders', 0) or 0)
            r = float(s.get('avg_rating', 0) or 0)
            v = int(s.get('total_views', 0) or 0)
            sales = float(s.get('total_sales', 0) or 0)
            merit = (
                4.0 * math.log1p(o)
                + 3.0 * r
                + 1.5 * math.log1p(max(v, 0) / 25.0)
                + 1.2 * math.log1p(max(sales, 0) / 150.0)
            )
            inclusion = 7.0 / (1.0 + math.log1p(o))
            return merit + inclusion

        unique_list.sort(
            key=lambda p: (
                -highlight_merit_score(p.vendor_id),
                -float(p.rating or 0),
                -(p.review_count or 0),
                -p.id,
            )
        )

        serializer = ProductSerializer(unique_list, many=True, context={'request': request})

        return Response({
            'success': True,
            'message': 'Active highlighted listings',
            'data': serializer.data,
            'meta': {
                'count': len(unique_list),
                'unique_vendors': len(vendor_ids),
                'ordering': 'vendor_merit_with_inclusion',
            },
        })
    except Exception as e:
        from shared.utils.security import clean_error_response
        logger.error('buyer_active_highlights failed: %s', str(e))
        return Response(clean_error_response(e, 'Failed to load highlights'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_products(request):
    """Get products for the authenticated vendor"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        products = Product.objects.filter(
            vendor=request.user,
            is_deleted=False,
            quantity_available__gt=0
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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to retrieve vendor products'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_active_highlights(request):
    """Get only currently-active highlighted products for authenticated vendor."""
    try:
        now = timezone.now()
        products = (
            Product.objects.filter(
                vendor=request.user,
                is_deleted=False,
                is_highlighted=True,
                highlighted_until__gt=now,
            )
            .select_related('category', 'sub_category')
            .order_by('-highlighted_until', '-id')
        )
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(
            {
                'success': True,
                'message': 'Vendor active highlights retrieved successfully',
                'data': serializer.data,
                'meta': {'count': products.count()},
            }
        )
    except Exception as e:
        from shared.utils.security import clean_error_response

        return Response(
            clean_error_response(e, 'Failed to retrieve active highlights'),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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
        
        # Check if updating accepted_crypto and validate wallet addresses
        data = request.data
        if 'accepted_crypto' in data:
            try:
                # accepted_crypto might be a list or a string
                accepted_crypto = data.get('accepted_crypto')
                if isinstance(accepted_crypto, str):
                    import json
                    try:
                        accepted_crypto = json.loads(accepted_crypto)
                    except:
                        pass
                
                if isinstance(accepted_crypto, list):
                     # Use the product's vendor
                     vendor_user = product.vendor
                     
                     if 'BTC' in accepted_crypto and not vendor_user.btc_payout_address:
                        return Response({
                            'success': False,
                            'message': 'You must set your Bitcoin wallet address in settings before listing a product that accepts Bitcoin.',
                            'error_code': 'MISSING_BTC_WALLET'
                        }, status=status.HTTP_400_BAD_REQUEST)
                        
                     if 'XMR' in accepted_crypto and not vendor_user.xmr_payout_address:
                        return Response({
                            'success': False,
                            'message': 'You must set your Monero wallet address in settings before listing a product that accepts Monero.',
                            'error_code': 'MISSING_XMR_WALLET'
                        }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error checking wallet addresses in update: {e}")

        serializer = ProductUpdateSerializer(product, data=request.data, partial=True)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to update product'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        from shared.utils.security import clean_error_response
        return Response(clean_error_response(e, 'Failed to delete product'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_products(request):
    """Bulk delete products (soft delete)"""
    try:
        product_ids = request.data.get('product_ids', [])
        if not product_ids:
            return Response({
                'success': False,
                'message': 'No product IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine if user is admin
        is_admin = hasattr(request.user, 'user_type') and request.user.user_type == 'admin'
        
        if is_admin:
            products = Product.objects.filter(id__in=product_ids, vendor=request.user)
        else:
            products = Product.objects.filter(id__in=product_ids, vendor=request.user)
        
        count = products.count()
        products.update(is_deleted=True)
        
        return Response({
            'success': True,
            'message': f'Successfully deleted {count} products',
            'count': count
        })
    except Exception as e:
        logger.error(f"Error bulk deleting products: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to bulk delete products',
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
                
                # Robustly get values from row
                def get_val(row, *keys):
                    for k in keys:
                        # Direct match
                        if k in row: return (row[k] or '').strip()
                        # Normalize key for comparison
                        nk = k.lower().replace('_', '').replace(' ', '')
                        for rk in row.keys():
                            nrk = str(rk).lower().replace('\ufeff', '').replace('_', '').replace(' ', '')
                            if nrk == nk:
                                return (row[rk] or '').strip()
                    return ''

                headline = get_val(row, 'headline', 'title', 'listing_title')
                website = get_val(row, 'website', 'domain')
                account_type = get_val(row, 'account_type', 'type')
                access_type = get_val(row, 'access_type', 'access')
                description = get_val(row, 'description', 'desc')
                price_val = get_val(row, 'price', 'cost')
                additional_info = get_val(row, 'additional_info', 'extra_info')
                delivery_time = get_val(row, 'delivery_time', 'delivery')
                credentials = get_val(row, 'credentials', 'creds', 'login')
                account_balance = get_val(row, 'account_balance', 'balance')
                
                # Handle credentials field - replace \n with actual newlines
                if credentials:
                    credentials = credentials.replace('\\n', '\n')
                
                # Quantity available
                qty_val = get_val(row, 'account_quantity', 'quantity', 'quantity_available')
                try:
                    quantity_available = int(qty_val) if qty_val else 1
                except ValueError:
                    quantity_available = 1

                # Escrow enabled
                escrow_val = get_val(row, 'escrow_enabled', 'escrow').lower()
                escrow_enabled = escrow_val in ['true', '1', 'yes', 'on']

                # Validation: if vendor is blocked from non-escrow listings
                if request.user.non_escrow_blocked and not escrow_enabled:
                    errors.append(f"Row {row_num}: You can only upload escrow accounts. Please enable escrow for this product.")
                    continue

                # Default delivery_time if empty
                if not delivery_time:
                    delivery_time = 'instant_auto'

                # Delivery method (manual vs auto)
                # User wants 'auto' to require credentials, 'manual' to be optional
                delivery_method = get_val(row, 'delivery_method', 'method').lower()
                if not delivery_method:
                    delivery_method = 'auto'
                
                if delivery_method == 'auto' and not credentials:
                    errors.append(f"Row {row_num}: Credentials are required for auto delivery accounts.")
                    continue

                # Map to product fields
                product_data = {
                    'headline': headline,
                    'website': website,
                    'account_type': account_type or 'other',
                    'access_type': access_type or 'full_ownership',
                    'description': description,
                    'price': smart_parse_price(price_val or '0'),
                    'additional_info': additional_info,
                    'delivery_time': delivery_time,
                    'delivery_method': delivery_method,
                    'credentials': credentials,
                    'account_balance': account_balance,
                    'quantity_available': quantity_available,
                    'escrow_enabled': escrow_enabled,
                    'vendor': request.user.id,
                    'accepted_crypto': ['BTC', 'XMR']
                }
                
                # Set default category
                from .models import ProductCategory
                default_category = ProductCategory.objects.filter(is_active=True, is_deleted=False).first()
                if default_category:
                    product_data['category'] = default_category.id
                
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
        elif 'data' in request.data:
            # Handle JSON with data field (common frontend name)
            text_data = request.data['data']
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
                    product_data['category'] = default_category.id
                else:
                    errors.append("No active category found")
                    continue
                
                # Delivery method and credential validation
                delivery_method = product_data.get('delivery_method', 'auto').lower()
                if delivery_method == 'auto' and not product_data.get('credentials', '').strip():
                    errors.append(f"Product '{product_data.get('headline')}': Credentials are required for auto delivery.")
                    continue
                
                # Ensure credentials field has a placeholder if manual and empty
                if delivery_method == 'manual' and not product_data.get('credentials', '').strip():
                    product_data['credentials'] = '' # Backend allows empty for manual
                elif not product_data.get('credentials', '').strip():
                    product_data['credentials'] = 'Credentials will be provided after purchase'
                
                # Add vendor ID to product data
                product_data['vendor'] = request.user.id
                
                # Handle escrow block
                escrow_enabled = product_data.get('escrow_enabled', False)
                if isinstance(escrow_enabled, str):
                    escrow_enabled = escrow_enabled.lower() in ['true', '1', 'yes', 'on']
                
                if request.user.non_escrow_blocked and not escrow_enabled:
                    errors.append(f"Product '{product_data.get('headline')}': You can only upload escrow accounts. Please enable escrow for this product.")
                    continue

                # Default accepted crypto
                product_data['accepted_crypto'] = ['BTC', 'XMR']
                
                # Create serializer with request context for vendor validation
                serializer = ProductCreateSerializer(data=product_data, context={'request': request})
                if serializer.is_valid():
                    serializer.save()
                    products_created += 1
                else:
                    errors.append(f"Product '{product_data.get('headline')}': validation failed: {serializer.errors}")
                    
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
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Skip header lines and comments
        if (line.startswith('#') or line.startswith('##') or 
            line.startswith('Format:') or line.startswith('Account Name |') or 
            line.startswith('Product Name |') or line.startswith('Headline |')):
            continue
            
        # Also skip if it seems to be exactly the header provided in instructions
        if 'Account Name | Website | Account Type | Price | Description' in line:
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
                
                # Handle optional fields: quantity, escrow, delivery_method
                quantity = 1
                if len(parts) > 6 and parts[6].strip().isdigit():
                    quantity = int(parts[6].strip())
                
                escrow = False
                if len(parts) > 7:
                    escrow = parts[7].strip().lower() in ['true', '1', 'yes', 'on']
                
                method = 'auto'
                if len(parts) > 8:
                    method = parts[8].strip().lower()
                    if method not in ['auto', 'manual']:
                        method = 'auto'

                balance = ''
                if len(parts) > 9:
                    balance = parts[9].strip()

                product = {
                    'headline': parts[0],
                    'website': parts[1],
                    'account_type': parts[2],
                    'price': smart_parse_price(parts[3]),
                    'description': parts[4],
                    'credentials': credentials,
                    'quantity_available': quantity,
                    'escrow_enabled': escrow,
                    'delivery_method': method,
                    'access_type': 'full_ownership',
                    'delivery_time': 'instant_auto' if method == 'auto' else 'manual_24h',
                    'additional_info': '',
                    'account_balance': balance
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
                
                # Handle optional fields: quantity, escrow, delivery_method
                quantity = 1
                if len(parts) > 6 and parts[6].strip().isdigit():
                    quantity = int(parts[6].strip())
                
                escrow = False
                if len(parts) > 7:
                    escrow = parts[7].strip().lower() in ['true', '1', 'yes', 'on']

                method = 'auto'
                if len(parts) > 8:
                    method = parts[8].strip().lower()
                    if method not in ['auto', 'manual']:
                        method = 'auto'

                balance = ''
                if len(parts) > 9:
                    balance = parts[9].strip()

                product = {
                    'headline': parts[0],
                    'website': parts[1],
                    'account_type': parts[2],
                    'price': smart_parse_price(parts[3]),
                    'description': parts[4],
                    'credentials': credentials,
                    'quantity_available': quantity,
                    'escrow_enabled': escrow,
                    'delivery_method': method,
                    'access_type': 'full_ownership',
                    'delivery_time': 'instant_auto' if method == 'auto' else 'manual_24h',
                    'additional_info': '',
                    'account_balance': balance
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
                'description', 'price', 'credentials', 'delivery_method', 'delivery_time', 'account_quantity', 'escrow_enabled', 'additional_info', 'account_balance'
            ],
            'sample_data': [
                'Sample Product', 'example.com', 'social', 'full_ownership',
                'Sample description', '10.00', '{"username":"sample_user","password":"sample_pass"}', 'auto', 'instant_auto', '5', 'true', 'Additional info', '100.00'
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


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_promotion_highlights_list(request):
    """List products with seller highlight flag (live window or stuck) for admin moderation."""
    try:
        now = timezone.now()
        qs = (
            Product.objects.filter(is_highlighted=True, is_deleted=False)
            .select_related('vendor', 'category')
            .order_by('-highlighted_until', '-id')
        )
        serializer = ProductSerializer(qs, many=True, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data,
            'meta': {'server_time': now.isoformat()},
        })
    except Exception as e:
        logger.error('admin_promotion_highlights_list: %s', str(e))
        return Response({
            'success': False,
            'message': 'Failed to load promotion highlights',
            'errors': str(e),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_end_product_highlight(request, product_id):
    """Force-remove featured highlight from any listing (misuse / policy)."""
    try:
        product = get_object_or_404(Product, id=product_id)
        product.is_highlighted = False
        product.highlighted_until = None
        product.save(update_fields=['is_highlighted', 'highlighted_until', 'updated_at'])
        return Response({
            'success': True,
            'message': 'Featured highlight ended by admin.',
            'data': ProductSerializer(product, context={'request': request}).data,
        })
    except Exception as e:
        logger.error('admin_end_product_highlight: %s', str(e))
        return Response({
            'success': False,
            'message': str(e),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_extend_product_highlight(request, product_id):
    """Extend featured highlight duration by specific hours (12, 24, 48, etc)."""
    try:
        product = get_object_or_404(Product, id=product_id)
        hours = int(request.data.get('hours', 12))
        
        # If not already highlighted, start from now
        base_time = product.highlighted_until if (product.is_highlighted and product.highlighted_until and product.highlighted_until > timezone.now()) else timezone.now()
        
        product.is_highlighted = True
        product.highlighted_until = base_time + timezone.timedelta(hours=hours)
        product.save(update_fields=['is_highlighted', 'highlighted_until', 'updated_at'])
        
        return Response({
            'success': True,
            'message': f'Highlight extended by {hours} hours.',
            'data': ProductSerializer(product, context={'request': request}).data,
        })
    except Exception as e:
        logger.error('admin_extend_product_highlight: %s', str(e))
        return Response({
            'success': False,
            'message': str(e),
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
        # First check if user has an order for this product (including giveaway orders)
        from orders.models import Order
        user_order = Order.objects.filter(
            buyer=request.user,
            product_id=product_id,  # Use product_id for FK matching even if product is deleted
            order_status__in=['paid', 'delivered', 'confirmed', 'completed']
        ).first()
        
        if not user_order:
            return Response({'success': False, 'message': 'You can only review products you purchased'}, status=status.HTTP_403_FORBIDDEN)
        
        # If user has order, allow review even if product is inactive/deleted (for giveaway products)
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({
                'success': False, 
                'message': 'Product not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        rating = int(request.data.get('rating', 0))
        comment = (request.data.get('comment') or '').strip()
        
        # Handle Image Uploads to Cloudinary
        image_urls = []
        if 'review_images' in request.FILES:
            from django.core.files.storage import default_storage
            import uuid
            files = request.FILES.getlist('review_images')
            for f in files[:3]: # Limit to 3 images per review
                # Generate unique filename for Cloudinary
                ext = f.name.split('.')[-1]
                filename = f"reviews/{uuid.uuid4()}.{ext}"
                # default_storage is configured for Cloudinary in settings.py
                file_path = default_storage.save(filename, f)
                # Get the full public URL from Cloudinary
                url = default_storage.url(file_path)
                image_urls.append(url)
        elif request.data.get('images'):
            # Fallback for existing data/JSON requests
            image_urls = request.data.get('images')

        if rating < 1 or rating > 5:
            return Response({'success': False, 'message': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        if not comment:
            return Response({'success': False, 'message': 'Comment is required'}, status=status.HTTP_400_BAD_REQUEST)

        review, created = ProductReview.objects.update_or_create(
            product=product,
            user=request.user,
            defaults={'rating': rating, 'comment': comment, 'images': image_urls}
        )

        # Update product aggregates (only if product is still active)
        if product.is_active and not product.is_deleted:
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

        # Notify vendor
        try:
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=product.vendor,
                notification_type='review',
                title='New product review',
                message=f"{getattr(request.user,'username','Buyer')} reviewed {product.headline}",
                data={
                    'product_id': str(product.id),
                    'rating': rating,
                    'comment': comment,
                    'buyer_username': getattr(request.user, 'username', 'Buyer')
                }
            )
        except Exception as e:
            logger.error(f"Error notifying vendor about review: {e}")

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
                'helpful_count': r.helpful_votes.count(),
                'is_helpful': r.helpful_votes.filter(id=request.user.id).exists() if request.user.is_authenticated else False,
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
        
        from shared.admin_notifications import send_user_notification
        send_user_notification(
            user=review.user,
            notification_type='review',
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
        
        from shared.admin_notifications import send_user_notification
        send_user_notification(
            user=review.product.vendor,
            notification_type='review',
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
                'helpful_count': r.helpful_votes.count(),
                'is_helpful': r.helpful_votes.filter(id=request.user.id).exists() if request.user.is_authenticated else False,
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


# Admin Review Management Views
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_vendor_reviews(request, vendor_username):
    """Admin function to get all reviews for a specific vendor"""
    try:
        from users.models import User
        vendor = get_object_or_404(User, username=vendor_username)
        
        reviews = ProductReview.objects.filter(product__vendor=vendor).select_related('user', 'product').order_by('-created_at')
        
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
            'message': f'Reviews for vendor {vendor_username} retrieved successfully',
            'data': data
        })
    except Exception as e:
        logger.error(f"Error in admin_get_vendor_reviews: {str(e)}")
        return Response({'success': False, 'message': 'Failed to retrieve vendor reviews', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_review(request, review_id):
    """Admin function to update a review"""
    try:
        review = get_object_or_404(ProductReview, id=review_id)
        
        rating = request.data.get('rating')
        comment = request.data.get('comment')
        vendor_reply = request.data.get('vendor_reply')
        
        if rating is not None:
            review.rating = int(rating)
        if comment is not None:
            review.comment = comment.strip()
        if vendor_reply is not None:
            review.vendor_reply = vendor_reply.strip()
            
        review.save()
        
        # Re-calculate product aggregates
        product = review.product
        if product.is_active and not product.is_deleted:
            try:
                agg = ProductReview.objects.filter(product=product).aggregate(
                    avg=Avg('rating'),
                    cnt=Count('id')
                )
                product.rating = (agg.get('avg') or 0)
                product.review_count = agg.get('cnt') or 0
                product.save(update_fields=['rating', 'review_count'])
            except Exception:
                pass
                
        return Response({
            'success': True,
            'message': 'Review updated successfully',
            'data': {
                'id': str(review.id),
                'rating': review.rating,
                'comment': review.comment,
                'vendor_reply': review.vendor_reply
            }
        })
    except Exception as e:
        logger.error(f"Error in admin_update_review: {str(e)}")
        return Response({'success': False, 'message': 'Failed to update review', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_review(request, review_id):
    """Admin function to delete a review"""
    try:
        review = get_object_or_404(ProductReview, id=review_id)
        product = review.product
        review_id_str = str(review.id)
        review.delete()
        
        # Re-calculate product aggregates
        if product.is_active and not product.is_deleted:
            try:
                agg = ProductReview.objects.filter(product=product).aggregate(
                    avg=Avg('rating'),
                    cnt=Count('id')
                )
                product.rating = (agg.get('avg') or 0)
                product.review_count = agg.get('cnt') or 0
                product.save(update_fields=['rating', 'review_count'])
            except Exception:
                pass
                
        return Response({
            'success': True,
            'message': 'Review deleted successfully',
            'review_id': review_id_str
        })
    except Exception as e:
        logger.error(f"Error in admin_delete_review: {str(e)}")
        return Response({'success': False, 'message': 'Failed to delete review', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                'time_ago': _get_time_ago(review.created_at),
                'helpful_count': review.helpful_votes.count(),
                'is_helpful': review.helpful_votes.filter(id=request.user.id).exists() if request.user.is_authenticated else False,
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_review_helpful(request, review_id):
    """Allow internal users to mark a review as helpful (toggle)"""
    try:
        review = get_object_or_404(ProductReview, id=review_id)
        user = request.user
        
        if review.helpful_votes.filter(id=user.id).exists():
            review.helpful_votes.remove(user)
            is_helpful = False
            message = "Unmarked review as helpful"
        else:
            review.helpful_votes.add(user)
            is_helpful = True
            message = "Marked review as helpful"
            
        return Response({
            'success': True,
            'message': message,
            'data': {
                'id': str(review.id),
                'is_helpful': is_helpful,
                'helpful_count': review.helpful_votes.count()
            }
        })
    except Exception as e:
        logger.error(f"Error marking review as helpful: {str(e)}")
        return Response({'success': False, 'message': 'Failed to update helpful status', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_highlight(request, product_id):
    """Highlight a product for 12 hours with +1% commission on top of existing platform fee"""
    try:
        logger.info(f"--- HIGHLIGHT START --- Product: {product_id}, Vendor: {request.user.username} ---")
        
        # 1. Fetch current product
        product = get_object_or_404(Product, id=product_id, vendor=request.user)
        
        # 2. Check existing status (allow re-highlighting if expired)
        now = timezone.now()
        if product.is_highlighted and product.highlighted_until and product.highlighted_until > now:
             logger.warning(f"Product {product_id} already active until {product.highlighted_until}")
             return Response({'success': False, 'message': 'Product is already highlighted'}, status=400)
             
        is_giveaway = request.data.get('is_giveaway', False)
        
        # 3. Explicitly only modify THIS product instance
        product.is_highlighted = True
        product.highlighted_until = now + timezone.timedelta(hours=12)
        product.highlight_fee_rate = 1.00
        
        if is_giveaway:
            from decimal import Decimal
            product.is_giveaway = True
            product.price = Decimal('0.00')
            
        # 4. Save using only relevant fields to avoid any weirdness with other fields/queryset-wide triggers
        product.save(update_fields=['is_highlighted', 'highlighted_until', 'highlight_fee_rate', 'is_giveaway', 'price', 'updated_at'])
        
        logger.info(f"Successfully saved Product {product_id}. Checking other ads for this vendor...")
        
        # 5. Verify database state for this vendor
        all_active = Product.objects.filter(
            vendor=request.user, 
            is_highlighted=True, 
            highlighted_until__gt=now
        ).values_list('id', flat=True)
        
        logger.info(f"Active Ad IDs for @{request.user.username}: {list(all_active)}")
        
        msg = 'Product highlighted successfully! Multi-ad mode is active.'
        if is_giveaway:
            msg = 'Product highlighted successfully as a FREE Giveaway!'
            
        return Response({
            'success': True,
            'message': msg,
            'highlighted_until': product.highlighted_until,
            'active_ad_count': len(all_active)
        })
    except Exception as e:
        logger.exception(f"Unexpected error in promote_highlight for {product_id}")
        return Response({'success': False, 'message': f"Critical error: {str(e)}"}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_highlight(request, product_id):
    """Remove highlight from a product"""
    try:
        product = get_object_or_404(Product, id=product_id, vendor=request.user)
        
        product.is_highlighted = False
        product.highlighted_until = None
        # Note: we don't reset highlight_fee_rate here as it's the default potential fee if re-highlighted
        product.save()
        
        return Response({
            'success': True,
            'message': 'Promotion stopped successfully.'
        })
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_notification(request):
    """Create a paid global blast for 1-10 products with volume discount."""
    try:
        product_ids = request.data.get('product_ids', [])
        currency = request.data.get('currency', 'BTC').upper()
        promotion_type = request.data.get('promotion_type', 'standard') # 'standard' or 'premium'
        
        if not product_ids or len(product_ids) > 10:
            return Response({'success': False, 'message': 'Please provide 1-10 products'}, status=400)
            
        products = Product.objects.filter(id__in=product_ids, vendor=request.user)
        if products.count() != len(product_ids):
            return Response({'success': False, 'message': 'Some products were not found or do not belong to you'}, status=400)
            
        # 1. Determine cost and priority based on tier
        if promotion_type == 'premium':
            cost_usd = Decimal('100.00')
            title_prefix = "🔥 EXCLUSIVE ACCESS:"
            priority = 'critical'
            expiry_hours = 48
        else:
            count = len(product_ids)
            base_cost_usd = Decimal(str(count))  # $1 per selected product
            # Professional volume tiers: encourages multi-select while preserving revenue.
            if count >= 8:
                discount_rate = Decimal('0.20')
            elif count >= 5:
                discount_rate = Decimal('0.12')
            elif count >= 3:
                discount_rate = Decimal('0.05')
            else:
                discount_rate = Decimal('0.00')
            discount_usd = (base_cost_usd * discount_rate).quantize(Decimal('0.01'))
            cost_usd = (base_cost_usd - discount_usd).quantize(Decimal('0.01'))
            title_prefix = "Premium Promotion:"
            priority = 'high'
            expiry_hours = 24

        # 2. Calculate cost in crypto
        from payments.services import get_current_price_usd
        price_usd = get_current_price_usd(currency)
        if price_usd <= 0:
            return Response({'success': False, 'message': 'Could not fetch crypto price'}, status=500)
            
        cost_crypto = cost_usd / price_usd
        
        # 3. Deduct from wallet
        try:
            wallet, created = UserWallet.objects.get_or_create(user=request.user)
            
            with transaction.atomic():
                wallet.debit(cost_crypto, currency)
                
                # 4. Create wallet transaction
                WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type='purchase',
                    amount=cost_crypto,
                    crypto_currency=currency,
                    notes=f'{promotion_type.capitalize()} promotion fee (${cost_usd}) for {len(product_ids)} products'
                )
                
                # 5. Create announcement for all users
                # Buyer UI routes use /buyer/product/:id
                product_links = [f'<a href="/buyer/product/{p.id}">{p.headline}</a>' for p in products]
                content = f"AccountzClub Featured Offers from <strong>{request.user.username}</strong>:<br><br>" + "<br>".join(product_links)
                if promotion_type == 'premium':
                    content = "<strong>URGENT: A new premium account selection is available!</strong><br><br>" + content

                announcement = Announcement.objects.create(
                    title=f"{title_prefix} {request.user.username}'s Special Deals",
                    content=content,
                    audience='buyer',
                    priority=priority,
                    created_by=request.user,
                    start_date=timezone.now(),
                    end_date=timezone.now() + timezone.timedelta(hours=expiry_hours)
                )

                # Create in-app notifications for all active users so blast is visible in dashboards.
                target_user_ids = User.objects.filter(is_active=True, user_type='buyer').exclude(id=request.user.id).values_list('id', flat=True)
                notifications = [
                    Notification(
                        user_id=uid,
                        type='system',
                        title=announcement.title,
                        message=content,
                        data={
                            'type': 'global_blast',
                            'vendor': request.user.username,
                            'announcement_id': str(announcement.id),
                        },
                    )
                    for uid in target_user_ids
                ]
                if notifications:
                    Notification.objects.bulk_create(notifications, batch_size=1000)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=400)
            
        return Response({
            'success': True,
            'message': f'{promotion_type.capitalize()} notification sent! {cost_crypto:.8f} {currency} (~${cost_usd}) deducted from wallet.',
            'pricing': {
                'product_count': len(product_ids),
                'cost_usd': f'{cost_usd:.2f}',
                'cost_crypto': f'{cost_crypto:.8f}',
                'currency': currency,
            }
        })
    except Exception as e:
        logger.error(f"Error in promote_notification: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_blast_payment(request):
    """Create a direct crypto payment invoice for Global Blast when wallet is empty."""
    try:
        product_ids = request.data.get('product_ids', [])
        currency = request.data.get('currency', 'BTC').upper()
        promotion_type = request.data.get('promotion_type', 'standard')
        
        if not product_ids or len(product_ids) > 10:
            return Response({'success': False, 'message': 'Please provide 1-10 products'}, status=400)
            
        products = Product.objects.filter(id__in=product_ids, vendor=request.user)
        if products.count() != len(product_ids):
            return Response({'success': False, 'message': 'Invalid products'}, status=400)
            
        # Pricing logic (synced with promote_notification)
        if promotion_type == 'premium':
            cost_usd = Decimal('100.00')
        else:
            count = len(product_ids)
            base_cost_usd = Decimal(str(count))
            discount_rate = Decimal('0.20') if count >= 8 else Decimal('0.12') if count >= 5 else Decimal('0.05') if count >= 3 else Decimal('0.00')
            cost_usd = (base_cost_usd * (1 - discount_rate)).quantize(Decimal('0.01'))

        # Create BTCPay Invoice
        from payments.services import BTCPayServerService
        btcpay = BTCPayServerService()
        
        # Unique ID for this blast attempt to track on callback
        blast_order_id = f"blast_{uuid.uuid4().hex[:8]}"
        
        invoice = btcpay.create_invoice(
            order_id=blast_order_id,
            amount=cost_usd,
            currency='USD'
        )
        
        if not invoice:
            return Response({'success': False, 'message': 'Failed to generate crypto invoice. Please try again later.'}, status=500)
            
        invoice_id = invoice.get('invoice_id')
        
        # Calculate the actual crypto amount using the Platform's Live Rate Service
        from payments.services import get_current_price_usd
        live_price = get_current_price_usd(currency)
        
        if live_price > 0:
            crypto_amount = (cost_usd / live_price).quantize(Decimal('0.00000001'))
            crypto_amount = str(crypto_amount)
        else:
            # Fallback to BTCPay's internal conversion if live service fails
            crypto_amount = invoice.get('amount', '0')
            try:
                status_data = btcpay.get_invoice_status(invoice_id)
                if status_data and 'paymentMethods' in status_data:
                    for pm in status_data['paymentMethods']:
                        if pm.get('paymentMethodId') == f'{currency}-CHAIN':
                            crypto_amount = pm.get('amount', crypto_amount)
                            break
            except:
                pass

        return Response({
            'success': True,
            'invoice_id': invoice_id,
            'address': invoice['address'],
            'amount_crypto': crypto_amount,
            'amount_usd': str(cost_usd),
            'currency': currency,
            'checkout_link': invoice['checkoutLink']
        })
    except Exception as e:
        logger.error(f"Error in create_blast_payment: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_blast_payment(request):
    """Check if crypto invoice for blast is paid, and if so, trigger the magic."""
    try:
        invoice_id = request.data.get('invoice_id')
        product_ids = request.data.get('product_ids', [])
        promotion_type = request.data.get('promotion_type', 'standard')

        if not invoice_id:
            return Response({'success': False, 'message': 'Missing invoice ID'}, status=400)

        from payments.services import BTCPayServerService
        btcpay = BTCPayServerService()
        status_data = btcpay.get_invoice_status(invoice_id)
        
        if not status_data:
            return Response({'success': False, 'message': 'Invoice not found'}, status=404)
            
        # Normalize status
        inv_status = (status_data.get('status') or '').strip().lower()

        # Read paid/due from payment-methods endpoint (source of truth for on-chain totals)
        total_paid_detected = Decimal('0')
        total_due_detected = Decimal('0')
        payment_currency = None
        try:
            pm_res = requests.get(
                f"{btcpay.base_url}/api/v1/stores/{btcpay.store_id}/invoices/{invoice_id}/payment-methods",
                headers=btcpay.headers,
                timeout=30,
            )
            if pm_res.status_code == 200:
                methods = pm_res.json() or []
                for m in methods:
                    # Prefer the chain method if present; otherwise sum everything.
                    method_id = m.get('paymentMethodId')
                    paid = Decimal(str(m.get('totalPaid', '0') or '0'))
                    due = Decimal(str(m.get('due', m.get('totalDue', '0')) or '0'))
                    if method_id and ('-CHAIN' in method_id) and payment_currency is None:
                        payment_currency = method_id.split('-')[0]
                    total_paid_detected += paid
                    total_due_detected += due
            else:
                logger.warning(f"BTCPay payment-methods fetch failed: {pm_res.status_code} {pm_res.text}")
        except Exception as e:
            logger.warning(f"Failed payment-methods scan: {e}")

        # Underpayment tolerance (accept 95%+ for dev UX; can tighten later)
        tolerance = Decimal('0.95')
        is_paid_by_amount = (total_due_detected > 0) and (total_paid_detected >= (total_due_detected * tolerance))

        # Consider invoice paid if status says so, OR paid >= (due * tolerance)
        is_paid_val = (inv_status in ['settled', 'processing', 'confirmed']) or is_paid_by_amount
        
        logger.info(
            f"🔄 Blast Check: ID={invoice_id}, Status='{inv_status}', Paid={total_paid_detected}, Due={total_due_detected}, "
            f"Tolerance={tolerance}, TRIGGER={is_paid_val}"
        )

        if is_paid_val:
            # TRIGGER THE MAGIC
            logger.info(f"✨ TRIGGERING MAGIC BLAST for user {request.user.username}")
            products = Product.objects.filter(id__in=product_ids)
            
            title_prefix = "🔥 EXCLUSIVE ACCESS:" if promotion_type == 'premium' else "Premium Promotion:"
            priority = 'critical' if promotion_type == 'premium' else 'high'
            expiry_hours = 48 if promotion_type == 'premium' else 24
            
            # Buyer UI routes use /buyer/product/:id
            product_links = [f'<a href="/buyer/product/{p.id}">{p.headline}</a>' for p in products]
            content = f"AccountzClub Featured Offers from <strong>{request.user.username}</strong>:<br><br>" + "<br>".join(product_links)
            if promotion_type == 'premium':
                content = "<strong>URGENT: A new premium account selection is available!</strong><br><br>" + content
            
            announcement = Announcement.objects.create(
                title=f"{title_prefix} {request.user.username}'s Special Deals",
                content=content,
                audience='buyer',
                priority=priority,
                created_by=request.user,
                start_date=timezone.now(),
                end_date=timezone.now() + timezone.timedelta(hours=expiry_hours)
            )

            # Broadcast in-app notifications to all active users (except sender).
            target_user_ids = User.objects.filter(is_active=True, user_type='buyer').exclude(id=request.user.id).values_list('id', flat=True)
            notifications = [
                Notification(
                    user_id=uid,
                    type='system',
                    title=announcement.title,
                    message=content,
                    data={
                        'type': 'global_blast',
                        'vendor': request.user.username,
                        'announcement_id': str(announcement.id),
                    },
                )
                for uid in target_user_ids
            ]
            if notifications:
                Notification.objects.bulk_create(notifications, batch_size=1000)

            return Response({
                'success': True,
                'is_paid': True,
                'message': 'Payment confirmed! Your Global Blast is now live.'
            })
            
        elif inv_status == 'expired' or inv_status == 'invalid':
            return Response({'success': True, 'is_paid': False, 'is_expired': True, 'message': 'Invoice expired or invalid'})
            
        remaining = (total_due_detected - total_paid_detected) if total_due_detected > 0 else Decimal('0')
        remaining = remaining if remaining > 0 else Decimal('0')
        if total_paid_detected > 0 and remaining > 0:
            return Response(
                {
                    'success': True,
                    'is_paid': False,
                    'is_underpaid': True,
                    'paid_detected': str(total_paid_detected),
                    'total_due': str(total_due_detected),
                    'remaining_due': str(remaining),
                    'currency': payment_currency,
                    'message': f'Underpaid: received {total_paid_detected} {payment_currency or ""}. Please send remaining {remaining} to complete.',
                }
            )

        return Response(
            {
                'success': True,
                'is_paid': False,
                'paid_detected': str(total_paid_detected),
                'total_due': str(total_due_detected),
                'remaining_due': str(remaining),
                'currency': payment_currency,
                'message': 'Waiting for network confirmation...',
            }
        )
        
    except Exception as e:
        logger.error(f"Error in check_blast_payment: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_blast_history(request):
    """Basic global blast history and performance stats for current vendor."""
    try:
        announcements = (
            Announcement.objects.filter(
                created_by=request.user,
                audience__in=['buyer', 'all'],
            )
            .order_by('-created_at')[:25]
        )

        rows = []
        for ann in announcements:
            notif_qs = Notification.objects.filter(data__announcement_id=str(ann.id))
            sent_count = notif_qs.count()
            seen_count = notif_qs.filter(is_read=True).count()
            ctr = round((seen_count / sent_count) * 100, 2) if sent_count > 0 else 0
            rows.append(
                {
                    'id': str(ann.id),
                    'title': ann.title,
                    'created_at': ann.created_at,
                    'start_date': ann.start_date,
                    'end_date': ann.end_date,
                    'is_active': ann.is_active and (ann.end_date is None or ann.end_date >= timezone.now()),
                    'sent_count': sent_count,
                    'seen_count': seen_count,
                    'seen_rate': ctr,
                }
            )

        return Response(
            {
                'success': True,
                'message': 'Blast history loaded',
                'data': rows,
            }
        )
    except Exception as e:
        logger.error(f"Error in vendor_blast_history: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_remove_blast(request, announcement_id):
    """Vendor can remove their own global blast from all user surfaces."""
    try:
        announcement = get_object_or_404(
            Announcement,
            id=announcement_id,
            created_by=request.user,
            audience__in=['buyer', 'all'],
        )
        now = timezone.now()

        # Some legacy flows could create duplicate blast rows; deactivate all matching active rows.
        matched = Announcement.objects.filter(
            created_by=request.user,
            audience__in=['buyer', 'all'],
            title=announcement.title,
            is_active=True,
        )
        matched_ids = [str(i) for i in matched.values_list('id', flat=True)]
        matched.update(is_active=False, end_date=now)

        # Remove blast notifications from user feeds for all matched announcements.
        if matched_ids:
            Notification.objects.filter(data__announcement_id__in=matched_ids).delete()
        else:
            Notification.objects.filter(data__announcement_id=str(announcement.id)).delete()

        return Response(
            {
                'success': True,
                'message': 'Blast removed from users successfully.',
                'data': {'id': str(announcement.id), 'removed_count': len(matched_ids) or 1},
            }
        )
    except Exception as e:
        logger.error(f"Error in vendor_remove_blast: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)
