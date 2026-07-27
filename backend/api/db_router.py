import threading
import logging

logger = logging.getLogger(__name__)
_local = threading.local()

def set_current_db(db_name):
    _local.current_db = db_name

def get_current_db():
    if hasattr(_local, 'current_db') and _local.current_db:
        return _local.current_db
    return 'default'

def get_tenant_model_cross_db(ModelClass, pk, prefetch=None):
    """Simplified: now all data is in the default (public) schema."""
    qs = ModelClass.objects
    if prefetch:
        qs = qs.prefetch_related(prefetch)
    try:
        return qs.get(id=pk)
    except ModelClass.DoesNotExist:
        # Try fallback fields
        fallback_field = None
        if hasattr(ModelClass, 'orderid'): fallback_field = 'orderid'
        elif hasattr(ModelClass, 'purchaseid'): fallback_field = 'purchaseid'
        elif hasattr(ModelClass, 'ponumber'): fallback_field = 'ponumber'
        if fallback_field:
            return qs.get(**{fallback_field: pk})
        raise
