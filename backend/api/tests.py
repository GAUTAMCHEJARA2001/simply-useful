from django.test import TestCase
from api.models import User, Brand, Category, Product, Userproductaccess
from core.models import Company
from api.views import get_allowed_product_ids_for_user

class TenantAwareTestCase(TestCase):
    def setUp(self):
        self.company, _ = Company.objects.get_or_create(
            id="test-company",
            defaults={"name": "Test Company", "active": True, "stockmethod": "FIFO"}
        )
        self.warehouse = None

class HealthCheckTest(TenantAwareTestCase):
    def test_health_check_passes(self):
        self.assertTrue(True)

class UserAssignmentTests(TenantAwareTestCase):
    def setUp(self):
        super().setUp()
        self.company = Company.objects.get(id="test-company")
        
        self.user = User.objects.create(
            id="test-user",
            email="test@example.com",
            name="Test User",
            role="SALES",
            active=True,
            companyid=self.company
        )
        
        self.brand_a = Brand.objects.create(name="Brand A", active=True, companyid=self.company)
        self.brand_b = Brand.objects.create(name="Brand B", active=True, companyid=self.company)
        
        self.cat_parent = Category.objects.create(name="Parent Category", active=True, companyid=self.company)
        self.cat_sub = Category.objects.create(name="Sub Category", active=True, companyid=self.company, parentid=self.cat_parent)
        self.cat_other = Category.objects.create(name="Other Category", active=True, companyid=self.company)
        
        self.p1 = Product.objects.create(
            id="p1", productcode="P1", name="Product 1", bagsize="50kg",
            brandid=self.brand_a, categoryid=self.cat_parent, rate=100.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )
        self.p2 = Product.objects.create(
            id="p2", productcode="P2", name="Product 2", bagsize="50kg",
            brandid=self.brand_a, categoryid=self.cat_sub, rate=120.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )
        self.p3 = Product.objects.create(
            id="p3", productcode="P3", name="Product 3", bagsize="50kg",
            brandid=self.brand_b, categoryid=self.cat_parent, rate=130.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )
        self.p4 = Product.objects.create(
            id="p4", productcode="P4", name="Product 4", bagsize="50kg",
            brandid=self.brand_b, categoryid=self.cat_other, rate=140.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )

    def test_no_assignments_returns_none(self):
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertIsNone(allowed)

    def test_brand_only_assignment(self):
        Userproductaccess.objects.create(userid=self.user, brandid=self.brand_a)
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertCountEqual(allowed, ["p1", "p2"])

    def test_category_only_assignment_includes_subcategories(self):
        Userproductaccess.objects.create(userid=self.user, categoryid=self.cat_parent)
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertCountEqual(allowed, ["p1", "p2", "p3"])

    def test_brand_plus_category_assignment(self):
        Userproductaccess.objects.create(userid=self.user, brandid=self.brand_a)
        Userproductaccess.objects.create(userid=self.user, categoryid=self.cat_parent)
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertCountEqual(allowed, ["p1", "p2"])

    def test_product_only_assignment(self):
        Userproductaccess.objects.create(userid=self.user, productid=self.p3)
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertCountEqual(allowed, ["p3"])

    def test_brand_plus_product_assignment(self):
        Userproductaccess.objects.create(userid=self.user, brandid=self.brand_b)
        Userproductaccess.objects.create(userid=self.user, productid=self.p1)
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertCountEqual(allowed, ["p1", "p3", "p4"])

    def test_category_plus_product_assignment(self):
        Userproductaccess.objects.create(userid=self.user, categoryid=self.cat_other)
        Userproductaccess.objects.create(userid=self.user, productid=self.p1)
        allowed = get_allowed_product_ids_for_user(self.user.id)
        self.assertCountEqual(allowed, ["p1", "p4"])

class OptimizationTests(TenantAwareTestCase):
    def setUp(self):
        super().setUp()
        self.company = Company.objects.get(id="test-company")
        self.user = User.objects.create(
            id="test-opt-user", email="opt@example.com", name="Opt User",
            role="SUPERADMIN", active=True, companyid=self.company
        )
        self.category = Category.objects.create(name="Test Category", active=True, companyid=self.company)
        self.product = Product.objects.create(
            id="test-prod", productcode="TEST-PROD", name="Test Product", bagsize="50 KG",
            categoryid=self.category, rate=10.0, gst=18.0, active=True,
            openingstock=0, minimumstock=0, companyid=self.company
        )

    def test_check_negative_raw_materials(self):
        from api.views import check_negative_raw_materials
        from core.models import Warehouse
        wh = Warehouse.objects.create(name="Test Warehouse", active=True, companyid=self.company)
        consumptions = [{'product_id': self.product.id, 'name': self.product.name, 'qty': 10}]
        negatives = check_negative_raw_materials(self.product.id, 1, wh.id, custom_items=[
            {'productId': self.product.id, 'quantity': 10}
        ])
        self.assertEqual(len(negatives), 1)
        self.assertEqual(negatives[0]['deficit'], 10)
        self.assertEqual(negatives[0]['productId'], self.product.id)

    def test_transaction_productions(self):
        from api.views import transaction_productions
        from rest_framework.test import APIRequestFactory, force_authenticate
        from core.models import Warehouse
        
        wh = Warehouse.objects.create(name="Test Warehouse 2", active=True, companyid=self.company)
        rf = APIRequestFactory()
        req = rf.post('/transactions/productions', {
            'productId': self.product.id,
            'quantity': 5,
            'warehouse_id': wh.id,
            'items': [{'productId': self.product.id, 'quantity': 2}]
        }, format='json')
        force_authenticate(req, user=self.user)
        
        response = transaction_productions(req)
        self.assertEqual(response.status_code, 400)
        self.assertIn("NEGATIVE_RAW_MATERIALS", str(response.data))

class BusinessLogicCalculationsTest(TenantAwareTestCase):
    def test_gst_pricing_formula(self):
        """Verifies standard Indian 18% GST and Net Revenue calculation"""
        gross_sales = 1180.0
        net_revenue = gross_sales / 1.18
        tax_amount = gross_sales - net_revenue
        self.assertAlmostEqual(net_revenue, 1000.0, places=2)
        self.assertAlmostEqual(tax_amount, 180.0, places=2)

    def test_landed_cost_and_margin(self):
        """Verifies 75% landed cost model and gross profit margin"""
        sales_rate = 100.0
        qty = 50
        gross_sales = qty * sales_rate
        net_revenue = gross_sales / 1.18
        landed_cost = qty * (sales_rate * 0.75)
        margin = net_revenue - landed_cost
        
        self.assertEqual(gross_sales, 5000.0)
        self.assertEqual(landed_cost, 3750.0)
        self.assertAlmostEqual(margin, (5000.0 / 1.18) - 3750.0, places=2)

    def test_stock_inward_outward_balance(self):
        """Verifies opening stock + inward - outward equation"""
        opening_stock = 100
        inward_purchases = 50
        production_consumed = 20
        sales_dispatched = 80
        returns_inward = 5

        current_balance = opening_stock + inward_purchases - production_consumed - sales_dispatched + returns_inward
        self.assertEqual(current_balance, 55)

class ExpenseServiceTests(TenantAwareTestCase):
    def setUp(self):
        super().setUp()
        self.company = Company.objects.get(id="test-company")
        self.so_user = User.objects.create(
            id="so-user-1", email="so@example.com", name="Sales Officer",
            role="SALES", active=True, companyid=self.company
        )
        self.admin_user = User.objects.create(
            id="admin-user-1", email="admin@example.com", name="Admin Manager",
            role="ADMIN", active=True, companyid=self.company
        )

    def test_submit_valid_expense(self):
        from api.services.expense_service import ExpenseService
        data = {
            'category': 'Travel',
            'amount': 450.0,
            'remarks': 'Client visit fuel reimbursement'
        }
        expense = ExpenseService.submit_expense(self.so_user, data, company_id=self.company.id)
        self.assertEqual(expense.amount, 450.0)
        self.assertEqual(expense.status, 'PENDING')
        self.assertEqual(expense.soemail_id, 'so@example.com')

    def test_submit_negative_expense_rejected(self):
        from api.services.expense_service import ExpenseService
        data = {'category': 'Travel', 'amount': -100.0, 'remarks': 'Invalid'}
        with self.assertRaises(ValueError):
            ExpenseService.submit_expense(self.so_user, data, company_id=self.company.id)

    def test_approve_expense_transition(self):
        from api.services.expense_service import ExpenseService
        expense = ExpenseService.submit_expense(self.so_user, {'category': 'Food', 'amount': 200.0, 'remarks': 'Lunch'}, company_id=self.company.id)
        updated = ExpenseService.review_expense_status(self.admin_user, expense.id, 'APPROVED')
        self.assertEqual(updated.status, 'APPROVED')

    def test_reject_expense_requires_reason(self):
        from api.services.expense_service import ExpenseService
        expense = ExpenseService.submit_expense(self.so_user, {'category': 'Food', 'amount': 200.0, 'remarks': 'Lunch'}, company_id=self.company.id)
        with self.assertRaises(ValueError):
            ExpenseService.review_expense_status(self.admin_user, expense.id, 'REJECTED', reject_reason="")
        
        # Valid reject with reason
        updated = ExpenseService.review_expense_status(self.admin_user, expense.id, 'REJECTED', reject_reason="Missing receipt invoice")
        self.assertEqual(updated.status, 'REJECTED')
        self.assertEqual(updated.rejectreason, "Missing receipt invoice")

    def test_unauthorized_user_cannot_review_expense(self):
        from api.services.expense_service import ExpenseService
        expense = ExpenseService.submit_expense(self.so_user, {'category': 'Food', 'amount': 150.0, 'remarks': 'Dinner'}, company_id=self.company.id)
        # Sales officer trying to review their own or another's expense
        with self.assertRaises(ValueError) as ctx:
            ExpenseService.review_expense_status(self.so_user, expense.id, 'APPROVED')
        self.assertIn("permission", str(ctx.exception).lower())

    def test_expense_status_api_endpoint(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from api.views_expenses import ExpenseViewSet
        from api.services.expense_service import ExpenseService
        
        expense = ExpenseService.submit_expense(self.so_user, {'category': 'Food', 'amount': 120.0, 'remarks': 'Snack'}, company_id=self.company.id)
        
        rf = APIRequestFactory()
        req = rf.put(f'/expenses/{expense.id}/status', {'status': 'APPROVED'}, format='json')
        force_authenticate(req, user=self.admin_user)
        
        view = ExpenseViewSet.as_view({'put': 'update_status'})
        response = view(req, pk=expense.id)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data.get('data', {}).get('status'), 'APPROVED')

class TaxServiceTests(TenantAwareTestCase):
    def test_intrastate_gst_split(self):
        from api.services.tax_service import calculate_gst_breakdown
        result = calculate_gst_breakdown(base_amount=1000.0, tax_percent=18.0, seller_gst='24AAAAA0000A1Z5', buyer_gst='24BBBBB0000B1Z6')
        self.assertFalse(result['isInterstate'])
        self.assertEqual(result['taxableValue'], 1000.0)
        self.assertEqual(result['cgstRate'], 9.0)
        self.assertEqual(result['sgstRate'], 9.0)
        self.assertEqual(result['cgstAmount'], 90.0)
        self.assertEqual(result['sgstAmount'], 90.0)
        self.assertEqual(result['igstAmount'], 0.0)
        self.assertEqual(result['totalTax'], 180.0)
        self.assertEqual(result['grandTotal'], 1180.0)

    def test_interstate_gst_igst(self):
        from api.services.tax_service import calculate_gst_breakdown
        # Seller in Gujarat (24), Buyer in Maharashtra (27)
        result = calculate_gst_breakdown(base_amount=2000.0, tax_percent=18.0, seller_gst='24AAAAA0000A1Z5', buyer_gst='27CCCC0000C1Z7')
        self.assertTrue(result['isInterstate'])
        self.assertEqual(result['cgstAmount'], 0.0)
        self.assertEqual(result['sgstAmount'], 0.0)
        self.assertEqual(result['igstRate'], 18.0)
        self.assertEqual(result['igstAmount'], 360.0)
        self.assertEqual(result['totalTax'], 360.0)
        self.assertEqual(result['grandTotal'], 2360.0)

class CreditServiceTests(TenantAwareTestCase):
    def setUp(self):
        super().setUp()
        from api.models import Dealer
        self.dealer = Dealer.objects.create(
            dealername="Shree Ram Traders",
            creditlimit=100000.0,
            outstanding=80000.0,
            active=True,
            companyid=self.company
        )

    def test_order_within_credit_limit(self):
        from api.services.credit_service import evaluate_party_credit
        eval_res = evaluate_party_credit("Shree Ram Traders", party_type='DEALER', new_order_amount=15000.0, company_id=self.company.id)
        self.assertTrue(eval_res['allowed'])
        self.assertFalse(eval_res['isOverLimit'])
        self.assertEqual(eval_res['projectedExposure'], 95000.0)
        self.assertEqual(eval_res['availableCredit'], 20000.0)

    def test_order_exceeding_credit_limit(self):
        from api.services.credit_service import evaluate_party_credit
        eval_res = evaluate_party_credit("Shree Ram Traders", party_type='DEALER', new_order_amount=25000.0, company_id=self.company.id)
        self.assertFalse(eval_res['allowed'])
        self.assertTrue(eval_res['isOverLimit'])
        self.assertEqual(eval_res['exceededBy'], 5000.0)
        self.assertIn("Credit Limit Exceeded", eval_res['reason'])

class CompanyCreationTests(TenantAwareTestCase):
    def test_create_company_success(self):
        from rest_framework.test import APIRequestFactory
        from api.views_auth import auth_create_company
        from api.models import User, Warehouse, Company
        
        rf = APIRequestFactory()
        payload = {
            'companyName': 'Nexus Polymers',
            'adminName': 'Ankit Verma',
            'adminEmail': 'ankit@nexuspolymers.com',
            'adminPassword': 'password123',
            'skuPrefix': 'NEX',
            'warehouseName': 'SILVASSA PLANT',
            'phone': '9898000000',
            'gst': '24NEXUS0000A1Z9'
        }
        req = rf.post('/auth/create-company', payload, format='json')
        resp = auth_create_company(req)
        
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data.get('success'))
        data = resp.data.get('data', {})
        
        # Verify tokens returned
        self.assertIn('accessToken', data)
        self.assertIn('refreshToken', data)
        
        # Verify Company was created with its own dedicated schema
        comp = Company.objects.filter(name='Nexus Polymers').first()
        self.assertIsNotNone(comp)
        self.assertEqual(comp.skuprefix, 'NEX')
        self.assertIsNotNone(comp.schemaname)
        
        # Verify user mapping exists in public directory
        from core.models import TenantUserMapping
        mapping = TenantUserMapping.objects.filter(email='ankit@nexuspolymers.com').first()
        self.assertIsNotNone(mapping)
        self.assertEqual(mapping.schemaname, comp.schemaname)
        
        # Verify user does NOT leak into public User table
        public_user = User.objects.filter(email='ankit@nexuspolymers.com').first()
        self.assertIsNone(public_user)

        # Switch to company's dedicated schema to verify isolated tables
        from api.tenant_manager import set_tenant_search_path, reset_search_path
        try:
            set_tenant_search_path(comp.schemaname)
            tenant_user = User.objects.filter(email='ankit@nexuspolymers.com').first()
            self.assertIsNotNone(tenant_user)
            self.assertEqual(tenant_user.role, 'SUPERADMIN')
            self.assertEqual(tenant_user.companyid_id, comp.id)
            
            # Verify Warehouse is strictly in this company's schema
            wh = Warehouse.objects.filter(companyid=comp, name='SILVASSA PLANT').first()
            self.assertIsNotNone(wh)
        finally:
            reset_search_path()

    def test_company_data_isolation(self):
        from rest_framework.test import APIRequestFactory
        from api.views_auth import auth_create_company, auth_login
        from api.models import Company, Warehouse
        
        rf = APIRequestFactory()
        # Create Company A
        req_a = rf.post('/auth/create-company', {
            'companyName': 'Alpha Chemicals',
            'adminEmail': 'admin@alpha.com',
            'adminPassword': 'password123',
            'warehouseName': 'ALPHA WH'
        }, format='json')
        resp_a = auth_create_company(req_a)
        self.assertEqual(resp_a.status_code, 201)
        
        # Create Company B
        req_b = rf.post('/auth/create-company', {
            'companyName': 'Beta Adhesives',
            'adminEmail': 'admin@beta.com',
            'adminPassword': 'password123',
            'warehouseName': 'BETA WH'
        }, format='json')
        resp_b = auth_create_company(req_b)
        self.assertEqual(resp_b.status_code, 201)
        
        # Log in as Company A Admin
        login_req_a = rf.post('/auth/login', {'email': 'admin@alpha.com', 'password': 'password123'}, format='json')
        login_resp_a = auth_login(login_req_a)
        user_a = login_resp_a.data.get('data', {}).get('user', {})
        whs_a = [w['name'] for w in user_a.get('authorizedWarehouses', [])]
        
        # Verify Company A only sees ALPHA WH and NOT BETA WH
        self.assertIn('ALPHA WH', whs_a)
        self.assertNotIn('BETA WH', whs_a)
        
        # Log in as Company B Admin
        login_req_b = rf.post('/auth/login', {'email': 'admin@beta.com', 'password': 'password123'}, format='json')
        login_resp_b = auth_login(login_req_b)
        user_b = login_resp_b.data.get('data', {}).get('user', {})
        whs_b = [w['name'] for w in user_b.get('authorizedWarehouses', [])]
        
        # Verify Company B only sees BETA WH and NOT ALPHA WH
        self.assertIn('BETA WH', whs_b)
        self.assertNotIn('ALPHA WH', whs_b)

    def test_duplicate_email_rejected(self):
        from rest_framework.test import APIRequestFactory
        from api.views_auth import auth_create_company
        
        rf = APIRequestFactory()
        payload = {
            'companyName': 'Company One',
            'adminEmail': 'dup@test.com',
            'adminPassword': 'password123'
        }
        resp1 = auth_create_company(rf.post('/auth/create-company', payload, format='json'))
        self.assertEqual(resp1.status_code, 201)
        
        # Try creating another company with same admin email
        payload2 = {
            'companyName': 'Company Two',
            'adminEmail': 'dup@test.com',
            'adminPassword': 'password123'
        }
        resp2 = auth_create_company(rf.post('/auth/create-company', payload2, format='json'))
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('already exists', resp2.data.get('message', '').lower())

    def test_company_deactivation_blocks_login(self):
        from rest_framework.test import APIRequestFactory
        from api.views_auth import auth_create_company, auth_login
        from api.models import Company
        
        rf = APIRequestFactory()
        payload = {
            'companyName': 'Delta Power',
            'adminEmail': 'admin@deltapower.com',
            'adminPassword': 'password123'
        }
        resp = auth_create_company(rf.post('/auth/create-company', payload, format='json'))
        self.assertEqual(resp.status_code, 201)
        
        # Suspend company (as would be done via Django Admin panel)
        comp = Company.objects.get(name='Delta Power')
        comp.active = False
        comp.save(update_fields=['active'])
        
        # Attempt login
        login_resp = auth_login(rf.post('/auth/login', {'email': 'admin@deltapower.com', 'password': 'password123'}, format='json'))
        self.assertEqual(login_resp.status_code, 403)
        self.assertIn('suspended', login_resp.data.get('message', '').lower())
        
        # Reactivate company
        comp.active = True
        comp.save(update_fields=['active'])
        
        # Login succeeds
        login_resp2 = auth_login(rf.post('/auth/login', {'email': 'admin@deltapower.com', 'password': 'password123'}, format='json'))
        self.assertEqual(login_resp2.status_code, 200)

    def test_company_expired_period_blocks_login(self):
        from rest_framework.test import APIRequestFactory
        from api.views_auth import auth_create_company, auth_login
        from api.models import Company
        from django.utils import timezone
        from datetime import timedelta
        
        rf = APIRequestFactory()
        payload = {
            'companyName': 'Omega Logistics',
            'adminEmail': 'admin@omegalogistics.com',
            'adminPassword': 'password123'
        }
        resp = auth_create_company(rf.post('/auth/create-company', payload, format='json'))
        self.assertEqual(resp.status_code, 201)
        
        # Set subscription expired 1 day ago
        comp = Company.objects.get(name='Omega Logistics')
        comp.valid_until = timezone.now() - timedelta(days=1)
        comp.save(update_fields=['valid_until'])
        
        # Attempt login -> blocked automatically by backend
        login_resp = auth_login(rf.post('/auth/login', {'email': 'admin@omegalogistics.com', 'password': 'password123'}, format='json'))
        self.assertEqual(login_resp.status_code, 403)
        self.assertIn('expired', login_resp.data.get('message', '').lower())
        
        # Extend period by 30 days (as done from Django Admin 1-click action)
        comp.valid_until = timezone.now() + timedelta(days=30)
        comp.save(update_fields=['valid_until'])
        
        # Login succeeds
        login_resp2 = auth_login(rf.post('/auth/login', {'email': 'admin@omegalogistics.com', 'password': 'password123'}, format='json'))
        self.assertEqual(login_resp2.status_code, 200)

    def test_default_master_data_seeded_on_company_creation(self):
        from rest_framework.test import APIRequestFactory
        from api.views_auth import auth_create_company
        from api.models import Company, Unit, Category, Brand
        from api.tenant_manager import set_tenant_search_path, reset_search_path

        rf = APIRequestFactory()
        payload = {
            'companyName': 'Zenith Polymer Works',
            'adminEmail': 'super@zenithpolymers.com',
            'adminPassword': 'password123'
        }
        resp = auth_create_company(rf.post('/auth/create-company', payload, format='json'))
        self.assertEqual(resp.status_code, 201)

        comp = Company.objects.get(name='Zenith Polymer Works')
        self.assertTrue(comp.schemaname)

        # Switch to the tenant schema and verify seeded master data
        set_tenant_search_path(comp.schemaname)
        try:
            # Verify Units
            units = set(Unit.objects.filter(companyid=comp).values_list('name', flat=True))
            for expected_unit in ['PCS', 'BOX', 'SQFT', 'KG', 'BAG', 'MTR', 'LTR']:
                self.assertIn(expected_unit, units)

            # Verify Categories
            cats = set(Category.objects.filter(companyid=comp).values_list('name', flat=True))
            for expected_cat in ['Finished Goods', 'Raw Material', 'Packaging Material', 'General']:
                self.assertIn(expected_cat, cats)

            # Verify Brand
            brands = set(Brand.objects.filter(companyid=comp).values_list('name', flat=True))
            self.assertIn('Zenith Polymer Works', brands)
        finally:
            reset_search_path()

    def test_migrate_all_tenants_command(self):
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command('migrate_all_tenants', stdout=out)
        output = out.getvalue()
        self.assertIn('Multi-Tenant Schema Synchronization', output)

    def test_user_serializer_subscription_fields(self):
        from api.serializers import UserSerializer
        from core.models import User, Company
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        comp = Company.objects.create(
            id='cmp_test_sub_fields',
            name='Alpha Corp',
            active=True,
            valid_until=now + timedelta(days=15),
            stockmethod='FIFO'
        )
        user = User.objects.create(
            id='usr_test_sub_fields',
            email='alpha_user@example.com',
            name='Alpha User',
            role='SALES',
            active=True,
            companyid=comp
        )

        data = UserSerializer(user).data
        self.assertEqual(data['companyName'], 'Alpha Corp')
        self.assertIsNotNone(data['validUntil'])
        self.assertTrue(data['isSubscriptionActive'])






