#!/usr/bin/env python3
"""Test database connection with Render's database and analyze the structure.
This script will help us understand the current database state before making any changes.
"""

import os
import sys
import django
from django.db import connection

# Set up Django with Render's database URL
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Configure Django with Render database
django.conf.settings.configure(
    DATABASES={
        'default': {
            'ENGINE': 'django_tenants.postgresql_backend',
            'NAME': 'simply_useful_postgres',
            'USER': 'simply_useful_postgres_user',
            'PASSWORD': 'tlVAfpUo5RfutansLCGjMNGrrivh7si9',
            'HOST': 'dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com',
            'PORT': '5432',
            'ATOMIC_REQUESTS': True,
        }
    },
    INSTALLED_APPS=[
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'api.apps.ApiConfig',
        'django_tenants',
    ],
    MIDDLEWARE=[
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'django_tenants.middleware.main.DomainTenantMiddleware',
        'django_tenants.middleware.main.TenantMiddleware',
    ],
    ROOT_URLCONF = 'backend.urls',
    SECRET_KEY = 'test-secret-key-for-analysis',
    USE_TZ = True,
    TIME_ZONE = 'UTC',
    DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField',
)

django.setup()

from api.models import Warehouse, Dealer, Distributor, Product, Category, Brand, Unit
from django.db import transaction
from datetime import datetime

print("=" * 80)
print("RENDER DATABASE ANALYSIS - Complete Analysis of Production Database")
print("=" * 80)

# Test connection
print("\n1. DATABASE CONNECTION TEST")
print("-" * 50)
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("✅ PostgreSQL Connection: SUCCESS")
        
        cursor.execute("SELECT current_database(), current_user")
        db_info = cursor.fetchone()
        print(f"   Database: {db_info[0]}")
        print(f"   User: {db_info[1]}")
        
except Exception as e:
    print(f"❌ PostgreSQL Connection: FAILED")
    print(f"   Error: {e}")
    sys.exit(1)

# Analyze warehouses
print("\n2. WAREHOUSE ANALYSIS")
print("-" * 50)
warehouses = Warehouse.objects.all()
print(f"Total warehouses in database: {warehouses.count()}")

for wh in warehouses:
    print(f"\n  - {wh.name} (ID: {wh.id})")
    print(f"    Schema: {wh.schema_name}")
    print(f"    DB Name: {wh.db_name}")
    print(f"    Active: {wh.active}")
    
    # Check dealer count in each warehouse
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {wh.schema_name}.dealer")
            dealer_count = cursor.fetchone()[0]
            print(f"    Dealers: {dealer_count}")
            
            cursor.execute(f"SELECT COUNT(*) FROM {wh.schema_name}.distributor")
            distributor_count = cursor.fetchone()[0]
            print(f"    Distributors: {distributor_count}")
            
            cursor.execute(f"SELECT COUNT(*) FROM {wh.schema_name}.product")
            product_count = cursor.fetchone()[0]
            print(f"    Products: {product_count}")
    except Exception as e:
        print(f"    Note: Cannot access schema data - {e}")

# Analyze dealer/distributor data structure and content
print("\n3. DEALER/DISTRIBUTOR ANALYSIS")
print("-" * 50)

# Get dealer data for analysis
dealers = Dealer.objects.all()
distributors = Distributor.objects.all()

print(f"Total dealers in database: {dealers.count()}")
print(f"Total distributors in database: {distributors.count()}")

if dealers.exists():
    print(f"\nDealer model fields ({len(dealers.first()._meta.fields)}):")
    for field in dealers.first()._meta.fields:
        print(f"  - {field.name} ({field.get_internal_type()})")
        
    # Show sample dealer data
    sample_dealer = dealers.first()
    print(f"\nSample dealer data:")
    for field in dealers.first()._meta.fields:
        try:
            value = getattr(sample_dealer, field.name)
            if field.name != 'id':
                print(f"  - {field.name}: {value}")
        except:
            print(f"  - {field.name}: [Unable to retrieve]")

if distributors.exists():
    print(f"\nDistributor model fields ({len(distributors.first()._meta.fields)}):")
    for field in distributors.first()._meta.fields:
        print(f"  - {field.name} ({field.get_internal_type()})")
        
    # Show sample distributor data
    sample_distributor = distributors.first()
    print(f"\nSample distributor data:")
    for field in distributors.first()._meta.fields:
        try:
            value = getattr(sample_distributor, field.name)
            if field.name != 'id':
                print(f"  - {field.name}: {value}")
        except:
            print(f"  - {field.name}: [Unable to retrieve]")

# Analyze product data
print("\n4. PRODUCT ANALYSIS")
print("-" * 50)

products = Product.objects.all()
print(f"Total products in database: {products.count()}")

if products.exists():
    print(f"\nProduct model fields ({len(products.first()._meta.fields)}):")
    for field in products.first()._meta.fields:
        print(f"  - {field.name} ({field.get_internal_type()})")
        
    # Check if product data is database or default data
    sample_product = products.first()
    
    # Try to access database-specific fields
    try:
        opening_stock = getattr(sample_product, 'openingstock', None)
        if opening_stock:
            print(f"\nSample product: {sample_product.productcode} - {sample_product.name}")
            print(f"  - Opening Stock: {opening_stock}")
            print(f"  - Rate: {sample_product.rate}")
            print(f"  - GST: {sample_product.gst}")
            
            # This indicates database content
            print(f"  ❌ ISSUE: This is database content, not default data")
            print(f"     Database content affects stock calculations")
        else:
            print(f"\nSample product: {sample_product.productcode} - {sample_product.name}")
            print(f"  ✅ This appears to be default/fake data")
    except Exception as e:
        print(f"  Error checking product data: {e}")

# Analyze categories and brands
print("\n5. CATEGORY/BRAND/UNIT ANALYSIS")
print("-" * 50)

categories = Category.objects.all()
brands = Brand.objects.all()
units = Unit.objects.all()

print(f"Categories: {categories.count()}")
print(f"Brands: {brands.count()}")
print(f"Units: {units.count()}")

# Check stock calculation implications
print("\n6. STOCK CALCULATION ANALYSIS")
print("-" * 50)

print("Current stock calculation flow:")
print("1. Frontend calls /api/v1/products")
print("2. ProductViewSet.list() in backend/api/views.py")
print("3. Loop through each warehouse (N warehouses)")
print("4. For each warehouse:")
print("   a. Product.objects.using(wh.db_name).all() - Query 1")
print("   b. Purchaseitem.objects.using(wh.db_name)... - Query 2")
print("   c. Orderitem.objects.using(wh.db_name)... - Query 3")
print("   d. Stocktransaction.objects.using(wh.db_name)... - Query 4")
print(f"\n   Example: 3 warehouses = 12 queries per frontend load!")
print(f"   Result: N+1 problem causing slow stock updates")

print("\n7. RECOMMENDATIONS")
print("-" * 50)
print("A. Optimize stock calculation (N+1 problem):")
print("   - Modify ProductViewSet.list() in backend/api/views.py")
print("   - Use single query with bulk aggregation")
print("   - Reduce 12 queries to 4-8 queries")
print("")
print("B. Sync dealers/distributors across all warehouses:")
print("   - Update bulk import to write to all warehouse schemas")
print("   - Create sync script to copy wh_main data to other schemas")
print("")
print("C. Fix recipe product filter:")
print("   - Modify RecipesTab.tsx to include subcategories")
print("")
print("D. Configure Vercel toolbar and workers:")
print("   - Add Vercel Toolbar to deployment")
print("   - Set appropriate Gunicorn workers/timeout")

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE - Ready for Implementation")
print("=" * 80)
