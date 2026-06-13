import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from api.models import Order, Product, Category, Brand
print(f"Orders: {Order.objects.using('wh_nashik').count()}")
print(f"Products: {Product.objects.using('wh_nashik').count()}")
print(f"Categories: {Category.objects.using('wh_nashik').count()}")
print(f"Brands: {Brand.objects.using('wh_nashik').count()}")
