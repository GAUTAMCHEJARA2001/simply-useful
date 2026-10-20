from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0047_expense_km_travelled_nullable'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='dailytravellog',
                    name='is_admin_edited',
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name='dailytravellog',
                    name='is_manual_entry',
                    field=models.BooleanField(default=False),
                ),
                migrations.AddField(
                    model_name='dailytravellog',
                    name='admin_notes',
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='dailytravellog',
                    name='edited_by_admin_name',
                    field=models.CharField(blank=True, max_length=255, null=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'DailyTravelLog' AND column_name = 'is_admin_edited'
                        ) THEN
                            ALTER TABLE "DailyTravelLog" ADD COLUMN "is_admin_edited" boolean NOT NULL DEFAULT false;
                        END IF;

                        IF NOT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'DailyTravelLog' AND column_name = 'is_manual_entry'
                        ) THEN
                            ALTER TABLE "DailyTravelLog" ADD COLUMN "is_manual_entry" boolean NOT NULL DEFAULT false;
                        END IF;

                        IF NOT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'DailyTravelLog' AND column_name = 'admin_notes'
                        ) THEN
                            ALTER TABLE "DailyTravelLog" ADD COLUMN "admin_notes" text NULL;
                        END IF;

                        IF NOT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'DailyTravelLog' AND column_name = 'edited_by_admin_name'
                        ) THEN
                            ALTER TABLE "DailyTravelLog" ADD COLUMN "edited_by_admin_name" varchar(255) NULL;
                        END IF;
                    END $$;
                    """,
                    reverse_sql="""
                    -- no-op
                    """
                ),
            ]
        ),
    ]
