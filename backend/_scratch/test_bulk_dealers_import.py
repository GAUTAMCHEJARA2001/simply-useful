import os, sys, django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection, connections
from api.models import User, Company, Dealer, Warehouse
from api.db_router import setup_dynamic_tenant_databases
from django.utils import timezone

def run_test():
    setup_dynamic_tenant_databases()
    
    wh = Warehouse.objects.using('default').filter(schema_name='wh_surat').first()
    if not wh:
        print("Error: wh_surat not found")
        return
        
    company = Company.objects.first()
    company_id = company.id
    
    # Let's set tenant schema context
    connection.set_tenant(wh)
    print("Set tenant schema to:", connection.schema_name)
    
    # Mock data rows
    rows = [
        {
            'dealerCode': 'D-TEST-01',
            'dealerName': 'Bulk Import Test Dealer 1',
            'city': 'Surat',
            'assignedSoEmail': 'super@kamla.com',
            'distributorName': 'Sample Distributor',
            'creditLimit': '100000',
            'outstanding': '0',
            'active': 'true',
            'territory': 'T-WEST'
        }
    ]
    
    from api.views import _num, _truthy, _new_id
    
    print("Simulating bulk import dealers loop...")
    for index, row in enumerate(rows, start=2):
        code = (row.get('dealerCode') or row.get('dealer_code') or '').strip()
        name = (row.get('dealerName') or row.get('dealer_name') or '').strip()
        if not code or not name:
            print(f"Row {index} skipped: dealerCode and dealerName required")
            continue
            
        values = {
            'dealername': name,
            'city': row.get('city') or '',
            'assignedsoemail': row.get('assignedSoEmail') or row.get('assigned_so_email') or '',
            'distributorname': row.get('distributorName') or row.get('distributor_name') or '',
            'creditlimit': _num(row.get('creditLimit') or row.get('credit_limit')),
            'outstanding': _num(row.get('outstanding')),
            'active': _truthy(row.get('active'), True),
            'territory': row.get('territory') or '',
            'companyid_id': company_id,
            'updatedat': timezone.now(),
        }
        
        db_alias = wh.schema_name or wh.db_name
        print(f"Values to save: {values} on {db_alias}")
        
        try:
            existing = Dealer.objects.using(db_alias).filter(dealercode=code, companyid_id=company_id).first()
            if existing:
                print("Updating existing dealer...")
                for key, value in values.items():
                    setattr(existing, key, value)
                existing.save(using=db_alias)
                print("Updated successfully!")
            else:
                print("Creating new dealer...")
                created_dealer = Dealer.objects.create(id=_new_id(), dealercode=code, createdat=timezone.now(), **values)
                print("Created successfully! ID:", created_dealer.id)
                # clean up
                created_dealer.delete()
        except Exception as e:
            print("Exception during import:", type(e), str(e))

if __name__ == '__main__':
    run_test()
