import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
import django
from django.db import transaction

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Brand, Category, Product, Userproductaccess, Warehouse
from core.models import Company
from api.views import get_allowed_product_ids_for_user

# Get the first active warehouse schema DB
wh = Warehouse.objects.filter(active=True).first()
if not wh or not wh.db_name:
    print("No active warehouse with a DB alias found.")
    exit(1)

db_name = wh.db_name
print(f"Using DB alias: {db_name}")

try:
    with transaction.atomic(using=db_name):
        # Fetch or create a company on default/public db (since Company is shared)
        company = Company.objects.first()
        if not company:
            company = Company.objects.create(id="test-company", name="Test Company", active=True)
        
        # User is also shared in public/default
        user = User.objects.first()
        if not user:
            user = User.objects.create(
                id="test-user", email="test@example.com", name="Test User",
                role="SALES", active=True, companyid=company
            )
            
        print(f"Using test user: {user.email}")
        
        # Create brand, category, products on the tenant database (db_name)
        brand_a = Brand.objects.using(db_name).create(name="Temp Brand A", active=True, companyid=company)
        brand_b = Brand.objects.using(db_name).create(name="Temp Brand B", active=True, companyid=company)
        
        cat_parent = Category.objects.using(db_name).create(name="Temp Parent", active=True, companyid=company)
        cat_sub = Category.objects.using(db_name).create(name="Temp Sub", active=True, companyid=company, parentid=cat_parent)
        cat_other = Category.objects.using(db_name).create(name="Temp Other", active=True, companyid=company)
        
        p1 = Product.objects.using(db_name).create(
            id="temp_p1", productcode="TP1", name="Temp P1", bagsize="50kg",
            brandid=brand_a, categoryid=cat_parent, rate=100.0, gst=18.0, active=True,
            companyid=company, openingstock=10, minimumstock=2
        )
        p2 = Product.objects.using(db_name).create(
            id="temp_p2", productcode="TP2", name="Temp P2", bagsize="50kg",
            brandid=brand_a, categoryid=cat_sub, rate=120.0, gst=18.0, active=True,
            companyid=company, openingstock=10, minimumstock=2
        )
        p3 = Product.objects.using(db_name).create(
            id="temp_p3", productcode="TP3", name="Temp P3", bagsize="50kg",
            brandid=brand_b, categoryid=cat_parent, rate=130.0, gst=18.0, active=True,
            companyid=company, openingstock=10, minimumstock=2
        )
        p4 = Product.objects.using(db_name).create(
            id="temp_p4", productcode="TP4", name="Temp P4", bagsize="50kg",
            brandid=brand_b, categoryid=cat_other, rate=140.0, gst=18.0, active=True,
            companyid=company, openingstock=10, minimumstock=2
        )
        
        # Helper to run tests
        def run_assertions(expected_ids):
            allowed = get_allowed_product_ids_for_user(db_name, user.id)
            # Filter to our temp products only to avoid interfering with existing products in database
            allowed_temp = [pid for pid in (allowed or []) if pid.startswith("temp_")]
            assert set(allowed_temp) == set(expected_ids), f"Expected {expected_ids}, got {allowed_temp}"
            
        print("Testing Case 1: No assignments...")
        allowed_none = get_allowed_product_ids_for_user(db_name, user.id)
        # Should be None if they had no assignments. Wait, if the user already had some assignments in the DB,
        # let's delete them temporarily inside the transaction.
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        assert get_allowed_product_ids_for_user(db_name, user.id) is None
        
        print("Testing Case 2: Brand only assignment...")
        Userproductaccess.objects.using(db_name).create(userid=user, brandid=brand_a)
        run_assertions(["temp_p1", "temp_p2"])
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        
        print("Testing Case 3: Category only assignment (should include subcategories)...")
        Userproductaccess.objects.using(db_name).create(userid=user, categoryid=cat_parent)
        run_assertions(["temp_p1", "temp_p2", "temp_p3"])
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        
        print("Testing Case 4: Brand + Category assignment...")
        Userproductaccess.objects.using(db_name).create(userid=user, brandid=brand_a)
        Userproductaccess.objects.using(db_name).create(userid=user, categoryid=cat_parent)
        run_assertions(["temp_p1", "temp_p2"])
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        
        print("Testing Case 5: Product only assignment...")
        Userproductaccess.objects.using(db_name).create(userid=user, productid=p3)
        run_assertions(["temp_p3"])
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        
        print("Testing Case 6: Brand + Product assignment...")
        Userproductaccess.objects.using(db_name).create(userid=user, brandid=brand_b)
        Userproductaccess.objects.using(db_name).create(userid=user, productid=p1)
        run_assertions(["temp_p1", "temp_p3", "temp_p4"])
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        
        print("Testing Case 7: Category + Product assignment...")
        Userproductaccess.objects.using(db_name).create(userid=user, categoryid=cat_other)
        Userproductaccess.objects.using(db_name).create(userid=user, productid=p1)
        run_assertions(["temp_p1", "temp_p4"])
        Userproductaccess.objects.using(db_name).filter(userid=user).delete()
        
        print("ALL PERMISSION TESTS PASSED SUCCESSFULLY!")
        raise RuntimeError("Rollback transaction")  # Force rollback
        
except RuntimeError as e:
    if str(e) == "Rollback transaction":
        print("Rollback successful. DB is clean.")
    else:
        raise e
