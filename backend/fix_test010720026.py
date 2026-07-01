import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django_tenants.utils import tenant_context
from core.models import Warehouse
from api.models import Order

found = False
for tenant in Warehouse.objects.all():
    if tenant.schema_name == 'public':
        continue
    with tenant_context(tenant):
        o = Order.objects.filter(invoicenumber='TEST010720026').first()
        if not o:
            o = Order.objects.filter(orderid='TEST010720026').first()
        if o:
            o.status = 'Dispatched'
            o.save(update_fields=['status'])
            print(f"Updated {o.orderid} / {o.invoicenumber} to Dispatched in tenant {tenant.schema_name}")
            found = True
            break
if not found:
    print("TEST010720026 not found")
