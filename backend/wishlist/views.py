from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Wishlist, WishlistNotification
from .serializers import WishlistSerializer, WishlistNotificationSerializer, WishlistStatsSerializer
from products.models import Product
from shared.models import Notification
import logging

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_view(request):
    """Handle wishlist operations"""
    if request.method == 'GET':
        # Get user's wishlist
        try:
            wishlist_items = Wishlist.objects.filter(user=request.user).select_related('product', 'product__vendor')
            serializer = WishlistSerializer(wishlist_items, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Error fetching wishlist: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to fetch wishlist'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        # Add item to wishlist
        try:
            product_id = request.data.get('product_id')
            if not product_id:
                return Response({
                    'success': False,
                    'message': 'Product ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            product = get_object_or_404(Product, id=product_id)
            
            # Check if already in wishlist
            wishlist_item, created = Wishlist.objects.get_or_create(
                user=request.user,
                product=product
            )
            
            if created:
                # Notify vendor about new wishlist addition via central helper
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=product.vendor,
                    notification_type='wishlist',
                    title='Product Added to Wishlist',
                    message=f"{request.user.username} added your product '{product.headline}' to their wishlist",
                    data={'product_id': str(product.id), 'buyer_id': str(request.user.id)}
                )
                
                return Response({
                    'success': True,
                    'message': 'Product added to wishlist',
                    'data': WishlistSerializer(wishlist_item).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'message': 'Product already in wishlist'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error adding to wishlist: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to add product to wishlist'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        # Remove item from wishlist
        try:
            product_id = request.data.get('product_id')
            if not product_id:
                return Response({
                    'success': False,
                    'message': 'Product ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            wishlist_item = get_object_or_404(Wishlist, user=request.user, product_id=product_id)
            wishlist_item.delete()
            
            return Response({
                'success': True,
                'message': 'Product removed from wishlist'
            })
            
        except Exception as e:
            logger.error(f"Error removing from wishlist: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to remove product from wishlist'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wishlist_stats(request):
    """Get wishlist statistics"""
    try:
        wishlist_items = Wishlist.objects.filter(user=request.user).select_related('product')
        
        total_items = wishlist_items.count()
        in_stock_items = wishlist_items.filter(product__quantity_available__gt=0).count()
        out_of_stock_items = total_items - in_stock_items
        
        # Calculate total value (this is a simplified calculation)
        total_value = 0.0
        for item in wishlist_items:
            if item.product.price:
                try:
                    total_value += float(item.product.price)
                except (ValueError, TypeError):
                    continue
        
        # Price drops (this would need to be tracked over time)
        price_drops = 0  # TODO: Implement price drop tracking
        
        stats = {
            'total_items': total_items,
            'in_stock_items': in_stock_items,
            'out_of_stock_items': out_of_stock_items,
            'price_drops': price_drops,
            'total_value': total_value
        }
        
        serializer = WishlistStatsSerializer(stats)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error fetching wishlist stats: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch wishlist statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_wishlist_count(request, product_id):
    """Get wishlist count for a specific product"""
    try:
        count = Wishlist.objects.filter(product_id=product_id).count()
        
        return Response({
            'success': True,
            'data': {
                'product_id': product_id,
                'wishlist_count': count
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching wishlist count: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch wishlist count'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_wishlist_stats(request):
    """Get wishlist statistics for vendor's products"""
    try:
        if not hasattr(request.user, 'user_type') or request.user.user_type != 'vendor':
            return Response({
                'success': False,
                'message': 'Vendor access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get wishlist counts for vendor's products
        vendor_products = Product.objects.filter(vendor=request.user)
        wishlist_counts = []
        
        for product in vendor_products:
            count = Wishlist.objects.filter(product=product).count()
            wishlist_counts.append({
                'product_id': product.id,
                'product_title': product.headline,
                'wishlist_count': count
            })
        
        return Response({
            'success': True,
            'data': wishlist_counts
        })
        
    except Exception as e:
        logger.error(f"Error fetching vendor wishlist stats: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to fetch vendor wishlist statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wishlist_notifications(request):
    """Handle wishlist notifications"""
    if request.method == 'GET':
        try:
            notifications = WishlistNotification.objects.filter(
                user=request.user
            ).select_related('product').order_by('-created_at')
            
            serializer = WishlistNotificationSerializer(notifications, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error fetching wishlist notifications: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to fetch notifications'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        try:
            notification_id = request.data.get('notification_id')
            if not notification_id:
                return Response({
                    'success': False,
                    'message': 'Notification ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            notification = get_object_or_404(WishlistNotification, id=notification_id, user=request.user)
            notification.is_read = True
            notification.save()
            
            return Response({
                'success': True,
                'message': 'Notification marked as read'
            })
            
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to mark notification as read'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
