from typing import Any, Optional
from datetime import datetime, date
from django.utils import timezone
from core.models import Company

def get_company_id(request) -> Optional[str]:
    """Safely extract company ID from JWT or Django session user.
    JWTUser has .companyId, Django User model has .companyid_id.
    Falls back to first Company if not found, preventing AttributeError crashes.
    """
    if not request:
        return None
    user = getattr(request, 'user', None)
    company_id = getattr(user, 'companyId', None) or getattr(user, 'companyid_id', None)
    if not company_id:
        try:
            first_comp = Company.objects.first()
            if first_comp:
                company_id = first_comp.id
        except Exception:
            pass
    return company_id

def get_user_id(request) -> Optional[str]:
    """Safely extract user ID from either Django User or JWT payload.
    Supports both standard .id and custom .userId attributes.
    """
    if not request:
        return None
    user = getattr(request, 'user', None)
    if not user:
        return None
    return getattr(user, 'id', None) or getattr(user, 'userId', None)

def get_param(data: Any, *keys: str, default: Any = None) -> Any:
    """Extracts a value checking multiple key variants (e.g. snake_case and camelCase).
    Example: get_param(request.data, 'dealer_name', 'dealerName')
    """
    if not isinstance(data, dict):
        return default
    for k in keys:
        if k in data and data[k] not in (None, ''):
            return data[k]
    return default

def safe_float(val: Any, default: float = 0.0) -> float:
    """Safely coerces any value to float without throwing ValueError or TypeError."""
    if val in (None, '', 'null', 'undefined'):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val: Any, default: int = 0) -> int:
    """Safely coerces any value to int without throwing ValueError or TypeError."""
    if val in (None, '', 'null', 'undefined'):
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def safe_str(val: Any, default: str = '') -> str:
    """Safely coerces any value to trimmed string."""
    if val is None:
        return default
    return str(val).strip()

def safe_date(val: Any, default: Optional[date] = None) -> Optional[date]:
    """Safely parses a date string in YYYY-MM-DD or ISO format without crashing."""
    if not val:
        return default
    if isinstance(val, (date, datetime)):
        return val if isinstance(val, date) else val.date()
    str_val = str(val).strip().split('T')[0]
    try:
        return datetime.strptime(str_val, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return default
