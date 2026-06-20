from rest_framework import serializers
from core.models import Company, User, Warehouse
from api.models import (
    Product, Category, Brand, Unit, Region, Market,
    Dealer, Distributor, Order, Orderitem, Visit, Expense, Bom, Bomitem, Supplier, Labour,
    Purchase, Purchaseitem, Purchaseorder, Purchaseorderitem,
    Lead, LeadFollowUp, LeadStageHistory
)

class CompanySerializer(serializers.ModelSerializer):
    skuPrefix = serializers.CharField(source='skuprefix', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    stockMethod = serializers.CharField(source='stockmethod', default='FIFO')

    class Meta:
        model = Company
        fields = ['id', 'name', 'skuPrefix', 'active', 'createdAt', 'updatedAt', 'stockMethod']


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    monthlyTarget = serializers.FloatField(source='monthlytarget', required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'active', 'monthlyTarget', 'companyId', 'createdAt', 'updatedAt', 'territory']


class CategorySerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    parentId = serializers.IntegerField(source='parentid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Category
        fields = ['id', 'name', 'active', 'companyId', 'parentId']


class BrandSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Brand
        fields = ['id', 'name', 'active', 'companyId']


class UnitSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Unit
        fields = ['id', 'name', 'active', 'companyId']


class WarehouseSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    gstNumber = serializers.CharField(source='gstnumber', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'active', 'companyId', 'gstNumber', 'location']

    def create(self, validated_data):
        name = validated_data.get('name', '')
        import re
        slug = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower())
        slug = re.sub(r'_+', '_', slug).strip('_')
        if not slug:
            import uuid
            slug = uuid.uuid4().hex[:10]
            
        schema_name = f"wh_{slug}"
        base_schema = schema_name
        counter = 1
        while Warehouse.objects.using('default').filter(schema_name=schema_name).exists():
            schema_name = f"{base_schema}_{counter}"
            counter += 1
            
        validated_data['schema_name'] = schema_name
        validated_data['db_name'] = schema_name
        
        return super().create(validated_data)


class RegionSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Region
        fields = ['id', 'name', 'active', 'companyId']


class MarketSerializer(serializers.ModelSerializer):
    regionId = serializers.IntegerField(source='regionid_id')
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Market
        fields = ['id', 'name', 'active', 'regionId']


class SupplierSerializer(serializers.ModelSerializer):
    contactPerson = serializers.CharField(source='contactperson', required=False, allow_null=True, allow_blank=True)
    contactInfo = serializers.CharField(source='contactinfo', required=False, allow_null=True, allow_blank=True)
    
    # Support snake_case form keys from frontend forms
    contact_person = serializers.CharField(source='contactperson', required=False, allow_null=True, allow_blank=True)
    contact_info = serializers.CharField(source='contactinfo', required=False, allow_null=True, allow_blank=True)
    
    gstNumber = serializers.CharField(source='gstnumber', required=False, allow_null=True, allow_blank=True)
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contactPerson', 'contactInfo', 'contact_person', 'contact_info',
            'email', 'gstNumber', 'address', 'active', 'companyId', 'createdAt', 'updatedAt'
        ]


class LabourSerializer(serializers.ModelSerializer):
    dailyWage = serializers.FloatField(source='dailywage', default=0.0, required=False)
    contactInfo = serializers.CharField(source='contactinfo', required=False, allow_null=True, allow_blank=True)
    contact_info = serializers.CharField(source='contactinfo', required=False, allow_null=True, allow_blank=True)
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    class Meta:
        model = Labour
        fields = ['id', 'name', 'dailyWage', 'contactInfo', 'contact_info', 'active', 'companyId', 'createdAt', 'updatedAt']


class ProductSerializer(serializers.ModelSerializer):
    productCode = serializers.CharField(source='productcode', required=False)
    productName = serializers.CharField(source='name', read_only=True)
    bagSize = serializers.CharField(source='bagsize', required=False, default='50kg')
    brandId = serializers.IntegerField(source='brandid_id', required=False, allow_null=True)
    unitId = serializers.IntegerField(source='unitid_id', required=False, allow_null=True)
    companyId = serializers.CharField(source='companyid_id', required=False)
    active = serializers.BooleanField(default=True, required=False)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    categoryId = serializers.IntegerField(source='categoryid_id', required=True)
    openingStock = serializers.IntegerField(source='openingstock', default=0)
    minimumStock = serializers.IntegerField(source='minimumstock', default=0)
    defaultWarehouseId = serializers.IntegerField(source='defaultwarehouseid', required=False, allow_null=True)
    gst = serializers.FloatField(required=False, default=18.0)
    rate = serializers.FloatField(required=False, default=0.0)
    
    brand = serializers.SerializerMethodField(read_only=True)
    unit = serializers.SerializerMethodField(read_only=True)
    categoryRef = serializers.SerializerMethodField(read_only=True)
    availableStock = serializers.SerializerMethodField(read_only=True)
    stockQty = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'productCode', 'name', 'productName', 'bagSize', 'brandId', 'unitId', 'rate', 'gst', 
            'active', 'companyId', 'createdAt', 'updatedAt', 'categoryId', 'openingStock', 
            'minimumStock', 'defaultWarehouseId', 'brand', 'unit', 'categoryRef', 'availableStock', 'stockQty'
        ]

    def get_brand(self, obj):
        try:
            if obj.brandid:
                return {'id': obj.brandid.id, 'name': obj.brandid.name}
        except Exception:
            pass
        return None

    def validate(self, data):
        # Validate unique product code per company
        product_code = data.get('productcode')
        company_id = data.get('companyid_id')
        
        # In updates, we need to ignore the current instance
        instance_id = self.instance.id if self.instance else None
        
        if product_code and company_id:
            from api.models import Product
            qs = Product.objects.filter(productcode__iexact=product_code, companyid=company_id)
            if instance_id:
                qs = qs.exclude(id=instance_id)
                
            if qs.exists():
                raise serializers.ValidationError({"productCode": "A product with this SKU already exists."})
                
        return data

    def create(self, validated_data):
        validated_data.pop('defaultwarehouseid', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('defaultwarehouseid', None)
        return super().update(instance, validated_data)

    def get_unit(self, obj):
        try:
            if obj.unitid:
                return {'id': obj.unitid.id, 'name': obj.unitid.name}
        except Exception:
            pass
        return None

    def get_categoryRef(self, obj):
        try:
            if obj.categoryid:
                parent_data = None
                try:
                    if obj.categoryid.parentid:
                        parent_data = {
                            'id': obj.categoryid.parentid.id,
                            'name': obj.categoryid.parentid.name
                        }
                except Exception:
                    pass
                return {
                    'id': obj.categoryid.id,
                    'name': obj.categoryid.name,
                    'parent': parent_data
                }
        except Exception:
            pass
        return None

    def get_availableStock(self, obj):
        if 'sku_qty_map' in self.context and getattr(obj, 'productcode', None):
            return self.context['sku_qty_map'].get(obj.productcode, 0)
            
        from api.models import Inventory
        from django.db.models import Sum
        from django.db.utils import ProgrammingError, OperationalError
        try:
            request = self.context.get('request')
            if request and request.user:
                user = request.user
                from api.models import Userwarehouseaccess
                has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user.id).exists()
                if has_wh_assignments and getattr(user, 'role', '') == 'INVENTORY':
                    assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user.id).values_list('warehouseid_id', flat=True))
                    total = Inventory.objects.filter(productid_id=obj.id, warehouseid_id__in=assigned_wh_ids).aggregate(Sum('quantity'))['quantity__sum']
                    return total or 0
            total = Inventory.objects.filter(productid_id=obj.id).aggregate(Sum('quantity'))['quantity__sum']
            return total or 0
        except (ProgrammingError, OperationalError):
            return 0

    def get_stockQty(self, obj):
        return self.get_availableStock(obj)


class DealerSerializer(serializers.ModelSerializer):
    dealerCode = serializers.CharField(source='dealercode')
    dealerName = serializers.CharField(source='dealername')
    assignedSoEmail = serializers.CharField(source='assignedsoemail')
    distributorName = serializers.CharField(source='distributorname', required=False, allow_blank=True, allow_null=True)
    creditLimit = serializers.FloatField(source='creditlimit', default=0.0)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    contactPerson = serializers.CharField(source='contact_person', required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    gst = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Dealer
        fields = [
            'id', 'dealerCode', 'dealerName', 'city', 'assignedSoEmail', 'distributorName',
            'creditLimit', 'outstanding', 'active', 'companyId', 'createdAt', 'updatedAt', 'territory',
            'phone', 'email', 'address', 'gst', 'contactPerson'
        ]

    def create(self, validated_data):
        for key in ['phone', 'email', 'address', 'gst', 'contact_person']:
            validated_data.pop(key, None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for key in ['phone', 'email', 'address', 'gst', 'contact_person']:
            validated_data.pop(key, None)
        return super().update(instance, validated_data)


class DistributorSerializer(serializers.ModelSerializer):
    distributorName = serializers.CharField(source='distributorname')
    assignedSoEmail = serializers.CharField(source='assignedsoemail')
    creditLimit = serializers.FloatField(source='creditlimit', default=0.0)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    contactPerson = serializers.CharField(source='contact_person', required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    gst = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Distributor
        fields = [
            'id', 'distributorName', 'area', 'assignedSoEmail', 'creditLimit',
            'outstanding', 'active', 'companyId', 'createdAt', 'updatedAt', 'territory',
            'phone', 'email', 'address', 'gst', 'contactPerson'
        ]

    def create(self, validated_data):
        for key in ['phone', 'email', 'address', 'gst', 'contact_person']:
            validated_data.pop(key, None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for key in ['phone', 'email', 'address', 'gst', 'contact_person']:
            validated_data.pop(key, None)
        return super().update(instance, validated_data)


class OrderitemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    orderId = serializers.CharField(source='orderid_id', required=False)
    productId = serializers.CharField(source='productid_id')
    itemRemark = serializers.CharField(source='itemremark', required=False, allow_blank=True, allow_null=True)
    product = ProductSerializer(source='productid', read_only=True)

    class Meta:
        model = Orderitem
        fields = ['id', 'orderId', 'productId', 'qty', 'price', 'total', 'itemRemark', 'product']

    def to_representation(self, instance):
        """Handle cross-database FK failures gracefully.
        
        In multi-tenant setups, order items may reference product IDs from
        a different warehouse DB. When the FK can't resolve, we return a
        minimal product stub instead of null so the frontend shows a name.
        """
        try:
            ret = super().to_representation(instance)
        except Product.DoesNotExist:
            # FK lookup failed — manually build the representation
            ret = {
                'id': instance.id,
                'orderId': instance.orderid_id,
                'productId': instance.productid_id,
                'qty': instance.qty,
                'price': instance.price,
                'total': instance.total,
                'itemRemark': instance.itemremark,
                'product': None,
            }

        # If product is still None, try to resolve from all warehouse DBs
        if ret.get('product') is None and instance.productid_id:
            from django.conf import settings
            for db_name in settings.DATABASES:
                try:
                    p = Product.objects.using(db_name).filter(id=instance.productid_id).first()
                    if p:
                        ret['product'] = {
                            'id': p.id,
                            'productCode': p.productcode,
                            'name': p.name,
                            'productName': p.name,
                        }
                        break
                except Exception:
                    continue

        return ret


class OrderSerializer(serializers.ModelSerializer):
    orderId = serializers.CharField(source='orderid')
    soEmail = serializers.CharField(source='soemail_id')
    partyType = serializers.CharField(source='partytype')
    partyName = serializers.CharField(source='partyname')
    grandTotal = serializers.FloatField(source='grandtotal')
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    assignedWarehouse = serializers.PrimaryKeyRelatedField(source='assigned_warehouse', queryset=Warehouse.objects.all(), required=False, allow_null=True)
    items = OrderitemSerializer(many=True, required=False, source='orderitem_set')
    partyDetails = serializers.SerializerMethodField(read_only=True)
    
    invoiceNumber = serializers.CharField(source='invoicenumber', required=False, allow_null=True, allow_blank=True)
    vehicleNumber = serializers.CharField(source='vehiclenumber', required=False, allow_null=True, allow_blank=True)
    driverName = serializers.CharField(source='drivername', required=False, allow_null=True, allow_blank=True)
    driverMobile = serializers.CharField(source='drivermobile', required=False, allow_null=True, allow_blank=True)
    dispatchWarehouse = serializers.CharField(source='dispatchwarehouse', required=False, allow_null=True, allow_blank=True)
    dispatchDate = serializers.CharField(source='dispatchdate', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Order
        fields = [
            'id', 'orderId', 'date', 'soEmail', 'partyType', 'partyName', 'distributor',
            'narration', 'status', 'grandTotal', 'companyId', 'createdAt', 'updatedAt', 'items',
            'assignedWarehouse', 'partyDetails',
            'invoiceNumber', 'vehicleNumber', 'driverName', 'driverMobile', 'dispatchWarehouse', 'dispatchDate'
        ]

    def get_partyDetails(self, obj):
        from api.models import Dealer, Distributor
        p_type = str(obj.partytype).upper()
        # Use the database alias the order came from
        db_alias = getattr(obj._state, 'db', 'default')
        
        if p_type == 'DEALER':
            dealer = Dealer.objects.using(db_alias).filter(dealername=obj.partyname).first()
            if dealer:
                return {
                    'address': getattr(dealer, 'address', ''),
                    'phone': getattr(dealer, 'phone', ''),
                    'email': getattr(dealer, 'email', ''),
                    'gst': getattr(dealer, 'gst', ''),
                    'contact_person': getattr(dealer, 'contact_person', '')
                }
        elif p_type == 'DISTRIBUTOR':
            distributor = Distributor.objects.using(db_alias).filter(distributorname=obj.partyname).first()
            if distributor:
                return {
                    'address': getattr(distributor, 'address', ''),
                    'phone': getattr(distributor, 'phone', ''),
                    'email': getattr(distributor, 'email', ''),
                    'gst': getattr(distributor, 'gst', ''),
                    'contact_person': getattr(distributor, 'contact_person', '')
                }
        return None


    def create(self, validated_data):
        validated_data.pop('assigned_warehouse', None)
        # source='orderitem_set' means DRF stores nested items under 'orderitem_set' key
        items_data = validated_data.pop('orderitem_set', [])
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            import uuid
            if 'id' not in item_data or not item_data['id']:
                item_data['id'] = 'c' + uuid.uuid4().hex[:23]
            Orderitem.objects.create(orderid=order, **item_data)
        return order

    def update(self, instance, validated_data):
        validated_data.pop('assigned_warehouse', None)
        # Pop the reverse relationship set to avoid setattr assignment errors
        items_data = validated_data.pop('orderitem_set', None)
        
        # Update scalar fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if items_data is not None:
            # Delete old items
            instance.orderitem_set.all().delete()
            # Create new items
            for item_data in items_data:
                import uuid
                if 'id' not in item_data or not item_data['id']:
                    item_data['id'] = 'c' + uuid.uuid4().hex[:23]
                Orderitem.objects.create(orderid=instance, **item_data)
                
        return instance


class VisitSerializer(serializers.ModelSerializer):
    soEmail = serializers.CharField(source='soemail_id')
    dealerName = serializers.CharField(source='dealername')
    nextFollowup = serializers.DateTimeField(source='nextfollowup', required=False, allow_null=True)
    nextVisitTime = serializers.DateTimeField(source='nextvisittime', required=False, allow_null=True)
    gpsLocation = serializers.CharField(source='gpslocation', required=False, allow_null=True, allow_blank=True)
    companyId = serializers.CharField(source='companyid_id')
    leadId = serializers.CharField(source='lead_id', required=False, allow_null=True, allow_blank=True)
    visitStatus = serializers.CharField(source='visit_status', read_only=True)
    hrRemark = serializers.CharField(source='hr_remark', read_only=True)
    verifiedBy = serializers.CharField(source='verified_by', read_only=True)
    verifiedAt = serializers.DateTimeField(source='verified_at', read_only=True)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)

    class Meta:
        model = Visit
        fields = [
            'id', 'date', 'soEmail', 'dealerName', 'remarks', 'nextFollowup',
            'nextVisitTime', 'gpsLocation', 'photo', 'companyId', 'leadId', 
            'visitStatus', 'hrRemark', 'verifiedBy', 'verifiedAt', 'createdAt'
        ]

    def to_internal_value(self, data):
        # Coerce empty string datetime fields and foreign keys to None to avoid format validation errors
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in ('nextFollowup', 'nextVisitTime', 'nextfollowup', 'nextvisittime', 'leadId', 'lead_id'):
            if field in mutable and (mutable[field] == '' or mutable[field] == 'none' or mutable[field] is None):
                mutable[field] = None
        return super().to_internal_value(mutable)




class ExpenseSerializer(serializers.ModelSerializer):
    soEmail = serializers.CharField(source='soemail_id')
    rejectReason = serializers.CharField(source='rejectreason', required=False, allow_null=True, allow_blank=True)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'date', 'soEmail', 'category', 'amount', 'remarks', 'status',
            'photo', 'rejectReason', 'declaration', 'companyId', 'createdAt'
        ]


class BomitemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    bomId = serializers.CharField(source='bomid_id', required=False)
    materialName = serializers.CharField(source='materialname', required=False)
    productName = serializers.CharField(source='materialname', required=False, allow_null=True, allow_blank=True)
    qty = serializers.FloatField(required=False)
    quantity = serializers.FloatField(source='qty', required=False)
    productId = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Bomitem
        fields = ['id', 'bomId', 'materialName', 'productName', 'qty', 'quantity', 'unit', 'productId']

    def get_productId(self, obj):
        from api.models import Product
        db = obj._state.db or 'default'
        prod = Product.objects.using(db).filter(name=obj.materialname).first()
        return prod.id if prod else ""

    def validate(self, data):
        # If materialname is not set, try to get it from materialname, productName, or product_name
        if not data.get('materialname'):
            prod_name = self.initial_data.get('productName') or self.initial_data.get('product_name') or self.initial_data.get('materialName')
            if prod_name:
                data['materialname'] = prod_name
            else:
                raise serializers.ValidationError({"materialName": "This field is required."})

        # Resolve qty from qty or quantity
        if data.get('qty') is None:
            qty_val = self.initial_data.get('quantity') or self.initial_data.get('qty')
            if qty_val is not None:
                try:
                    data['qty'] = float(qty_val)
                except ValueError:
                    raise serializers.ValidationError({"qty": "Must be a valid number"})
            else:
                raise serializers.ValidationError({"qty": "This field is required."})

        return data


class BomSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False)
    productCode = serializers.CharField(source='productcode', required=False)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    items = BomitemSerializer(source='bomitem_set', many=True, required=False)
    outputQuantity = serializers.FloatField(source='outputquantity', required=False, default=1.0)
    productId = serializers.SerializerMethodField(read_only=True)
    productName = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Bom
        fields = ['id', 'productCode', 'name', 'companyId', 'createdAt', 'updatedAt', 'items', 'outputQuantity', 'productId', 'productName']

    def get_productId(self, obj):
        from api.models import Product
        db = obj._state.db or 'default'
        prod = Product.objects.using(db).filter(productcode=obj.productcode).first()
        return prod.id if prod else ""

    def get_productName(self, obj):
        from api.models import Product
        db = obj._state.db or 'default'
        prod = Product.objects.using(db).filter(productcode=obj.productcode).first()
        return prod.name if prod else ""

    def validate(self, data):
        from api.db_router import get_current_db, get_tenant_model_cross_db
        db = get_current_db() or 'default'
        
        product_id = self.initial_data.get('productId') or self.initial_data.get('product_id')
        if product_id:
            try:
                from api.models import Product
                if db == 'default':
                    prod = get_tenant_model_cross_db(Product, product_id)
                    db = get_current_db() or 'default'
                else:
                    try:
                        prod = Product.objects.using(db).get(id=product_id)
                    except Exception:
                        prod = get_tenant_model_cross_db(Product, product_id)
                        db = get_current_db() or 'default'
                data['productcode'] = prod.productcode
            except Exception:
                raise serializers.ValidationError({"productId": "Product not found"})
        elif not data.get('productcode'):
            raise serializers.ValidationError({"productCode": "This field is required."})
            
        product_code = data.get('productcode')
        if product_code:
            qs = Bom.objects.using(db).filter(productcode=product_code)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"productId": "A recipe for this product already exists."})
                
        return data

    def create(self, validated_data):
        from api.db_router import get_current_db
        db = get_current_db() or 'default'
        from django.utils import timezone
        now = timezone.now()
        validated_data['createdat'] = now
        validated_data['updatedat'] = now

        items_data = validated_data.pop('bomitem_set', validated_data.pop('items', []))
        bom = Bom.objects.using(db).create(**validated_data)
        for item_data in items_data:
            item_data.pop('productName', None)
            item_data.pop('quantity', None)
            item_data.pop('id', None)
            item_data.pop('bomid_id', None)
            item_data.pop('bomid', None)
            import uuid
            item_id = 'c' + uuid.uuid4().hex[:23]
            Bomitem.objects.using(db).create(id=item_id, bomid=bom, **item_data)
        return bom

    def update(self, instance, validated_data):
        db = instance._state.db or 'default'
        from django.utils import timezone
        now = timezone.now()
        validated_data['updatedat'] = now

        items_data = validated_data.pop('bomitem_set', validated_data.pop('items', None))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(using=db)

        if items_data is not None:
            Bomitem.objects.using(db).filter(bomid=instance).delete()
            for item_data in items_data:
                item_data.pop('productName', None)
                item_data.pop('quantity', None)
                item_data.pop('id', None)
                item_data.pop('bomid_id', None)
                item_data.pop('bomid', None)
                import uuid
                item_id = 'c' + uuid.uuid4().hex[:23]
                Bomitem.objects.using(db).create(id=item_id, bomid=instance, **item_data)
        return instance


class PurchaseorderitemSerializer(serializers.ModelSerializer):
    purchaseOrderId = serializers.CharField(source='purchaseorderid_id', required=False)
    productId = serializers.CharField(source='productid_id', required=False)
    product_id = serializers.CharField(source='productid_id', required=False)
    
    productName = serializers.CharField(source='productname', required=False)
    product_name = serializers.CharField(source='productname', required=False)
    
    lineTotal = serializers.FloatField(source='linetotal', required=False)
    line_total = serializers.FloatField(source='linetotal', required=False)
    
    tax_percent = serializers.FloatField(required=False)
    
    product = ProductSerializer(source='productid', read_only=True)
    receivedQuantity = serializers.SerializerMethodField()
    received_quantity = serializers.SerializerMethodField()
    pendingQuantity = serializers.SerializerMethodField()
    pending_quantity = serializers.SerializerMethodField()
    extraReceivedQuantity = serializers.SerializerMethodField()
    extra_received_quantity = serializers.SerializerMethodField()
    receiptStatus = serializers.SerializerMethodField()
    receipt_status = serializers.SerializerMethodField()

    class Meta:
        model = Purchaseorderitem
        fields = [
            'id', 'purchaseOrderId', 'productId', 'product_id', 'productName', 'product_name',
            'quantity', 'rate', 'tax_percent', 'lineTotal', 'line_total', 'remark', 'product',
            'receivedQuantity', 'received_quantity', 'pendingQuantity', 'pending_quantity',
            'extraReceivedQuantity', 'extra_received_quantity', 'receiptStatus', 'receipt_status'
        ]

    def _received_quantity(self, obj):
        db = obj._state.db or 'default'
        linked_purchase_ids = Purchase.objects.using(db).filter(purchaseorderid=obj.purchaseorderid).values_list('id', flat=True)
        if not linked_purchase_ids:
            return 0

        product_name = obj.productname or ''
        return sum(
            item.qty
            for item in Purchaseitem.objects.using(db).filter(
                purchaseid_id__in=linked_purchase_ids,
                productname=product_name
            )
        )

    def get_receivedQuantity(self, obj):
        return self._received_quantity(obj)

    def get_received_quantity(self, obj):
        return self._received_quantity(obj)

    def get_pendingQuantity(self, obj):
        return max((obj.quantity or 0) - self._received_quantity(obj), 0)

    def get_pending_quantity(self, obj):
        return self.get_pendingQuantity(obj)

    def get_extraReceivedQuantity(self, obj):
        return max(self._received_quantity(obj) - (obj.quantity or 0), 0)

    def get_extra_received_quantity(self, obj):
        return self.get_extraReceivedQuantity(obj)

    def get_receiptStatus(self, obj):
        received = self._received_quantity(obj)
        ordered = obj.quantity or 0
        if received > ordered:
            return 'OVER_RECEIVED'
        if received == ordered and ordered > 0:
            return 'RECEIVED'
        if received > 0:
            return 'PARTIALLY_RECEIVED'
        return 'PENDING'

    def get_receipt_status(self, obj):
        return self.get_receiptStatus(obj)


class PurchaseorderSerializer(serializers.ModelSerializer):
    poNumber = serializers.CharField(source='ponumber', required=False)
    po_number = serializers.CharField(source='ponumber', required=False)
    
    expectedDate = serializers.DateTimeField(source='expecteddate', required=False, allow_null=True)
    expected_date = serializers.DateTimeField(source='expecteddate', required=False, allow_null=True)
    
    supplierId = serializers.CharField(source='supplierid_id', required=False)
    supplier_id = serializers.CharField(source='supplierid_id', required=False)
    
    warehouseId = serializers.CharField(source='warehouseid', required=False, allow_null=True)
    warehouse_id = serializers.CharField(source='warehouseid', required=False, allow_null=True)
    
    netAmount = serializers.FloatField(source='netamount', required=False)
    net_amount = serializers.FloatField(source='netamount', required=False)
    
    totalTax = serializers.FloatField(source='totaltax', required=False)
    total_tax = serializers.FloatField(source='totaltax', required=False)
    
    companyId = serializers.CharField(source='companyid_id', required=False)
    company_id = serializers.CharField(source='companyid_id', required=False)
    
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    items = PurchaseorderitemSerializer(source='purchaseorderitem_set', many=True, required=False)
    
    supplier = serializers.SerializerMethodField(read_only=True)
    supplier_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Purchaseorder
        fields = [
            'id', 'poNumber', 'po_number', 'date', 'expectedDate', 'expected_date',
            'supplierId', 'supplier_id', 'warehouseId', 'warehouse_id',
            'netAmount', 'net_amount', 'totalTax', 'total_tax', 'status', 'remarks',
            'companyId', 'company_id', 'createdAt', 'updatedAt', 'items',
            'supplier', 'supplier_name'
        ]

    def get_supplier(self, obj):
        if obj.supplierid:
            return {
                'id': obj.supplierid.id,
                'name': obj.supplierid.name,
                'address': obj.supplierid.address,
                'gst_number': obj.supplierid.gstnumber,
                'contact_info': obj.supplierid.contactinfo or obj.supplierid.contactperson
            }
        return None

    def get_supplier_name(self, obj):
        if obj.supplierid:
            return obj.supplierid.name
        return None


import re

class LeadFollowUpSerializer(serializers.ModelSerializer):
    leadId = serializers.CharField(source='lead_id')
    nextFollowupDate = serializers.DateTimeField(source='next_followup_date', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    createdBy = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = LeadFollowUp
        fields = ['id', 'leadId', 'type', 'notes', 'nextFollowupDate', 'createdAt', 'createdBy']


class LeadStageHistorySerializer(serializers.ModelSerializer):
    oldStatus = serializers.CharField(source='old_status')
    newStatus = serializers.CharField(source='new_status')
    changedBy = serializers.CharField(source='changed_by.name', read_only=True)
    changedAt = serializers.DateTimeField(source='changed_at', read_only=True)

    class Meta:
        model = LeadStageHistory
        fields = ['id', 'oldStatus', 'newStatus', 'changedBy', 'changedAt']


class LeadSerializer(serializers.ModelSerializer):
    companyName = serializers.CharField(source='company_name', required=False, allow_blank=True, allow_null=True)
    companyId = serializers.CharField(source='companyid_id', required=False)
    assignedTo = serializers.SerializerMethodField()
    assigned_to_id = serializers.CharField(required=False, allow_null=True)
    createdBy = serializers.CharField(source='created_by.name', read_only=True)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    history = LeadFollowUpSerializer(many=True, source='followups', read_only=True)
    stageHistory = LeadStageHistorySerializer(many=True, source='stage_history', read_only=True)
    version = serializers.IntegerField(default=1, required=False)

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'companyName', 'email', 'phone', 'status', 'priority', 'source', 
            'city', 'state', 'pincode',
            'value', 'notes', 'companyId', 'assignedTo', 'assigned_to_id', 'createdBy', 'createdAt', 'updatedAt',
            'version', 'history', 'stageHistory'
        ]

    def get_assignedTo(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.email
        return None

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'assignedTo' in mutable_data:
            val = mutable_data.pop('assignedTo')
            if val in (None, '', 'none', 'Null', 'null'):
                mutable_data['assigned_to_id'] = None
            else:
                user_obj = User.objects.filter(email__iexact=val.strip()).first()
                if user_obj:
                    mutable_data['assigned_to_id'] = user_obj.id
                else:
                    user_by_id = User.objects.filter(pk=val).first()
                    if user_by_id:
                        mutable_data['assigned_to_id'] = user_by_id.id
                    else:
                        mutable_data['assigned_to_id'] = None
        return super().to_internal_value(mutable_data)

    # Serializer Validation
    def validate_version(self, value):
        if value < 1:
            raise serializers.ValidationError("Invalid version number.")
        return value

    def validate_status(self, value):
        valid = [x[0] for x in Lead.STATUS_CHOICES]
        if value not in valid:
            raise serializers.ValidationError("Invalid status.")
        return value

    def validate_phone(self, value):
        if not value or not value.strip():
            return None
        PHONE_REGEX = r'^\+?[0-9]{10,15}$'
        val = value.strip()
        if not re.match(PHONE_REGEX, val):
            raise serializers.ValidationError("Invalid phone number format.")
        return val

    def validate_email(self, value):
        if value and value.strip():
            return value.strip().lower()
        return None

    def validate_value(self, value):
        if value < 0:
            raise serializers.ValidationError("Deal value cannot be negative.")
        return value
