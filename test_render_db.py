#!/usr/bin/env python3
"""Test database connection with Render's database"""

import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Configure with Render database URL
os.environ['DATABASE_URL'] = 'postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres'

import django
from django.conf import settings

# Configure Django with Render database
settings.configure(
    DATABASES={
        'default': {
            'ENGINE': 'django_tenants.postgresql_backend',
            'NAME': 'simply_useful_postgres',
            'USER': 'simply_useful_postgres_user',
            'PASSWORD': 'tlVAfpUo5RfutansLCGjMNGrrivh7si9',
            'HOST': 'dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com',
            'PORT': '5432',
        }
    },
    INSTALLED_APPS=[
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'api.apps.ApiConfig',
        'django_tenants',
    ],
    USE_TZ=True,
)

django.setup()

from django.db import connection

print("=" * 70)
print("RENDER DATABASE CONNECTION TEST")
print("=" * 70)

print("\n1. Testing Connection...")
print("-" * 70)
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("✅ Connection successful!")
        
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✅ PostgreSQL Version: {version[0]}")
        
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

print("\n2. Testing Model Imports...")
print("-" * 70)
try:
    from api.models import Warehouse, Dealer, Distributor, Product
    print("✅ Model imports successful!")
    
    # Test model count queries
    warehouses = Warehouse.objects.count()
    dealers = Dealer.objects.count()
    distributors = Distributor.objects.count()
    products = Product.objects.count()
    
    print(f"✅ Warehouse count: {warehouses}")
    print(f"✅ Dealer count: {dealers}")
    print(f"✅ Distributor count: {distributors}")
    print(f"✅ Product count: {products}")
    
except Exception as e:
    print(f"❌ Model imports/queries failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n4. Sample Data...")
if dealers:
    sample_dealer = Dealer.objects.first()
    print(f"✅ Sample Dealer: {sample_dealer.dealercode} - {sample_dealer.name}")
if products:
    sample_product = Product.objects.first()
    print(f"✅ Sample Product: {sample_product.productcode} - {sample_product.name}")

print("\n" + "=" * 70)
print("✅ ALL TESTS PASSED - Database connected and ready!")
print("=" * 70)
print("\nYou can now run the optimization scripts to fix the N+1 issue.")
