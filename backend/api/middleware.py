import json
import logging
from django.utils import timezone
from api.db_router import get_current_db

logger = logging.getLogger('tenant_query')

class TenantQueryLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from api.db_router import set_current_db
        set_current_db('default')
        
        response = self.get_response(request)

        path = request.path
        # Exclude static/media files and system logs listing endpoint to avoid infinite logging recursion
        if any(path.startswith(p) for p in ['/static/', '/media/', '/favicon.ico', '/api/v1/system/logs']):
            return response

        if path.startswith('/api/') or path.startswith('/sales/') or path.startswith('/inventory/'):
            user_id = 'anonymous'
            user = getattr(request, 'user', None)
            if user and getattr(user, 'is_authenticated', False):
                user_id = getattr(user, 'id', getattr(user, 'userId', 'unknown'))
                
            warehouse_id = request.headers.get('X-Warehouse-ID', 'none')
            active_db = get_current_db()
            
            log_msg = f"[{timezone.now()}] user_id={user_id} warehouse_id={warehouse_id} active_db={active_db} endpoint={path} status={response.status_code}"
            print(f"[TENANT AUDIT] {log_msg}")
            logger.info(log_msg)

            # Auto-record CRUD operations (POST, PUT, PATCH, DELETE) or error responses (>=400)
            method = request.method.upper()
            status_code = response.status_code

            if method in ('POST', 'PUT', 'PATCH', 'DELETE') or status_code >= 400:
                try:
                    from api.views_logs import log_activity_internal

                    # Feature resolution
                    feature = 'General'
                    if '/orders' in path or '/sales' in path or '/dispatch' in path:
                        feature = 'Order & Dispatch'
                    elif '/returns' in path:
                        feature = 'Inventory Management'
                    elif '/inventory' in path or '/products' in path or '/categories' in path or '/brands' in path or '/units' in path or '/warehouses' in path or '/boms' in path:
                        feature = 'Inventory Management'
                    elif '/purchases' in path or '/suppliers' in path:
                        feature = 'Purchases'
                    elif '/users' in path or '/dealers' in path or '/distributors' in path or '/hr' in path:
                        feature = 'User Management'
                    elif '/leads' in path or '/crm' in path:
                        feature = 'CRM'
                    elif '/visits' in path:
                        feature = 'Sales Visit'
                    elif '/expenses' in path:
                        feature = 'Expenses'
                    elif '/auth' in path:
                        feature = 'Auth'

                    # Log Type resolution
                    log_type = 'ACTION'
                    if status_code >= 500:
                        log_type = 'ERROR'
                    elif status_code == 403:
                        log_type = 'PERMISSION'
                    elif status_code >= 400:
                        log_type = 'WARN'

                    # Action verb mapping
                    verb_map = {'POST': 'Created', 'PUT': 'Updated', 'PATCH': 'Modified', 'DELETE': 'Deleted', 'GET': 'Accessed'}
                    verb = verb_map.get(method, method)
                    
                    # Human readable endpoint label
                    clean_endpoint = path.replace('/api/v1/', '/').replace('/api/', '/')
                    action_desc = f"{verb} entry via {method} {clean_endpoint}"

                    # Try extracting request payload
                    payload = None
                    try:
                        if hasattr(request, 'data'):
                            payload = request.data
                        elif hasattr(request, 'body') and request.body:
                            payload = json.loads(request.body.decode('utf-8'))
                    except Exception:
                        pass

                    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')

                    log_activity_internal(
                        user=user if (user and getattr(user, 'is_authenticated', False)) else None,
                        user_email=getattr(user, 'email', None) if user else None,
                        user_name=getattr(user, 'name', None) if user else None,
                        user_role=getattr(user, 'role', None) if user else None,
                        company_id=getattr(user, 'companyid_id', None) or getattr(user, 'companyId', None) if user else None,
                        log_type=log_type,
                        feature=feature,
                        action=action_desc,
                        details={
                            'method': method,
                            'path': path,
                            'statusCode': status_code,
                            'payload': payload,
                        },
                        ip_address=client_ip
                    )
                except Exception as ex:
                    print('[AUDIT MIDDLEWARE ERROR]', ex)

        if request.method == 'GET' and response.status_code == 200:
            if any(request.path.startswith(p) for p in ['/api/v1/masters/warehouses', '/api/v1/masters/units', '/api/v1/masters/categories', '/api/v1/masters/brands', '/api/v1/masters/settings']):
                response['Cache-Control'] = 'private, max-age=300'

        return response
