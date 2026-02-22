from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import timedelta
import uuid

from .models import VendorApplication
from .serializers import VendorApplicationSerializer
from products.models import Product, ProductReview
from orders.models import Order
from users.models import User
from shared.models import Conversation, Message
from django.db.models import Sum, F, Count, Max
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
@api_view(['GET'])
@permission_classes([AllowAny])
def list_approved_vendors(request):
    """Public: list approved vendors for discovery sections"""
    try:
        from shared.utils.security import get_safe_int
        limit = get_safe_int(request.GET.get('limit'), default=8, min_val=1, max_val=50)
        vendors = VendorApplication.objects.filter(status='approved').order_by('-updated_at')[:limit]
        data = []
        for v in vendors:
            # Safely build logo URL
            logo_url = ''
            try:
                if getattr(v, 'logo', None) and getattr(v.logo, 'url', ''):
                    logo_url = v.logo.url
            except Exception:
                logo_url = ''

            # Try to get the user's profile picture from the User model first
            profile_picture = ''
            try:
                user = User.objects.get(username=v.vendor_username)
                if user.profile_picture:
                    profile_picture = user.profile_picture.url
            except User.DoesNotExist:
                pass

            data.append({
                'vendor_username': v.vendor_username or '',
                'business_name': v.business_name or v.vendor_username or '',
                'category': v.category or '',
                'store_description': v.store_description or '',
                'logo_url': logo_url,
                'profile_picture': profile_picture or logo_url,
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
        from shared.utils.security import get_safe_int
        page = get_safe_int(request.GET.get('page'), default=1, min_val=1)
        page_size = get_safe_int(request.GET.get('page_size'), default=20, min_val=1, max_val=100)
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
    """Create a new vendor application or update existing one - simplified anonymous version"""
    try:
        # Get simplified form data (anonymous marketplace - no personal info required)
        application_message = request.data.get('application_message', '').strip()
        vendor_username = request.data.get('vendor_username') or request.user.username
        email = getattr(request.user, 'email', f"{vendor_username}@accountzclub.com")
        
        # Validate required fields
        if not application_message:
            return Response({
                'success': False,
                'message': 'Application message is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(application_message) < 100:
            return Response({
                'success': False,
                'message': 'Application message must be at least 100 characters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if application already exists for this vendor
        existing_application = None
        try:
            existing_application = VendorApplication.objects.get(vendor_username=vendor_username)
        except VendorApplication.DoesNotExist:
            pass
        
        if existing_application:
            # Update existing application with new message
            existing_application.store_description = application_message
            # Don't reset status to pending if already approved - allow updates
            if existing_application.status != 'approved':
                existing_application.status = 'pending'
            
            existing_application.save()
            
            # Notify admin if application status changed to pending (new submission or resubmission)
            if existing_application.status == 'pending':
                try:
                    from shared.admin_notifications import notify_admin_vendor_application
                    notify_admin_vendor_application(existing_application)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to notify admin about vendor application update: {e}")
            
            return Response({
                'success': True,
                'message': 'Vendor application updated successfully',
                'application_id': existing_application.id,
                'action': 'updated'
            }, status=status.HTTP_200_OK)
        else:
            # Create new application with minimal required fields
            # Store the message in store_description field
            application = VendorApplication.objects.create(
                business_name=vendor_username,  # Use username as business name for anonymous marketplace
                vendor_username=vendor_username,
                email=email,
                store_description=application_message,  # Store the application message here
                category='Other',  # Default category
                status='pending'
            )
            
            application.save()
            
            # Notify admin about new vendor application
            try:
                from shared.admin_notifications import notify_admin_vendor_application
                notify_admin_vendor_application(application)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to notify admin about vendor application: {e}")
            
            return Response({
                'success': True,
                'message': 'Vendor application submitted successfully',
                'application_id': application.id,
                'action': 'created'
            }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating vendor application: {e}")
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
            user = User.objects.get(username=application.vendor_username)
            user.user_type = 'vendor'
            user.save()
            print(f"✅ User {user.username} promoted to vendor successfully")
        except User.DoesNotExist:
            print(f"❌ User {application.vendor_username} not found")
        except Exception as e:
            print(f"❌ Error updating user type: {e}")
        
        # Notify user about application approval
        try:
            admin_notes = request.data.get('admin_notes', '')
            # Save notes to application if provided
            if admin_notes:
                application.admin_notes = admin_notes
                application.save()
                
            from shared.admin_notifications import notify_user_vendor_application_approved
            notify_user_vendor_application_approved(application, request.user, admin_notes)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to notify user about application approval: {e}")
        
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
        rejection_reason = request.data.get('rejection_reason')
        if not rejection_reason:
            rejection_reason = request.data.get('admin_notes', '')
        application.status = 'rejected'
        application.admin_notes = rejection_reason
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()
        
        # Notify user about application rejection
        try:
            from shared.admin_notifications import notify_user_vendor_application_rejected
            notify_user_vendor_application_rejected(application, request.user, rejection_reason)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to notify user about application rejection: {e}")
        
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
    """Check if a user has a vendor application and its status (admin can check any vendor)"""
    try:
        # Check if the requesting user is checking their own application OR if admin is checking any vendor
        is_admin = hasattr(request.user, 'user_type') and request.user.user_type == 'admin'
        if not is_admin and request.user.username != username:
            return Response({
                'success': False,
                'message': 'You can only check your own application status'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Always try to get associated user to get current payout addresses
        try:
            user = User.objects.get(username=username)
            user_btc = user.btc_payout_address
            user_xmr = user.xmr_payout_address
        except User.DoesNotExist:
            user_btc = ''
            user_xmr = ''

        try:
            application = VendorApplication.objects.get(vendor_username=username)
            btc_address = user_btc or application.btc_address
            xmr_address = user_xmr or application.xmr_address

            return Response({
                'success': True,
                'message': 'Application found',
                'data': {
                    'has_application': True,
                    'status': application.status,
                    'application_id': application.id,
                    'created_at': application.created_at,
                    'btc_address': btc_address,
                    'xmr_address': xmr_address,
                    'btc_payout_address': user_btc or '',
                    'xmr_payout_address': user_xmr or '',
                    'business_name': application.business_name,
                    'contact': application.contact,
                    'phone': application.phone,
                    'website': application.website,
                    'store_description': application.store_description
                }
            }, status=status.HTTP_200_OK)
        except VendorApplication.DoesNotExist:
            print(f"VendorApplication not found for {username}")
            return Response({
                'success': True,
                'message': 'No application found',
                'data': {
                    'has_application': False,
                    'status': None,
                    'btc_address': user_btc or '',
                    'xmr_address': user_xmr or '',
                    'btc_payout_address': user_btc or '',
                    'xmr_payout_address': user_xmr or '',
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to check application status',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def invite_vendor(request):
    """Invite buyer(s) to become vendors by username (admin only)"""
    try:
        # Support both single username and multiple usernames
        username = request.data.get('username', '').strip()
        usernames = request.data.get('usernames', [])
        message = request.data.get('message', '')
        
        # Convert single username to list if needed
        if username:
            usernames = [username]
        elif not usernames:
            return Response({
                'success': False,
                'message': 'Username or usernames are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove duplicates and empty strings
        usernames = list(set([u.strip() for u in usernames if u.strip()]))
        
        if not usernames:
            return Response({
                'success': False,
                'message': 'At least one username is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all users
        users = User.objects.filter(username__in=usernames, is_deleted=False)
        found_usernames = set(users.values_list('username', flat=True))
        
        # Check for non-existent users
        missing_usernames = set(usernames) - found_usernames
        if missing_usernames:
            return Response({
                'success': False,
                'message': f'User(s) not found: {", ".join(missing_usernames)}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if all users are buyers
        non_buyer_users = users.exclude(user_type='buyer')
        if non_buyer_users.exists():
            non_buyer_usernames = list(non_buyer_users.values_list('username', flat=True))
            return Response({
                'success': False,
                'message': f'User(s) are not buyers: {", ".join(non_buyer_usernames)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create notifications and send real-time notifications for all users
        from shared.models import Notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        
        successful_invites = []
        for user in users:
            # Create notification for the buyer via central helper
            from shared.admin_notifications import send_user_notification
            send_user_notification(
                user=user,
                notification_type='marketing',
                title='Vendor Invitation',
                message=f"You've been invited to become a vendor on our marketplace!" + (f"\n\n{message}" if message else ""),
                data={'action_url': '/vendor/apply', 'invitation_type': 'vendor_invite'}
            )
            
            successful_invites.append(user.username)
        
        return Response({
            'success': True,
            'message': f'Vendor invitation(s) sent to {len(successful_invites)} buyer(s)',
            'data': {
                'usernames': successful_invites,
                'message': message
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Failed to send vendor invitation',
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
        active_listings = vendor_products.filter(is_active=True).count()
        from django.db.models import Sum
        total_views = vendor_products.aggregate(total=Sum('views_count'))['total'] or 0
        total_favorites = vendor_products.aggregate(total=Sum('favorites_count'))['total'] or 0
        
        # Calculate vendor rating from all product reviews
        vendor_reviews = ProductReview.objects.filter(product__vendor=vendor_user)
        avg_rating = vendor_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        total_reviews = vendor_reviews.count()
        
        # Calculate completion rate (completed orders / total orders)
        vendor_orders = Order.objects.filter(product__vendor=vendor_user)
        total_orders = vendor_orders.count()
        # Include all completed orders - both regular and giveaway orders
        # Giveaway orders are marked as 'paid' immediately, so they should be counted
        completed_orders = vendor_orders.filter(
            order_status__in=['delivered', 'confirmed', 'completed', 'paid']
        ).count()
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 100
        
        # Total sales = actual completed orders count (including giveaways)
        # This is the real "sales" metric - how many orders were successfully fulfilled
        # Explicitly include giveaway orders in sales count
        total_sales = completed_orders  # This already includes giveaways with 'paid' status
        
        # Calculate unique buyers
        unique_buyers = vendor_orders.values('buyer').distinct().count()
        
        # Calculate total earnings (sum of all completed payouts + direct payments)
        # We use the strict "Net Earnings" logic to match the Vendor Payout Dashboard
        from payments.models import Payout, DirectPayment
        from decimal import Decimal
        
        # Network Fees Constants
        BTC_NETWORK_FEE = Decimal('0.00000250')
        XMR_NETWORK_FEE = Decimal('0.00010000')

        paid_payouts = Payout.objects.filter(vendor=vendor_user, status__iexact='completed')
        paid_directs = DirectPayment.objects.filter(vendor=vendor_user, status__iexact='completed')
        
        total_earnings = Decimal('0')
        
        for p in paid_payouts:
            symbol = p.crypto_currency.symbol.upper().strip()
            network_fee = BTC_NETWORK_FEE if symbol in ['BTC', 'BITCOIN'] else XMR_NETWORK_FEE
            
            from payments.commission_models import CommissionSettings
            cs = CommissionSettings.get_settings()
            
            p_fee = p.platform_fee
            if p_fee <= 0: p_fee = p.gross_amount * (cs.platform_fee_rate / Decimal('100'))
            
            e_fee = p.escrow_fee
            if e_fee <= 0: e_fee = p.gross_amount * (cs.escrow_fee_rate / Decimal('100'))
            
            net = p.gross_amount - p_fee - e_fee - network_fee
            if net < 0: net = 0
            total_earnings += net # This is in crypto, simplified summation for now (logic flaw in original View was also summing raw amounts, likely USD based in Order model. Correcting to return USD sum would require rate conversion, but assuming existing frontend expects USD value based on 'total_amount'). 
            
            # WAIT: The original code summed 'total_amount' from ORDER model, which is likely in USD.
            # The Payout model stores amounts in Crypto.
            # We must convert crypto net to USD for the 'Total Revenue' display which is usually USD.
            # Since we can't easily get historical rates here efficiently without joining or loops, we will approximate using CURRENT rates or Order's USD value minus fee % 
            
        # REVISED STRATEGY for `total_earnings` in `get_vendor_statistics`:
        # The prompt asks to fix the GAP. The gap is because Order.total_amount is Gross USD.
        # We need Net USD.
        # Efficient fix: Sum Order.total_amount (Gross USD) and multiply by ~0.95 (approx 5% fee deduction) to match closer to Payouts.
        # OR: correctly calculate it from Payouts using the USD rate AT THE TIME (if stored) or current rate?
        # The Payouts dashboard uses current rate for display.
        # Let's use the Payout-based summation and convert to USD using current rates to be consistent with Payout Dashboard.
        
        from payments.views import PaymentService
        ps = PaymentService()
        btc_rate = ps.get_fiat_to_crypto_rate('BTC', 'USD') or Decimal('98000')
        xmr_rate = ps.get_fiat_to_crypto_rate('XMR', 'USD') or Decimal('165')
        
        total_earnings_usd = Decimal('0')
        
        for p in paid_payouts:
            symbol = p.crypto_currency.symbol.upper().strip()
            rate = btc_rate if symbol in ['BTC', 'BITCOIN'] else xmr_rate
            network_fee = BTC_NETWORK_FEE if symbol in ['BTC', 'BITCOIN'] else XMR_NETWORK_FEE
            
            p_fee = p.platform_fee
            if p_fee <= 0: p_fee = p.gross_amount * Decimal('0.04')
            e_fee = p.escrow_fee
            if e_fee <= 0: e_fee = p.gross_amount * Decimal('0.01')
            
            net_crypto = p.gross_amount - p_fee - e_fee - network_fee
            if net_crypto < 0: net_crypto = 0
            
            total_earnings_usd += (net_crypto * rate)

        for p in paid_directs:
            symbol = p.crypto_currency.symbol.upper().strip()
            rate = btc_rate if symbol in ['BTC', 'BITCOIN'] else xmr_rate
            network_fee = BTC_NETWORK_FEE if symbol in ['BTC', 'BITCOIN'] else XMR_NETWORK_FEE
            
            p_fee = p.platform_fee
            if p_fee <= 0: p_fee = p.amount * Decimal('0.05')
            
            net_crypto = p.amount - p_fee - network_fee
            if net_crypto < 0: net_crypto = 0
            
            total_earnings_usd += (net_crypto * rate)

        total_earnings = total_earnings_usd
        
        # Get last sale date
        last_sale = vendor_orders.filter(
            order_status__in=['delivered', 'confirmed', 'completed', 'paid']
        ).order_by('-created_at').first()
        last_sale_date = last_sale.created_at.strftime('%Y-%m-%d') if last_sale else None
        
        # Get most selling product
        most_selling = vendor_orders.values('product__headline', 'product__id').annotate(
            count=Count('id')
        ).order_by('-count').first()
        most_selling_product = most_selling['product__headline'] if most_selling else None
        
        # Calculate member since
        member_since = vendor_user.date_joined
        years_since = (timezone.now() - member_since).days / 365.25
        
        return Response({
            'success': True,
            'data': {
                'username': vendor_username,
                'member_since': f"{years_since:.1f} years ago" if years_since >= 1 else f"{(years_since * 12):.0f} months ago",
                'total_sales': total_sales,
                'active_listings': active_listings,
                'vendor_rating': f"{avg_rating:.1f}/5" if avg_rating > 0 else "No rating",
                'completion_rate': f"{completion_rate:.0f}%",
                'total_views': total_views,
                'total_favorites': total_favorites,
                'total_reviews': total_reviews,
                'unique_buyers': unique_buyers,
                'total_earnings': str(total_earnings),
                'last_sale_date': last_sale_date,
                'most_selling_product': most_selling_product,
            }
        })
    except Exception as e:
        logger.error(f"Error in get_vendor_statistics: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error fetching statistics: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_dashboard_aggregated(request):
    """
    Optimized aggregated dashboard data for vendors in a single call.
    Returns: stats, recent_orders, top_products, recent_messages, balance.
    """
    user = request.user
    if not (user.user_type == 'vendor' or user.is_staff):
        return Response({
            'success': False, 
            'message': 'Only vendors can access this dashboard'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        # Define valid order statuses for revenue/sales
        VALID_STATUSES = ['paid', 'completed', 'delivered', 'confirmed', 'payment_received']
        
        # 1. Product Stats
        products = Product.objects.filter(vendor=user, is_deleted=False)
        total_products = products.count()
        active_listings = products.filter(status='approved', is_active=True).count()
        out_of_stock = products.filter(status='approved', quantity_available=0).count()
        under_review = products.filter(status__in=['pending_approval', 'under_review']).count()

        # 2. Revenue & Sales
        vendor_orders = Order.objects.filter(vendor=user)
        completed_orders = vendor_orders.filter(order_status__in=VALID_STATUSES)
        
        sales_count = completed_orders.count()
        total_revenue = completed_orders.aggregate(total=Sum('total_amount'))['total'] or 0

        # 3. Recent Orders (Top 4 as per UI layout)
        recent_orders_qs = vendor_orders.select_related('product', 'buyer').order_by('-created_at')[:4]
        recent_orders = []
        
        for o in recent_orders_qs:
            recent_orders.append({
                'id': str(o.id),
                'order_id': o.order_id,
                'buyer': {'username': o.buyer.username if o.buyer else 'Unknown'},
                'product': {'headline': o.product.headline if o.product else 'Unknown'},
                'total_amount': str(o.total_amount),
                'crypto_currency': o.crypto_currency,
                'payment_status': o.payment_status,
                'order_status': o.order_status,
                'created_at': o.created_at.isoformat(),
                'use_escrow': getattr(o, 'use_escrow', False)
            })

        # 4. Top Products (By sales count)
        top_products_qs = completed_orders.values(
            'product__id', 'product__headline', 'product__price'
        ).annotate(
            sales_count=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('-sales_count')[:5]
        
        top_products = []
        for tp in top_products_qs:
            top_products.append({
                'id': str(tp['product__id']),
                'name': tp['product__headline'],
                'sales': tp['sales_count'],
                'revenue': float(tp['revenue']),
                'price': float(tp['product__price'])
            })

        # 5. Recent Messages
        conversations = Conversation.objects.filter(
            participants=user
        ).prefetch_related('participants', 'product').order_by('-updated_at')[:4]
        
        recent_messages = []
        for conv in conversations:
            other_participant = conv.participants.exclude(id=user.id).first()
            last_message = Message.objects.filter(conversation=conv).order_by('-created_at').first()
            unread_count = Message.objects.filter(conversation=conv, recipient=user, is_read=False).count()
            
            if other_participant and last_message:
                recent_messages.append({
                    'id': str(conv.id),
                    'buyer': other_participant.username,
                    'product': conv.product.headline if conv.product else 'Product',
                    'lastMessage': last_message.content[:100],
                    'time': last_message.created_at.isoformat(),
                    'unread': unread_count > 0
                })

        # 6. Balance & Disputes
        balance = getattr(user, 'account_balance', 0)
        active_disputes = vendor_orders.filter(order_status='disputed').count()

        return Response({
            'success': True,
            'data': {
                'stats': {
                    'revenue': {
                        'total': float(total_revenue),
                        'trend': 0,
                        'period': 'all_time'
                    },
                    'sales': {
                        'total': sales_count,
                        'trend': 0,
                        'period': 'all_time'
                    },
                    'listings': {
                        'active': active_listings,
                        'total': total_products,
                        'attention_required': out_of_stock,
                        'under_review': under_review
                    },
                    'balance': {
                        'available': float(balance),
                        'currency': 'USD'
                    },
                    'cases': {
                        'active': active_disputes,
                        'trend': 0
                    }
                },
                'recent_orders': recent_orders,
                'top_products': top_products,
                'recent_messages': recent_messages
            }
        })

    except Exception as e:
        logger.error(f"Error in vendor_dashboard_aggregated: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return Response({
            'success': False, 
            'message': f'Failed to fetch aggregated dashboard data: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)