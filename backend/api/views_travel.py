import uuid
from datetime import datetime, date
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import DailyTravelLog, DailyTourPlanStop, DailyAttendance, Labour, User, Company
from api.views import send_success, send_error, _get_company_id


def _serialize_tour_stop(stop):
    return {
        'id': stop.id,
        'travel_log_id': stop.travel_log_id,
        'date': stop.date.strftime('%Y-%m-%d') if stop.date else None,
        'stop_order': stop.stop_order,
        'is_unplanned': stop.is_unplanned,
        'dealer_id': stop.dealer_id,
        'dealer_name': stop.dealer_name,
        'dealer_location': stop.dealer_location,
        'visit_purpose': stop.visit_purpose,
        'target_order_bags': stop.target_order_bags,
        'target_order_value': stop.target_order_value,
        'target_collection_value': stop.target_collection_value,
        'plan_notes': stop.plan_notes,
        'visited': stop.visited,
        'actual_order_bags': stop.actual_order_bags,
        'actual_order_value': stop.actual_order_value,
        'actual_collection_value': stop.actual_collection_value,
        'actual_status': stop.actual_status,
        'shortfall_reason': stop.shortfall_reason,
        'actual_notes': stop.actual_notes,
        'completed_at': stop.completed_at.isoformat() if stop.completed_at else None,
        'created_at': stop.createdat.isoformat() if stop.createdat else None,
    }


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

    stops_list = []
    try:
        if hasattr(log, 'stops'):
            stops_list = [_serialize_tour_stop(s) for s in log.stops.all().order_by('stop_order', 'createdat')]
        else:
            stops_list = [_serialize_tour_stop(s) for s in DailyTourPlanStop.objects.filter(travel_log_id=log.id).order_by('stop_order', 'createdat')]
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
        'total_stops_planned': getattr(log, 'total_stops_planned', 0) or 0,
        'total_stops_visited': getattr(log, 'total_stops_visited', 0) or 0,
        'total_target_bags': getattr(log, 'total_target_bags', 0.0) or 0.0,
        'total_actual_bags': getattr(log, 'total_actual_bags', 0.0) or 0.0,
        'total_target_amount': getattr(log, 'total_target_amount', 0.0) or 0.0,
        'total_actual_amount': getattr(log, 'total_actual_amount', 0.0) or 0.0,
        'total_target_collection': getattr(log, 'total_target_collection', 0.0) or 0.0,
        'total_actual_collection': getattr(log, 'total_actual_collection', 0.0) or 0.0,
        'target_achievement_pct': getattr(log, 'target_achievement_pct', 0.0) or 0.0,
        'performance_rating': getattr(log, 'performance_rating', 'PENDING') or 'PENDING',
        'stops': stops_list,
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
    """Fetch today's travel log or planned stops for the authenticated user"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
    today = timezone.localdate()
    log = DailyTravelLog.objects.filter(user_id=user_id, date=today).first()
    if not log:
        # Check if user has planned stops for today
        planned_stops = DailyTourPlanStop.objects.filter(user_id=user_id, date=today).order_by('stop_order', 'createdat')
        if planned_stops.exists():
            return send_success({
                'has_plan_only': True,
                'date': today.strftime('%Y-%m-%d'),
                'total_stops_planned': planned_stops.count(),
                'total_target_bags': sum(s.target_order_bags for s in planned_stops),
                'total_target_collection': sum(s.target_collection_value for s in planned_stops),
                'stops': [_serialize_tour_stop(s) for s in planned_stops]
            }, 'Today tour plan fetched (Trip not yet started)')
        return send_success(None, 'No travel punched today')

    return send_success(_serialize_travel_log(log), 'Today travel log fetched')


@api_view(['GET', 'POST'])
def travel_plan(request):
    """
    GET: Retrieve tour plan stops for a given date (?date=YYYY-MM-DD, defaults to today)
    POST: Save or update tour plan stops for a given date { date: 'YYYY-MM-DD', stops: [ ... ] }
    """
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    company_id = _get_company_id(request) or getattr(user, 'companyid_id', None) or getattr(user, 'companyId', None)
    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)

    if request.method == 'GET':
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return send_error('Invalid date format (YYYY-MM-DD expected)', 400)
        else:
            target_date = timezone.localdate()

        stops = DailyTourPlanStop.objects.filter(user_id=user_id, date=target_date).order_by('stop_order', 'createdat')
        return send_success([_serialize_tour_stop(s) for s in stops], f"Tour plan stops for {target_date} fetched")

    elif request.method == 'POST':
        data = request.data or {}
        date_str = data.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return send_error('Invalid date format (YYYY-MM-DD expected)', 400)
        else:
            target_date = timezone.localdate()

        stops_input = data.get('stops', [])
        if not isinstance(stops_input, list) or len(stops_input) == 0:
            return send_error('At least 1 planned stop is required', 400)

        log = DailyTravelLog.objects.filter(user_id=user_id, date=target_date).first()

        kept_ids = []
        saved_stops = []

        for idx, item in enumerate(stops_input):
            dealer_name = (item.get('dealer_name') or '').strip()
            if not dealer_name:
                continue

            stop_id = item.get('id')
            stop = None
            if stop_id and not str(stop_id).startswith('temp-'):
                stop = DailyTourPlanStop.objects.filter(id=stop_id, user_id=user_id).first()

            if not stop:
                stop = DailyTourPlanStop(
                    id=f"STP-{uuid.uuid4().hex[:12].upper()}",
                    user_id=user_id,
                    companyid_id=company_id,
                    date=target_date,
                    travel_log=log
                )

            stop.stop_order = idx + 1
            stop.dealer_id = item.get('dealer_id') or None
            stop.dealer_name = dealer_name
            stop.dealer_location = item.get('dealer_location') or ''
            stop.visit_purpose = (item.get('visit_purpose') or 'ORDER').upper()
            stop.target_order_bags = float(item.get('target_order_bags') or 0.0)
            stop.target_order_value = float(item.get('target_order_value') or 0.0)
            stop.target_collection_value = float(item.get('target_collection_value') or 0.0)
            stop.plan_notes = item.get('plan_notes') or ''
            stop.is_unplanned = bool(item.get('is_unplanned', False))
            if log and not stop.travel_log:
                stop.travel_log = log
            stop.save()

            kept_ids.append(stop.id)
            saved_stops.append(stop)

        # Remove deleted planned stops that haven't been visited yet
        DailyTourPlanStop.objects.filter(
            user_id=user_id,
            date=target_date,
            visited=False,
            is_unplanned=False
        ).exclude(id__in=kept_ids).delete()

        if log:
            planned_qs = DailyTourPlanStop.objects.filter(travel_log=log, is_unplanned=False)
            log.total_stops_planned = planned_qs.count()
            log.total_target_bags = sum(s.target_order_bags for s in planned_qs)
            log.total_target_collection = sum(s.target_collection_value for s in planned_qs)
            log.save()

        return send_success([_serialize_tour_stop(s) for s in saved_stops], f"Tour plan saved with {len(saved_stops)} stops for {target_date}")


@api_view(['POST'])
def travel_add_unplanned_stop(request):
    """Quickly log a spot / unplanned visit conducted on the field"""
    user = getattr(request, 'user', None)
    if not user or not getattr(user, 'is_authenticated', False):
        return send_error('Unauthorized', 401)

    company_id = _get_company_id(request) or getattr(user, 'companyid_id', None) or getattr(user, 'companyId', None)
    user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
    today = timezone.localdate()

    data = request.data or {}
    dealer_name = (data.get('dealer_name') or '').strip()
    if not dealer_name:
        return send_error('Dealer / Customer name is required for spot visit', 400)

    log = DailyTravelLog.objects.filter(user_id=user_id, date=today).first()
    highest_order = DailyTourPlanStop.objects.filter(user_id=user_id, date=today).count() + 1

    stop = DailyTourPlanStop(
        id=f"STP-{uuid.uuid4().hex[:12].upper()}",
        user_id=user_id,
        companyid_id=company_id,
        date=today,
        travel_log=log,
        stop_order=highest_order,
        is_unplanned=True,
        dealer_id=data.get('dealer_id') or None,
        dealer_name=dealer_name,
        dealer_location=data.get('dealer_location') or '',
        visit_purpose=(data.get('visit_purpose') or 'ORDER').upper(),
        plan_notes=data.get('plan_notes') or 'Spot visit on route',
        visited=True,
        actual_order_bags=float(data.get('actual_order_bags') or 0.0),
        actual_order_value=float(data.get('actual_order_value') or 0.0),
        actual_collection_value=float(data.get('actual_collection_value') or 0.0),
        actual_status=(data.get('actual_status') or 'COMPLETED').upper(),
        shortfall_reason=data.get('shortfall_reason') or '',
        actual_notes=data.get('actual_notes') or '',
        completed_at=timezone.now(),
    )
    stop.save()

    return send_success(_serialize_tour_stop(stop), 'Spot visit logged successfully')


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

    # Link any existing planned stops for today to this travel log
    DailyTourPlanStop.objects.filter(user_id=user_id, date=today, travel_log__isnull=True).update(travel_log=log)
    planned_qs = DailyTourPlanStop.objects.filter(travel_log=log, is_unplanned=False)
    log.total_stops_planned = planned_qs.count()
    log.total_target_bags = sum(s.target_order_bags for s in planned_qs)
    log.total_target_collection = sum(s.target_collection_value for s in planned_qs)
    log.save()

    # Automatically mark employee PRESENT in Daily Attendance for today
    _sync_travel_to_attendance(log)

    return send_success(_serialize_travel_log(log), 'Day Trip started successfully')


@api_view(['POST'])
def travel_end(request):
    """End Day Trip: Reconcile planned vs actual stops, calculate target evaluation score, punch end KM"""
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

    # 1. RECONCILE STOPS (Planned vs Actual)
    stops_input = data.get('stops', [])
    for item in stops_input:
        stop_id = item.get('id')
        stop = None
        if stop_id and not str(stop_id).startswith('temp-'):
            stop = DailyTourPlanStop.objects.filter(id=stop_id, user_id=user_id).first()

        if not stop:
            dealer_name = (item.get('dealer_name') or '').strip()
            if not dealer_name:
                continue
            highest_order = DailyTourPlanStop.objects.filter(user_id=user_id, date=today).count() + 1
            stop = DailyTourPlanStop(
                id=f"STP-{uuid.uuid4().hex[:12].upper()}",
                user_id=user_id,
                companyid_id=log.companyid_id,
                date=today,
                travel_log=log,
                stop_order=highest_order,
                is_unplanned=True,
                dealer_id=item.get('dealer_id') or None,
                dealer_name=dealer_name,
                dealer_location=item.get('dealer_location') or '',
                visit_purpose=(item.get('visit_purpose') or 'ORDER').upper(),
                plan_notes=item.get('plan_notes') or 'Added during day end',
            )

        stop.travel_log = log
        stop.visited = bool(item.get('visited', True))
        stop.actual_order_bags = float(item.get('actual_order_bags') or 0.0)
        stop.actual_order_value = float(item.get('actual_order_value') or 0.0)
        stop.actual_collection_value = float(item.get('actual_collection_value') or 0.0)
        
        status_val = (item.get('actual_status') or ('COMPLETED' if stop.visited else 'SKIPPED')).upper()
        stop.actual_status = status_val
        stop.shortfall_reason = item.get('shortfall_reason') or ''
        stop.actual_notes = item.get('actual_notes') or ''
        if stop.visited and not stop.completed_at:
            stop.completed_at = timezone.now()
        stop.save()

    # 2. AUTO-EVALUATION METRICS CALCULATION
    all_stops = DailyTourPlanStop.objects.filter(travel_log=log)
    planned_stops = all_stops.filter(is_unplanned=False)
    visited_stops = all_stops.filter(visited=True)

    total_planned = planned_stops.count()
    total_visited = visited_stops.count()

    total_target_bags = sum(s.target_order_bags for s in planned_stops)
    total_actual_bags = sum(s.actual_order_bags for s in visited_stops)

    total_target_coll = sum(s.target_collection_value for s in planned_stops)
    total_actual_coll = sum(s.actual_collection_value for s in visited_stops)

    # Adherence % (up to 100%)
    visit_pct = (total_visited / max(total_planned, 1)) * 100.0 if total_planned > 0 else 100.0
    visit_pct = min(visit_pct, 100.0)

    # Order fulfillment % (up to 100%)
    order_pct = (total_actual_bags / total_target_bags) * 100.0 if total_target_bags > 0 else 100.0
    order_pct = min(order_pct, 100.0)

    # Collection fulfillment % (up to 100%)
    coll_pct = (total_actual_coll / total_target_coll) * 100.0 if total_target_coll > 0 else 100.0
    coll_pct = min(coll_pct, 100.0)

    # Composite Day Score
    if total_target_bags > 0 and total_target_coll > 0:
        composite = (visit_pct * 0.40) + (order_pct * 0.35) + (coll_pct * 0.25)
    elif total_target_bags > 0:
        composite = (visit_pct * 0.50) + (order_pct * 0.50)
    elif total_target_coll > 0:
        composite = (visit_pct * 0.50) + (coll_pct * 0.50)
    else:
        composite = visit_pct

    composite = round(composite, 1)

    if composite >= 95.0:
        rating = 'OUTSTANDING'
    elif composite >= 75.0:
        rating = 'TARGET_ACHIEVED'
    elif composite >= 50.0:
        rating = 'PARTIAL'
    else:
        rating = 'UNDERPERFORMED'

    log.total_stops_planned = total_planned
    log.total_stops_visited = total_visited
    log.total_target_bags = total_target_bags
    log.total_actual_bags = total_actual_bags
    log.total_target_collection = total_target_coll
    log.total_actual_collection = total_actual_coll
    log.target_achievement_pct = composite
    log.performance_rating = rating

    # 3. TEXT SUMMARIES (Auto-enrich if blank)
    visit_summary = (data.get('visit_summary') or '').strip()
    collection_summary = (data.get('collection_summary') or '').strip()
    order_summary = (data.get('order_summary') or '').strip()

    if not visit_summary and visited_stops.exists():
        visit_lines = [f"• {s.dealer_name} ({s.actual_status})" + (f" - {s.actual_notes}" if s.actual_notes else "") for s in visited_stops]
        visit_summary = "\n".join(visit_lines)

    if not collection_summary:
        colls = [s for s in visited_stops if s.actual_collection_value > 0]
        if colls:
            collection_summary = ", ".join([f"{s.dealer_name}: ₹{s.actual_collection_value:,.0f}" for s in colls])
        else:
            collection_summary = "Nil"

    if not order_summary:
        orders = [s for s in visited_stops if s.actual_order_bags > 0]
        if orders:
            order_summary = ", ".join([f"{s.dealer_name}: {s.actual_order_bags:.0f} bags" for s in orders])
        else:
            order_summary = "Nil"

    # Default fallbacks to prevent submission lock
    if not visit_summary:
        visit_summary = f"Visited {total_visited} stops across designated beat."

    log.visit_summary = visit_summary
    log.collection_summary = collection_summary
    log.order_summary = order_summary

    log.end_km = end_km
    log.total_km = round(end_km - log.start_km, 2)
    if log.approved_km is None or log.status == 'PENDING':
        log.approved_km = log.total_km

    log.end_photo = data.get('end_photo') or log.end_photo
    log.end_location = data.get('end_location') or log.end_location
    log.end_time = timezone.now()

    # Formatted composite notes
    structured_notes = [
        f"🎯 PERFORMANCE: {rating} ({composite}% Fulfillment Score)",
        f"📍 VISIT SUMMARY ({total_visited}/{total_planned} stops):\n{visit_summary}",
        f"💰 PAYMENT COLLECTION (Target: ₹{total_target_coll:,.0f} | Actual: ₹{total_actual_coll:,.0f}):\n{collection_summary}",
        f"📦 ORDER SUMMARY (Target: {total_target_bags} bags | Actual: {total_actual_bags} bags):\n{order_summary}"
    ]
    route_notes = (data.get('so_notes') or '').strip()
    if route_notes:
        structured_notes.append(f"🛣️ ROUTE / REMARKS:\n{route_notes}")
    log.so_notes = "\n\n".join(structured_notes)

    log.status = 'PENDING'
    log.save()

    # Automatically enter punched KM into Daily Attendance immediately!
    _sync_travel_to_attendance(log)

    return send_success(_serialize_travel_log(log), f"Day Trip ended! Total {log.total_km} KM recorded ({rating} - {composite}% Score)")


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
