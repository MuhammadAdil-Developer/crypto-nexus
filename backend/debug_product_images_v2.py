import os
import django
import sys

# Setup Django
sys.path.append('c:\\ac1\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from products.models import Product

headlines = ['BRIANS CLUB', 'VClub HQ+++', 'Nsocks', 'SAVASTANO']
products = Product.objects.filter(headline__in=headlines)

for h in headlines:
    p = Product.objects.filter(headline=h).first()
    if p:
        print(f"Headline: {p.headline}")
        print(f"Main Image (Field): {p.main_image}")
        try:
            print(f"Main Image URL: {p.main_image.url if p.main_image else 'No URL'}")
        except Exception as e:
            print(f"Main Image URL Error: {e}")
        print(f"Main Images (JSON): {p.main_images}")
        print("-" * 20)
    else:
        print(f"Product not found: {h}")
