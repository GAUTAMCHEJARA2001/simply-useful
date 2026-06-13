import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import json
from api.services.aggregation_service import get_super_admin_dashboard_kpis

print("\n--- Testing Super Admin Aggregation ---")
# Call the service
payload = get_super_admin_dashboard_kpis()

print("Unified Payload Response:")
print(json.dumps(payload, indent=2))
