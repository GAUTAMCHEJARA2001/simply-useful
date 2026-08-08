import os
import sys
import django
from django.utils import timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.views import _read_uploaded_csv, _new_id, _resolve_warehouse
from django.core.files.uploadedfile import SimpleUploadedFile
from api.models import Company, Product, Category, Warehouse, User
from api.views import _company_id

class MockReq:
    def __init__(self, file_obj):
        self.FILES = {'file': file_obj}
        self.user = User.objects.first()

def test_import():
    f = open(r'C:\Users\Gauta\Downloads\FINAL ROW MATERIAL 08082026.xlsx', 'rb')
    file_obj = SimpleUploadedFile('FINAL ROW MATERIAL 08082026.xlsx', f.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    req = MockReq(file_obj)
    rows, error = _read_uploaded_csv(req)
    
    company_id = _company_id(req)
    created = 0
    updated = 0
    skipped = []
    
    import random, string
    for index, row in enumerate(rows, start=2):
        name = (row.get('name') or row.get('productName') or '').strip()
        category_name = (row.get('category') or '').strip()
        subcategory_name = (row.get('subcategory') or row.get('subCategory') or row.get('sub_category') or '').strip()
        warehouse_val = (row.get('warehouse') or row.get('warehouseName') or row.get('assignedWarehouse') or '').strip()
        
        if not name or (not category_name and (not subcategory_name)):
            skipped.append({'row': index, 'reason': 'productName/name and category/subcategory are required'})
            continue
            
        target_warehouse = _resolve_warehouse(warehouse_val, company_id)
        if not target_warehouse:
            skipped.append({'row': index, 'reason': 'No active warehouse found to assign product'})
            continue
            
        category_to_assign = None
        if category_name:
            category, created_cat = Category.objects.get_or_create(name=category_name, companyid_id=company_id, defaults={'parentid': None, 'active': True})
            category_to_assign = category.id
            if subcategory_name:
                subcategory, created_sub = Category.objects.get_or_create(name=subcategory_name, companyid_id=company_id, defaults={'parentid': category, 'active': True})
                category_to_assign = subcategory.id
        elif subcategory_name:
            subcategory, created_sub = Category.objects.get_or_create(name=subcategory_name, companyid_id=company_id, defaults={'parentid': None, 'active': True})
            category_to_assign = subcategory.id
            
        rate_str = (row.get('rate') or row.get('price') or row.get('sellingPrice') or '').strip()
        try:
            rate_val = float(rate_str) if rate_str else 0.0
        except ValueError:
            rate_val = 0.0
            
        gst_str = (row.get('gst') or row.get('tax') or '').strip()
        try:
            gst_val = float(gst_str) if gst_str else 0.0
        except ValueError:
            gst_val = 0.0
            
        opening_stock_str = (row.get('openingStock') or row.get('stock') or row.get('quantity') or '').strip()
        try:
            opening_stock = int(opening_stock_str) if opening_stock_str else 0
        except ValueError:
            opening_stock = 0
            
        minimum_stock_str = (row.get('minimumStock') or row.get('minStock') or '').strip()
        try:
            minimum_stock = int(minimum_stock_str) if minimum_stock_str else 0
        except ValueError:
            minimum_stock = 0
            
        values = {'name': name, 'categoryid_id': category_to_assign, 'warehouseid_id': target_warehouse.id if target_warehouse else None, 'brand': (row.get('brand') or '').strip(), 'unit': (row.get('unit') or '').strip(), 'bagsize': (row.get('bagSize') or row.get('bag_size') or '').strip(), 'rate': rate_val, 'gst': gst_val, 'openingstock': opening_stock, 'minimumstock': minimum_stock, 'active': True, 'companyid_id': company_id}
        
        existing = Product.objects.filter(name=name, categoryid_id=category_to_assign, companyid_id=company_id).first()
        if existing:
            for k, v in values.items():
                setattr(existing, k, v)
            existing.save()
            updated += 1
            code = existing.productcode
        else:
            code_val = (row.get('productCode') or row.get('product_code') or '').strip()
            company = Company.objects.filter(id=company_id).first()
            prefix = getattr(company, 'skuprefix', 'PRD') or 'PRD'
            code = None
            if code_val and not Product.objects.filter(productcode=code_val, companyid_id=company_id).exists():
                code = code_val
            else:
                attempts = 0
                while attempts < 100:
                    rand_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    candidate_code = f'{prefix}-{rand_suffix}'
                    if not Product.objects.filter(productcode=candidate_code, companyid_id=company_id).exists():
                        code = candidate_code
                        break
                    attempts += 1
            if not code:
                skipped.append({'row': index, 'reason': 'Failed to generate unique product code'})
                continue
            Product.objects.create(id=_new_id(), productcode=code, createdat=timezone.now(), **values)
            created += 1

    print(f"Created: {created}, Updated: {updated}, Skipped: {len(skipped)}")
    if skipped:
        print("First few skipped:", skipped[:5])

if __name__ == '__main__':
    test_import()
