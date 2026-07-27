from django.db import models
from django.utils import timezone


class Company(models.Model):
    id = models.TextField(primary_key=True)
    name = models.TextField(unique=True)
    skuprefix = models.TextField(db_column='skuPrefix', blank=True, null=True)
    active = models.BooleanField()
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)
    stockmethod = models.TextField(db_column='stockMethod')
    settings_json = models.TextField(db_column='settingsJson', blank=True, null=True, default='{}')

    class Meta:
        db_table = 'Company'


class User(models.Model):
    id = models.TextField(primary_key=True)
    email = models.TextField(unique=True)
    name = models.TextField(blank=True, null=True)
    hashedpassword = models.TextField(db_column='hashedPassword')
    role = models.TextField()
    active = models.BooleanField()
    monthlytarget = models.FloatField(db_column='monthlyTarget', blank=True, null=True)
    territory = models.TextField(blank=True, null=True)
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', blank=True, null=True, db_constraint=False)
    createdat = models.DateTimeField(db_column='createdAt', default=timezone.now)
    updatedat = models.DateTimeField(db_column='updatedAt', default=timezone.now)

    class Meta:
        db_table = 'User'


class Warehouse(models.Model):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)
    gstnumber = models.TextField(db_column='gstNumber', blank=True, null=True)
    location = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'Warehouse'
        unique_together = (('name', 'companyid'),)


class Domain(models.Model):
    tenant = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='domains')
    domain = models.CharField(max_length=253)
    is_primary = models.BooleanField(default=True)

    class Meta:
        db_table = 'Domain'


class Userwarehouseaccess(models.Model):
    userid = models.ForeignKey(User, models.DO_NOTHING, db_column='userId', db_constraint=False)
    warehouseid = models.ForeignKey(Warehouse, models.DO_NOTHING, db_column='warehouseId', db_constraint=False)

    class Meta:
        db_table = 'UserWarehouseAccess'


class Broadcast(models.Model):
    id = models.CharField(primary_key=True, max_length=40)
    message = models.TextField()
    target_role = models.CharField(db_column='targetRole', max_length=30, default='ALL')
    author = models.CharField(max_length=100, default='Admin')
    company = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)
    created_at = models.DateTimeField(db_column='createdAt', default=timezone.now)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = 'Broadcast'
        ordering = ['-created_at']
