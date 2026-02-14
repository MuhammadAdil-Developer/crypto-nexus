import re

file_path = r"c:\ac1\backend\products\serializers.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replace_logic(name):
    global content
    # Match the inner loop of the get_gallery_images or get_documents functions
    # regardless of which serializer they are in.
    pattern = re.compile(
        rf'def {name}\(self, obj\):.*?urls = \[\].*?for path in obj\.{name}:.*?return urls',
        re.DOTALL
    )
    
    replacement = f'''def {name}(self, obj):
        """Return absolute URLs for {name.split('_')[1]}"""
        if not obj.{name}:
            return []
            
        from django.core.files.storage import default_storage
        request = self.context.get('request')
        urls = []
        for path in obj.{name}:
            if not path: continue
            try:
                url = default_storage.url(path)
                if request and not url.startswith('http'):
                    urls.append(request.build_absolute_uri(url))
                else:
                    urls.append(url)
            except Exception:
                urls.append(path)
        return urls'''
    
    content = pattern.sub(replacement, content)

replace_logic('get_gallery_images')
replace_logic('get_documents')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
