from django.test import TestCase
from api.models import User, Brand, Category, Product, Userproductaccess
from core.models import Company
from api.views import get_allowed_product_ids_for_user

class HealthCheckTest(TestCase):
    def test_health_check_passes(self):
        """
        A basic health check to ensure the Django testing framework runs
        without sqlite/postgres operational errors and apps are loaded.
        """
        self.assertTrue(True)

class UserAssignmentTests(TestCase):
    def setUp(self):
        # Create a company first
        self.company = Company.objects.create(id="test-company", name="Test Company", active=True)
        
        # Create a user
        self.user = User.objects.create(
            id="test-user",
            email="test@example.com",
            name="Test User",
            role="SALES",
            active=True,
            companyid=self.company
        )
        
        # Create brands (omit explicit string IDs, let AutoField handle it)
        self.brand_a = Brand.objects.create(name="Brand A", active=True, companyid=self.company)
        self.brand_b = Brand.objects.create(name="Brand B", active=True, companyid=self.company)
        
        # Create categories (nested: Parent and Subcategory; omit explicit IDs)
        self.cat_parent = Category.objects.create(name="Parent Category", active=True, companyid=self.company)
        self.cat_sub = Category.objects.create(name="Sub Category", active=True, companyid=self.company, parentid=self.cat_parent)
        self.cat_other = Category.objects.create(name="Other Category", active=True, companyid=self.company)
        
        # Create products
        # Product 1: Brand A, Parent Cat
        self.p1 = Product.objects.create(
            id="p1", productcode="P1", name="Product 1", bagsize="50kg",
            brandid=self.brand_a, categoryid=self.cat_parent, rate=100.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )
        # Product 2: Brand A, Sub Cat
        self.p2 = Product.objects.create(
            id="p2", productcode="P2", name="Product 2", bagsize="50kg",
            brandid=self.brand_a, categoryid=self.cat_sub, rate=120.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )
        # Product 3: Brand B, Parent Cat
        self.p3 = Product.objects.create(
            id="p3", productcode="P3", name="Product 3", bagsize="50kg",
            brandid=self.brand_b, categoryid=self.cat_parent, rate=130.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )
        # Product 4: Brand B, Other Cat
        self.p4 = Product.objects.create(
            id="p4", productcode="P4", name="Product 4", bagsize="50kg",
            brandid=self.brand_b, categoryid=self.cat_other, rate=140.0, gst=18.0, active=True,
            companyid=self.company, openingstock=10, minimumstock=2
        )

    def test_no_assignments_returns_none(self):
        # With no assignments, it should return None (unrestricted)
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertIsNone(allowed)

    def test_brand_only_assignment(self):
        # Assign brand_a only
        Userproductaccess.objects.create(userid=self.user, brandid=self.brand_a)
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertCountEqual(allowed, ["p1", "p2"])

    def test_category_only_assignment_includes_subcategories(self):
        # Assign cat_parent only. Since cat_sub is a child of cat_parent, it must include both.
        Userproductaccess.objects.create(userid=self.user, categoryid=self.cat_parent)
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertCountEqual(allowed, ["p1", "p2", "p3"])

    def test_brand_plus_category_assignment(self):
        # Assign brand_a and cat_parent
        Userproductaccess.objects.create(userid=self.user, brandid=self.brand_a)
        Userproductaccess.objects.create(userid=self.user, categoryid=self.cat_parent)
        
        # Access only to categories (and subcats) under brand_a
        # p1 (brand-a, cat-parent), p2 (brand-a, cat-sub)
        # p3 is brand-b, so it should NOT be included.
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertCountEqual(allowed, ["p1", "p2"])

    def test_product_only_assignment(self):
        # Assign product p3 only
        Userproductaccess.objects.create(userid=self.user, productid=self.p3)
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertCountEqual(allowed, ["p3"])

    def test_brand_plus_product_assignment(self):
        # Assign brand_b plus product p1
        Userproductaccess.objects.create(userid=self.user, brandid=self.brand_b)
        Userproductaccess.objects.create(userid=self.user, productid=self.p1)
        
        # Should return brand_b products (p3, p4) + product p1
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertCountEqual(allowed, ["p1", "p3", "p4"])

    def test_category_plus_product_assignment(self):
        # Assign cat_other plus product p1
        Userproductaccess.objects.create(userid=self.user, categoryid=self.cat_other)
        Userproductaccess.objects.create(userid=self.user, productid=self.p1)
        
        # Should return cat_other products (p4) + product p1
        allowed = get_allowed_product_ids_for_user('default', self.user.id)
        self.assertCountEqual(allowed, ["p1", "p4"])
