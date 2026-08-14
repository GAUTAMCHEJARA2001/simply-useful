import os
import django
import sys
import uuid

# Setup Django
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Product, Stocktransaction, Bom, Bomitem, Warehouse
from core.models import User, Company
from django.utils import timezone
from decimal import Decimal
from django.db.models import Sum

def run_tests():
    print("Starting production variance tests...")
    
    # Setup test data
    company, _ = Company.objects.get_or_create(id='test_company', defaults={'name': 'Test Company', 'active': True})
    wh, _ = Warehouse.objects.get_or_create(id=1, defaults={'name': 'Test WH', 'companyid': company, 'active': True})
    user, _ = User.objects.get_or_create(id='test_user', defaults={'email': 'test@test.com', 'role': 'SUPERADMIN', 'name': 'Test', 'active': True})
    
    # Products
    fg, _ = Product.objects.get_or_create(id='fg1', defaults={'name': 'Wall Putty 20kg', 'productcode': 'WP20', 'companyid': company, 'active': True, 'rate': 100, 'gst': 18, 'openingstock': 0, 'minimumstock': 0})
    sand, _ = Product.objects.get_or_create(id='rm1', defaults={'name': 'Sand', 'productcode': 'SAND', 'companyid': company, 'active': True, 'rate': 2, 'gst': 5, 'openingstock': 10000, 'minimumstock': 0})
    cement, _ = Product.objects.get_or_create(id='rm2', defaults={'name': 'Cement', 'productcode': 'CEM', 'companyid': company, 'active': True, 'rate': 10, 'gst': 5, 'openingstock': 5000, 'minimumstock': 0})
    
    # BOM for 100 bags
    bom, _ = Bom.objects.get_or_create(id='bom1', productcode=fg.id, defaults={'name': 'WP BOM', 'companyid': company, 'outputquantity': 100.0, 'status': 'APPROVED'})
    Bomitem.objects.get_or_create(id='bomitem1', bomid=bom, defaults={'materialname': 'Sand', 'qty': 1500, 'unit': 'KG'})
    Bomitem.objects.get_or_create(id='bomitem2', bomid=bom, defaults={'materialname': 'Cement', 'qty': 500, 'unit': 'KG'})
    
    # Clean old test transactions
    Stocktransaction.objects.filter(referenceid__startswith='test_prod_').delete()
    Stocktransaction.objects.filter(id__startswith='test_prod_').delete()

    from api.views import transaction_productions, transaction_productions_detail
    from rest_framework.test import APIRequestFactory
    
    factory = APIRequestFactory()

    # Simulate Request User
    class MockUser:
        def __init__(self, user_id):
            self.id = user_id
    
    # Function to calculate stock for a product
    def get_stock(product_id):
        stock = Product.objects.get(id=product_id).openingstock
        stock += Stocktransaction.objects.filter(productid=product_id, is_deleted=False).aggregate(Sum('quantity'))['quantity__sum'] or 0
        return stock
    
    opening_sand = get_stock(sand.id)
    opening_cement = get_stock(cement.id)
    opening_fg = get_stock(fg.id)

    print(f"Opening Stock -> Sand: {opening_sand}, Cement: {opening_cement}, FG: {opening_fg}")

    # Case A: Short Yield
    print("\n--- Test Case A: Short Yield (98 bags, 1 batch) ---")
    payload_A = {
        'productId': fg.id,
        'warehouseId': wh.id,
        'batches': 1.0,
        'expectedQuantity': 100.0,
        'quantity': 98.0, # Actual yield
        'items': [
            {'productId': sand.id, 'quantity': 1500},
            {'productId': cement.id, 'quantity': 500},
        ]
    }
    request = factory.post('/api/v1/transactions/productions', payload_A, format='json')
    request.user = MockUser(user.id)
    response = transaction_productions(request)
    
    assert response.status_code == 200, f"Post failed: {response.data}"
    prod_A_id = response.data['data']['id']
    print(f"Production created: {prod_A_id}")
    
    # Approve it
    request_appr = factory.put(f'/api/v1/transactions/productions/{prod_A_id}', {'status': 'APPROVED'}, format='json')
    request_appr.user = MockUser(user.id)
    transaction_productions_detail(request_appr, prod_A_id)

    st_A = Stocktransaction.objects.get(id=prod_A_id)
    assert st_A.quantity == 98, f"Expected 98, got {st_A.quantity}"
    assert st_A.expected_quantity == 100, f"Expected 100 expected_quantity, got {st_A.expected_quantity}"
    assert st_A.batches == 1, "Expected 1 batch"
    
    sand_consumed_A = Stocktransaction.objects.get(referenceid=prod_A_id, productid=sand.id).quantity
    assert sand_consumed_A == -1500, f"Expected -1500 sand, got {sand_consumed_A}"
    
    # Stock Ledger verification
    curr_sand = get_stock(sand.id)
    curr_fg = get_stock(fg.id)
    print(f"Post-A Stock -> Sand: {curr_sand}, FG: {curr_fg}")
    assert curr_sand == opening_sand - 1500, "Sand stock incorrect"
    assert curr_fg == opening_fg + 98, "FG stock incorrect"

    print("\n--- Test Case C: Excess Yield (102 bags, 1 batch) ---")
    payload_C = {
        'productId': fg.id,
        'warehouseId': wh.id,
        'batches': 1.0,
        'expectedQuantity': 100.0,
        'quantity': 102.0, # Actual yield
        'items': [
            {'productId': sand.id, 'quantity': 1500},
            {'productId': cement.id, 'quantity': 500},
        ]
    }
    request = factory.post('/api/v1/transactions/productions', payload_C, format='json')
    request.user = MockUser(user.id)
    response = transaction_productions(request)
    prod_C_id = response.data['data']['id']
    
    # Approve it
    request_appr = factory.put(f'/api/v1/transactions/productions/{prod_C_id}', {'status': 'APPROVED'}, format='json')
    request_appr.user = MockUser(user.id)
    transaction_productions_detail(request_appr, prod_C_id)

    st_C = Stocktransaction.objects.get(id=prod_C_id)
    assert st_C.quantity == 102, f"Expected 102, got {st_C.quantity}"
    assert st_C.expected_quantity == 100, f"Expected 100 expected_quantity, got {st_C.expected_quantity}"

    print("\n--- Test Multi-Batch: 2 batches (196 bags) ---")
    payload_multi = {
        'productId': fg.id,
        'warehouseId': wh.id,
        'batches': 2.0,
        'expectedQuantity': 200.0,
        'quantity': 196.0, # Actual yield
        'items': [
            {'productId': sand.id, 'quantity': 3000},
            {'productId': cement.id, 'quantity': 1000},
        ]
    }
    request = factory.post('/api/v1/transactions/productions', payload_multi, format='json')
    request.user = MockUser(user.id)
    response = transaction_productions(request)
    prod_multi_id = response.data['data']['id']
    request_appr = factory.put(f'/api/v1/transactions/productions/{prod_multi_id}', {'status': 'APPROVED'}, format='json')
    request_appr.user = MockUser(user.id)
    transaction_productions_detail(request_appr, prod_multi_id)

    st_multi = Stocktransaction.objects.get(id=prod_multi_id)
    assert st_multi.quantity == 196
    assert st_multi.expected_quantity == 200
    sand_consumed_multi = Stocktransaction.objects.get(referenceid=prod_multi_id, productid=sand.id).quantity
    assert sand_consumed_multi == -3000

    print("\n--- Test Edit: Change A to 100 bags, same raw materials ---")
    payload_edit = {
        'productId': fg.id,
        'warehouseId': wh.id,
        'batches': 1.0,
        'expectedQuantity': 100.0,
        'quantity': 100.0, # Change 98 to 100
        'items': [
            {'productId': sand.id, 'quantity': 1500},
            {'productId': cement.id, 'quantity': 500},
        ]
    }
    request = factory.put(f'/api/v1/transactions/productions/{prod_A_id}', payload_edit, format='json')
    request.user = MockUser(user.id)
    transaction_productions_detail(request, prod_A_id)
    
    # Wait, an edit in the UI for productions does NOT use the 'status': 'APPROVED' payload, 
    # it sends the items array. Let's make sure it updated.
    st_A_edited = Stocktransaction.objects.get(id=prod_A_id)
    print(f"Edited Quantity: {st_A_edited.quantity}")
    assert st_A_edited.quantity == 100, f"Edit failed, qty is {st_A_edited.quantity}"
    # Verify no duplicate raw materials
    sand_count = Stocktransaction.objects.filter(referenceid=prod_A_id, productid=sand.id).count()
    assert sand_count == 1, f"Expected 1 sand transaction for edited prod, got {sand_count}"

    print("\n--- Test Delete: Delete C ---")
    request = factory.delete(f'/api/v1/transactions/productions/{prod_C_id}', {'reason': 'Mistake'}, format='json')
    request.user = MockUser(user.id)
    transaction_productions_detail(request, prod_C_id)
    
    st_C_deleted = Stocktransaction.objects.get(id=prod_C_id)
    assert st_C_deleted.is_deleted == True, "Production not deleted"
    # Verify consumed deleted
    sand_consumed_C_deleted = Stocktransaction.objects.get(referenceid=prod_C_id, productid=sand.id)
    assert sand_consumed_C_deleted.is_deleted == True, "Consumed not deleted"

    # Final Ledger check
    final_sand = get_stock(sand.id)
    final_fg = get_stock(fg.id)
    print(f"Final Stock -> Sand: {final_sand}, FG: {final_fg}")
    # Opening Sand - A(1500) - Multi(3000) = opening - 4500
    assert final_sand == opening_sand - 4500
    # Opening FG + A_edited(100) + Multi(196) = opening + 296
    assert final_fg == opening_fg + 296

    print("\n✅ All End-to-End Tests Passed successfully!")

if __name__ == '__main__':
    run_tests()
