import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django_tenants.utils import tenant_context
from core.models import Warehouse
from api.models import Order

for tenant in Warehouse.objects.all():
    if tenant.schema_name == 'public':
        continue
    with tenant_context(tenant):
        o = Order.objects.filter(orderid='ORD-976290').first()
        if o:
            o.status = 'Dispatched'
            o.save(update_fields=['status'])
            print(f"Updated ORD-976290 to Dispatched in tenant {tenant.schema_name}")
            break
