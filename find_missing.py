import os
import re

missing = []
for root, dirs, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            if 'Trash2' in content:
                # Check if Trash2 is imported
                match = re.search(r"import\s+\{[^}]*Trash2[^}]*\}\s+from\s+['\"]lucide-react['\"]", content)
                if not match:
                    missing.append(path)

print("Missing imports in:", missing)
