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
        o = Order.objects.filter(orderid='ORD-976290').first()
        if o:
            found = True
            print(f"Found in tenant: {tenant.schema_name}")
            print(f"Status: {o.status}")
            print("Items:")
            print("Dispatch Logs:")
            for log in o.dispatchlog_set.all():
                print(f"  {log.dispatchdate} - {log.invoicenumber}")
            print("Return Logs:")
            for log in o.returnlog_set.all():
                print(f"  {log.returndate} - {log.remarks}")
            break

if not found:
    print("Order not found across any tenant")
