import os
print("--- ENV CHECK ---")
for key in ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']:
    val = os.environ.get(key)
    print(f"{key}: {'SET' if val else 'NOT SET'} (length: {len(val) if val else 0})")
print("-----------------")

# Try reading from .env manually
try:
    with open('.env', 'r') as f:
        print("Manual .env check (first few chars):")
        for line in f:
            if 'CLOUDINARY' in line:
                print(line.split('=')[0], "found")
except Exception as e:
    print(f"Error reading .env: {e}")
