import json
import uuid
from datetime import datetime, date, time
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q, Case, When, F, Value, IntegerField, FloatField, ExpressionWrapper
from django.db.models.functions import Greatest
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from core.models import User, Company
from .models import (
    SalesTarget, Order, Orderitem, Product, Category, Brand,
    Dealer, PaymentReceipt, DailyTourPlanStop, DailyTravelLog, PartyOnboardingRequest, Visit
)


def get_dispatched_qty_expr():
    """
    Returns an ORM expression for confirmed dispatched quantity:
    - If sentqty > 0 (dispatcher entered partial/full dispatch): sentqty - returnedqty
    - If order status is Completed/Dispatched/Delivered: qty - returnedqty
    - Otherwise (pending / unfulfilled): 0
    """
    return Greatest(
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


def get_dispatched_val_expr():
    """
    Returns an ORM expression for confirmed dispatched value (qty * price).
    """
    return ExpressionWrapper(
        get_dispatched_qty_expr() * F('price'),
        output_field=FloatField()
    )



def _get_fiscal_year_label(d: date) -> str:
    # Indian FY: April 1 to March 31
    if d.month >= 4:
        return f"{d.year}-{d.year + 1}"
    else:
        return f"{d.year - 1}-{d.year}"


def _format_inr(val: float) -> str:
    try:
        return f"₹{int(val):,}"
    except Exception:
        return f"₹{val}"


def _get_month_date_range(year: int, month: int):
    start_date = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    end_date = date.fromordinal(next_month.toordinal() - 1)
    
    start_dt = timezone.make_aware(datetime.combine(start_date, time.min))
    end_dt = timezone.make_aware(datetime.combine(end_date, time.max))
    return start_date, end_date, start_dt, end_dt


def _extract_company_id(request):
    user = getattr(request, 'user', None)
    cid = getattr(user, 'companyId', None) or getattr(user, 'companyid_id', None)
    if not cid:
        first_comp = Company.objects.first()
        if first_comp:
            cid = first_comp.id
    return cid


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_target_masters(request):
    """
    Returns lists of Sales Officers, Categories, Brands, and Products
    to populate multi-target configuration pickers.
    """
    company_id = _extract_company_id(request)
    
    so_roles = {'SALES', 'SALES_OFFICER', 'SALES OFFICER', 'SALES_EXECUTIVE', 'SALES EXECUTIVE', 'SO'}
    users_qs = User.objects.filter(companyid_id=company_id, active=True).order_by('name')
    officers = []
    for u in users_qs:
        role_upper = (u.role or '').strip().upper()
        if role_upper in so_roles or 'SALES' in role_upper:
            officers.append({
                'id': u.id,
                'name': u.name or u.email,
                'email': u.email,
                'role': u.role,
                'territory': u.territory or 'General',
                'monthlytarget': float(u.monthlytarget or 0.0),
            })

    categories_qs = Category.objects.filter(companyid_id=company_id, active=True).order_by('name')
    categories = [{'id': c.id, 'name': c.name, 'parent_id': c.parentid_id} for c in categories_qs]

    brands_qs = Brand.objects.filter(companyid_id=company_id, active=True).order_by('name')
    brands = [{'id': b.id, 'name': b.name} for b in brands_qs]

    products_qs = Product.objects.filter(companyid_id=company_id, active=True).order_by('name')[:500]
    products = [{
        'id': p.id,
        'code': p.productcode,
        'name': p.name,
        'bag_size': p.bagsize,
        'rate': p.rate,
        'category_id': p.categoryid_id,
        'brand_id': p.brandid_id,
    } for p in products_qs]

    return Response({
        'officers': officers,
        'categories': categories,
        'brands': brands,
        'products': products,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sales_targets(request):
    """
    List sales targets with live actuals for the selected month/year.
    HR/Admin see all officers; individual sales officer sees their own.
    """
    company_id = _extract_company_id(request)
    today = timezone.now().date()
    
    year = int(request.GET.get('year', today.year))
    month = int(request.GET.get('month', today.month))
    period_type = request.GET.get('period_type', 'MONTHLY').upper()
    fiscal_year = request.GET.get('fiscal_year', _get_fiscal_year_label(date(year, month, 1)))
    so_id = request.GET.get('user_id', '').strip()

    user_role = (getattr(request.user, 'role', '') or '').strip().upper()
    is_superuser = getattr(request.user, 'is_superuser', False) or user_role in {'SUPERUSER', 'SUPER_USER'}
    is_admin = is_superuser or user_role in {'ADMIN', 'SUPERADMIN', 'HR', 'MANAGEMENT', 'DIRECTOR', 'VP'}

    start_date, end_date, start_dt, end_dt = _get_month_date_range(year, month)

    so_roles = {'SALES', 'SALES_OFFICER', 'SALES OFFICER', 'SALES_EXECUTIVE', 'SALES EXECUTIVE', 'SO'}
    users_qs = User.objects.filter(companyid_id=company_id, active=True)
    if not is_admin:
        users_qs = users_qs.filter(id=request.user.id)
    elif so_id:
        users_qs = users_qs.filter(id=so_id)
    else:
        officers_match = [u for u in users_qs if (u.role or '').strip().upper() in so_roles or 'SALES' in (u.role or '').upper()]
        if officers_match:
            users_qs = users_qs.filter(id__in=[u.id for u in officers_match])

    officers_list = list(users_qs.order_by('name'))

    # Fetch existing targets for the period
    targets_qs = SalesTarget.objects.filter(
        companyid_id=company_id,
        period_type=period_type,
        fiscal_year=fiscal_year,
        month=month
    )
    targets_by_user = {t.user_id: t for t in targets_qs}

    results = []
    
    # Global aggregates
    total_target_revenue = 0.0
    total_actual_revenue = 0.0
    total_target_bags = 0.0
    total_actual_bags = 0.0
    total_target_collection = 0.0
    total_actual_collection = 0.0
    total_target_dealer_bags = 0.0
    total_actual_dealer_bags = 0.0
    total_target_non_dealer_bags = 0.0
    total_actual_non_dealer_bags = 0.0

    for u in officers_list:
        st = targets_by_user.get(u.id)

        product_targets = st.product_targets if (st and st.product_targets) else []
        sum_prod_targets = sum(float(pt.get('target_qty') or 0.0) for pt in product_targets)

        target_revenue = st.target_revenue if (st and st.target_revenue > 0) else float(u.monthlytarget or 500000.0)
        target_collection = st.target_collection if (st and st.target_collection > 0) else round(target_revenue * 0.5, 2)
        
        # When product targets are set, target_bags matches product quotas; otherwise st.target_bags or 0
        if sum_prod_targets > 0:
            target_bags = sum_prod_targets
        elif st and st.target_bags > 0:
            target_bags = st.target_bags
        else:
            target_bags = 0.0

        target_dealer_revenue = st.target_dealer_revenue if st else round(target_revenue * 0.75, 2)
        target_dealer_bags = st.target_dealer_bags if st else 0.0
        target_non_dealer_revenue = st.target_non_dealer_revenue if st else round(target_revenue * 0.25, 2)
        target_non_dealer_bags = st.target_non_dealer_bags if st else 0.0
        target_visits = st.target_visits if st else 80
        target_new_dealers = st.target_new_dealers if st else 3
        target_travel_days = st.target_travel_days if st else 22
        min_achievement_pct = st.min_achievement_pct_for_incentive if st else 80.0
        incentive_per_bag = st.incentive_per_bag if st else 0.0
        incentive_pct_on_revenue = st.incentive_pct_on_revenue if st else 0.0
        category_targets = st.category_targets if st else []
        
        raw_custom_targets = st.custom_targets if (st and st.custom_targets) else []
        incentive_slabs = st.incentive_slabs if (st and st.incentive_slabs) else []
        new_dealer_bounty = float(st.new_dealer_bounty if st else 500.0)
        min_collection_pct = float(st.min_collection_pct_for_incentive if st else 70.0)

        # Live Actuals Computation (Confirmed Warehouse Dispatch Verification)
        u_email = (u.email or '').strip()
        orders_qs = Order.objects.filter(
            Q(soemail=u) | Q(soemail__email__iexact=u_email),
            companyid_id=company_id,
            date__gte=start_dt,
            date__lte=end_dt
        ).exclude(status__in=['Cancelled', 'Rejected'])

        order_count = orders_qs.count()
        order_ids = list(orders_qs.values_list('id', flat=True))

        # Annotate line items with confirmed dispatched quantity and value
        annotated_items = Orderitem.objects.filter(orderid__in=order_ids).annotate(
            dq=get_dispatched_qty_expr(),
            dv=get_dispatched_val_expr()
        )

        ordered_bags = float(annotated_items.aggregate(s=Sum('qty'))['s'] or 0.0)
        dispatched_bags = float(annotated_items.aggregate(s=Sum('dq'))['s'] or 0.0)
        dispatched_revenue = float(annotated_items.aggregate(s=Sum('dv'))['s'] or 0.0)

        # Actual bags & revenue are counted strictly from fulfilled (Dispatched / Completed) orders
        actual_bags = dispatched_bags
        actual_revenue = dispatched_revenue

        # Channel Split (Dealer vs Non-Dealer) based on confirmed dispatch
        dealer_items = annotated_items.filter(
            Q(orderid__partytype__iexact='Dealer') | Q(orderid__distributor__isnull=False)
        )
        actual_dealer_bags = float(dealer_items.aggregate(s=Sum('dq'))['s'] or 0.0)
        actual_dealer_revenue = float(dealer_items.aggregate(s=Sum('dv'))['s'] or 0.0)

        actual_non_dealer_revenue = max(0.0, actual_revenue - actual_dealer_revenue)
        actual_non_dealer_bags = max(0.0, actual_bags - actual_dealer_bags)

        # Collections (Only approved / verified payment receipts count)
        collections_qs = PaymentReceipt.objects.filter(
            Q(submitted_by=u) | Q(submitted_by__email__iexact=u_email),
            companyid_id=company_id,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            status__in=['VERIFIED', 'APPROVED', 'verified', 'approved']
        )
        actual_collection = float(collections_qs.aggregate(s=Sum('amount'))['s'] or 0.0)
        collections_list = [
            {
                'id': cr.id,
                'date': cr.created_at.strftime('%Y-%m-%d') if cr.created_at else '',
                'party_name': cr.party_name or '—',
                'party_type': cr.party_type or 'Dealer',
                'amount': float(cr.amount or 0.0),
                'payment_mode': cr.payment_mode or 'Online',
                'status': cr.status,
                'remarks': cr.remarks or '',
                'photo_url': cr.photo_url or '',
            }
            for cr in collections_qs
        ]

        # Visits & Tour Stops
        tour_stops_qs = DailyTourPlanStop.objects.filter(
            user=u,
            date__gte=start_date,
            date__lte=end_date,
            visited=True
        )
        spot_visits_qs = Visit.objects.filter(
            Q(soemail=u) | Q(soemail__email__iexact=u_email),
            createdat__gte=start_dt,
            createdat__lte=end_dt
        )
        actual_visits = tour_stops_qs.count() + spot_visits_qs.count()

        # Onboarding
        actual_new_dealers = PartyOnboardingRequest.objects.filter(
            Q(submitted_by=u) | Q(submitted_by__email__iexact=u_email),
            companyid_id=company_id,
            created_at__gte=start_dt,
            created_at__lte=end_dt
        ).count()
        if actual_new_dealers == 0:
            actual_new_dealers = Dealer.objects.filter(
                companyid_id=company_id,
                createdat__gte=start_dt,
                createdat__lte=end_dt,
                assignedsoemails__icontains=u_email
            ).count()

        # Active Travel Days
        actual_travel_days = DailyTourPlanStop.objects.filter(
            user=u,
            date__gte=start_date,
            date__lte=end_date,
            visited=True
        ).values('date').distinct().count()

        # Category Actuals (Fulfilled Dispatched/Completed only)
        cat_order_items = annotated_items.values('productid__categoryid__name').annotate(
            bags=Sum('dq'),
            val=Sum('dv')
        )
        cat_actuals_map = {
            (item['productid__categoryid__name'] or 'Uncategorized'): {
                'bags': float(item['bags'] or 0.0),
                'revenue': float(item['val'] or 0.0)
            }
            for item in cat_order_items
        }

        enriched_category_targets = []
        for ct in category_targets:
            cname = ct.get('category_name', '')
            act = cat_actuals_map.get(cname, {'bags': 0.0, 'revenue': 0.0})
            tb = float(ct.get('target_bags', 0.0))
            ach_pct = round((act['bags'] / tb * 100.0), 1) if tb > 0 else 0.0
            enriched_category_targets.append({
                **ct,
                'actual_bags': act['bags'],
                'actual_revenue': act['revenue'],
                'achievement_pct': ach_pct,
            })

        # Focus SKU, Category & Brand Actuals Aggregation with Contributing Orders Breakdown
        detailed_items = list(annotated_items.select_related(
            'orderid', 'productid', 'productid__categoryid', 'productid__brandid'
        ))

        sku_actuals_by_id = {}
        sku_actuals_by_code = {}
        sku_actuals_by_name = {}
        sku_orders_by_id = {}
        sku_orders_by_code = {}
        sku_orders_by_name = {}

        cat_actuals_by_id = {}
        cat_actuals_by_name = {}
        cat_orders_by_id = {}
        cat_orders_by_name = {}

        brand_actuals_by_id = {}
        brand_actuals_by_name = {}
        brand_orders_by_id = {}
        brand_orders_by_name = {}

        all_contributing_orders = []

        for item in detailed_items:
            o = item.orderid
            p = item.productid
            if not o or not p:
                continue

            pid = str(p.id)
            pcode = (p.productcode or '').strip().upper()
            pname = (p.name or '').strip().upper()
            cid = str(p.categoryid_id or '')
            cname = (p.categoryid.name or '').strip().upper() if p.categoryid else ''
            bid = str(p.brandid_id or '')
            bname = (p.brandid.name or '').strip().upper() if p.brandid else ''

            booked_qty = float(item.qty or 0.0)
            dq = float(item.dq or 0.0)
            amt = float(item.dv or 0.0)

            order_entry = {
                'order_id': o.orderid,
                'date': o.date.strftime('%Y-%m-%d') if o.date else '',
                'party_name': o.partyname or '—',
                'party_type': o.partytype or ('Dealer' if o.distributor else 'Direct Project'),
                'status': o.status,
                'product_id': pid,
                'product_name': p.name,
                'product_code': p.productcode or '',
                'category_name': p.categoryid.name if p.categoryid else '—',
                'brand_name': p.brandid.name if p.brandid else '—',
                'ordered_qty': booked_qty,
                'dispatched_qty': dq,
                'price': float(item.price or 0.0),
                'dispatched_value': amt,
                'is_counted': dq > 0,
            }
            all_contributing_orders.append(order_entry)

            # SKU aggregation
            for key, act_store, ord_store in [
                (pid, sku_actuals_by_id, sku_orders_by_id),
                (pcode, sku_actuals_by_code, sku_orders_by_code),
                (pname, sku_actuals_by_name, sku_orders_by_name)
            ]:
                if key:
                    if key not in act_store:
                        act_store[key] = {'qty': 0.0, 'booked_qty': 0.0, 'dispatched_qty': 0.0, 'amount': 0.0}
                        ord_store[key] = []
                    act_store[key]['qty'] += dq
                    act_store[key]['booked_qty'] += booked_qty
                    act_store[key]['dispatched_qty'] += dq
                    act_store[key]['amount'] += amt
                    ord_store[key].append(order_entry)

            # Category aggregation
            for key, act_store, ord_store in [
                (cid, cat_actuals_by_id, cat_orders_by_id),
                (cname, cat_actuals_by_name, cat_orders_by_name)
            ]:
                if key:
                    if key not in act_store:
                        act_store[key] = {'qty': 0.0, 'booked_qty': 0.0, 'dispatched_qty': 0.0, 'amount': 0.0}
                        ord_store[key] = []
                    act_store[key]['qty'] += dq
                    act_store[key]['booked_qty'] += booked_qty
                    act_store[key]['dispatched_qty'] += dq
                    act_store[key]['amount'] += amt
                    ord_store[key].append(order_entry)

            # Brand aggregation
            for key, act_store, ord_store in [
                (bid, brand_actuals_by_id, brand_orders_by_id),
                (bname, brand_actuals_by_name, brand_orders_by_name)
            ]:
                if key:
                    if key not in act_store:
                        act_store[key] = {'qty': 0.0, 'booked_qty': 0.0, 'dispatched_qty': 0.0, 'amount': 0.0}
                        ord_store[key] = []
                    act_store[key]['qty'] += dq
                    act_store[key]['booked_qty'] += booked_qty
                    act_store[key]['dispatched_qty'] += dq
                    act_store[key]['amount'] += amt
                    ord_store[key].append(order_entry)

        enriched_product_targets = []
        total_prod_target_qty = 0.0
        total_prod_actual_qty = 0.0
        for pt in product_targets:
            target_type = (pt.get('target_type') or 'product').lower()
            if target_type == 'category':
                cid = str(pt.get('category_id') or pt.get('product_id') or '')
                cname = (pt.get('category_name') or pt.get('product_name') or '').strip().upper()
                act = cat_actuals_by_id.get(cid) or cat_actuals_by_name.get(cname) or {'qty': 0.0, 'booked_qty': 0.0, 'dispatched_qty': 0.0, 'amount': 0.0}
                orders_list = cat_orders_by_id.get(cid) or cat_orders_by_name.get(cname) or []
                display_name = pt.get('category_name') or pt.get('product_name') or 'Category'
            elif target_type == 'brand':
                bid = str(pt.get('brand_id') or pt.get('product_id') or '')
                bname = (pt.get('brand_name') or pt.get('product_name') or '').strip().upper()
                act = brand_actuals_by_id.get(bid) or brand_actuals_by_name.get(bname) or {'qty': 0.0, 'booked_qty': 0.0, 'dispatched_qty': 0.0, 'amount': 0.0}
                orders_list = brand_orders_by_id.get(bid) or brand_orders_by_name.get(bname) or []
                display_name = pt.get('brand_name') or pt.get('product_name') or 'Brand'
            else: # 'product' (SKU)
                pid = str(pt.get('product_id') or '')
                pcode = (pt.get('product_code') or '').strip().upper()
                pname = (pt.get('product_name') or '').strip().upper()
                act = (
                    sku_actuals_by_id.get(pid) or
                    sku_actuals_by_code.get(pcode) or
                    sku_actuals_by_name.get(pname) or
                    {'qty': 0.0, 'booked_qty': 0.0, 'dispatched_qty': 0.0, 'amount': 0.0}
                )
                orders_list = sku_orders_by_id.get(pid) or sku_orders_by_code.get(pcode) or sku_orders_by_name.get(pname) or []
                display_name = pt.get('product_name') or 'Product'

            tqty = float(pt.get('target_qty', 0.0))
            ach_pct = round((act['qty'] / tqty * 100.0), 1) if tqty > 0 else 0.0
            total_prod_target_qty += tqty
            total_prod_actual_qty += act['qty']
            enriched_product_targets.append({
                **pt,
                'target_type': target_type,
                'display_name': display_name,
                'product_name': display_name,
                'actual_qty': act['qty'],
                'booked_qty': act.get('booked_qty', 0.0),
                'dispatched_qty': act['dispatched_qty'],
                'actual_amount': act['amount'],
                'achievement_pct': ach_pct,
                'orders': orders_list,
            })

        # If custom product targets exist, prioritize them for bag quotas
        if product_targets and total_prod_target_qty > 0:
            target_bags = total_prod_target_qty
            actual_bags = total_prod_actual_qty

        # Dynamic Custom Targets Actuals Computation (Visits, Meets, Direct Site activities)
        enriched_custom_targets = []
        for ct in raw_custom_targets:
            t_name = (ct.get('name') or '').lower()
            t_uom = (ct.get('uom') or '').lower()
            t_val = float(ct.get('target_val') or 0.0)
            act_val = 0.0

            if t_uom == 'visits':
                if 'project' in t_name or 'site' in t_name:
                    act_val = (
                        tour_stops_qs.filter(
                            Q(visit_purpose__icontains='PROJECT') |
                            Q(dealer_id__startswith='PRJ') |
                            Q(dealer_name__icontains='project') |
                            Q(dealer_name__icontains='site') |
                            Q(plan_notes__icontains='project') |
                            Q(plan_notes__icontains='site')
                        ).count() +
                        spot_visits_qs.filter(
                            Q(dealername__icontains='project') |
                            Q(dealername__icontains='site') |
                            Q(remarks__icontains='project') |
                            Q(remarks__icontains='site')
                        ).count()
                    )
                elif 'dealer' in t_name or 'routine' in t_name:
                    act_val = tour_stops_qs.count()
                else:
                    act_val = actual_visits
            elif t_uom == 'meets':
                if 'mason' in t_name:
                    act_val = (
                        tour_stops_qs.filter(
                            Q(visit_purpose__icontains='MASON') |
                            Q(plan_notes__icontains='mason') |
                            Q(actual_notes__icontains='mason')
                        ).count() +
                        spot_visits_qs.filter(
                            Q(remarks__icontains='mason')
                        ).count()
                    )
                elif 'distributor' in t_name:
                    act_val = (
                        tour_stops_qs.filter(
                            Q(visit_purpose__icontains='DISTRIBUTOR_MEET') |
                            Q(plan_notes__icontains='distributor meet') |
                            Q(actual_notes__icontains='distributor meet')
                        ).count() +
                        spot_visits_qs.filter(
                            Q(remarks__icontains='distributor meet')
                        ).count()
                    )
                elif 'dealer' in t_name:
                    act_val = (
                        tour_stops_qs.filter(
                            Q(visit_purpose__icontains='DEALER_MEET') |
                            Q(plan_notes__icontains='dealer meet') |
                            Q(actual_notes__icontains='dealer meet')
                        ).count() +
                        spot_visits_qs.filter(
                            Q(remarks__icontains='dealer meet')
                        ).count()
                    )
                else:
                    act_val = (
                        tour_stops_qs.filter(
                            Q(visit_purpose__icontains='MEET') |
                            Q(plan_notes__icontains='meet')
                        ).count() +
                        spot_visits_qs.filter(
                            Q(remarks__icontains='meet')
                        ).count()
                    )
            elif t_uom in ['pkts', 'boxes', 'box']:
                act_val = float(annotated_items.filter(
                    Q(productid__name__icontains='grout') | Q(productid__bagsize__icontains='pkt') | Q(productid__bagsize__icontains='kg')
                ).aggregate(s=Sum('dq'))['s'] or 0.0)
            elif t_uom in ['₹', 'rs', 'inr']:
                if 'dealer' in t_name:
                    act_val = actual_dealer_revenue
                elif 'project' in t_name or 'direct' in t_name:
                    act_val = actual_non_dealer_revenue
                elif 'collection' in t_name:
                    act_val = actual_collection
                else:
                    act_val = actual_revenue
            elif t_uom == 'bags':
                if 'dealer' in t_name:
                    act_val = actual_dealer_bags
                elif 'project' in t_name or 'direct' in t_name:
                    act_val = actual_non_dealer_bags
                else:
                    act_val = actual_bags
            elif t_uom == 'dealers':
                act_val = actual_new_dealers
            else:
                act_val = float(ct.get('actual_val') or 0.0)

            target_cat_name = (ct.get('category_name') or ct.get('name') or '').strip().upper()
            ct_orders = cat_orders_by_name.get(target_cat_name) or [
                ord_item for ord_item in all_contributing_orders
                if target_cat_name in (ord_item.get('category_name') or '').upper() or target_cat_name in (ord_item.get('product_name') or '').upper()
            ]
            c_ach_pct = round((act_val / t_val * 100.0), 1) if t_val > 0 else 0.0
            enriched_custom_targets.append({
                **ct,
                'target_val': t_val,
                'actual_val': act_val,
                'achievement_pct': c_ach_pct,
                'orders': ct_orders,
            })

        # Achievement %
        rev_ach_pct = round((actual_revenue / target_revenue * 100.0), 1) if target_revenue > 0 else 0.0
        bag_ach_pct = round((actual_bags / target_bags * 100.0), 1) if target_bags > 0 else 0.0
        overall_fulfillment_pct = round(max(rev_ach_pct, bag_ach_pct) if target_bags > 0 else rev_ach_pct, 1)

        # -------------------------------------------------------------
        # ENTERPRISE TIERED INCENTIVE & ACCELERATOR CALCULATION
        # -------------------------------------------------------------
        active_slab = None
        base_incentive = 0.0
        for slab in incentive_slabs:
            s_min = float(slab.get('min_pct', 0.0))
            s_max = float(slab.get('max_pct', 999.0))
            if s_min <= overall_fulfillment_pct <= s_max:
                active_slab = slab
                base_incentive = round(actual_bags * float(slab.get('rate_per_bag', 0.0)), 2)
                break

        # Legacy fallback if slabs empty or below 80%
        if base_incentive == 0 and overall_fulfillment_pct >= min_achievement_pct:
            if incentive_per_bag > 0 and actual_bags > 0:
                base_incentive += round(actual_bags * incentive_per_bag, 2)
            if incentive_pct_on_revenue > 0 and actual_revenue > 0:
                base_incentive += round(actual_revenue * (incentive_pct_on_revenue / 100.0), 2)

        # Custom categories kicker bonus
        custom_incentive_kicker = 0.0
        for ct in enriched_custom_targets:
            irate = float(ct.get('incentive_rate', 0.0))
            if irate > 0 and float(ct.get('actual_val', 0.0)) > 0:
                custom_incentive_kicker += round(float(ct['actual_val']) * irate, 2)

        # New Dealer Onboarding Bounty
        dealer_bounty_earned = round(actual_new_dealers * new_dealer_bounty, 2)
        gross_incentive = round(base_incentive + custom_incentive_kicker + dealer_bounty_earned, 2)

        # Collection Gatekeeper / Safety Rule
        coll_pct = round((actual_collection / target_collection * 100.0), 1) if target_collection > 0 else 0.0
        is_collection_cleared = coll_pct >= min_collection_pct
        if is_collection_cleared or gross_incentive == 0:
            net_incentive = gross_incentive
            collection_penalty_msg = f"Collection cleared ({coll_pct}% >= {min_collection_pct}% threshold)"
            penalty_applied = False
        else:
            net_incentive = round(gross_incentive * 0.5, 2)
            collection_penalty_msg = f"Collection ({coll_pct}%) below {min_collection_pct}% safety threshold. 50% held until recovery."
            penalty_applied = True

        # Next Tier Accelerator Engine
        if overall_fulfillment_pct < 80.0:
            bags_to_next = max(1, round(target_bags * 0.8 - actual_bags))
            potential_payout = round((actual_bags + bags_to_next) * 3.0 + custom_incentive_kicker + dealer_bounty_earned, 2)
            next_tier = {
                'tier_name': 'Base Tier (80%)',
                'target_pct': 80.0,
                'bags_needed': bags_to_next,
                'potential_earnings': potential_payout,
                'extra_cash': potential_payout,
                'headline': f"Sell {bags_to_next} more bags to qualify for {_format_inr(potential_payout)} incentive!",
            }
        elif overall_fulfillment_pct < 100.0:
            bags_to_next = max(1, round(target_bags * 1.0 - actual_bags))
            potential_payout = round((actual_bags + bags_to_next) * 6.0 + custom_incentive_kicker + dealer_bounty_earned, 2)
            next_tier = {
                'tier_name': 'Target Achiever (100%)',
                'target_pct': 100.0,
                'bags_needed': bags_to_next,
                'potential_earnings': potential_payout,
                'extra_cash': round(potential_payout - net_incentive, 2),
                'headline': f"Sell {bags_to_next} more bags to unlock Target Tier and earn an extra {_format_inr(round(potential_payout - net_incentive, 2))}!",
            }
        elif overall_fulfillment_pct < 120.0:
            bags_to_next = max(1, round(target_bags * 1.2 - actual_bags))
            potential_payout = round((actual_bags + bags_to_next) * 10.0 + custom_incentive_kicker + dealer_bounty_earned, 2)
            next_tier = {
                'tier_name': 'Super Achiever (120%+)',
                'target_pct': 120.0,
                'bags_needed': bags_to_next,
                'potential_earnings': potential_payout,
                'extra_cash': round(potential_payout - net_incentive, 2),
                'headline': f"Sell {bags_to_next} more bags to unlock Super Achiever Tier (₹10/bag) and earn an extra {_format_inr(round(potential_payout - net_incentive, 2))}!",
            }
        else:
            next_tier = {
                'tier_name': 'Super Achiever Pinnacle',
                'target_pct': 120.0,
                'bags_needed': 0,
                'potential_earnings': gross_incentive,
                'extra_cash': 0,
                'headline': "Outstanding! You are in the Top Tier of enterprise performance.",
            }

        is_qualified_for_incentive = net_incentive > 0

        total_target_revenue += target_revenue
        total_actual_revenue += actual_revenue
        total_target_bags += target_bags
        total_actual_bags += actual_bags
        total_target_collection += target_collection
        total_actual_collection += actual_collection
        total_target_dealer_bags += target_dealer_bags
        total_actual_dealer_bags += actual_dealer_bags
        total_target_non_dealer_bags += target_non_dealer_bags
        total_actual_non_dealer_bags += actual_non_dealer_bags

        results.append({
            'target_id': st.id if st else None,
            'is_configured': bool(st),
            'user': {
                'id': u.id,
                'name': u.name or u.email,
                'email': u.email,
                'role': u.role,
                'territory': u.territory or 'General',
            },
            'period': {
                'fiscal_year': fiscal_year,
                'year': year,
                'month': month,
                'period_type': period_type,
            },
            'targets': {
                'target_revenue': target_revenue,
                'target_bags': target_bags,
                'target_collection': target_collection,
                'target_dealer_revenue': target_dealer_revenue,
                'target_dealer_bags': target_dealer_bags,
                'target_non_dealer_revenue': target_non_dealer_revenue,
                'target_non_dealer_bags': target_non_dealer_bags,
                'target_visits': target_visits,
                'target_new_dealers': target_new_dealers,
                'target_travel_days': target_travel_days,
                'category_targets': enriched_category_targets,
                'product_targets': enriched_product_targets,
                'custom_targets': enriched_custom_targets,
                'incentive_slabs': incentive_slabs,
                'new_dealer_bounty': new_dealer_bounty,
                'min_collection_pct_for_incentive': min_collection_pct,
                'min_achievement_pct_for_incentive': min_achievement_pct,
                'incentive_per_bag': incentive_per_bag,
                'incentive_pct_on_revenue': incentive_pct_on_revenue,
                'notes': st.notes if st else '',
            },
            'actuals': {
                'actual_revenue': actual_revenue,
                'actual_bags': actual_bags,
                'ordered_bags': ordered_bags,
                'dispatched_bags': dispatched_bags,
                'order_count': order_count,
                'actual_collection': actual_collection,
                'collections': collections_list,
                'actual_dealer_revenue': actual_dealer_revenue,
                'actual_dealer_bags': actual_dealer_bags,
                'actual_non_dealer_revenue': actual_non_dealer_revenue,
                'actual_non_dealer_bags': actual_non_dealer_bags,
                'actual_visits': actual_visits,
                'actual_new_dealers': actual_new_dealers,
                'actual_travel_days': actual_travel_days,
                'orders': all_contributing_orders,
            },
            'fulfillment': {
                'revenue_pct': rev_ach_pct,
                'bags_pct': bag_ach_pct,
                'overall_pct': overall_fulfillment_pct,
                'collection_pct': coll_pct,
                'is_qualified_for_incentive': is_qualified_for_incentive,
                'estimated_incentive': net_incentive,
                'gross_incentive': gross_incentive,
                'base_incentive': base_incentive,
                'custom_incentive_kicker': custom_incentive_kicker,
                'dealer_bounty_earned': dealer_bounty_earned,
                'active_tier': active_slab.get('label') if active_slab else ('Below Threshold (<80%)' if overall_fulfillment_pct < 80 else 'Standard Achiever'),
                'collection_penalty_applied': penalty_applied,
                'collection_penalty_msg': collection_penalty_msg,
                'next_tier': next_tier,
            }
        })

    overall_company_ach_pct = round((total_actual_revenue / total_target_revenue * 100.0), 1) if total_target_revenue > 0 else 0.0

    return Response({
        'is_admin': is_admin,
        'filter': {
            'year': year,
            'month': month,
            'fiscal_year': fiscal_year,
            'period_type': period_type,
            'date_range_label': f"{date(year, month, 1).strftime('%B %Y')}",
        },
        'summary': {
            'total_officers': len(officers_list),
            'configured_officers': len([r for r in results if r['is_configured']]),
            'total_target_revenue': round(total_target_revenue, 2),
            'total_actual_revenue': round(total_actual_revenue, 2),
            'total_target_bags': round(total_target_bags, 1),
            'total_actual_bags': round(total_actual_bags, 1),
            'total_target_collection': round(total_target_collection, 2),
            'total_actual_collection': round(total_actual_collection, 2),
            'total_target_dealer_bags': round(total_target_dealer_bags, 1),
            'total_actual_dealer_bags': round(total_actual_dealer_bags, 1),
            'total_target_non_dealer_bags': round(total_target_non_dealer_bags, 1),
            'total_actual_non_dealer_bags': round(total_actual_non_dealer_bags, 1),
            'overall_achievement_pct': overall_company_ach_pct,
        },
        'officers': results
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upsert_sales_target(request):
    """
    Create or update multi-dimensional sales target for an officer.
    """
    company_id = _extract_company_id(request)
    user_role = (getattr(request.user, 'role', '') or '').strip().upper()
    is_superuser = getattr(request.user, 'is_superuser', False) or user_role in {'SUPERUSER', 'SUPER_USER'}
    is_admin = is_superuser or user_role in {'ADMIN', 'SUPERADMIN', 'HR', 'MANAGEMENT', 'DIRECTOR', 'VP'}

    data = request.data
    target_user_id = data.get('user_id')
    if not target_user_id:
        return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not is_admin:
        if str(target_user_id) != str(request.user.id):
            return Response({'error': 'Only HR and Administrators can allocate sales targets for other officers.'}, status=status.HTTP_403_FORBIDDEN)

    target_user = User.objects.filter(id=target_user_id, companyid_id=company_id).first()
    if not target_user:
        return Response({'error': 'Sales Officer not found in this company.'}, status=status.HTTP_404_NOT_FOUND)

    fiscal_year = data.get('fiscal_year', '2026-2027')
    month = int(data.get('month', timezone.now().month))
    period_type = data.get('period_type', 'MONTHLY').upper()

    target_revenue = float(data.get('target_revenue', 0.0))
    product_targets = data.get('product_targets', [])
    sum_prod_qty = sum(float(pt.get('target_qty') or 0.0) for pt in product_targets)
    if sum_prod_qty > 0:
        target_bags = sum_prod_qty
    else:
        target_bags = float(data.get('target_bags', 0.0))

    target_collection = float(data.get('target_collection', 0.0))
    if target_collection <= 0 and target_revenue > 0:
        target_collection = round(target_revenue * 0.5, 2)

    target_dealer_bags = float(data.get('target_dealer_bags', 0.0))
    target_dealer_revenue = float(data.get('target_dealer_revenue', 0.0))
    target_non_dealer_bags = float(data.get('target_non_dealer_bags', 0.0))
    target_non_dealer_revenue = float(data.get('target_non_dealer_revenue', 0.0))

    target_visits = int(data.get('target_visits', 80))
    target_new_dealers = int(data.get('target_new_dealers', 3))
    target_travel_days = int(data.get('target_travel_days', 22))

    category_targets = data.get('category_targets', [])
    custom_targets = data.get('custom_targets', [])
    incentive_slabs = data.get('incentive_slabs', [])
    new_dealer_bounty = float(data.get('new_dealer_bounty', 500.0))
    min_collection_pct = float(data.get('min_collection_pct_for_incentive', 70.0))

    min_ach = float(data.get('min_achievement_pct_for_incentive', 80.0))
    inc_bag = float(data.get('incentive_per_bag', 0.0))
    inc_rev = float(data.get('incentive_pct_on_revenue', 0.0))
    notes = data.get('notes', '')

    try:
        creator_id = getattr(request.user, 'id', None)
        creator_user = User.objects.filter(id=creator_id).first() if creator_id else None

        st, created = SalesTarget.objects.get_or_create(
            companyid_id=company_id,
            user=target_user,
            period_type=period_type,
            fiscal_year=fiscal_year,
            month=month,
            defaults={
                'id': str(uuid.uuid4()),
                'target_revenue': target_revenue,
                'target_bags': target_bags,
                'target_collection': target_collection,
                'target_dealer_revenue': target_dealer_revenue,
                'target_dealer_bags': target_dealer_bags,
                'target_non_dealer_revenue': target_non_dealer_revenue,
                'target_non_dealer_bags': target_non_dealer_bags,
                'target_visits': target_visits,
                'target_new_dealers': target_new_dealers,
                'target_travel_days': target_travel_days,
                'category_targets': category_targets,
                'product_targets': product_targets,
                'custom_targets': custom_targets,
                'incentive_slabs': incentive_slabs,
                'new_dealer_bounty': new_dealer_bounty,
                'min_collection_pct_for_incentive': min_collection_pct,
                'min_achievement_pct_for_incentive': min_ach,
                'incentive_per_bag': inc_bag,
                'incentive_pct_on_revenue': inc_rev,
                'notes': notes,
                'created_by': creator_user,
            }
        )

        if not created:
            st.target_revenue = target_revenue
            st.target_bags = target_bags
            st.target_collection = target_collection
            st.target_dealer_revenue = target_dealer_revenue
            st.target_dealer_bags = target_dealer_bags
            st.target_non_dealer_revenue = target_non_dealer_revenue
            st.target_non_dealer_bags = target_non_dealer_bags
            st.target_visits = target_visits
            st.target_new_dealers = target_new_dealers
            st.target_travel_days = target_travel_days
            st.category_targets = category_targets
            st.product_targets = product_targets
            st.custom_targets = custom_targets
            st.incentive_slabs = incentive_slabs
            st.new_dealer_bounty = new_dealer_bounty
            st.min_collection_pct_for_incentive = min_collection_pct
            st.min_achievement_pct_for_incentive = min_ach
            st.incentive_per_bag = inc_bag
            st.incentive_pct_on_revenue = inc_rev
            st.notes = notes
            st.save()

        if target_revenue > 0:
            target_user.monthlytarget = target_revenue
            target_user.save(update_fields=['monthlytarget'])

        return Response({
            'message': f"Target {'created' if created else 'updated'} successfully for {target_user.name or target_user.email}.",
            'target_id': st.id,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def copy_previous_targets(request):
    """
    One-click copy targets from Month A to Month B, with optional growth % multiplier.
    """
    company_id = _extract_company_id(request)
    user_role = (getattr(request.user, 'role', '') or '').strip().upper()
    is_superuser = getattr(request.user, 'is_superuser', False) or user_role in {'SUPERUSER', 'SUPER_USER'}
    is_admin = is_superuser or user_role in {'ADMIN', 'SUPERADMIN', 'HR', 'MANAGEMENT', 'DIRECTOR', 'VP'}

    if not is_admin:
        return Response({'error': 'Only HR and Administrators can replicate targets.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    from_year = int(data.get('from_year'))
    from_month = int(data.get('from_month'))
    to_year = int(data.get('to_year'))
    to_month = int(data.get('to_month'))
    growth_pct = float(data.get('growth_pct', 0.0))
    multiplier = 1.0 + (growth_pct / 100.0)

    from_targets = SalesTarget.objects.filter(
        companyid_id=company_id,
        month=from_month,
        period_type='MONTHLY'
    )

    if not from_targets.exists():
        return Response({'error': f'No targets found for source month {from_month}/{from_year}.'}, status=status.HTTP_404_NOT_FOUND)

    to_fy = _get_fiscal_year_label(date(to_year, to_month, 1))
    copied_count = 0

    for st in from_targets:
        new_rev = round(st.target_revenue * multiplier, 2)
        new_bags = round(st.target_bags * multiplier, 1)
        new_col = round(st.target_collection * multiplier, 2)
        new_dealer_rev = round(st.target_dealer_revenue * multiplier, 2)
        new_dealer_bags = round(st.target_dealer_bags * multiplier, 1)
        new_non_dealer_rev = round(st.target_non_dealer_revenue * multiplier, 2)
        new_non_dealer_bags = round(st.target_non_dealer_bags * multiplier, 1)

        new_categories = []
        for ct in (st.category_targets or []):
            new_categories.append({
                **ct,
                'target_bags': round(float(ct.get('target_bags', 0.0)) * multiplier, 1),
                'target_revenue': round(float(ct.get('target_revenue', 0.0)) * multiplier, 2),
            })

        new_products = []
        for pt in (st.product_targets or []):
            new_products.append({
                **pt,
                'target_qty': round(float(pt.get('target_qty', 0.0)) * multiplier, 1),
                'target_amount': round(float(pt.get('target_amount', 0.0)) * multiplier, 2),
            })

        new_custom_targets = []
        for ct in (st.custom_targets or []):
            new_custom_targets.append({
                **ct,
                'target_val': round(float(ct.get('target_val', 0.0)) * multiplier, 1),
            })

        creator_id = getattr(request.user, 'id', None)
        creator_user = User.objects.filter(id=creator_id).first() if creator_id else None

        dest_st, _ = SalesTarget.objects.get_or_create(
            companyid_id=company_id,
            user=st.user,
            period_type='MONTHLY',
            fiscal_year=to_fy,
            month=to_month,
            defaults={
                'id': str(uuid.uuid4()),
                'target_revenue': new_rev,
                'target_bags': new_bags,
                'target_collection': new_col,
                'target_dealer_revenue': new_dealer_rev,
                'target_dealer_bags': new_dealer_bags,
                'target_non_dealer_revenue': new_non_dealer_rev,
                'target_non_dealer_bags': new_non_dealer_bags,
                'target_visits': st.target_visits,
                'target_new_dealers': st.target_new_dealers,
                'target_travel_days': st.target_travel_days,
                'category_targets': new_categories,
                'product_targets': new_products,
                'custom_targets': new_custom_targets,
                'incentive_slabs': st.incentive_slabs,
                'new_dealer_bounty': st.new_dealer_bounty,
                'min_collection_pct_for_incentive': st.min_collection_pct_for_incentive,
                'min_achievement_pct_for_incentive': st.min_achievement_pct_for_incentive,
                'incentive_per_bag': st.incentive_per_bag,
                'incentive_pct_on_revenue': st.incentive_pct_on_revenue,
                'notes': f"Copied from {from_month}/{from_year} with {growth_pct}% growth",
                'created_by': creator_user,
            }
        )
        dest_st.target_revenue = new_rev
        dest_st.target_bags = new_bags
        dest_st.target_collection = new_col
        dest_st.target_dealer_revenue = new_dealer_rev
        dest_st.target_dealer_bags = new_dealer_bags
        dest_st.target_non_dealer_revenue = new_non_dealer_rev
        dest_st.target_non_dealer_bags = new_non_dealer_bags
        dest_st.category_targets = new_categories
        dest_st.product_targets = new_products
        dest_st.custom_targets = new_custom_targets
        dest_st.incentive_slabs = st.incentive_slabs
        dest_st.new_dealer_bounty = st.new_dealer_bounty
        dest_st.min_collection_pct_for_incentive = st.min_collection_pct_for_incentive
        dest_st.save()

        copied_count += 1

    return Response({
        'message': f"Successfully copied targets for {copied_count} sales officers to {to_month}/{to_year} (with {growth_pct}% growth applied).",
        'copied_count': copied_count,
    }, status=status.HTTP_200_OK)
