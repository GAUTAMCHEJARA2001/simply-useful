import threading
import logging
from django.db import connection

logger = logging.getLogger(__name__)
_local = threading.local()

def set_current_db(db_name):
    _local.current_db = db_name

def get_current_db():
    if hasattr(_local, 'current_db') and _local.current_db and _local.current_db != 'default':
        return _local.current_db
    try:
        if hasattr(connection, 'tenant') and connection.tenant:
            schema = connection.tenant.schema_name
            if schema == 'public':
                return getattr(_local, 'current_db', 'default')
            return schema or 'default'
    except Exception:
        pass
    return getattr(_local, 'current_db', 'default')

def setup_dynamic_tenant_databases():
    """
    Dynamically registers connection aliases for each active warehouse schema,
    allowing .using(wh.db_name) queries to work transparently on the single database.
    """
    from django.conf import settings
    from django.db import connections
    try:
        from core.models import Warehouse
        # Guard against running before database is ready/migrated
        if not Warehouse.objects.all().exists():
            return
        
        base_db = settings.DATABASES['default']
        for wh in Warehouse.objects.filter(active=True):
            # Resolve db_name/schema_name
            alias = wh.db_name or wh.schema_name
            schema = wh.schema_name or wh.db_name
            if not alias or not schema or schema == 'public':
                continue
            
            if alias not in settings.DATABASES:
                db_config = base_db.copy()
                # Use standard postgresql backend for the individual alias connections
                db_config['ENGINE'] = 'django.db.backends.postgresql'
                db_config['OPTIONS'] = {'options': f'-c search_path={schema},public'}
                settings.DATABASES[alias] = db_config
                connections.databases[alias] = db_config
    except Exception:
        # Suppress errors on startup before migrations are run
        pass

# Register schema connection aliases immediately
setup_dynamic_tenant_databases()


def get_tenant_model_cross_db(ModelClass, pk, prefetch=None):
    from core.models import Warehouse
    from django.db import connection
    curr_db = get_current_db()
    
    qs = ModelClass.objects
    if prefetch:
        qs = qs.prefetch_related(prefetch)
        
    if curr_db != 'default':
        obj = qs.using(curr_db).get(id=pk)
        set_current_db(curr_db)
        try:
            wh = Warehouse.objects.filter(db_name=curr_db).first()
            if wh:
                connection.set_tenant(wh)
        except Exception:
            pass
        return obj
        
    for wh in Warehouse.objects.filter(active=True):
        alias = wh.db_name or wh.schema_name
        if not alias or alias == 'public':
            continue
        try:
            obj = qs.using(alias).get(id=pk)
            obj._state.db = alias
            set_current_db(alias)
            connection.set_tenant(wh)
            return obj
        except Exception:
            pass
            
    # Fallback to orderid/purchaseid etc. if applicable
    fallback_field = None
    if hasattr(ModelClass, 'orderid'): fallback_field = 'orderid'
    elif hasattr(ModelClass, 'purchaseid'): fallback_field = 'purchaseid'
    elif hasattr(ModelClass, 'ponumber'): fallback_field = 'ponumber'
    
    if fallback_field:
        for wh in Warehouse.objects.filter(active=True):
            alias = wh.db_name or wh.schema_name
            if not alias or alias == 'public':
                continue
            try:
                obj = qs.using(alias).get(**{fallback_field: pk})
                obj._state.db = alias
                set_current_db(alias)
                connection.set_tenant(wh)
                return obj
            except Exception:
                pass
                
    raise ModelClass.DoesNotExist()
