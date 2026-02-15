import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

print("--- CLOUDINARY CONFIG CHECK ---")
print(f"CLOUD_NAME: '{settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')}'")
print(f"API_KEY: '{settings.CLOUDINARY_STORAGE.get('API_KEY')}'")
print(f"HAS_SECRET: {bool(settings.CLOUDINARY_STORAGE.get('API_SECRET'))}")
print(f"DEFAULT_FILE_STORAGE: {settings.DEFAULT_FILE_STORAGE}")
try:
    print(f"MEDIA_ROOT (checking if exists): {getattr(settings, 'MEDIA_ROOT', 'NOT DEFINED')}")
except Exception as e:
    print(f"MEDIA_ROOT Error: {e}")
print("-------------------------------")
