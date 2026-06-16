import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from api.models import Order, Product, Category, Brand
print(f"Nashik (wh_nashik):")
print(f"  Orders: {Order.objects.using('wh_nashik').count()}")
print(f"  Products: {Product.objects.using('wh_nashik').count()}")
print(f"  Categories: {Category.objects.using('wh_nashik').count()}")
print(f"  Brands: {Brand.objects.using('wh_nashik').count()}")

print(f"\nNavsari (wh_navsari):")
print(f"  Orders: {Order.objects.using('wh_navsari').count()}")
print(f"  Products: {Product.objects.using('wh_navsari').count()}")
print(f"  Categories: {Category.objects.using('wh_navsari').count()}")
print(f"  Brands: {Brand.objects.using('wh_navsari').count()}")

