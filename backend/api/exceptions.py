import logging
import traceback
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom Global Exception Handler for Django REST Framework.
    Guarantees:
    1. Every error (including uncaught 500 exceptions, FieldErrors, KeyErrors, DB IntegrityErrors)
       always returns a valid, consistent JSON payload instead of a raw HTML 500 crash.
    2. Errors are logged with view name, user info, and full traceback for debugging.
    3. Standardizes error responses into the application's { success: False, data: None, message: ... } contract.
    """
    # 1. Call DRF's default exception handler first (handles AuthenticationFailed, NotAuthenticated, ValidationError, NotFound, etc.)
    response = exception_handler(exc, context)

    view = context.get('view')
    request = context.get('request')
    view_name = view.__class__.__name__ if view else 'UnknownView'
    user_info = getattr(request, 'user', None) if request else None
    user_str = f"{getattr(user_info, 'email', '') or getattr(user_info, 'id', '')}" if user_info else 'Anonymous'

    if response is None:
        # Unhandled 500 error (Python/Django exceptions not derived from APIException)
        error_msg = str(exc) or 'An unexpected internal server error occurred.'
        logger.error(
            f"🔥 [Unhandled API Exception] View: {view_name} | User: {user_str} | Error: {error_msg}\n"
            f"{traceback.format_exc()}"
        )

        return Response({
            'success': False,
            'data': None,
            'message': error_msg,
            'error': error_msg
        }, status=500)

    # 2. Standardize DRF handled exceptions (e.g., 400 ValidationError, 401 Unauthorized, 403 Forbidden, 404 Not Found)
    error_data = response.data
    message = 'Request failed'

    if isinstance(error_data, dict):
        if 'detail' in error_data:
            message = str(error_data['detail'])
        elif 'message' in error_data:
            message = str(error_data['message'])
        elif len(error_data) > 0:
            # Flatten validation errors: e.g. {'phone': ['This field is required']} -> "phone: This field is required"
            first_field = next(iter(error_data))
            field_err = error_data[first_field]
            if isinstance(field_err, list) and len(field_err) > 0:
                message = f"{first_field}: {field_err[0]}"
            else:
                message = f"{first_field}: {str(field_err)}"
    elif isinstance(error_data, list) and len(error_data) > 0:
        message = str(error_data[0])
    elif isinstance(error_data, str):
        message = error_data

    # Log client errors as warnings
    logger.warning(f"⚠️ [API {response.status_code}] View: {view_name} | User: {user_str} | Message: {message}")

    response.data = {
        'success': False,
        'data': None,
        'message': message,
        'error': error_data
    }

    return response
