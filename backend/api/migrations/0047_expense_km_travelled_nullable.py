from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0046_purchaseitem_productid_stocktransfer_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$ 
            BEGIN
                -- 1. Ensure km_travelled column exists and is nullable with default 0.0
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'km_travelled'
                ) THEN
                    ALTER TABLE "Expense" ALTER COLUMN "km_travelled" DROP NOT NULL;
                    ALTER TABLE "Expense" ALTER COLUMN "km_travelled" SET DEFAULT 0.0;
                    UPDATE "Expense" SET "km_travelled" = 0.0 WHERE "km_travelled" IS NULL;
                ELSE
                    ALTER TABLE "Expense" ADD COLUMN "km_travelled" double precision DEFAULT 0.0;
                END IF;

                -- 2. Ensure other travel/odometer columns on Expense are nullable
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'location_tag'
                ) THEN
                    ALTER TABLE "Expense" ALTER COLUMN "location_tag" DROP NOT NULL;
                ELSE
                    ALTER TABLE "Expense" ADD COLUMN "location_tag" text NULL;
                END IF;

                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'odometer_start'
                ) THEN
                    ALTER TABLE "Expense" ALTER COLUMN "odometer_start" DROP NOT NULL;
                ELSE
                    ALTER TABLE "Expense" ADD COLUMN "odometer_start" double precision NULL;
                END IF;

                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'odometer_end'
                ) THEN
                    ALTER TABLE "Expense" ALTER COLUMN "odometer_end" DROP NOT NULL;
                ELSE
                    ALTER TABLE "Expense" ADD COLUMN "odometer_end" double precision NULL;
                END IF;

                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'start_photo'
                ) THEN
                    ALTER TABLE "Expense" ALTER COLUMN "start_photo" DROP NOT NULL;
                ELSE
                    ALTER TABLE "Expense" ADD COLUMN "start_photo" text NULL;
                END IF;

                -- 3. Ensure verifiedBy and verifiedAt columns exist
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'verifiedBy'
                ) THEN
                    ALTER TABLE "Expense" ADD COLUMN "verifiedBy" text NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'Expense' AND column_name = 'verifiedAt'
                ) THEN
                    ALTER TABLE "Expense" ADD COLUMN "verifiedAt" timestamp with time zone NULL;
                END IF;
            END $$;
            """,
            reverse_sql="""
            -- No-op reverse
            """
        ),
    ]
