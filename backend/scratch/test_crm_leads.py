import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import json
import uuid
from django.test import RequestFactory
from core.middleware import HeaderTenantMiddleware
from rest_framework.test import force_authenticate
from core.models import User, Warehouse
from api.views import LeadViewSet

# Get a superadmin user
user_model = User.objects.get(email='admin@simplyuseful.com')
from api.auth import JWTUser
user = JWTUser(
    user_id=user_model.id,
    email=user_model.email,
    role=user_model.role,
    company_id=user_model.companyid_id
)
factory = RequestFactory()

def get_response_leads(request):
    # Determine the action based on HTTP method and URL
    if request.method == 'GET':
        if request.path.rstrip('/').endswith('leads'):
            view = LeadViewSet.as_view({'get': 'list'})
        else:
            view = LeadViewSet.as_view({'get': 'retrieve'})
    elif request.method == 'POST':
        view = LeadViewSet.as_view({'post': 'create'})
    elif request.method == 'PATCH':
        if request.path.rstrip('/').endswith('move'):
            view = LeadViewSet.as_view({'patch': 'move_stage'})
        else:
            view = LeadViewSet.as_view({'patch': 'partial_update'})
    elif request.method == 'DELETE':
        view = LeadViewSet.as_view({'delete': 'destroy'})
    else:
        raise ValueError(f"Unsupported method {request.method}")

    # Extract pk from url if detail
    url_parts = request.path.rstrip('/').split('/')
    pk = None
    if url_parts[-1] == 'move':
        pk = url_parts[-2]
    elif url_parts[-1] != 'leads':
        pk = url_parts[-1]

    kwargs = {}
    if pk:
        kwargs['pk'] = pk

    try:
        response = view(request, **kwargs)
        print(f"[{request.method} {request.path}] Status: {response.status_code}")
        if response.status_code >= 400:
            print("Response Data (Error):", response.data)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e

middleware = HeaderTenantMiddleware(get_response_leads)

def run_tests():
    print("=== STARTING CRM LEADS ROUTING TESTS ===")

    # Test 1: GET /api/v1/crm/leads with X-Warehouse-ID: GLOBAL
    print("\n--- Test 1: GET Leads list under GLOBAL ---")
    request1 = factory.get('/api/v1/crm/leads', HTTP_X_WAREHOUSE_ID='GLOBAL')
    force_authenticate(request1, user=user)
    response1 = middleware(request1)
    leads_before = response1.data.get('data', [])
    print(f"Number of leads fetched: {len(leads_before)}")

    # Test 2: POST /api/v1/crm/leads with X-Warehouse-ID: GLOBAL
    print("\n--- Test 2: POST Create Lead under GLOBAL ---")
    suffix = uuid.uuid4().hex[:6]
    test_lead_name = f"John Doe Test Global {suffix}"
    import random
    phone_num = "".join(random.choices("0123456789", k=10))
    request2 = factory.post(
        '/api/v1/crm/leads',
        data=json.dumps({
            'name': test_lead_name,
            'company_name': 'Global Corp',
            'email': f'john.doe.{suffix}@global.com',
            'phone': phone_num,
            'priority': 'HIGH',
            'notes': 'Test lead created globally'
        }),
        content_type='application/json',
        HTTP_X_WAREHOUSE_ID='GLOBAL'
    )
    force_authenticate(request2, user=user)
    response2 = middleware(request2)
    assert response2.status_code == 201, f"Expected 201, got {response2.status_code}"
    lead_data = response2.data.get('data', {})
    lead_id = lead_data.get('id')
    lead_version = lead_data.get('version')
    print(f"Lead created successfully! ID: {lead_id}, Version: {lead_version}")

    # Test 3: GET /api/v1/crm/leads/<pk> under GLOBAL
    print("\n--- Test 3: GET Retrieve Lead under GLOBAL ---")
    request3 = factory.get(f'/api/v1/crm/leads/{lead_id}', HTTP_X_WAREHOUSE_ID='GLOBAL')
    force_authenticate(request3, user=user)
    response3 = middleware(request3)
    assert response3.status_code == 200, f"Expected 200, got {response3.status_code}"
    print("Retrieved lead name:", response3.data.get('data', {}).get('name'))

    # Test 4: PATCH /api/v1/crm/leads/<pk>/move under GLOBAL
    print("\n--- Test 4: PATCH Move Lead Stage under GLOBAL ---")
    request4 = factory.patch(
        f'/api/v1/crm/leads/{lead_id}/move',
        data=json.dumps({
            'status': 'CONTACTED',
            'version': lead_version
        }),
        content_type='application/json',
        HTTP_X_WAREHOUSE_ID='GLOBAL'
    )
    force_authenticate(request4, user=user)
    response4 = middleware(request4)
    assert response4.status_code == 200, f"Expected 200, got {response4.status_code}"
    new_version = response4.data.get('data', {}).get('version')
    print("Lead moved successfully! New Status:", response4.data.get('data', {}).get('status'), "New Version:", new_version)

    # Test 5: PATCH /api/v1/crm/leads/<pk> under GLOBAL (Partial Update)
    print("\n--- Test 5: PATCH Update Lead Details under GLOBAL ---")
    request5 = factory.patch(
        f'/api/v1/crm/leads/{lead_id}',
        data=json.dumps({
            'companyName': 'Global Corp Updated',
            'version': new_version
        }),
        content_type='application/json',
        HTTP_X_WAREHOUSE_ID='GLOBAL'
    )
    force_authenticate(request5, user=user)
    response5 = middleware(request5)
    assert response5.status_code == 200, f"Expected 200, got {response5.status_code}"
    final_version = response5.data.get('data', {}).get('version')
    print("Lead details updated! New Company Name:", response5.data.get('data', {}).get('companyName'), "Final Version:", final_version)

    # Test 6: DELETE /api/v1/crm/leads/<pk> under GLOBAL (Archive)
    print("\n--- Test 6: DELETE Archive Lead under GLOBAL ---")
    request6 = factory.delete(f'/api/v1/crm/leads/{lead_id}', HTTP_X_WAREHOUSE_ID='GLOBAL')
    force_authenticate(request6, user=user)
    response6 = middleware(request6)
    assert response6.status_code == 200, f"Expected 200, got {response6.status_code}"
    print("Lead archived successfully!")

    print("\n=== ALL CRM LEADS ROUTING TESTS PASSED ===")

if __name__ == '__main__':
    run_tests()
