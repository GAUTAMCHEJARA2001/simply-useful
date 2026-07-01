import os, django, random, uuid
from datetime import timedelta, datetime
from django.utils import timezone
import bcrypt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import (
    Company, Warehouse, User, Userwarehouseaccess, Userproductaccess,
    Category, Brand, Unit, Product, Supplier, Dealer, Distributor,
    Lead, Visit, Expense, Purchaseorder, Purchaseorderitem, Purchase, Purchaseitem,
    Order, Orderitem, Stocktransaction, Bom, Bomitem
)
from django.db import transaction

# Constants
COMPANY_ID = 'cmo75yliq0000wesurjpett1n'

print("Starting Realistic Data Generation...")

def seed_global():
    print("Seeding Global Data (Users)...")
    company = Company.objects.get(id=COMPANY_ID)
    
    # Users
    password = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode('utf-8')
    
    users = [
        {'id': 'user-jignesh', 'name': 'Jignesh Patel', 'email': 'jignesh@kamla.com', 'role': 'SUPERADMIN'},
        {'id': 'user-deepak', 'name': 'Deepak Sharma', 'email': 'deepak@kamla.com', 'role': 'INVENTORY'},
        {'id': 'user-rakesh', 'name': 'Rakesh Singh', 'email': 'rakesh@kamla.com', 'role': 'SALES'},
        {'id': 'user-amit', 'name': 'Amit Kumar', 'email': 'amit@kamla.com', 'role': 'SALES'},
        {'id': 'user-priya', 'name': 'Priya Desai', 'email': 'priya@kamla.com', 'role': 'HR'}
    ]
    
    user_objs = {}
    for u in users:
        obj, _ = User.objects.get_or_create(
            email=u['email'],
            defaults={
                'id': u['id'], 'name': u['name'], 'role': u['role'],
                'hashedpassword': password, 'active': True, 'companyid': company
            }
        )
        user_objs[u['id']] = obj
        
    return user_objs

def seed_tenant(db_name, company_id, user_objs):
    from api.db_router import set_current_db
    set_current_db(db_name)
    print(f"Seeding Tenant Data for {db_name}...")
    
    with transaction.atomic(using=db_name):
        # 1. Create Userwarehouseaccess in the tenant schema context
        wh_nashik = Warehouse.objects.using('default').get(db_name='wh_nashik')
        wh_navsari = Warehouse.objects.using('default').get(db_name='wh_navsari')
        current_wh = wh_nashik if db_name == 'wh_nashik' else wh_navsari
        Userwarehouseaccess.objects.using(db_name).get_or_create(userid_id=user_objs['user-deepak'].id, warehouseid_id=current_wh.id)

        # 2. Seed Leads & CRM in the tenant schema context

        stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']
        lead_ids = []
        company = Company.objects.using('default').get(id=company_id)
        for i in range(12):
            lead = Lead.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25],
                companyid=company,
                assigned_to=user_objs[random.choice(['user-rakesh', 'user-amit'])],
                created_by=user_objs['user-rakesh'],
                company_name=f'Construction Builders {db_name[-3:].upper()} {i}',
                name=f'Owner {i}',
                phone=f'9876543{i:03}',
                status=random.choice(stages),
                createdat=timezone.now() - timedelta(days=random.randint(1, 100))
            )
            lead_ids.append(lead)

        # Visits & Expenses per tenant schema
        for lead in lead_ids[:5]:
            for _ in range(2):
                v_date = timezone.now() - timedelta(days=random.randint(1, 100))
                Visit.objects.using(db_name).create(
                    id=uuid.uuid4().hex[:25],
                    companyid=company,
                    soemail=lead.assigned_to,
                    dealername=lead.company_name,
                    remarks='Product Demo, Positive feedback.',
                    date=v_date.date(),
                    createdat=v_date
                )
                if random.random() > 0.5:
                    Expense.objects.using(db_name).create(
                        id=uuid.uuid4().hex[:25],
                        companyid=company,
                        soemail=lead.assigned_to,
                        category='TRAVEL',
                        amount=random.randint(500, 2000),
                        date=v_date.date(),
                        status='APPROVED',
                        createdat=v_date
                    )

        # Masters
        u_kg = Unit.objects.using(db_name).create(name='KG', active=True, companyid_id=company_id)
        u_bag = Unit.objects.using(db_name).create(name='BAG (20KG)', active=True, companyid_id=company_id)
        u_ltr = Unit.objects.using(db_name).create(name='LITER', active=True, companyid_id=company_id)


        c_fg = Category.objects.using(db_name).create(name='Finished Goods', active=True, companyid_id=company_id)
        c_rm = Category.objects.using(db_name).create(name='Raw Materials', active=True, companyid_id=company_id)
        
        c_tiles = Category.objects.using(db_name).create(name='Tiles Adhesive', parentid=c_fg, active=True, companyid_id=company_id)
        c_joint = Category.objects.using(db_name).create(name='Joint Filler', parentid=c_fg, active=True, companyid_id=company_id)
        c_chem = Category.objects.using(db_name).create(name='Chemicals', parentid=c_rm, active=True, companyid_id=company_id)
        c_pack = Category.objects.using(db_name).create(name='Packaging', parentid=c_rm, active=True, companyid_id=company_id)

        b_kamla = Brand.objects.using(db_name).create(name='Kamla Premium', active=True, companyid_id=company_id)
        
        # Products
        products = []
        # Raw materials
        p_cement = Product.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='White Cement', productcode='RM-CEMENT', bagsize='50KG', categoryid=c_chem, unitid=u_kg, brandid=b_kamla, minimumstock=1000, rate=15, gst=18.0, openingstock=0, active=True, companyid_id=company_id)
        p_poly = Product.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='Polymer Binder', productcode='RM-POLY', bagsize='20KG', categoryid=c_chem, unitid=u_ltr, brandid=b_kamla, minimumstock=500, rate=120, gst=18.0, openingstock=0, active=True, companyid_id=company_id)
        p_bag = Product.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='20KG Printed Bag', productcode='PACK-BAG20', bagsize='0KG', categoryid=c_pack, unitid=u_bag, minimumstock=2000, rate=12, gst=18.0, openingstock=0, active=True, companyid_id=company_id)
        
        # Finished goods
        p_gold = Product.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='Gold Flex Tiles Adhesive', productcode='FG-GOLD', bagsize='20KG', categoryid=c_tiles, unitid=u_bag, brandid=b_kamla, minimumstock=100, rate=600, gst=18.0, openingstock=0, active=True, companyid_id=company_id)
        p_silver = Product.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='Silver Standard Adhesive', productcode='FG-SILVER', bagsize='20KG', categoryid=c_tiles, unitid=u_bag, brandid=b_kamla, minimumstock=200, rate=400, gst=18.0, openingstock=0, active=True, companyid_id=company_id)
        p_filler = Product.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='Epoxy Joint Filler (1kg)', productcode='FG-FILLER', bagsize='1KG', categoryid=c_joint, unitid=u_kg, brandid=b_kamla, minimumstock=500, rate=180, gst=18.0, openingstock=0, active=True, companyid_id=company_id)
        
        # Product Access (Allocation to Sales Officers)
        Userproductaccess.objects.using(db_name).create(userid=user_objs['user-rakesh'], productid=p_gold)
        Userproductaccess.objects.using(db_name).create(userid=user_objs['user-rakesh'], productid=p_silver)
        Userproductaccess.objects.using(db_name).create(userid=user_objs['user-amit'], productid=p_filler)

        # BOM
        bom1 = Bom.objects.using(db_name).create(id=uuid.uuid4().hex[:25], productcode=p_gold.productcode, name='Standard Gold Recipe', outputquantity=1, companyid_id=company_id)
        Bomitem.objects.using(db_name).create(id=uuid.uuid4().hex[:25], bomid=bom1, materialname='White Cement', qty=18.5, unit='KG')
        Bomitem.objects.using(db_name).create(id=uuid.uuid4().hex[:25], bomid=bom1, materialname='Polymer Binder', qty=1.5, unit='LITER')
        Bomitem.objects.using(db_name).create(id=uuid.uuid4().hex[:25], bomid=bom1, materialname='20KG Printed Bag', qty=1, unit='BAG')

        # Suppliers & Dealers
        sup = Supplier.objects.using(db_name).create(id=uuid.uuid4().hex[:25], name='UltraTech Cement Ltd', contactinfo='1234567890', companyid_id=company_id, active=True)
        dist = Distributor.objects.using(db_name).create(id=uuid.uuid4().hex[:25], distributorname='Gujarat Mega Distributors', active=True, companyid_id=company_id)
        dealer1 = Dealer.objects.using(db_name).create(id=uuid.uuid4().hex[:25], dealername='City Hardware', dealercode='CH01', distributorname=dist.distributorname, active=True, companyid_id=company_id)
        dist2 = Distributor.objects.using(db_name).create(id=uuid.uuid4().hex[:25], distributorname='West Coast Logistics', active=True, companyid_id=company_id)
        dealer2 = Dealer.objects.using(db_name).create(id=uuid.uuid4().hex[:25], dealername='Apex Tiles & Stone', dealercode='AT02', distributorname=dist2.distributorname, active=True, companyid_id=company_id)
        dealer_direct = Dealer.objects.using(db_name).create(id=uuid.uuid4().hex[:25], dealername='National Grout House (Direct)', dealercode='NG03', distributorname=None, active=True, companyid_id=company_id)

        # Generating 5 Years of Transactions
        start_date = timezone.now() - timedelta(days=365 * 5)
        
        wh_obj = Warehouse.objects.using('default').get(db_name=db_name)
        wh_id = wh_obj.id

        # 1. Opening Balances ()
        
        # Seed Purchases & Sales over 5 years
        for day in range(0, 365 * 5, 14): # Every 2 weeks
            tx_date = start_date + timedelta(days=day)
            
            # Purchase Raw Materials
            p_qty = random.randint(500, 2000)
            pur_id = f"PUR-{db_name[-3:].upper()}-{day}"
            pur = Purchase.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25], purchaseid=pur_id, date=tx_date, vendorname=sup.name, 
                grandtotal=p_qty*15.5, status='Completed', companyid_id=company_id, createdat=tx_date, supplierid=sup,
                warehouseid_id=wh_id
            )
            Purchaseitem.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25], purchaseid=pur, productname=p_cement.name, qty=p_qty, rate=15.5, total=p_qty*15.5
            )
            inv_cement.quantity += p_qty
            Stocktransaction.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25], productid=p_cement, transactiontype='PURCHASE', quantity=p_qty, 
                referenceid=pur_id, createdat=tx_date, warehouseid_id=wh_id
            )
            
            # Sale Finished Goods
            s_qty = random.randint(10, 100)
            ord_id = f"ORD-{db_name[-3:].upper()}-{day}"
            order = Order.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25], orderid=ord_id, date=tx_date, partyname=dealer1.dealername, 
                partytype='DEALER', distributor=dist.distributorname,
                soemail=user_objs[random.choice(['user-rakesh', 'user-amit'])], grandtotal=s_qty * 600.0, status='Completed', 
                companyid_id=company_id, createdat=tx_date
            )
            
            Orderitem.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25], orderid=order, productid=p_gold, qty=s_qty, price=600.0, total=s_qty*600.0
            )
            inv_gold.quantity -= s_qty
            Stocktransaction.objects.using(db_name).create(
                id=uuid.uuid4().hex[:25], productid=p_gold, transactiontype='SALE', quantity=-s_qty, 
                referenceid=ord_id, createdat=tx_date, warehouseid_id=wh_id
            )
        
        inv_cement.save()
        inv_poly.save()
        inv_bag.save()
        inv_gold.save()

try:
    users = seed_global()
    seed_tenant('wh_nashik', COMPANY_ID, users)
    seed_tenant('wh_navsari', COMPANY_ID, users)
    print("SUCCESS: Rich data has been generated across all modules!")
except Exception as e:
    import traceback
    traceback.print_exc()
