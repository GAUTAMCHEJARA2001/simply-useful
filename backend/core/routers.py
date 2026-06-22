from django_tenants.routers import TenantSyncRouter

class CustomTenantSyncRouter(TenantSyncRouter):
    def db_for_read(self, model, **hints):
        from api.db_router import setup_dynamic_tenant_databases
        setup_dynamic_tenant_databases()
        if hasattr(super(), 'db_for_read'):
            return super().db_for_read(model, **hints)
        return None

    def db_for_write(self, model, **hints):
        from api.db_router import setup_dynamic_tenant_databases
        setup_dynamic_tenant_databases()
        if hasattr(super(), 'db_for_write'):
            return super().db_for_write(model, **hints)
        return None

    def allow_relation(self, obj1, obj2, **hints):
        # Always allow relations since they are in the same PostgreSQL database
        return True
