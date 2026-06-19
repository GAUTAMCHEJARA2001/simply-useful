import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Product, Warehouse, Inventory, User
from django.db.models import Sum
from api.db_router import setup_dynamic_tenant_databases

setup_dynamic_tenant_databases()

user = User.objects.using('default').filter(email='gautam@kamla.com').first()
company_id = getattr(user, 'companyId', getattr(user, 'companyid_id', None))
print(f"Using company_id: {company_id}")

all_products = []
seen_skus = set()
seen_ids = set()
sku_qty_map = {}

for wh in Warehouse.objects.filter(active=True):
    print(f"Checking {wh.name}")
    if not wh.db_name: continue
    try:
        products_qs = Product.objects.using(wh.db_name).select_related(
            'categoryid', 'categoryid__parentid', 'brandid', 'unitid'
        )
        if company_id:
            products_qs = products_qs.filter(companyid_id=company_id)
            
        print(f"Found {products_qs.count()} products in {wh.db_name}")
            
        for p in products_qs:
            inv_total = Inventory.objects.using(wh.db_name).filter(productid_id=p.id).aggregate(Sum('quantity'))['quantity__sum'] or 0
            sku = p.productcode
            
            if sku:
                sku_qty_map[sku] = sku_qty_map.get(sku, 0) + inv_total
                if sku not in seen_skus:
                    all_products.append(p)
                    seen_skus.add(sku)
            else:
                if p.id not in seen_ids:
                    all_products.append(p)
                    seen_ids.add(p.id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in {wh.name}: {e}")

print(f"Total products fetched: {len(all_products)}")

from api.serializers import ProductSerializer

class DummyRequest:
    def __init__(self, user):
        self.user = user

request = DummyRequest(user)
try:
    serializer = ProductSerializer(all_products, many=True, context={'request': request, 'sku_qty_map': sku_qty_map})
    data = serializer.data
    print(f"Serialized {len(data)} items")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("Serialization failed!")
