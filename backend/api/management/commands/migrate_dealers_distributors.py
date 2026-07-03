"""
Migration command to move dealers and distributors from warehouse schemas to default DB.
This consolidates all dealer/distributor data into a single location.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Migrate dealers and distributors from warehouse schemas to default DB'

    def handle(self, *args, **options):
        from core.models import Warehouse
        from api.db_router import setup_dynamic_tenant_databases

        self.stdout.write('Starting dealer/distributor migration to default DB...')

        # Register dynamic tenant database aliases first
        setup_dynamic_tenant_databases()

        warehouses = Warehouse.objects.using('default').filter(active=True)

        self.migrate_dealers(warehouses)
        self.migrate_distributors(warehouses)

        self.stdout.write(self.style.SUCCESS('Migration completed successfully!'))

    def _get_fields(self, model):
        return [f.name for f in model._meta.get_fields() if hasattr(f, 'column')]

    def migrate_dealers(self, warehouses):
        from api.models import Dealer

        self.stdout.write('Migrating dealers...')
        fields = self._get_fields(Dealer)
        seen_codes = set()
        migrated = 0
        skipped = 0

        for wh in warehouses:
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue

            try:
                dealers = Dealer.objects.using(alias).all()
                for dealer in dealers:
                    if dealer.dealercode in seen_codes:
                        skipped += 1
                        continue

                    if Dealer.objects.using('default').filter(dealercode=dealer.dealercode).exists():
                        seen_codes.add(dealer.dealercode)
                        skipped += 1
                        continue

                    data = {f: getattr(dealer, f, None) for f in fields}
                    data['warehouseid_id'] = wh.id
                    data.pop('warehouseid', None)
                    Dealer.objects.using('default').create(**data)
                    seen_codes.add(dealer.dealercode)
                    migrated += 1

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error migrating dealers from {alias}: {e}'))

        self.stdout.write(f'Dealers: {migrated} migrated, {skipped} skipped')

    def migrate_distributors(self, warehouses):
        from api.models import Distributor

        self.stdout.write('Migrating distributors...')
        fields = self._get_fields(Distributor)
        seen_ids = set()
        migrated = 0
        skipped = 0

        for wh in warehouses:
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue

            try:
                distributors = Distributor.objects.using(alias).all()
                for dist in distributors:
                    if dist.id in seen_ids:
                        skipped += 1
                        continue

                    if Distributor.objects.using('default').filter(id=dist.id).exists():
                        seen_ids.add(dist.id)
                        skipped += 1
                        continue

                    data = {f: getattr(dist, f, None) for f in fields}
                    data['warehouseid_id'] = wh.id
                    data.pop('warehouseid', None)
                    Distributor.objects.using('default').create(**data)
                    seen_ids.add(dist.id)
                    migrated += 1

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error migrating distributors from {alias}: {e}'))

        self.stdout.write(f'Distributors: {migrated} migrated, {skipped} skipped')
