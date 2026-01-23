import os
import sys
import django

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from products.models import Product

products = Product.objects.all().order_by('-created_at')[:5]
for p in products:
    print(f"ID: {p.id}, Title: {p.headline}, Image: {p.main_image}")
