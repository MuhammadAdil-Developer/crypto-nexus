from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from decimal import Decimal
import logging

from .services import PayoutService, get_btc_estimated_miner_fee_btc, PaymentService
from .models import DirectPayment

logger = logging.getLogger(__name__)

@shared_task
def daily_profit_sweep_task():
    """Daily task to sweep platform earnings to admin personal wallets"""
    from django.core.management import call_command
    try:
        logger.info("🚀 Starting daily profit sweep task...")
        call_command('profit_sweep')
        return "Profit sweep command executed successfully"
    except Exception as e:
        logger.error(f"❌ Error in daily_profit_sweep_task: {e}")
        return f"Error: {str(e)}"

# ============================================================
# PAYOUT HELPER FUNCTIONS
# ============================================================
def _is_valid_payout_hash(h):
    """Check if a string is a valid outbound payout hash (vs an internal anchor)"""
    if not h or len(h) < 10:
        return False
    # 1. Internal fallback prefixes (fallback hashes we generated)
    if h.startswith('btc_payout_') or h.startswith('xmr_payout_'):
        return True
    # 2. Blockchain TXIDs (64-character hex strings)
    # This is standard for BTC and XMR transaction IDs.
    if len(h) == 64 and all(c in '0123456789abcdefABCDEF' for c in h):
        return True
    # Task ID anchor for processing
    if h.startswith('processing_task_'):
        return False # Not a finished payout hash
    return False

def _is_task_anchor(h):
    """Check if a string is a temporary task processing anchor"""
    return h and h.startswith('processing_task_')

@shared_task
def auto_release_escrow_payouts():
    """Task to check for escrow payments that need auto-release"""
    try:
        from .models import EscrowPayment
        from orders.models import Order
        
        # Find all funded escrows with auto_release enabled that have passed the deadline
        overdue_escrows = EscrowPayment.objects.filter(
            status='funded',
            auto_release_enabled=True,
            auto_release_at__lte=timezone.now()
        )
        
        for escrow in overdue_escrows:
            try:
                # CRITICAL: Postpone next auto-release attempt immediately to avoid task spamming
                # This prevents the minute-by-minute crontab from queuing 60 tasks while waiting 
                # for the first one to finish or for confirmations to arrive.
                escrow.auto_release_at = timezone.now() + timedelta(minutes=60)
                escrow.save()
                
                logger.info(f"Auto-releasing escrow for order {escrow.payment_address.order_id}")
                from .tasks import release_escrow_task
                release_escrow_task.delay(escrow.payment_address.order_id, None)
            except Exception as e:
                logger.error(f"Error auto-releasing escrow {escrow.id}: {str(e)}")
                
        return f"Processed {overdue_escrows.count()} overdue escrows"
    except Exception as e:
        logger.error(f"Error in auto_release_escrow_payouts: {str(e)}")
        return str(e)


@shared_task
def retry_pending_refund_payouts():
    """
    Safety-net task: finds any refund Payouts stuck in 'pending' or 'failed'
    state and re-queues process_payout_task for them.
    
    Runs every 5 minutes. Handles the case where:
    - The initial process_payout_task.delay() was missed (e.g. old code bug)
    - The task failed silently and wasn't retried
    - Escrow orders whose PaymentAddress is 'refunded' and no longer polled
    """
    try:
        from .models import Payout
        
        # Find refund payouts stuck in pending/failed for more than 2 minutes
        cutoff = timezone.now() - timedelta(minutes=2)
        stuck_refunds = Payout.objects.filter(
            payout_type='refund',
            status__in=['pending', 'failed'],
            created_at__lt=cutoff
        )
        
        count = 0
        for payout in stuck_refunds:
            try:
                process_payout_task.delay(str(payout.id))
                logger.info(f"REFUND RETRY: Re-queued payout {payout.id} for order {payout.order.order_id} (status={payout.status})")
                count += 1
            except Exception as e:
                logger.error(f"REFUND RETRY: Failed to re-queue payout {payout.id}: {e}")
        return f"Retried {count} stuck refund payouts"
    except Exception as e:
        logger.error(f"Error in retry_pending_refund_payouts: {str(e)}")
        return str(e)


@shared_task
def check_direct_payment_status():
    """Trigger background monitoring tasks for all pending orders"""
    try:
        from .models import DirectPayment, PaymentAddress
        from django.db.models import Q, F
        from datetime import datetime, timedelta
        
        window = timezone.now() - timedelta(hours=24) # Monitor last 24 hours as requested
        cooldown = timezone.now() - timedelta(minutes=10) # Don't re-queue if checked in last 10 mins
        
        # 1. Trigger tasks for Direct Payments
        # ONLY if status is NOT 'processing' (someone else is busy) 
        # AND (it's older than cooldown OR very new but hasn't been updated yet)
        payments = DirectPayment.objects.filter(
            Q(status__in=['pending', 'confirmed']), # Skip 'processing' and 'completed'
            created_at__gt=window
        ).filter(
            Q(updated_at__lt=cooldown) | Q(updated_at=F('created_at')) 
        )
        for p in payments:
            monitor_individual_payment.delay(p.id)
            
        # 2. Trigger tasks for Escrow/Subaddresses
        addresses = PaymentAddress.objects.filter(
            status__in=['pending', 'processing', 'partial'],
            created_at__gt=window
        ).filter(
            Q(updated_at__lt=cooldown) | Q(created_at__gt=timezone.now() - timedelta(minutes=5))
        )
        for pa in addresses:
            monitor_individual_address.delay(pa.id)
            
        return f"Triggered {payments.count() + addresses.count()} tasks (Capped by cooldown)"
    except Exception as e:
        logger.error(f"Error triggering monitor tasks: {e}")
        return str(e)

@shared_task
def monitor_individual_payment(payment_id):
    """Background task to monitor a single direct payment"""
    try:
        from .models import DirectPayment
        from .direct_payment_monitor import direct_payment_monitor
        import uuid
        
        # Try finding by UUID (Primary Key)
        p = DirectPayment.objects.filter(id=payment_id).first()
        
        # FALLBACK: If not found and input looks like an order_id, try searching by order__order_id
        if not p and isinstance(payment_id, str) and payment_id.startswith('ORD-'):
            p = DirectPayment.objects.filter(order__order_id=payment_id).first()
            
        if not p:
            return f"Skipped: Payment record {payment_id} not found"
        
        if p.status in ['completed', 'failed']: return "Skipped completed"
        
        # Update the timestamp so the cooldown logic knows we just checked this
        from django.utils import timezone
        p.updated_at = timezone.now()
        p.save(update_fields=['updated_at'])
        
        current_height = direct_payment_monitor._get_current_btc_height()
        if p.crypto_currency.symbol == 'BTC':
            direct_payment_monitor._monitor_btc_payment(p, current_height)
        elif p.crypto_currency.symbol == 'XMR':
            direct_payment_monitor._monitor_xmr_payment(p)
            
        return f"Finished monitoring {p.order.order_id}"
    except Exception as e:
        logger.error(f"Error in monitor_individual_payment: {e}")
        return str(e)

@shared_task
def monitor_individual_address(address_id):
    """Background task to monitor a single payment address"""
    try:
        from .models import PaymentAddress
        from .services import PaymentService
        pa = PaymentAddress.objects.get(id=address_id)
        PaymentService().check_payment_status(pa.order_id)
        return f"Checked address {pa.order_id}"
    except Exception as e:
        # Avoid logger spam for missing/broken data
        return str(e)


@shared_task
def create_escrow_payout(order_id: str):
    """Task to initialize escrow payout record when payment is confirmed"""
    try:
        from orders.models import Order
        from django.db.models import Q
        from .models import EscrowPayment, PaymentAddress
        
        order = Order.objects.get(order_id=order_id)
        payment_address = PaymentAddress.objects.filter(
            Q(order_id=order_id) | Q(linked_order_ids__contains=order_id)
        ).first()

        if not payment_address:
            logger.error(f"Payment address not found for order {order_id} during escrow creation")
            return f"Error: No payment address for {order_id}"
        
        # Create escrow payment record
        escrow, created = EscrowPayment.objects.get_or_create(
            payment_address=payment_address,
            defaults={
                'buyer': order.buyer,
                'vendor': order.vendor,
                'escrow_amount': payment_address.received_amount,
                'escrow_fee': payment_address.received_amount * Decimal('0.02'), # 2% escrow fee
                'status': 'funded', # Since we created it after payment was confirmed
                'auto_release_at': timezone.now() + timedelta(hours=48) # Default 2 days for auto-release
            }
        )
        
        logger.info(f"Escrow record created/updated for order {order_id}")
        return f"Escrow created for order {order_id}"
    except Exception as e:
        logger.error(f"Error creating escrow payout for order {order_id}: {str(e)}")
        return str(e)


@shared_task
def release_escrow_task(order_id: str, released_by_id: str = None):
    """Task to process escrow release to vendor"""
    try:
        from orders.models import Order
        from .services import PaymentService
        
        payment_service = PaymentService()
        # release_escrow returns boolean
        success = payment_service.release_escrow(order_id, released_by_id)
        
        if success:
            logger.info(f"Escrow released successfully for order {order_id}")
            return {'success': True}
        else:
            error_msg = f"Failed to release escrow for order {order_id}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
    except Exception as e:
        logger.error(f"Error in release_escrow_task for order {order_id}: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task(bind=True, max_retries=15, default_retry_delay=300)
def process_payout_task(self, payout_id: str):
    """Task to process a generic payout (escrow, direct, or refund)"""
    try:
        from .services import PayoutService
        from .models import Payout
        
        payout_service = PayoutService()
        payout = Payout.objects.get(id=payout_id)
        
        success = payout_service.process_escrow_payout(payout_id)
        if success:
            logger.info(f"Payout {payout_id} processed successfully")
            return {'success': True}
        else:
            # Check if we should retry (likely for Monero locked funds)
            if payout.crypto_currency.symbol == 'XMR' and self.request.retries < self.max_retries:
                logger.warning(f"XMR Payout {payout_id} failed (likely locked funds), retrying in 5 minutes...")
                raise self.retry(countdown=300)
            
            logger.error(f"Failed to process payout {payout_id}")
            return {'success': False, 'error': "Payout processing failed"}
    except Payout.DoesNotExist:
        logger.error(f"Payout {payout_id} not found")
        return {'success': False, 'error': "Payout not found"}
    except Exception as e:
        # Catch the retry exception and re-raise it
        from celery.exceptions import Retry
        if isinstance(e, Retry):
            raise e
            
        logger.error(f"Error in process_payout_task for payout {payout_id}: {str(e)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=300)
        return {'success': False, 'error': str(e)}


@shared_task(bind=True, max_retries=15, default_retry_delay=300)  # Retry up to 15 times, 5 min apart
def process_non_escrow_payout(self, order_id: str, is_settled: bool = False):
    """Process non-escrow order payout - calculate fees and send to vendor"""
    try:
        from orders.models import Order
        from .models import DirectPayment, PaymentAddress
        
        
        order = Order.objects.get(order_id=order_id)
        
        task_start_time = timezone.now()
        
        # CRITICAL SAFETY: If order is already refunded, STOP.
        if order.order_status == 'refunded' or order.payment_status == 'refunded':
            logger.warning(f"Aborting payout for order {order_id}: Already marked as REFUNDED.")
            # Ensure DirectPayment status is also synced if it exists
            DirectPayment.objects.filter(order=order).update(status='refunded')
            return f"Order {order_id} already refunded - payout aborted"
        
        # Get payment address (Account for bulk orders where this order might be a linked member)
        from django.db.models import Q
        payment_address = PaymentAddress.objects.filter(
            Q(order_id=order_id) | Q(linked_order_ids__contains=order_id)
        ).first()
        
        if not payment_address:
            logger.error(f"Payment address not found for order {order_id} (searched anchor and links)")
            return f"Payment address not found for order {order_id}"
            
        # Get vendor payout address from profile
        vendor = order.product.vendor
        crypto_symbol = payment_address.crypto_currency.symbol
        vendor_payout_address = None
        
        if crypto_symbol == 'BTC':
            vendor_payout_address = vendor.btc_payout_address
        elif crypto_symbol == 'XMR':
            vendor_payout_address = vendor.xmr_payout_address
            
        if not vendor_payout_address:
            logger.error(f"Vendor {vendor.username} has no {crypto_symbol} payout address configured.")
            
        # ============================================================
        # EXCLUSIVE IDEMPOTENCY LOCK: Start with a strict atomic block
        # ============================================================
        with transaction.atomic():
            # 1. Acquire an exclusive lock on the ORDER first. 
            # This prevents any other task for the same order from proceeding past this point.
            # Using select_for_update ensures we wait for any existing transaction on this order to finish.
            order = Order.objects.select_for_update().get(order_id=order_id)
            
            # 2. Get or create the DirectPayment record
            direct_payment, created = DirectPayment.objects.get_or_create(
                order=order,
                defaults={
                    'vendor': vendor,
                    'buyer': order.buyer,
                    'crypto_currency': payment_address.crypto_currency,
                    'amount': order.total_amount,
                    'vendor_address': vendor_payout_address or "MISSING_ADDRESS",
                    'status': 'pending',
                    'platform_fee': Decimal('0'),
                    'escrow_fee': Decimal('0'),
                    'net_amount': Decimal('0')
                }
            )
            
            # 3. Lock the DirectPayment record specifically and fetch fresh state
            direct_payment = DirectPayment.objects.select_for_update().get(id=direct_payment.id)
            
            status_at_start = direct_payment.status
            my_anchor = f"processing_task_{self.request.id}" if self.request.id else "processing_task_manual"
            
            # 4. CRITICAL STATE CHECKS
            # If already completed, STOP IMMEDIATELY.
            if direct_payment.status == 'completed' or (direct_payment.transaction_hash and not direct_payment.transaction_hash.startswith('processing_task_')):
                tx_display = direct_payment.transaction_hash[:10] if direct_payment.transaction_hash else "None"
                logger.info(f"✅ IDEMPOTENCY: Order {order_id} already PAID (status: {direct_payment.status}, TX: {tx_display}...). Aborting.")
                return f"Order {order_id} - already completed"
            
            # If currently processing by another task
            if direct_payment.status == 'processing':
                anchor = direct_payment.transaction_hash
                if anchor and anchor.startswith('processing_task_'):
                    if anchor != my_anchor:
                        # Only allow overwrite if the anchor is very old (15 mins)
                        if _is_task_anchor(anchor) and direct_payment.updated_at > timezone.now() - timedelta(minutes=15):
                            logger.warning(f"⏳ CONCURRENCY: Order {order_id} is being handled by Task {anchor}. We are {my_anchor}. Aborting.")
                            return f"Order {order_id} - already in progress (Task {anchor})"
                
            # 5. Mark as processing with our anchor
            direct_payment.status = 'processing'
            direct_payment.transaction_hash = my_anchor
            direct_payment.updated_at = timezone.now()
            direct_payment.save(update_fields=['status', 'transaction_hash', 'updated_at'])
            
            logger.info(f"🔒 [LOCK ACQUIRED] Order {order_id}: Task {my_anchor} now owns the payout process. Status at start was {status_at_start}.")
        
        # CRITICAL: If this is an existing payment, verify fees were calculated correctly
        if not created:
            # Check if fees were already calculated by webhook
            if direct_payment.platform_fee > 0 and direct_payment.net_amount < direct_payment.amount:
                # Verify amount is received_amount, not expected_amount
                if direct_payment.amount > payment_address.received_amount > 0:
                    logger.warning(f"Updating to received_amount and recalculating fees...")
                    direct_payment.amount = payment_address.received_amount
                    created = False  # Force recalculation with correct amount
                else:
                    # Skip fee calculation, use existing values
                    if direct_payment.status not in ['completed', 'processing']:
                        pass
            elif direct_payment.platform_fee == 0 or direct_payment.net_amount >= direct_payment.amount:
                # Force recalculation
                created = False  # Will trigger fee recalculation below

        if not vendor_payout_address or vendor_payout_address == "MISSING_ADDRESS":
             return f"Vendor {vendor.username} has no {crypto_symbol} payout address. Payout held."
        
        # ============================================================
        # CRITICAL: BLOCKCHAIN CONFIRMATION CHECK (Safety Layer)
        # ============================================================
        can_proceed = False
        # BTCPay "Settled" Status or Monitor Detection is the source of truth
        if is_settled:
            # logger.info(f"✅ PAYOUT AUTHORIZED: Bypassing confirmation check for Order {order_id}")
            can_proceed = True
        else:
            from django.conf import settings as django_settings
            required_confs = django_settings.REQUIRED_CONFIRMATIONS.get(crypto_symbol, 1 if crypto_symbol == 'XMR' else 3)
            current_confs = payment_address.confirmations or 0
            
            if current_confs >= required_confs:
                can_proceed = True
            else:
                logger.warning(f"⏳ PAYOUT PENDING: {order_id} ({current_confs}/{required_confs} confs).")
                raise self.retry(countdown=300)
            
        # if can_proceed:
        #     logger.info(f"💰 Processing Vendor Payout: {order_id}")
        
        # Calculate fees
        from .commission_models import CommissionSettings, VendorFee
        commission_settings = CommissionSettings.get_settings()
        
        # CRITICAL: Verify commission settings exist and have valid rate
        if not commission_settings:
            logger.error(f"❌ CRITICAL FAILURE for Order {order_id}: CommissionSettings NOT FOUND in database!")
            raise ValueError(f"CommissionSettings not configured for order {order_id}")
        
        if commission_settings.platform_fee_rate < 0:
            logger.error(f"❌ CRITICAL FAILURE for Order {order_id}: Negative platform_fee_rate ({commission_settings.platform_fee_rate}%) detected in settings!")
            raise ValueError(f"Invalid platform_fee_rate ({commission_settings.platform_fee_rate}%) is preventing payout.")
        
        # Check for vendor-specific commission rate
        vendor_custom_rate = VendorFee.get_vendor_fee(vendor)
        if vendor_custom_rate is not None:
            if vendor_custom_rate < 0:
                logger.error(f"❌ CRITICAL: vendor_custom_rate is negative: {vendor_custom_rate}%")
                raise ValueError(f"Invalid vendor_custom_rate: {vendor_custom_rate}%")
            platform_fee_rate = vendor_custom_rate / Decimal('100')
        else:
            platform_fee_rate = commission_settings.platform_fee_rate / Decimal('100')

        promotion_fee_rate_pct = Decimal('0')
        # Apply promotional uplift for highlighted listings (+1% by default).
        # Prefer immutable tracking at order time; fallback to product.is_highlighted for legacy rows.
        is_promo = bool(getattr(order, 'was_highlighted_at_order', False))
        if not is_promo:
            try:
                from django.utils import timezone
                now = timezone.now()
                product = order.product
                is_promo = bool(getattr(product, 'is_highlighted', False)) and (
                    not getattr(product, 'highlighted_until', None) or now < product.highlighted_until
                )
            except Exception:
                is_promo = False

        if is_promo:
            highlight_pct = Decimal(str(getattr(order.product, 'highlight_fee_rate', Decimal('1.00'))))
            promotion_fee_rate_pct = highlight_pct
            highlight_rate = highlight_pct / Decimal('100')
            platform_fee_rate += highlight_rate
            logger.info(
                f"Applying PROMOTIONAL highlight fee (+{highlight_pct}%) for order {order_id}. "
                f"Total platform rate now: {platform_fee_rate * 100}%"
            )
            
        logger.info(f"📊 FEE RATE DEBUG: Order {order_id}, Vendor {vendor.username}")
        logger.info(f"   Vendor Custom Rate Found? {vendor_custom_rate is not None}")
        if vendor_custom_rate is not None:
             logger.info(f"   Using Custom Rate: {vendor_custom_rate}%")
        else:
             logger.info(f"   Using Default Rate: {commission_settings.platform_fee_rate}%")
        logger.info(f"   Final Applied Rate: {platform_fee_rate} ({platform_fee_rate * 100}%)")
        
        # Allow 0% platform fee rate (e.g. for special vendors or testing)
        if platform_fee_rate < 0:
            logger.error(f"❌ CRITICAL FAILURE for Order {order_id}: Calculated platform_fee_rate is NEGATIVE ({platform_fee_rate}). Logic error.")
            raise ValueError(f"Platform fee rate {platform_fee_rate} is invalid for order {order_id}")
            
        escrow_fee_rate = Decimal('0')  # CRITICAL FIX: Define escrow_fee_rate for all branches
        # logger.info(f"📊 Payout Logic for Order {order_id}: Currency={crypto_symbol}, Vendor={vendor.username}, Rate={platform_fee_rate*100}%")
        
        # ============================================================
        # FEE CALCULATION FLOW (CONFIRMED APPROACH):
        # ============================================================
        # 1. Buyer sends $2.00 → network fee $0.25 deducted → $1.75 arrives (received_amount)
        # 2. Platform fee calculated on $1.75 (NOT on $2.00)
        # 3. Example: 5% platform fee = $0.0875 from $1.75
        # 4. Vendor net amount = $1.75 - $0.0875 = $1.6625
        # 5. When sending $1.6625 to vendor → network fee (~$0.25) deducted from this amount
        # 6. Vendor receives: $1.6625 - $0.25 = ~$1.41
        # ============================================================
        # BULK ORDER HANDLING: Determine portion for THIS order
        # ============================================================
        is_bulk = bool(payment_address.linked_order_ids)
        global_received = Decimal(str(payment_address.received_amount or 0))
        global_expected = Decimal(str(payment_address.expected_amount or 0))
        
        if is_bulk and global_received > 0 and global_expected > 0:
            # Pro-rate the received amount based on this order's share of the expected total
            # This handles both overpayments and tolerated underpayments gracefully
            order_share = order.total_amount / global_expected
            amount = global_received * order_share
            logger.info(f"Bulk member {order_id} share: {amount} (OrderTotal: {order.total_amount}, GlobalReceived: {global_received})")
        elif global_received > 0:
            amount = global_received
        else:
            # Fallback for old orders or stuck monitor updates
            amount = direct_payment.amount if direct_payment.amount > 0 else order.total_amount

        # CRITICAL: Sync direct_payment.amount with the ACTUAL money in hand for THIS order
        if abs(direct_payment.amount - amount) > Decimal('0.00000001'):
            logger.info(f"🔄 Syncing DirectPayment {direct_payment.id} amount: {direct_payment.amount} -> {amount} (portion)")
            direct_payment.amount = amount
            direct_payment.save(update_fields=['amount'])
        # else:
            # logger.info(f"✅ direct_payment.amount already correct: {amount}")
        
        # CRITICAL VERIFICATION: Ensure amount is valid
        if amount > payment_address.expected_amount:
            logger.warning(f"⚠️ amount ({amount}) > expected_amount ({payment_address.expected_amount})!")
            logger.warning(f"Buyer may have overpaid.")
        elif amount <= 0:
            raise ValueError(f"Cannot calculate fees: received_amount is {amount}")
        
        # Allow 0% platform fee rate
        if platform_fee_rate < 0:
            logger.error(f"❌ CRITICAL: platform_fee_rate is negative: {platform_fee_rate}")
            raise ValueError(f"Platform fee rate is negative: {platform_fee_rate}")
        
        # CRITICAL: Calculate platform fee with detailed logging
        platform_fee = amount * platform_fee_rate
        escrow_fee = amount * escrow_fee_rate
        promotion_fee_amount = (amount * promotion_fee_rate_pct) / Decimal('100') if promotion_fee_rate_pct > 0 else Decimal('0')
        if promotion_fee_amount > 0:
            logger.info(
                f"💸 PROMOTION FEE DEDUCTED: order {order_id} is_highlighted=True, "
                f"extra_fee_rate={promotion_fee_rate_pct}%, deducted={promotion_fee_amount} {crypto_symbol} "
                f"from order amount {amount} {crypto_symbol}"
            )
        
        # logger.info(f"💰 PLATFORM FEE CALCULATION:")
        # logger.info(f"   Vendor: {vendor.username}")
        # logger.info(f"   Amount (received): {amount} {crypto_symbol}")
        # logger.info(f"   Vendor custom rate: {vendor_custom_rate}%")
        # logger.info(f"   Platform default rate: {commission_settings.platform_fee_rate}%")
        # logger.info(f"   Platform fee rate used: {platform_fee_rate} ({platform_fee_rate * 100}%)")
        # logger.info(f"   Calculated platform_fee: {amount} * {platform_fee_rate} = {platform_fee} {crypto_symbol}")
        # logger.info(f"   Escrow fee: {escrow_fee} {crypto_symbol}")
        
        # CRITICAL TEST: Verify calculation manually
        test_calc = amount * platform_fee_rate
        if abs(platform_fee - test_calc) > Decimal('0.00000001'):
            logger.error(f"❌ CALCULATION MISMATCH: platform_fee ({platform_fee}) != {amount} * {platform_fee_rate} ({test_calc})")
            platform_fee = test_calc
            logger.error(f"✅ CORRECTED platform_fee: {platform_fee}")
        
        # CRITICAL: Verify platform fee was calculated
        if platform_fee < 0:
            logger.error(f"❌ CRITICAL: platform_fee is {platform_fee} (must be >= 0)!")
            raise ValueError(f"Platform fee calculation resulted in negative: {platform_fee}")
        elif platform_fee == 0 and platform_fee_rate > 0:
            logger.error(f"❌ CRITICAL: platform_fee is 0 but rate is {platform_fee_rate*100}%!")
            logger.error(f"Amount: {amount}, Rate: {platform_fee_rate}, Calculated: {amount * platform_fee_rate}")
            logger.error(f"Vendor: {vendor.username}, Custom rate: {vendor_custom_rate}, Default rate: {commission_settings.platform_fee_rate}%")
            raise ValueError(f"Platform fee calculation resulted in zero despite non-zero rate: {platform_fee_rate*100}%")
        elif platform_fee == 0 and platform_fee_rate == 0:
            logger.info(f"ℹPlatform fee is 0 (0% rate configured for vendor {vendor.username}) - proceeding with full payout to vendor")
        
        # Check if platform_fee is dust (approx 600 sats)
        # CRITICAL: Only set to 0 if it's truly dust AND we can't collect it
        # Otherwise, we MUST collect platform fee even if small
        dust_threshold = Decimal('0.00000600')
        if platform_fee > 0 and platform_fee < dust_threshold:
            logger.warning(f"⚠️ Platform fee {platform_fee} is below dust threshold {dust_threshold}")
            logger.warning(f"   This is very small - but we should still try to collect it")
            logger.warning(f"   NOT setting to 0 - keeping platform_fee = {platform_fee}")
            # DO NOT set to 0 - keep the fee even if small
            # platform_fee = Decimal('0')  # REMOVED - we should collect even small fees
        
        # Calculate net amount before miner fees
        net_amount = amount - platform_fee - escrow_fee
        
        # ALWAYS use live API fee for BTC - never hardcode
        if crypto_symbol == 'BTC':
            fee_btc = get_btc_estimated_miner_fee_btc()
            if fee_btc is None:
                logger.error("⚠️ WARNING: mempool.space API failed for BTC fee, using minimal fallback 0.00002 BTC")
                estimated_miner_fee = Decimal('0.00002')  # Minimal fallback ONLY when API fails
            else:
                estimated_miner_fee = fee_btc
                logger.info(f"✅ Using API BTC fee: {estimated_miner_fee} BTC")
        else:
            # XMR fees are tiny and stable (~0.0001 XMR), no API needed
            estimated_miner_fee = Decimal('0.0001')
        # DISABLED: Small transaction fee reduction
        # This logic was reducing platform fees for small transactions, but it was
        # overriding vendor custom rates (e.g., reducing 8% to 3%)
        # If a vendor sets 8%, we should charge 8% regardless of transaction size
        
        # min_vendor_receive = Decimal('0.00001')
        # if net_amount - estimated_miner_fee < min_vendor_receive:
        #     # Reduce platform fee to ensure vendor gets reasonable amount
        #     original_platform_fee = platform_fee
        #     max_platform_fee = amount - escrow_fee - estimated_miner_fee - min_vendor_receive
        #     if max_platform_fee < Decimal('0'):
        #         max_platform_fee = Decimal('0')
        #     platform_fee = min(platform_fee, max_platform_fee)
        #     net_amount = amount - platform_fee - escrow_fee
        #     
        #     if platform_fee < original_platform_fee:
        #         logger.warning(f"⚠️ FEE REDUCED FOR SMALL TRANSACTION:")
        #         logger.warning(f"   Original Fee: {original_platform_fee}")
        #         logger.warning(f"   Adjusted Fee: {platform_fee}")
        #         logger.warning(f"   Miner Fee: {estimated_miner_fee}")
        #         logger.warning(f"   Reason: Ensuring vendor receives at least {min_vendor_receive}")
        
        # logger.info(f"Final calculation: Gross={amount}, Platform Fee={platform_fee}, Escrow Fee={escrow_fee}, Net={net_amount}")
        # logger.info(f"Estimated miner fee: {estimated_miner_fee} (will be deducted by BTCPay from net amount)")
        # logger.info(f"Expected vendor receive: {net_amount - estimated_miner_fee} (after miner fees)")
        # logger.info(f"💰 FEE FLOW: Buyer sent {payment_address.expected_amount} → {amount} received (after buyer's network fee) → Platform fee on {amount} → Vendor gets {net_amount} → Network fee deducted from {net_amount} → Vendor receives {net_amount - estimated_miner_fee}")
        
        # CRITICAL: Verify net_amount calculation before saving
        calculated_net = amount - platform_fee - escrow_fee
        if abs(net_amount - calculated_net) > Decimal('0.00000001'):  # Allow tiny floating point differences
            logger.error(f"❌ CALCULATION ERROR: net_amount ({net_amount}) != calculated ({calculated_net})")
            logger.error(f"Recalculating: {amount} - {platform_fee} - {escrow_fee} = {calculated_net}")
            net_amount = calculated_net
        
        # Update direct payment with fees
        direct_payment.platform_fee = platform_fee
        direct_payment.escrow_fee = escrow_fee
        direct_payment.net_amount = net_amount
        # CRITICAL: direct_payment.transaction_hash should ONLY store the payout hash.
        # Do NOT copy payment_address.transaction_hash (which is the buyer's hash) here.
        direct_payment.confirmed_at = payment_address.confirmed_at or timezone.now()
        direct_payment.save()
        
        # CRITICAL VERIFICATION: Log what we're about to send
        # logger.info(f"✅ VERIFICATION: About to send {net_amount} {crypto_symbol} to vendor")
        # logger.info(f"   Gross (received): {amount} {crypto_symbol}")
        # logger.info(f"   Platform Fee (RETAINED in platform wallet): {platform_fee} {crypto_symbol}")
        # logger.info(f"   Escrow Fee: {escrow_fee} {crypto_symbol}")
        # logger.info(f"   Net (sent to vendor): {net_amount} = {amount} - {platform_fee} - {escrow_fee}")
        # logger.info(f"💰 PLATFORM FEE RETAINED: {platform_fee} {crypto_symbol} stays in platform wallet (BTCPay)")

        if net_amount >= amount:
            logger.error(f"❌ CRITICAL: net_amount ({net_amount}) >= gross ({amount}) - PLATFORM FEE NOT DEDUCTED!")
            raise ValueError(f"Platform fee not deducted! net_amount ({net_amount}) should be less than gross ({amount})")
        
        # logger.info(f"--- FEE CALCULATION FOR ORDER {order_id} ---")
        # logger.info(f"Gross Amount: {amount} {crypto_symbol}")
        # logger.info(f"Commission Rate: {platform_fee_rate * 100}%")
        # logger.info(f"Platform Fee: {platform_fee} {crypto_symbol} ({platform_fee_rate * 100}% of gross)")
        # logger.info(f"Escrow Fee: {escrow_fee} {crypto_symbol}")
        # logger.info(f"NET AMOUNT TO VENDOR (before miner fees): {net_amount} {crypto_symbol}")
        # logger.info(f"Estimated miner fee: {estimated_miner_fee} {crypto_symbol} (~$0.50-2.50 USD)")
        # logger.info(f"EXPECTED VENDOR RECEIVE (after miner fees): {net_amount - estimated_miner_fee} {crypto_symbol}")
        
        # USD equivalent from rates API (no hardcoded prices)
        # svc = PaymentService()
        # btc_price = svc.get_fiat_to_crypto_rate('BTC', 'USD') or Decimal('98000')
        # xmr_price = svc.get_fiat_to_crypto_rate('XMR', 'USD') or Decimal('165')
        # price = btc_price if crypto_symbol == 'BTC' else xmr_price
        
        # logger.info(f"USD Equivalents (approx):")
        # logger.info(f"  Gross: ${amount * price:.2f} USD")
        # logger.info(f"  Platform Fee: ${platform_fee * price:.2f} USD")
        # logger.info(f"  Net (before miner fees): ${net_amount * price:.2f} USD")
        # logger.info(f"  Expected vendor receive: ${(net_amount - estimated_miner_fee) * price:.2f} USD")
        # logger.info(f"VENDOR PAYOUT ADDRESS: {vendor_payout_address}")
        # logger.info(f"-------------------------------------------")
        
        # Dust check: if miner fee >= net_amount, vendor would receive <= 0 — never retry
        expected_vendor_receive = net_amount - estimated_miner_fee
        if expected_vendor_receive <= 0:
            direct_payment.status = 'failed'
            direct_payment.save()
            logger.error(
                f"DUST PAYOUT SKIPPED (no retries): order {order_id}. "
                f"Net={net_amount} {crypto_symbol}, miner_fee~{estimated_miner_fee} → vendor would receive {expected_vendor_receive}. "
                f"Order amount is below minimum (fee exceeds payout). Refund buyer or add wallet balance and retry manually."
            )
            return (
                f"Dust payout impossible for order {order_id}: net {net_amount} - fee ~{estimated_miner_fee} ≤ 0. "
                f"Marked failed. Refund buyer or top up BTCPay wallet and retry manually."
            )
        
        # Final verification: Ensure we're sending the correct net_amount
        # net_amount = received_amount - platform_fee - escrow_fee
        # Network fee will be deducted from net_amount by BTCPay (subtractFeesFromAmount=True)
        logger.info(f"📤 SENDING TO VENDOR: {net_amount} {crypto_symbol} (network fee ~{estimated_miner_fee} will be deducted from this)")
        logger.info(f"💰 FINAL VENDOR RECEIVE: {expected_vendor_receive} {crypto_symbol} (after network fee)")
        
        # CRITICAL FINAL CHECK: Update DB with our locally calculated fees
        # DO NOT refresh_from_db here as it might bring back stale expected_amount prices
        # if the webhook updated it with wrong data earlier.
        direct_payment.platform_fee = platform_fee
        direct_payment.escrow_fee = escrow_fee
        direct_payment.net_amount = net_amount
        direct_payment.save()
        
        logger.info(f"✅ LOCAL CALCULATION FINALIZED: net_amount={net_amount} (gross: {direct_payment.amount})")
        
        # CRITICAL: Final verification before sending
        if net_amount > direct_payment.amount:
            logger.error(f"❌ CRITICAL ERROR BEFORE SEND: net_amount ({net_amount}) > gross ({direct_payment.amount})!")
            direct_payment.status = 'failed'
            direct_payment.save()
            raise ValueError(f"Cannot send payout: net_amount ({net_amount}) > gross ({direct_payment.amount})!")
        
        # If net == gross, it's only valid if platform_fee is 0 (i.e 0% rate vendor)
        if net_amount == direct_payment.amount and direct_payment.platform_fee > 0:
            logger.error(f"❌ CRITICAL ERROR: net_amount == gross but platform_fee {direct_payment.platform_fee} was not deducted!")
            direct_payment.status = 'failed'
            direct_payment.save()
            raise ValueError(f"Platform fee not deducted from net_amount!")
        elif net_amount == direct_payment.amount and direct_payment.platform_fee == 0:
            logger.info(f"ℹ️ net_amount == gross because platform_fee is 0 (0% rate) - this is correct for vendor {vendor.username}")
        
        logger.info(f"✅ FINAL VERIFICATION PASSED: Sending {net_amount} {crypto_symbol} (gross: {direct_payment.amount}, platform_fee: {direct_payment.platform_fee})")
        
        # ============================================================
        # CRITICAL: FINAL ATOMIC IDEMPOTENCY LOCK BEFORE SENDING
        # This is the last line of defense against double payouts.
        # Two Celery workers can BOTH pass the earlier 'processing' check
        # if they are dequeued simultaneously. This atomic lock ensures
        # only ONE worker ever reaches _send_direct_payment_to_vendor.
        # ============================================================
        with transaction.atomic():
            dp_final_check = DirectPayment.objects.select_for_update().get(id=direct_payment.id)
            
            if dp_final_check.status == 'completed' and _is_valid_payout_hash(dp_final_check.transaction_hash):
                logger.warning(f"[IDEMPOTENCY GUARD] Order {order_id}: payout already completed by another worker. ABORTING to prevent double payout. TX: {dp_final_check.transaction_hash[:40] if dp_final_check.transaction_hash else 'N/A'}")
                return f"Order {order_id} — payout already completed (idempotency guard fired)"
            
            if _is_valid_payout_hash(dp_final_check.transaction_hash) and dp_final_check.status != 'completed':
                # Has a valid outbound hash but status not yet updated — fix and abort
                dp_final_check.status = 'completed'
                dp_final_check.save(update_fields=['status'])
                logger.warning(f"[IDEMPOTENCY GUARD] Order {order_id}: valid payout hash found but status was {dp_final_check.status}. Fixed status and aborting retry.")
                return f"Order {order_id} — payout hash found, status corrected to completed"
            
            # Re-check if another worker is CURRENTLY processing or has finished
            # We compare with our TASK ID anchor. 
            my_anchor = f"processing_task_{self.request.id}" if self.request.id else "processing_task_manual"
            
            if dp_final_check.transaction_hash != my_anchor:
                # If it's a valid payout hash, someone finished!
                if _is_valid_payout_hash(dp_final_check.transaction_hash):
                     logger.warning(f"[IDEMPOTENCY] Order {order_id}: Payout ALREADY COMPLETED by another worker ({dp_final_check.transaction_hash[:20]}). Aborting.")
                     return f"Order {order_id} — already completed"
                
                # If it's another task's anchor, we've been superseded
                logger.warning(
                    f"[IDEMPOTENCY GUARD] Order {order_id}: Superseded! "
                    f"DB Anchor ({dp_final_check.transaction_hash}) != our anchor ({my_anchor}). "
                    f"ABORTING to prevent duplicate send."
                )
                return f"Order {order_id} — superseded by another task (aborting)"
            
            # If status is NOT 'processing' (e.g. someone else just finished), abort
            if dp_final_check.status != 'processing':
                logger.warning(f"[IDEMPOTENCY GUARD] Order {order_id}: status changed to {dp_final_check.status} while we were preparing. Aborting.")
                return f"Order {order_id} — status no longer processing (aborting)"
            
            # Re-stamp with a slightly offset time so other workers see activity
            dp_final_check.updated_at = timezone.now()
            dp_final_check.save(update_fields=['updated_at'])
        
        # Send to vendor
        payout_service = PayoutService()
        success = payout_service._send_direct_payment_to_vendor(direct_payment, net_amount)
        
        if success:
            logger.info(f"Successfully processed non-escrow payout for order {order_id}")
            return f"Non-escrow payout processed for order {order_id}"
        else:
            # Re-check status from DB. Maybe it WAS successful but the service layer
            # faced a minor issue (e.g. notification failed) after the database update.
            direct_payment.refresh_from_db()
            if direct_payment.status == 'completed':
                logger.info(f"✅ Recovery: Payout for {order_id} is already marked completed in DB. Case closed.")
                return f"Already completed in DB"

            # Payout truly failed (likely locked funds) - keep status as processing
            direct_payment.status = 'processing'
            direct_payment.save()
            
            logger.warning(f"Payout failed for order {order_id}. Retry {self.request.retries + 1}/{self.max_retries}")
            
            # If we still have retries left, schedule a retry
            if self.request.retries < self.max_retries:
                # Use 300s (5 mins) as requested
                raise self.retry(exc=Exception(f"Payout failed (likely locked funds), retrying in 5 minutes"), countdown=300)
            else:
                # All retries exhausted - mark as failed for manual intervention
                direct_payment.status = 'failed'
                direct_payment.save()
                logger.error(f"All retries exhausted for order {order_id}. Manual intervention required.")
                return f"Failed to send payout to vendor for order {order_id} after {self.max_retries} retries"
            
    except Order.DoesNotExist:
        logger.error(f"Order not found: {order_id}")
        return f"Order not found: {order_id}"
    except Exception as e:
        logger.error(f"Error processing non-escrow payout for order {order_id}: {str(e)}")
        
        # RESET STATUS to allow retry or manual fix
        try:
            from .models import DirectPayment
            dp = DirectPayment.objects.get(order_id=order_id)
            if dp.status == 'processing':
                # Actually reset it to confirmed so it can be picked up if stuck
                # But only if it's not a temporary locked balance issue which uses self.retry
                pass 
        except:
            pass
            
        # For unexpected errors, also retry
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=300)
        else:
            return f"Error processing non-escrow payout: {str(e)}"