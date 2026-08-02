#!/usr/bin/env python3
"""Database analysis script for Render deployment"""

import os
import sys

print("=" * 80)
print("RENDER DATABASE CONNECTION - DIRECT EXECUTION")
print("=" * 80)

# Set working directory to the repo root
os.chdir('/Users/Gauta/.local/share/opencode/worktree/8579ad5076697dba443b86255535a75af2c26fd3/shiny-moon')

# Add backend to Python path
sys.path.append('backend')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Configure with Render database
os.environ['DATABASE_URL'] = 'postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres'

try:
    import django
    from django.conf import settings
    
    # Configure Django settings
    if not settings.configured:
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
    
    print("✅ Django configured successfully")
    
    from django.db import connection
    print(f"✅ Database connection: {connection.settings_dict['NAME']}@{connection.settings_dict['HOST']}")
    
    # Test database connectivity
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("✅ Database query successful")
        
    from api.models import Warehouse, Dealer, Distributor, Product
    
    # Get active warehouses
    warehouses = Warehouse.objects.filter(active=True)
    print(f"✅ Found {warehouses.count()} active warehouses")
    
    # Show warehouse details
    for w in warehouses:
        print(f"   - {w.name} (schema: {w.schema_name})")
        
    # Get counts
    dealers = Dealer.objects.count()
    distributors = Distributor.objects.count()
    products = Product.objects.count()
    
    print(f"✅ Dealers: {dealers}")
    print(f"✅ Distributors: {distributors}")
    print(f"✅ Products: {products}")
    
    # Show sample data
    if dealers > 0:
        sample_dealer = Dealer.objects.first()
        print(f"✅ Sample Dealer: {sample_dealer.dealercode} - {sample_dealer.name}")
        
    if products > 0:
        sample_product = Product.objects.first()
        opening_stock = getattr(sample_product, 'openingstock', 0)
        print(f"✅ Sample Product: {sample_product.productcode} - {sample_product.name}")
        print(f"   - Opening Stock: {opening_stock}")
        if opening_stock > 0:
            print("   ❌ ISSUE: This is database content, not default data!")
            print("     Database content affects stock calculations")
        else:
            print("   ✅ This appears to be default/fake data")
    
    print("\n" + "=" * 80)
    print("RENDER DATABASE ANALYSIS COMPLETE")
    print("=" * 80)
    print("\nSUMMARY:")
    print(f"- Active warehouses: {warehouses.count()}")
    print(f"- Dealers: {dealers}")
    print(f"- Distributors: {distributors}")
    print(f"- Products: {products}")
    
    if products > 0:
        sample_product = Product.objects.first()
        opening_stock = getattr(sample_product, 'openingstock', 0)
        if opening_stock > 0:
            print("\n⚠️  WARNING: Products have database values!")
            print("This means the database has been populated with real data")
            print("Any stock calculation fixes will work with existing data")
    
    print("\nNext steps:")
    print("1. Fix N+1 stock calculation in backend/api/views.py (report_current_stock)")
    print("2. Create sync script to copy dealers/distributors to all warehouses")
    print("3. Apply fixes to resolve Render worker timeouts")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
