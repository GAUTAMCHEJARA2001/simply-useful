from django.core.management.base import BaseCommand
from api.models import Dealer, Distributor, Supplier, Company
from api.utils_gst import is_valid_gstin, get_state_code_from_gstin, GST_STATE_CODES

class Command(BaseCommand):
    help = 'Validates and updates GST status for all dealers, distributors, and suppliers daily'

    def handle(self, *args, **options):
        self.stdout.write("Starting daily GST validation sync...")
        
        invalid_count = 0
        valid_count = 0
        
        for model in [Dealer, Distributor, Supplier, Company]:
            for obj in model.objects.all():
                if hasattr(obj, 'gst_number') and obj.gst_number:
                    gst = str(obj.gst_number).strip().upper()
                    if is_valid_gstin(gst):
                        state_code = get_state_code_from_gstin(gst)
                        if state_code in GST_STATE_CODES:
                            valid_count += 1
                        else:
                            invalid_count += 1
                            self.stdout.write(f"WARNING: Valid GST format but unknown state code '{state_code}' for {obj}")
                    else:
                        invalid_count += 1
                        self.stdout.write(f"WARNING: Invalid GST format '{gst}' for {obj}")
        
        self.stdout.write(self.style.SUCCESS(f"GST Sync Complete. Valid: {valid_count}, Invalid: {invalid_count}"))
