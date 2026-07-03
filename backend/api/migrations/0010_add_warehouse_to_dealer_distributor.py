# Safe migration - handles schemas where Dealer/Distributor tables don't exist
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_distributor_distributorcode'),
        ('core', '0004_add_broadcast_model'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$ BEGIN
                ALTER TABLE "Dealer" ADD COLUMN "warehouseId" integer NULL;
            EXCEPTION WHEN undefined_table THEN
                NULL;
            END $$;
            """,
            reverse_sql="""
            DO $$ BEGIN
                ALTER TABLE "Dealer" DROP COLUMN IF EXISTS "warehouseId";
            EXCEPTION WHEN undefined_table THEN
                NULL;
            END $$;
            """
        ),
        migrations.RunSQL(
            sql="""
            DO $$ BEGIN
                ALTER TABLE "Distributor" ADD COLUMN "warehouseId" integer NULL;
            EXCEPTION WHEN undefined_table THEN
                NULL;
            END $$;
            """,
            reverse_sql="""
            DO $$ BEGIN
                ALTER TABLE "Distributor" DROP COLUMN IF EXISTS "warehouseId";
            EXCEPTION WHEN undefined_table THEN
                NULL;
            END $$;
            """
        ),
    ]
