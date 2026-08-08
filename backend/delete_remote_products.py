import os
import sys
import django
import dj_database_url

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.conf import settings
# Override the database with the remote Render URL
settings.DATABASES['default'] = dj_database_url.parse('postgresql://simply_useful_db_new_user:vatrxPFhNQ30vVFnm0EBschWBiF6QPuh@dpg-d9rd63ifngtc73d400s0-a.singapore-postgres.render.com/simply_useful_db_new')

django.setup()

from api.models import Product

def clear_products():
    count = Product.objects.count()
    print(f"Found {count} products in the remote database.")
    if count > 0:
        deleted_count, details = Product.objects.all().delete()
        print(f"Successfully deleted {deleted_count} items from the remote database.")
        print(details)
    else:
        print("No products to delete.")

if __name__ == '__main__':
    clear_products()
