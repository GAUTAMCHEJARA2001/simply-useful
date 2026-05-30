# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Bom(models.Model):
    id = models.TextField(primary_key=True)
    productcode = models.TextField(db_column='productCode', unique=True)  # Field name made lowercase.
    name = models.TextField()
    companyid = models.ForeignKey('Company', models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'BOM'


class Bomitem(models.Model):
    id = models.TextField(primary_key=True)
    bomid = models.ForeignKey(Bom, models.DO_NOTHING, db_column='bomId')  # Field name made lowercase.
    materialname = models.TextField(db_column='materialName')  # Field name made lowercase.
    qty = models.FloatField()
    unit = models.TextField()

    class Meta:
        managed = False
        db_table = 'BOMItem'


class Brand(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey('Company', models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Brand'
        unique_together = (('name', 'companyid'),)


class Category(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey('Company', models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    parentid = models.ForeignKey('self', models.DO_NOTHING, db_column='parentId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Category'
        unique_together = (('name', 'companyid'),)


class Company(models.Model):
    id = models.TextField(primary_key=True)
    name = models.TextField(unique=True)
    skuprefix = models.TextField(db_column='skuPrefix', blank=True, null=True)  # Field name made lowercase.
    active = models.BooleanField()
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.
    stockmethod = models.TextField(db_column='stockMethod')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Company'


class Dealer(models.Model):
    id = models.TextField(primary_key=True)
    dealercode = models.TextField(db_column='dealerCode', unique=True)  # Field name made lowercase.
    dealername = models.TextField(db_column='dealerName')  # Field name made lowercase.
    city = models.TextField()
    assignedsoemail = models.TextField(db_column='assignedSoEmail')  # Field name made lowercase.
    distributorname = models.TextField(db_column='distributorName')  # Field name made lowercase.
    creditlimit = models.FloatField(db_column='creditLimit')  # Field name made lowercase.
    outstanding = models.FloatField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Dealer'


class Distributor(models.Model):
    id = models.TextField(primary_key=True)
    distributorname = models.TextField(db_column='distributorName', unique=True)  # Field name made lowercase.
    area = models.TextField()
    assignedsoemail = models.TextField(db_column='assignedSoEmail')  # Field name made lowercase.
    creditlimit = models.FloatField(db_column='creditLimit')  # Field name made lowercase.
    outstanding = models.FloatField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Distributor'


class Expense(models.Model):
    id = models.TextField(primary_key=True)
    date = models.DateTimeField()
    soemail = models.ForeignKey('User', models.DO_NOTHING, db_column='soEmail', to_field='email')  # Field name made lowercase.
    category = models.TextField()
    amount = models.FloatField()
    remarks = models.TextField()
    status = models.TextField()
    photo = models.TextField(blank=True, null=True)
    rejectreason = models.TextField(db_column='rejectReason', blank=True, null=True)  # Field name made lowercase.
    declaration = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Expense'


class Inventory(models.Model):
    productid = models.ForeignKey('Product', models.DO_NOTHING, db_column='productId')  # Field name made lowercase.
    warehouseid = models.ForeignKey('Warehouse', models.DO_NOTHING, db_column='warehouseId')  # Field name made lowercase.
    quantity = models.IntegerField()
    avgcost = models.FloatField(db_column='avgCost')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Inventory'
        unique_together = (('productid', 'warehouseid'),)


class Labour(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    dailywage = models.FloatField(db_column='dailyWage', default=0.0)
    contactinfo = models.TextField(db_column='contactInfo', blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Labour'
        unique_together = (('name', 'companyid'),)


class Market(models.Model):
    name = models.TextField(unique=True)
    active = models.BooleanField()
    regionid = models.ForeignKey('Region', models.DO_NOTHING, db_column='regionId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Market'


class Order(models.Model):
    id = models.TextField(primary_key=True)
    orderid = models.TextField(db_column='orderId', unique=True)  # Field name made lowercase.
    date = models.DateTimeField()
    soemail = models.ForeignKey('User', models.DO_NOTHING, db_column='soEmail', to_field='email')  # Field name made lowercase.
    partytype = models.TextField(db_column='partyType')  # Field name made lowercase.
    partyname = models.TextField(db_column='partyName')  # Field name made lowercase.
    distributor = models.TextField()
    narration = models.TextField(blank=True, null=True)
    status = models.TextField()
    grandtotal = models.FloatField(db_column='grandTotal')  # Field name made lowercase.
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Order'


class Orderitem(models.Model):
    id = models.TextField(primary_key=True)
    orderid = models.ForeignKey(Order, models.DO_NOTHING, db_column='orderId')  # Field name made lowercase.
    productid = models.ForeignKey('Product', models.DO_NOTHING, db_column='productId')  # Field name made lowercase.
    qty = models.IntegerField()
    price = models.FloatField()
    total = models.FloatField()
    itemremark = models.TextField(db_column='itemRemark', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'OrderItem'


class Product(models.Model):
    id = models.TextField(primary_key=True)
    productcode = models.TextField(db_column='productCode', unique=True)  # Field name made lowercase.
    name = models.TextField()
    bagsize = models.TextField(db_column='bagSize')  # Field name made lowercase.
    brandid = models.ForeignKey(Brand, models.DO_NOTHING, db_column='brandId', blank=True, null=True)  # Field name made lowercase.
    unitid = models.ForeignKey('Unit', models.DO_NOTHING, db_column='unitId', blank=True, null=True)  # Field name made lowercase.
    rate = models.FloatField()
    gst = models.FloatField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.
    categoryid = models.ForeignKey(Category, models.DO_NOTHING, db_column='categoryId')  # Field name made lowercase.
    openingstock = models.IntegerField(db_column='openingStock')  # Field name made lowercase.
    minimumstock = models.IntegerField(db_column='minimumStock')  # Field name made lowercase.
    defaultwarehouseid = models.IntegerField(db_column='defaultWarehouseId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Product'


class Purchase(models.Model):
    id = models.TextField(primary_key=True)
    purchaseid = models.TextField(db_column='purchaseId', unique=True)  # Field name made lowercase.
    date = models.DateTimeField()
    vendorname = models.TextField(db_column='vendorName')  # Field name made lowercase.
    grandtotal = models.FloatField(db_column='grandTotal')  # Field name made lowercase.
    status = models.TextField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.
    supplierid = models.ForeignKey('Supplier', models.DO_NOTHING, db_column='supplierId', blank=True, null=True)  # Field name made lowercase.
    challannumber = models.TextField(db_column='challanNumber', blank=True, null=True)
    vehiclenumber = models.TextField(db_column='vehicleNumber', blank=True, null=True)
    totaltax = models.FloatField(db_column='totalTax', blank=True, null=True)
    purchaseorderid = models.ForeignKey('Purchaseorder', models.DO_NOTHING, db_column='purchaseOrderId', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Purchase'


class Purchaseitem(models.Model):
    id = models.TextField(primary_key=True)
    purchaseid = models.ForeignKey(Purchase, models.DO_NOTHING, db_column='purchaseId')  # Field name made lowercase.
    productname = models.TextField(db_column='productName')  # Field name made lowercase.
    qty = models.IntegerField()
    rate = models.FloatField()
    total = models.FloatField()

    class Meta:
        managed = False
        db_table = 'PurchaseItem'


class Purchaseorder(models.Model):
    id = models.TextField(primary_key=True)
    ponumber = models.TextField(db_column='poNumber', unique=True)  # Field name made lowercase.
    date = models.DateTimeField()
    expecteddate = models.DateTimeField(db_column='expectedDate', blank=True, null=True)  # Field name made lowercase.
    supplierid = models.ForeignKey('Supplier', models.DO_NOTHING, db_column='supplierId')  # Field name made lowercase.
    warehouseid = models.TextField(db_column='warehouseId', blank=True, null=True)  # Field name made lowercase.
    netamount = models.FloatField(db_column='netAmount')  # Field name made lowercase.
    totaltax = models.FloatField(db_column='totalTax')  # Field name made lowercase.
    status = models.TextField()
    remarks = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'PurchaseOrder'


class Purchaseorderitem(models.Model):
    id = models.TextField(primary_key=True)
    purchaseorderid = models.ForeignKey(Purchaseorder, models.DO_NOTHING, db_column='purchaseOrderId')  # Field name made lowercase.
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId')  # Field name made lowercase.
    productname = models.TextField(db_column='productName')  # Field name made lowercase.
    quantity = models.IntegerField()
    rate = models.FloatField()
    tax_percent = models.FloatField()
    linetotal = models.FloatField(db_column='lineTotal')  # Field name made lowercase.
    remark = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'PurchaseOrderItem'


class Refreshtoken(models.Model):
    id = models.TextField(primary_key=True)
    token = models.TextField(unique=True)
    userid = models.TextField(db_column='userId')  # Field name made lowercase.
    expiresat = models.DateTimeField(db_column='expiresAt')  # Field name made lowercase.
    revoked = models.BooleanField()
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'RefreshToken'


class Region(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Region'
        unique_together = (('name', 'companyid'),)


class Stockbatch(models.Model):
    id = models.TextField(primary_key=True)
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId')  # Field name made lowercase.
    warehouseid = models.ForeignKey('Warehouse', models.DO_NOTHING, db_column='warehouseId')  # Field name made lowercase.
    quantity = models.IntegerField()
    remaining = models.IntegerField()
    cost = models.FloatField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
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
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Supplier'


class Unit(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Unit'
        unique_together = (('name', 'companyid'),)


class User(models.Model):
    id = models.TextField(primary_key=True)
    email = models.TextField(unique=True)
    name = models.TextField(blank=True, null=True)
    hashedpassword = models.TextField(db_column='hashedPassword')  # Field name made lowercase.
    role = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', blank=True, null=True)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'User'


class Userproductaccess(models.Model):
    userid = models.ForeignKey(User, models.DO_NOTHING, db_column='userId')  # Field name made lowercase.
    brandid = models.ForeignKey(Brand, models.DO_NOTHING, db_column='brandId', blank=True, null=True)  # Field name made lowercase.
    categoryid = models.ForeignKey(Category, models.DO_NOTHING, db_column='categoryId', blank=True, null=True)  # Field name made lowercase.
    productid = models.ForeignKey(Product, models.DO_NOTHING, db_column='productId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'UserProductAccess'


class Userwarehouseaccess(models.Model):
    userid = models.ForeignKey(User, models.DO_NOTHING, db_column='userId')  # Field name made lowercase.
    warehouseid = models.ForeignKey('Warehouse', models.DO_NOTHING, db_column='warehouseId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'UserWarehouseAccess'


class Visit(models.Model):
    id = models.TextField(primary_key=True)
    date = models.DateTimeField()
    soemail = models.ForeignKey(User, models.DO_NOTHING, db_column='soEmail', to_field='email')  # Field name made lowercase.
    dealername = models.TextField(db_column='dealerName')  # Field name made lowercase.
    remarks = models.TextField()
    nextfollowup = models.DateTimeField(db_column='nextFollowup', blank=True, null=True)  # Field name made lowercase.
    nextvisittime = models.DateTimeField(db_column='nextVisitTime', blank=True, null=True)  # Field name made lowercase.
    gpslocation = models.TextField(db_column='gpsLocation', blank=True, null=True)  # Field name made lowercase.
    photo = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Visit'


class Warehouse(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId')  # Field name made lowercase.
    gstnumber = models.TextField(db_column='gstNumber', blank=True, null=True)  # Field name made lowercase.
    location = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Warehouse'
        unique_together = (('name', 'companyid'),)
