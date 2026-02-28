import os
import django
import sys

# Setup Django
sys.path.append('c:\\ac1\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from products.models import Product

products = Product.objects.filter(headline__icontains='btc account 2') | Product.objects.filter(headline__icontains='Repudiandae')

for p in products:
    print(f"ID: {p.id}")
    print(f"Headline: {p.headline}")
    print(f"Main Image (Field): {p.main_image}")
    print(f"Main Image (Field URL): {p.main_image.url if p.main_image else 'No URL'}")
    print(f"Main Images (JSON): {p.main_images}")
    print("-" * 20)
