from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import Count, Avg, Q
from datetime import timedelta

from .models import VendorApplication
from .serializers import VendorApplicationSerializer
from products.models import Product, ProductReview
from orders.models import Order
@api_view(['GET'])
@permission_classes([AllowAny])
def list_approved_vendors(request):
    """Public: list approved vendors for discovery sections"""
    try:
        limit = int(request.GET.get('limit', 8))
        vendors = VendorApplication.objects.filter(status='approved').order_by('-updated_at')[:limit]
        data = []
        for v in vendors:
            # Safely build logo URL (avoid returning File objects)
            logo_url = ''
            try:
                if getattr(v, 'logo', None) and getattr(v.logo, 'url', ''):
                    logo_url = v.logo.url
            except Exception:
                logo_url = ''

            data.append({
                'vendor_username': v.vendor_username or '',
                'business_name': v.business_name or v.vendor_username or '',
                'category': v.category or '',
                'store_description': v.store_description or '',
                'logo_url': logo_url,
            })
        return Response({'success': True, 'data': data})
    except Exception as e:
        return Response({'success': False, 'message': 'Failed to load vendors', 'errors': str(e)}, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_applications(request):
    """List all vendor applications (admin only)"""
    # Check if user is admin
    if not hasattr(request.user, 'user_type') or request.user.user_type != 'admin':
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.',
            'errors': 'You do not have permission to perform this action.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get query parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        status_filter = request.GET.get('status', '')
        
        # Build queryset
        queryset = VendorApplication.objects.all()
        
        # If no applications exist, create sample data for testing
        if queryset.count() == 0:
            # Create sample vendor applications
            sample_applications = [
                {
                    'business_name': 'Tech Solutions Inc',
                    'vendor_username': 'techvendor',
                    'email': 'tech@example.com',
                    'contact': '+1234567890',
                    'store_description': 'Premium tech solutions and digital goods',
                    'category': 'Electronics & Tech',
                    'status': 'pending'
                },
                {
                    'business_name': 'Digital Accounts Pro',
                    'vendor_username': 'digitalpro',
                    'email': 'digital@example.com',
                    'contact': '+1234567891',
                    'store_description': 'High-quality digital accounts and services',
                    'category': 'Digital Goods & Software',
                    'status': 'approved'
                },
                {
                    'business_name': 'Streaming Masters',
                    'vendor_username': 'streamingmasters',
                    'email': 'streaming@example.com',
                    'contact': '+1234567892',
                    'store_description': 'Premium streaming accounts and services',
                    'category': 'Streaming Accounts',
                    'status': 'rejected'
                }
            ]
            
            for app_data in sample_applications:
                VendorApplication.objects.create(**app_data)
            
            # Refresh queryset
            queryset = VendorApplication.objects.all()
        
        # Apply status filter
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Order by creation date
        queryset = queryset.order_by('-created_at')
        
        # Paginate results
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_data = queryset[start:end]
        
        # Serialize data
        serializer = VendorApplicationSerializer(paginated_data, many=True, context={'request': request})
        
        response_data = {
            'results': serializer.data,
            'count': total_count,
            'next': f'?page={page + 1}' if end < total_count else None,
            'previous': f'?page={page - 1}' if page > 1 else None
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_application(request):
    """Create a new vendor application or update existing one"""
    try:
        # Get form data
        business_name = request.data.get('business_name')
        vendor_username = request.data.get('vendor_username')
        contact = request.data.get('contact', '')
        phone = request.data.get('phone', '')
        website = request.data.get('website', '')
        social_media = request.data.get('social_media', '')
        store_description = request.data.get('store_description')
        category = request.data.get('category')
        sub_category = request.data.get('sub_category', '')
        business_type = request.data.get('business_type', '')
        years_in_business = request.data.get('years_in_business', '')
        target_market = request.data.get('target_market')
        btc_address = request.data.get('btc_address', '')
        xmr_address = request.data.get('xmr_address', '')
        preferred_payment = request.data.get('preferred_payment', '')
        business_address = request.data.get('business_address', '')
        business_license = request.data.get('business_license', '')
        tax_id = request.data.get('tax_id', '')
        insurance = request.data.get('insurance', '')
        business_plan = request.data.get('business_plan', '')
        
        # Handle file uploads
        logo = request.FILES.get('logo')
        documents = request.FILES.get('documents')  # Single file
        images = request.FILES.get('images')  # Single file
        
        # Check if application already exists for this vendor
        existing_application = None
        try:
            existing_application = VendorApplication.objects.get(vendor_username=vendor_username)
        except VendorApplication.DoesNotExist:
            pass
        
        if existing_application:
            # Update existing application
            existing_application.business_name = business_name
            existing_application.contact = contact
            existing_application.phone = phone
            existing_application.website = website
            existing_application.social_media = social_media
            existing_application.store_description = store_description
            existing_application.category = category
            existing_application.sub_category = sub_category
            existing_application.business_type = business_type
            existing_application.years_in_business = years_in_business
            existing_application.target_market = target_market
            existing_application.btc_address = btc_address
            existing_application.xmr_address = xmr_address
            existing_application.preferred_payment = preferred_payment
            existing_application.business_address = business_address
            existing_application.business_license = business_license
            existing_application.tax_id = tax_id
            existing_application.insurance = insurance
            existing_application.business_plan = business_plan
            existing_application.status = 'pending'  # Reset to pending for review
            
            # Handle file uploads if provided
            if logo:
                existing_application.logo = logo
            if documents:
                existing_application.documents = documents
            if images:
                existing_application.images = images
            
            existing_application.save()
            
            return Response({
                'success': True,
                'message': 'Vendor application updated successfully',
                'application_id': existing_application.id,
                'action': 'updated'
            }, status=status.HTTP_200_OK)
        else:
            # Create new application
            application = VendorApplication.objects.create(
                business_name=business_name,
                vendor_username=vendor_username,
                contact=contact,
                phone=phone,
                website=website,
                social_media=social_media,
                store_description=store_description,
                category=category,
                sub_category=sub_category,
                business_type=business_type,
                years_in_business=years_in_business,
                target_market=target_market,
                btc_address=btc_address,
                xmr_address=xmr_address,
                preferred_payment=preferred_payment,
                business_address=business_address,
                business_license=business_license,
                tax_id=tax_id,
                insurance=insurance,
                business_plan=business_plan,
                status='pending'
            )
            
            # Handle file uploads if provided
            if logo:
                application.logo = logo
            if documents:
                application.documents = documents
            if images:
                application.images = images
            
            application.save()
            
            return Response({
                'success': True,
                'message': 'Vendor application submitted successfully',
                'application_id': application.id,
                'action': 'created'
            }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to submit application',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_application(request, application_id):
    """Approve a vendor application (admin only)"""
    # Check if user is admin
    if not hasattr(request.user, 'user_type') or request.user.user_type != 'admin':
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.',
            'errors': 'You do not have permission to perform this action.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        application = get_object_or_404(VendorApplication, id=application_id)
        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()
        
        # Update user's user_type to 'vendor'
        try:
            from users.models import User
            user = User.objects.get(username=application.vendor_username)
            user.user_type = 'vendor'
            user.save()
            print(f"✅ User {user.username} promoted to vendor successfully")
        except User.DoesNotExist:
            print(f"❌ User {application.vendor_username} not found")
        except Exception as e:
            print(f"❌ Error updating user type: {e}")
        
        return Response({
            'success': True,
            'message': 'Vendor application approved successfully',
            'data': {
                'application_id': application.id,
                'vendor_username': application.vendor_username,
                'status': 'approved'
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to approve application',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_application(request, application_id):
    """Reject a vendor application (admin only)"""
    # Check if user is admin
    if not hasattr(request.user, 'user_type') or request.user.user_type != 'admin':
        return Response({
            'success': False,
            'message': 'Access denied. Admin privileges required.',
            'errors': 'You do not have permission to perform this action.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        application = get_object_or_404(VendorApplication, id=application_id)
        application.status = 'rejected'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()
        
        return Response({
            'success': True,
            'message': 'Application rejected successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to reject application',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_application_status(request, username):
    """Check if a user has a vendor application and its status"""
    try:
        # Check if the requesting user is checking their own application
        if request.user.username != username:
            return Response({
                'success': False,
                'message': 'You can only check your own application status'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            application = VendorApplication.objects.get(vendor_username=username)
            return Response({
                'success': True,
                'message': 'Application found',
                'data': {
                    'has_application': True,
                    'status': application.status,
                    'application_id': application.id,
                    'created_at': application.created_at
                }
            }, status=status.HTTP_200_OK)
        except VendorApplication.DoesNotExist:
            return Response({
                'success': True,
                'message': 'No application found',
                'data': {
                    'has_application': False,
                    'status': None
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to check application status',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_vendor_statistics(request, vendor_username):
    """Get vendor statistics for product modal"""
    try:
        # Get vendor user
        try:
            vendor_user = User.objects.get(username=vendor_username)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Vendor not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Get vendor's products
        vendor_products = Product.objects.filter(vendor=vendor_user, status='approved')
        
        # Calculate statistics
        total_products = vendor_products.count()
        total_views = vendor_products.aggregate(total=Count('views_count'))['total'] or 0
        total_favorites = vendor_products.aggregate(total=Count('favorites_count'))['total'] or 0
        
        # Calculate vendor rating from all product reviews
        vendor_reviews = ProductReview.objects.filter(product__vendor=vendor_user)
        avg_rating = vendor_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        total_reviews = vendor_reviews.count()
        
        # Calculate completion rate (completed orders / total orders)
        vendor_orders = Order.objects.filter(product__vendor=vendor_user)
        total_orders = vendor_orders.count()
        completed_orders = vendor_orders.filter(status__in=['delivered', 'confirmed']).count()
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 100
        
        # Calculate member since
        member_since = vendor_user.date_joined
        years_since = (timezone.now() - member_since).days / 365.25
        
        return Response({
            'success': True,
            'data': {
                'username': vendor_username,
                'member_since': f"{years_since:.1f} years ago" if years_since >= 1 else f"{(years_since * 12):.0f} months ago",
                'total_sales': f"{total_products} products",
                'vendor_rating': f"{avg_rating:.1f}/5" if avg_rating > 0 else "No rating",
                'completion_rate': f"{completion_rate:.0f}%",
                'total_views': total_views,
                'total_favorites': total_favorites,
                'total_reviews': total_reviews
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to fetch vendor statistics',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)