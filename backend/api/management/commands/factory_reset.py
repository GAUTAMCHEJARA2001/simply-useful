"""
Factory reset: wipe ALL data from ALL schemas, then reseed.
WARNING: This destroys everything. Use with caution.
"""
from django.core.management.base import BaseCommand
from django.db import connection, connections
from core.models import Warehouse


class Command(BaseCommand):
    help = 'Factory reset: wipe all data and reseed'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Confirm the reset')

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                'This will DELETE ALL DATA from ALL schemas!\n'
                'Run: python manage.py factory_reset --confirm'
            ))
            return

        self.wipe_default_db()
        self.wipe_warehouse_schemas()
        self.reseed()
        self.stdout.write(self.style.SUCCESS('\nFactory reset complete!'))
        self.stdout.write('Login: super@kamla.com / admin123')

    def wipe_default_db(self):
        self.stdout.write('\n=== Wiping default (public) schema ===')
        with connection.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            )
            tables = [row[0] for row in cur.fetchall()]
            if tables:
                for t in tables:
                    try:
                        cur.execute(f'TRUNCATE TABLE "{t}" CASCADE')
                        self.stdout.write(f'  Truncated {t}')
                    except Exception as e:
                        self.stdout.write(f'  Skipped {t}: {e}')
            else:
                self.stdout.write('  No tables found')

    def wipe_warehouse_schemas(self):
        self.stdout.write('\n=== Wiping warehouse schemas ===')
        warehouses = Warehouse.objects.using('default').all()
        for wh in warehouses:
            schema = wh.schema_name
            if not schema or schema == 'public':
                continue
            self.stdout.write(f'  Schema: {schema}')
            try:
                with connection.cursor() as cur:
                    cur.execute(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = %s AND table_type = 'BASE TABLE'",
                        [schema]
                    )
                    tables = [row[0] for row in cur.fetchall()]
                    if tables:
                        cur.execute(f'SET search_path TO {schema}, public')
                        for t in tables:
                            try:
                                cur.execute(f'TRUNCATE TABLE "{t}" CASCADE')
                                self.stdout.write(f'    Truncated {t}')
                            except Exception as e:
                                self.stdout.write(f'    Skipped {t}: {e}')
                        cur.execute('RESET search_path')
                    else:
                        self.stdout.write(f'    No tables found')

                    # Drop the schema itself
                    cur.execute(f'DROP SCHEMA IF EXISTS {schema} CASCADE')
                    self.stdout.write(f'    Dropped schema {schema}')
            except Exception as e:
                self.stdout.write(f'    Error: {e}')

        # Delete warehouse records from public schema
        try:
            Warehouse.objects.using('default').all().delete()
            self.stdout.write('  Deleted warehouse records')
        except Exception as e:
            self.stdout.write(f'  Error deleting warehouses: {e}')

    def reseed(self):
        self.stdout.write('\n=== Reseeding ===')
        import uuid, bcrypt
        from django.utils import timezone
        from api.models import Company, User, Warehouse

        now = timezone.now()

        company, _ = Company.objects.get_or_create(
            name='Kamla Enterprises',
            defaults={
                'id': 'cmpwp1h8v0000sscdshw8thbl',
                'skuprefix': 'KMLA',
                'active': True,
                'stockmethod': 'FIFO',
                'createdat': now,
                'updatedat': now
            }
        )
        self.stdout.write(f'  Company: {company.name}')

        hashed = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt(10)).decode()
        user, _ = User.objects.get_or_create(
            email='super@kamla.com',
            defaults={
                'id': 'c' + uuid.uuid4().hex[:23],
                'name': 'Kamla Super Admin',
                'hashedpassword': hashed,
                'role': 'SUPERADMIN',
                'active': True,
                'companyid': company,
                'createdat': now,
                'updatedat': now
            }
        )
        if not _:
            user.hashedpassword = hashed
            user.save(update_fields=['hashedpassword'])
        self.stdout.write(f'  User: {user.email}')

        warehouse, created = Warehouse.objects.get_or_create(
            schema_name='wh_main',
            defaults={
                'name': 'MAIN',
                'companyid': company,
                'active': True,
                'location': 'Main Facility',
                'db_name': 'wh_main',
                'db_host': 'localhost',
                'db_port': 5432
            }
        )
        self.stdout.write(f'  Warehouse: {warehouse.name} ({"created" if created else "exists"})')

        # Run migrate to recreate tables in the new schema
        from django.core.management import call_command
        self.stdout.write('\n  Running migrations on new schema...')
        call_command('migrate_schemas', '--shared', verbosity=0)
        call_command('migrate_schemas', verbosity=0)
