import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.views import _read_uploaded_csv
from django.core.files.uploadedfile import SimpleUploadedFile
from api.models import Company, Product, Category, Warehouse, User

class MockReq:
    def __init__(self, file_obj):
        self.FILES = {'file': file_obj}
        self.user = User.objects.first()

def test_import():
    try:
        f = open(r'C:\Users\Gauta\Downloads\FINAL ROW MATERIAL 08082026.xlsx', 'rb')
        file_obj = SimpleUploadedFile('FINAL ROW MATERIAL 08082026.xlsx', f.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        
        req = MockReq(file_obj)
        rows, err = _read_uploaded_csv(req)
        print('Error from CSV read:', err)
        if not rows:
            print('No rows returned')
            return
            
        print(f"Total rows parsed: {len(rows)}")
        print(f"First row: {rows[0]}")
        
    except Exception as e:
        print("EXCEPTION:", str(e))

if __name__ == '__main__':
    test_import()
