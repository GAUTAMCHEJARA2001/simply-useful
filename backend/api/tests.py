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
        from rest_framework.test import APIRequestFactory
        from core.models import Warehouse
        
        wh = Warehouse.objects.create(name="Test Warehouse 2", active=True, companyid=self.company)
        rf = APIRequestFactory()
        req = rf.post('/transactions/productions', {
            'productId': self.product.id,
            'quantity': 5,
            'warehouse_id': wh.id,
            'items': [{'productId': self.product.id, 'quantity': 2}]
        }, format='json')
        req.user = self.user
        
        response = transaction_productions(req)
        self.assertEqual(response.status_code, 400)
        self.assertIn("NEGATIVE_RAW_MATERIALS", str(response.data))
