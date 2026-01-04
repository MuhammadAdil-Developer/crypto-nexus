import os
import django
import sys
import time

# Set up Django environment
base_path = os.path.normpath(r'C:\workspace\crypto-nexus\backend')
if base_path not in sys.path:
    sys.path.append(base_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("Starting 10 tests...")
for i in range(10):
    try:
        count = User.objects.count()
        print(f"Test {i+1}: Success! Count: {count}")
    except Exception as e:
        print(f"Test {i+1}: FAILED! {str(e)}")
    time.sleep(1)
