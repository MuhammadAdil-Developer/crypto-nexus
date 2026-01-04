import os
import django
import sys

# Set up Django environment
base_path = os.path.normpath(r'C:\workspace\crypto-nexus\backend')
if base_path not in sys.path:
    sys.path.append(base_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    count = User.objects.count()
    print(f"Connection successful! User count: {count}")
except Exception as e:
    print(f"Connection failed: {str(e)}")
    import traceback
    traceback.print_exc()
