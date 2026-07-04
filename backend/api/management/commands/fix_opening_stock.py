"""
One-time script (NO LONGER NEEDED): 
Opening stock is stored in Product.openingstock field only.
No Stocktransaction records are created for opening stock.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'No-op: opening stock is now stored in Product.openingstock field only'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            'This command is no longer needed. '
            'Opening stock is stored in Product.openingstock field. '
            'No Stocktransaction records are created for opening stock.'
        ))
