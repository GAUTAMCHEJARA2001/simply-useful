"""
Sales Officer Performance Scorecard & Evaluation Engine.
Evaluates Sales Officers across 5 Professional Enterprise KPI Pillars:
1. Order Booking & Revenue (30% weight)
2. Counter Visits & Beat Adherence (25% weight)
3. Payment & Outstanding Collection (20% weight)
4. Market Expansion & New Dealer Onboarding (15% weight)
5. Field Travel Discipline & Attendance (10% weight)

Supports WEEKLY, MONTHLY, and YEARLY evaluation intervals with normalized targets,
leaderboard ranking, letter grades, and actionable strengths/growth coaching insights.
"""

import calendar
from datetime import datetime, date, timedelta
from django.db.models import (
    Sum, Q, Case, When, F, Value, IntegerField, FloatField, ExpressionWrapper
)
from django.db.models.functions import Greatest
from django.utils import timezone

from api.models import (
    DailyTravelLog,
    DailyTourPlanStop,
    Order,
    Orderitem,
    PaymentReceipt,
    PartyOnboardingRequest,
    Visit,
    User,
    SalesTarget,
)


def _get_fiscal_year_label(d: date) -> str:
    # Indian FY: April 1 to March 31
    if d.month >= 4:
        return f"{d.year}-{d.year + 1}"
    else:
        return f"{d.year - 1}-{d.year}"


def _get_date_range(period='MONTHLY', year=None, month=None, week=None):
    """
    Compute precise start_date and end_date for WEEKLY, MONTHLY, or YEARLY periods.
    """
    today = timezone.localdate() if hasattr(timezone, 'localdate') else date.today()
    curr_year = int(year) if year else today.year
    curr_month = int(month) if month else today.month

    # Ensure valid month
    if curr_month < 1 or curr_month > 12:
        curr_month = today.month

    period = (period or 'MONTHLY').upper().strip()

    if period == 'WEEKLY':
        if week is not None and str(week).isdigit():
            w = int(week)
            # Standard month weeks: W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-28, W5: 29-end
            days_in_month = calendar.monthrange(curr_year, curr_month)[1]
            start_day = min(1 + (w - 1) * 7, days_in_month)
            end_day = min(start_day + 6, days_in_month)
            start_date = date(curr_year, curr_month, start_day)
            end_date = date(curr_year, curr_month, end_day)
            period_label = f"Week {w}, {calendar.month_abbr[curr_month]} {curr_year}"
        else:
            # Rolling 7 days (today - 6 days through today)
            end_date = today
            start_date = today - timedelta(days=6)
            period_label = f"Last 7 Days ({start_date.strftime('%d %b')} - {end_date.strftime('%d %b')})"
    elif period == 'YEARLY':
        start_date = date(curr_year, 1, 1)
        end_date = date(curr_year, 12, 31)
        period_label = f"Calendar Year {curr_year}"
    else:  # MONTHLY (Default)
        days_in_month = calendar.monthrange(curr_year, curr_month)[1]
        start_date = date(curr_year, curr_month, 1)
        end_date = date(curr_year, curr_month, days_in_month)
        period_label = f"{calendar.month_name[curr_month]} {curr_year}"

    start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time())) if timezone.is_naive(datetime.combine(start_date, datetime.min.time())) else datetime.combine(start_date, datetime.min.time())
    end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time())) if timezone.is_naive(datetime.combine(end_date, datetime.max.time())) else datetime.combine(end_date, datetime.max.time())

    return {
        'period': period,
        'year': curr_year,
        'month': curr_month,
        'week': week,
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d'),
        '_start_date': start_date,
        '_end_date': end_date,
        'start_datetime': start_datetime,
        'end_datetime': end_datetime,
        'label': period_label,
    }


def get_so_scorecard(company_id, period='MONTHLY', year=None, month=None, week=None, so_email=None, is_admin=True, request_user=None):
    """
    Main evaluation function for Sales Officers.
    Returns:
    {
      'is_admin': True | False,
      'date_range': { 'period', 'start_date', 'end_date', 'label', ... },
      'summary': { 'total_officers', 'team_avg_score', 'total_bags', 'total_revenue', ... },
      'officers': [ ... ]
    }
    """
    range_info = _get_date_range(period=period, year=year, month=month, week=week)
    start_date = range_info['_start_date']
    end_date = range_info['_end_date']
    start_dt = range_info['start_datetime']
    end_dt = range_info['end_datetime']
    period_type = range_info['period']
    curr_year = range_info.get('year', start_date.year)
    curr_month = range_info.get('month', start_date.month)

    # 1. Fetch Sales Officers in company
    so_roles = {'SALES', 'SALES_OFFICER', 'SALES OFFICER', 'SALES_EXECUTIVE', 'SALES EXECUTIVE', 'SO'}
    users_qs = User.objects.filter(companyid_id=company_id, active=True)
    all_users = list(users_qs)

    if not is_admin:
        # Non-admin sales officer can ONLY see their own score
        target_email = (so_email or getattr(request_user, 'email', '') or '').strip().lower()
        matched = [u for u in all_users if (u.email or '').strip().lower() == target_email]
        if not matched and request_user:
            matched = [request_user]
        so_users = matched
    else:
        # Admin / Superuser sees all sales officers
        so_users = [u for u in all_users if (u.role or '').strip().upper() in so_roles]

        if not so_users:
            so_users = [u for u in all_users if 'SALES' in (u.role or '').upper()]
        if not so_users:
            so_users = all_users

        if so_email:
            clean_email = so_email.strip().lower()
            matched = [u for u in so_users if (u.email or '').strip().lower() == clean_email]
            if matched:
                so_users = matched

    # Determine baseline period working days & benchmarks
    total_days = (end_date - start_date).days + 1
    if period_type == 'WEEKLY':
        benchmark_working_days = min(6, total_days)
        benchmark_visits = 20
        benchmark_new_dealers = 1
        period_multiplier = 0.25
    elif period_type == 'YEARLY':
        benchmark_working_days = 280
        benchmark_visits = 960
        benchmark_new_dealers = 36
        period_multiplier = 12.0
    else:  # MONTHLY
        benchmark_working_days = 24
        benchmark_visits = 80
        benchmark_new_dealers = 3
        period_multiplier = 1.0

    officers_results = []

    for u in so_users:
        u_email = (u.email or '').strip()
        u_id = u.id

        # Check if HR configured a specific multi-target in SalesTarget table
        target_month = int(month) if month else curr_month
        target_year = int(year) if year else curr_year
        fy_label = _get_fiscal_year_label(date(target_year, target_month, 1))
        st = SalesTarget.objects.filter(
            companyid_id=company_id,
            user=u,
            fiscal_year=fy_label,
            month=target_month
        ).first()
        if not st:
            st = SalesTarget.objects.filter(
                companyid_id=company_id,
                user=u,
                month=target_month
            ).first()

        raw_monthly_target = float(u.monthlytarget or 0.0)
        if st and st.target_revenue > 0:
            target_revenue = round(st.target_revenue * period_multiplier, 2)
            target_bags = round((st.target_bags if st.target_bags > 0 else (st.target_revenue / 350.0)) * period_multiplier, 1)
            target_collection_val = round((st.target_collection if st.target_collection > 0 else (target_revenue * 0.5)) * period_multiplier, 2)
            if st.target_visits > 0:
                benchmark_visits = round(st.target_visits * period_multiplier)
            if st.target_new_dealers > 0:
                benchmark_new_dealers = max(1, round(st.target_new_dealers * period_multiplier))
        else:
            if raw_monthly_target > 0:
                target_revenue = round(raw_monthly_target * period_multiplier, 2)
            else:
                target_revenue = round(500000.0 * period_multiplier, 2)
            target_bags = round(target_revenue / 350.0, 1)
            target_collection_val = round(target_revenue * 0.5, 2)

        # -------------------------------------------------------------
        # 1. PILLAR 1: ORDER BOOKING & REVENUE (Max 30 Pts)
        # -------------------------------------------------------------
        user_orders = Order.objects.filter(
            Q(soemail=u) | Q(soemail__email__iexact=u_email),
            companyid_id=company_id,
            date__gte=start_dt,
            date__lte=end_dt
        ).exclude(status__in=['Cancelled', 'Rejected'])

        order_count = user_orders.count()
        order_ids = list(user_orders.values_list('id', flat=True))

        # Confirmed Dispatched Quantities and Values
        dispatched_expr = Greatest(
            Value(0),
            Case(
                When(sentqty__gt=0, then=F('sentqty')),
                When(
                    orderid__status__in=[
                        'Completed', 'Dispatched', 'Delivered',
                        'COMPLETED', 'DISPATCHED', 'DELIVERED',
                        'completed', 'dispatched', 'delivered'
                    ],
                    then=F('qty')
                ),
                default=Value(0),
                output_field=IntegerField()
            ) - F('returnedqty')
        )
        dispatched_val_expr = ExpressionWrapper(
            dispatched_expr * F('price'),
            output_field=FloatField()
        )

        annotated_items = Orderitem.objects.filter(orderid__in=order_ids).annotate(
            dq=dispatched_expr,
            dv=dispatched_val_expr
        )
        order_item_bags = float(annotated_items.aggregate(s=Sum('dq'))['s'] or 0.0)
        dispatched_rev = float(annotated_items.aggregate(s=Sum('dv'))['s'] or 0.0)

        beat_stops_orders = DailyTourPlanStop.objects.filter(
            user=u,
            date__gte=start_date,
            date__lte=end_date,
            visited=True
        ).aggregate(
            bags=Sum('actual_order_bags'),
            val=Sum('actual_order_value')
        )
        beat_order_bags = float(beat_stops_orders['bags'] or 0.0)
        beat_order_val = float(beat_stops_orders['val'] or 0.0)

        actual_bags = max(order_item_bags, beat_order_bags)
        actual_revenue = max(dispatched_rev, beat_order_val)
        # If orders had bags booked without explicit price, estimate revenue
        if actual_revenue <= 0 and actual_bags > 0:
            actual_revenue = round(actual_bags * 350.0, 2)

        # Channel Split (Dealer vs Non-Dealer) based on confirmed dispatch
        dealer_orders_qs = user_orders.filter(Q(partytype__iexact='Dealer') | Q(distributor__isnull=False))
        dealer_order_ids = list(dealer_orders_qs.values_list('id', flat=True))
        dealer_items = annotated_items.filter(orderid__in=dealer_order_ids)
        actual_dealer_bags = float(dealer_items.aggregate(s=Sum('dq'))['s'] or 0.0)
        actual_dealer_revenue = float(dealer_items.aggregate(s=Sum('dv'))['s'] or 0.0)
        actual_non_dealer_revenue = max(0.0, actual_revenue - actual_dealer_revenue)
        actual_non_dealer_bags = max(0.0, actual_bags - actual_dealer_bags)

        rev_fulfillment = (actual_revenue / target_revenue * 100.0) if target_revenue > 0 else 0.0
        vol_fulfillment = (actual_bags / target_bags * 100.0) if target_bags > 0 else 0.0
        order_fulfillment_pct = round(max(rev_fulfillment, vol_fulfillment), 1)

        p1_score = round(min(30.0, (min(100.0, order_fulfillment_pct) / 100.0) * 30.0), 1)

        # -------------------------------------------------------------
        # 2. PILLAR 2: COUNTER VISITS & BEAT PLAN (Max 25 Pts)
        # -------------------------------------------------------------
        plan_stops_qs = DailyTourPlanStop.objects.filter(
            user=u,
            date__gte=start_date,
            date__lte=end_date
        )

        planned_count = plan_stops_qs.filter(is_unplanned=False).count()
        visited_count = plan_stops_qs.filter(visited=True).count()
        unplanned_count = plan_stops_qs.filter(is_unplanned=True, visited=True).count()

        photo_verified = plan_stops_qs.filter(visited=True).filter(~Q(visit_photo__isnull=True) & ~Q(visit_photo='')).count()
        gps_verified = plan_stops_qs.filter(visited=True).filter(~Q(gps_location__isnull=True) & ~Q(gps_location='')).count()

        logged_visits_count = Visit.objects.filter(
            Q(soemail=u) | Q(soemail__email__iexact=u_email),
            companyid_id=company_id,
            date__gte=start_dt,
            date__lte=end_dt
        ).count()

        effective_visits = max(visited_count, logged_visits_count)

        if planned_count > 0:
            beat_adherence_pct = round((plan_stops_qs.filter(is_unplanned=False, visited=True).count() / planned_count) * 100.0, 1)
        else:
            beat_adherence_pct = 100.0 if effective_visits > 0 else 0.0

        proof_verified_count = max(photo_verified, gps_verified)
        proof_compliance_pct = round((proof_verified_count / effective_visits * 100.0), 1) if effective_visits > 0 else 0.0

        strike_rate_pct = round((order_count / effective_visits * 100.0), 1) if effective_visits > 0 else 0.0

        p2_volume = min(12.0, (effective_visits / benchmark_visits) * 12.0)
        p2_adherence = (min(100.0, beat_adherence_pct) / 100.0) * 8.0
        p2_proof = (min(100.0, proof_compliance_pct) / 100.0) * 5.0

        p2_score = round(min(25.0, p2_volume + p2_adherence + p2_proof), 1)

        # -------------------------------------------------------------
        # 3. PILLAR 3: PAYMENT & COLLECTION (Max 20 Pts)
        # -------------------------------------------------------------
        receipts_qs = PaymentReceipt.objects.filter(
            companyid_id=company_id,
            submitted_by=u,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            status__in=['VERIFIED', 'APPROVED', 'verified', 'approved']
        )

        receipts_sum = float(receipts_qs.aggregate(s=Sum('amount'))['s'] or 0.0)
        verified_receipts_sum = receipts_sum
        receipt_count = receipts_qs.count()

        stop_collections_agg = plan_stops_qs.filter(visited=True).aggregate(
            act=Sum('actual_collection_value'),
            tgt=Sum('target_collection_value')
        )
        stop_actual_coll = float(stop_collections_agg['act'] or 0.0)
        stop_target_coll = float(stop_collections_agg['tgt'] or 0.0)

        actual_collection = max(receipts_sum, stop_actual_coll)
        collection_target = target_collection_val if target_collection_val > 0 else (stop_target_coll if stop_target_coll > 0 else round(target_revenue * 0.5, 2))

        coll_fulfill_pct = round((actual_collection / collection_target * 100.0), 1) if collection_target > 0 else (100.0 if actual_collection > 0 else 50.0)

        p3_fulfill = (min(100.0, coll_fulfill_pct) / 100.0) * 15.0
        p3_integrity = min(5.0, (receipt_count / max(1, benchmark_working_days * 0.3)) * 5.0)

        p3_score = round(min(20.0, p3_fulfill + p3_integrity), 1)

        # -------------------------------------------------------------
        # 4. PILLAR 4: MARKET EXPANSION & ONBOARDING (Max 15 Pts)
        # -------------------------------------------------------------
        onboard_qs = PartyOnboardingRequest.objects.filter(
            companyid_id=company_id,
            submitted_by=u,
            created_at__gte=start_dt,
            created_at__lte=end_dt
        ).exclude(status='REJECTED')

        onboard_submitted = onboard_qs.count()
        onboard_approved = onboard_qs.filter(status='APPROVED').count()

        converted_new_dealers = plan_stops_qs.filter(actual_status='CONVERTED_NEW_DEALER').count()
        effective_new_dealers = max(onboard_submitted, converted_new_dealers)

        p4_volume = min(12.0, (effective_new_dealers / benchmark_new_dealers) * 12.0)
        p4_quality = min(3.0, (onboard_approved / max(1, benchmark_new_dealers)) * 3.0) if onboard_approved > 0 else (1.5 if effective_new_dealers > 0 else 0.0)

        p4_score = round(min(15.0, p4_volume + p4_quality), 1)

        # -------------------------------------------------------------
        # 5. PILLAR 5: TRAVEL DISCIPLINE & ATTENDANCE (Max 10 Pts)
        # -------------------------------------------------------------
        travel_logs_qs = DailyTravelLog.objects.filter(
            companyid_id=company_id,
            user=u,
            date__gte=start_date,
            date__lte=end_date
        )

        active_travel_days = travel_logs_qs.count()
        total_km = float(travel_logs_qs.aggregate(s=Sum('total_km'))['s'] or 0.0)

        odometer_photo_compliance_count = travel_logs_qs.filter(
            ~Q(start_photo__isnull=True) & ~Q(start_photo='') &
            ~Q(end_photo__isnull=True) & ~Q(end_photo='')
        ).count()

        odometer_compliance_pct = round((odometer_photo_compliance_count / active_travel_days * 100.0), 1) if active_travel_days > 0 else 0.0
        attendance_pct = round((active_travel_days / benchmark_working_days * 100.0), 1)

        p5_attendance = min(6.0, (active_travel_days / benchmark_working_days) * 6.0)
        p5_odometer = (min(100.0, odometer_compliance_pct) / 100.0) * 4.0

        p5_score = round(min(10.0, p5_attendance + p5_odometer), 1)

        # -------------------------------------------------------------
        # COMPOSITE SCORE & GRADE CALCULATION
        # -------------------------------------------------------------
        composite = round(p1_score + p2_score + p3_score + p4_score + p5_score, 1)

        if composite >= 90.0:
            grade = 'A+'
            badge = 'ELITE'
            grade_label = 'Elite Performer'
            badge_color = 'bg-emerald-500 text-white'
        elif composite >= 75.0:
            grade = 'A'
            badge = 'ACHIEVER'
            grade_label = 'Target Achieved'
            badge_color = 'bg-blue-500 text-white'
        elif composite >= 60.0:
            grade = 'B'
            badge = 'CONSISTENT'
            grade_label = 'Consistent'
            badge_color = 'bg-amber-500 text-white'
        elif composite >= 40.0:
            grade = 'C'
            badge = 'AVERAGE'
            grade_label = 'Needs Improvement'
            badge_color = 'bg-orange-500 text-white'
        else:
            grade = 'D'
            badge = 'CRITICAL'
            grade_label = 'Critical Attention'
            badge_color = 'bg-rose-500 text-white'

        # -------------------------------------------------------------
        # STRENGTHS & OPPORTUNITIES COACHING TAGS
        # -------------------------------------------------------------
        strengths = []
        improvements = []

        if p1_score >= 24.0:
            strengths.append(f"High order fulfillment ({order_fulfillment_pct:.0f}% target achieved)")
        elif p1_score < 14.0:
            improvements.append("Order volume is lagging behind period target")

        if p2_score >= 20.0:
            strengths.append(f"Excellent beat adherence ({beat_adherence_pct:.0f}%) and visit discipline")
        elif p2_score < 12.0:
            improvements.append("Increase daily dealer visits and counter touchpoints")

        if p3_score >= 16.0:
            strengths.append("Strong payment & outstanding collection recovery")
        elif p3_score < 10.0:
            improvements.append("Prioritize overdue payment collections from visited dealers")

        if p4_score >= 11.0:
            strengths.append(f"Active market expansion ({effective_new_dealers} new dealer onboardings)")
        elif p4_score < 5.0:
            improvements.append("Focus on expanding territory network with new dealer sign-ups")

        if p5_score >= 8.5:
            strengths.append("High travel discipline and verified odometer photo compliance")
        elif p5_score < 5.0:
            improvements.append("Ensure daily odometer start & end photos are always recorded")

        if not strengths:
            strengths.append("Consistent regular beat attendance")
        if not improvements:
            improvements.append("Maintain top-tier performance across all 5 pillars")

        officers_results.append({
            'user_id': u_id,
            'name': u.name or u_email.split('@')[0].capitalize(),
            'email': u_email,
            'territory': u.territory or 'General Territory',
            'role': u.role or 'Sales Officer',
            'composite_score': composite,
            'grade': grade,
            'badge': badge,
            'grade_label': grade_label,
            'badge_color': badge_color,
            'pillars': {
                'orders': {
                    'name': 'Order Booking & Value',
                    'score': p1_score,
                    'max_score': 30.0,
                    'percentage': round((p1_score / 30.0) * 100.0, 1),
                    'actual_bags': actual_bags,
                    'target_bags': target_bags,
                    'actual_revenue': actual_revenue,
                    'target_revenue': target_revenue,
                    'actual_dealer_bags': round(actual_dealer_bags, 1),
                    'actual_dealer_revenue': round(actual_dealer_revenue, 2),
                    'target_dealer_bags': round(st.target_dealer_bags * period_multiplier, 1) if (st and st.target_dealer_bags > 0) else round(target_bags * 0.75, 1),
                    'target_dealer_revenue': round(st.target_dealer_revenue * period_multiplier, 2) if (st and st.target_dealer_revenue > 0) else round(target_revenue * 0.75, 2),
                    'actual_non_dealer_bags': round(actual_non_dealer_bags, 1),
                    'actual_non_dealer_revenue': round(actual_non_dealer_revenue, 2),
                    'target_non_dealer_bags': round(st.target_non_dealer_bags * period_multiplier, 1) if (st and st.target_non_dealer_bags > 0) else round(target_bags * 0.25, 1),
                    'target_non_dealer_revenue': round(st.target_non_dealer_revenue * period_multiplier, 2) if (st and st.target_non_dealer_revenue > 0) else round(target_revenue * 0.25, 2),
                    'category_targets': st.category_targets if st else [],
                    'product_targets': st.product_targets if st else [],
                    'custom_targets': st.custom_targets if st else [],
                    'incentive_slabs': st.incentive_slabs if st else [],
                    'new_dealer_bounty': float(st.new_dealer_bounty if st else 500.0),
                    'min_collection_pct_for_incentive': float(st.min_collection_pct_for_incentive if st else 70.0),
                    'order_count': order_count,
                    'fulfillment_pct': order_fulfillment_pct,
                    'weight_pct': 30,
                },

                'visits': {
                    'name': 'Dealer Visits & Beat Plan',
                    'score': p2_score,
                    'max_score': 25.0,
                    'percentage': round((p2_score / 25.0) * 100.0, 1),
                    'effective_visits': effective_visits,
                    'planned_count': planned_count,
                    'unplanned_count': unplanned_count,
                    'beat_adherence_pct': beat_adherence_pct,
                    'proof_compliance_pct': proof_compliance_pct,
                    'strike_rate_pct': strike_rate_pct,
                    'weight_pct': 25,
                },
                'payments': {
                    'name': 'Payment & Collections',
                    'score': p3_score,
                    'max_score': 20.0,
                    'percentage': round((p3_score / 20.0) * 100.0, 1),
                    'actual_collection': actual_collection,
                    'collection_target': collection_target,
                    'verified_receipts_sum': verified_receipts_sum,
                    'receipt_count': receipt_count,
                    'fulfillment_pct': coll_fulfill_pct,
                    'weight_pct': 20,
                },
                'onboarding': {
                    'name': 'New Dealer Onboarding',
                    'score': p4_score,
                    'max_score': 15.0,
                    'percentage': round((p4_score / 15.0) * 100.0, 1),
                    'new_dealers': effective_new_dealers,
                    'approved_count': onboard_approved,
                    'submitted_count': onboard_submitted,
                    'converted_count': converted_new_dealers,
                    'weight_pct': 15,
                },
                'discipline': {
                    'name': 'Travel & Attendance Discipline',
                    'score': p5_score,
                    'max_score': 10.0,
                    'percentage': round((p5_score / 10.0) * 100.0, 1),
                    'active_days': active_travel_days,
                    'benchmark_days': benchmark_working_days,
                    'total_km': total_km,
                    'odometer_compliance_pct': odometer_compliance_pct,
                    'attendance_pct': attendance_pct,
                    'weight_pct': 10,
                }
            },
            'strengths': strengths,
            'improvements': improvements,
        })

    # Sort officers descending by composite score
    officers_results.sort(key=lambda x: x['composite_score'], reverse=True)

    # Assign Leaderboard Ranks
    for idx, officer in enumerate(officers_results):
        officer['rank'] = idx + 1

    # Team / Personal Summary Statistics
    total_officers = len(officers_results)
    avg_score = round(sum(o['composite_score'] for o in officers_results) / total_officers, 1) if total_officers > 0 else 0.0
    total_team_bags = round(sum(o['pillars']['orders']['actual_bags'] for o in officers_results), 1)
    total_team_revenue = round(sum(o['pillars']['orders']['actual_revenue'] for o in officers_results), 2)
    total_team_visits = sum(o['pillars']['visits']['effective_visits'] for o in officers_results)
    total_team_collections = round(sum(o['pillars']['payments']['actual_collection'] for o in officers_results), 2)
    total_team_new_dealers = sum(o['pillars']['onboarding']['new_dealers'] for o in officers_results)

    # Remove internal datetime objects from response
    range_info.pop('_start_date', None)
    range_info.pop('_end_date', None)
    range_info.pop('start_datetime', None)
    range_info.pop('end_datetime', None)

    return {
        'is_admin': bool(is_admin),
        'date_range': range_info,
        'summary': {
            'total_officers': total_officers,
            'team_avg_score': avg_score,
            'total_team_bags': total_team_bags,
            'total_team_revenue': total_team_revenue,
            'total_team_visits': total_team_visits,
            'total_team_collections': total_team_collections,
            'total_team_new_dealers': total_team_new_dealers,
        },
        'officers': officers_results,
    }
