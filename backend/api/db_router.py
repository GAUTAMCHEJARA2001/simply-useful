import threading

_local = threading.local()

def set_current_db(db_name):
    print(f'[ROUTER DB DEBUG] Setting DB to: {db_name}')
    _local.current_db = db_name

#
    """Sets the database context for the current thread."""
    _local.current_db = db_name

def get_current_db():
    db = getattr(_local, 'current_db', 'default')
    print(f'[ROUTER DB DEBUG] Returning DB: {db}')
    return db

#
    """Retrieves the current database context. Defaults to 'default'."""
    return getattr(_local, 'current_db', 'default')

class TenantDatabaseRouter:
    """
    A router to control all database operations on models for multi-tenant architecture.
    """
    
    # Models that are partitioned per warehouse database
    TENANT_MODELS = [
        'inventory', 
        'order', 
        'orderitem', 
        'purchase', 
        'purchaseitem', 
        'purchaseorder', 
        'purchaseorderitem',
        'stocktransaction',
        'stockbatch',
        'operationaleventledger',
        'category',
        'brand',
        'unit',
        'supplier',
        'labour',
        'dealer',
        'distributor',
        'product',
        'bom',
        'bomitem'
    ]

    def db_for_read(self, model, **hints):
        """Points to the correct database for read operations."""
        instance = hints.get('instance')
        if instance and getattr(instance, '_state', None) and getattr(instance._state, 'db', None):
            return instance._state.db
        if model._meta.model_name in self.TENANT_MODELS:
            return get_current_db()
        return 'default'

    def db_for_write(self, model, **hints):
        """Points to the correct database for write operations."""
        instance = hints.get('instance')
        if instance and getattr(instance, '_state', None) and getattr(instance._state, 'db', None):
            return instance._state.db
        if model._meta.model_name in self.TENANT_MODELS:
            return get_current_db()
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Relations between objects are allowed. 
        We enforce db_constraint=False on cross-db ForeignKeys manually.
        """
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Strictly isolate migrations.
        Global models MUST only migrate to the 'default' DB.
        Tenant models MUST only migrate to tenant DBs (e.g., 'warehouse_surat', 'warehouse_mumbai').
        """
        if model_name in self.TENANT_MODELS:
            # Prevent tenant models from migrating into the master database
            if db == 'default':
                return False
            return True
        else:
            # Prevent global models from migrating into tenant databases
            if db != 'default':
                return False
            return True
