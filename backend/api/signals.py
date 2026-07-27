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
def log_order_status_event(sender, instance, **kwargs):
    from api.services.event_logger import log_operational_event
    
    if instance._state.adding:
        log_operational_event('Order', instance.id, 'None', instance.status, instance.soemail_id, instance.companyid_id)
        
        try:
            from api.push_service import broadcast_push_to_role
            short_id = str(instance.id)[-6:].upper()
            if instance.status == 'Pending':
                broadcast_push_to_role('ADMIN', 'New Order Pending', f"Order #{short_id} is awaiting approval.")
            elif instance.status == 'Approved':
                broadcast_push_to_role('INVENTORY', 'New Dispatch Request', f"Order #{short_id} approved and ready for dispatch.")
                broadcast_push_to_role('PRODUCTION', 'New Dispatch Request', f"Order #{short_id} approved and ready for dispatch.")
        except Exception as e:
            print("Failed to send push:", e)
            
        return
        
    try:
        old_instance = Order.objects.get(pk=instance.pk)
        if old_instance.status != instance.status:
            log_operational_event('Order', instance.id, old_instance.status, instance.status, instance.soemail_id, instance.companyid_id)
            
            try:
                from api.push_service import broadcast_push_to_role
                short_id = str(instance.id)[-6:].upper()
                if instance.status == 'Pending':
                    broadcast_push_to_role('ADMIN', 'New Order Pending', f"Order #{short_id} is awaiting approval.")
                elif instance.status == 'Approved':
                    broadcast_push_to_role('INVENTORY', 'New Dispatch Request', f"Order #{short_id} approved and ready for dispatch.")
                    broadcast_push_to_role('PRODUCTION', 'New Dispatch Request', f"Order #{short_id} approved and ready for dispatch.")
            except Exception as e:
                print("Failed to send push:", e)
    except Order.DoesNotExist:
        pass

@receiver(pre_save, sender=Lead)
def log_lead_status_event(sender, instance, **kwargs):
    from api.services.event_logger import log_operational_event
    
    if instance._state.adding:
        log_operational_event('Lead', instance.id, 'None', instance.status, instance.assigned_to_id or 'unassigned', instance.companyid_id)
        return
        
    try:
        old_instance = Lead.objects.get(pk=instance.pk)
        if old_instance.status != instance.status:
            log_operational_event('Lead', instance.id, old_instance.status, instance.status, instance.assigned_to_id or 'unassigned', instance.companyid_id)
    except Lead.DoesNotExist:
        pass

