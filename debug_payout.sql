-- Check DirectPayment record
SELECT 
    id, 
    order_id, 
    status, 
    confirmations, 
    amount, 
    platform_fee,
    net_amount, 
    vendor_address,
    created_at
FROM direct_payments 
WHERE order_id = 'ORD-7B43854C';

-- Check Order details
SELECT 
    order_id,
    order_status,
    payment_status,
    use_escrow,
    total_amount
FROM orders_order
WHERE order_id = 'ORD-7B43854C';

-- Check EscrowPayment if exists
SELECT 
    id,
    status,
    escrow_amount,
    auto_release_at
FROM escrow_payments ep
JOIN payment_addresses pa ON ep.payment_address_id = pa.id
WHERE pa.order_id = 'ORD-7B43854C';
