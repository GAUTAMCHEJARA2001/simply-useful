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
    Order, Orderitem, Stocktransaction, Inventory, Bom, Bomitem
)
from django.db import transaction

# Constants
COMPANY_ID = 'cmo75yliq0000wesurjpett1n'
START_DATE = timezone.now() - timedelta(days=365 * 5) # 5 years ago

print("Starting Massive Data Generation...")

def random_date(start, end):
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))

def seed_global():
    print("Seeding Global Data (Users, Leads, CRM)...")
    company = Company.objects.get(id=COMPANY_ID)
    wh_nashik = Warehouse.objects.get(db_name='wh_nashik')
    wh_navsari = Warehouse.objects.get(db_name='wh_navsari')

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

    # Access
    Userwarehouseaccess.objects.get_or_create(userid=user_objs['user-deepak'], warehouseid=wh_nashik)
    Userwarehouseaccess.objects.get_or_create(userid=user_objs['user-deepak'], warehouseid=wh_navsari)
    
    # Leads & CRM
    stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']
    lead_ids = []
    for i in range(50):
        lead = Lead.objects.create(
            companyid=company,
            assignedto=user_objs[random.choice(['user-rakesh', 'user-amit'])],
            company_name=f'Construction Builders {i}',
            contact_person=f'Owner {i}',
            phone=f'9876543{i:03}',
            stage=random.choice(stages),
            created_at=random_date(START_DATE, timezone.now())
        )
        lead_ids.append(lead)

    # Visits & Expenses
    for lead in lead_ids[:20]:
        for _ in range(3):
            v_date = random_date(lead.created_at, timezone.now())
            Visit.objects.create(
                companyid=company,
                user=lead.assignedto,
                lead=lead,
                purpose='Product Demo',
                outcome='Positive feedback, next meeting scheduled.',
                date=v_date,
                created_at=v_date
            )
            if random.random() > 0.5:
                Expense.objects.create(
                    companyid=company,
                    user=lead.assignedto,
                    category='TRAVEL',
                    amount=random.randint(500, 2000),
                    date=v_date,
                    status='APPROVED',
                    created_at=v_date
                )
    return user_objs

def seed_tenant(db_name, company_id, user_objs):
    print(f"Seeding Tenant Data for {db_name}...")
    
    with transaction.atomic(using=db_name):
        # Masters
        u_kg = Unit.objects.using(db_name).create(name='KG', short_name='kg', active=True, companyid_id=company_id)
        u_bag = Unit.objects.using(db_name).create(name='BAG (20KG)', short_name='bag', active=True, companyid_id=company_id)
        u_ltr = Unit.objects.using(db_name).create(name='LITER', short_name='ltr', active=True, companyid_id=company_id)

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
        p_cement = Product.objects.using(db_name).create(name='White Cement', type='RAW_MATERIAL', categoryid=c_chem, unitid=u_kg, brandid=b_kamla, min_stock_level=1000, max_stock_level=5000, purchase_price=15, active=True, companyid_id=company_id)
        p_poly = Product.objects.using(db_name).create(name='Polymer Binder', type='RAW_MATERIAL', categoryid=c_chem, unitid=u_ltr, brandid=b_kamla, min_stock_level=500, max_stock_level=2000, purchase_price=120, active=True, companyid_id=company_id)
        p_bag = Product.objects.using(db_name).create(name='20KG Printed Bag', type='PACKAGING', categoryid=c_pack, unitid=u_bag, min_stock_level=2000, max_stock_level=10000, purchase_price=12, active=True, companyid_id=company_id)
        
        # Finished goods
        p_gold = Product.objects.using(db_name).create(name='Gold Flex Tiles Adhesive', type='FINISHED_GOOD', categoryid=c_tiles, unitid=u_bag, brandid=b_kamla, min_stock_level=100, max_stock_level=1000, mrp=850, selling_price=600, active=True, companyid_id=company_id)
        p_silver = Product.objects.using(db_name).create(name='Silver Standard Adhesive', type='FINISHED_GOOD', categoryid=c_tiles, unitid=u_bag, brandid=b_kamla, min_stock_level=200, max_stock_level=1500, mrp=550, selling_price=400, active=True, companyid_id=company_id)
        p_filler = Product.objects.using(db_name).create(name='Epoxy Joint Filler (1kg)', type='FINISHED_GOOD', categoryid=c_joint, unitid=u_kg, brandid=b_kamla, min_stock_level=500, max_stock_level=2000, mrp=250, selling_price=180, active=True, companyid_id=company_id)
        
        products.extend([p_gold, p_silver, p_filler])

        # Product Access (Allocation to Sales Officers)
        Userproductaccess.objects.using(db_name).create(userid=user_objs['user-rakesh'], productid=p_gold, companyid_id=company_id)
        Userproductaccess.objects.using(db_name).create(userid=user_objs['user-rakesh'], productid=p_silver, companyid_id=company_id)
        Userproductaccess.objects.using(db_name).create(userid=user_objs['user-amit'], productid=p_filler, companyid_id=company_id)

        # BOM
        bom1 = Bom.objects.using(db_name).create(productid=p_gold, name='Standard Gold Recipe', output_quantity=1, active=True, companyid_id=company_id)
        Bomitem.objects.using(db_name).create(bomid=bom1, raw_materialid=p_cement, quantity=18.5, companyid_id=company_id)
        Bomitem.objects.using(db_name).create(bomid=bom1, raw_materialid=p_poly, quantity=1.5, companyid_id=company_id)
        Bomitem.objects.using(db_name).create(bomid=bom1, raw_materialid=p_bag, quantity=1, companyid_id=company_id)

        # Suppliers & Dealers
        sup = Supplier.objects.using(db_name).create(name='UltraTech Cement Ltd', phone='1234567890', companyid_id=company_id, active=True)
        dist = Distributor.objects.using(db_name).create(name='Gujarat Mega Distributors', code='GMD01', margin_percentage=15.0, active=True, companyid_id=company_id)
        dealer1 = Dealer.objects.using(db_name).create(name='City Hardware', dealercode='CH01', distributorid=dist, active=True, companyid_id=company_id)

        # Generate 5 years of daily transactions (Purchases & Sales)
        # To avoid being too slow, we generate about 200 orders spread out
        
        inv = {}
        for p in [p_cement, p_poly, p_bag, p_gold, p_silver, p_filler]:
            i = Inventory.objects.using(db_name).create(productid=p, quantity=0, companyid_id=company_id)
            inv[p.id] = i

        current_date = START_DATE
        end_date = timezone.now()
        delta = (end_date - current_date) / 200

        for idx in range(200):
            current_date += delta
            
            # Purchase Raw Materials every 5 iterations
            if idx % 5 == 0:
                po = Purchaseorder.objects.using(db_name).create(supplierid=sup, expected_date=current_date+timedelta(days=2), status='APPROVED', total_amount=50000, companyid_id=company_id, created_at=current_date)
                Purchaseorderitem.objects.using(db_name).create(poid=po, productid=p_cement, quantity=5000, unit_price=15, total_price=75000, companyid_id=company_id)
                Purchaseorderitem.objects.using(db_name).create(poid=po, productid=p_poly, quantity=500, unit_price=120, total_price=60000, companyid_id=company_id)
                
                # Receive purchase
                pur = Purchase.objects.using(db_name).create(poid=po, supplierid=sup, status='COMPLETED', total_amount=135000, companyid_id=company_id, created_at=current_date+timedelta(days=2))
                Purchaseitem.objects.using(db_name).create(purchaseid=pur, productid=p_cement, quantity=5000, unit_price=15, total_price=75000, companyid_id=company_id)
                Purchaseitem.objects.using(db_name).create(purchaseid=pur, productid=p_poly, quantity=500, unit_price=120, total_price=60000, companyid_id=company_id)
                
                inv[p_cement.id].quantity += 5000; inv[p_cement.id].save()
                inv[p_poly.id].quantity += 500; inv[p_poly.id].save()
                
                Stocktransaction.objects.using(db_name).create(productid=p_cement, type='PURCHASE', quantity=5000, reference_id=str(pur.id), date=current_date+timedelta(days=2), companyid_id=company_id)
                Stocktransaction.objects.using(db_name).create(productid=p_poly, type='PURCHASE', quantity=500, reference_id=str(pur.id), date=current_date+timedelta(days=2), companyid_id=company_id)

            # Produce Finished Goods (Adjustment) every 3 iterations
            if idx % 3 == 0:
                prod_qty = 200
                if inv[p_cement.id].quantity >= prod_qty * 18.5 and inv[p_poly.id].quantity >= prod_qty * 1.5:
                    inv[p_cement.id].quantity -= prod_qty * 18.5; inv[p_cement.id].save()
                    inv[p_poly.id].quantity -= prod_qty * 1.5; inv[p_poly.id].save()
                    inv[p_gold.id].quantity += prod_qty; inv[p_gold.id].save()
                    Stocktransaction.objects.using(db_name).create(productid=p_gold, type='MANUFACTURING', quantity=prod_qty, date=current_date, companyid_id=company_id)

            # Sales Orders (every iteration)
            sale_product = random.choice([p_gold, p_silver, p_filler])
            qty = random.randint(10, 50)
            status = random.choice(['DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED', 'RETURNED'])
            
            if status == 'DELIVERED' and inv[sale_product.id].quantity >= qty:
                order = Order.objects.using(db_name).create(dealerid=dealer1, status='DELIVERED', total_amount=qty*sale_product.selling_price, companyid_id=company_id, created_at=current_date)
                Orderitem.objects.using(db_name).create(orderid=order, productid=sale_product, quantity=qty, unit_price=sale_product.selling_price, total_price=qty*sale_product.selling_price, companyid_id=company_id)
                
                inv[sale_product.id].quantity -= qty; inv[sale_product.id].save()
                Stocktransaction.objects.using(db_name).create(productid=sale_product, type='SALE', quantity=-qty, reference_id=str(order.id), date=current_date, companyid_id=company_id)
            elif status == 'RETURNED':
                order = Order.objects.using(db_name).create(dealerid=dealer1, status='RETURNED', total_amount=qty*sale_product.selling_price, companyid_id=company_id, created_at=current_date)
                Orderitem.objects.using(db_name).create(orderid=order, productid=sale_product, quantity=qty, unit_price=sale_product.selling_price, total_price=qty*sale_product.selling_price, companyid_id=company_id)
                # simulate stock returned
                Stocktransaction.objects.using(db_name).create(productid=sale_product, type='RETURN', quantity=qty, reference_id=str(order.id), date=current_date, companyid_id=company_id)
                inv[sale_product.id].quantity += qty; inv[sale_product.id].save()

try:
    users = seed_global()
    seed_tenant('wh_nashik', COMPANY_ID, users)
    seed_tenant('wh_navsari', COMPANY_ID, users)
    print("SUCCESS: 5 years of rich data has been generated across all modules!")
except Exception as e:
    print(f"FAILED: {e}")
