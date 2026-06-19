import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Warehouse

def main():
    print("🗑️ Deleting all tenant warehouses and dropping their schemas...")
    
    # Get all warehouses except the public schema tenant
    tenants = Warehouse.objects.exclude(schema_name='public')
    
    for tenant in tenants:
        print(f"  Deleting warehouse: {tenant.name} (schema: {tenant.schema_name})...")
        try:
            # This deletes the warehouse, its domains, and drops the Postgres schema automatically
            tenant.delete()
            print(f"  Successfully deleted {tenant.name} and dropped its schema.")
        except Exception as e:
            print(f"  Error deleting {tenant.name}: {e}")
            
    print("Done! Only the public schema tenant remains.")

if __name__ == '__main__':
    main()
