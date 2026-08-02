import uuid
import json
from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from api.models import Activitylog
from core.models import Company, User
from api.views import send_success, send_error, _get_company_id

def log_activity_internal(user=None, user_email=None, user_name=None, user_role=None, company_id=None, log_type='ACTION', feature='General', action='', details=None, ip_address=None):
    try:
        log_id = 'c' + uuid.uuid4().hex[:23]
        if user and getattr(user, 'is_authenticated', False):
            user_email = user_email or getattr(user, 'email', None)
            user_name = user_name or getattr(user, 'name', None) or user_email
            user_role = user_role or getattr(user, 'role', None) or ''
            if not company_id:
                company_id = getattr(user, 'companyid_id', None) or getattr(user, 'companyId', None)

        details_str = json.dumps(details, default=str) if isinstance(details, (dict, list)) else str(details or '')

        comp_obj = Company.objects.filter(id=company_id).first() if company_id else None

        Activitylog.objects.create(
            id=log_id,
            companyid=comp_obj,
            user_email=user_email or 'anonymous',
            user_name=user_name or 'Anonymous User',
            user_role=(user_role or 'USER').upper(),
            log_type=(log_type or 'ACTION').upper(),
            feature=feature or 'General',
            action=action or 'User Action',
            details_json=details_str,
            ip_address=ip_address or '',
            createdat=timezone.now()
        )
    except Exception as e:
        print('[LOG ERROR] Failed to record activity log:', e)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_system_log(request):
    try:
        data = request.data or {}
        user = request.user if getattr(request.user, 'is_authenticated', False) else None
        
        # Can accept single log or array of batch logs
        logs = data if isinstance(data, list) else [data]
        
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')

        for item in logs:
            log_activity_internal(
                user=user,
                user_email=item.get('userEmail') or item.get('user_email') or (user.email if user else None),
                user_name=item.get('userName') or item.get('user_name') or (user.name if user else None),
                user_role=item.get('userRole') or item.get('user_role') or (getattr(user, 'role', '') if user else None),
                company_id=item.get('companyId') or _get_company_id(request),
                log_type=item.get('logType') or item.get('log_type') or 'ACTION',
                feature=item.get('feature') or 'General',
                action=item.get('action') or 'System Event',
                details=item.get('details') or item.get('detailsJson') or item.get('error'),
                ip_address=client_ip
            )
        return send_success(None, 'Logs recorded successfully')
    except Exception as e:
        return send_error(f'Failed to record log: {str(e)}', 500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_system_logs(request):
    user_role = (getattr(request.user, 'role', '') or '').upper()
    if user_role not in ('SUPERADMIN', 'ADMIN'):
        return send_error('Only Super Admin and Admin can access audit logs.', 403)

    company_id = _get_company_id(request)
    qs = Activitylog.objects.all()
    if company_id and user_role != 'SUPERADMIN':
        qs = qs.filter(companyid_id=company_id)

    log_type = request.query_params.get('logType') or request.query_params.get('log_type')
    if log_type and log_type.upper() != 'ALL':
        qs = qs.filter(log_type__iexact=log_type)

    feature = request.query_params.get('feature')
    if feature and feature.upper() != 'ALL':
        qs = qs.filter(feature__icontains=feature)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(user_email__icontains=search) |
            Q(user_name__icontains=search) |
            Q(action__icontains=search) |
            Q(feature__icontains=search) |
            Q(details_json__icontains=search)
        )

    start_date = request.query_params.get('startDate') or request.query_params.get('start_date')
    end_date = request.query_params.get('endDate') or request.query_params.get('end_date')
    if start_date:
        qs = qs.filter(createdat__date__gte=start_date)
    if end_date:
        qs = qs.filter(createdat__date__lte=end_date)

    qs = qs.order_by('-createdat')

    # Pagination
    limit = int(request.query_params.get('limit', 100))
    page = int(request.query_params.get('page', 1))
    total_count = qs.count()

    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_logs = qs[start_idx:end_idx]

    result_data = []
    for l in page_logs:
        details_parsed = None
        if l.details_json:
            try:
                details_parsed = json.loads(l.details_json)
            except Exception:
                details_parsed = l.details_json

        result_data.append({
            'id': l.id,
            'companyId': l.companyid_id,
            'userEmail': l.user_email,
            'userName': l.user_name,
            'userRole': l.user_role,
            'logType': l.log_type,
            'feature': l.feature,
            'action': l.action,
            'details': details_parsed,
            'ipAddress': l.ip_address,
            'createdAt': l.createdat.isoformat() if l.createdat else None
        })

    return send_success({
        'logs': result_data,
        'meta': {
            'total': total_count,
            'page': page,
            'limit': limit,
            'pages': (total_count + limit - 1) // limit if limit > 0 else 1
        }
    }, 'Audit logs retrieved successfully')

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_system_logs(request):
    user_role = (getattr(request.user, 'role', '') or '').upper()
    if user_role != 'SUPERADMIN':
        return send_error('Only SuperAdmin can clear audit logs.', 403)

    log_type = request.query_params.get('logType')
    if log_type:
        count, _ = Activitylog.objects.filter(log_type__iexact=log_type).delete()
    else:
        count, _ = Activitylog.objects.all().delete()

    return send_success({'deleted': count}, f'Cleared {count} audit logs')
