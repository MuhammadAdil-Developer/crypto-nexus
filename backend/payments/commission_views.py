from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from users.views import IsAdminUser
from decimal import Decimal
import logging

from .commission_models import CommissionSettings, VendorFee
from .services import PaymentService
from shared.models import CryptoCurrency
from shared.utils import get_client_ip
from .models import AdminWithdrawal

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
                    'auto_sweep_enabled': settings.auto_sweep_enabled,
                    'auto_sweep_btc_address': settings.auto_sweep_btc_address,
                    'auto_sweep_xmr_address': settings.auto_sweep_xmr_address,
                    'auto_sweep_time': settings.auto_sweep_time.strftime('%H:%M'),
                    'auto_sweep_whatsapp_number': settings.auto_sweep_whatsapp_number,
                    'auto_sweep_min_buffer': float(settings.auto_sweep_min_buffer),
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
                rate = Decimal(str(request.data['platform_fee_rate']))
                settings.platform_fee_rate = rate
                # Sync other rates with the main platform rate as per user request to use this as the default
                settings.default_commission_rate = rate
                settings.streaming_commission_rate = rate
                settings.software_commission_rate = rate
                settings.gaming_commission_rate = rate
                settings.services_commission_rate = rate
            
            if 'escrow_fee_rate' in request.data:
                settings.escrow_fee_rate = Decimal(str(request.data['escrow_fee_rate']))
            
            if 'min_commission_rate' in request.data:
                settings.min_commission_rate = Decimal(str(request.data['min_commission_rate']))
            if 'max_commission_rate' in request.data:
                settings.max_commission_rate = Decimal(str(request.data['max_commission_rate']))
            
            # Auto-sweep updates
            if 'auto_sweep_enabled' in request.data:
                settings.auto_sweep_enabled = request.data['auto_sweep_enabled']
            if 'auto_sweep_btc_address' in request.data:
                settings.auto_sweep_btc_address = request.data['auto_sweep_btc_address']
            if 'auto_sweep_xmr_address' in request.data:
                settings.auto_sweep_xmr_address = request.data['auto_sweep_xmr_address']
            if 'auto_sweep_time' in request.data:
                settings.auto_sweep_time = request.data['auto_sweep_time']
            if 'auto_sweep_whatsapp_number' in request.data:
                settings.auto_sweep_whatsapp_number = request.data['auto_sweep_whatsapp_number']
            if 'auto_sweep_min_buffer' in request.data:
                settings.auto_sweep_min_buffer = Decimal(str(request.data['auto_sweep_min_buffer']))
            
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
                    'auto_sweep_enabled': settings.auto_sweep_enabled,
                    'auto_sweep_btc_address': settings.auto_sweep_btc_address,
                    'auto_sweep_xmr_address': settings.auto_sweep_xmr_address,
                    'auto_sweep_time': settings.auto_sweep_time.strftime('%H:%M'),
                    'auto_sweep_whatsapp_number': settings.auto_sweep_whatsapp_number,
                    'auto_sweep_min_buffer': float(settings.auto_sweep_min_buffer),
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
            
            period = request.query_params.get('period', 'all')
            vendor_id = request.query_params.get('vendor_id')
            ps = PaymentService()
            btc_rate = float(ps.get_fiat_to_crypto_rate('BTC', 'USD') or Decimal('98000'))
            xmr_rate = float(ps.get_fiat_to_crypto_rate('XMR', 'USD') or Decimal('165'))
            
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
            payout_query = Payout.objects.select_related('vendor', 'crypto_currency', 'order')
            direct_query = DirectPayment.objects.select_related('vendor', 'crypto_currency', 'order')
            
            if start_date and end_date:
                payout_query = payout_query.filter(created_at__range=[start_date, end_date])
                direct_query = direct_query.filter(created_at__range=[start_date, end_date])
            
            if vendor_id:
                payout_query = payout_query.filter(vendor_id=vendor_id)
                direct_query = direct_query.filter(vendor_id=vendor_id)
            
            # To avoid double counting, find orders that already have a payout
            payout_order_ids = payout_query.values_list('order_id', flat=True)
            
            # Filter direct payments: Only include those NOT in payouts and with successful status
            active_payouts = payout_query.filter(status__in=['completed', 'processing'])
            active_directs = direct_query.filter(status__in=['completed', 'confirmed', 'paid']).exclude(order_id__in=payout_order_ids)
            
            # Get pagination parameters
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 10))
            
            mode = request.query_params.get('mode', 'aggregated')
            
            # Calculate Total Stats (for all filtered data)
            ps = PaymentService()
            supported_cryptos = CryptoCurrency.objects.filter(is_active=True)
            
            total_earnings_usd = Decimal('0')
            total_sales_vol_usd = Decimal('0')
            total_commissions_usd = Decimal('0')
            total_withdrawn_usd = Decimal('0')
            
            from .models import AdminWithdrawal
            withdrawals = AdminWithdrawal.objects.all()
            
            # Get dynamic settings
            settings = CommissionSettings.get_settings()
            global_plat_rate = settings.platform_fee_rate / Decimal('100')
            global_esc_rate = settings.escrow_fee_rate / Decimal('100')
            # Prefetch vendor fees
            vendor_fees = {vf.vendor_id: vf.commission_rate for vf in VendorFee.objects.all()}
            
            # Stable rates
            rates = {}
            for crypto in supported_cryptos:
                r = ps.get_fiat_to_crypto_rate(crypto.symbol) or Decimal('0')
                rates[crypto.symbol] = Decimal(str(r))
            
            # For breakdown
            breakdown_items = []
            platform_commissions_crypto = {crypto.id: Decimal('0') for crypto in supported_cryptos}
            processed_order_ids = set()

            # 1. Process Payouts (completed)
            for payout in active_payouts:
                if payout.order_id and payout.order_id in processed_order_ids:
                    continue
                if payout.order_id:
                    processed_order_ids.add(payout.order_id)
                
                crypto = payout.crypto_currency
                rate = rates.get(crypto.symbol, Decimal('0'))
                
                # Sales volume
                total_sales_vol_usd += payout.gross_amount * rate
                
                # Commissions (using recorded platform_fee)
                total_commissions_usd += payout.platform_fee * rate
                platform_commissions_crypto[crypto.id] += payout.platform_fee

            # 2. Process Direct Payments (completed)
            for direct in active_directs:
                if direct.order_id and direct.order_id in processed_order_ids:
                    continue
                if direct.order_id:
                    processed_order_ids.add(direct.order_id)

                crypto = direct.crypto_currency
                rate = rates.get(crypto.symbol, Decimal('0'))
                
                # Sales volume
                total_sales_vol_usd += direct.amount * rate
                
                # Commissions logic fix:
                # Use vendor-specific rate if available, otherwise global defaults
                v_id = direct.vendor_id
                v_rate_override = vendor_fees.get(v_id)
                
                if v_rate_override is not None:
                    # User said they saved 9%, so we use that directly
                    final_rate_pct = Decimal(str(v_rate_override))
                else:
                    # Default is Platform + Escrow combined
                    final_rate_pct = (global_plat_rate + global_esc_rate) * Decimal('100')
                
                comm_amount = (direct.amount * final_rate_pct) / Decimal('100')
                total_commissions_usd += comm_amount * rate
                platform_commissions_crypto[crypto.id] += comm_amount
            
            # Update breakdown_items based on commissions
            for crypto in supported_cryptos:
                if platform_commissions_crypto[crypto.id] > 0:
                    breakdown_items.append(f"{platform_commissions_crypto[crypto.id].normalize()} {crypto.symbol}")

            # 3. Calculate Pending Obligations (Money in wallet that belongs to vendors)
            from .models import Payout
            pending_payouts = Payout.objects.filter(status__in=['pending', 'failed'])
            pending_obligations_usd = Decimal('0')
            for p in pending_payouts:
                p_rate = rates.get(p.crypto_currency.symbol, Decimal('0'))
                pending_obligations_usd += p.net_amount * p_rate

            # 4. Calculate Total Manual Withdrawals
            for w in withdrawals:
                w_rate = rates.get(w.crypto_currency.symbol, Decimal('0'))
                total_withdrawn_usd += w.amount * w_rate

            # 5. Fetch Real-time Wallet Balances
            wallet_balances = ps.get_realtime_balances()
            btc_wallet = wallet_balances.get('BTC', Decimal('0'))
            xmr_wallet = wallet_balances.get('XMR', Decimal('0'))
            
            wallet_total_usd = (btc_wallet * rates.get('BTC', Decimal('0'))) + (xmr_wallet * rates.get('XMR', Decimal('0')))
            
            # Available Profit (Net) = Total Wallet - Vendor Obligations
            # (Admin withdrawals already reduced the wallet total)
            available_profit_usd = max(Decimal('0'), wallet_total_usd - pending_obligations_usd)
            
            # Lifetime Earnings = Available Profit + Current Obligations (that are actually commissions) + Everything ever withdrawn
            # But let's keep it simple: "Total Commissions" = Lifetime processed commissions
            
            stats = {
                'total_earnings_usd': float(total_commissions_usd), # Lifetime Earnings
                'total_sales_vol': float(total_sales_vol_usd), 
                'total_commissions': float(available_profit_usd), # Available to withdraw now
                'commissions_breakdown': f"{btc_wallet.normalize()} BTC, {xmr_wallet.normalize()} XMR",
                'realtime_btc': float(btc_wallet),
                'realtime_xmr': float(xmr_wallet),
                'pending_obligations_usd': float(pending_obligations_usd),
                'total_withdrawn_usd': float(total_withdrawn_usd),
                'sales_volume_explanation': "Gross Sales Volume (GMV) of all completed orders across the platform."
            }

            if mode == 'detailed':
                # Build list of transaction history from both sources
                transaction_history = []
                
                # 1. Payout transactions
                payout_list = active_payouts.values(
                    'created_at', 'order__order_id', 'vendor__username', 'vendor__id',
                    'gross_amount', 'platform_fee', 'net_amount', 'crypto_currency__symbol',
                    'status', 'payout_type', 'escrow_fee'
                )
                
                for p in payout_list:
                    gross = p['gross_amount'] or Decimal('0')
                    f_plat = p['platform_fee'] or Decimal('0')
                    f_esc = p.get('escrow_fee') or Decimal('0')
                    net = p['net_amount'] or Decimal('0')
                    sym = p['crypto_currency__symbol']
                    v_id = p['vendor__id']
                    
                    # Get dynamic rates
                    v_p_override = vendor_fees.get(v_id)
                    v_p_rate = (v_p_override / Decimal('100')) if v_p_override is not None else global_plat_rate
                    
                    # Force calculation for display if zero
                    if f_plat <= 0 and gross > 0: f_plat = gross * v_p_rate
                    if f_esc <= 0 and gross > 0: f_esc = gross * global_esc_rate
                    
                    # Total platform earnings is both
                    fee = f_plat + f_esc
                    
                    if net <= 0 and gross > 0:
                        nw_fee = Decimal('0.0000025') if sym == 'BTC' else Decimal('0.0001')
                        net = gross - fee - nw_fee
                        if net < 0: net = Decimal('0')
                    
                    rate = (fee / gross * 100) if gross > 0 else Decimal('0')
                    
                    transaction_history.append({
                        'date': p['created_at'].isoformat(),
                        'order_id': p['order__order_id'],
                        'vendor': p['vendor__username'],
                        'type': p['payout_type'].title(),
                        'total_sales': f"{gross:.8f} {sym}",
                        'commission_rate': f"{rate:.2f}%",
                        'platform_earnings': f"{fee:.8f} {sym}",
                        'vendor_earnings': f"-{net:.8f} {sym}",
                        'status': p['status'].replace('_', ' ').title(),
                        'sort_date': p['created_at'],
                        'is_payout': True
                    })
                
                # 2. Direct transactions (Only those not in payouts)
                # We reuse the active_directs queryset prepared above
                direct_list = active_directs.values(
                    'created_at', 'order__order_id', 'vendor__username', 'vendor__id',
                    'amount', 'platform_fee', 'net_amount', 'crypto_currency__symbol',
                    'status', 'escrow_fee'
                )
                
                for d in direct_list:
                    amount = d['amount'] or Decimal('0') # Expected amount
                    f_plat = d['platform_fee'] or Decimal('0')
                    f_esc = d.get('escrow_fee') or Decimal('0')
                    net = d['net_amount'] or Decimal('0')
                    sym = d['crypto_currency__symbol']
                    v_id = d['vendor__id']
                    
                    # Commissions logic fix:
                    # Use vendor-specific rate if available, otherwise global defaults
                    v_p_override = vendor_fees.get(v_id)
                    
                    if v_p_override is not None:
                        # User said they saved 9%, so we use that directly for EVERYTHING (no extra escrow fee)
                        v_rate_pct = Decimal(str(v_p_override))
                        fee = (amount * v_rate_pct) / Decimal('100')
                    else:
                        # Fallback to Platform + Escrow combined
                        total_rate_pct = (global_plat_rate + global_esc_rate) * Decimal('100')
                        fee = (amount * total_rate_pct) / Decimal('100')
                        
                    rate = (fee / amount * 100) if amount > 0 else Decimal('0')
                    transaction_history.append({
                        'date': d['created_at'].isoformat(),
                        'order_id': d['order__order_id'],
                        'vendor': d['vendor__username'],
                        'type': 'Direct Payment',
                        'total_sales': f"{amount:.8f} {sym}",
                        'commission_rate': f"{rate:.2f}%",
                        'platform_earnings': f"{fee:.8f} {sym}",
                        'vendor_earnings': f"-{net:.8f} {sym}", # Show as negative/deduction for clarity
                        'status': d['status'].replace('_', ' ').title(),
                        'sort_date': d['created_at'],
                        'is_payout': True 
                    })
                    
                # 3. Manual Withdrawals (Admin)
                for w in withdrawals:
                    sym = w.crypto_currency.symbol
                    transaction_history.append({
                        'date': w.created_at.isoformat(),
                        'order_id': 'WITHDRAWAL',
                        'vendor': f"Internal ({w.admin.username})",
                        'type': 'Manual Withdrawal',
                        'total_sales': f"-{w.amount:.8f} {sym}",
                        'commission_rate': 'N/A',
                        'platform_earnings': f"-{w.amount:.8f} {sym}",
                        'vendor_earnings': f"0.00 {sym}",
                        'status': 'Withdrawal Logged',
                        'sort_date': w.created_at,
                        'ip_address': w.ip_address,
                        'notes': w.notes,
                        'is_withdrawal': True
                    })

                # Sort by date
                transaction_history.sort(key=lambda x: x['sort_date'], reverse=True)
                
                # Pagination
                total_count = len(transaction_history)
                start = (page - 1) * limit
                end = start + limit
                paginated_history = transaction_history[start:end]
                
                # Remove sort_date before sending to frontend
                for item in paginated_history:
                    if 'sort_date' in item:
                        del item['sort_date']

                return Response({
                    'success': True,
                    'data': paginated_history,
                    'total': total_count,
                    'page': page,
                    'limit': limit,
                    'total_pages': (total_count + limit - 1) // limit,
                    'mode': 'detailed',
                    'stats': stats
                })

            # ... (keep existing aggregated logic for else block) ...
            
            # Get commission data (Aggregated)
            commission_history = []
            
            # Get commission data (Aggregated)
            commission_history = []
            
            try:
                # Group by vendor and currency for the summary table
                # We combine both sources and then aggregate in Python to simplify the exclusion logic
                
                # 1. Payout stats - Iterate to apply estimation logic
                p_items = active_payouts.values('vendor__username', 'vendor__id', 'crypto_currency__symbol', 'platform_fee', 'escrow_fee', 'net_amount', 'gross_amount')
                
                # 2. Direct stats - Iterate to apply estimation logic
                d_items = active_directs.values('vendor__username', 'vendor__id', 'crypto_currency__symbol', 'platform_fee', 'escrow_fee', 'net_amount', 'amount')
                
                # Merge logic
                merged_data = {}
                
                for item in p_items:
                    key = (item['vendor__username'], item['crypto_currency__symbol'])
                    sales = item['gross_amount'] or Decimal('0')
                    f_plat = item['platform_fee'] or Decimal('0')
                    f_esc = item.get('escrow_fee') or Decimal('0')
                    net = item['net_amount'] or Decimal('0')
                    v_id = item['vendor__id']
                    
                    # Commissions logic fix
                    v_p_override = vendor_fees.get(v_id)
                    if v_p_override is not None:
                        # User said they saved 9%, so we use that directly for EVERYTHING
                        v_rate_pct = Decimal(str(v_p_override))
                        fee = (sales * v_rate_pct) / Decimal('100')
                    else:
                        # Fallback to Platform + Escrow combined
                        total_rate_pct = (global_plat_rate + global_esc_rate) * Decimal('100')
                        fee = (sales * total_rate_pct) / Decimal('100')
                    
                    if net <= 0 and sales > 0: 
                        net = sales - fee - Decimal('0.0000025')
                    if net < 0: net = Decimal('0')
                    
                    if key not in merged_data:
                        merged_data[key] = {'total_sales': Decimal('0'), 'total_commission': Decimal('0'), 'total_vendor_earnings': Decimal('0'), 'order_count': 0}
                    
                    merged_data[key]['total_sales'] += sales
                    merged_data[key]['total_commission'] += fee
                    merged_data[key]['total_vendor_earnings'] += net
                    merged_data[key]['order_count'] += 1
                    
                for item in d_items:
                    key = (item['vendor__username'], item['crypto_currency__symbol'])
                    sales = item['amount'] or Decimal('0')
                    f_plat = item['platform_fee'] or Decimal('0')
                    f_esc = item.get('escrow_fee') or Decimal('0')
                    net = item['net_amount'] or Decimal('0')
                    v_id = item['vendor__id']
                    
                    # Commissions logic fix
                    v_p_override = vendor_fees.get(v_id)
                    if v_p_override is not None:
                        # User said they saved 9%, so we use that directly for EVERYTHING
                        v_rate_pct = Decimal(str(v_p_override))
                        fee = (sales * v_rate_pct) / Decimal('100')
                    else:
                        # Fallback to Platform + Escrow combined
                        total_rate_pct = (global_plat_rate + global_esc_rate) * Decimal('100')
                        fee = (sales * total_rate_pct) / Decimal('100')
                    
                    if net <= 0 and sales > 0: 
                        net = sales - fee - Decimal('0.0000025')
                    if net < 0: net = Decimal('0')
                    
                    if key not in merged_data:
                        merged_data[key] = {'total_sales': Decimal('0'), 'total_commission': Decimal('0'), 'total_vendor_earnings': Decimal('0'), 'order_count': 0}
                    
                    merged_data[key]['total_sales'] += sales
                    merged_data[key]['total_commission'] += fee
                    merged_data[key]['total_vendor_earnings'] += net
                    merged_data[key]['order_count'] += 1

                for key, data in merged_data.items():
                    vendor_name, sym = key
                    if data['total_sales'] > 0:
                        total_commission = data['total_commission']
                        total_vendor = data['total_vendor_earnings']
                        commission_rate = (total_commission / data['total_sales']) * 100
                        
                        sym = sym or 'BTC'
                        rate = rates.get(sym, Decimal('0'))
                        
                        commission_history.append({
                            'vendor': vendor_name or 'Unknown Vendor',
                            'period': period.title() if period != 'all' else 'All Time',
                            'total_sales': f"{data['total_sales']:.8f} {sym}",
                            'commission_rate': f"{commission_rate:.2f}%",
                            'platform_earnings': f"{total_commission:.8f} {sym}",
                            'platform_earnings_usd': f"${total_commission * rate:.2f}",
                            'vendor_earnings': f"{total_vendor:.8f} {sym}",
                            'vendor_earnings_usd': f"${total_vendor * rate:.2f}",
                            'status': 'Processed',
                            'order_count': data['order_count'],
                            'type': 'Combined'
                        })
            except Exception as e:
                logger.error(f"Error processing aggregated commissions: {e}")
            
            # Get pagination parameters
            # page = int(request.query_params.get('page', 1)) # Already got above
            # limit = int(request.query_params.get('limit', 10)) # Already got above
            
            # Sort by commission earned
            try:
                commission_history.sort(key=lambda x: float(x['commission_earned'].split()[0]), reverse=True)
            except Exception as e:
                logger.error(f"Error sorting commission history: {e}")
            
            total_count = len(commission_history)
            start = (page - 1) * limit
            end = start + limit
            paginated_history = commission_history[start:end]
            
            return Response({
                'success': True,
                'data': paginated_history,
                'total': total_count,
                'page': page,
                'limit': limit,
                'total_pages': (total_count + limit - 1) // limit,
                'stats': stats
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
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get all vendors with their fees"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Get all vendors
            vendors = User.objects.filter(user_type='vendor', is_active=True).order_by('username')
            
            # Get pagination parameters
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 10))
            
            total_count = vendors.count()
            start = (page - 1) * limit
            end = start + limit
            page_qs = vendors[start:end]
            
            vendor_fees_data = []
            for vendor in page_qs:
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
                'data': vendor_fees_data,
                'total': total_count,
                'page': page,
                'limit': limit,
                'total_pages': (total_count + limit - 1) // limit
            })
            
        except Exception as e:
            logger.error(f"Error fetching vendor fees: {e}")
            return Response({
                'success': False,
                'error': f'Failed to fetch vendor fees: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Update vendor-specific fee"""
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
            
            # Define notification message
            if commission_rate is not None:
                message = f'Your commission rate has been updated to {commission_rate}% by admin.'
            else:
                message = f'Your custom commission rate has been removed. You will now use the default platform rate.'

            # Notify vendor via central helper (respects preferences)
            try:
                from shared.admin_notifications import send_user_notification
                send_user_notification(
                    user=vendor,
                    notification_type='payment',
                    title='Commission Rate Updated',
                    message=message,
                    data={
                        'commission_rate': float(commission_rate) if commission_rate else None,
                        'updated_by': request.user.username,
                        'type': 'commission_updated'
                    }
                )
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
            
            # Always return a valid commission_rate (never null)
            final_rate = commission_rate if commission_rate is not None else default_rate
            logger.info(f"Vendor {vendor.username} fee: {final_rate}% (custom: {commission_rate}%, default: {default_rate}%, uses_default: {uses_default})")
            
            return Response({
                'success': True,
                'data': {
                    'commission_rate': final_rate,  # Always a number, never null
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

class AdminWithdrawalLookupView(APIView):
    """Lookup data for admin withdrawals"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        cryptos = CryptoCurrency.objects.filter(is_active=True)
        return Response({
            'success': True,
            'cryptos': [{'id': str(c.id), 'symbol': c.symbol, 'name': c.name} for c in cryptos]
        })

class AdminWithdrawalView(APIView):
    """Log a manual withdrawal of platform earnings by an admin"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        try:
            data = request.data
            amount = data.get('amount')
            crypto_symbol = data.get('crypto_currency') 
            destination = data.get('destination_address')
            notes = data.get('notes', '')
            password = data.get('password')
            
            # 1. SECURITY: Check password
            if not password:
                return Response({'success': False, 'error': 'Password is required for authorization'}, status=401)
            
            if not request.user.check_password(password):
                return Response({'success': False, 'error': 'Invalid admin password'}, status=401)

            if not all([amount, crypto_symbol, destination]):
                return Response({
                    'success': False,
                    'error': 'Amount, cryptocurrency, and destination address are required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                crypto = CryptoCurrency.objects.get(symbol=crypto_symbol)
            except CryptoCurrency.DoesNotExist:
                return Response({'success': False, 'error': 'Invalid crypto currency'}, status=400)
            
            # 2. PERFORM BROADCAST
            from .services import PaymentService
            payment_service = PaymentService()
            
            actual_tx_hash = None
            
            if crypto_symbol == 'BTC':
                payout_data = {
                    'destination': destination,
                    'amount': str(amount)
                }
                result = payment_service.btcpay.create_payout(payout_data)
                if result and result.get('transactionHash'):
                    actual_tx_hash = result.get('transactionHash')
                else:
                    return Response({
                        'success': False, 
                        'error': 'BTCPay failed to broadcast transaction. This may be due to insufficient balance or connection issues.'
                    }, status=400)
            
            elif crypto_symbol == 'XMR':
                # Convert amount to atomic units (10^12)
                atomic_amount = int(Decimal(str(amount)) * Decimal('1000000000000'))
                destinations = [{'address': destination, 'amount': atomic_amount}]
                result = payment_service.monero.send_transaction(destinations)
                if result and result.get('tx_hash'):
                    actual_tx_hash = result.get('tx_hash')
                else:
                    return Response({
                        'success': False, 
                        'error': 'Monero RPC failed to broadcast transaction. Ensure the wallet is unlocked and has sufficient balance.'
                    }, status=400)
            else:
                return Response({'success': False, 'error': f'Withdrawals for {crypto_symbol} are not implemented yet'}, status=400)
            
            # 3. LOG SUCCESSFUL WITHDRAWAL
            withdrawal = AdminWithdrawal.objects.create(
                admin=request.user,
                amount=Decimal(str(amount)),
                crypto_currency=crypto,
                ip_address=get_client_ip(request),
                transaction_hash=actual_tx_hash,
                destination_address=destination,
                notes=notes,
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            logger.info(f"ADMIN WITHDRAWAL: {request.user.username} SENT {amount} {crypto.symbol} to {destination}. TX: {actual_tx_hash}")
            
            return Response({
                'success': True,
                'message': f'Funds sent successfully! TX: {actual_tx_hash}',
                'tx_hash': actual_tx_hash,
                'withdrawal_id': str(withdrawal.id)
            })
            
        except Exception as e:
            logger.error(f"Error processing admin withdrawal: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

