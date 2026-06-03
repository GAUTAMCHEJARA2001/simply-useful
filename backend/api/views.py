import datetime
from django.db import models
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, exceptions
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from api.models import (
    Company, User, Product, Category, Brand, Unit, Warehouse, Region, Market,
    Dealer, Distributor, Order, Orderitem, Visit, Expense, Bom, Bomitem, Purchase, Supplier, Labour
)
from api.serializers import (
    CompanySerializer, UserSerializer, ProductSerializer, CategorySerializer,
    BrandSerializer, UnitSerializer, WarehouseSerializer, RegionSerializer,
    MarketSerializer, DealerSerializer, DistributorSerializer, OrderSerializer,
    VisitSerializer, ExpenseSerializer, BomSerializer, SupplierSerializer, LabourSerializer
)
from api.auth import generate_tokens

# Response Helpers
def send_success(data=None, message="Done", status_code=200):
    return Response({
        "success": True,
        "data": data,
        "message": message
    }, status=status_code)

def send_error(message="Internal Server Error", status_code=500):
    return Response({
        "success": False,
        "data": None,
        "message": message
    }, status=status_code)


def _append_order_tags(narration, tags):
    import re
    text = narration or ''
    for key in tags.keys():
        text = re.sub(rf'\[{re.escape(key)}:\s*[^\]]+\]\s*', '', text, flags=re.IGNORECASE)
    tag_text = ' '.join(f'[{key}: {value}]' for key, value in tags.items() if value not in (None, ''))
    return f"{tag_text} {text}".strip()


def _extract_order_tag(narration, key, default=''):
    import re
    match = re.search(rf'\[{re.escape(key)}:\s*([^\]]+)\]', narration or '', re.IGNORECASE)
    return match.group(1).strip() if match else default


# ----------------------------------------------------
# 1. AUTHENTICATION & USER MANAGEMENT
# ----------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email:
        return send_error("Email is required", 400)

    # 1. Mock Superadmin Login (exact match to Node backend logic)
    if email in ['admin@alpha.com', 'admin@simplyuseful.com']:
        first_company = Company.objects.first()
        company_id = first_company.id if first_company else "cmo75yliq0000wesurjpett1n"
        mock_user = {
            "id": "superadmin-1",
            "email": email,
            "name": "System Admin",
            "role": "SUPERADMIN",
            "companyId": company_id
        }
        access_token, refresh_token = generate_tokens(
            mock_user["id"], mock_user["email"], mock_user["role"], mock_user["companyId"]
        )
        return send_success({
            "user": mock_user,
            "accessToken": access_token,
            "refreshToken": refresh_token
        }, "Success login. Session active.")

    # 2. Database User login
    try:
        user = User.objects.get(email=email)
        if not user.active:
            return send_error("Account is disabled", 403)
            
        # Verify Password (support direct check for dev or bcrypt check)
        # Seeded password is 'admin123', so we support it as a dev fallback
        is_valid = (password == 'admin123')
        if not is_valid:
            try:
                import bcrypt
                hashed = user.hashedpassword.encode('utf-8')
                is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed)
            except Exception:
                pass # fallback to password == 'admin123' if bcrypt is missing
                
        if not is_valid:
            return send_error("Invalid credentials", 401)

        company_id = user.companyid_id if hasattr(user, 'companyid') else user.companyid
        access_token, refresh_token = generate_tokens(user.id, user.email, user.role, company_id)

        user_data = UserSerializer(user).data
        return send_success({
            "user": user_data,
            "accessToken": access_token,
            "refreshToken": refresh_token
        }, "Success login. Session active.")
    except User.DoesNotExist:
        return send_error("Invalid credentials", 401)


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_register(request):
    email = request.data.get('email')
    password = request.data.get('password')
    name = request.data.get('name')
    role = request.data.get('role', 'SALES')
    company_id = request.data.get('companyId')

    if not email or not password:
        return send_error("Email and password are required", 400)

    if User.objects.filter(email=email).exists():
        return send_error("User already exists", 400)

    # Simple password hashing fallback
    hashed_password = password
    try:
        import bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    except Exception:
        pass

    # Generate cuid-like ID
    import uuid
    user_id = 'c' + uuid.uuid4().hex[:23]

    user = User.objects.create(
        id=user_id,
        email=email,
        name=name,
        hashedpassword=hashed_password,
        role=role,
        active=True,
        companyid_id=company_id
    )

    access_token, refresh_token = generate_tokens(user.id, user.email, user.role, company_id)
    user_data = UserSerializer(user).data

    return send_success({
        "user": user_data,
        "accessToken": access_token,
        "refreshToken": refresh_token
    }, "User registered and signed in", 201)


@api_view(['GET'])
def auth_permissions(request):
    roles = ['SALES', 'ADMIN', 'HR', 'INVENTORY', 'SUPERADMIN']
    return send_success(roles, "Roles/Permissions retrieved successfully")


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return User.objects.filter(companyid_id=company_id)
        return User.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = UserSerializer(queryset, many=True)
        return send_success(serializer.data, "Users retrieved successfully")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserSerializer(instance)
        return send_success(serializer.data, "User retrieved successfully")

    def create(self, request, *args, **kwargs):
        data = request.data
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        role = data.get('role', 'SALES')
        active = data.get('active', True)
        company_id = request.user.companyId or data.get('companyId')

        if not email or not password:
            return send_error("Email and password are required", 400)

        if User.objects.filter(email=email).exists():
            return send_error("User already exists", 400)

        # Hash password securely
        hashed_password = password
        try:
            import bcrypt
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        except Exception:
            pass

        import uuid
        from django.utils import timezone
        user_id = 'c' + uuid.uuid4().hex[:23]
        now = timezone.now()

        user = User.objects.create(
            id=user_id,
            email=email,
            name=name,
            hashedpassword=hashed_password,
            role=role,
            active=active,
            territory=data.get('territory', ''),
            companyid_id=company_id,
            createdat=now,
            updatedat=now
        )

        serializer = UserSerializer(user)
        return send_success(serializer.data, "User created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = UserSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return send_success(serializer.data, "User updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return send_success(None, "User deleted successfully")

    @action(detail=True, methods=['put'], url_path='password')
    def reset_password(self, request, pk=None):
        instance = self.get_object()
        password = request.data.get('password')
        if not password:
            return send_error("Password is required", 400)
            
        hashed_password = password
        try:
            import bcrypt
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        except Exception:
            pass
            
        instance.hashedpassword = hashed_password
        instance.save()
        return send_success(None, "Password updated successfully")


@api_view(['GET', 'POST'])
def user_assignments(request, pk):
    from api.models import User, Userproductaccess, Userwarehouseaccess
    from django.db import transaction

    # Verify user exists
    try:
        user = User.objects.get(id=pk)
    except User.DoesNotExist:
        return send_error("User not found", 404)

    if request.method == 'GET':
        brand_ids = list(Userproductaccess.objects.filter(userid=user, brandid__isnull=False).values_list('brandid_id', flat=True))
        category_ids = list(Userproductaccess.objects.filter(userid=user, categoryid__isnull=False).values_list('categoryid_id', flat=True))
        product_ids = list(Userproductaccess.objects.filter(userid=user, productid__isnull=False).values_list('productid_id', flat=True))
        warehouse_ids = list(Userwarehouseaccess.objects.filter(userid=user).values_list('warehouseid_id', flat=True))

        data = {
            "brands": brand_ids,
            "categories": category_ids,
            "products": product_ids,
            "warehouses": warehouse_ids
        }
        return send_success(data, "User assignments retrieved successfully")

    elif request.method == 'POST':
        data = request.data
        brand_ids = data.get('brands', [])
        category_ids = data.get('categories', [])
        product_ids = data.get('products', [])
        warehouse_ids = data.get('warehouses', [])

        with transaction.atomic():
            # Delete old assignments
            Userproductaccess.objects.filter(userid=user).delete()
            Userwarehouseaccess.objects.filter(userid=user).delete()

            # Insert new brand assignments
            for b_id in brand_ids:
                if b_id:
                    Userproductaccess.objects.create(userid=user, brandid_id=b_id)

            # Insert new category assignments
            for c_id in category_ids:
                if c_id:
                    Userproductaccess.objects.create(userid=user, categoryid_id=c_id)

            # Insert new product assignments
            for p_id in product_ids:
                if p_id:
                    Userproductaccess.objects.create(userid=user, productid_id=p_id)

            # Insert new warehouse assignments
            for w_id in warehouse_ids:
                if w_id:
                    Userwarehouseaccess.objects.create(userid=user, warehouseid_id=w_id)

        return send_success(data, "User assignments updated successfully")


# ----------------------------------------------------
# 2. INVENTORY & PRODUCTS
# ----------------------------------------------------

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        # Apply company scope
        company_id = self.request.user.companyId
        queryset = Product.objects.filter(companyid_id=company_id) if company_id else Product.objects.all()

        # Skip assignment filter for:
        # 1. The master products catalog endpoint
        # 2. Admin/inventory/superadmin roles (they can manage all products)
        # 3. Write operations (PUT, PATCH, DELETE) — admins must be able to edit any product
        admin_roles = {'ADMIN', 'SUPERADMIN', 'INVENTORY', 'HR'}
        user_role = getattr(self.request.user, 'role', '') or ''
        is_write_op = self.request.method in ('PUT', 'PATCH', 'DELETE', 'POST')
        skip_assignment_filter = (
            'masters/products' in self.request.path or
            user_role.upper() in admin_roles or
            is_write_op
        )

        # Filter by user assignments if they exist and we shouldn't skip
        if self.request.user and not skip_assignment_filter:
            user_id = self.request.user.userId
            from api.models import Userproductaccess
            has_assignments = Userproductaccess.objects.filter(userid_id=user_id).exists()
            if has_assignments:
                product_ids = list(Userproductaccess.objects.filter(userid_id=user_id, productid__isnull=False).values_list('productid_id', flat=True))
                queryset = queryset.filter(id__in=product_ids)

        return queryset


    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = ProductSerializer(queryset, many=True)
        return send_success(serializer.data, "Products fetched successfully")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ProductSerializer(instance)
        return send_success(serializer.data, "Product fetched successfully")

    def create(self, request, *args, **kwargs):
        from django.utils import timezone
        now = timezone.now()
        
        # Override company id to match logged in user
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        
        # Resolve unit name from frontend 'unit' to 'unitId'
        unit_name = data.get('unit')
        if unit_name:
            try:
                from api.models import Unit
                unit_obj = Unit.objects.filter(name=unit_name).first()
                if unit_obj:
                    data['unitId'] = unit_obj.id
            except Exception:
                pass
        
        # Generate SKU / productCode if blank or missing
        product_code = (data.get('productCode') or data.get('productcode') or '').strip()
        if not product_code:
            company_id = request.user.companyId
            company = Company.objects.filter(id=company_id).first() if company_id else None
            prefix = getattr(company, 'skuprefix', 'PRD') or 'PRD'
            import random
            import string
            attempts = 0
            while attempts < 100:
                rand_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                candidate_code = f"{prefix}-{rand_suffix}"
                if not Product.objects.filter(productcode=candidate_code).exists():
                    product_code = candidate_code
                    break
                attempts += 1
            if not product_code:
                return send_error("Failed to auto-generate a unique product code", 400)
            data['productCode'] = product_code

        # Generate cuid-like ID
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = ProductSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(createdat=now, updatedat=now)
        return send_success(serializer.data, "Product created successfully", 201)

    def update(self, request, *args, **kwargs):
        from django.utils import timezone
        now = timezone.now()
        
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        
        data = request.data.copy()
        # Resolve unit name from frontend 'unit' to 'unitId' on updates
        unit_name = data.get('unit')
        if unit_name:
            try:
                from api.models import Unit
                unit_obj = Unit.objects.filter(name=unit_name).first()
                if unit_obj:
                    data['unitId'] = unit_obj.id
            except Exception:
                pass
                
        serializer = ProductSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(updatedat=now)
        return send_success(serializer.data, "Product updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success(None, "Product deleted successfully")

    @action(detail=False, methods=['get'], url_path='subcategories')
    def subcategories(self, request):
        queryset = self.get_queryset()
        categories = list(queryset.values_list('categoryid__name', flat=True).distinct())
        categories = [c for c in categories if c]
        return send_success(categories, "Categories fetched successfully")


# ----------------------------------------------------
# 3. MASTER DATA
# ----------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def list(self, request, *args, **kwargs):
        company_id = request.user.companyId
        queryset = Category.objects.filter(companyid_id=company_id) if company_id else Category.objects.all()
        serializer = CategorySerializer(queryset, many=True)
        return send_success(serializer.data, "Categories fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        serializer = CategorySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Category created successfully", 201)


class BrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer

    def list(self, request, *args, **kwargs):
        company_id = request.user.companyId
        queryset = Brand.objects.filter(companyid_id=company_id) if company_id else Brand.objects.all()
        serializer = BrandSerializer(queryset, many=True)
        return send_success(serializer.data, "Brands fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        serializer = BrandSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Brand created successfully", 201)


class UnitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def list(self, request, *args, **kwargs):
        company_id = request.user.companyId
        queryset = Unit.objects.filter(companyid_id=company_id) if company_id else Unit.objects.all()
        serializer = UnitSerializer(queryset, many=True)
        return send_success(serializer.data, "Units fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        serializer = UnitSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Unit created successfully", 201)


class WarehouseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

    def list(self, request, *args, **kwargs):
        company_id = request.user.companyId
        queryset = Warehouse.objects.filter(companyid_id=company_id) if company_id else Warehouse.objects.all()

        # Enforce warehouse assignments if they exist for the user and (this is NOT the master warehouses endpoint OR user role is INVENTORY)
        if request.user and ('masters/warehouses' not in request.path or request.user.role == 'INVENTORY'):
            user_id = request.user.userId
            from api.models import Userwarehouseaccess
            has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
            if has_wh_assignments:
                assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
                queryset = queryset.filter(id__in=assigned_wh_ids)

        serializer = WarehouseSerializer(queryset, many=True)
        return send_success(serializer.data, "Warehouses fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        serializer = WarehouseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Warehouse created successfully", 201)


class RegionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Region.objects.all()
    serializer_class = RegionSerializer

    def list(self, request, *args, **kwargs):
        company_id = request.user.companyId
        queryset = Region.objects.filter(companyid_id=company_id) if company_id else Region.objects.all()
        serializer = RegionSerializer(queryset, many=True)
        return send_success(serializer.data, "Regions fetched successfully")


class MarketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Market.objects.all()
    serializer_class = MarketSerializer

    def list(self, request, *args, **kwargs):
        # Markets filter by active status or region
        queryset = Market.objects.all()
        serializer = MarketSerializer(queryset, many=True)
        return send_success(serializer.data, "Markets fetched successfully")


class SupplierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Supplier.objects.filter(companyid_id=company_id)
        return Supplier.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = SupplierSerializer(queryset, many=True)
        return send_success(serializer.data, "Suppliers fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        from django.utils import timezone
        now = timezone.now()

        serializer = SupplierSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(createdat=now, updatedat=now)
        return send_success(serializer.data, "Supplier created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        
        from django.utils import timezone
        now = timezone.now()

        serializer = SupplierSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(updatedat=now)
        return send_success(serializer.data, "Supplier updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success(None, "Supplier deleted successfully")


class LabourViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Labour.objects.all()
    serializer_class = LabourSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Labour.objects.filter(companyid_id=company_id)
        return Labour.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = LabourSerializer(queryset, many=True)
        return send_success(serializer.data, "Labour records fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        
        from django.utils import timezone
        now = timezone.now()

        serializer = LabourSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(createdat=now, updatedat=now)
        return send_success(serializer.data, "Labour record created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        
        from django.utils import timezone
        now = timezone.now()

        serializer = LabourSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(updatedat=now)
        return send_success(serializer.data, "Labour record updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success(None, "Labour record deleted successfully")


import json
import os
from django.conf import settings
from django.http import HttpResponse

SETTINGS_FILE_PATH = os.path.join(settings.BASE_DIR, 'settings_store.json')

def load_settings():
    default_vals = {
        "stock_method": "FIFO",
        "allow_negative_stock": False,
        "company_name": "Simply Useful ERP",
        "companyName": "Simply Useful ERP",
        "currency_symbol": "₹",
        "sku_prefix": "KCPL",
        "stockMethod": "FIFO",
        "skuPrefix": "KCPL",
        "allow_price_edit_sales": False,
        "allowPriceEditSales": False,
        "show_credit_warnings": True,
        "showCreditWarnings": True,
        "order_approval_required": False,
        "orderApprovalRequired": False
    }
    if os.path.exists(SETTINGS_FILE_PATH):
        try:
            with open(SETTINGS_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Clean up any literal 'key' and 'value' fields from the dictionary
                data.pop('key', None)
                data.pop('value', None)

                # Harmonize snake_case and camelCase keys
                if 'stock_method' in data:
                    data['stockMethod'] = data['stock_method']
                elif 'stockMethod' in data:
                    data['stock_method'] = data['stockMethod']
                
                if 'sku_prefix' in data:
                    data['skuPrefix'] = data['sku_prefix']
                elif 'skuPrefix' in data:
                    data['sku_prefix'] = data['skuPrefix']

                if 'allow_price_edit_sales' in data:
                    data['allowPriceEditSales'] = data['allow_price_edit_sales']
                elif 'allowPriceEditSales' in data:
                    data['allow_price_edit_sales'] = data['allowPriceEditSales']

                if 'show_credit_warnings' in data:
                    data['showCreditWarnings'] = data['show_credit_warnings']
                elif 'showCreditWarnings' in data:
                    data['show_credit_warnings'] = data['showCreditWarnings']

                if 'order_approval_required' in data:
                    data['orderApprovalRequired'] = data['order_approval_required']
                elif 'orderApprovalRequired' in data:
                    data['order_approval_required'] = data['orderApprovalRequired']

                if 'company_name' in data:
                    data['companyName'] = data['company_name']
                elif 'companyName' in data:
                    data['company_name'] = data['companyName']
                
                return {**default_vals, **data}
        except Exception:
            return default_vals
    return default_vals

def save_settings(data):
    try:
        with open(SETTINGS_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception:
        pass

@api_view(['GET', 'POST', 'PUT', 'PATCH'])
def master_settings(request):
    if request.method in ['POST', 'PUT', 'PATCH']:
        current_data = load_settings()
        new_data = request.data
        if not isinstance(new_data, dict):
            new_data = {}
        
        # Merge payload with existing properties
        updated_data = {**current_data, **new_data}
        
        # Extract frontend key-value structure if passed as { key, value }
        if 'key' in new_data and 'value' in new_data:
            key_name = new_data['key']
            value_val = new_data['value']
            updated_data.pop('key', None)
            updated_data.pop('value', None)
            updated_data[key_name] = value_val
            new_data = {key_name: value_val}
        else:
            updated_data.pop('key', None)
            updated_data.pop('value', None)

        # Harmonize snake_case and camelCase on updates
        if 'stock_method' in new_data:
            updated_data['stockMethod'] = new_data['stock_method']
        elif 'stockMethod' in new_data:
            updated_data['stock_method'] = new_data['stockMethod']
            
        if 'sku_prefix' in new_data:
            updated_data['skuPrefix'] = new_data['sku_prefix']
        elif 'skuPrefix' in new_data:
            updated_data['sku_prefix'] = new_data['skuPrefix']

        if 'allow_price_edit_sales' in new_data:
            updated_data['allowPriceEditSales'] = new_data['allow_price_edit_sales']
        elif 'allowPriceEditSales' in new_data:
            updated_data['allow_price_edit_sales'] = new_data['allowPriceEditSales']

        if 'show_credit_warnings' in new_data:
            updated_data['showCreditWarnings'] = new_data['show_credit_warnings']
        elif 'showCreditWarnings' in new_data:
            updated_data['show_credit_warnings'] = new_data['showCreditWarnings']

        if 'order_approval_required' in new_data:
            updated_data['orderApprovalRequired'] = new_data['order_approval_required']
        elif 'orderApprovalRequired' in new_data:
            updated_data['order_approval_required'] = new_data['orderApprovalRequired']

        if 'company_name' in new_data:
            updated_data['companyName'] = new_data['company_name']
        elif 'companyName' in new_data:
            updated_data['company_name'] = new_data['companyName']
            
        save_settings(updated_data)
        return send_success(updated_data, "Settings updated successfully")
        
    # GET method
    settings_data = load_settings()
    response = send_success(settings_data, "Settings retrieved")
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


def _csv_response(filename, headers, rows=None):
    import csv
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(headers)
    for row in rows or []:
        writer.writerow(row)
    return response


def _read_uploaded_csv(request):
    import csv
    import io
    uploaded = request.FILES.get('file')
    if not uploaded:
        return None, send_error("CSV file is required", 400)
    content = uploaded.read().decode('utf-8-sig')
    return list(csv.DictReader(io.StringIO(content))), None


def _truthy(value, default=True):
    if value in (None, ''):
        return default
    return str(value).strip().lower() in ('1', 'true', 'yes', 'y', 'active')


def _num(value, default=0.0):
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return default


def _int(value, default=0):
    try:
        return int(float(value or default))
    except (TypeError, ValueError):
        return default


def _new_id(prefix='c'):
    import uuid
    return prefix + uuid.uuid4().hex[:23]


def _company_id(request):
    val = getattr(request.user, 'companyId', None)
    if val:
        from api.models import Company
        if Company.objects.filter(id=val).exists():
            return val
    return Company.objects.first().id


FY_START_MONTH = 4

def _fy_date_filter(request, queryset, date_field='date'):
    """
    Apply an optional date range filter from query params.
    Accepts:
      ?fy=2024-25           — April 1 2024 to March 31 2025 (exclusive end = April 1 2025)
      ?quarter=Q1           — Filter by fiscal quarter (can combine with ?fy, or defaults to current FY)
      ?start=2024-04-01&end=2025-04-01  — explicit ISO dates (endExclusive)
    If neither param is present, returns the queryset unchanged.
    """
    fy_param = request.query_params.get('fy')
    quarter_param = request.query_params.get('quarter')
    start_param = request.query_params.get('start')
    end_param = request.query_params.get('end')

    # Process quarter if present
    quarter = None
    if quarter_param:
        q_str = str(quarter_param).strip().upper()
        if q_str.startswith('Q'):
            q_str = q_str[1:]
        try:
            q_val = int(q_str)
            if 1 <= q_val <= 4:
                quarter = q_val
        except ValueError:
            pass

    if (fy_param or quarter) and not (start_param or end_param):
        try:
            # 1. Resolve starting year of the financial year
            if fy_param:
                start_year = int(fy_param.split('-')[0])
            else:
                today = datetime.date.today()
                if today.month < FY_START_MONTH:
                    start_year = today.year - 1
                else:
                    start_year = today.year

            # 2. Resolve date bounds
            if quarter:
                # Calculate start of quarter
                start_month = ((FY_START_MONTH - 1) + (quarter - 1) * 3) % 12 + 1
                start_year_offset = 1 if start_month < FY_START_MONTH else 0
                filter_start = datetime.date(start_year + start_year_offset, start_month, 1)
                
                # Calculate end of quarter (which is the start of the next quarter)
                if quarter == 4:
                    next_month = FY_START_MONTH
                    next_year_offset = 1
                else:
                    next_month = ((FY_START_MONTH - 1) + quarter * 3) % 12 + 1
                    next_year_offset = 1 if next_month < FY_START_MONTH else 0
                filter_end_excl = datetime.date(start_year + next_year_offset, next_month, 1)
            else:
                filter_start = datetime.date(start_year, FY_START_MONTH, 1)
                filter_end_excl = datetime.date(start_year + 1, FY_START_MONTH, 1)

            queryset = queryset.filter(**{
                f'{date_field}__gte': filter_start,
                f'{date_field}__lt': filter_end_excl,
            })
        except (ValueError, IndexError, AttributeError):
            pass  # Ignore malformed params
    elif start_param:
        try:
            qs = queryset
            start_date = datetime.date.fromisoformat(start_param)
            qs = qs.filter(**{f'{date_field}__gte': start_date})
            if end_param:
                end_date = datetime.date.fromisoformat(end_param)
                qs = qs.filter(**{f'{date_field}__lt': end_date})
            queryset = qs
        except (ValueError, AttributeError):
            pass  # Ignore malformed date params

    return queryset


@api_view(['GET'])
def bulk_template(request, entity):
    templates = {
        'products': (
            'products_template.csv',
            ['productCode', 'name', 'bagSize', 'category', 'subcategory', 'brand', 'unit', 'rate', 'gst', 'openingStock', 'minimumStock', 'defaultWarehouse'],
            [['FG-001', 'Sample Product', '50 KG', 'FINISHED GOOD', 'Tile Adhesive', 'Default Brand', 'BAG', '100', '18', '0', '10', 'Main Warehouse']]
        ),
        'dealers': (
            'dealers_template.csv',
            ['dealerCode', 'dealerName', 'city', 'assignedSoEmail', 'distributorName', 'creditLimit', 'outstanding', 'active', 'territory'],
            [['D-001', 'Sample Dealer', 'Jaipur', 'sales@example.com', 'Sample Distributor', '100000', '0', 'true', 'T-WEST']]
        ),
        'distributors': (
            'distributors_template.csv',
            ['distributorName', 'area', 'assignedSoEmail', 'creditLimit', 'outstanding', 'active', 'territory'],
            [['Sample Distributor', 'North Zone', 'sales@example.com', '500000', '0', 'true', 'T-WEST']]
        ),
        'recipes': (
            'recipes_template.csv',
            ['recipeCode', 'recipeName', 'outputQuantity', 'materialName', 'qty', 'unit'],
            [
                ['FG-001', 'Sample Product Recipe', '1', 'Cement', '10', 'KG'],
                ['FG-001', 'Sample Product Recipe', '1', 'Sand', '20', 'KG'],
            ]
        ),
    }
    if entity not in templates:
        return send_error("Unknown template type", 404)
    filename, headers, rows = templates[entity]
    return _csv_response(filename, headers, rows)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def bulk_import(request, entity):
    rows, error = _read_uploaded_csv(request)
    if error:
        return error

    company_id = _company_id(request)
    created = 0
    updated = 0
    skipped = []

    try:
        if entity == 'products':
            for index, row in enumerate(rows, start=2):
                code = (row.get('productCode') or row.get('product_code') or '').strip()
                name = (row.get('name') or row.get('productName') or '').strip()
                category_name = (row.get('category') or '').strip()
                subcategory_name = (row.get('subcategory') or row.get('subCategory') or row.get('sub_category') or '').strip()
                
                if not name or (not category_name and not subcategory_name):
                    skipped.append({"row": index, "reason": "productName/name and category/subcategory are required"})
                    continue

                if not code:
                    company = Company.objects.filter(id=company_id).first()
                    prefix = getattr(company, 'skuprefix', 'PRD') or 'PRD'
                    import random
                    import string
                    attempts = 0
                    while attempts < 100:
                        rand_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                        candidate_code = f"{prefix}-{rand_suffix}"
                        if not Product.objects.filter(productcode=candidate_code).exists():
                            code = candidate_code
                            break
                        attempts += 1
                    if not code:
                        skipped.append({"row": index, "reason": "Failed to auto-generate a unique product code"})
                        continue

                category_to_assign = None
                if category_name:
                    category, created = Category.objects.get_or_create(
                        name=category_name,
                        companyid_id=company_id,
                        defaults={'parentid': None, 'active': True}
                    )
                    if not created and category.parentid is not None:
                        category.parentid = None
                        category.save()
                    category_to_assign = category
                    
                    if subcategory_name:
                        subcategory, created_sub = Category.objects.get_or_create(
                            name=subcategory_name,
                            companyid_id=company_id,
                            defaults={'parentid': category, 'active': True}
                        )
                        if not created_sub and subcategory.parentid != category:
                            subcategory.parentid = category
                            subcategory.save()
                        category_to_assign = subcategory
                elif subcategory_name:
                    category, created = Category.objects.get_or_create(
                        name=subcategory_name,
                        companyid_id=company_id,
                        defaults={'parentid': None, 'active': True}
                    )
                    if not created and category.parentid is not None:
                        category.parentid = None
                        category.save()
                    category_to_assign = category

                brand = None
                brand_name = (row.get('brand') or '').strip()
                if brand_name:
                    brand, _ = Brand.objects.get_or_create(
                        name=brand_name,
                        companyid_id=company_id,
                        defaults={'active': True}
                    )
                unit = None
                unit_name = (row.get('unit') or '').strip()
                if unit_name:
                    unit, _ = Unit.objects.get_or_create(
                        name=unit_name,
                        companyid_id=company_id,
                        defaults={'active': True}
                    )

                default_wh = None
                wh_value = (row.get('defaultWarehouse') or row.get('defaultWarehouseId') or '').strip()
                if wh_value:
                    if wh_value.isdigit():
                        wh = Warehouse.objects.filter(companyid_id=company_id).filter(Q(name__iexact=wh_value) | Q(id=int(wh_value))).first()
                    else:
                        wh = Warehouse.objects.filter(companyid_id=company_id).filter(name__iexact=wh_value).first()
                    default_wh = wh.id if wh else None

                existing = Product.objects.filter(productcode=code).first()
                values = {
                    'name': name,
                    'bagsize': row.get('bagSize') or row.get('bag_size') or '50 KG',
                    'brandid': brand,
                    'unitid': unit,
                    'rate': _num(row.get('rate') or row.get('price')),
                    'gst': _num(row.get('gst'), 18.0),
                    'active': _truthy(row.get('active'), True),
                    'companyid_id': company_id,
                    'categoryid': category_to_assign,
                    'openingstock': _int(row.get('openingStock') or row.get('opening_stock')),
                    'minimumstock': _int(row.get('minimumStock') or row.get('minimum_stock')),
                    'defaultwarehouseid': default_wh,
                    'updatedat': timezone.now(),
                }
                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                    existing.save()
                    updated += 1
                else:
                    Product.objects.create(id=_new_id(), productcode=code, createdat=timezone.now(), **values)
                    created += 1

        elif entity == 'dealers':
            for index, row in enumerate(rows, start=2):
                code = (row.get('dealerCode') or row.get('dealer_code') or '').strip()
                name = (row.get('dealerName') or row.get('dealer_name') or '').strip()
                if not code or not name:
                    skipped.append({"row": index, "reason": "dealerCode and dealerName are required"})
                    continue
                values = {
                    'dealername': name,
                    'city': row.get('city') or '',
                    'assignedsoemail': row.get('assignedSoEmail') or row.get('assigned_so_email') or '',
                    'distributorname': row.get('distributorName') or row.get('distributor_name') or '',
                    'creditlimit': _num(row.get('creditLimit') or row.get('credit_limit')),
                    'outstanding': _num(row.get('outstanding')),
                    'active': _truthy(row.get('active'), True),
                    'territory': row.get('territory') or '',
                    'companyid_id': company_id,
                    'updatedat': timezone.now(),
                }
                existing = Dealer.objects.filter(dealercode=code).first()
                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                    existing.save()
                    updated += 1
                else:
                    Dealer.objects.create(id=_new_id(), dealercode=code, createdat=timezone.now(), **values)
                    created += 1

        elif entity == 'distributors':
            for index, row in enumerate(rows, start=2):
                name = (row.get('distributorName') or row.get('distributor_name') or '').strip()
                if not name:
                    skipped.append({"row": index, "reason": "distributorName is required"})
                    continue
                values = {
                    'area': row.get('area') or '',
                    'assignedsoemail': row.get('assignedSoEmail') or row.get('assigned_so_email') or '',
                    'creditlimit': _num(row.get('creditLimit') or row.get('credit_limit')),
                    'outstanding': _num(row.get('outstanding')),
                    'active': _truthy(row.get('active'), True),
                    'territory': row.get('territory') or '',
                    'companyid_id': company_id,
                    'updatedat': timezone.now(),
                }
                existing = Distributor.objects.filter(distributorname=name).first()
                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                    existing.save()
                    updated += 1
                else:
                    Distributor.objects.create(id=_new_id(), distributorname=name, createdat=timezone.now(), **values)
                    created += 1

        elif entity == 'recipes':
            grouped = {}
            for index, row in enumerate(rows, start=2):
                code = (row.get('recipeCode') or row.get('productCode') or '').strip()
                material = (row.get('materialName') or '').strip()
                if not code or not material:
                    skipped.append({"row": index, "reason": "recipeCode and materialName are required"})
                    continue
                grouped.setdefault(code, {
                    'name': row.get('recipeName') or code,
                    'outputQuantity': _num(row.get('outputQuantity'), 1.0),
                    'items': []
                })
                grouped[code]['items'].append({
                    'materialname': material,
                    'qty': _num(row.get('qty')),
                    'unit': row.get('unit') or '',
                })

            for code, recipe in grouped.items():
                bom = Bom.objects.filter(productcode=code).first()
                if bom:
                    bom.name = recipe['name']
                    bom.outputquantity = recipe['outputQuantity']
                    bom.updatedat = timezone.now()
                    bom.save()
                    Bomitem.objects.filter(bomid=bom).delete()
                    updated += 1
                else:
                    bom = Bom.objects.create(
                        id=_new_id(),
                        productcode=code,
                        name=recipe['name'],
                        companyid_id=company_id,
                        outputquantity=recipe['outputQuantity'],
                        createdat=timezone.now(),
                        updatedat=timezone.now(),
                    )
                    created += 1
                for item in recipe['items']:
                    Bomitem.objects.create(id=_new_id(), bomid=bom, **item)
        else:
            return send_error("Unknown import type", 404)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return send_error(f"Import failed: {exc}", 400)

    return send_success({
        "created": created,
        "updated": updated,
        "skipped": skipped,
    }, "Bulk import completed")


@api_view(['GET'])
def database_export(request):
    import os
    from django.conf import settings
    
    export_format = request.GET.get('db_format', request.GET.get('format', 'json')).lower()
    if export_format == 'sqlite':
        db_path = settings.DATABASES['default']['NAME']
        if os.path.exists(db_path):
            with open(db_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type='application/x-sqlite3')
                response['Content-Disposition'] = 'attachment; filename="db.sqlite3"'
                return response

    from django.forms.models import model_to_dict
    from django.core.serializers.json import DjangoJSONEncoder
    import json

    company_id = _company_id(request)
    export_map = {
        "products": Product.objects.filter(companyid_id=company_id),
        "categories": Category.objects.filter(companyid_id=company_id),
        "brands": Brand.objects.filter(companyid_id=company_id),
        "units": Unit.objects.filter(companyid_id=company_id),
        "warehouses": Warehouse.objects.filter(companyid_id=company_id),
        "dealers": Dealer.objects.filter(companyid_id=company_id),
        "distributors": Distributor.objects.filter(companyid_id=company_id),
        "orders": Order.objects.filter(companyid_id=company_id),
        "orderItems": Orderitem.objects.filter(orderid__companyid_id=company_id),
        "visits": Visit.objects.filter(companyid_id=company_id),
        "expenses": Expense.objects.filter(companyid_id=company_id),
        "suppliers": Supplier.objects.filter(companyid_id=company_id),
        "labours": Labour.objects.filter(companyid_id=company_id),
        "recipes": Bom.objects.filter(companyid_id=company_id),
        "recipeItems": Bomitem.objects.filter(bomid__companyid_id=company_id),
    }
    payload = {
        name: [model_to_dict(obj) for obj in qs]
        for name, qs in export_map.items()
    }
    response = HttpResponse(json.dumps(payload, cls=DjangoJSONEncoder, indent=2), content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename="simply-useful-database-export.json"'
    return response


# ----------------------------------------------------
# 4. PARTNERS (DEALERS & DISTRIBUTORS)
# ----------------------------------------------------

class DealerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Dealer.objects.all()
    serializer_class = DealerSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        user_email = getattr(self.request.user, 'email', None)
        qs = Dealer.objects.filter(companyid_id=company_id) if company_id else Dealer.objects.all()
        if user_role == 'SALES' and user_email:
            qs = qs.filter(assignedsoemail=user_email)
        return qs

    def get_object(self):
        """Resolve by dealerCode first, fall back to database pk."""
        queryset = self.get_queryset()
        pk = self.kwargs.get(self.lookup_field, '')
        try:
            obj = queryset.get(dealercode=pk)
        except Dealer.DoesNotExist:
            try:
                obj = queryset.get(pk=pk)
            except (Dealer.DoesNotExist, ValueError):
                raise exceptions.NotFound('Dealer not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = DealerSerializer(queryset, many=True)
        return send_success(serializer.data, "Dealers fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        serializer = DealerSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Dealer created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        # Preserve company isolation
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        serializer = DealerSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Dealer updated successfully")

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success({}, "Dealer deleted successfully")


class DistributorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Distributor.objects.all()
    serializer_class = DistributorSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        user_email = getattr(self.request.user, 'email', None)
        qs = Distributor.objects.filter(companyid_id=company_id) if company_id else Distributor.objects.all()
        if user_role == 'SALES' and user_email:
            qs = qs.filter(assignedsoemail=user_email)
        return qs

    def get_object(self):
        """Resolve by distributorName first, fall back to database pk."""
        queryset = self.get_queryset()
        pk = self.kwargs.get(self.lookup_field, '')
        try:
            obj = queryset.get(distributorname=pk)
        except Distributor.DoesNotExist:
            try:
                obj = queryset.get(pk=pk)
            except (Distributor.DoesNotExist, ValueError):
                raise exceptions.NotFound('Distributor not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = DistributorSerializer(queryset, many=True)
        return send_success(serializer.data, "Distributors fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        serializer = DistributorSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Distributor created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        serializer = DistributorSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Distributor updated successfully")

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success({}, "Distributor deleted successfully")


# ----------------------------------------------------
# 5. SALES & ORDERS
# ----------------------------------------------------

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Order.objects.filter(companyid_id=company_id)
        return Order.objects.all()

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs[lookup_url_kwarg]
        
        # Try finding by primary key (id) first
        try:
            return queryset.get(id=pk)
        except (Order.DoesNotExist, ValueError):
            # Fall back to finding by orderId field
            try:
                return queryset.get(orderid=pk)
            except Order.DoesNotExist:
                raise exceptions.NotFound("Order not found")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().prefetch_related('orderitem_set')
        queryset = _fy_date_filter(request, queryset, date_field='date')
        serializer = OrderSerializer(queryset, many=True)
        return send_success(serializer.data, "Orders fetched successfully")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = OrderSerializer(instance)
        return send_success(serializer.data, "Order fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        if request.user.email:
            data['soEmail'] = request.user.email

        # Generate unique ORD number
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        if 'orderId' not in data or not data['orderId']:
            import random
            data['orderId'] = f"ORD-2026-{random.randint(1000, 9999)}"

        # Generate unique ids for nested items if they don't exist
        items_list = data.get('items', [])
        for item in items_list:
            if 'id' not in item or not item['id']:
                item['id'] = 'c' + uuid.uuid4().hex[:23]

        # Save order (nested serializer handles Orderitem creation automatically)
        serializer = OrderSerializer(data=data)
        if not serializer.is_valid():
            print("❌ OrderSerializer Validation Errors:", serializer.errors)
            return send_error(f"Validation failed: {serializer.errors}", 400)
        
        order = serializer.save()
        
        # Recalculate inventory for each created item in the order
        for item in order.orderitem_set.all():
            if item.productid_id:
                recalculate_product_inventory(item.productid_id)

        # Return refreshed serializer
        full_serializer = OrderSerializer(order)
        return send_success(full_serializer.data, "Order created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        product_ids = list(instance.orderitem_set.values_list('productid_id', flat=True))
        
        # Generate unique ids for nested items if they don't exist
        data = request.data.copy()
        import uuid
        items_list = data.get('items', [])
        for item in items_list:
            if 'id' not in item or not item['id']:
                item['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = OrderSerializer(instance, data=data, partial=partial)
        if not serializer.is_valid():
            print("❌ OrderSerializer Update Validation Errors:", serializer.errors)
            return send_error(f"Validation failed: {serializer.errors}", 400)
        order = serializer.save()
        
        new_product_ids = list(order.orderitem_set.values_list('productid_id', flat=True))
        for pid in set(product_ids + new_product_ids):
            if pid:
                recalculate_product_inventory(pid)
                
        return send_success(serializer.data, "Order updated successfully")

    @action(detail=True, methods=['put'], url_path='items')
    def update_items(self, request, pk=None):
        return self.update(request, pk=pk)

    @action(detail=True, methods=['put'], url_path='status')
    def update_status(self, request, pk=None):
        instance = self.get_object()
        data = request.data.copy()
        
        status_val = data.get('status')
        reason_val = data.get('reason')
        
        if not status_val:
            return send_error("Status field is required", 400)
            
        instance.status = status_val
        if status_val == 'Cancelled' or status_val == 'Rejected':
            from django.utils import timezone
            rejection_date = data.get('actionDate') or data.get('action_date') or timezone.now().strftime('%Y-%m-%d')
            instance.narration = f"[REJECTION REASON: {reason_val or 'No reason provided'}] [REJECTION DATE: {rejection_date}]"
        elif reason_val:
            instance.narration = reason_val
            
        instance.save()
        
        # Recalculate inventory
        for item in instance.orderitem_set.all():
            if item.productid_id:
                recalculate_product_inventory(item.productid_id)
                
        serializer = OrderSerializer(instance)
        return send_success(serializer.data, f"Order status updated to {status_val}")


# ----------------------------------------------------
# 6. FIELD ACTIVITIES & EXPENSES
# ----------------------------------------------------

class VisitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Visit.objects.all()
    serializer_class = VisitSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        qs = Visit.objects.filter(companyid_id=company_id) if company_id else Visit.objects.all()
        
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        SALES_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER']
        if user_role in SALES_ROLES and self.request.user.email:
            qs = qs.filter(soemail=self.request.user.email)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = _fy_date_filter(request, queryset, date_field='date')
        serializer = VisitSerializer(queryset, many=True)
        return send_success(serializer.data, "Visits fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        if request.user.email:
            data['soEmail'] = request.user.email

        # Generate unique ID
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = VisitSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Visit registered successfully", 201)


class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        qs = Expense.objects.filter(companyid_id=company_id) if company_id else Expense.objects.all()
        
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        SALES_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER']
        if user_role in SALES_ROLES and self.request.user.email:
            qs = qs.filter(soemail=self.request.user.email)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = _fy_date_filter(request, queryset, date_field='date')
        serializer = ExpenseSerializer(queryset, many=True)
        return send_success(serializer.data, "Expenses fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        if request.user.email:
            data['soEmail'] = request.user.email

        # Generate unique ID
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = ExpenseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Expense registered successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        if request.user.email and not data.get('soEmail'):
            data['soEmail'] = instance.soemail_id or request.user.email
        data['status'] = data.get('status') or 'PENDING'

        serializer = ExpenseSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Expense updated successfully")

    @action(detail=True, methods=['put'], url_path='status')
    def update_status(self, request, pk=None):
        instance = self.get_object()
        status_val = request.data.get('status')
        reject_reason = request.data.get('rejectReason') or request.data.get('reject_reason')

        if not status_val:
            return send_error("Status field is required", 400)

        instance.status = status_val
        if reject_reason is not None:
            instance.rejectreason = reject_reason
        instance.save()

        serializer = ExpenseSerializer(instance)
        return send_success(serializer.data, f"Expense status updated to {status_val}")


# ----------------------------------------------------
# 7. BILL OF MATERIALS (BOM)
# ----------------------------------------------------

class BOMViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Bom.objects.all()
    serializer_class = BomSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Bom.objects.filter(companyid_id=company_id)
        return Bom.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().prefetch_related('bomitem_set')
        serializer = BomSerializer(queryset, many=True)
        return send_success(serializer.data, "BOMs fetched successfully")

    def create(self, request, *args, **kwargs):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ('SUPERADMIN', 'ADMIN'):
            return send_error("You do not have permission to manage recipes", 403)

        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId

        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = BomSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        bom = serializer.save()

        full_serializer = BomSerializer(bom)
        return send_success(full_serializer.data, "BOM created successfully", 201)

    def update(self, request, *args, **kwargs):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ('SUPERADMIN', 'ADMIN'):
            return send_error("You do not have permission to manage recipes", 403)

        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
            
        serializer = BomSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        bom = serializer.save()
        
        full_serializer = BomSerializer(bom)
        return send_success(full_serializer.data, "BOM updated successfully")

    def destroy(self, request, *args, **kwargs):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ('SUPERADMIN', 'ADMIN'):
            return send_error("You do not have permission to manage recipes", 403)

        instance = self.get_object()
        instance.delete()
        return send_success(None, "BOM deleted successfully")


# ----------------------------------------------------
# 8. REPORTS LAYER
# ----------------------------------------------------

@api_view(['GET'])
def report_dashboard_kpis(request):
    company_id = request.user.companyId
    
    products_q = Product.objects.filter(companyid_id=company_id) if company_id else Product.objects.all()
    dealers_q = Dealer.objects.filter(companyid_id=company_id) if company_id else Dealer.objects.all()
    orders_q = Order.objects.filter(companyid_id=company_id) if company_id else Order.objects.all()
    
    total_products = products_q.count()
    total_dealers = dealers_q.count()
    total_orders = orders_q.count()
    
    revenue_q = orders_q.filter(status='Completed').aggregate(Sum('grandtotal'))
    revenue = MathRound(revenue_q['grandtotal__sum'] or 0)
    
    # SQLite average cost or stock value
    import sqlite3
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    if company_id:
        cursor.execute("SELECT SUM(quantity) FROM Inventory JOIN Product ON Inventory.productId = Product.id WHERE Product.companyId = ?", (company_id,))
    else:
        cursor.execute("SELECT SUM(quantity) FROM Inventory")
    total_stock_value = cursor.fetchone()[0] or 0
    conn.close()
    
    kpis = {
        "products": total_products,
        "dealers": total_dealers,
        "revenue": revenue,
        "orders": total_orders,
        "totalStockValue": total_stock_value
    }
    
    return send_success(kpis, "Dashboard KPIs fetched")


def MathRound(val):
    if val is None:
        return 0
    return int(round(val))


@api_view(['GET'])
def report_sales_summary(request):
    company_id = request.user.companyId
    orders_q = Order.objects.filter(status__in=['Approved', 'Completed'])
    if company_id:
        orders_q = orders_q.filter(companyid_id=company_id)
        
    # Group orders by day and calculate daily revenue and counts
    from django.db.models.functions import TruncDate
    from django.db.models import Count, Sum
    
    daily_groups = orders_q.annotate(day=TruncDate('createdat')).values('day').annotate(
        total_sales=Count('id'),
        total_revenue=Sum('grandtotal')
    ).order_by('day')
    
    chart_data = []
    for g in daily_groups:
        if not g['day']:
            continue
        day_str = g['day'].strftime('%Y-%m-%d')
        total_rev = g['total_revenue'] or 0.0
        
        # Calculate daily profit by subtracting cost for all order items sold on this day
        day_orders = orders_q.filter(createdat__date=g['day']).prefetch_related('orderitem_set')
        day_profit = 0.0
        for order in day_orders:
            for item in order.orderitem_set.all():
                qty = item.qty or 0
                price = item.price or 0.0
                
                # Retrieve product average cost or fallback to 70% of rate
                from api.models import Inventory, Product
                cost_price = 0.0
                try:
                    inv = Inventory.objects.filter(productid_id=item.productid_id).first()
                    if inv and inv.avgcost:
                        cost_price = inv.avgcost
                    else:
                        prod = Product.objects.filter(id=item.productid_id).first()
                        cost_price = (prod.rate * 0.7) if prod else 0.0
                except Exception:
                    cost_price = 0.0
                
                item_revenue = qty * price
                item_cost = qty * cost_price
                day_profit += (item_revenue - item_cost)
                
        chart_data.append({
            "name": day_str,
            "date": day_str,
            "day": day_str,
            "total": total_rev,
            "total_sales": g['total_sales'],
            "total_revenue": total_rev,
            "total_profit": max(0.0, day_profit)
        })
        
    return send_success(chart_data, "Sales summary trends fetched")


@api_view(['GET'])
def report_low_stock(request):
    company_id = request.user.companyId
    
    import sqlite3
    conn = sqlite3.connect('db.sqlite3')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if company_id:
        cursor.execute("""
            SELECT productId, SUM(quantity) as total_qty 
            FROM Inventory 
            JOIN Product ON Inventory.productId = Product.id 
            WHERE Product.companyId = ? 
            GROUP BY productId 
            HAVING total_qty < 50
        """, (company_id,))
    else:
        cursor.execute("""
            SELECT productId, SUM(quantity) as total_qty 
            FROM Inventory 
            GROUP BY productId 
            HAVING total_qty < 50
        """)
        
    low_stock_rows = cursor.fetchall()
    product_ids = [row['productId'] for row in low_stock_rows]
    
    products = Product.objects.filter(id__in=product_ids).select_related('categoryid', 'unitid')
    if company_id:
        products = products.filter(companyid_id=company_id)
        
    data = []
    for p in products:
        stock_row = next((row for row in low_stock_rows if row['productId'] == p.id), None)
        qty = stock_row['total_qty'] if stock_row else 0
        data.append({
            "id": p.id,
            "productName": p.name,
            "sku": p.productcode,
            "categoryName": p.categoryid.name if p.categoryid else "Uncategorized",
            "unit": p.unitid.name if p.unitid else "—",
            "currentStock": qty,
            "availableStock": qty,
            "minimumStock": 50
        })
        
    conn.close()
    return send_success(data, "Low stock products fetched")


@api_view(['GET'])
def report_daily(request):
    company_id = request.user.companyId
    condition = Q(companyid_id=company_id) if company_id else Q()
    
    today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    sales = Order.objects.filter(condition & Q(createdat__gte=today))
    purchases = Purchase.objects.filter(condition & Q(createdat__gte=today))
    pending_count = Order.objects.filter(condition & Q(status='Pending')).count()
    
    serialized_sales = OrderSerializer(sales, many=True).data
    # Mock purchases for simplicity
    serialized_purchases = []
    for p in purchases:
        serialized_purchases.append({
            "id": p.id,
            "purchaseId": p.purchaseid,
            "date": p.date,
            "vendorName": p.vendorname,
            "grandTotal": p.grandtotal,
            "status": p.status,
            "companyId": p.companyid_id
        })
    
    daily_data = {
        "date": today.isoformat(),
        "sales": {"count": len(serialized_sales), "list": serialized_sales},
        "purchases": {"count": len(serialized_purchases), "list": serialized_purchases},
        "pendingCount": pending_count
    }
    
    return send_success(daily_data, "Daily reports fetched")


@api_view(['GET'])
def report_current_stock(request):
    company_id = request.user.companyId
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Ensure StockTransaction table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS StockTransaction (
                id TEXT PRIMARY KEY,
                productId TEXT NOT NULL,
                warehouseId INTEGER DEFAULT 1,
                transactionType TEXT NOT NULL,
                quantity REAL NOT NULL,
                referenceId TEXT,
                reason TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(productId) REFERENCES Product(id)
            )
        """)
        
        # Query raw stock details
        query = """
            SELECT p.id as p_id, p.name as p_name, p.productCode as p_code, 
                   c.name as c_name, u.name as u_name, inv.quantity as qty, 
                   w.id as w_id, w.name as w_name, p.openingStock as p_opening,
                   p.minimumStock as p_min
            FROM Inventory inv
            JOIN Product p ON inv.productId = p.id
            LEFT JOIN Category c ON p.categoryId = c.id
            LEFT JOIN Unit u ON p.unitId = u.id
            LEFT JOIN Warehouse w ON inv.warehouseId = w.id
        """
        user_id = request.user.userId
        from api.models import Userwarehouseaccess
        has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
        
        where_clauses = []
        params = []
        if company_id:
            where_clauses.append("p.companyId = %s")
            params.append(company_id)
            
        if has_wh_assignments and request.user.role == 'INVENTORY':
            assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
            if assigned_wh_ids:
                placeholders = ", ".join(["%s"] * len(assigned_wh_ids))
                where_clauses.append(f"inv.warehouseId IN ({placeholders})")
                params.extend(assigned_wh_ids)
            else:
                where_clauses.append("1 = 0")
                
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            cursor.execute(query, tuple(params))
        else:
            cursor.execute(query)
            
        rows = cursor.fetchall()
        desc = cursor.description
        column_names = [col[0] for col in desc]
        rows_dicts = [dict(zip(column_names, row)) for row in rows]
        
        stock_raw = []
        for r in rows_dicts:
            product_id = r['p_id']
            product_name = r['p_name']
            opening = float(r['p_opening'] or 0)
            
            # ── Purchases (IN) ────────────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(p_item.qty), 0)
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s
                  AND p.status IN ('Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED')
            """, (product_name,))
            purchases_sum = float(cursor.fetchone()[0] or 0)
            
            # ── Purchase Returns (OUT) ────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(p_item.qty), 0)
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s AND p.status = 'Returned'
            """, (product_name,))
            purchase_return_sum = float(cursor.fetchone()[0] or 0)
            
            # ── Sales (OUT) — includes Returned orders because the sale physically happened ──
            cursor.execute("""
                SELECT COALESCE(SUM(o_item.qty), 0)
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status IN ('Completed', 'Returned')
            """, (product_id,))
            sales_sum = float(cursor.fetchone()[0] or 0)
            
            # ── Sales Returns (IN) — stock that came back; net of sales+return = 0 ──
            cursor.execute("""
                SELECT COALESCE(SUM(o_item.qty), 0)
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status = 'Returned'
            """, (product_id,))
            sales_return_sum = float(cursor.fetchone()[0] or 0)
            
            # ── Production (IN) ───────────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(quantity), 0) FROM StockTransaction
                WHERE productId = %s AND transactionType = 'PRODUCTION'
            """, (product_id,))
            production_sum = float(cursor.fetchone()[0] or 0)
            
            # ── Consumed (OUT — stored as negative in DB, show as positive) ──
            cursor.execute("""
                SELECT COALESCE(SUM(quantity), 0) FROM StockTransaction
                WHERE productId = %s AND transactionType = 'CONSUMED'
            """, (product_id,))
            consumed_raw = float(cursor.fetchone()[0] or 0)
            consumed_sum = abs(consumed_raw)  # display value (positive)
            
            # ── Adjustments (+/-) ─────────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(quantity), 0) FROM StockTransaction
                WHERE productId = %s AND transactionType = 'ADJUSTMENT'
            """, (product_id,))
            adjustment_sum = float(cursor.fetchone()[0] or 0)
            
            # ── Formula ───────────────────────────────────────────────────
            # Closing = Opening + Purchases − Purchase Returns − Sales + Sales Returns
            #           + Production − Consumed +/− Adjustments
            # Note: consumed_raw is already negative in DB, so add it directly
            closing_stock = (
                opening
                + purchases_sum
                - purchase_return_sum
                - sales_sum
                + sales_return_sum
                + production_sum
                + consumed_raw      # negative value = subtraction
                + adjustment_sum
            )
            
            stock_raw.append({
                "productId": product_id,
                "productName": product_name,
                "sku": r['p_code'],
                "categoryName": r['c_name'],
                "unit": r['u_name'] or '—',
                "openingStock": opening,
                "production": production_sum,
                "consumed": consumed_sum,       # display as positive
                "purchase": purchases_sum,
                "sales": sales_sum,
                "salesReturn": sales_return_sum,
                "purchaseReturn": purchase_return_sum,
                "adjustment": adjustment_sum,   # can be +/-
                "currentStock": closing_stock,
                "availableStock": closing_stock,
                "minimumStock": float(r['p_min'] or 0),
                "warehouseId": r['w_id'],
                "warehouseName": r['w_name'] or 'Unknown'
            })
            
        return send_success(stock_raw, "Current stocks fetched")



def recalculate_product_inventory(product_id):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            # Ensure StockTransaction table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS StockTransaction (
                    id TEXT PRIMARY KEY,
                    productId TEXT NOT NULL,
                    warehouseId INTEGER DEFAULT 1,
                    transactionType TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    referenceId TEXT,
                    reason TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(productId) REFERENCES Product(id)
                )
            """)
            
            # Get product's opening stock
            cursor.execute("SELECT name, openingStock FROM Product WHERE id = %s", (product_id,))
            p_row = cursor.fetchone()
            if not p_row:
                return
            p_name, opening_stock = p_row
            opening_stock = float(opening_stock or 0)
            
            # ── Purchases (IN) ─────────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(p_item.qty), 0)
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s
                  AND p.status IN ('Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED')
            """, (p_name,))
            purchase_qty = float(cursor.fetchone()[0] or 0)
            
            # ── Purchase Returns (OUT) ──────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(p_item.qty), 0)
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s AND p.status = 'Returned'
            """, (p_name,))
            purchase_return_qty = float(cursor.fetchone()[0] or 0)
            
            # ── Sales (OUT) — includes Returned orders: the sale physically happened ──
            cursor.execute("""
                SELECT COALESCE(SUM(o_item.qty), 0)
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status IN ('Completed', 'Returned')
            """, (product_id,))
            sales_qty = float(cursor.fetchone()[0] or 0)
            
            # ── Sales Returns (IN) — stock that physically came back ──────
            cursor.execute("""
                SELECT COALESCE(SUM(o_item.qty), 0)
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status = 'Returned'
            """, (product_id,))
            sales_return_qty = float(cursor.fetchone()[0] or 0)
            
            # ── Production (IN) ─────────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(quantity), 0) FROM StockTransaction
                WHERE productId = %s AND transactionType = 'PRODUCTION'
            """, (product_id,))
            production_qty = float(cursor.fetchone()[0] or 0)
            
            # ── Consumed (OUT — stored as negative in DB) ────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(quantity), 0) FROM StockTransaction
                WHERE productId = %s AND transactionType = 'CONSUMED'
            """, (product_id,))
            consumed_qty = float(cursor.fetchone()[0] or 0)  # already negative
            
            # ── Adjustments (+/-) ───────────────────────────────────────
            cursor.execute("""
                SELECT COALESCE(SUM(quantity), 0) FROM StockTransaction
                WHERE productId = %s AND transactionType = 'ADJUSTMENT'
            """, (product_id,))
            adjustment_qty = float(cursor.fetchone()[0] or 0)
            
            # ── Formula ─────────────────────────────────────────────────
            # Closing = Opening + Purchases − Purchase Returns − Sales + Sales Returns
            #           + Production − Consumed +/− Adjustments
            new_qty = (
                opening_stock
                + purchase_qty
                - purchase_return_qty
                - sales_qty
                + sales_return_qty
                + production_qty
                + consumed_qty      # negative = subtraction
                + adjustment_qty
            )
            
            # Update or Insert into Inventory for default warehouse (ID 1)
            cursor.execute("SELECT quantity FROM Inventory WHERE productId = %s AND warehouseId = 1", (product_id,))
            inv_row = cursor.fetchone()
            if inv_row is not None:
                cursor.execute("UPDATE Inventory SET quantity = %s, updatedAt = datetime('now') WHERE productId = %s AND warehouseId = 1", (new_qty, product_id))
            else:
                cursor.execute("INSERT INTO Inventory (productId, warehouseId, quantity, avgCost, createdAt, updatedAt) VALUES (%s, 1, %s, 0.0, datetime('now'), datetime('now'))", (product_id, new_qty))
    except Exception as e:
        print("Error recalculating inventory:", e)


@api_view(['GET'])
def report_stock_ledger(request, pk):
    from api.models import Product, Purchaseitem, Orderitem
    from django.utils import timezone
    
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return send_error("Product not found", 404)
        
    company_id = request.user.companyId
    
    date_from = request.GET.get('dateFrom')
    date_to = request.GET.get('dateTo')
    
    # 1. Fetch Purchases of this product
    purchases = Purchaseitem.objects.filter(
        productname=product.name,
        purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED', 'Returned']
    )
    if company_id:
        purchases = purchases.filter(purchaseid__companyid_id=company_id)
    if date_from:
        purchases = purchases.filter(purchaseid__date__gte=date_from)
    if date_to:
        purchases = purchases.filter(purchaseid__date__lte=date_to + " 23:59:59")
        
    # 2. Fetch Sales of this product
    sales = Orderitem.objects.filter(
        productid=product,
        orderid__status__in=['Completed', 'Returned']
    )
    if company_id:
        sales = sales.filter(orderid__companyid_id=company_id)
    if date_from:
        sales = sales.filter(orderid__date__gte=date_from)
    if date_to:
        sales = sales.filter(orderid__date__lte=date_to + " 23:59:59")
        
    # Combine them into a list of events
    events = []
    
    for item in purchases:
        p = item.purchaseid
        if p.status == 'Returned':
            events.append({
                "id": f"pur_ret_evt_{item.id}",
                "date": p.date,
                "transactionType": "PURCHASE_RETURN",
                "referenceId": p.purchaseid,
                "warehouseName": "Main Warehouse Depot",
                "credit": 0.0,
                "debit": float(item.qty),
                "qty_change": -float(item.qty)
            })
        else:
            events.append({
                "id": f"pur_evt_{item.id}",
                "date": p.date,
                "transactionType": "PURCHASE",
                "referenceId": p.purchaseid,
                "warehouseName": "Main Warehouse Depot",
                "credit": float(item.qty),
                "debit": 0.0,
                "qty_change": float(item.qty)
            })
        
    for item in sales:
        o = item.orderid
        
        # ALWAYS emit the original SALE debit — the goods physically left the warehouse
        events.append({
            "id": f"sal_evt_{item.id}",
            "date": o.date,
            "transactionType": "SALE",
            "referenceId": o.orderid,
            "warehouseName": "Main Warehouse Depot",
            "credit": 0.0,
            "debit": float(item.qty),
            "qty_change": -float(item.qty)
        })
        
        # For returned orders, ALSO emit a separate SALES_RETURN credit line
        # This preserves the full audit trail: -66 SALE + +66 SALES_RETURN = net 0
        if o.status == 'Returned':
            # Use the RETURN DATE tag from narration when available for accurate dating
            narration = o.narration or ''
            return_date_str = _extract_order_tag(narration, 'RETURN DATE') or _extract_order_tag(narration, 'RETURN TIME')
            return_dt = o.updatedat  # fallback
            if return_date_str:
                from django.utils.dateparse import parse_datetime, parse_date
                from django.utils import timezone as tz
                parsed = parse_datetime(return_date_str) or (
                    parse_date(return_date_str) and
                    tz.make_aware(__import__('datetime').datetime.combine(
                        parse_date(return_date_str),
                        __import__('datetime').time()
                    ))
                )
                if parsed:
                    if tz.is_naive(parsed):
                        parsed = tz.make_aware(parsed)
                    return_dt = parsed
            events.append({
                "id": f"sal_ret_evt_{item.id}",
                "date": return_dt,
                "transactionType": "SALES_RETURN",
                "referenceId": o.orderid,
                "warehouseName": "Main Warehouse Depot",
                "credit": float(item.qty),
                "debit": 0.0,
                "qty_change": float(item.qty)
            })
        
    # 3. Query custom stock transactions
    from django.db import connection
    with connection.cursor() as cursor:
        if date_from and date_to:
            cursor.execute("""
                SELECT id, transactionType, referenceId, quantity, reason, createdAt
                FROM StockTransaction
                WHERE productId = %s AND createdAt >= %s AND createdAt <= %s
            """, (product.id, date_from, date_to + " 23:59:59"))
        elif date_from:
            cursor.execute("""
                SELECT id, transactionType, referenceId, quantity, reason, createdAt
                FROM StockTransaction
                WHERE productId = %s AND createdAt >= %s
            """, (product.id, date_from))
        elif date_to:
            cursor.execute("""
                SELECT id, transactionType, referenceId, quantity, reason, createdAt
                FROM StockTransaction
                WHERE productId = %s AND createdAt <= %s
            """, (product.id, date_to + " 23:59:59"))
        else:
            cursor.execute("""
                SELECT id, transactionType, referenceId, quantity, reason, createdAt
                FROM StockTransaction
                WHERE productId = %s
            """, (product.id,))
            
        desc = cursor.description
        col_names = [col[0] for col in desc]
        st_events = [dict(zip(col_names, row)) for row in cursor.fetchall()]
        
    for item in st_events:
        qty = float(item["quantity"])
        # Dates fetched by raw SQLite cursor can be naive or timezone aware. Map safely:
        dt = item["createdAt"]
        if isinstance(dt, str):
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(dt) or timezone.now()
        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
            
        events.append({
            "id": item["id"],
            "date": dt,
            "transactionType": item["transactionType"],
            "referenceId": item["referenceId"] or "TX",
            "warehouseName": "Main Warehouse Depot",
            "credit": qty if qty > 0 else 0.0,
            "debit": abs(qty) if qty < 0 else 0.0,
            "qty_change": qty
        })
        
    # Sort events by date
    events.sort(key=lambda x: x["date"])
    
    # Calculate running balance
    opening_balance = float(product.openingstock or 0)
    running_balance = opening_balance
    
    ledger_items = []
    
    # Add opening stock as the first row so users can see it in the ledger table
    if opening_balance > 0:
        ledger_items.append({
            "id": "opening_balance",
            "date": (date_from or "2000-01-01"),
            "transactionType": "OPENING STOCK",
            "referenceId": "—",
            "warehouseName": "—",
            "credit": opening_balance,
            "debit": 0.0,
            "balance": opening_balance,
            "quantityChange": opening_balance
        })
    
    for evt in events:
        running_balance += evt["qty_change"]
        ledger_items.append({
            "id": evt["id"],
            "date": evt["date"].isoformat() if hasattr(evt["date"], 'isoformat') else str(evt["date"]),
            "transactionType": evt["transactionType"],
            "referenceId": evt["referenceId"],
            "warehouseName": evt["warehouseName"],
            "credit": evt["credit"],
            "debit": evt["debit"],
            "balance": running_balance,
            "quantityChange": evt["qty_change"]
        })
        
    data = {
        "openingBalance": opening_balance,
        "currentStock": running_balance,
        "items": ledger_items
    }
    
    return send_success(data, "Stock ledger fetched successfully")


@api_view(['GET'])
def report_aggregate_stock(request):
    company_id = request.user.companyId
    user_id = request.user.userId
    from api.models import Userwarehouseaccess
    has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
    
    import sqlite3
    conn = sqlite3.connect('db.sqlite3')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    params = []
    
    if has_wh_assignments and request.user.role == 'INVENTORY':
        assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
        if assigned_wh_ids:
            placeholders = ", ".join(["?"] * len(assigned_wh_ids))
            query = f"""
                SELECT p.id as p_id, p.name as p_name, p.productCode as p_code, 
                       c.name as c_name, u.name as u_name, SUM(inv.quantity) as total_qty
                FROM Product p
                LEFT JOIN Inventory inv ON p.id = inv.productId AND inv.warehouseId IN ({placeholders})
                LEFT JOIN Category c ON p.categoryId = c.id
                LEFT JOIN Unit u ON p.unitId = u.id
            """
            params.extend(assigned_wh_ids)
        else:
            query = """
                SELECT p.id as p_id, p.name as p_name, p.productCode as p_code, 
                       c.name as c_name, u.name as u_name, 0 as total_qty
                FROM Product p
                LEFT JOIN Category c ON p.categoryId = c.id
                LEFT JOIN Unit u ON p.unitId = u.id
            """
    else:
        query = """
            SELECT p.id as p_id, p.name as p_name, p.productCode as p_code, 
                   c.name as c_name, u.name as u_name, SUM(inv.quantity) as total_qty
            FROM Product p
            LEFT JOIN Inventory inv ON p.id = inv.productId
            LEFT JOIN Category c ON p.categoryId = c.id
            LEFT JOIN Unit u ON p.unitId = u.id
        """

    if company_id:
        if "WHERE" in query:
            query += " AND p.companyId = ? GROUP BY p.id"
        else:
            query += " WHERE p.companyId = ? GROUP BY p.id"
        params.append(company_id)
    else:
        query += " GROUP BY p.id"
        
    cursor.execute(query, tuple(params))
    
    rows = cursor.fetchall()
    conn.close()
    
    aggregate = []
    for r in rows:
        aggregate.append({
            "productId": r['p_id'],
            "productName": r['p_name'],
            "sku": r['p_code'],
            "categoryName": r['c_name'],
            "totalStock": r['total_qty'] or 0,
            "availableStock": r['total_qty'] or 0,
            "unit": r['u_name'] or 'Units'
        })
        
    return send_success(aggregate, "Aggregate stocks fetched")


@api_view(['GET'])
def report_global_inventory(request):
    # Only superadmin
    if request.user.role != 'SUPERADMIN':
        return Response({"success": False, "message": "Forbidden: SuperAdmin access only"}, status=403)
        
    import sqlite3
    conn = sqlite3.connect('db.sqlite3')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT inv.id as inv_id, cmp.name as cmp_name, p.name as p_name, p.productCode as p_code, 
               c.name as c_name, inv.quantity as qty, u.name as u_name, w.name as w_name, inv.updatedAt as updated
        FROM Inventory inv
        JOIN Product p ON inv.productId = p.id
        JOIN Company cmp ON p.companyId = cmp.id
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Unit u ON p.unitId = u.id
        LEFT JOIN Warehouse w ON inv.warehouseId = w.id
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for r in rows:
        data.append({
            "id": r['inv_id'],
            "companyName": r['cmp_name'],
            "productName": r['p_name'],
            "sku": r['p_code'],
            "categoryName": r['c_name'] or 'Uncategorized',
            "quantity": r['qty'],
            "unit": r['u_name'] or 'Units',
            "warehouseName": r['w_name'] or 'External',
            "updatedAt": r['updated']
        })
        
    return send_success(data, "Global inventory fetched")


# ----------------------------------------------------
# 9. TRANSACTIONS LAYER
# ----------------------------------------------------

@api_view(['GET', 'POST'])
def transaction_purchases(request):
    from api.models import Purchase, Purchaseitem, Supplier, Product, Purchaseorder, Company, Warehouse
    from django.db import IntegrityError, transaction
    from django.utils import timezone
    import uuid

    def next_purchase_number():
        prefix = f"PUR-{timezone.now().year}-"
        max_sequence = 0
        for purchase_id in Purchase.objects.filter(purchaseid__startswith=prefix).values_list('purchaseid', flat=True):
            suffix = str(purchase_id).removeprefix(prefix)
            if suffix.isdigit():
                max_sequence = max(max_sequence, int(suffix))

        sequence = max_sequence + 1
        candidate = f"{prefix}{sequence:05d}"
        while Purchase.objects.filter(purchaseid=candidate).exists():
            sequence += 1
            candidate = f"{prefix}{sequence:05d}"
        return candidate

    def as_float(value, field_name):
        if value in (None, ''):
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            raise ValueError(f"{field_name} must be a number")

    if request.method == 'GET':
        purchases = Purchase.objects.all().prefetch_related('purchaseitem_set', 'purchaseorderid')
        data = []
        for p in purchases:
            items_data = []
            for item in p.purchaseitem_set.all():
                # Try to find matching Product to get productId
                prod_id = ""
                try:
                    prod = Product.objects.filter(name=item.productname).first()
                    if prod:
                        prod_id = prod.id
                except Exception:
                    pass

                items_data.append({
                    "id": item.id,
                    "productName": item.productname,
                    "productId": prod_id,
                    "qty": item.qty,
                    "quantity": item.qty,
                    "rate": item.rate,
                    "total": item.total,
                    "tax_percent": 18.0
                })
            
            data.append({
                "id": p.id,
                "purchaseId": p.purchaseid,
                "date": p.date,
                "vendorName": p.vendorname,
                "supplierName": p.vendorname,
                "supplier": {"name": p.vendorname},
                "supplier_id": p.supplierid_id,
                "supplierId": p.supplierid_id,
                "warehouse_id": p.warehouseid_id or "",
                "warehouseId": p.warehouseid_id or "",
                "grandTotal": p.grandtotal,
                "netAmount": p.grandtotal,
                "total_amount": p.grandtotal,
                "status": p.status,
                "companyId": p.companyid_id,
                "createdAt": p.createdat,
                "updatedAt": p.updatedat,
                "challanNumber": p.challannumber or "",
                "vehicleNumber": p.vehiclenumber or "",
                "vehicle_number": p.vehiclenumber or "",
                "totalTax": p.totaltax or 0.0,
                "purchaseOrderId": p.purchaseorderid_id or "",
                "purchase_order_id": p.purchaseorderid_id or "",
                "purchaseOrderNumber": p.purchaseorderid.ponumber if p.purchaseorderid else "",
                "items": items_data,
                "lineItems": items_data
            })
        return send_success(data, "Purchases fetched")
        
    elif request.method == 'POST':
        data = request.data.copy()
        now = timezone.now()

        company_id = getattr(request.user, 'companyId', None) or 'cmo75yliq0000wesurjpett1n'
        if not Company.objects.filter(id=company_id).exists():
            fallback_company = Company.objects.first()
            if not fallback_company:
                return send_error("No company is configured for purchases", 400)
            company_id = fallback_company.id
        data['companyId'] = company_id

        # Find supplier name for vendorname
        supplier_id = data.get('supplier_id') or data.get('supplierId')
        supplier = None
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                pass
        vendor_name = supplier.name if supplier else (data.get('vendorName') or data.get('supplierName') or 'Walk-in Vendor')

        # Find warehouse
        warehouse_id = data.get('warehouse_id') or data.get('warehouseId')
        warehouse = None
        if warehouse_id:
            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
            except Exception:
                pass

        # Generate unique PUR number
        pur_num = next_purchase_number()
        pur_id = 'pur_' + uuid.uuid4().hex[:20]

        # Calculate totals & taxes from lineItems
        line_items_data = data.get('lineItems') or data.get('items') or []
        if not isinstance(line_items_data, list) or not line_items_data:
            return send_error("At least one purchase line item is required", 400)

        grand_total = 0.0
        total_tax = 0.0
        try:
            for it in line_items_data:
                qty = as_float(it.get('quantity') or it.get('qty'), "Quantity")
                rate = as_float(it.get('rate'), "Rate")
                tax_p = as_float(it.get('tax_percent'), "Tax percent")
                item_subtotal = qty * rate
                item_tax = item_subtotal * (tax_p / 100)
                total_tax += item_tax
                grand_total += (item_subtotal + item_tax)
        except ValueError as exc:
            return send_error(str(exc), 400)

        # Find linked purchase order
        purchase_order_id = data.get('purchase_order_id') or data.get('purchaseOrderId')
        purchase_order = None
        if purchase_order_id:
            try:
                purchase_order = Purchaseorder.objects.get(id=purchase_order_id)
            except Purchaseorder.DoesNotExist:
                pass

        # Handle custom date if provided
        purchase_date = now
        req_date = data.get('date')
        if req_date:
            try:
                from django.utils.dateparse import parse_datetime, parse_date
                parsed_dt = parse_datetime(req_date)
                if parsed_dt:
                    if timezone.is_naive(parsed_dt):
                        parsed_dt = timezone.make_aware(parsed_dt, timezone.get_current_timezone())
                    purchase_date = parsed_dt
                else:
                    parsed_d = parse_date(req_date)
                    if parsed_d:
                        import datetime
                        purchase_date = timezone.make_aware(
                            datetime.datetime.combine(parsed_d, datetime.time.min),
                            timezone.get_current_timezone()
                        )
            except Exception:
                pass

        try:
            with transaction.atomic():
                # Create Purchase
                purchase_obj = Purchase.objects.create(
                    id=pur_id,
                    purchaseid=pur_num,
                    date=purchase_date,
                    vendorname=vendor_name,
                    grandtotal=grand_total,
                    status=data.get('status') or 'Completed',
                    companyid_id=company_id,
                    createdat=now,
                    updatedat=now,
                    supplierid=supplier,
                    challannumber=data.get('challanNumber') or data.get('challan_number') or data.get('challan'),
                    vehiclenumber=str(data.get('vehicleNumber') or data.get('vehicle_number') or data.get('vehicle') or '').strip().upper(),
                    totaltax=total_tax,
                    purchaseorderid=purchase_order,
                    warehouseid=warehouse
                )

                # Create Purchase Items
                items_data = []
                for it in line_items_data:
                    item_id = 'pui_' + uuid.uuid4().hex[:19]
                    qty = int(as_float(it.get('quantity') or it.get('qty'), "Quantity"))
                    rate = as_float(it.get('rate'), "Rate")
                    tax_p = as_float(it.get('tax_percent'), "Tax percent")
                    item_total = qty * rate * (1 + tax_p / 100)

                    # Find product name
                    product_name = 'Unknown Product'
                    prod_id = it.get('productId') or it.get('product_id')
                    if prod_id:
                        try:
                            prod = Product.objects.get(id=prod_id)
                            product_name = prod.name
                        except Product.DoesNotExist:
                            pass

                    Purchaseitem.objects.create(
                        id=item_id,
                        purchaseid=purchase_obj,
                        productname=product_name,
                        qty=qty,
                        rate=rate,
                        total=item_total
                    )
                    if prod_id:
                        recalculate_product_inventory(prod_id)
                    items_data.append({
                        "id": item_id,
                        "productName": product_name,
                        "productId": prod_id,
                        "qty": qty,
                        "quantity": qty,
                        "rate": rate,
                        "total": item_total,
                        "tax_percent": tax_p
                    })
        except IntegrityError:
            return send_error("Purchase could not be recorded because related data is out of sync. Please refresh and try again.", 409)

        # Auto-update Purchase Order status if linked
        if purchase_order:
            try:
                ordered_qty = sum(item.quantity for item in purchase_order.purchaseorderitem_set.all())
                linked_purchase_ids = Purchase.objects.filter(purchaseorderid=purchase_order).values_list('id', flat=True)
                received_qty = sum(item.qty for item in Purchaseitem.objects.filter(purchaseid_id__in=linked_purchase_ids))
                
                if received_qty >= ordered_qty:
                    purchase_order.status = 'RECEIVED'
                elif received_qty > 0:
                    purchase_order.status = 'PARTIALLY_RECEIVED'
                else:
                    purchase_order.status = 'ORDERED'
                purchase_order.save()
            except Exception:
                pass

        # Return matching structure
        res_data = {
            "id": purchase_obj.id,
            "purchaseId": purchase_obj.purchaseid,
            "date": purchase_obj.date,
            "vendorName": purchase_obj.vendorname,
            "supplierName": purchase_obj.vendorname,
            "supplier": {"name": purchase_obj.vendorname},
            "supplier_id": purchase_obj.supplierid_id,
            "supplierId": purchase_obj.supplierid_id,
            "warehouse_id": purchase_obj.warehouseid_id or "",
            "warehouseId": purchase_obj.warehouseid_id or "",
            "grandTotal": purchase_obj.grandtotal,
            "netAmount": purchase_obj.grandtotal,
            "total_amount": purchase_obj.grandtotal,
            "status": purchase_obj.status,
            "companyId": purchase_obj.companyid_id,
            "createdAt": purchase_obj.createdat,
            "updatedAt": purchase_obj.updatedat,
            "challanNumber": purchase_obj.challannumber or "",
            "vehicleNumber": purchase_obj.vehiclenumber or "",
            "vehicle_number": purchase_obj.vehiclenumber or "",
            "totalTax": purchase_obj.totaltax or 0.0,
            "purchaseOrderId": purchase_obj.purchaseorderid_id or "",
            "purchase_order_id": purchase_obj.purchaseorderid_id or "",
            "purchaseOrderNumber": purchase_obj.purchaseorderid.ponumber if purchase_obj.purchaseorderid else "",
            "items": items_data,
            "lineItems": items_data
        }
        return send_success(res_data, "Purchase recorded", 201)


@api_view(['PUT', 'DELETE'])
def transaction_purchase_detail(request, pk):
    from api.models import Purchase, Purchaseitem, Supplier, Product, Purchaseorder, Warehouse
    from django.utils import timezone
    import uuid

    try:
        purchase_obj = Purchase.objects.get(id=pk)
    except Purchase.DoesNotExist:
        return send_error("Purchase not found", 404)

    if request.method == 'PUT':
        data = request.data.copy()
        now = timezone.now()

        # Find supplier name for vendorname
        supplier_id = data.get('supplier_id') or data.get('supplierId')
        supplier = None
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                pass
        vendor_name = supplier.name if supplier else (data.get('vendorName') or data.get('supplierName') or purchase_obj.vendorname)

        # Find warehouse
        warehouse_id = data.get('warehouse_id') or data.get('warehouseId')
        warehouse = None
        if warehouse_id:
            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
            except Exception:
                pass

        # Calculate totals & taxes from lineItems
        line_items_data = data.get('lineItems', [])
        grand_total = 0.0
        total_tax = 0.0
        for it in line_items_data:
            qty = float(it.get('quantity') or it.get('qty') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            item_subtotal = qty * rate
            item_tax = item_subtotal * (tax_p / 100)
            total_tax += item_tax
            grand_total += (item_subtotal + item_tax)

        # Find linked purchase order
        purchase_order_id = data.get('purchase_order_id') or data.get('purchaseOrderId')
        old_purchase_order = purchase_obj.purchaseorderid

        purchase_order = None
        if purchase_order_id:
            try:
                purchase_order = Purchaseorder.objects.get(id=purchase_order_id)
            except Purchaseorder.DoesNotExist:
                pass

        # Handle custom date if provided
        req_date = data.get('date')
        if req_date:
            try:
                from django.utils.dateparse import parse_datetime, parse_date
                parsed_dt = parse_datetime(req_date)
                if parsed_dt:
                    if timezone.is_naive(parsed_dt):
                        parsed_dt = timezone.make_aware(parsed_dt, timezone.get_current_timezone())
                    purchase_obj.date = parsed_dt
                else:
                    parsed_d = parse_date(req_date)
                    if parsed_d:
                        import datetime
                        purchase_obj.date = timezone.make_aware(
                            datetime.datetime.combine(parsed_d, datetime.time.min),
                            timezone.get_current_timezone()
                        )
            except Exception:
                pass

        # Update Purchase
        purchase_obj.vendorname = vendor_name
        purchase_obj.grandtotal = grand_total
        if 'status' in data:
            purchase_obj.status = data.get('status')
        purchase_obj.updatedat = now
        purchase_obj.supplierid = supplier
        purchase_obj.challannumber = data.get('challanNumber') or data.get('challan_number') or data.get('challan')
        purchase_obj.vehiclenumber = str(data.get('vehicleNumber') or data.get('vehicle_number') or data.get('vehicle') or '').strip().upper()
        purchase_obj.totaltax = total_tax
        purchase_obj.purchaseorderid = purchase_order
        purchase_obj.warehouseid = warehouse
        purchase_obj.save()

        # Delete existing items and recreate
        Purchaseitem.objects.filter(purchaseid=purchase_obj).delete()

        # Create Purchase Items
        items_data = []
        for it in line_items_data:
            item_id = 'pui_' + uuid.uuid4().hex[:19]
            qty = int(it.get('quantity') or it.get('qty') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            item_total = qty * rate * (1 + tax_p / 100)

            # Find product name
            product_name = 'Unknown Product'
            prod_id = it.get('productId') or it.get('product_id')
            if prod_id:
                try:
                    prod = Product.objects.get(id=prod_id)
                    product_name = prod.name
                except Product.DoesNotExist:
                    pass

            Purchaseitem.objects.create(
                id=item_id,
                purchaseid=purchase_obj,
                productname=product_name,
                qty=qty,
                rate=rate,
                total=item_total
            )
            if prod_id:
                recalculate_product_inventory(prod_id)
            items_data.append({
                "id": item_id,
                "productName": product_name,
                "productId": prod_id,
                "qty": qty,
                "quantity": qty,
                "rate": rate,
                "total": item_total,
                "tax_percent": tax_p
            })

        # Auto-update PO status for current linked PO
        if purchase_order:
            try:
                ordered_qty = sum(item.quantity for item in purchase_order.purchaseorderitem_set.all())
                linked_purchase_ids = Purchase.objects.filter(purchaseorderid=purchase_order).values_list('id', flat=True)
                received_qty = sum(item.qty for item in Purchaseitem.objects.filter(purchaseid_id__in=linked_purchase_ids))
                
                if received_qty >= ordered_qty:
                    purchase_order.status = 'RECEIVED'
                elif received_qty > 0:
                    purchase_order.status = 'PARTIALLY_RECEIVED'
                else:
                    purchase_order.status = 'ORDERED'
                purchase_order.save()
            except Exception:
                pass

        # Auto-update PO status for old unlinked PO
        if old_purchase_order and old_purchase_order != purchase_order:
            try:
                ordered_qty = sum(item.quantity for item in old_purchase_order.purchaseorderitem_set.all())
                linked_purchase_ids = Purchase.objects.filter(purchaseorderid=old_purchase_order).values_list('id', flat=True)
                received_qty = sum(item.qty for item in Purchaseitem.objects.filter(purchaseid_id__in=linked_purchase_ids))
                
                if received_qty >= ordered_qty:
                    old_purchase_order.status = 'RECEIVED'
                elif received_qty > 0:
                    old_purchase_order.status = 'PARTIALLY_RECEIVED'
                else:
                    old_purchase_order.status = 'ORDERED'
                old_purchase_order.save()
            except Exception:
                pass

        # Return matching structure
        res_data = {
            "id": purchase_obj.id,
            "purchaseId": purchase_obj.purchaseid,
            "date": purchase_obj.date,
            "vendorName": purchase_obj.vendorname,
            "supplierName": purchase_obj.vendorname,
            "supplier": {"name": purchase_obj.vendorname},
            "supplier_id": purchase_obj.supplierid_id,
            "supplierId": purchase_obj.supplierid_id,
            "warehouse_id": purchase_obj.warehouseid_id or "",
            "warehouseId": purchase_obj.warehouseid_id or "",
            "grandTotal": purchase_obj.grandtotal,
            "netAmount": purchase_obj.grandtotal,
            "total_amount": purchase_obj.grandtotal,
            "status": purchase_obj.status,
            "companyId": purchase_obj.companyid_id,
            "createdAt": purchase_obj.createdat,
            "updatedAt": purchase_obj.updatedat,
            "challanNumber": purchase_obj.challannumber or "",
            "vehicleNumber": purchase_obj.vehiclenumber or "",
            "vehicle_number": purchase_obj.vehiclenumber or "",
            "totalTax": purchase_obj.totaltax or 0.0,
            "purchaseOrderId": purchase_obj.purchaseorderid_id or "",
            "purchase_order_id": purchase_obj.purchaseorderid_id or "",
            "purchaseOrderNumber": purchase_obj.purchaseorderid.ponumber if purchase_obj.purchaseorderid else "",
            "items": items_data,
            "lineItems": items_data
        }
        return send_success(res_data, "Purchase updated")

    elif request.method == 'DELETE':
        items = list(Purchaseitem.objects.filter(purchaseid=purchase_obj))
        # Delete items first
        Purchaseitem.objects.filter(purchaseid=purchase_obj).delete()
        purchase_obj.delete()
        for it in items:
            try:
                prod = Product.objects.filter(name=it.productname).first()
                if prod:
                    recalculate_product_inventory(prod.id)
            except Exception:
                pass
        return send_success(None, "Purchase deleted")


@api_view(['GET', 'POST'])
def transaction_sales(request):
    if request.method == 'GET':
        orders = Order.objects.filter(status='Completed').prefetch_related('orderitem_set__productid')
        serializer = OrderSerializer(orders, many=True)
        
        # Dynamically inject netAmount, totalProfit, and challanNumber into serialized data
        data = serializer.data
        for d in data:
            # 1. challanNumber extraction from narration
            narration = d.get('narration') or ''
            import re
            match = re.search(r'\[CHALLAN:\s*([^\]]+)\]', narration)
            if not match:
                match = re.search(r'\[INVOICE:\s*([^\]]+)\]', narration)
            d['challanNumber'] = match.group(1) if match else ''
            d['dispatchDate'] = _extract_order_tag(narration, 'DISPATCH DATE')
            d['warehouseId'] = _extract_order_tag(narration, 'WAREHOUSE ID')
            d['warehouseName'] = _extract_order_tag(narration, 'WAREHOUSE')
            d['vehicleNumber'] = _extract_order_tag(narration, 'VEHICLE')
            d['driverName'] = _extract_order_tag(narration, 'DRIVER')
            d['driverMobileNumber'] = _extract_order_tag(narration, 'DRIVER MOBILE')
            
            # 2. netAmount calculation: grandTotal
            d['netAmount'] = d.get('grandTotal') or 0.0
            
            # 3. totalProfit calculation: grandTotal - totalCost
            total_profit = 0.0
            order_items = d.get('items') or []
            for item in order_items:
                qty = item.get('qty') or 0
                price = item.get('price') or 0.0
                prod_id = item.get('productId')
                
                # Fetch product cost
                from api.models import Inventory, Product
                cost_price = 0.0
                if prod_id:
                    try:
                        inv = Inventory.objects.filter(productid_id=prod_id).first()
                        if inv and inv.avgcost:
                            cost_price = inv.avgcost
                        else:
                            prod = Product.objects.filter(id=prod_id).first()
                            cost_price = (prod.rate * 0.7) if prod else 0.0
                    except Exception:
                        cost_price = 0.0
                
                item_revenue = qty * price
                item_cost = qty * cost_price
                total_profit += (item_revenue - item_cost)
                
            d['totalProfit'] = max(0.0, total_profit)
            
        return send_success(data, "Inventory sales fetched")
        
    elif request.method == 'POST':
        data = request.data.copy()
        if not data.get('companyId') and request.user.companyId:
            data['companyId'] = request.user.companyId
        if not data.get('soEmail') and request.user.email:
            data['soEmail'] = request.user.email
            
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        if 'orderId' not in data or not data['orderId']:
            import random
            data['orderId'] = f"ORD-2026-{random.randint(1000, 9999)}"

        # Generate unique ids for nested items if they don't exist
        items_list = data.get('items', [])
        for item in items_list:
            if 'id' not in item or not item['id']:
                item['id'] = 'c' + uuid.uuid4().hex[:23]

        # Use OrderSerializer to validate and save
        serializer = OrderSerializer(data=data)
        if not serializer.is_valid():
            return send_error(f"Validation failed: {serializer.errors}", 400)
            
        order = serializer.save()
        
        # Recalculate inventory
        for item in order.orderitem_set.all():
            if item.productid_id:
                recalculate_product_inventory(item.productid_id)
                
        return send_success(serializer.data, "Sale recorded successfully", 201)


@api_view(['PUT', 'DELETE'])
def transaction_sales_detail(request, pk):
    try:
        order = Order.objects.get(id=pk)
    except Order.DoesNotExist:
        try:
            order = Order.objects.get(orderid=pk)
        except Order.DoesNotExist:
            return send_error("Sale record not found", 404)

    if request.method == 'PUT':
        data = request.data.copy()
        
        # Keep track of old products to recalculate inventory later
        old_product_ids = list(order.orderitem_set.values_list('productid_id', flat=True))
        
        # Delete old items
        order.orderitem_set.all().delete()
        
        import uuid
        items_list = data.get('items', [])
        for item in items_list:
            if 'id' not in item or not item['id']:
                item['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = OrderSerializer(order, data=data, partial=True)
        if not serializer.is_valid():
            return send_error(f"Validation failed: {serializer.errors}", 400)
            
        updated_order = serializer.save()
        
        # Recalculate inventory for old and new products
        new_product_ids = list(updated_order.orderitem_set.values_list('productid_id', flat=True))
        all_product_ids = set(old_product_ids + new_product_ids)
        for pid in all_product_ids:
            if pid:
                recalculate_product_inventory(pid)
                
        return send_success(serializer.data, "Sale updated successfully")
        
    elif request.method == 'DELETE':
        # Keep track of products to recalculate inventory
        product_ids = list(order.orderitem_set.values_list('productid_id', flat=True))
        
        # Delete items first
        order.orderitem_set.all().delete()
        order.delete()
        
        # Recalculate inventory
        for pid in product_ids:
            if pid:
                recalculate_product_inventory(pid)
                
        return send_success(None, "Sale deleted successfully")


@api_view(['GET'])
def transaction_approvals(request):
    approvals = Order.objects.all()
    serializer = OrderSerializer(approvals, many=True)
    
    mapped_approvals = []
    for order in serializer.data:
        mapped_approvals.append({
            "id": order.get("id"),
            "type": "SALES_ORDER",
            "referenceId": order.get("orderId"),
            "customerName": order.get("partyName"),
            "soName": order.get("soEmail"),
            "grandTotal": order.get("grandTotal"),
            "status": order.get("status") or "Pending",
            "createdAt": order.get("createdAt"),
            "data": order
        })
    return send_success(mapped_approvals, "Pending approvals fetched")


@api_view(['GET'])
def transaction_approval_detail(request, pk):
    try:
        order = Order.objects.get(id=pk)
        serializer = OrderSerializer(order)
        mapped = {
            "id": serializer.data.get("id"),
            "type": "SALES_ORDER",
            "referenceId": serializer.data.get("orderId"),
            "customerName": serializer.data.get("partyName"),
            "soName": serializer.data.get("soEmail"),
            "grandTotal": serializer.data.get("grandTotal"),
            "status": serializer.data.get("status") or "Pending",
            "createdAt": serializer.data.get("createdAt"),
            "data": serializer.data
        }
        return send_success(mapped, "Approval detail fetched")
    except Order.DoesNotExist:
        return send_success(None, "Approval detail fetched")


@api_view(['POST'])
def transaction_approve(request, pk):
    try:
        order = Order.objects.get(id=pk)
        order.status = 'Approved'
        order.save()
        for item in order.orderitem_set.all():
            if item.productid_id:
                recalculate_product_inventory(item.productid_id)
        serializer = OrderSerializer(order)
        return send_success(serializer.data, "Order approved successfully")
    except Order.DoesNotExist:
        return send_error("Order not found", 404)


@api_view(['POST'])
def transaction_dispatch(request, pk):
    try:
        order = Order.objects.prefetch_related('orderitem_set').get(id=pk)
    except Order.DoesNotExist:
        return send_error("Order not found", 404)

    data = request.data.copy()
    dispatch_date = data.get('dispatchDate') or data.get('dispatch_date')
    invoice_number = data.get('invoiceNumber') or data.get('invoice_number')
    warehouse_id = data.get('warehouseId') or data.get('warehouse_id')
    vehicle_number = str(data.get('vehicleNumber') or data.get('vehicle_number') or '').strip().upper()
    driver_name = data.get('driverName') or data.get('driver_name')
    driver_mobile = data.get('driverMobileNumber') or data.get('driver_mobile_number')

    missing = []
    for label, value in [
        ('Dispatch Date', dispatch_date),
        ('Invoice Number', invoice_number),
        ('Warehouse', warehouse_id),
        ('Vehicle Number', vehicle_number),
        ('Driver Name', driver_name),
        ('Driver Mobile Number', driver_mobile),
    ]:
        if not value:
            missing.append(label)
    if missing:
        return send_error(f"Missing required fields: {', '.join(missing)}", 400)

    warehouse_name = ''
    try:
        warehouse = Warehouse.objects.filter(id=warehouse_id).first()
        warehouse_name = warehouse.name if warehouse else str(warehouse_id)
    except Exception:
        warehouse_name = str(warehouse_id)

    from django.utils import timezone
    order.status = 'Completed'
    order.narration = _append_order_tags(order.narration, {
        'DISPATCH DATE': dispatch_date,
        'INVOICE': invoice_number,
        'WAREHOUSE': warehouse_name,
        'WAREHOUSE ID': warehouse_id,
        'VEHICLE': vehicle_number,
        'DRIVER': driver_name,
        'DRIVER MOBILE': driver_mobile,
        'DISPATCH TIME': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
    })
    order.updatedat = timezone.now()
    order.save()

    for item in order.orderitem_set.all():
        if item.productid_id:
            recalculate_product_inventory(item.productid_id)

    serializer = OrderSerializer(order)
    return send_success(serializer.data, "Order dispatched successfully")


@api_view(['POST'])
def transaction_reject(request, pk):
    try:
        order = Order.objects.get(id=pk)
        order.status = 'Cancelled'
        from django.utils import timezone
        order.narration = f"[REJECTION REASON: Rejected by Admin] [REJECTION DATE: {timezone.now().strftime('%Y-%m-%d')}]"
        order.save()
        for item in order.orderitem_set.all():
            if item.productid_id:
                recalculate_product_inventory(item.productid_id)
        serializer = OrderSerializer(order)
        return send_success(serializer.data, "Order rejected successfully")
    except Order.DoesNotExist:
        return send_error("Order not found", 404)


def check_negative_raw_materials(prod_id, yield_qty, wh_id, custom_items=None, existing_prod_id=None):
    from api.models import Product, Inventory
    from django.db import connection
    
    # 1. Determine all raw materials and their consumption quantities
    consumptions = [] # list of dicts: {"product_id": ..., "name": ..., "qty": ...}
    
    if custom_items is not None and isinstance(custom_items, list):
        for item in custom_items:
            item_prod_id = item.get('productId') or item.get('product_id')
            try:
                item_qty = float(item.get('quantity') or item.get('qty') or 0)
            except (ValueError, TypeError):
                item_qty = 0.0
            if item_prod_id and item_qty > 0:
                try:
                    p = Product.objects.get(id=item_prod_id)
                    consumptions.append({
                        "product_id": item_prod_id,
                        "name": p.name,
                        "qty": item_qty
                    })
                except Product.DoesNotExist:
                    pass
    else:
        # Auto-deduct based on standard BOM
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM BOM WHERE productCode = (SELECT productCode FROM Product WHERE id = %s) OR name = (SELECT name FROM Product WHERE id = %s)", (prod_id, prod_id))
            bom_row = cursor.fetchone()
            if bom_row:
                bom_id = bom_row[0]
                cursor.execute("SELECT materialName, qty FROM BOMItem WHERE bomId = %s", (bom_id,))
                bom_items = cursor.fetchall()
                for mat_name, mat_qty in bom_items:
                    cursor.execute("SELECT id FROM Product WHERE name = %s", (mat_name,))
                    mat_row = cursor.fetchone()
                    if mat_row:
                        mat_prod_id = mat_row[0]
                        consumptions.append({
                            "product_id": mat_prod_id,
                            "name": mat_name,
                            "qty": mat_qty * yield_qty
                        })

    # 2. Check for negative stocks
    negatives = []
    for c in consumptions:
        pid = c["product_id"]
        name = c["name"]
        consuming_qty = c["qty"]
        
        # Fetch current stock in the specified warehouse
        try:
            inv = Inventory.objects.filter(productid_id=pid, warehouseid_id=wh_id).first()
            current_stock = inv.quantity if inv else 0.0
        except Exception:
            current_stock = 0.0
            
        # If updating an existing production run, we must add back the old consumption of this raw material in this run
        old_consumed = 0.0
        if existing_prod_id:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT quantity FROM StockTransaction 
                    WHERE referenceId = %s AND transactionType = 'CONSUMED' AND productId = %s
                """, (existing_prod_id, pid))
                row = cursor.fetchone()
                if row:
                    old_consumed = row[0] # Note: this is stored as negative, e.g. -5.0
        
        # Hypothetical new stock: current_stock - (old_consumed) - consuming_qty
        new_stock = current_stock - old_consumed - consuming_qty
        
        if new_stock < 0:
            negatives.append({
                "productId": pid,
                "name": name,
                "currentStock": current_stock - old_consumed,
                "consuming": consuming_qty,
                "deficit": abs(new_stock)
            })
            
    return negatives


@api_view(['GET', 'POST'])
def transaction_productions(request):
    from django.db import connection, transaction
    import uuid
    from django.utils import timezone
    
    if request.method == 'GET':
        with connection.cursor() as cursor:
            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS StockTransaction (
                    id TEXT PRIMARY KEY,
                    productId TEXT NOT NULL,
                    warehouseId INTEGER DEFAULT 1,
                    transactionType TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    referenceId TEXT,
                    reason TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(productId) REFERENCES Product(id)
                )
            """)
            cursor.execute("""
                SELECT st.id, st.productId, p.name as finishedProductName, st.warehouseId, w.name as warehouseName, st.quantity as quantityProduced, st.createdAt
                FROM StockTransaction st
                JOIN Product p ON st.productId = p.id
                LEFT JOIN Warehouse w ON st.warehouseId = w.id
                WHERE st.transactionType = 'PRODUCTION'
            """)
            desc = cursor.description
            col_names = [col[0] for col in desc]
            rows = [dict(zip(col_names, r)) for r in cursor.fetchall()]
            
            # Format dates to string
            for r in rows:
                if r['createdAt'] and not isinstance(r['createdAt'], str):
                    r['createdAt'] = r['createdAt'].isoformat() if hasattr(r['createdAt'], 'isoformat') else str(r['createdAt'])
                    
            return send_success(rows, "Productions fetched")
            
    elif request.method == 'POST':
        data = request.data.copy()
        prod_id = data.get('productId') or data.get('product_id')
        qty_produced = float(data.get('quantity') or data.get('quantity_produced') or 0)
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
            
        # Check negative raw materials
        negatives = check_negative_raw_materials(prod_id, qty_produced, wh_id, data.get('items'))
        if negatives:
            return Response({
                "success": False,
                "error_type": "NEGATIVE_RAW_MATERIALS",
                "message": "Some raw materials will go negative.",
                "data": negatives
            }, status=status.HTTP_400_BAD_REQUEST)
            
        with connection.cursor() as cursor:
            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS StockTransaction (
                    id TEXT PRIMARY KEY,
                    productId TEXT NOT NULL,
                    warehouseId INTEGER DEFAULT 1,
                    transactionType TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    referenceId TEXT,
                    reason TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(productId) REFERENCES Product(id)
                )
            """)
            st_id = 'st_' + uuid.uuid4().hex[:20]
            
            with transaction.atomic():
                custom_date = data.get('date')
                if custom_date:
                    if len(str(custom_date)) <= 10:
                        now_str = f"{custom_date} 12:00:00.000000"
                    else:
                        now_str = str(custom_date)
                else:
                    now_str = timezone.now().strftime('%Y-%m-%d %H:%M:%S.%f')

                cursor.execute("""
                    INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                    VALUES (%s, %s, %s, 'PRODUCTION', %s, 'PROD', %s)
                """, (st_id, prod_id, wh_id, qty_produced, now_str))
                recalculate_product_inventory(prod_id)
                
                # Deduct raw material consumption
                custom_items = data.get('items')
                if custom_items is not None and isinstance(custom_items, list):
                    for item in custom_items:
                        item_prod_id = item.get('productId') or item.get('product_id')
                        try:
                            item_qty = float(item.get('quantity') or item.get('qty') or 0)
                        except (ValueError, TypeError):
                            item_qty = 0.0
                        if item_prod_id and item_qty > 0:
                            cursor.execute("""
                                INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                                VALUES (%s, %s, %s, 'CONSUMED', %s, %s, %s)
                            """, ('st_' + uuid.uuid4().hex[:20], item_prod_id, wh_id, -item_qty, st_id, now_str))
                            recalculate_product_inventory(item_prod_id)
                else:
                    # Auto-deduct raw material consumption based on standard BOM
                    try:
                        cursor.execute("SELECT id FROM BOM WHERE productCode = (SELECT productCode FROM Product WHERE id = %s) OR name = (SELECT name FROM Product WHERE id = %s)", (prod_id, prod_id))
                        bom_row = cursor.fetchone()
                        if bom_row:
                            bom_id = bom_row[0]
                            cursor.execute("SELECT materialName, qty FROM BOMItem WHERE bomId = %s", (bom_id,))
                            bom_items = cursor.fetchall()
                            for mat_name, mat_qty in bom_items:
                                cursor.execute("SELECT id FROM Product WHERE name = %s", (mat_name,))
                                mat_row = cursor.fetchone()
                                if mat_row:
                                    mat_prod_id = mat_row[0]
                                    total_consumed = mat_qty * qty_produced
                                    cursor.execute("""
                                        INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                                        VALUES (%s, %s, %s, 'CONSUMED', %s, %s, %s)
                                    """, ('st_' + uuid.uuid4().hex[:20], mat_prod_id, wh_id, -total_consumed, st_id, now_str))
                                    recalculate_product_inventory(mat_prod_id)
                    except Exception as e:
                        print("Error processing BOM consumption:", e)
                    
        return send_success({"id": st_id, **data}, "Production recorded")


@api_view(['GET'])
def transaction_production_materials(request, pk):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT st.productId, p.name as productName, st.quantity, u.name as unit
            FROM StockTransaction st
            JOIN Product p ON st.productId = p.id
            LEFT JOIN Unit u ON p.unitId = u.id
            WHERE st.referenceId = %s AND st.transactionType = 'CONSUMED'
        """, (pk,))
        rows = cursor.fetchall()
        materials = []
        for r in rows:
            materials.append({
                "productId": r[0],
                "productName": r[1],
                "quantity": abs(r[2]),  # Convert negative stock deduction to positive for UI checklist
                "unit": r[3] or 'KG'
            })
            
    return send_success(materials, "Production materials fetched")


@api_view(['PUT', 'DELETE'])
def transaction_productions_detail(request, pk):
    from django.db import connection, transaction
    
    if request.method == 'PUT':
        data = request.data.copy()
        prod_id = data.get('productId') or data.get('product_id')
        qty_produced = float(data.get('quantity') or data.get('quantity_produced') or 0)
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
            
        # 1. Perform negative stock check
        negatives = check_negative_raw_materials(prod_id, qty_produced, wh_id, data.get('items'), pk)
        if negatives:
            return Response({
                "success": False,
                "error_type": "NEGATIVE_RAW_MATERIALS",
                "message": "Some raw materials will go negative.",
                "data": negatives
            }, status=status.HTTP_400_BAD_REQUEST)
            
        import uuid
        from django.utils import timezone
        
        with connection.cursor() as cursor:
            # Re-fetch all affected product IDs before update so we can recalculate
            cursor.execute("SELECT productId FROM StockTransaction WHERE id = %s OR referenceId = %s", (pk, pk))
            old_product_ids = set(r[0] for r in cursor.fetchall())
            
            with transaction.atomic():
                # Update main transaction
                cursor.execute("""
                    UPDATE StockTransaction 
                    SET productId = %s, warehouseId = %s, quantity = %s
                    WHERE id = %s
                """, (prod_id, wh_id, qty_produced, pk))
                
                # Delete old consumed transactions
                cursor.execute("DELETE FROM StockTransaction WHERE referenceId = %s AND transactionType = 'CONSUMED'", (pk,))
                
                # Insert new consumed transactions
                custom_date = data.get('date')
                if custom_date:
                    if len(str(custom_date)) <= 10:
                        now_str = f"{custom_date} 12:00:00.000000"
                    else:
                        now_str = str(custom_date)
                else:
                    now_str = timezone.now().strftime('%Y-%m-%d %H:%M:%S.%f')
                    
                new_product_ids = {prod_id}
                custom_items = data.get('items')
                if custom_items is not None and isinstance(custom_items, list):
                    for item in custom_items:
                        item_prod_id = item.get('productId') or item.get('product_id')
                        try:
                            item_qty = float(item.get('quantity') or item.get('qty') or 0)
                        except (ValueError, TypeError):
                            item_qty = 0.0
                        if item_prod_id and item_qty > 0:
                            cursor.execute("""
                                INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                                VALUES (%s, %s, %s, 'CONSUMED', %s, %s, %s)
                            """, ('st_' + uuid.uuid4().hex[:20], item_prod_id, wh_id, -item_qty, pk, now_str))
                            new_product_ids.add(item_prod_id)
                else:
                    # BOM auto-deduct
                    try:
                        cursor.execute("SELECT id FROM BOM WHERE productCode = (SELECT productCode FROM Product WHERE id = %s) OR name = (SELECT name FROM Product WHERE id = %s)", (prod_id, prod_id))
                        bom_row = cursor.fetchone()
                        if bom_row:
                            bom_id = bom_row[0]
                            cursor.execute("SELECT materialName, qty FROM BOMItem WHERE bomId = %s", (bom_id,))
                            bom_items = cursor.fetchall()
                            for mat_name, mat_qty in bom_items:
                                cursor.execute("SELECT id FROM Product WHERE name = %s", (mat_name,))
                                mat_row = cursor.fetchone()
                                if mat_row:
                                    mat_prod_id = mat_row[0]
                                    total_consumed = mat_qty * qty_produced
                                    cursor.execute("""
                                        INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                                        VALUES (%s, %s, %s, 'CONSUMED', %s, %s, %s)
                                    """, ('st_' + uuid.uuid4().hex[:20], mat_prod_id, wh_id, -total_consumed, pk, now_str))
                                    new_product_ids.add(mat_prod_id)
                    except Exception as e:
                        print("Error updating BOM consumption:", e)
                
                # Recalculate inventory for all involved products (old and new)
                for p_id in (old_product_ids | new_product_ids):
                    if p_id:
                        recalculate_product_inventory(p_id)
                        
        return send_success({"id": pk, **data}, "Production updated")
        
    elif request.method == 'DELETE':
        with connection.cursor() as cursor:
            # Select finished product and ingredients affected by this production run
            cursor.execute("SELECT productId FROM StockTransaction WHERE id = %s OR referenceId = %s", (pk, pk))
            rows = cursor.fetchall()
            if rows:
                product_ids = set(r[0] for r in rows)
                with transaction.atomic():
                    # Delete the production yield and all linked consumed raw materials
                    cursor.execute("DELETE FROM StockTransaction WHERE id = %s OR referenceId = %s", (pk, pk))
                    # Recalculate stock balance to restore items
                    for p_id in product_ids:
                        recalculate_product_inventory(p_id)
                        
        return send_success(None, "Production run deleted successfully")


@api_view(['GET', 'POST'])
def transaction_adjustments(request):
    from django.db import connection, transaction
    import uuid
    from django.utils import timezone
    
    if request.method == 'GET':
        with connection.cursor() as cursor:
            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS StockTransaction (
                    id TEXT PRIMARY KEY,
                    productId TEXT NOT NULL,
                    warehouseId INTEGER DEFAULT 1,
                    transactionType TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    referenceId TEXT,
                    reason TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(productId) REFERENCES Product(id)
                )
            """)
            cursor.execute("""
                SELECT st.id, st.productId, p.name as productName, st.warehouseId, w.name as warehouseName, st.quantity as quantityChange, st.reason, st.createdAt
                FROM StockTransaction st
                JOIN Product p ON st.productId = p.id
                LEFT JOIN Warehouse w ON st.warehouseId = w.id
                WHERE st.transactionType = 'ADJUSTMENT'
            """)
            desc = cursor.description
            col_names = [col[0] for col in desc]
            rows = [dict(zip(col_names, r)) for r in cursor.fetchall()]
            
            # Format dates to string
            for r in rows:
                if r['createdAt'] and not isinstance(r['createdAt'], str):
                    r['createdAt'] = r['createdAt'].isoformat() if hasattr(r['createdAt'], 'isoformat') else str(r['createdAt'])
                    
            return send_success(rows, "Adjustments fetched")
            
    elif request.method == 'POST':
        data = request.data.copy()
        prod_id = data.get('productId')
        qty_change = float(data.get('quantityChange') or 0)
        reason = data.get('reason') or ''
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
            
        with connection.cursor() as cursor:
            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS StockTransaction (
                    id TEXT PRIMARY KEY,
                    productId TEXT NOT NULL,
                    warehouseId INTEGER DEFAULT 1,
                    transactionType TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    referenceId TEXT,
                    reason TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(productId) REFERENCES Product(id)
                )
            """)
            st_id = 'st_' + uuid.uuid4().hex[:20]
            with transaction.atomic():
                cursor.execute("""
                    INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, reason, createdAt)
                    VALUES (%s, %s, %s, 'ADJUSTMENT', %s, %s, %s)
                """, (st_id, prod_id, wh_id, qty_change, reason, timezone.now()))
                recalculate_product_inventory(prod_id)
            
        return send_success({"id": st_id, **data}, "Adjustment recorded")


@api_view(['PUT', 'DELETE'])
def transaction_adjustments_detail(request, pk):
    from django.db import connection, transaction
    
    if request.method == 'PUT':
        return send_success({"id": pk, **request.data}, "Adjustment updated")
    elif request.method == 'DELETE':
        with connection.cursor() as cursor:
            # Get productId for recalculation before deletion
            cursor.execute("SELECT productId FROM StockTransaction WHERE id = %s", (pk,))
            row = cursor.fetchone()
            if row:
                prod_id = row[0]
                with transaction.atomic():
                    cursor.execute("DELETE FROM StockTransaction WHERE id = %s", (pk,))
                    recalculate_product_inventory(prod_id)
        return send_success(None, "Adjustment deleted")


@api_view(['GET', 'POST'])
def transaction_attendance(request):
    if request.method == 'GET':
        return send_success([], "Attendance fetched")
    elif request.method == 'POST':
        return send_success({"id": int(timezone.now().timestamp() * 1000), **request.data}, "Attendance recorded")


@api_view(['PUT', 'DELETE'])
def transaction_attendance_detail(request, pk):
    if request.method == 'PUT':
        return send_success({"id": pk, **request.data}, "Attendance updated")
    elif request.method == 'DELETE':
        return send_success(None, "Attendance deleted")


@api_view(['GET', 'POST'])
def transaction_returns(request):
    if request.method == 'GET':
        orders = Order.objects.filter(status='Returned').prefetch_related('orderitem_set__productid')
        serializer = OrderSerializer(orders, many=True)
        data = serializer.data
        for d in data:
            narration = d.get('narration') or ''
            d['type'] = 'Sales Return'
            d['challanNumber'] = (
                _extract_order_tag(narration, 'SALES RETURN BILL')
                or _extract_order_tag(narration, 'INVOICE')
                or _extract_order_tag(narration, 'CHALLAN')
            )
            d['netAmount'] = d.get('grandTotal') or 0.0
            d['returnDate'] = _extract_order_tag(narration, 'RETURN DATE')
            d['returnReason'] = _extract_order_tag(narration, 'RETURN REASON')
            d['vehicleNumber'] = _extract_order_tag(narration, 'RETURN VEHICLE') or _extract_order_tag(narration, 'VEHICLE')
        return send_success(data, "Returns fetched")

    data = request.data.copy()
    order_id = data.get('orderId') or data.get('order_id') or data.get('saleId') or data.get('sale_id')
    if not order_id:
        return send_error("Order id is required", 400)

    try:
        order = Order.objects.prefetch_related('orderitem_set').get(id=order_id)
    except Order.DoesNotExist:
        try:
            order = Order.objects.prefetch_related('orderitem_set').get(orderid=order_id)
        except Order.DoesNotExist:
            return send_error("Sale order not found", 404)

    vehicle_number = str(data.get('vehicleNumber') or data.get('vehicle_number') or '').strip().upper()
    bill_number = data.get('salesReturnBillNumber') or data.get('sales_return_bill_number')
    return_date = data.get('returnDate') or data.get('return_date')
    return_reason = data.get('returnReason') or data.get('return_reason')

    missing = []
    for label, value in [
        ('Vehicle Number', vehicle_number),
        ('Sales Return Bill Number', bill_number),
        ('Return Date', return_date),
        ('Return Reason', return_reason),
    ]:
        if not value:
            missing.append(label)
    if missing:
        return send_error(f"Missing required fields: {', '.join(missing)}", 400)

    from django.utils import timezone
    order.status = 'Returned'
    order.narration = _append_order_tags(order.narration, {
        'RETURN VEHICLE': vehicle_number,
        'SALES RETURN BILL': bill_number,
        'RETURN DATE': return_date,
        'RETURN REASON': return_reason,
        'RETURN TIME': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
    })
    order.updatedat = timezone.now()
    order.save()

    for item in order.orderitem_set.all():
        if item.productid_id:
            recalculate_product_inventory(item.productid_id)

    serializer = OrderSerializer(order)
    return send_success(serializer.data, "Sales return recorded successfully")


@api_view(['GET', 'POST'])
def transaction_purchase_orders(request):
    from api.models import Purchaseorder, Purchaseorderitem
    from api.serializers import PurchaseorderSerializer
    from django.utils import timezone
    import uuid

    if request.method == 'GET':
        orders = Purchaseorder.objects.all().prefetch_related('purchaseorderitem_set')
        serializer = PurchaseorderSerializer(orders, many=True)
        return send_success(serializer.data, "Purchase orders fetched")

    elif request.method == 'POST':
        data = request.data.copy()
        now = timezone.now()

        company_id = getattr(request.user, 'companyId', None) or 'cmo75yliq0000wesurjpett1n'
        data['companyId'] = company_id

        po_count = Purchaseorder.objects.count() + 1
        po_num = f"PO-{now.year}-{po_count:05d}"
        
        po_id = 'po_' + uuid.uuid4().hex[:20]
        
        supplier_id = data.get('supplier_id')
        warehouse_id = data.get('warehouse_id')
        expected_date = data.get('expected_date')
        remarks = data.get('remarks')
        status = data.get('status') or 'Pending'
        
        items_data = data.get('items', [])
        net_amount = 0.0
        total_tax = 0.0
        
        for it in items_data:
            qty = float(it.get('quantity') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            
            line_total = qty * rate * (1 + tax_p / 100)
            net_amount += line_total
            total_tax += (qty * rate * tax_p / 100)

        po_obj = Purchaseorder.objects.create(
            id=po_id,
            ponumber=po_num,
            date=now,
            expecteddate=expected_date or None,
            supplierid_id=supplier_id,
            warehouseid=warehouse_id or None,
            netamount=net_amount,
            totaltax=total_tax,
            status=status,
            remarks=remarks,
            companyid_id=company_id,
            createdat=now,
            updatedat=now
        )

        for it in items_data:
            item_id = 'poi_' + uuid.uuid4().hex[:19]
            qty = int(it.get('quantity') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            line_total = qty * rate * (1 + tax_p / 100)
            
            Purchaseorderitem.objects.create(
                id=item_id,
                purchaseorderid=po_obj,
                productid_id=it.get('product_id'),
                productname=it.get('product_name') or '',
                quantity=qty,
                rate=rate,
                tax_percent=tax_p,
                linetotal=line_total,
                remark=it.get('remark')
            )

        serializer = PurchaseorderSerializer(po_obj)
        return send_success(serializer.data, "Purchase order created successfully", 201)


@api_view(['GET'])
def transaction_purchase_order_items(request, pk):
    from api.models import Purchaseorderitem
    from api.serializers import PurchaseorderitemSerializer
    items = Purchaseorderitem.objects.filter(purchaseorderid_id=pk)
    serializer = PurchaseorderitemSerializer(items, many=True)
    return send_success(serializer.data, "Purchase order items fetched")


@api_view(['GET', 'PUT', 'DELETE'])
def transaction_purchase_order_detail(request, pk):
    from api.models import Purchaseorder, Purchaseorderitem
    from api.serializers import PurchaseorderSerializer
    from django.utils import timezone
    from django.db import transaction
    import uuid

    try:
        po_obj = Purchaseorder.objects.get(id=pk)
    except Purchaseorder.DoesNotExist:
        return send_error("Purchase order not found", 404)

    if request.method == 'GET':
        serializer = PurchaseorderSerializer(po_obj)
        return send_success(serializer.data, "Purchase order fetched")

    elif request.method == 'PUT':
        data = request.data.copy()
        now = timezone.now()

        # Support direct status update (like Cancelled) or full edit
        if 'status' in data and len(data) == 1:
            po_obj.status = data.get('status')
            po_obj.updatedat = now
            po_obj.save()
            serializer = PurchaseorderSerializer(po_obj)
            return send_success(serializer.data, "Purchase order status updated successfully")

        # Full edit
        supplier_id = data.get('supplier_id') or data.get('supplierId') or po_obj.supplierid_id
        warehouse_id = data.get('warehouse_id') or data.get('warehouseId') or po_obj.warehouseid
        expected_date = data.get('expected_date') or data.get('expectedDate') or po_obj.expecteddate
        remarks = data.get('remarks') or po_obj.remarks
        status = data.get('status') or po_obj.status

        items_data = data.get('items', [])
        net_amount = 0.0
        total_tax = 0.0

        for it in items_data:
            qty = float(it.get('quantity') or it.get('qty') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            
            line_total = qty * rate * (1 + tax_p / 100)
            net_amount += line_total
            total_tax += (qty * rate * tax_p / 100)

        with transaction.atomic():
            po_obj.supplierid_id = supplier_id
            po_obj.warehouseid = warehouse_id
            po_obj.expecteddate = expected_date or None
            po_obj.netamount = net_amount
            po_obj.totaltax = total_tax
            po_obj.status = status
            po_obj.remarks = remarks
            po_obj.updatedat = now
            po_obj.save()

            # Delete existing items and recreate
            Purchaseorderitem.objects.filter(purchaseorderid=po_obj).delete()

            for it in items_data:
                item_id = 'poi_' + uuid.uuid4().hex[:19]
                qty = int(it.get('quantity') or it.get('qty') or 0)
                rate = float(it.get('rate') or 0)
                tax_p = float(it.get('tax_percent') or 0)
                line_total = qty * rate * (1 + tax_p / 100)
                
                Purchaseorderitem.objects.create(
                    id=item_id,
                    purchaseorderid=po_obj,
                    productid_id=it.get('product_id') or it.get('productId'),
                    productname=it.get('product_name') or it.get('productName') or '',
                    quantity=qty,
                    rate=rate,
                    tax_percent=tax_p,
                    linetotal=line_total,
                    remark=it.get('remark')
                )

        serializer = PurchaseorderSerializer(po_obj)
        return send_success(serializer.data, "Purchase order updated successfully")

    elif request.method == 'DELETE':
        with transaction.atomic():
            Purchaseorderitem.objects.filter(purchaseorderid=po_obj).delete()
            po_obj.delete()
        return send_success(None, "Purchase order deleted successfully")



# ----------------------------------------------------
# 10. SYSTEM HEALTH & TELEMETRY
# ----------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def system_health(request):
    db_status = "unhealthy"
    try:
        # Check SQLite db connection health
        User.objects.count()
        db_status = "healthy"
    except Exception:
        pass
        
    health_data = {
        "status": "ok",
        "database": db_status,
        "uptime": timezone.now().timestamp(), # Simple timestamp mock for process uptime
        "time": timezone.now().isoformat()
    }
    return send_success(health_data, "System Healthy")


@api_view(['GET'])
def system_metrics(request):
    # Performance telemetry metrics mock
    metrics_data = {
        "requestCount": 154,
        "averageLatencyMs": 42,
        "errorRate": 0.0,
        "cpuUsagePercent": 1.2,
        "memoryUsageMb": 48.5
    }
    return send_success(metrics_data, "Current Performance Metrics")


# ----------------------------------------------------
# 11. CRM & LEAD MANAGEMENT LAYER
# ----------------------------------------------------

from api.models import Lead, LeadFollowUp, LeadStageHistory
from api.serializers import LeadSerializer, LeadFollowUpSerializer, LeadStageHistorySerializer
from api.permissions import IsLeadOwnerOrAdmin
from api.services.lead_pipeline_service import LeadPipelineService
from api.services.cache_keys import CRMCacheKeys
from django.db import IntegrityError, transaction
from rest_framework.throttling import UserRateThrottle
from decimal import Decimal
import uuid

class LeadConversionThrottle(UserRateThrottle):
    rate = '1000/hour'

class LeadFollowUpThrottle(UserRateThrottle):
    rate = '10000/hour'

class LeadDashboardThrottle(UserRateThrottle):
    rate = '1000/min'

class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsLeadOwnerOrAdmin]
    serializer_class = LeadSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        
        # Scoped to active manager (Soft deleted leads excluded automatically)
        qs = Lead.objects.filter(companyid_id=company_id) if company_id else Lead.objects.all()
        
        # Scalable RBAC check: Sales Officers and Executives are restricted to their own assigned leads.
        # HR, Admin, Super Admin, and other non-sales roles bypass this check to view and analyze all company records.
        SALES_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER']
        if user_role in SALES_ROLES:
            qs = qs.filter(assigned_to_id=self.request.user.userId)

        # Manual search/filtering to keep viewset light and consistent
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(name__icontains=search) |
                models.Q(company_name__icontains=search) |
                models.Q(phone__icontains=search) |
                models.Q(email__icontains=search)
            )
            
        # Select_related & Prefetch_related query optimization
        return qs.select_related('assigned_to', 'created_by', 'companyid').prefetch_related('followups', 'stage_history')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = _fy_date_filter(request, queryset, date_field='createdat')
        serializer = self.get_serializer(queryset, many=True)
        return send_success(serializer.data, "Leads fetched successfully")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return send_success(serializer.data, "Lead retrieved successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        
        data['id'] = 'c' + uuid.uuid4().hex[:23]
        serializer = LeadSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        try:
            serializer.save(created_by_id=request.user.userId)
        except IntegrityError:
            return send_error("An active lead with this email or phone number already exists in your company records.", 409)
        
        return send_success(serializer.data, "Lead created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        old_status = instance.status
        new_status = request.data.get('status') or old_status
        
        # Concurrency check: optimistic version lock check
        client_version = request.data.get('version')
        if client_version is not None:
            try:
                client_version = int(client_version)
            except (ValueError, TypeError):
                return send_error("Invalid version payload", 400)
        else:
            client_version = instance.version

        # 1. Pipeline State Transition Verification inside dedicated service
        if old_status != new_status:
            success, detail = LeadPipelineService.transition_lead(instance, new_status, request.user.userId, client_version)
            if not success:
                if detail == "STALE_WRITE":
                    latest = Lead.all_objects.select_related('updated_by').get(pk=instance.pk)
                    return Response({
                        "success": False,
                        "errorCode": "STALE_WRITE",
                        "message": "Lead was modified by another user.",
                        "latestVersion": latest.version,
                        "updatedAt": latest.updatedat.isoformat() if latest.updatedat else None,
                        "updatedBy": latest.updated_by.name if latest.updated_by else "System"
                    }, status=status.HTTP_409_CONFLICT)
                return send_error(detail, 400)
            
            instance.refresh_from_db()
            client_version = instance.version

        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId

        # Normalize currency value decimal precision
        if 'value' in data:
            data['value'] = LeadPipelineService.quantize_decimal(data['value'])

        from django.db.models import F
        try:
            with transaction.atomic():
                serializer = LeadSerializer(instance, data=data, partial=partial)
                serializer.is_valid(raise_exception=True)
                
                # Double Concurrency check: atomically increment version column
                updated = Lead.objects.filter(pk=instance.pk, version=client_version).update(
                    name=serializer.validated_data.get('name', instance.name),
                    company_name=serializer.validated_data.get('company_name', instance.company_name),
                    email=serializer.validated_data.get('email', instance.email),
                    phone=serializer.validated_data.get('phone', instance.phone),
                    priority=serializer.validated_data.get('priority', instance.priority),
                    source=serializer.validated_data.get('source', instance.source),
                    city=serializer.validated_data.get('city', instance.city),
                    state=serializer.validated_data.get('state', instance.state),
                    pincode=serializer.validated_data.get('pincode', instance.pincode),
                    value=serializer.validated_data.get('value', instance.value),
                    notes=serializer.validated_data.get('notes', instance.notes),
                    assigned_to_id=serializer.validated_data.get('assigned_to_id', instance.assigned_to_id),
                    updated_by_id=request.user.userId,
                    updatedat=timezone.now(),
                    version=F('version') + 1
                )
                
                if updated == 0:
                    latest = Lead.all_objects.select_related('updated_by').get(pk=instance.pk)
                    return Response({
                        "success": False,
                        "errorCode": "STALE_WRITE",
                        "message": "Lead was modified by another user.",
                        "latestVersion": latest.version,
                        "updatedAt": latest.updatedat.isoformat() if latest.updatedat else None,
                        "updatedBy": latest.updated_by.name if latest.updated_by else "System"
                    }, status=status.HTTP_409_CONFLICT)
        except IntegrityError:
            return send_error("An active lead with this email or phone number already exists in your company records.", 409)
            
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return send_success(serializer.data, "Lead updated successfully")

    def destroy(self, request, *args, **kwargs):
        # Enforce soft deletion
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return send_success(None, "Lead archived successfully")

    @action(detail=True, methods=['patch'], url_path='move')
    def move_stage(self, request, pk=None):
        """Lightweight API endpoint optimized for frontend Kanban drag & drop transitions"""
        instance = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return send_error("Status field is required", 400)

        client_version = request.data.get('version')
        if client_version is not None:
            try:
                client_version = int(client_version)
            except (ValueError, TypeError):
                return send_error("Invalid version payload", 400)
        else:
            client_version = instance.version

        success, detail = LeadPipelineService.transition_lead(instance, new_status, request.user.userId, client_version)
        if not success:
            if detail == "STALE_WRITE":
                latest = Lead.all_objects.select_related('updated_by').get(pk=instance.pk)
                return Response({
                    "success": False,
                    "errorCode": "STALE_WRITE",
                    "message": "Lead was modified by another user.",
                    "latestVersion": latest.version,
                    "updatedAt": latest.updatedat.isoformat() if latest.updatedat else None,
                    "updatedBy": latest.updated_by.name if latest.updated_by else "System"
                }, status=status.HTTP_409_CONFLICT)
            return send_error(detail, 400)

        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return send_success(serializer.data, "Lead stage updated successfully")

    @action(detail=True, methods=['post'], url_path='followup', throttle_classes=[LeadFollowUpThrottle])
    def add_followup(self, request, pk=None):
        lead = self.get_object()
        data = request.data.copy()
        data['id'] = 'f' + uuid.uuid4().hex[:23]
        data['leadId'] = lead.id
        
        serializer = LeadFollowUpSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by_id=request.user.userId)
        
        # Invalidate lead version/touch changes
        from django.db.models import F
        Lead.objects.filter(pk=lead.id).update(
            updatedat=timezone.now(),
            version=F('version') + 1
        )
        lead.refresh_from_db()
        
        return send_success(serializer.data, "Follow-up logged successfully", 201)

    @action(detail=True, methods=['post'], url_path='convert', throttle_classes=[LeadConversionThrottle])
    def convert_to_dealer(self, request, pk=None):
        from api.models import Dealer
        
        # Concurrency updating lock: prevent duplicate hits/race conditions
        # DEV NOTE (SQLite Caveat): SQLite ignores row row-level select_for_update() locks.
        # Local SQLite relies on optimistic locking (version column & atomic updates) to preserve integrity.
        # Production PostgreSQL will enforce full pessimistic select_for_update() + optimistic locking protection.
        with transaction.atomic():
            lead = Lead.all_objects.select_related('assigned_to', 'companyid').select_for_update().get(pk=pk)
            
            # Strict validation checks
            if lead.status == 'WON' or Dealer.objects.filter(converted_lead=lead).exists():
                return send_error("Lead has already been converted to a dealer", 400)
            if lead.status == 'LOST':
                return send_error("A lost lead cannot be converted to a dealer", 400)
            if not lead.phone:
                return send_error("Lead phone number is required for dealer creation", 400)
            if not lead.company_name and not lead.name:
                return send_error("Company name or contact name is required", 400)
            if not lead.assigned_to_id:
                return send_error("Lead must have an assigned sales manager before converting", 400)
            
            # Scoped locking check to prevent cross-company dealer duplicate creations
            existing_dealer = Dealer.objects.select_for_update().filter(
                companyid=lead.companyid,
                dealername=lead.company_name or lead.name
            ).first()
            if existing_dealer:
                return send_error(f"A dealer named '{existing_dealer.dealername}' already exists in your company records.", 400)

            dealer_id = 'c' + uuid.uuid4().hex[:23]
            
            # Map lead fields directly to Dealer model business rules utilizing safe Decimal formatting
            dealer = Dealer.objects.create(
                id=dealer_id,
                dealercode=f"DLR-{uuid.uuid4().hex[:6].upper()}",
                dealername=lead.company_name or lead.name,
                city="Default City",
                assignedsoemail=lead.assigned_to.email,
                distributorname="Select Distributor",
                creditlimit=LeadPipelineService.quantize_decimal(50000.00),
                outstanding=LeadPipelineService.quantize_decimal(0.00),
                active=True,
                companyid=lead.companyid,
                converted_lead=lead
            )
            
            # Audit status change
            old_status = lead.status
            
            # Update Lead to WON status and increment version column
            lead.status = 'WON'
            lead.updated_by_id = request.user.userId
            lead.updatedat = timezone.now()
            lead.version += 1
            lead.save()
            
            # Stage History tracking
            LeadStageHistory.objects.create(
                id='h' + uuid.uuid4().hex[:23],
                lead=lead,
                old_status=old_status,
                new_status='WON',
                changed_by_id=request.user.userId
            )
            
            # Add conversion log to FollowUps
            LeadFollowUp.objects.create(
                id='f' + uuid.uuid4().hex[:23],
                lead=lead,
                type='MEETING',
                notes=f"Converted lead to active Dealer record: {dealer.dealername} ({dealer.dealercode}).",
                created_by_id=request.user.userId
            )
            
        return send_success({
            "leadId": lead.id,
            "dealerId": dealer.id,
            "dealerCode": dealer.dealercode
        }, "Lead converted to active Dealer successfully")

    @action(detail=False, methods=['get'], url_path='dashboard', throttle_classes=[LeadDashboardThrottle])
    def get_dashboard_metrics(self, request):
        from django.db.models import Sum, Count
        from django.core.cache import cache
        company_id = self.request.user.companyId
        
        # Cache Strategy: Check cached aggregates first
        cache_key = CRMCacheKeys.dashboard(company_id)
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return send_success(cached_stats, "CRM dashboard metrics retrieved from cache")

        # Scoped queryset
        leads = Lead.objects.filter(companyid_id=company_id) if company_id else Lead.objects.all()
        
        # Scoped aggregations with explicit ordering to protect aggregate scans
        metrics = leads.order_by('-updatedat').aggregate(
            total_leads=Count('id'),
            won_leads=Count('id', filter=models.Q(status='WON')),
            pipeline_value=Sum('value', filter=models.Q(status__in=['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION'])),
            high_priority=Count('id', filter=models.Q(priority='HIGH'))
        )
        
        # Scoped, optimized query for overdue follow-ups count using select_related
        overdue_followups = LeadFollowUp.objects.select_related('lead').filter(
            lead__companyid_id=company_id,
            next_followup_date__lt=timezone.now()
        ).count() if company_id else LeadFollowUp.objects.select_related('lead').filter(next_followup_date__lt=timezone.now()).count()
        
        stats = {
            "totalLeads": metrics['total_leads'] or 0,
            "wonLeads": metrics['won_leads'] or 0,
            "pipelineValue": float(metrics['pipeline_value'] or 0.0),
            "highPriority": metrics['high_priority'] or 0,
            "overdueFollowups": overdue_followups
        }
        
        # Cache stats with 5 minutes (300 seconds) TTL
        cache.set(cache_key, stats, timeout=300)
        
        return send_success(stats, "CRM analytics dashboard stats computed successfully")


@api_view(['GET'])
def trigger_analytics_etl(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from api.services.analytics_etl import compile_analytical_warehouse
        company_id = request.user.companyId
        compile_analytical_warehouse(company_id)
        return send_success(None, "Analytical Star Schema compiled successfully")
    except Exception as e:
        return Response({"success": False, "message": f"ETL compilation failed: {str(e)}"}, status=500)


@api_view(['GET'])
def get_analytics_kpis(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from api.services.semantic_metrics import get_governed_kpis
        company_id = request.user.companyId
        kpis = get_governed_kpis(company_id)
        return send_success(kpis, "Governed KPIs retrieved successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to compute KPIs: {str(e)}"}, status=500)


@api_view(['GET'])
def get_analytics_predictions(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from api.services.predictions import get_predictions_dashboard
        company_id = request.user.companyId
        data = get_predictions_dashboard(company_id)
        return send_success(data, "Predictive forecasts computed successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to calculate forecasts: {str(e)}"}, status=500)


@api_view(['GET'])
def get_analytics_alerts(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from django.db import connection
        company_id = request.user.companyId
        
        alerts = []
        with connection.cursor() as cursor:
            # Query open or acknowledged alerts, sorted by severity hierarchy: CRITICAL -> WARNING -> INFO
            cursor.execute("""
                SELECT id, type, severity, entity_type, entity_id, metric_value, threshold, 
                       status, assigned_to, created_at, resolved_at, resolution_note 
                FROM AnalyticsAlert
                WHERE status IN ('Open', 'Acknowledged')
                ORDER BY 
                  CASE severity 
                    WHEN 'CRITICAL' THEN 1 
                    WHEN 'WARNING' THEN 2 
                    ELSE 3 
                  END ASC,
                  created_at DESC
            """)
            rows = cursor.fetchall()
            
            for r in rows:
                alerts.append({
                    "id": r[0],
                    "type": r[1],
                    "severity": r[2],
                    "entity_type": r[3],
                    "entity_id": r[4],
                    "metric_value": r[5],
                    "threshold": r[6],
                    "status": r[7],
                    "assigned_to": r[8],
                    "created_at": r[9],
                    "resolved_at": r[10],
                    "resolution_note": r[11]
                })
                
        return send_success(alerts, "Exception alerts retrieved successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to retrieve alerts: {str(e)}"}, status=500)


@api_view(['POST'])
def action_analytics_alert(request, pk):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    status = request.data.get('status')
    note = request.data.get('resolution_note') or ''
    
    if status not in ['Open', 'Acknowledged', 'Resolved']:
        return Response({"success": False, "message": "Invalid alert status"}, status=400)
        
    try:
        from django.db import connection
        today_str = datetime.date.today().strftime('%Y-%m-%d')
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM AnalyticsAlert WHERE id = %s", (pk,))
            if not cursor.fetchone():
                return Response({"success": False, "message": "Alert not found"}, status=404)
                
            if status == 'Resolved':
                cursor.execute("""
                    UPDATE AnalyticsAlert 
                    SET status = %s, resolved_at = %s, resolution_note = %s
                    WHERE id = %s
                """, (status, today_str, note, pk))
            else:
                cursor.execute("""
                    UPDATE AnalyticsAlert 
                    SET status = %s, resolution_note = %s
                    WHERE id = %s
                """, (status, note, pk))
                
        return send_success(None, "Operational alert updated successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to update alert: {str(e)}"}, status=500)


@api_view(['GET'])
def get_analytics_cfo_liquidity(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from api.services.cfo_liquidity import get_cfo_liquidity_dashboard
        company_id = request.user.companyId
        data = get_cfo_liquidity_dashboard(company_id)
        return send_success(data, "CFO liquidity metrics computed successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to compute CFO metrics: {str(e)}"}, status=500)


@api_view(['GET'])
def get_analytics_bottlenecks(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from api.services.bottlenecks import get_operational_bottlenecks
        company_id = request.user.companyId
        data = get_operational_bottlenecks(company_id)
        return send_success(data, "Process bottleneck analysis computed successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to compute bottleneck metrics: {str(e)}"}, status=500)


@api_view(['GET'])
def get_analytics_data_quality(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({"success": False, "message": "Forbidden: Admin or SuperAdmin access only"}, status=403)
        
    try:
        from api.services.data_quality import get_data_quality_report
        company_id = request.user.companyId
        data = get_data_quality_report(company_id)
        return send_success(data, "Data quality metrics compiled successfully")
    except Exception as e:
        return Response({"success": False, "message": f"Failed to compile data quality: {str(e)}"}, status=500)



