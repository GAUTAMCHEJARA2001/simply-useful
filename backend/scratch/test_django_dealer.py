import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Dealer, Company, Visit, Expense
from django.db import connection

print("Current schema:", connection.schema_name)
try:
    connection.set_schema_to_public()
    
    try:
        print("Count Visit:")
        print(Visit.objects.count())
    except Exception as e:
        print("Visit Error:", e)

    try:
        print("Count Expense:")
        print(Expense.objects.count())
    except Exception as e:
        print("Expense Error:", e)

except Exception as e:
    print("General Error:", e)
