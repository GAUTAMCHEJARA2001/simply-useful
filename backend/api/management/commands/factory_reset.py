"""
Factory reset: wipe ALL data from ALL schemas, then reseed.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Factory reset: wipe all data and reseed'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Confirm the reset')

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                'This will DELETE ALL DATA!\n'
                'Run: python manage.py factory_reset --confirm'
            ))
            return

        self.wipe_everything()
        self.reseed()
        self.stdout.write(self.style.SUCCESS('\nFactory reset complete!'))
        self.stdout.write('Login: super@kamla.com / admin123')

    def wipe_everything(self):
        self.stdout.write('\n=== Wiping ALL schemas ===')
        with connection.cursor() as cur:
            # Drop all tenant schemas first (before touching Warehouse table)
            cur.execute(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name LIKE 'wh_%'"
            )
            schemas = [row[0] for row in cur.fetchall()]
            for schema in schemas:
                try:
                    cur.execute(f'DROP SCHEMA IF EXISTS {schema} CASCADE')
                    self.stdout.write(f'  Dropped schema: {schema}')
                except Exception as e:
                    self.stdout.write(f'  Skipped {schema}: {e}')

            # Drop all tables in public schema
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            )
            tables = [row[0] for row in cur.fetchall()]
            for t in tables:
                try:
                    cur.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE')
                    self.stdout.write(f'  Dropped table: {t}')
                except Exception as e:
                    self.stdout.write(f'  Skipped {t}: {e}')

            # Drop all sequences
            cur.execute(
                "SELECT sequence_name FROM information_schema.sequences "
                "WHERE sequence_schema = 'public'"
            )
            seqs = [row[0] for row in cur.fetchall()]
            for s in seqs:
                try:
                    cur.execute(f'DROP SEQUENCE IF EXISTS "{s}" CASCADE')
                except Exception:
                    pass

    def reseed(self):
        self.stdout.write('\n=== Reseeding ===')
        import uuid, bcrypt
        from django.utils import timezone
        from django.core.management import call_command

        now = timezone.now()

        # Run migrate first to create all tables
        self.stdout.write('  Running migrate...')
        call_command('migrate', verbosity=1)

        from api.models import Company, User, Warehouse

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
        user, created = User.objects.get_or_create(
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
        if not created:
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

        # Migrate ALL tenant schemas so tables exist inside them
        self.stdout.write('  Running migrate_schemas for tenant schemas...')
        call_command('migrate_schemas', verbosity=1)
