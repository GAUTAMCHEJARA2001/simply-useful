from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from api.models import Lead, LeadFollowUp, Order
from django.core.cache import cache

@receiver(post_save, sender=Lead)
@receiver(post_delete, sender=Lead)
def invalidate_lead_cache(sender, instance, **kwargs):
    from api.services.cache_keys import CRMCacheKeys
    cache.delete(CRMCacheKeys.dashboard(instance.companyid_id))

@receiver(post_save, sender=LeadFollowUp)
@receiver(post_delete, sender=LeadFollowUp)
def invalidate_followup_cache(sender, instance, **kwargs):
    if instance.lead:
        from api.services.cache_keys import CRMCacheKeys
        cache.delete(CRMCacheKeys.dashboard(instance.lead.companyid_id))

@receiver(pre_save, sender=Order)
def log_order_status_event(sender, instance, using=None, **kwargs):
    from api.services.event_logger import log_operational_event
    
    db_name = using or getattr(instance._state, 'db', 'default') or 'default'
    if instance._state.adding:
        # Initial creation event log
        log_operational_event('Order', instance.id, 'None', instance.status, instance.soemail_id, instance.companyid_id, db_name=db_name)
        return
        
    try:
        old_instance = Order.objects.using(db_name).get(pk=instance.pk)
        if old_instance.status != instance.status:
            # Operational transition logged automatically
            log_operational_event('Order', instance.id, old_instance.status, instance.status, instance.soemail_id, instance.companyid_id, db_name=db_name)
    except Order.DoesNotExist:
        pass

@receiver(pre_save, sender=Lead)
def log_lead_status_event(sender, instance, using=None, **kwargs):
    from api.services.event_logger import log_operational_event
    
    db_name = using or getattr(instance._state, 'db', 'default') or 'default'
    if instance._state.adding:
        # Initial creation event log
        log_operational_event('Lead', instance.id, 'None', instance.status, instance.assigned_to_id or 'unassigned', instance.companyid_id)
        return
        
    try:
        old_instance = Lead.objects.using(db_name).get(pk=instance.pk)
        if old_instance.status != instance.status:
            # Operational transition logged automatically
            log_operational_event('Lead', instance.id, old_instance.status, instance.status, instance.assigned_to_id or 'unassigned', instance.companyid_id, db_name=db_name)
    except Lead.DoesNotExist:
        pass

# Cross-Database Product ID Mapper
# This signal intercepts all inventory transaction items and ensures their productId
# is mapped to the target database context. If a cross-database UUID is detected,
# it automatically finds the productcode and replaces it with the local UUID.
from api.models import Orderitem, Purchaseorderitem, Purchaseitem, Stocktransaction, Bomitem, Inventory
@receiver(pre_save, sender=Orderitem)
@receiver(pre_save, sender=Purchaseorderitem)
@receiver(pre_save, sender=Purchaseitem)
@receiver(pre_save, sender=Stocktransaction)
@receiver(pre_save, sender=Bomitem)
@receiver(pre_save, sender=Inventory)
def auto_map_cross_db_product_ids(sender, instance, using=None, **kwargs):
    db = using or getattr(instance._state, 'db', 'default') or 'default'
    if db == 'default': return
    
    pid = getattr(instance, 'productid_id', None)
    if not pid: return
    
    from api.models import Product, Warehouse
    if Product.objects.using(db).filter(id=pid).exists():
        return
        
    for wh in Warehouse.objects.filter(active=True):
        if not wh.db_name or wh.db_name == db: continue
        match = Product.objects.using(wh.db_name).filter(id=pid).first()
        if match and match.productcode:
            correct_p = Product.objects.using(db).filter(productcode=match.productcode).first()
            if correct_p:
                instance.productid_id = correct_p.id
            break
