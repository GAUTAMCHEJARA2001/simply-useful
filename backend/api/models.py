# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models
from django.utils import timezone
from decimal import Decimal
from core.models import Company, User, Warehouse, Userwarehouseaccess


class Bom(models.Model):
    id = models.TextField(primary_key=True)
    productcode = models.TextField(db_column='productCode', unique=True)  # Field name made lowercase.
    name = models.TextField()
    companyid = models.ForeignKey('core.Company', models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.
    outputquantity = models.FloatField(db_column='outputQuantity', default=1.0, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        db_table = 'BOM'


class Bomitem(models.Model):
    id = models.TextField(primary_key=True)
    bomid = models.ForeignKey(Bom, models.DO_NOTHING, db_column='bomId', db_constraint=False)  # Field name made lowercase.
    materialname = models.TextField(db_column='materialName')  # Field name made lowercase.
    qty = models.FloatField()
    unit = models.TextField()

    class Meta:
        db_table = 'BOMItem'


class Brand(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey('core.Company', models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.

    class Meta:
        db_table = 'Brand'
        unique_together = (('name', 'companyid'),)


class Category(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey('core.Company', models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    parentid = models.ForeignKey('self', models.DO_NOTHING, db_column='parentId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.

    class Meta:
        db_table = 'Category'
        unique_together = (('name', 'companyid'),)




class Dealer(models.Model):
    id = models.TextField(primary_key=True)
    dealercode = models.TextField(db_column='dealerCode')  # Field name made lowercase.
    dealername = models.TextField(db_column='dealerName')  # Field name made lowercase.
    city = models.TextField()
    assignedsoemail = models.TextField(db_column='assignedSoEmail')  # Field name made lowercase.
    distributorname = models.TextField(db_column='distributorName', blank=True, null=True)  # Field name made lowercase.
    creditlimit = models.DecimalField(db_column='creditLimit', max_digits=14, decimal_places=2, default=Decimal('0.00'))  # Field name made lowercase.
    outstanding = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    active = models.BooleanField()
    territory = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.
    converted_lead = models.OneToOneField(
        'Lead',
        models.SET_NULL,
        db_column='convertedLeadId',
        blank=True,
        null=True,
        related_name='converted_dealer',
        db_constraint=False
    )

    class Meta:
        db_table = 'Dealer'
        constraints = [
            models.UniqueConstraint(fields=['dealercode', 'companyid'], name='unique_dealer_per_company')
        ]


class Distributor(models.Model):
    id = models.TextField(primary_key=True)
    distributorname = models.TextField(db_column='distributorName')  # Field name made lowercase.
    area = models.TextField()
    assignedsoemail = models.TextField(db_column='assignedSoEmail')  # Field name made lowercase.
    creditlimit = models.DecimalField(db_column='creditLimit', max_digits=14, decimal_places=2, default=Decimal('0.00'))  # Field name made lowercase.
    outstanding = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    active = models.BooleanField()
    territory = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'Distributor'
        constraints = [
            models.UniqueConstraint(fields=['distributorname', 'companyid'], name='unique_distributor_per_company')
        ]


class Expense(models.Model):
    id = models.TextField(primary_key=True)
    date = models.DateTimeField()
    soemail = models.ForeignKey('core.User', models.DO_NOTHING, db_column='soEmail', to_field='email', db_constraint=False)  # Field name made lowercase.
    category = models.TextField()
    amount = models.FloatField()
    remarks = models.TextField()
    status = models.TextField()
    photo = models.TextField(blank=True, null=True)
    rejectreason = models.TextField(db_column='rejectReason', blank=True, null=True)  # Field name made lowercase.
    declaration = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'Expense'


class Inventory(models.Model):
    productid = models.ForeignKey('Product', models.DO_NOTHING, db_column='productId', db_constraint=False)  # Field name made lowercase.
    warehouseid = models.ForeignKey('core.Warehouse', models.DO_NOTHING, db_column='warehouseId', db_constraint=False)  # Field name made lowercase.
    quantity = models.IntegerField()
    avgcost = models.FloatField(db_column='avgCost')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'Inventory'
        unique_together = (('productid', 'warehouseid'),)


class Labour(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    dailywage = models.FloatField(db_column='dailyWage', default=0.0)
    contactinfo = models.TextField(db_column='contactInfo', blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'Labour'
        unique_together = (('name', 'companyid'),)


class Market(models.Model):
    name = models.TextField(unique=True)
    active = models.BooleanField()
    regionid = models.ForeignKey('Region', models.DO_NOTHING, db_column='regionId', db_constraint=False)  # Field name made lowercase.

    class Meta:
        db_table = 'Market'


class Order(models.Model):
    id = models.TextField(primary_key=True)
    orderid = models.TextField(db_column='orderId', unique=True)  # Field name made lowercase.
    date = models.DateTimeField()
    soemail = models.ForeignKey('core.User', models.DO_NOTHING, db_column='soEmail', to_field='email', db_constraint=False)  # Field name made lowercase.
    partytype = models.TextField(db_column='partyType')  # Field name made lowercase.
    partyname = models.TextField(db_column='partyName')  # Field name made lowercase.
    distributor = models.TextField()
    narration = models.TextField(blank=True, null=True)
    status = models.TextField()
    grandtotal = models.FloatField(db_column='grandTotal')  # Field name made lowercase.
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.
    invoicenumber = models.TextField(db_column='invoiceNumber', blank=True, null=True)
    vehiclenumber = models.TextField(db_column='vehicleNumber', blank=True, null=True)
    drivername = models.TextField(db_column='driverName', blank=True, null=True)
    drivermobile = models.TextField(db_column='driverMobile', blank=True, null=True)
    dispatchwarehouse = models.TextField(db_column='dispatchWarehouse', blank=True, null=True)
    dispatchdate = models.TextField(db_column='dispatchDate', blank=True, null=True)

    class Meta:
        db_table = 'Order'


class Orderitem(models.Model):
    id = models.TextField(primary_key=True)
    orderid = models.ForeignKey(Order, models.DO_NOTHING, db_column='orderId', db_constraint=False)  # Field name made lowercase.
    productid = models.ForeignKey('Product', models.DO_NOTHING, db_column='productId', db_constraint=False)  # Field name made lowercase.
    qty = models.IntegerField()
    sentqty = models.IntegerField(db_column='sentQty', default=0)
    returnedqty = models.IntegerField(db_column='returnedQty', default=0)
    price = models.FloatField()
    total = models.FloatField()
    itemremark = models.TextField(db_column='itemRemark', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        db_table = 'OrderItem'


class Dispatchlog(models.Model):
    id = models.TextField(primary_key=True)
    orderid = models.ForeignKey(Order, models.DO_NOTHING, db_column='orderId', db_constraint=False)
    dispatchdate = models.DateTimeField(db_column='dispatchDate', default=timezone.now)
    invoicenumber = models.TextField(db_column='invoiceNumber', blank=True, null=True)
    vehiclenumber = models.TextField(db_column='vehicleNumber', blank=True, null=True)
    drivername = models.TextField(db_column='driverName', blank=True, null=True)
    drivermobile = models.TextField(db_column='driverMobile', blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)

    class Meta:
        db_table = 'DispatchLog'


class Dispatchlogitem(models.Model):
    id = models.TextField(primary_key=True)
    dispatchlogid = models.ForeignKey(Dispatchlog, models.DO_NOTHING, db_column='dispatchLogId', db_constraint=False, related_name='items')
    productid = models.ForeignKey('Product', models.DO_NOTHING, db_column='productId', db_constraint=False)
    qty = models.IntegerField()

    class Meta:
        db_table = 'DispatchLogItem'


class Returnlog(models.Model):
    id = models.TextField(primary_key=True)
    orderid = models.ForeignKey(Order, models.DO_NOTHING, db_column='orderId', db_constraint=False)
    returndate = models.DateTimeField(db_column='returnDate', default=timezone.now)
    remarks = models.TextField(blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)

    class Meta:
        db_table = 'ReturnLog'


class Returnlogitem(models.Model):
    id = models.TextField(primary_key=True)
    returnlogid = models.ForeignKey(Returnlog, models.DO_NOTHING, db_column='returnLogId', db_constraint=False, related_name='items')
    productid = models.ForeignKey('Product', models.DO_NOTHING, db_column='productId', db_constraint=False)
    qty = models.IntegerField()

    class Meta:
        db_table = 'ReturnLogItem'


class Product(models.Model):
    id = models.TextField(primary_key=True)
    productcode = models.TextField(db_column='productCode')  # Field name made lowercase.
    name = models.TextField()
    bagsize = models.TextField(db_column='bagSize')  # Field name made lowercase.
    brandid = models.ForeignKey(Brand, models.DO_NOTHING, db_column='brandId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.
    unitid = models.ForeignKey('Unit', models.DO_NOTHING, db_column='unitId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.
    rate = models.FloatField()
    gst = models.FloatField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.
    categoryid = models.ForeignKey(Category, models.DO_NOTHING, db_column='categoryId', db_constraint=False)  # Field name made lowercase.
    openingstock = models.IntegerField(db_column='openingStock')  # Field name made lowercase.
    minimumstock = models.IntegerField(db_column='minimumStock')  # Field name made lowercase.

    class Meta:
        db_table = 'Product'
        constraints = [
            models.UniqueConstraint(fields=['productcode', 'companyid'], name='unique_product_per_company')
        ]


class Purchase(models.Model):
    id = models.TextField(primary_key=True)
    purchaseid = models.TextField(db_column='purchaseId', unique=True)  # Field name made lowercase.
    date = models.DateTimeField()
    vendorname = models.TextField(db_column='vendorName')  # Field name made lowercase.
    grandtotal = models.FloatField(db_column='grandTotal')  # Field name made lowercase.
    status = models.TextField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.
    supplierid = models.ForeignKey('Supplier', models.DO_NOTHING, db_column='supplierId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.
    challannumber = models.TextField(db_column='challanNumber', blank=True, null=True)
    vehiclenumber = models.TextField(db_column='vehicleNumber', blank=True, null=True)
    totaltax = models.FloatField(db_column='totalTax', blank=True, null=True)
    purchaseorderid = models.ForeignKey('Purchaseorder', models.DO_NOTHING, db_column='purchaseOrderId', blank=True, null=True, db_constraint=False)
    warehouseid = models.ForeignKey('core.Warehouse', models.DO_NOTHING, db_column='warehouseId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.
    narration = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'Purchase'


class Purchaseitem(models.Model):
    id = models.TextField(primary_key=True)
    purchaseid = models.ForeignKey(Purchase, models.DO_NOTHING, db_column='purchaseId', db_constraint=False)  # Field name made lowercase.
    productname = models.TextField(db_column='productName')  # Field name made lowercase.
    qty = models.IntegerField()
    rate = models.FloatField()
    total = models.FloatField()

    class Meta:
        db_table = 'PurchaseItem'


class Purchaseorder(models.Model):
    id = models.TextField(primary_key=True)
    ponumber = models.TextField(db_column='poNumber', unique=True)  # Field name made lowercase.
    date = models.DateTimeField()
    expecteddate = models.DateTimeField(db_column='expectedDate', blank=True, null=True)  # Field name made lowercase.
    supplierid = models.ForeignKey('Supplier', models.DO_NOTHING, db_column='supplierId', db_constraint=False)  # Field name made lowercase.
    warehouseid = models.TextField(db_column='warehouseId', blank=True, null=True)  # Field name made lowercase.
    netamount = models.FloatField(db_column='netAmount')  # Field name made lowercase.
    totaltax = models.FloatField(db_column='totalTax')  # Field name made lowercase.
    status = models.TextField()
    remarks = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'PurchaseOrder'


class Purchaseorderitem(models.Model):
    id = models.TextField(primary_key=True)
    purchaseorderid = models.ForeignKey(Purchaseorder, models.DO_NOTHING, db_column='purchaseOrderId', db_constraint=False)  # Field name made lowercase.
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId', db_constraint=False)  # Field name made lowercase.
    productname = models.TextField(db_column='productName')  # Field name made lowercase.
    quantity = models.IntegerField()
    rate = models.FloatField()
    tax_percent = models.FloatField()
    linetotal = models.FloatField(db_column='lineTotal')  # Field name made lowercase.
    remark = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'PurchaseOrderItem'


class Refreshtoken(models.Model):
    id = models.TextField(primary_key=True)
    token = models.TextField(unique=True)
    userid = models.TextField(db_column='userId')  # Field name made lowercase.
    expiresat = models.DateTimeField(db_column='expiresAt')  # Field name made lowercase.
    revoked = models.BooleanField()
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'RefreshToken'


class Region(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.

    class Meta:
        db_table = 'Region'
        unique_together = (('name', 'companyid'),)


class Stockbatch(models.Model):
    id = models.TextField(primary_key=True)
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId', db_constraint=False)  # Field name made lowercase.
    warehouseid = models.ForeignKey('core.Warehouse', models.DO_NOTHING, db_column='warehouseId', db_constraint=False)  # Field name made lowercase.
    quantity = models.IntegerField()
    remaining = models.IntegerField()
    cost = models.FloatField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'StockBatch'


class Supplier(models.Model):
    id = models.TextField(primary_key=True)
    name = models.TextField()
    contactperson = models.TextField(db_column='contactPerson', blank=True, null=True)  # Field name made lowercase.
    contactinfo = models.TextField(db_column='contactInfo', blank=True, null=True)  # Field name made lowercase.
    email = models.TextField(blank=True, null=True)
    gstnumber = models.TextField(db_column='gstNumber', blank=True, null=True)  # Field name made lowercase.
    address = models.TextField(blank=True, null=True)
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'Supplier'


class Unit(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.

    class Meta:
        db_table = 'Unit'
        unique_together = (('name', 'companyid'),)




class Userproductaccess(models.Model):
    userid = models.ForeignKey(User, models.DO_NOTHING, db_column='userId', db_constraint=False)  # Field name made lowercase.
    brandid = models.ForeignKey(Brand, models.DO_NOTHING, db_column='brandId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.
    categoryid = models.ForeignKey(Category, models.DO_NOTHING, db_column='categoryId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId', blank=True, null=True, db_constraint=False)  # Field name made lowercase.

    class Meta:
        db_table = 'UserProductAccess'


from core.models import Userwarehouseaccess


class Visit(models.Model):
    id = models.TextField(primary_key=True)
    date = models.DateTimeField()
    soemail = models.ForeignKey(User, models.DO_NOTHING, db_column='soEmail', to_field='email', db_constraint=False)  # Field name made lowercase.
    dealername = models.TextField(db_column='dealerName')  # Field name made lowercase.
    remarks = models.TextField()
    nextfollowup = models.DateTimeField(db_column='nextFollowup', blank=True, null=True)  # Field name made lowercase.
    nextvisittime = models.DateTimeField(db_column='nextVisitTime', blank=True, null=True)  # Field name made lowercase.
    gpslocation = models.TextField(db_column='gpsLocation', blank=True, null=True)  # Field name made lowercase.
    photo = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)  # Field name made lowercase.
    lead = models.ForeignKey('Lead', models.DO_NOTHING, db_column='leadId', blank=True, null=True, db_constraint=False)
    visit_status = models.CharField(db_column='visitStatus', max_length=20, default='PENDING')
    hr_remark = models.TextField(db_column='hrRemark', blank=True, null=True)
    verified_by = models.CharField(db_column='verifiedBy', max_length=100, blank=True, null=True)
    verified_at = models.DateTimeField(db_column='verifiedAt', blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)  # Field name made lowercase.

    class Meta:
        db_table = 'Visit'




class ActiveLeadManager(models.Manager):
    def get_queryset(self):
        # Override to automatically exclude soft-deleted leads globally
        return super().get_queryset().filter(is_deleted=False)


class Lead(models.Model):
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('CONTACTED', 'Contacted'),
        ('PROPOSAL', 'Proposal'),
        ('NEGOTIATION', 'Negotiation'),
        ('WON', 'Won'),
        ('LOST', 'Lost'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    id = models.CharField(primary_key=True, max_length=30)
    name = models.CharField(max_length=255)  # Contact Person Name
    company_name = models.CharField(db_column='companyName', max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    source = models.CharField(max_length=100, blank=True, null=True)  # cold call, referral, etc.
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))  # High-precision financial value
    notes = models.TextField(blank=True, null=True)  # Primary lead requirements/notes
    is_deleted = models.BooleanField(db_column='isDeleted', default=False)
    companyid = models.ForeignKey('core.Company', models.DO_NOTHING, db_column='companyId', db_constraint=False)
    assigned_to = models.ForeignKey('core.User', models.DO_NOTHING, db_column='assignedTo', blank=True, null=True, related_name='assigned_leads', db_constraint=False)
    created_by = models.ForeignKey('core.User', models.DO_NOTHING, db_column='createdBy', related_name='created_leads', db_constraint=False)
    updated_by = models.ForeignKey('core.User', models.DO_NOTHING, db_column='updatedBy', related_name='updated_leads', blank=True, null=True, db_constraint=False)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)
    version = models.PositiveIntegerField(default=1, db_index=True)

    # Active Manager handles non-archived leads, standard objects manager preserved for raw access
    objects = ActiveLeadManager()
    all_objects = models.Manager()

    class Meta:
        db_table = 'Lead'
        ordering = ['-updatedat']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['assigned_to', 'is_deleted']),  # Composite index for RBAC
            models.Index(fields=['createdat']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['companyid', 'status', 'priority']),
            models.Index(fields=['companyid', 'assigned_to']),
            models.Index(fields=['companyid', 'updatedat']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(name=''),
                name='lead_name_not_empty'
            ),
            models.CheckConstraint(
                condition=models.Q(version__gte=1),
                name='lead_version_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(value__gte=0),
                name='lead_value_non_negative'
            ),
            models.UniqueConstraint(
                fields=['companyid', 'email'],
                condition=models.Q(is_deleted=False) & ~models.Q(email=None) & ~models.Q(email=''),
                name='unique_active_lead_email_per_company'
            ),
            models.UniqueConstraint(
                fields=['companyid', 'phone'],
                condition=models.Q(is_deleted=False) & ~models.Q(phone=None) & ~models.Q(phone=''),
                name='unique_active_lead_phone_per_company'
            )
        ]


class LeadFollowUp(models.Model):
    FOLLOWUP_TYPES = [
        ('CALL', 'Call'),
        ('EMAIL', 'Email'),
        ('VISIT', 'Visit'),
        ('MEETING', 'Meeting'),
    ]

    id = models.CharField(primary_key=True, max_length=30)
    lead = models.ForeignKey(Lead, models.CASCADE, db_column='leadId', related_name='followups', db_constraint=False)
    type = models.CharField(max_length=20, choices=FOLLOWUP_TYPES)
    notes = models.TextField()  # Activity outcome summary
    next_followup_date = models.DateTimeField(db_column='nextFollowupDate', blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)
    created_by = models.ForeignKey('core.User', models.DO_NOTHING, db_column='createdBy', related_name='followup_logs', blank=True, null=True, db_constraint=False)

    class Meta:
        db_table = 'LeadFollowUp'
        ordering = ['-createdat']
        indexes = [
            models.Index(fields=['lead', 'next_followup_date']),
            models.Index(fields=['createdat']),
            models.Index(fields=['next_followup_date'], name='lead_followup_due_idx'),
        ]


class LeadStageHistory(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    lead = models.ForeignKey(Lead, models.CASCADE, db_column='leadId', related_name='stage_history', db_constraint=False)
    old_status = models.CharField(db_column='oldStatus', max_length=20, choices=Lead.STATUS_CHOICES)
    new_status = models.CharField(db_column='newStatus', max_length=20, choices=Lead.STATUS_CHOICES)
    changed_by = models.ForeignKey('core.User', models.DO_NOTHING, db_column='changedBy', db_constraint=False)
    changed_at = models.DateTimeField(db_column='changedAt', default=timezone.now)

    class Meta:
        db_table = 'LeadStageHistory'
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['changed_at']),
        ]


class Stocktransaction(models.Model):
    id = models.TextField(primary_key=True)
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId', db_constraint=False)
    warehouseid = models.ForeignKey('core.Warehouse', models.DO_NOTHING, db_column='warehouseId', blank=True, null=True, db_constraint=False)
    transactiontype = models.TextField(db_column='transactionType')
    quantity = models.FloatField()
    referenceid = models.TextField(db_column='referenceId', blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)

    class Meta:
        db_table = 'StockTransaction'
