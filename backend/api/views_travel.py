import uuid
from datetime import datetime, date
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import DailyTravelLog, DailyAttendance, Labour, User, Company
from api.views import send_success, send_error, _get_company_id


def _serialize_travel_log(log):
    user_name = ''
    user_email = ''
    try:
        if log.user:
            user_name = log.user.name or log.user.email or ''
            user_email = log.user.email or ''
    except Exception:
        pass

    verified_by_name = None
    verified_by_email = None
    try:
        if log.verified_by:
            verified_by_name = log.verified_by.name or log.verified_by.email or None
            verified_by_email = log.verified_by.email or None
    except Exception:
        pass

    return {
        'id': log.id,
        'date': log.date.strftime('%Y-%m-%d') if log.date else None,
        'vehicle_type': log.vehicle_type,
        'start_km': log.start_km,
        'end_km': log.end_km,
        'total_km': log.total_km,
        'start_photo': log.start_photo,
        'end_photo': log.end_photo,
        'start_time': log.start_time.isoformat() if log.start_time else None,
        'end_time': log.end_time.isoformat() if log.end_time else None,
        'start_location': log.start_location,
        'end_location': log.end_location,
        'so_notes': log.so_notes,
        'visit_summary': getattr(log, 'visit_summary', '') or '',
        'collection_summary': getattr(log, 'collection_summary', '') or '',
        'order_summary': getattr(log, 'order_summary', '') or '',
        'status': log.status,
        'approved_km': log.approved_km,
        'hr_notes': log.hr_notes,
        'verified_by': verified_by_name,
        'verified_by_email': verified_by_email,
        'verified_at': log.verified_at.isoformat() if log.verified_at else None,
        'user_id': log.user_id,
        'user_name': user_name,
        'user_email': user_email,
        'created_at': log.createdat.isoformat() if log.createdat else None,
    }


def _sync_travel_to_attendance(log, reset_km=False):
    """Automatically sync punched or approved KM into DailyAttendance for the employee."""
    try:
        labour = None
        # 1. Match by linked user_id
        if log.user_id:
            labour = Labour.objects.filter(companyid=log.companyid, user_id=log.user_id).first()

        user_obj = getattr(log, 'user', None)
        if not labour and user_obj:
            # 2. Match by email in contactinfo
            if user_obj.email:
                labour = Labour.objects.filter(companyid=log.companyid, contactinfo__icontains=user_obj.email).first()
            # 3. Match by name
            if not labour and user_obj.name:
                cleaned_name = user_obj.name.strip()
                labour = Labour.objects.filter(companyid=log.companyid, name__iexact=cleaned_name).first()
                if not labour:
                    first_part = cleaned_name.split()[0]
                    labour = Labour.objects.filter(companyid=log.companyid, name__icontains=first_part).first()

        if labour:
            att, _ = DailyAttendance.objects.get_or_create(
                labourid=labour,
                date=log.date,
                defaults={'status': 'PRESENT', 'travel_vehicle': log.vehicle_type}
            )
            att.travel_vehicle = log.vehicle_type
            if reset_km:
                att.km_travelled = 0.0
            else:
                km_val = log.approved_km if (log.status == 'APPROVED' and log.approved_km is not None) else (log.total_km or 0.0)
                att.km_travelled = float(km_val)

            # Ensure marked PRESENT if punched travel
            if att.status in ('ABSENT', ''):
                att.status = 'PRESENT'
            att.save()
            return True
    except Exception as e:
        print(f"[TRAVEL_ATTENDANCE_SYNC] Error syncing to DailyAttendance: {e}")
    return False


@api_view(['GET'])
def travel_today(request):
    """Fetch today's travel log for the authenticated user"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
    today = timezone.localdate()
    log = DailyTravelLog.objects.filter(user_id=user_id, date=today).first()
    if not log:
        return send_success(None, 'No travel punched today')

    return send_success(_serialize_travel_log(log), 'Today travel log fetched')


@api_view(['POST'])
def travel_start(request):
    """Start Day Trip: Punch start KM, meter photo, vehicle type, and GPS location"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    company_id = _get_company_id(request) or getattr(user, 'companyid_id', None) or getattr(user, 'companyId', None)
    if not company_id:
        return send_error('Company ID not found', 400)

    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
    if not user_id:
        return send_error('User ID not found', 400)

    data = request.data or {}
    start_km_raw = data.get('start_km')
    if start_km_raw is None or start_km_raw == '':
        return send_error('Start KM is required', 400)

    try:
        start_km = float(start_km_raw)
        if start_km < 0:
            return send_error('Start KM cannot be negative', 400)
    except (ValueError, TypeError):
        return send_error('Invalid start KM value', 400)

    vehicle_type = (data.get('vehicle_type') or 'BIKE').upper()
    if vehicle_type not in ['BIKE', 'CAR', 'OTHER']:
        vehicle_type = 'BIKE'

    today = timezone.localdate()
    log = DailyTravelLog.objects.filter(user_id=user_id, date=today).first()
    if not log:
        log = DailyTravelLog(
            id=f"TRV-{uuid.uuid4().hex[:12].upper()}",
            user_id=user_id,
            companyid_id=company_id,
            date=today,
        )

    log.start_km = start_km
    log.vehicle_type = vehicle_type
    log.start_photo = data.get('start_photo') or log.start_photo
    log.start_location = data.get('start_location') or log.start_location
    log.start_time = timezone.now()
    log.status = 'PENDING'
    log.save()

    # Automatically mark employee PRESENT in Daily Attendance for today
    _sync_travel_to_attendance(log)

    return send_success(_serialize_travel_log(log), 'Day Trip started successfully')


@api_view(['POST'])
def travel_end(request):
    """End Day Trip: Punch end KM, ending meter photo, and remarks"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
    today = timezone.localdate()
    log = DailyTravelLog.objects.filter(user_id=user_id, date=today).first()
    if not log or log.start_km is None:
        return send_error('Please start your day trip first before ending it', 400)

    data = request.data or {}
    end_km_raw = data.get('end_km')
    if end_km_raw is None or end_km_raw == '':
        return send_error('End KM is required', 400)

    try:
        end_km = float(end_km_raw)
    except (ValueError, TypeError):
        return send_error('Invalid end KM value', 400)

    if end_km < log.start_km:
        return send_error(f"End KM ({end_km}) cannot be less than Start KM ({log.start_km})", 400)

    visit_summary = (data.get('visit_summary') or '').strip()
    collection_summary = (data.get('collection_summary') or '').strip()
    order_summary = (data.get('order_summary') or '').strip()

    if not visit_summary:
        return send_error('Daily Visit Summary is compulsory. Please enter details of visits/dealers attended.', 400)
    if not collection_summary:
        return send_error('Payment Collection Summary is compulsory. Please enter collected amounts or write "Nil".', 400)
    if not order_summary:
        return send_error('Order Summary is compulsory. Please enter booked orders or write "Nil".', 400)

    log.end_km = end_km
    log.total_km = round(end_km - log.start_km, 2)
    # Default approved KM to total KM initially before HR verification
    if log.approved_km is None or log.status == 'PENDING':
        log.approved_km = log.total_km

    log.end_photo = data.get('end_photo') or log.end_photo
    log.end_location = data.get('end_location') or log.end_location
    log.end_time = timezone.now()

    log.visit_summary = visit_summary
    log.collection_summary = collection_summary
    log.order_summary = order_summary

    # Formatted composite notes for backward compatibility
    structured_notes = [
        f"📍 VISIT SUMMARY:\n{visit_summary}",
        f"💰 PAYMENT COLLECTION:\n{collection_summary}",
        f"📦 ORDER SUMMARY:\n{order_summary}"
    ]
    route_notes = (data.get('so_notes') or '').strip()
    if route_notes:
        structured_notes.append(f"🛣️ ROUTE / REMARKS:\n{route_notes}")
    log.so_notes = "\n\n".join(structured_notes)

    log.status = 'PENDING'
    log.save()

    # Automatically enter punched KM into Daily Attendance immediately!
    _sync_travel_to_attendance(log)

    return send_success(_serialize_travel_log(log), f"Day Trip ended! Total {log.total_km} KM recorded (Synced to Daily Attendance, Pending HR Approval)")


@api_view(['GET'])
def travel_my_history(request):
    """Get past travel logs for the current Sales Officer"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
    qs = DailyTravelLog.objects.filter(user_id=user_id).order_by('-date')
    month = request.query_params.get('month')
    if month:
        try:
            year, m = map(int, month.split('-'))
            qs = qs.filter(date__year=year, date__month=m)
        except Exception:
            pass

    logs = qs[:60]
    return send_success([_serialize_travel_log(l) for l in logs], 'Travel history fetched')


@api_view(['GET'])
def travel_hr_logs(request):
    """HR/Admin endpoint: List all travel logs across the organization with filters"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    user_role = (getattr(user, 'role', '') or '').upper()
    if user_role not in ['SUPERADMIN', 'ADMIN', 'HR']:
        return send_error('Forbidden: HR or Admin access required', 403)

    company_id = _get_company_id(request) or getattr(user, 'companyid_id', None)
    qs = DailyTravelLog.objects.filter(companyid_id=company_id).select_related('user', 'verified_by').order_by('-date', '-createdat')

    # Filters
    month = request.query_params.get('month')
    if month:
        try:
            year, m = map(int, month.split('-'))
            qs = qs.filter(date__year=year, date__month=m)
        except Exception:
            pass

    date_str = request.query_params.get('date')
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            qs = qs.filter(date=target_date)
        except Exception:
            pass

    status_filter = request.query_params.get('status')
    if status_filter and status_filter.upper() in ['PENDING', 'APPROVED', 'REJECTED']:
        qs = qs.filter(status=status_filter.upper())

    user_id_filter = request.query_params.get('user_id')
    if user_id_filter:
        qs = qs.filter(user_id=user_id_filter)

    logs = qs[:200]
    return send_success([_serialize_travel_log(l) for l in logs], 'HR travel logs fetched')


@api_view(['POST'])
def travel_hr_verify(request, pk):
    """HR/Admin endpoint: Verify, Correct, Approve, or Reject a travel log with note & sync to payroll"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    user_role = (getattr(user, 'role', '') or '').upper()
    if user_role not in ['SUPERADMIN', 'ADMIN', 'HR']:
        return send_error('Forbidden: HR or Admin access required', 403)

    company_id = _get_company_id(request) or getattr(user, 'companyid_id', None)
    log = DailyTravelLog.objects.filter(id=pk, companyid_id=company_id).first()
    if not log:
        return send_error('Travel log not found', 404)

    data = request.data or {}
    action = (data.get('action') or '').upper()
    if action not in ['APPROVE', 'REJECT']:
        return send_error("Action must be 'APPROVE' or 'REJECT'", 400)

    hr_notes = data.get('hr_notes', '')

    if action == 'APPROVE':
        approved_km_raw = data.get('approved_km')
        if approved_km_raw is not None and approved_km_raw != '':
            try:
                approved_km = float(approved_km_raw)
                if approved_km < 0:
                    return send_error('Approved KM cannot be negative', 400)
            except (ValueError, TypeError):
                return send_error('Invalid approved KM value', 400)
        else:
            approved_km = log.total_km

        log.status = 'APPROVED'
        log.approved_km = approved_km
        log.hr_notes = hr_notes
        log.verified_by_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
        log.verified_at = timezone.now()
        log.save()

        # Sync to DailyAttendance for Payroll
        _sync_travel_to_attendance(log)

        return send_success(_serialize_travel_log(log), f"Travel log approved with {log.approved_km} KM and synced to payroll")

    elif action == 'REJECT':
        log.status = 'REJECTED'
        log.hr_notes = hr_notes
        log.verified_by_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
        log.verified_at = timezone.now()
        log.save()

        # If rejected, reset km_travelled on DailyAttendance
        _sync_travel_to_attendance(log, reset_km=True)

        return send_success(_serialize_travel_log(log), "Travel log rejected")
