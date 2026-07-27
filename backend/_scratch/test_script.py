from api.models import Dealer, Company
from django.db import connection

print("--- 1. Testing Default Connection Schema ---")
print(f"Current tenant: {getattr(connection, 'tenant', 'None')}")
print(f"Current schema: {connection.schema_name}")

print("\n--- 2. Fetching dealers from public schema ---")
connection.set_schema_to_public()
print(f"Schema switched to: {connection.schema_name}")

dealers = Dealer.objects.using('default').all()
print(f"Found {dealers.count()} dealers in public schema.")

print("\n--- 3. Testing Dealer Creation in Public Schema ---")
try:
    company = Company.objects.first()
    if company:
        test_dealer = Dealer.objects.using('default').create(
            id='test-12345',
            dealercode='DLR-TEST-PYTHON',
            dealername='Python Test Global Dealer',
            city='Test City',
            assignedsoemail='test@example.com',
            active=True,
            companyid=company
        )
        print(f"Successfully created test dealer in {connection.schema_name} schema.")
        
        exists = Dealer.objects.using('default').filter(dealercode='DLR-TEST-PYTHON').exists()
        print(f"Verification query result: {'Found' if exists else 'Not found'}")
        
        test_dealer.delete()
        print("Cleaned up test dealer.")
    else:
        print("No company found to associate dealer with.")
except Exception as e:
    print(f"Error during creation test: {e}")

print("\n--- Test Complete ---")
