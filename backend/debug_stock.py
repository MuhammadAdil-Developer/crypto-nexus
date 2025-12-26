
from products.models import Product

def check_stock_status():
    print("Checking products with quantity_available <= 0...")
    out_of_stock_products = Product.objects.filter(quantity_available__lte=0)
    
    if not out_of_stock_products.exists():
        print("No out of stock products found.")
        return

    print(f"Found {out_of_stock_products.count()} out of stock products.")
    for p in out_of_stock_products:
        print(f"ID: {p.id} | Headline: {p.headline} | Status: {p.status} | Is Active: {p.is_active} | Is Deleted: {p.is_deleted} | Qty: {p.quantity_available}")

    print("\nChecking filtering logic in buyer_listings...")
    # Mimic buyer_listings filter
    qs = Product.objects.filter(
        status__in=['approved', 'reserved'],
        is_active=True,
        is_deleted=False
    )
    
    print(f"Total products visible in buyer_listings: {qs.count()}")
    
    # Check if our out-of-stock items are in this queryset
    visible_ids = set(qs.values_list('id', flat=True))
    
    hidden_count = 0
    for p in out_of_stock_products:
        if p.id not in visible_ids:
            print(f"WARNING: Product {p.id} ({p.headline}) is HIDDEN! Status: {p.status}, Active: {p.is_active}, Deleted: {p.is_deleted}")
            hidden_count += 1
            
    if hidden_count == 0:
        print("SUCCESS: All out of stock products are visible in the query.")
    else:
        print(f"FAILURE: {hidden_count} out of stock products are hidden.")

if __name__ == '__main__':
    check_stock_status()
