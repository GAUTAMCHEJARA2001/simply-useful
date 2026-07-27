class HeaderTenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        warehouse_id = request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        request.warehouse_id = warehouse_id
        request.tenant = None

        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            err_msg = str(e).lower()
            if 'relation' in err_msg and ('does not exist' in err_msg or 'not found' in err_msg):
                from django.http import JsonResponse
                is_object_endpoint = (
                    'kpi' in request.path or 
                    'dashboard' in request.path or 
                    'settings' in request.path or
                    'analytics' in request.path
                )
                return JsonResponse({
                    "success": True,
                    "data": {} if is_object_endpoint else [],
                    "message": "No active warehouse. Please create a warehouse."
                }, status=200)
            raise

    def process_exception(self, request, exception):
        err_msg = str(exception).lower()
        if 'relation' in err_msg and ('does not exist' in err_msg or 'not found' in err_msg):
            from django.http import JsonResponse
            is_object_endpoint = (
                'kpi' in request.path or 
                'dashboard' in request.path or 
                'settings' in request.path or
                'analytics' in request.path
            )
            return JsonResponse({
                "success": True,
                "data": {} if is_object_endpoint else [],
                "message": "No active warehouse. Please create a warehouse."
            }, status=200)
        return None
