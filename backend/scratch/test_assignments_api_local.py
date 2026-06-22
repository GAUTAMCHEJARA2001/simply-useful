import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.db_router import setup_dynamic_tenant_databases
setup_dynamic_tenant_databases()

from api.models import User, Brand, Category, Product, Userproductaccess, Warehouse
from api.auth import generate_tokens
from django.test import Client
import json

# Find the first active warehouse
wh = Warehouse.objects.filter(active=True).first()
if not wh or not wh.db_name:
    print("No active warehouse with a DB alias found.")
    exit(1)

db_name = wh.db_name
print(f"Using warehouse: {wh.name} (DB: {db_name})")

# Let's find an admin user and a sales user
admin = User.objects.filter(role='SUPERADMIN').first() or User.objects.filter(role='ADMIN').first()
sales_user = User.objects.filter(role='SALES').first()

if not admin or not sales_user:
    print("Admin or Sales user not found.")
    exit(1)

print(f"Admin: {admin.email} (ID: {admin.id})")
print(f"Sales User: {sales_user.email} (ID: {sales_user.id})")

# Get some brand, category, products from the tenant DB
brands = list(Brand.objects.using(db_name).filter(active=True)[:2])
categories = list(Category.objects.using(db_name).filter(active=True)[:2])
products = list(Product.objects.using(db_name).filter(active=True)[:2])

if not brands or not categories or not products:
    print("Brands, categories, or products are missing in tenant DB.")
    exit(1)

brand_ids = [b.id for b in brands]
category_ids = [c.id for c in categories]
product_ids = [p.id for p in products]

print(f"Testing with: Brands {brand_ids}, Categories {category_ids}, Products {product_ids}")

# Generate tokens
admin_token = generate_tokens(str(admin.id), admin.email, admin.role, admin.companyid_id)[0]
sales_token = generate_tokens(str(sales_user.id), sales_user.email, sales_user.role, sales_user.companyid_id)[0]

client = Client()

# 1. Clear assignments for safety first
Userproductaccess.objects.using(db_name).filter(userid=sales_user).delete()

# 2. Save assignments using the POST API as Admin
url = f"/api/v1/masters/users/{sales_user.id}/assignments"
post_data = {
    "brands": brand_ids,
    "categories": category_ids,
    "products": product_ids,
    "warehouses": [wh.id]
}
resp = client.post(
    url, 
    data=json.dumps(post_data), 
    content_type="application/json", 
    HTTP_AUTHORIZATION=f"Bearer {admin_token}",
    HTTP_X_WAREHOUSE_ID=str(wh.id)
)

print(f"POST assignments status: {resp.status_code}")
if resp.status_code != 200:
    print("POST failed:", resp.content)
    exit(1)

# 3. Retrieve assignments using the GET API
resp = client.get(
    url, 
    HTTP_AUTHORIZATION=f"Bearer {admin_token}",
    HTTP_X_WAREHOUSE_ID=str(wh.id)
)
print(f"GET assignments status: {resp.status_code}")
data = resp.json().get('data', {})
print("Retrieved Brand IDs:", data.get('brands'))
print("Retrieved Category IDs:", data.get('categories'))
print("Retrieved Product IDs:", data.get('products'))

# Validate correct retrieval
assert set(data.get('brands', [])) == set(brand_ids)
assert set(data.get('categories', [])) == set(category_ids)
assert set(data.get('products', [])) == set(product_ids)

# 4. Fetch filtered products as Sales User
prod_url = "/api/v1/products"
resp = client.get(
    prod_url,
    HTTP_AUTHORIZATION=f"Bearer {sales_token}",
    HTTP_X_WAREHOUSE_ID=str(wh.id)
)
print(f"GET products as restricted sales user status: {resp.status_code}")
retrieved_prods = resp.json().get('data', [])
print(f"Total products returned: {len(retrieved_prods)}")

# All returned products must match the allowed logic
# (brand in brand_ids & category in category_ids) or (product in product_ids)
for p in retrieved_prods:
    p_id = p.get('id')
    p_brand = p.get('brandid') or p.get('brandId')
    p_cat = p.get('categoryid') or p.get('categoryId')
    
    # Check hierarchy - get all subcategories of category_ids
    # Resolve subcategories
    from api.views import get_allowed_product_ids_for_user
    allowed_ids = get_allowed_product_ids_for_user(db_name, sales_user.id)
    assert p_id in allowed_ids, f"Product {p_id} (Brand: {p_brand}, Cat: {p_cat}) was returned but NOT allowed!"

print("INTEGRATION API FLOW VERIFIED SUCCESSFULLY!")
