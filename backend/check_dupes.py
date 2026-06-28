import sys
sys.path.append('d:/cost 2/simply-useful/simply-useful/simply-useful/backend')
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from api.models import Dealer, Warehouse
from collections import defaultdict

counts = defaultdict(list)
for wh in Warehouse.objects.filter(active=True):
    if not wh.db_name: continue
    for d in Dealer.objects.using(wh.db_name).filter(dealercode='NG03'):
        counts[d.dealercode].append((wh.db_name, d.id))

for code, locations in counts.items():
    print(f"Code {code} found in:")
    for loc in locations:
        print(f"  - {loc[0]} (ID: {loc[1]})")
