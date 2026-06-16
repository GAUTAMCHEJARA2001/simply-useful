from django_tenants.routers import TenantSyncRouter

class CustomTenantSyncRouter(TenantSyncRouter):
    def allow_relation(self, obj1, obj2, **hints):
        # Always allow relations since they are in the same PostgreSQL database
        return True
