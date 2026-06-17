from django.db import models
from django.utils import timezone
from django_tenants.models import TenantMixin, DomainMixin

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


class Warehouse(TenantMixin):
    name = models.TextField()
    active = models.BooleanField()
    companyid = models.ForeignKey(Company, models.DO_NOTHING, db_column='companyId', db_constraint=False)
    gstnumber = models.TextField(db_column='gstNumber', blank=True, null=True)
    location = models.TextField(blank=True, null=True)
    
    # Maintain legacy fields for compatibility
    db_name = models.CharField(max_length=100, blank=True, null=True)
    db_host = models.CharField(max_length=200, blank=True, null=True)
    db_port = models.IntegerField(blank=True, null=True)

    auto_create_schema = True

    class Meta:
        db_table = 'Warehouse'
        unique_together = (('name', 'companyid'),)


class Domain(DomainMixin):
    class Meta:
        db_table = 'Domain'


class Userwarehouseaccess(models.Model):
    userid = models.ForeignKey(User, models.DO_NOTHING, db_column='userId', db_constraint=False)
    warehouseid = models.ForeignKey(Warehouse, models.DO_NOTHING, db_column='warehouseId', db_constraint=False)

    class Meta:
        db_table = 'UserWarehouseAccess'


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Warehouse)
def create_warehouse_domain(sender, instance, created, **kwargs):
    if created:
        schema = instance.schema_name or f"wh_{instance.id}"
        domain_name = f"{schema}.localhost"
        Domain.objects.get_or_create(
            tenant=instance,
            defaults={
                'domain': domain_name,
                'is_primary': True
            }
        )
    # Dynamically register the new warehouse database alias in django settings
    try:
        from api.db_router import setup_dynamic_tenant_databases
        setup_dynamic_tenant_databases()
    except Exception:
        pass


