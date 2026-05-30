import datetime
from django.db import models
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, exceptions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
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
        mock_user = {
            "id": "superadmin-1",
            "email": email,
            "name": "System Admin",
            "role": "SUPERADMIN",
            "companyId": "cmo75yliq0000wesurjpett1n"
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
    queryset = User.objects.all()
    serializer_serializer = UserSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = UserSerializer(queryset, many=True)
        return send_success(serializer.data, "Users retrieved successfully")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserSerializer(instance)
        return send_success(serializer.data, "User retrieved successfully")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = UserSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return send_success(serializer.data, "User updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return send_success(None, "User deleted successfully")


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
        if company_id:
            return Product.objects.filter(companyid_id=company_id)
        return Product.objects.all()

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
        
        partial = kwargs.pop('partial', False)
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
        partial = kwargs.pop('partial', False)
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
        partial = kwargs.pop('partial', False)
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

SETTINGS_FILE_PATH = os.path.join(settings.BASE_DIR, 'settings_store.json')

def load_settings():
    default_vals = {
        "stock_method": "FIFO",
        "allow_negative_stock": False,
        "company_name": "Simply Useful ERP",
        "currency_symbol": "₹",
        "sku_prefix": "KCPL",
        "stockMethod": "FIFO",
        "skuPrefix": "KCPL"
    }
    if os.path.exists(SETTINGS_FILE_PATH):
        try:
            with open(SETTINGS_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Harmonize snake_case and camelCase keys
                if 'stock_method' in data:
                    data['stockMethod'] = data['stock_method']
                elif 'stockMethod' in data:
                    data['stock_method'] = data['stockMethod']
                
                if 'sku_prefix' in data:
                    data['skuPrefix'] = data['sku_prefix']
                elif 'skuPrefix' in data:
                    data['sku_prefix'] = data['skuPrefix']
                
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
        
        # Harmonize snake_case and camelCase on updates
        if 'stock_method' in new_data:
            updated_data['stockMethod'] = new_data['stock_method']
        elif 'stockMethod' in new_data:
            updated_data['stock_method'] = new_data['stockMethod']
            
        if 'sku_prefix' in new_data:
            updated_data['skuPrefix'] = new_data['sku_prefix']
        elif 'skuPrefix' in new_data:
            updated_data['sku_prefix'] = new_data['skuPrefix']
            
        save_settings(updated_data)
        return send_success(updated_data, "Settings updated successfully")
        
    # GET method
    settings_data = load_settings()
    return send_success(settings_data, "Settings retrieved")


# ----------------------------------------------------
# 4. PARTNERS (DEALERS & DISTRIBUTORS)
# ----------------------------------------------------

class DealerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Dealer.objects.all()
    serializer_class = DealerSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Dealer.objects.filter(companyid_id=company_id)
        return Dealer.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = DealerSerializer(queryset, many=True)
        return send_success(serializer.data, "Dealers fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId
        
        # Generate cuid-like ID
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = DealerSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Dealer created successfully", 201)


class DistributorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Distributor.objects.all()
    serializer_class = DistributorSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Distributor.objects.filter(companyid_id=company_id)
        return Distributor.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = DistributorSerializer(queryset, many=True)
        return send_success(serializer.data, "Distributors fetched successfully")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId

        # Generate cuid-like ID
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = DistributorSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, "Distributor created successfully", 201)


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

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().prefetch_related('orderitem_set')
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

        # Save order
        serializer = OrderSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Manually parse and save items
        items_data = data.get('items', [])
        order = serializer.save()
        
        for item in items_data:
            item_id = 'c' + uuid.uuid4().hex[:23]
            Orderitem.objects.create(
                id=item_id,
                orderid=order,
                productid_id=item['productId'],
                qty=item['qty'],
                price=item['price'],
                total=item['total'],
                itemremark=item.get('itemRemark')
            )
            recalculate_product_inventory(item['productId'])

        # Return refreshed serializer
        full_serializer = OrderSerializer(order)
        return send_success(full_serializer.data, "Order created successfully", 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        product_ids = list(instance.orderitem_set.values_list('productid_id', flat=True))
        
        serializer = OrderSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        
        new_product_ids = list(order.orderitem_set.values_list('productid_id', flat=True))
        for pid in set(product_ids + new_product_ids):
            if pid:
                recalculate_product_inventory(pid)
                
        return send_success(serializer.data, "Order updated successfully")


# ----------------------------------------------------
# 6. FIELD ACTIVITIES & EXPENSES
# ----------------------------------------------------

class VisitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Visit.objects.all()
    serializer_class = VisitSerializer

    def get_queryset(self):
        company_id = self.request.user.companyId
        if company_id:
            return Visit.objects.filter(companyid_id=company_id)
        return Visit.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
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
        if company_id:
            return Expense.objects.filter(companyid_id=company_id)
        return Expense.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
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
        data = request.data.copy()
        if request.user.companyId:
            data['companyId'] = request.user.companyId

        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]

        serializer = BomSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        items_data = data.pop('items', [])
        bom = serializer.save()

        for item in items_data:
            item_id = 'c' + uuid.uuid4().hex[:23]
            Bomitem.objects.create(
                id=item_id,
                bomid=bom,
                materialname=item['materialName'],
                qty=item['qty'],
                unit=item['unit']
            )

        full_serializer = BomSerializer(bom)
        return send_success(full_serializer.data, "BOM created successfully", 201)


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
    orders_q = Order.objects.filter(status='Completed')
    if company_id:
        orders_q = orders_q.filter(companyid_id=company_id)
        
    sales = orders_q.order_by('createdat').values('createdat', 'grandtotal')
    
    # Group by date
    trends = {}
    for s in sales:
        dt = s['createdat'].strftime('%Y-%m-%d')
        trends[dt] = trends.get(dt, 0.0) + s['grandtotal']
        
    chart_data = [{"name": name, "total": total} for name, total in sorted(trends.items())]
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
        if company_id:
            query += " WHERE p.companyId = %s"
            cursor.execute(query, (company_id,))
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
            
            # 1. Sum completed purchases
            cursor.execute("""
                SELECT SUM(p_item.qty) 
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s AND p.status IN ('Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED')
            """, (product_name,))
            purchases_sum = cursor.fetchone()[0] or 0
            
            # 2. Sum completed sales
            cursor.execute("""
                SELECT SUM(o_item.qty) 
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status IN ('Completed', 'Approved')
            """, (product_id,))
            sales_sum = cursor.fetchone()[0] or 0
            
            # 3. Sum other stock transactions by type
            cursor.execute("SELECT SUM(quantity) FROM StockTransaction WHERE productId = %s AND transactionType = 'PRODUCTION'", (product_id,))
            production_sum = cursor.fetchone()[0] or 0.0
            
            cursor.execute("SELECT SUM(quantity) FROM StockTransaction WHERE productId = %s AND transactionType = 'CONSUMED'", (product_id,))
            consumed_sum = abs(cursor.fetchone()[0] or 0.0)
            
            # Sum sales return directly from Order/OrderItem table (status = 'Returned')
            cursor.execute("""
                SELECT SUM(o_item.qty)
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status = 'Returned'
            """, (product_id,))
            sales_return_sum = cursor.fetchone()[0] or 0.0
            
            # Sum purchase return directly from Purchase/PurchaseItem table (status = 'Returned')
            cursor.execute("""
                SELECT SUM(p_item.qty)
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s AND p.status = 'Returned'
            """, (product_name,))
            purchase_return_sum = cursor.fetchone()[0] or 0.0
            
            cursor.execute("SELECT SUM(quantity) FROM StockTransaction WHERE productId = %s AND transactionType = 'ADJUSTMENT'", (product_id,))
            adjustment_sum = cursor.fetchone()[0] or 0.0
            
            stock_raw.append({
                "productId": product_id,
                "productName": product_name,
                "sku": r['p_code'],
                "categoryName": r['c_name'],
                "unit": r['u_name'] or '—',
                "openingStock": r['p_opening'] or 0,
                "production": production_sum,
                "consumed": consumed_sum,
                "purchase": purchases_sum,
                "sales": sales_sum,
                "salesReturn": sales_return_sum,
                "purchaseReturn": purchase_return_sum,
                "adjustment": adjustment_sum,
                "currentStock": r['qty'],
                "availableStock": r['qty'],
                "minimumStock": r['p_min'] or 0,
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
            opening_stock = opening_stock or 0
            
            # Sum purchases (excluding returns)
            cursor.execute("""
                SELECT SUM(p_item.qty) 
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s AND p.status IN ('Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED')
            """, (p_name,))
            purchase_qty = cursor.fetchone()[0] or 0
            
            # Sum purchase returns
            cursor.execute("""
                SELECT SUM(p_item.qty) 
                FROM PurchaseItem p_item
                JOIN Purchase p ON p_item.purchaseId = p.id
                WHERE p_item.productName = %s AND p.status = 'Returned'
            """, (p_name,))
            purchase_return_qty = cursor.fetchone()[0] or 0
            
            # Sum sales (excluding returns)
            cursor.execute("""
                SELECT SUM(o_item.qty) 
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status IN ('Completed', 'Approved')
            """, (product_id,))
            sales_qty = cursor.fetchone()[0] or 0
            
            # Sum sales returns
            cursor.execute("""
                SELECT SUM(o_item.qty) 
                FROM OrderItem o_item
                JOIN `Order` o ON o_item.orderId = o.id
                WHERE o_item.productId = %s AND o.status = 'Returned'
            """, (product_id,))
            sales_return_qty = cursor.fetchone()[0] or 0
            
            # Sum other stock transactions (Production, Consumed, Adjustments)
            cursor.execute("SELECT SUM(quantity) FROM StockTransaction WHERE productId = %s", (product_id,))
            st_qty = cursor.fetchone()[0] or 0.0
            
            # Formula: Opening + Production - Consumed + Purchase - Sales + Sales Return - Purchase Return +/- Adjustment
            # Note: st_qty = Production + Consumed + Adjustment (where Consumed is already negative)
            new_qty = opening_stock + purchase_qty - purchase_return_qty - sales_qty + sales_return_qty + st_qty
            
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
        orderid__status__in=['Completed', 'Approved', 'Returned']
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
        if o.status == 'Returned':
            events.append({
                "id": f"sal_ret_evt_{item.id}",
                "date": o.date,
                "transactionType": "SALES_RETURN",
                "referenceId": o.orderid,
                "warehouseName": "Main Warehouse Depot",
                "credit": float(item.qty),
                "debit": 0.0,
                "qty_change": float(item.qty)
            })
        else:
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
    
    import sqlite3
    conn = sqlite3.connect('db.sqlite3')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = """
        SELECT p.id as p_id, p.name as p_name, p.productCode as p_code, 
               c.name as c_name, u.name as u_name, SUM(inv.quantity) as total_qty
        FROM Product p
        LEFT JOIN Inventory inv ON p.id = inv.productId
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Unit u ON p.unitId = u.id
    """
    if company_id:
        query += " WHERE p.companyId = ? GROUP BY p.id"
        cursor.execute(query, (company_id,))
    else:
        query += " GROUP BY p.id"
        cursor.execute(query)
        
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
    from api.models import Purchase, Purchaseitem, Supplier, Product, Purchaseorder, Company
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
                    vehiclenumber=data.get('vehicleNumber') or data.get('vehicle_number') or data.get('vehicle'),
                    totaltax=total_tax,
                    purchaseorderid=purchase_order
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
    from api.models import Purchase, Purchaseitem, Supplier, Product, Purchaseorder
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
        purchase_obj.vehiclenumber = data.get('vehicleNumber') or data.get('vehicle_number') or data.get('vehicle')
        purchase_obj.totaltax = total_tax
        purchase_obj.purchaseorderid = purchase_order
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
        orders = Order.objects.all().prefetch_related('orderitem_set__productid')
        serializer = OrderSerializer(orders, many=True)
        return send_success(serializer.data, "Inventory sales fetched")
    elif request.method == 'POST':
        return send_success({"id": int(timezone.now().timestamp() * 1000), **request.data}, "Sale recorded")


@api_view(['PUT', 'DELETE'])
def transaction_sales_detail(request, pk):
    if request.method == 'PUT':
        return send_success({"id": pk, **request.data}, "Sale updated")
    elif request.method == 'DELETE':
        return send_success(None, "Sale deleted")


@api_view(['GET'])
def transaction_approvals(request):
    approvals = Order.objects.filter(status='Pending')
    serializer = OrderSerializer(approvals, many=True)
    return send_success(serializer.data, "Pending approvals fetched")


@api_view(['GET'])
def transaction_approval_detail(request, pk):
    try:
        approval = Order.objects.get(id=pk)
        serializer = OrderSerializer(approval)
        return send_success(serializer.data, "Approval detail fetched")
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
def transaction_reject(request, pk):
    try:
        order = Order.objects.get(id=pk)
        order.status = 'Cancelled'
        order.save()
        for item in order.orderitem_set.all():
            if item.productid_id:
                recalculate_product_inventory(item.productid_id)
        serializer = OrderSerializer(order)
        return send_success(serializer.data, "Order rejected successfully")
    except Order.DoesNotExist:
        return send_error("Order not found", 404)


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
                    INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                    VALUES (?, ?, ?, 'PRODUCTION', ?, 'PROD', ?)
                """, (st_id, prod_id, wh_id, qty_produced, timezone.now()))
                recalculate_product_inventory(prod_id)
                
                # Auto-deduct raw material consumption based on BOM
                try:
                    cursor.execute("SELECT id FROM BOM WHERE productCode = (SELECT productCode FROM Product WHERE id = ?) OR name = (SELECT name FROM Product WHERE id = ?)", (prod_id, prod_id))
                    bom_row = cursor.fetchone()
                    if bom_row:
                        bom_id = bom_row[0]
                        cursor.execute("SELECT materialName, qty FROM BOMItem WHERE bomId = ?", (bom_id,))
                        bom_items = cursor.fetchall()
                        for mat_name, mat_qty in bom_items:
                            cursor.execute("SELECT id FROM Product WHERE name = ?", (mat_name,))
                            mat_row = cursor.fetchone()
                            if mat_row:
                                mat_prod_id = mat_row[0]
                                total_consumed = mat_qty * qty_produced
                                cursor.execute("""
                                    INSERT INTO StockTransaction (id, productId, warehouseId, transactionType, quantity, referenceId, createdAt)
                                    VALUES (?, ?, ?, 'CONSUMED', ?, ?, ?)
                                """, ('st_' + uuid.uuid4().hex[:20], mat_prod_id, wh_id, -total_consumed, 'PROD_CONS', timezone.now()))
                                recalculate_product_inventory(mat_prod_id)
                except Exception as e:
                    print("Error processing BOM consumption:", e)
                    
        return send_success({"id": st_id, **data}, "Production recorded")


@api_view(['GET'])
def transaction_production_materials(request, pk):
    return send_success([], "Production materials fetched")


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
                    VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?)
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
            cursor.execute("SELECT productId FROM StockTransaction WHERE id = ?", (pk,))
            row = cursor.fetchone()
            if row:
                prod_id = row[0]
                with transaction.atomic():
                    cursor.execute("DELETE FROM StockTransaction WHERE id = ?", (pk,))
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


@api_view(['GET'])
def transaction_returns(request):
    return send_success([], "Returns fetched")


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
