from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from decimal import Decimal
import logging

from .commission_models import CommissionSettings, VendorFee

logger = logging.getLogger(__name__)


class CommissionSettingsView(APIView):
    """Get and update commission settings"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get current commission settings"""
        try:
            settings = CommissionSettings.get_settings()
            
            return Response({
                'success': True,
                'settings': {
                    'platform_fee_rate': float(settings.platform_fee_rate),
                    'escrow_fee_rate': float(settings.escrow_fee_rate),
                    'streaming_commission_rate': float(settings.streaming_commission_rate),
                    'software_commission_rate': float(settings.software_commission_rate),
                    'gaming_commission_rate': float(settings.gaming_commission_rate),
                    'services_commission_rate': float(settings.services_commission_rate),
                    'default_commission_rate': float(settings.default_commission_rate),
                    'min_commission_rate': float(settings.min_commission_rate),
                    'max_commission_rate': float(settings.max_commission_rate),
                    'updated_at': settings.updated_at.isoformat(),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching commission settings: {e}")
            return Response({
                'success': False,
                'error': 'Failed to fetch commission settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Update commission settings"""
        try:
            settings = CommissionSettings.get_settings()
            
            # Update fields if provided
            if 'platform_fee_rate' in request.data:
                settings.platform_fee_rate = Decimal(str(request.data['platform_fee_rate']))
            if 'escrow_fee_rate' in request.data:
                settings.escrow_fee_rate = Decimal(str(request.data['escrow_fee_rate']))
            if 'streaming_commission_rate' in request.data:
                settings.streaming_commission_rate = Decimal(str(request.data['streaming_commission_rate']))
            if 'software_commission_rate' in request.data:
                settings.software_commission_rate = Decimal(str(request.data['software_commission_rate']))
            if 'gaming_commission_rate' in request.data:
                settings.gaming_commission_rate = Decimal(str(request.data['gaming_commission_rate']))
            if 'services_commission_rate' in request.data:
                settings.services_commission_rate = Decimal(str(request.data['services_commission_rate']))
            if 'default_commission_rate' in request.data:
                settings.default_commission_rate = Decimal(str(request.data['default_commission_rate']))
            if 'min_commission_rate' in request.data:
                settings.min_commission_rate = Decimal(str(request.data['min_commission_rate']))
            if 'max_commission_rate' in request.data:
                settings.max_commission_rate = Decimal(str(request.data['max_commission_rate']))
            
            settings.save()
            
            logger.info(f"Commission settings updated by {request.user.username}")
            
            return Response({
                'success': True,
                'message': 'Commission settings updated successfully',
                'settings': {
                    'platform_fee_rate': float(settings.platform_fee_rate),
                    'escrow_fee_rate': float(settings.escrow_fee_rate),
                    'streaming_commission_rate': float(settings.streaming_commission_rate),
                    'software_commission_rate': float(settings.software_commission_rate),
                    'gaming_commission_rate': float(settings.gaming_commission_rate),
                    'services_commission_rate': float(settings.services_commission_rate),
                    'default_commission_rate': float(settings.default_commission_rate),
                    'min_commission_rate': float(settings.min_commission_rate),
                    'max_commission_rate': float(settings.max_commission_rate),
                    'updated_at': settings.updated_at.isoformat(),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating commission settings: {e}")
            return Response({
                'success': False,
                'error': 'Failed to update commission settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CommissionHistoryView(APIView):
    """API for commission earnings history"""
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """Check if user is admin"""
        if not request.user.is_authenticated:
            return False
        # Check if user is admin (either is_staff or user_type == 'admin')
        return request.user.is_staff or getattr(request.user, 'user_type', None) == 'admin'
    
    def get(self, request):
        """Get commission earnings history"""
        if not self.check_permissions(request):
            return Response(
                {'success': False, 'error': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            from .models import Payout, DirectPayment
            from django.db.models import Sum, Count
            from django.utils import timezone
            from datetime import timedelta
            import calendar
            
            # Get query parameters
            period = request.query_params.get('period', 'all')  # all, month, year
            vendor_id = request.query_params.get('vendor_id')
            
            # Calculate date range
            now = timezone.now()
            if period == 'month':
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end_date = now
            elif period == 'year':
                start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                end_date = now
            else:
                start_date = None
                end_date = None
            
            # Build querysets
            escrow_query = Payout.objects.select_related('vendor', 'crypto_currency')
            direct_query = DirectPayment.objects.select_related('vendor', 'crypto_currency')
            
            if start_date and end_date:
                escrow_query = escrow_query.filter(created_at__range=[start_date, end_date])
                direct_query = direct_query.filter(created_at__range=[start_date, end_date])
            
            if vendor_id:
                escrow_query = escrow_query.filter(vendor_id=vendor_id)
                direct_query = direct_query.filter(vendor_id=vendor_id)
            
            # Get commission data
            commission_history = []
            
            try:
                # Process escrow commissions
                escrow_commissions = escrow_query.values('vendor__username', 'crypto_currency__symbol').annotate(
                    total_sales=Sum('gross_amount'),
                    total_commission=Sum('platform_fee'),
                    order_count=Count('id')
                ).order_by('-total_commission')
                
                for item in escrow_commissions:
                    if item['total_sales'] and item['total_commission'] and item['total_sales'] > 0:
                        commission_rate = (item['total_commission'] / item['total_sales']) * 100
                        
                        commission_history.append({
                            'vendor': item['vendor__username'] or 'Unknown Vendor',
                            'period': period.title() if period != 'all' else 'All Time',
                            'total_sales': f"{item['total_sales']:.8f} {item['crypto_currency__symbol'] or 'BTC'}",
                            'commission_rate': f"{commission_rate:.2f}%",
                            'commission_earned': f"{item['total_commission']:.8f} {item['crypto_currency__symbol'] or 'BTC'}",
                            'usd_value': f"${item['total_commission'] * 40000:.2f}",  # Mock USD conversion
                            'status': 'Paid Out',
                            'order_count': item['order_count'],
                            'type': 'escrow'
                        })
            except Exception as e:
                logger.error(f"Error processing escrow commissions: {e}")
            
            try:
                # Process direct payment commissions
                direct_commissions = direct_query.values('vendor__username', 'crypto_currency__symbol').annotate(
                    total_sales=Sum('amount'),
                    total_commission=Sum('platform_fee'),
                    order_count=Count('id')
                ).order_by('-total_commission')
                
                for item in direct_commissions:
                    if item['total_sales'] and item['total_commission'] and item['total_sales'] > 0:
                        commission_rate = (item['total_commission'] / item['total_sales']) * 100
                        
                        commission_history.append({
                            'vendor': item['vendor__username'] or 'Unknown Vendor',
                            'period': period.title() if period != 'all' else 'All Time',
                            'total_sales': f"{item['total_sales']:.8f} {item['crypto_currency__symbol'] or 'BTC'}",
                            'commission_rate': f"{commission_rate:.2f}%",
                            'commission_earned': f"{item['total_commission']:.8f} {item['crypto_currency__symbol'] or 'BTC'}",
                            'usd_value': f"${item['total_commission'] * 40000:.2f}",  # Mock USD conversion
                            'status': 'Paid Out',
                            'order_count': item['order_count'],
                            'type': 'direct'
                        })
            except Exception as e:
                logger.error(f"Error processing direct payment commissions: {e}")
            
            # Sort by commission earned
            try:
                commission_history.sort(key=lambda x: float(x['commission_earned'].split()[0]), reverse=True)
            except Exception as e:
                logger.error(f"Error sorting commission history: {e}")
            
            return Response({
                'success': True,
                'data': commission_history
            })
            
        except Exception as e:
            import traceback
            logger.error(f"Error fetching commission history: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'Failed to fetch commission history: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorFeesView(APIView):
    """Get and update vendor-specific fees"""
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """Check if user is admin"""
        if not request.user.is_authenticated:
            return False
        return request.user.is_staff or getattr(request.user, 'user_type', None) == 'admin'
    
    def get(self, request):
        """Get all vendors with their fees"""
        if not self.check_permissions(request):
            return Response(
                {'success': False, 'error': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Get all vendors
            vendors = User.objects.filter(user_type='vendor', is_active=True).order_by('username')
            
            vendor_fees_data = []
            for vendor in vendors:
                try:
                    vendor_fee = VendorFee.objects.get(vendor=vendor)
                    fee_rate = float(vendor_fee.commission_rate) if vendor_fee.commission_rate else None
                    updated_by = vendor_fee.updated_by.username if vendor_fee.updated_by else None
                    updated_at = vendor_fee.updated_at.isoformat()
                except VendorFee.DoesNotExist:
                    fee_rate = None
                    updated_by = None
                    updated_at = None
                
                vendor_fees_data.append({
                    'vendor_id': str(vendor.id),
                    'vendor_username': vendor.username,
                    'commission_rate': fee_rate,
                    'updated_by': updated_by,
                    'updated_at': updated_at,
                    'uses_default': fee_rate is None
                })
            
            return Response({
                'success': True,
                'data': vendor_fees_data
            })
            
        except Exception as e:
            logger.error(f"Error fetching vendor fees: {e}")
            return Response({
                'success': False,
                'error': f'Failed to fetch vendor fees: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Update vendor-specific fee"""
        if not self.check_permissions(request):
            return Response(
                {'success': False, 'error': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            vendor_id = request.data.get('vendor_id')
            commission_rate = request.data.get('commission_rate')
            
            if not vendor_id:
                return Response({
                    'success': False,
                    'error': 'vendor_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                vendor = User.objects.get(id=vendor_id, user_type='vendor')
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Vendor not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get commission settings for validation
            commission_settings = CommissionSettings.get_settings()
            
            # Validate commission rate
            if commission_rate is not None:
                try:
                    commission_rate = Decimal(str(commission_rate))
                    if commission_rate < commission_settings.min_commission_rate:
                        return Response({
                            'success': False,
                            'error': f'Commission rate must be at least {commission_settings.min_commission_rate}%'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    if commission_rate > commission_settings.max_commission_rate:
                        return Response({
                            'success': False,
                            'error': f'Commission rate must be at most {commission_settings.max_commission_rate}%'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({
                        'success': False,
                        'error': 'Invalid commission rate'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create vendor fee
            vendor_fee, created = VendorFee.objects.get_or_create(
                vendor=vendor,
                defaults={
                    'commission_rate': commission_rate,
                    'updated_by': request.user
                }
            )
            
            if not created:
                vendor_fee.commission_rate = commission_rate
                vendor_fee.updated_by = request.user
                vendor_fee.save()
            
            # Send notification to vendor
            try:
                from shared.models import Notification
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                
                if commission_rate is not None:
                    message = f'Your commission rate has been updated to {commission_rate}% by admin.'
                else:
                    message = f'Your custom commission rate has been removed. You will now use the default platform rate.'
                
                Notification.objects.create(
                    user=vendor,
                    type='system',
                    title='Commission Rate Updated',
                    message=message,
                    data={
                        'commission_rate': float(commission_rate) if commission_rate else None,
                        'updated_by': request.user.username
                    }
                )
                
                # Send real-time notification
                try:
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        async_to_sync(channel_layer.group_send)(
                            f'realtime_{vendor.id}',
                            {
                                'type': 'order_notification',
                                'data': {
                                    'type': 'commission_updated',
                                    'title': 'Commission Rate Updated',
                                    'message': message,
                                    'commission_rate': float(commission_rate) if commission_rate else None
                                }
                            }
                        )
                except Exception as e:
                    logger.error(f"Failed to send real-time notification: {e}")
                    
            except Exception as e:
                logger.error(f"Failed to send notification to vendor: {e}")
            
            logger.info(f"Vendor fee updated for {vendor.username} by {request.user.username}: {commission_rate}%")
            
            return Response({
                'success': True,
                'message': 'Vendor fee updated successfully',
                'data': {
                    'vendor_id': str(vendor.id),
                    'vendor_username': vendor.username,
                    'commission_rate': float(commission_rate) if commission_rate else None,
                    'updated_by': request.user.username,
                    'updated_at': vendor_fee.updated_at.isoformat()
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating vendor fee: {e}")
            return Response({
                'success': False,
                'error': f'Failed to update vendor fee: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorMyFeeView(APIView):
    """Get vendor's own commission fee"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current vendor's commission fee"""
        try:
            vendor = request.user
            
            # Check if user is a vendor
            if getattr(vendor, 'user_type', None) != 'vendor':
                return Response({
                    'success': False,
                    'error': 'Only vendors can access this endpoint'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get commission settings for default rate
            commission_settings = CommissionSettings.get_settings()
            default_rate = float(commission_settings.platform_fee_rate)
            
            # Check for vendor-specific fee
            try:
                vendor_fee = VendorFee.objects.get(vendor=vendor)
                commission_rate = float(vendor_fee.commission_rate) if vendor_fee.commission_rate else None
                uses_default = commission_rate is None
            except VendorFee.DoesNotExist:
                commission_rate = None
                uses_default = True
            
            return Response({
                'success': True,
                'data': {
                    'commission_rate': commission_rate if commission_rate is not None else default_rate,
                    'default_rate': default_rate,
                    'uses_default': uses_default,
                    'is_custom': commission_rate is not None
                }
            })
            
        except Exception as e:
            logger.error(f"Error fetching vendor fee: {e}")
            return Response({
                'success': False,
                'error': f'Failed to fetch vendor fee: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

