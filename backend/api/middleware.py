import logging
from django.utils import timezone
from api.db_router import get_current_db

logger = logging.getLogger('tenant_query')

class TenantQueryLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Reset DB context to default for safety before processing request
        from api.db_router import set_current_db
        set_current_db('default')
        
        response = self.get_response(request)
        if request.path.startswith('/api/') or request.path.startswith('/sales/') or request.path.startswith('/inventory/'):
            user_id = 'anonymous'
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id = getattr(request.user, 'id', getattr(request.user, 'userId', 'unknown'))
                
            warehouse_id = request.headers.get('X-Warehouse-ID', 'none')
            active_db = get_current_db()
            
            log_msg = f"[{timezone.now()}] user_id={user_id} warehouse_id={warehouse_id} active_db={active_db} endpoint={request.path} status={response.status_code}"
            
            # Print to console for now, but configured logger will capture it
            print(f"[TENANT AUDIT] {log_msg}")
            logger.info(log_msg)

        return response
