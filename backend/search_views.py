import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("api/views.py", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "inventory" in line.lower():
            print(f"{idx}: {line.strip()}")
