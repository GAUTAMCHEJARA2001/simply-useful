import sys, os, traceback
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from api.models import Order
from api.serializers import OrderSerializer

try:
    orders = Order.objects.using('wh_navsari').filter(status='Returned')
    data = OrderSerializer(orders, many=True).data
    for d in data:
        print(d.get('orderId'))
        print('partyName:', d.get('partyName'))
        print('dealer:', d.get('dealer'))
        print('distributor:', d.get('distributor'))
        print('partyDetails:', d.get('partyDetails'))
        print('---')
except Exception as e:
    traceback.print_exc()
