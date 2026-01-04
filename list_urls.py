import os
import django
import sys

# Set up Django environment
base_path = os.path.normpath(r'C:\workspace\crypto-nexus\backend')
if base_path not in sys.path:
    sys.path.append(base_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from django.urls import get_resolver

def list_urls(lis, acc=None):
    if acc is None:
        acc = []
    if not lis:
        return
    for entry in lis:
        if hasattr(entry, 'url_patterns'):
            list_urls(entry.url_patterns, acc + [str(entry.pattern)])
        else:
            print('/'.join(acc + [str(entry.pattern)]).replace('^', '').replace('$', ''))

resolver = get_resolver()
list_urls(resolver.url_patterns)
