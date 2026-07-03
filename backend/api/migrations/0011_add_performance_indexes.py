# Empty migration - indexes added via management command instead
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0010_add_warehouse_to_dealer_distributor'),
    ]
    operations = []
