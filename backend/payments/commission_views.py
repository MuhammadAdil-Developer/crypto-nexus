from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from decimal import Decimal
import logging

from .commission_models import CommissionSettings

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
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get commission earnings history"""
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

