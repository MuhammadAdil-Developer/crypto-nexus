import os

file_path = r'c:\ac1\client\src\pages\admin\orders.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add Key to lucide-react imports
old_lucide = 'Trash2 } from "lucide-react";'
new_lucide = 'Trash2, Key } from "lucide-react";'

if old_lucide in text:
    text = text.replace(old_lucide, new_lucide)
    print("Added Key to lucide-react imports")
else:
    print("Could not find lucide-react line")

# Add getImageUrl and brandLogo imports
old_utils = 'import { formatCryptoAmountInString } from "@/lib/utils";'
new_utils = old_utils + '\nimport { getImageUrl } from "@/config/api";\nimport brandLogo from "@/assets/banner/logo.png";'

if old_utils in text:
    text = text.replace(old_utils, new_utils)
    print("Added getImageUrl and brandLogo imports")
else:
    print("Could not find utils import line")

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print("File update complete")
