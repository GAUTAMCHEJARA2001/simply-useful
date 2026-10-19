import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.apps import apps
from django.db import models

search_str = '889440'

print(f"Searching local db_master for: {search_str}")

found = []

for model in apps.get_models():
    char_fields = [f.name for f in model._meta.fields if isinstance(f, (models.CharField, models.TextField, models.SlugField))]
    if not char_fields:
        continue
    
    for field in char_fields:
        try:
            lookup = {f"{field}__icontains": search_str}
            qs = model.objects.filter(**lookup)
            count = qs.count()
            if count > 0:
                for obj in qs[:10]:
                    row_data = {}
                    for f in model._meta.fields:
                        try:
                            val = getattr(obj, f.name)
                            row_data[f.name] = str(val)[:100]
                        except Exception:
                            pass
                    print(f"\n[FOUND] Model: {model.__name__} (Table: {model._meta.db_table}), Field: {field}")
                    print(f"Record: {row_data}")
                    found.append((model, obj))
        except Exception as e:
            pass

if not found:
    print(f"\nNo records found matching '{search_str}' in local db_master.")
