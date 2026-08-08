from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from api.models import (
    Company, Product, Category, Brand, Unit, Warehouse, Region, Market, Supplier, Labour,
    User, Userwarehouseaccess
)
from api.serializers import (
    ProductSerializer, CategorySerializer, BrandSerializer, UnitSerializer,
    WarehouseSerializer, RegionSerializer, MarketSerializer, SupplierSerializer, LabourSerializer
)
from api.views import send_success, send_error, _get_company_id, _get_request_warehouse_ids, get_allowed_product_ids_for_user, resolve_warehouse

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        user_id = self.request.user.id
        from api.models import User
        real_user = User.objects.filter(id=user_id).first()
        company_id = real_user.companyid_id if real_user else getattr(self.request.user, 'companyId', None)
        queryset = Product.objects.filter(companyid_id=company_id) if company_id else Product.objects.all()
        admin_roles = {'ADMIN', 'SUPERADMIN', 'HR', 'INVENTORY', 'PRODUCTION'}
        user_role = getattr(self.request.user, 'role', '') or ''
        is_write_op = self.request.method in ('PUT', 'PATCH', 'DELETE', 'POST')
        skip_assignment_filter = user_role.upper() in admin_roles or is_write_op

        # Warehouse isolation: filter products by warehouse header
        wh_header = self.request.headers.get('X-Warehouse-Id') or self.request.headers.get('X-Warehouse-ID') or self.request.headers.get('x-warehouse-id')
        if wh_header and wh_header not in ('GLOBAL', 'none', 'undefined'):
            try:
                queryset = queryset.filter(warehouseid_id=int(wh_header))
            except (ValueError, TypeError):
                pass

        if user_role.upper().startswith('INVENTORY') and (not skip_assignment_filter):
            pass
        if self.request.user and (not skip_assignment_filter):
            user_id = self.request.user.id
            allowed_ids = get_allowed_product_ids_for_user(user_id)
            if allowed_ids is not None:
                queryset = queryset.filter(id__in=allowed_ids)
            else:
                queryset = queryset.none()
        return queryset

    def list(self, request, *args, **kwargs):
        from api.models import Warehouse, Product, Userproductaccess
        from api.models import Purchaseitem, Orderitem, Stocktransaction
        from django.db.models import Sum, Q
        admin_roles = {'ADMIN', 'SUPERADMIN', 'HR', 'INVENTORY', 'PRODUCTION'}
        user_role = getattr(self.request.user, 'role', '') or ''
        is_admin = user_role.upper() in admin_roles
        search = request.query_params.get('search', '').strip()
        page_param = request.query_params.get('page')
        limit_param = request.query_params.get('limit')
        is_paginated = page_param is not None and limit_param is not None

        queryset = self.get_queryset()
        skip_assignment_filter = is_admin
        if not skip_assignment_filter:
            allowed_product_ids = get_allowed_product_ids_for_user(self.request.user.id)
            if allowed_product_ids is not None:
                queryset = queryset.filter(id__in=allowed_product_ids)
            else:
                queryset = queryset.none()

        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(productcode__icontains=search))

        all_products = list(queryset.select_related('categoryid', 'categoryid__parentid', 'brandid', 'unitid'))

        id_to_sku = {}
        name_to_sku = {}
        for p in all_products:
            if p.productcode:
                id_to_sku[p.id] = p.productcode
                name_to_sku[p.name] = p.productcode

        target_wh_ids = _get_request_warehouse_ids(request)
        sku_qty_map = {}
        for p in all_products:
            if p.productcode:
                p_wh_id = getattr(p, 'warehouseid_id', None)
                if not target_wh_ids or (p_wh_id and p_wh_id in target_wh_ids):
                    sku_qty_map[p.productcode] = float(p.openingstock or 0)
                else:
                    sku_qty_map[p.productcode] = 0.0

        page_product_ids = list(id_to_sku.keys())
        page_product_names = list(name_to_sku.keys())

        try:
            pur_qs = Purchaseitem.objects.filter(
                purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED'],
                productname__in=page_product_names
            )
            if target_wh_ids:
                pur_qs = pur_qs.filter(purchaseid__warehouseid_id__in=target_wh_ids)
            purchases = pur_qs.values('productname').annotate(total=Sum('qty'))
            for row in purchases:
                sku = name_to_sku.get(row['productname'])
                if sku: sku_qty_map[sku] = sku_qty_map.get(sku, 0) + float(row['total'] or 0)

            pur_ret_qs = Purchaseitem.objects.filter(
                purchaseid__status='Returned',
                productname__in=page_product_names
            )
            if target_wh_ids:
                pur_ret_qs = pur_ret_qs.filter(purchaseid__warehouseid_id__in=target_wh_ids)
            purchase_ret = pur_ret_qs.values('productname').annotate(total=Sum('qty'))
            for row in purchase_ret:
                sku = name_to_sku.get(row['productname'])
                if sku: sku_qty_map[sku] = sku_qty_map.get(sku, 0) - float(row['total'] or 0)

            sales_qs = Orderitem.objects.filter(
                orderid__status='Completed',
                productid_id__in=page_product_ids
            )
            if target_wh_ids:
                sales_qs = sales_qs.filter(orderid__warehouseid_id__in=target_wh_ids)
            sales = sales_qs.values('productid_id').annotate(total=Sum('qty'))
            for row in sales:
                sku = id_to_sku.get(row['productid_id'])
                if sku: sku_qty_map[sku] = sku_qty_map.get(sku, 0) - float(row['total'] or 0)

            sales_ret_qs = Orderitem.objects.filter(
                orderid__status='Returned',
                productid_id__in=page_product_ids
            )
            if target_wh_ids:
                sales_ret_qs = sales_ret_qs.filter(orderid__warehouseid_id__in=target_wh_ids)
            sales_ret = sales_ret_qs.values('productid_id').annotate(total=Sum('qty'))
            for row in sales_ret:
                sku = id_to_sku.get(row['productid_id'])
                if sku: sku_qty_map[sku] = sku_qty_map.get(sku, 0) + float(row['total'] or 0)

            st_qs = Stocktransaction.objects.filter(
                productid_id__in=page_product_ids
            ).exclude(reason__in=['PENDING_APPROVAL', 'REJECTED'])
            if target_wh_ids:
                st_qs = st_qs.filter(warehouseid_id__in=target_wh_ids)
            st_aggs = st_qs.values('productid_id').annotate(total=Sum('quantity'))
            for row in st_aggs:
                sku = id_to_sku.get(row['productid_id'])
                if sku: sku_qty_map[sku] = sku_qty_map.get(sku, 0) + float(row['total'] or 0)
        except Exception:
            pass

        is_global = request.query_params.get('global', '').lower() == 'true' or request.query_params.get('all', '').lower() == 'true'
        if target_wh_ids and not is_global:
            active_st_prod_ids = set(Stocktransaction.objects.filter(warehouseid_id__in=target_wh_ids).values_list('productid_id', flat=True))
            all_products = [
                p for p in all_products
                if getattr(p, 'warehouseid_id', None) in target_wh_ids
                or p.id in active_st_prod_ids
                or abs(sku_qty_map.get(p.productcode, 0)) > 0.0001
            ]

        total = len(all_products)

        if is_paginated:
            try:
                page = max(1, int(page_param))
                limit = min(200, max(1, int(limit_param)))
            except (ValueError, TypeError):
                page, limit = 1, 20
            offset = (page - 1) * limit
            page_products = all_products[offset:offset + limit]
            serializer = ProductSerializer(page_products, many=True, context={'request': request, 'sku_qty_map': sku_qty_map})
            return send_success({
                'items': serializer.data,
                'total': total,
                'page': page,
                'limit': limit,
                'hasMore': offset + limit < total,
            }, 'Products fetched successfully')

        serializer = ProductSerializer(all_products, many=True, context={'request': request, 'sku_qty_map': sku_qty_map})
        return send_success(serializer.data, 'Products fetched successfully')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ProductSerializer(instance)
        return send_success(serializer.data, 'Product fetched successfully')

    @action(detail=False, methods=['post'], url_path='suggest-sku')
    def suggest_sku(self, request):
        from api.models import Warehouse, Product, Company, Category, Brand
        data = request.data
        company_id = _get_company_id(request)
        target_name = data.get('name', '').strip()
        target_category_id = data.get('categoryId') or data.get('categoryid')
        target_brand_id = data.get('brandId') or data.get('brandid')
        if not target_name:
            return send_error('Product name is required', 400)
        target_category_name = None
        if target_category_id:
            cat = Category.objects.filter(id=target_category_id).first()
            if cat:
                target_category_name = cat.name
        target_brand_name = None
        if target_brand_id:
            br = Brand.objects.filter(id=target_brand_id).first()
            if br:
                target_brand_name = br.name
        matched_code = None
        qs = Product.objects.filter(name__iexact=target_name)
        if company_id:
            qs = qs.filter(companyid_id=company_id)
        if target_category_name:
            qs = qs.filter(categoryid__name__iexact=target_category_name)
        elif target_category_id:
            qs = qs.filter(categoryid_id=target_category_id)
        else:
            qs = qs.filter(categoryid__isnull=True)
        if target_brand_name:
            qs = qs.filter(brandid__name__iexact=target_brand_name)
        elif target_brand_id:
            qs = qs.filter(brandid_id=target_brand_id)
        else:
            qs = qs.filter(brandid__isnull=True)
        match = qs.first()
        if match and match.productcode:
            matched_code = match.productcode
        if matched_code:
            return send_success({'sku': matched_code, 'isExisting': True}, 'Suggested SKU fetched successfully')
        company = Company.objects.filter(id=company_id).first() if company_id else None
        prefix = getattr(company, 'skuprefix', 'PRD') or 'PRD'
        max_num = 0
        codes = Product.objects.filter(productcode__startswith=f'{prefix}-').values_list('productcode', flat=True)
        for c in codes:
            suffix = c[len(prefix) + 1:]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
        new_sku = f'{prefix}-{max_num + 1:04d}'
        return send_success({'sku': new_sku, 'isExisting': False}, 'Generated new SKU successfully')

    def create(self, request, *args, **kwargs):
        from django.utils import timezone
        now = timezone.now()
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        unit_name = data.get('unit')
        if unit_name:
            try:
                from api.models import Unit
                unit_obj = Unit.objects.filter(name=unit_name).first()
                if unit_obj:
                    data['unitId'] = unit_obj.id
            except Exception:
                pass
        product_code = (data.get('productCode') or data.get('productcode') or '').strip()
        company_id = _get_company_id(request)
        target_name = data.get('name', '').strip()
        target_category_id = data.get('categoryId') or data.get('categoryid')
        target_brand_id = data.get('brandId') or data.get('brandid')
        if not product_code:
            target_category_name = None
            if target_category_id:
                cat = Category.objects.filter(id=target_category_id).first()
                if cat:
                    target_category_name = cat.name
            target_brand_name = None
            if target_brand_id:
                br = Brand.objects.filter(id=target_brand_id).first()
                if br:
                    target_brand_name = br.name
            matched_code = None
            if target_name:
                qs = Product.objects.filter(name__iexact=target_name)
                if company_id:
                    qs = qs.filter(companyid_id=company_id)
                if target_category_name:
                    qs = qs.filter(categoryid__name__iexact=target_category_name)
                elif target_category_id:
                    qs = qs.filter(categoryid_id=target_category_id)
                else:
                    qs = qs.filter(categoryid__isnull=True)
                if target_brand_name:
                    qs = qs.filter(brandid__name__iexact=target_brand_name)
                elif target_brand_id:
                    qs = qs.filter(brandid_id=target_brand_id)
                else:
                    qs = qs.filter(brandid__isnull=True)
                match = qs.first()
                if match and match.productcode:
                    matched_code = match.productcode
            if matched_code:
                product_code = matched_code
            else:
                company = Company.objects.filter(id=company_id).first() if company_id else None
                prefix = getattr(company, 'skuprefix', 'PRD') or 'PRD'
                max_num = 0
                codes = Product.objects.filter(productcode__startswith=f'{prefix}-').values_list('productcode', flat=True)
                for c in codes:
                    suffix = c[len(prefix) + 1:]
                    if suffix.isdigit():
                        max_num = max(max_num, int(suffix))
                product_code = f'{prefix}-{max_num + 1:04d}'
            data['productCode'] = product_code
            data['productcode'] = product_code
        import uuid
        existing_product = None
        if product_code and company_id:
            existing_product = Product.objects.filter(companyid_id=company_id, productcode=product_code).first()
        if not existing_product and target_name and company_id:
            existing_product = Product.objects.filter(companyid_id=company_id, name__iexact=target_name).first()

        if existing_product:
            product_obj = existing_product
            opening_val = int(data.get('openingStock', 0) or data.get('openingstock', 0) or 0)
            if opening_val > 0:
                wh_id = request.headers.get('x-warehouse-id')
                if wh_id:
                    from api.models import Warehouse, Stocktransaction
                    wh = resolve_warehouse(wh_id)
                    if wh:
                        txn = Stocktransaction.objects.filter(productid=product_obj, warehouseid=wh, transactiontype='OPENING_STOCK').first()
                        if txn:
                            txn.quantity = opening_val
                            txn.save()
                        else:
                            Stocktransaction.objects.create(id='c' + uuid.uuid4().hex[:23], productid=product_obj, warehouseid=wh, transactiontype='OPENING_STOCK', quantity=opening_val, reason='Initial Opening Stock', createdat=now)
            return send_success(ProductSerializer(product_obj).data, 'Product linked to warehouse successfully', 200)

        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        serializer = ProductSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(createdat=now, updatedat=now)
        product_obj = serializer.instance
        if getattr(product_obj, 'openingstock', 0) > 0:
            wh_id = request.headers.get('x-warehouse-id')
            if wh_id:
                from api.models import Warehouse, Stocktransaction
                wh = resolve_warehouse(wh_id)
                if wh:
                    Stocktransaction.objects.create(id='c' + uuid.uuid4().hex[:23], productid=product_obj, warehouseid=wh, transactiontype='OPENING_STOCK', quantity=product_obj.openingstock, reason='Initial Opening Stock', createdat=now)
        return send_success(serializer.data, 'Product created successfully', 201)

    def update(self, request, *args, **kwargs):
        from django.utils import timezone
        now = timezone.now()
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        data = request.data.copy()
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
        return send_success(serializer.data, 'Product updated successfully')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success(None, 'Product deleted successfully')

    @action(detail=False, methods=['get'], url_path='subcategories')
    def subcategories(self, request):
        queryset = self.get_queryset()
        categories = list(queryset.values_list('categoryid__name', flat=True).distinct())
        categories = [c for c in categories if c]
        return send_success(categories, 'Categories fetched successfully')

class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def list(self, request, *args, **kwargs):
        company_id = _get_company_id(request)
        queryset = Category.objects.filter(companyid_id=company_id) if company_id else Category.objects.all()
        serializer = CategorySerializer(queryset, many=True)
        return send_success(serializer.data, 'Categories fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        serializer = CategorySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, 'Category created successfully', 201)

class BrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer

    def list(self, request, *args, **kwargs):
        company_id = _get_company_id(request)
        queryset = Brand.objects.filter(companyid_id=company_id) if company_id else Brand.objects.all()
        serializer = BrandSerializer(queryset, many=True)
        return send_success(serializer.data, 'Brands fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        serializer = BrandSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, 'Brand created successfully', 201)

class UnitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def list(self, request, *args, **kwargs):
        company_id = _get_company_id(request)
        queryset = Unit.objects.filter(companyid_id=company_id) if company_id else Unit.objects.all()
        serializer = UnitSerializer(queryset, many=True)
        return send_success(serializer.data, 'Units fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        serializer = UnitSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, 'Unit created successfully', 201)

class WarehouseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

    def list(self, request, *args, **kwargs):
        company_id = _get_company_id(request)
        queryset = Warehouse.objects.filter(companyid_id=company_id) if company_id else Warehouse.objects.all()
        if request.user and ('masters/warehouses' not in request.path or request.user.role == 'INVENTORY'):
            user_id = request.user.id
            from api.models import Userwarehouseaccess
            has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
            if has_wh_assignments:
                assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
                queryset = queryset.filter(id__in=assigned_wh_ids)
        serializer = WarehouseSerializer(queryset, many=True)
        return send_success(serializer.data, 'Warehouses fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        serializer = WarehouseSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, 'Warehouse created successfully', 201)

class RegionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Region.objects.all()
    serializer_class = RegionSerializer

    def list(self, request, *args, **kwargs):
        company_id = _get_company_id(request)
        queryset = Region.objects.filter(companyid_id=company_id) if company_id else Region.objects.all()
        serializer = RegionSerializer(queryset, many=True)
        return send_success(serializer.data, 'Regions fetched successfully')

class MarketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Market.objects.all()
    serializer_class = MarketSerializer

    def get_queryset(self):
        company_id = _get_company_id(self.request)
        if company_id:
            return Market.objects.filter(companyid_id=company_id)
        return Market.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = MarketSerializer(queryset, many=True)
        return send_success(serializer.data, 'Markets fetched successfully')

class SupplierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_queryset(self):
        company_id = _get_company_id(self.request)
        qs = Supplier.objects.filter(companyid_id=company_id) if company_id else Supplier.objects.all()
        wh_header = self.request.headers.get('X-Warehouse-Id') or self.request.headers.get('X-Warehouse-ID') or self.request.headers.get('x-warehouse-id')
        if wh_header and wh_header not in ('GLOBAL', 'none', 'undefined'):
            qs = qs.filter(warehouseid_id=wh_header)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = SupplierSerializer(queryset, many=True)
        return send_success(serializer.data, 'Suppliers fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
            
        wh_id = data.get('warehouseId') or request.headers.get('X-Warehouse-Id') or request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        if wh_id:
            data['warehouseId'] = wh_id
            
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        from django.utils import timezone
        now = timezone.now()
        serializer = SupplierSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(createdat=now, updatedat=now)
        return send_success(serializer.data, 'Supplier created successfully', 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        data = request.data.copy()
        wh_id = data.get('warehouseId') or request.headers.get('X-Warehouse-Id') or request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        if wh_id:
            data['warehouseId'] = wh_id
            
        from django.utils import timezone
        now = timezone.now()
        serializer = SupplierSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(updatedat=now)
        return send_success(serializer.data, 'Supplier updated successfully')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success(None, 'Supplier deleted successfully')

class LabourViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Labour.objects.all()
    serializer_class = LabourSerializer

    def get_queryset(self):
        company_id = _get_company_id(self.request)
        qs = Labour.objects.filter(companyid_id=company_id) if company_id else Labour.objects.all()
        wh_header = self.request.headers.get('X-Warehouse-Id') or self.request.headers.get('X-Warehouse-ID') or self.request.headers.get('x-warehouse-id')
        if wh_header and wh_header not in ('GLOBAL', 'none', 'undefined'):
            qs = qs.filter(warehouseid_id=wh_header)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = LabourSerializer(queryset, many=True)
        return send_success(serializer.data, 'Labour records fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        wh_id = data.get('warehouseId') or request.headers.get('X-Warehouse-Id') or request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        if wh_id:
            data['warehouseId'] = wh_id
        from django.utils import timezone
        now = timezone.now()
        serializer = LabourSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(createdat=now, updatedat=now)
        return send_success(serializer.data, 'Labour record created successfully', 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        data = request.data.copy()
        wh_id = data.get('warehouseId') or request.headers.get('X-Warehouse-Id') or request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        if wh_id:
            data['warehouseId'] = wh_id
        from django.utils import timezone
        now = timezone.now()
        serializer = LabourSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(updatedat=now)
        return send_success(serializer.data, 'Labour record updated successfully')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return send_success(None, 'Labour record deleted successfully')
