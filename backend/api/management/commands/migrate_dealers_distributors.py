"""
Migration command to move dealers and distributors from warehouse DBs to default DB.
This consolidates all dealer/distributor data into a single location.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from core.models import Warehouse


class Command(BaseCommand):
    help = 'Migrate dealers and distributors from warehouse DBs to default DB'

    def handle(self, *args, **options):
        self.stdout.write('Starting dealer/distributor migration to default DB...')
        
        # Get all active warehouses
        warehouses = Warehouse.objects.using('default').filter(active=True)
        
        # Migrate dealers
        self.migrate_dealers(warehouses)
        
        # Migrate distributors
        self.migrate_distributors(warehouses)
        
        self.stdout.write(self.style.SUCCESS('Migration completed successfully!'))

    def migrate_dealers(self, warehouses):
        from api.models import Dealer
        
        self.stdout.write('Migrating dealers...')
        seen_codes = set()
        migrated = 0
        skipped = 0
        
        for wh in warehouses:
            if not wh.db_name:
                continue
            
            try:
                dealers = Dealer.objects.using(wh.db_name).all()
                for dealer in dealers:
                    if dealer.dealercode in seen_codes:
                        skipped += 1
                        continue
                    
                    # Check if already exists in default DB
                    if Dealer.objects.using('default').filter(dealercode=dealer.dealercode).exists():
                        seen_codes.add(dealer.dealercode)
                        skipped += 1
                        continue
                    
                    # Create in default DB with warehouse reference
                    dealer.id = dealer.id  # Keep same ID
                    dealer.warehouseid_id = wh.id
                    dealer.save(using='default')
                    seen_codes.add(dealer.dealercode)
                    migrated += 1
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error migrating dealers from {wh.db_name}: {e}'))
        
        self.stdout.write(f'Dealers: {migrated} migrated, {skipped} skipped')

    def migrate_distributors(self, warehouses):
        from api.models import Distributor
        
        self.stdout.write('Migrating distributors...')
        seen_ids = set()
        migrated = 0
        skipped = 0
        
        for wh in warehouses:
            if not wh.db_name:
                continue
            
            try:
                distributors = Distributor.objects.using(wh.db_name).all()
                for dist in distributors:
                    if dist.id in seen_ids:
                        skipped += 1
                        continue
                    
                    # Check if already exists in default DB
                    if Distributor.objects.using('default').filter(id=dist.id).exists():
                        seen_ids.add(dist.id)
                        skipped += 1
                        continue
                    
                    # Create in default DB with warehouse reference
                    dist.warehouseid_id = wh.id
                    dist.save(using='default')
                    seen_ids.add(dist.id)
                    migrated += 1
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error migrating distributors from {wh.db_name}: {e}'))
        
        self.stdout.write(f'Distributors: {migrated} migrated, {skipped} skipped')
