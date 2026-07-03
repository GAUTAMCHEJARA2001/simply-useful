"""
One-time script: Create opening stock transactions for products that have
openingstock > 0 but no OPENING_STOCK_BULK_IMPORT transaction.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone


class Command(BaseCommand):
    help = 'Create opening stock transactions for products with openingstock > 0'

    def handle(self, *args, **options):
        from api.models import Product, Stocktransaction, Warehouse, Company

        company = Company.objects.first()
        if not company:
            self.stdout.write(self.style.ERROR('No company found'))
            return

        warehouses = Warehouse.objects.filter(active=True).exclude(schema_name='public')
        total_created = 0

        for wh in warehouses:
            if not wh.db_name:
                continue
            self.stdout.write(f'\nProcessing {wh.name} ({wh.db_name})...')

            products = Product.objects.using(wh.db_name).filter(
                companyid=company,
                openingstock__gt=0
            )

            for product in products:
                existing = Stocktransaction.objects.using(wh.db_name).filter(
                    productid=product,
                    reason='OPENING_STOCK_BULK_IMPORT'
                ).exists()

                if existing:
                    continue

                Stocktransaction.objects.using(wh.db_name).create(
                    id=f'fix-os-{product.id}',
                    productid=product,
                    warehouseid=wh,
                    transactiontype='IN',
                    quantity=float(product.openingstock),
                    reason='OPENING_STOCK_BULK_IMPORT',
                    createdat=timezone.now()
                )
                total_created += 1
                self.stdout.write(f'  Created stock for {product.productcode}: {product.openingstock}')

        self.stdout.write(self.style.SUCCESS(f'\nDone! Created {total_created} opening stock transactions'))
