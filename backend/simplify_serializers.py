import re

file_path = r"c:\ac1\backend\products\serializers.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the manual file saving logic in create() and update()
# This logic might be interfering with how Cloudinary handles the fields.
# Django's model.create() and model.save() handle FileFields/ImageFields correctly if passed the file objects.

pattern_create_save = re.compile(
    r'# Process main image'
    r'.*?main_image = validated_data\.pop\(.*?\)\s+'
    r'if main_image:.*?validated_data\[\'main_image\'\] = .*?$',
    re.DOTALL | re.MULTILINE
)

# Actually, I'll just rewrite the serializer methods to be simpler.

def simplify_handler(content):
    # Remove the manual save blocks
    content = re.sub(
        r'# Process main image if provided - Manual Save to ensure consistency.*?# Process account_age',
        '# Process account_age',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'# Process main image if provided.*?# Update product',
        '# Update product',
        content,
        flags=re.DOTALL
    )
    return content

content = simplify_handler(content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Simplification complete.")
