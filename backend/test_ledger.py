import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Product, Stocktransaction, Dispatchlogitem, Returnlogitem
from django.db.models import Q
import datetime
from django.utils import timezone

product = Product.objects.filter(name__icontains='WHITE SILIKA').first()
pk = str(product.id)

# 1. Fetch Stocktransaction entries
st_qs = Stocktransaction.objects.filter(
    Q(productid_id=product.id) | Q(productid__productcode=product.productcode)
)

st_txs = list(st_qs.select_related('warehouseid', 'productid'))
st_ref_ids = {str(t.referenceid) for t in st_txs if t.referenceid}
events = []

for t in st_txs:
    qty = float(t.quantity or 0)
    t_type = (t.transactiontype or '').upper()
    dt = t.createdat
    wh_name = t.warehouseid.name if (t.warehouseid and hasattr(t.warehouseid, 'name')) else 'Main Warehouse'

    in_qty = 0.0
    out_qty = 0.0

    if t_type == 'OPENING_STOCK':
        in_qty = qty
    elif t_type in ['PURCHASE', 'PRODUCTION', 'ADD_STOCK', 'RETURN_IN', 'IN']:
        in_qty = qty
    elif t_type in ['SALE', 'DISPATCH', 'CONSUMED', 'RETURN_OUT', 'OUT']:
        out_qty = abs(qty)
    else:
        if qty >= 0:
            in_qty = qty
        else:
            out_qty = abs(qty)

    events.append({
        'id': str(t.id),
        'datetime': dt,
        'createdat': t.createdat,
        'date_str': dt.strftime('%Y-%m-%d %H:%M') if dt else '',
        'type': t_type,
        'docNo': str(t.referenceid or '-'),
        'party': wh_name,
        'inQty': in_qty,
        'outQty': out_qty,
    })

events.sort(key=lambda x: (x['datetime'] or timezone.now(), x['createdat'] or timezone.now()))

for e in events:
    print(f"{e['date_str']} | {e['type']} | {e['inQty']} | {e['outQty']}")
