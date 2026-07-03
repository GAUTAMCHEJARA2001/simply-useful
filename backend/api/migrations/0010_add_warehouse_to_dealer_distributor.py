# Schema changes handled via management commands for multi-tenant safety
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_distributor_distributorcode'),
        ('core', '0004_add_broadcast_model'),
    ]

    operations = []
