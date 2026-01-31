-- Check DirectPayment record for the pending payout
SELECT 
    id,
    order_id,
    status,
    amount,
    platform_fee,
    escrow_fee,
    net_amount,
    confirmations,
    vendor_address,
    created_at
FROM direct_payments 
WHERE id = 'd7bdc61d-03cb-4b33-8891-0d294c50ffc4'
   OR order_id = 'ORD-7B43854C';

-- Check PaymentAddress record
SELECT 
    order_id,
    status,
    confirmations,
    received_amount,
    expected_amount,
    payment_address
FROM payment_addresses 
WHERE order_id = 'ORD-7B43854C';

-- Check commission settings
SELECT 
    id,
    platform_fee_rate,
    escrow_fee_rate,
    is_active
FROM commission_settings;

-- Check if vendor has custom fee
SELECT 
    v.vendor_username,
    vf.fee_percentage
FROM vendor_fees vf
JOIN vendors_vendorapplication v ON vf.vendor_id = v.id
WHERE v.vendor_username IN (
    SELECT vendor_id FROM orders_order WHERE order_id = 'ORD-7B43854C'
);
