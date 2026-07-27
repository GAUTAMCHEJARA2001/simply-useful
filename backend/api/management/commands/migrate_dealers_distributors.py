from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'No-op: multi-tenancy has been removed. All data lives in public schema.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('No action needed: multi-tenancy removed.'))
