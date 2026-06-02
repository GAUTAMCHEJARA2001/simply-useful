from rest_framework import serializers
from api.models import (
    Company, User, Product, Category, Brand, Unit, Warehouse, Region, Market,
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

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'active', 'companyId', 'createdAt', 'updatedAt', 'territory']


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
    productCode = serializers.CharField(source='productcode', required=False)
    productName = serializers.CharField(source='name', read_only=True)
    bagSize = serializers.CharField(source='bagsize', required=False, default='50kg')
    brandId = serializers.IntegerField(source='brandid_id', required=False, allow_null=True)
    unitId = serializers.IntegerField(source='unitid_id', required=False, allow_null=True)
    companyId = serializers.CharField(source='companyid_id', required=False)
    active = serializers.BooleanField(default=True, required=False)
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)
    updatedAt = serializers.DateTimeField(source='updatedat', read_only=True)
    categoryId = serializers.IntegerField(source='categoryid_id', required=False, allow_null=True)
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
            'id', 'productCode', 'name', 'productName', 'bagSize', 'brandId', 'unitId', 'rate', 'gst', 
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
            'creditLimit', 'outstanding', 'active', 'companyId', 'createdAt', 'updatedAt', 'territory'
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
            'outstanding', 'active', 'companyId', 'createdAt', 'updatedAt', 'territory'
        ]


class OrderitemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
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
    items = OrderitemSerializer(many=True, required=False, source='orderitem_set')

    class Meta:
        model = Order
        fields = [
            'id', 'orderId', 'date', 'soEmail', 'partyType', 'partyName', 'distributor',
            'narration', 'status', 'grandTotal', 'companyId', 'createdAt', 'updatedAt', 'items'
        ]

    def create(self, validated_data):
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
    createdAt = serializers.DateTimeField(source='createdat', read_only=True)

    class Meta:
        model = Visit
        fields = [
            'id', 'date', 'soEmail', 'dealerName', 'remarks', 'nextFollowup',
            'nextVisitTime', 'gpsLocation', 'photo', 'companyId', 'createdAt'
        ]

    def to_internal_value(self, data):
        # Coerce empty string datetime fields to None to avoid format validation errors
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in ('nextFollowup', 'nextVisitTime', 'nextfollowup', 'nextvisittime'):
            if field in mutable and mutable[field] == '':
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
        prod = Product.objects.filter(name=obj.materialname).first()
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
        prod = Product.objects.filter(productcode=obj.productcode).first()
        return prod.id if prod else ""

    def get_productName(self, obj):
        from api.models import Product
        prod = Product.objects.filter(productcode=obj.productcode).first()
        return prod.name if prod else ""

    def validate(self, data):
        product_id = self.initial_data.get('productId') or self.initial_data.get('product_id')
        if product_id:
            try:
                from api.models import Product
                prod = Product.objects.get(id=product_id)
                data['productcode'] = prod.productcode
            except Product.DoesNotExist:
                raise serializers.ValidationError({"productId": "Product not found"})
        elif not data.get('productcode'):
            raise serializers.ValidationError({"productCode": "This field is required."})
        return data

    def create(self, validated_data):
        from django.utils import timezone
        now = timezone.now()
        validated_data['createdat'] = now
        validated_data['updatedat'] = now

        items_data = validated_data.pop('bomitem_set', validated_data.pop('items', []))
        bom = Bom.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('productName', None)
            item_data.pop('quantity', None)
            item_data.pop('id', None)
            item_data.pop('bomid_id', None)
            item_data.pop('bomid', None)
            import uuid
            item_id = 'c' + uuid.uuid4().hex[:23]
            Bomitem.objects.create(id=item_id, bomid=bom, **item_data)
        return bom

    def update(self, instance, validated_data):
        from django.utils import timezone
        now = timezone.now()
        validated_data['updatedat'] = now

        items_data = validated_data.pop('bomitem_set', validated_data.pop('items', None))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            Bomitem.objects.filter(bomid=instance).delete()
            for item_data in items_data:
                item_data.pop('productName', None)
                item_data.pop('quantity', None)
                item_data.pop('id', None)
                item_data.pop('bomid_id', None)
                item_data.pop('bomid', None)
                import uuid
                item_id = 'c' + uuid.uuid4().hex[:23]
                Bomitem.objects.create(id=item_id, bomid=instance, **item_data)
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
