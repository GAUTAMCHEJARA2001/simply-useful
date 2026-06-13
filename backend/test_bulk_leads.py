import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from api.models import User, Company, Lead

def test_lead_import():
    company = Company.objects.first()
    if not company:
        print("No company found! Creating one...")
        company = Company.objects.create(id='C-123', name='Test Company')

    admin = User.objects.filter(role='SUPERADMIN', companyid=company).first()
    if not admin:
        print("No superadmin found! Creating one...")
        admin = User.objects.create(id='U-123', email='admin@test.com', name='Admin', role='SUPERADMIN', companyid=company)

    csv_content = b"""name,companyName,email,phone,status,priority,source,city,state,pincode,value,notes,assignedTo
Test Lead,Test Corp,test@example.com,5551234,NEW,HIGH,Trade Show,Mumbai,Maharashtra,400001,100000,Needs quotation,
"""
    file_obj = SimpleUploadedFile("leads.csv", csv_content, content_type="text/csv")
    
    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.post('/api/v1/bulk/leads/import', {'file': file_obj}, format='multipart')
    
    print("Response Status:", response.status_code)
    try:
        print("Response Content:", response.json())
    except:
        print("Response Content:", response.content)

    leads = Lead.objects.all()
    print("Total Leads in DB:", leads.count())
    if leads.exists():
        lead = leads.last()
        print(f"Lead Created: {lead.name}, City: {lead.city}, State: {lead.state}, Pincode: {lead.pincode}")

if __name__ == "__main__":
    test_lead_import()
