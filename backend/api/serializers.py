from rest_framework import serializers
from api.models import (
    Company, User, Product, Category, Brand, Unit, Warehouse, Region, Market,
    Dealer, Distributor, Order, Orderitem, Visit, Expense, Bom, Bomitem, Supplier, Labour,
    Purchase, Purchaseitem, Purchaseorder, Purchaseorderitem
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
    companyId = serializers.CharField(source='companyid_id', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'active', 'companyId', 'createdAt', 'updatedAt']


class CategorySerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id')
    parentId = serializers.IntegerField(source='parentid_id', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Category
        fields = ['id', 'name', 'active', 'companyId', 'parentId']


class BrandSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id')
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Brand
        fields = ['id', 'name', 'active', 'companyId']


class UnitSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id')
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Unit
        fields = ['id', 'name', 'active', 'companyId']


class WarehouseSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id')
    gstNumber = serializers.CharField(source='gstnumber', required=False, allow_null=True)
    active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'active', 'companyId', 'gstNumber', 'location']


class RegionSerializer(serializers.ModelSerializer):
    companyId = serializers.CharField(source='companyid_id')
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
    companyId = serializers.CharField(source='companyid_id')
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
    companyId = serializers.CharField(source='companyid_id')
    active = serializers.BooleanField(default=True, required=False)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    class Meta:
        model = Labour
        fields = ['id', 'name', 'dailyWage', 'contactInfo', 'contact_info', 'active', 'companyId', 'createdAt', 'updatedAt']


class ProductSerializer(serializers.ModelSerializer):
    productCode = serializers.CharField(source='productcode')
    bagSize = serializers.CharField(source='bagsize', required=False, default='50kg')
    brandId = serializers.IntegerField(source='brandid_id', required=False, allow_null=True)
    unitId = serializers.IntegerField(source='unitid_id', required=False, allow_null=True)
    companyId = serializers.CharField(source='companyid_id')
    active = serializers.BooleanField(default=True, required=False)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    categoryId = serializers.IntegerField(source='categoryid_id')
    openingStock = serializers.IntegerField(source='openingstock', default=0)
    minimumStock = serializers.IntegerField(source='minimumstock', default=0)
    defaultWarehouseId = serializers.IntegerField(source='defaultwarehouseid', required=False, allow_null=True)
    gst = serializers.FloatField(required=False, default=18.0)
    rate = serializers.FloatField(required=False, default=0.0)
    
    brand = serializers.SerializerMethodField(read_only=True)
    unit = serializers.SerializerMethodField(read_only=True)
    categoryRef = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'productCode', 'name', 'bagSize', 'brandId', 'unitId', 'rate', 'gst', 
            'active', 'companyId', 'createdAt', 'updatedAt', 'categoryId', 'openingStock', 
            'minimumStock', 'defaultWarehouseId', 'brand', 'unit', 'categoryRef'
        ]

    def get_brand(self, obj):
        if obj.brandid:
            return {'id': obj.brandid.id, 'name': obj.brandid.name}
        return None

    def get_unit(self, obj):
        if obj.unitid:
            return {'id': obj.unitid.id, 'name': obj.unitid.name}
        return None

    def get_categoryRef(self, obj):
        if obj.categoryid:
            return {'id': obj.categoryid.id, 'name': obj.categoryid.name}
        return None


class DealerSerializer(serializers.ModelSerializer):
    dealerCode = serializers.CharField(source='dealercode')
    dealerName = serializers.CharField(source='dealername')
    assignedSoEmail = serializers.CharField(source='assignedsoemail')
    distributorName = serializers.CharField(source='distributorname')
    creditLimit = serializers.FloatField(source='creditlimit', default=0.0)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    class Meta:
        model = Dealer
        fields = [
            'id', 'dealerCode', 'dealerName', 'city', 'assignedSoEmail', 'distributorName',
            'creditLimit', 'outstanding', 'active', 'companyId', 'createdAt', 'updatedAt'
        ]


class DistributorSerializer(serializers.ModelSerializer):
    distributorName = serializers.CharField(source='distributorname')
    assignedSoEmail = serializers.CharField(source='assignedsoemail')
    creditLimit = serializers.FloatField(source='creditlimit', default=0.0)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)

    class Meta:
        model = Distributor
        fields = [
            'id', 'distributorName', 'area', 'assignedSoEmail', 'creditLimit',
            'outstanding', 'active', 'companyId', 'createdAt', 'updatedAt'
        ]


class OrderitemSerializer(serializers.ModelSerializer):
    orderId = serializers.CharField(source='orderid_id', required=False)
    productId = serializers.CharField(source='productid_id')
    itemRemark = serializers.CharField(source='itemremark', required=False, allow_blank=True, allow_null=True)
    product = ProductSerializer(source='productid', read_only=True)

    class Meta:
        model = Orderitem
        fields = ['id', 'orderId', 'productId', 'qty', 'price', 'total', 'itemRemark', 'product']


class OrderSerializer(serializers.ModelSerializer):
    orderId = serializers.CharField(source='orderid')
    soEmail = serializers.CharField(source='soemail_id')
    partyType = serializers.CharField(source='partytype')
    partyName = serializers.CharField(source='partyname')
    grandTotal = serializers.FloatField(source='grandtotal')
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    items = OrderitemSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'orderId', 'date', 'soEmail', 'partyType', 'partyName', 'distributor',
            'narration', 'status', 'grandTotal', 'companyId', 'createdAt', 'updatedAt', 'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            Orderitem.objects.create(orderid=order, **item_data)
        return order


class VisitSerializer(serializers.ModelSerializer):
    soEmail = serializers.CharField(source='soemail_id')
    dealerName = serializers.CharField(source='dealername')
    nextFollowup = serializers.DateTimeField(source='nextfollowup', required=False, allow_null=True)
    nextVisitTime = serializers.DateTimeField(source='nextvisittime', required=False, allow_null=True)
    gpsLocation = serializers.CharField(source='gpslocation', required=False, allow_null=True)
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)

    class Meta:
        model = Visit
        fields = [
            'id', 'date', 'soEmail', 'dealerName', 'remarks', 'nextFollowup',
            'nextVisitTime', 'gpsLocation', 'photo', 'companyId', 'createdAt'
        ]


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
    bomId = serializers.CharField(source='bomid_id', required=False)
    materialName = serializers.CharField(source='materialname')

    class Meta:
        model = Bomitem
        fields = ['id', 'bomId', 'materialName', 'qty', 'unit']


class BomSerializer(serializers.ModelSerializer):
    productCode = serializers.CharField(source='productcode')
    companyId = serializers.CharField(source='companyid_id')
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    items = BomitemSerializer(many=True, required=False)

    class Meta:
        model = Bom
        fields = ['id', 'productCode', 'name', 'companyId', 'createdAt', 'updatedAt', 'items']


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
        linked_purchase_ids = Purchase.objects.filter(purchaseorderid=obj.purchaseorderid).values_list('id', flat=True)
        if not linked_purchase_ids:
            return 0

        product_name = obj.productname or ''
        return sum(
            item.qty
            for item in Purchaseitem.objects.filter(
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
