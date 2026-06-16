from django.db import connection
from django_tenants.utils import get_tenant_model

class HeaderTenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Default to public schema
        connection.set_schema_to_public()
        request.tenant = None

        # Read the custom warehouse header
        warehouse_id = request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        WarehouseModel = get_tenant_model()
        warehouse = None

        if warehouse_id and warehouse_id != 'GLOBAL' and warehouse_id != 'none' and 'masters/warehouses' not in request.path:
            # 1. Try to resolve by ID
            try:
                warehouse = WarehouseModel.objects.filter(id=warehouse_id).first()
            except (ValueError, TypeError):
                pass

            # 2. Try to resolve by schema_name
            if not warehouse:
                warehouse = WarehouseModel.objects.filter(schema_name=str(warehouse_id)).first()

            # 3. Fallback to resolving by name (case-insensitive)
            if not warehouse:
                warehouse = WarehouseModel.objects.filter(name__iexact=str(warehouse_id), active=True).first()

            # 4. Self-healing fallback: If a warehouse was requested but not resolved, default to the first active warehouse
            if not warehouse:
                warehouse = WarehouseModel.objects.filter(active=True).first()
                if warehouse:
                    print(f"[TENANT MIDDLEWARE] Warning: Requested warehouse '{warehouse_id}' not found. Falling back to active warehouse: '{warehouse.name}' (schema: {warehouse.schema_name})")

        # 5. Default API requests to first active warehouse if no tenant schema is set,
        # since tenant-specific tables do not exist in the public schema.
        # Exclude global master warehouses endpoints which must run in the public schema to manage tenants.
        if not warehouse and 'masters/warehouses' not in request.path and (request.path.startswith('/api/') or request.path.startswith('/sales/') or request.path.startswith('/inventory/')):
            warehouse = WarehouseModel.objects.filter(active=True).first()
            if warehouse:
                print(f"[TENANT MIDDLEWARE] Warning: Defaulting API request to first active warehouse: '{warehouse.name}' (schema: {warehouse.schema_name})")

        if warehouse:
            # Dynamically set tenant connection schema
            connection.set_tenant(warehouse)
            request.tenant = warehouse

        response = self.get_response(request)
        return response
