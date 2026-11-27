"""
Director Boardroom Command Center API View.
Provides accurate executive enterprise intelligence for Company Directors & Owners:
  - Top-line Gross Billed Sales (Fulfilled/Dispatched/Completed orders, IST-accurate)
  - Raw Material Consumption Valuation (COGS of Sold Goods via BOM & real FIFO Purchase Cost — never selling price)
  - Actual Plant Raw Material Consumed (from CONSUMED production stock transactions)
  - Gross Profit & Recipe Margin %
  - Accurate Payroll Liabilities (Fixed monthly prorated minus absences + Variable Daily Wages + OT + Bag Incentives)
  - Payment Collections & Live Net Market Receivables (DSO based on trailing 30-day run-rate)
  - Net Director Operating Surplus (EBITDA Proxy)
  - Factory Manufacturing Output (Batches, Units, Real RM Consumed Value)
  - Sales Field Operations (Visits, Travel Efficiency using actual employee KM rates, Strike Rate)
  - Accurate 6-Month Calendar Trajectory (real monthly billed sales, real monthly BOM COGS, real collections)
"""
import calendar
import datetime
import re
from zoneinfo import ZoneInfo
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status

from api.views import send_success, send_error, _get_company_id
from api.models import (
    Order, Orderitem, Product, PaymentReceipt, Expense,
    Dealer, Distributor, DailyTravelLog, Visit, Stocktransaction,
    CreditNoteDiscountRequest, Labour, SalarySlip, DailyAttendance,
    LeaveRecord, PartyManualLedgerEntry, Bom, Bomitem,
    Purchase, Purchaseitem
)
from core.models import User, Company, Warehouse
from api.services.costing_service import compute_product_warehouse_costs, compute_bom_cost_breakdown

IST = ZoneInfo('Asia/Kolkata')

# Strictly realized / billed order statuses (never include Cancelled, Rejected, Pending, or fully Returned)
BILLED_ORDER_STATUSES = [
    'Completed', 'Dispatched', 'Partially Dispatched', 'Delivered', 'Partially Returned',
    'COMPLETED', 'DISPATCHED', 'PARTIALLY DISPATCHED', 'DELIVERED', 'PARTIALLY RETURNED',
    'completed', 'dispatched', 'partially dispatched', 'delivered', 'partially returned',
]

PENDING_PIPELINE_STATUSES = [
    'Pending', 'Approved', 'PENDING', 'APPROVED', 'pending', 'approved',
]

# Cost sources from costing_service that represent REAL purchase cost (not selling rate fallback)
REAL_PURCHASE_COST_SOURCES = {'FIFO_PURCHASE_LAYERS', 'LATEST_PURCHASE'}


def _normalize_sku_key(name: str) -> str:
    """Normalize product/BOM names for resilient matching (handles 'coupen'/'coupon', spaces, parentheses)."""
    if not name:
        return ''
    s = name.strip().lower()
    s = s.replace('coupen', 'coupon')
    s = re.sub(r'[()\[\]]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def _ist_day_bounds(start_date: datetime.date, end_date: datetime.date):
    """Returns timezone-aware IST start (00:00:00+05:30) and end (23:59:59.999999+05:30)."""
    start_dt = datetime.datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, 0, tzinfo=IST)
    end_dt = datetime.datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, 999999, tzinfo=IST)
    return start_dt, end_dt


def _parse_director_date_range(request):
    """
    Parses period parameter ('today', 'wtd', 'mtd', 'qtd', 'ytd', 'custom') in Asia/Kolkata (IST)
    and returns (start_dt, end_dt, start_date, end_date, prev_start_dt, prev_end_dt, period_name, period_days).
    """
    now_ist = timezone.now().astimezone(IST)
    today = now_ist.date()
    period = (request.query_params.get('period') or 'mtd').lower().strip()
    custom_start = request.query_params.get('start_date')
    custom_end = request.query_params.get('end_date')

    if period == 'today':
        start_date = today
        end_date = today
        prev_start_date = today - datetime.timedelta(days=1)
        prev_end_date = prev_start_date
        period_name = "Today"

    elif period == 'wtd':
        start_date = today - datetime.timedelta(days=today.weekday())
        end_date = today
        prev_start_date = start_date - datetime.timedelta(days=7)
        prev_end_date = start_date - datetime.timedelta(days=1)
        period_name = "This Week"

    elif period == 'qtd':
        cur_m = today.month
        cur_y = today.year
        if cur_m in (4, 5, 6):
            q_start_m = 4
        elif cur_m in (7, 8, 9):
            q_start_m = 7
        elif cur_m in (10, 11, 12):
            q_start_m = 10
        else:
            q_start_m = 1
        start_date = datetime.date(cur_y, q_start_m, 1)
        end_date = today
        prev_end_date = start_date - datetime.timedelta(days=1)
        prev_start_m = ((q_start_m - 4) % 12) + 1
        prev_start_y = cur_y if q_start_m > 3 else cur_y - 1
        prev_start_date = datetime.date(prev_start_y, prev_start_m, 1)
        period_name = f"Q{((q_start_m - 1) // 3) + 1} (Quarter-to-Date)"

    elif period == 'ytd':
        fy_year = today.year if today.month >= 4 else (today.year - 1)
        start_date = datetime.date(fy_year, 4, 1)
        end_date = today
        prev_start_date = datetime.date(fy_year - 1, 4, 1)
        try:
            prev_end_date = datetime.date(today.year - 1, today.month, today.day)
        except ValueError:
            prev_end_date = datetime.date(today.year - 1, today.month, 28)
        period_name = f"FY {fy_year}-{str(fy_year + 1)[2:]} (Year-to-Date)"

    elif period == 'custom' and custom_start and custom_end:
        try:
            s_parts = [int(p) for p in custom_start.split('-')]
            e_parts = [int(p) for p in custom_end.split('-')]
            start_date = datetime.date(s_parts[0], s_parts[1], s_parts[2])
            end_date = datetime.date(e_parts[0], e_parts[1], e_parts[2])
            if end_date < start_date:
                start_date, end_date = end_date, start_date
            p_days = max(1, (end_date - start_date).days + 1)
            prev_end_date = start_date - datetime.timedelta(days=1)
            prev_start_date = prev_end_date - datetime.timedelta(days=p_days - 1)
            period_name = f"{start_date.strftime('%d-%m-%Y')} to {end_date.strftime('%d-%m-%Y')}"
        except Exception:
            start_date = today.replace(day=1)
            end_date = today
            prev_end_date = start_date - datetime.timedelta(days=1)
            prev_start_date = prev_end_date.replace(day=1)
            period_name = today.strftime('%B %Y (MTD)')

    else:
        # Default: Month-To-Date (MTD)
        start_date = today.replace(day=1)
        end_date = today
        prev_end_date = start_date - datetime.timedelta(days=1)
        prev_start_date = prev_end_date.replace(day=1)
        period_name = today.strftime('%B %Y (MTD)')

    period_days = max(1, (end_date - start_date).days + 1)
    start_dt, end_dt = _ist_day_bounds(start_date, end_date)
    prev_start_dt, prev_end_dt = _ist_day_bounds(prev_start_date, prev_end_date)

    return start_dt, end_dt, start_date, end_date, prev_start_dt, prev_end_dt, period_name, period_days


def _days_in_record_month(rec_date, fallback_date: datetime.date) -> int:
    """Return calendar days in the month of rec_date (date or YYYY-MM-DD str)."""
    if isinstance(rec_date, (datetime.date, datetime.datetime)):
        return calendar.monthrange(rec_date.year, rec_date.month)[1]
    if isinstance(rec_date, str) and len(rec_date) >= 7:
        try:
            y, m = int(rec_date[:4]), int(rec_date[5:7])
            return calendar.monthrange(y, m)[1]
        except ValueError:
            pass
    return calendar.monthrange(fallback_date.year, fallback_date.month)[1]


def _calc_attendance_extras(emp, att, base_hourly: float) -> float:
    """Compute net attendance extras (OT + bag/sales incentives + bike/car/other travel - late deduction)."""
    ot_hours = float(getattr(att, 'ot_hours', 0.0) or 0.0)
    ot_pay = ot_hours * (base_hourly * float(getattr(emp, 'overtime_hourly_rate', 0.0) or 0.0))

    late_hours = float(getattr(att, 'late_hours', 0.0) or 0.0)
    late_deduction = late_hours * (base_hourly * float(getattr(emp, 'late_deduction_rate', 0.0) or 0.0))

    bags = float(getattr(att, 'bags_produced', 0.0) or 0.0)
    bag_pay = bags * float(getattr(emp, 'bag_incentive_rate', 0.0) or 0.0)

    sales = float(getattr(att, 'sales_achieved', 0.0) or 0.0)
    sales_incentive = sales * float(getattr(emp, 'sales_incentive_pct', 0.0) or 0.0)

    tv = (getattr(att, 'travel_vehicle', None) or '').upper()
    km = float(getattr(att, 'km_travelled', 0.0) or 0.0)
    if tv == 'BIKE':
        travel_pay = km * float(getattr(emp, 'bike_allowance_per_km', 0.0) or 0.0)
    elif tv == 'CAR':
        travel_pay = km * float(getattr(emp, 'car_allowance_per_km', 0.0) or 0.0)
    elif tv == 'OTHER':
        travel_pay = float(getattr(att, 'actual_travel_amount', 0.0) or 0.0)
    else:
        travel_pay = 0.0

    return ot_pay + bag_pay + sales_incentive + travel_pay - late_deduction


def _compute_accurate_payroll(company_id, start_date: datetime.date, end_date: datetime.date):
    """
    Computes exact actual payroll liability for [start_date, end_date] matching HR PayrollTab rules:
      - FIXED staff: only actual inputted DailyAttendance (PRESENT=1.0, WEEKLY_OFF=1.0, HALF_DAY=0.5)
        and paid LeaveRecord (FULL_DAY=1.0, HALF_DAY=0.5) multiplied by (base_salary_monthly / days_in_month),
        plus OT pay, bag/sales incentives, and bike/car/other travel expenses. Days without inputted data count as 0.
      - VARIABLE staff: actual DailyAttendance PRESENT (1.0) + HALF_DAY (0.5) + Paid Leaves
        multiplied by dailywage, plus OT pay, bag/sales incentives, and bike/car/other travel expenses.
        Days without inputted data count as 0.
    Returns dict with fixed_payroll, variable_payroll, total_payroll, fixed_headcount, variable_headcount,
    present_variable_days, labour_by_user_id, labour_by_name.
    """
    labour_qs = Labour.objects.filter(active=True).exclude(employee_type='NONE')
    if company_id:
        labour_qs = labour_qs.filter(companyid_id=company_id)

    staff_list = list(labour_qs)
    fixed_staff = [l for l in staff_list if (l.employee_type or '').upper() == 'FIXED']
    var_staff = [l for l in staff_list if (l.employee_type or '').upper() == 'VARIABLE']

    labour_by_user_id = {}
    labour_by_name = {}
    for l in staff_list:
        if getattr(l, 'user_id', None):
            labour_by_user_id[l.user_id] = l
        if l.name:
            labour_by_name[l.name.strip().lower()] = l

    # Fetch DailyAttendance records in date range
    att_qs = DailyAttendance.objects.filter(date__range=(start_date, end_date))
    if company_id:
        att_qs = att_qs.filter(labourid__companyid_id=company_id)

    att_by_emp = {}
    for att in att_qs:
        att_by_emp.setdefault(att.labourid_id, []).append(att)

    # Fetch Paid Leaves in date range
    leave_qs = LeaveRecord.objects.filter(date__range=(start_date, end_date), is_paid=True)
    if company_id:
        leave_qs = leave_qs.filter(labourid__companyid_id=company_id)
    leaves_by_emp = {}
    for lv in leave_qs:
        leaves_by_emp.setdefault(lv.labourid_id, []).append(lv)

    fixed_payroll = 0.0
    for emp in fixed_staff:
        monthly_sal = float(emp.base_salary_monthly or 0.0)
        accrued_base = 0.0
        extras = 0.0

        for a in att_by_emp.get(emp.id, []):
            dim = _days_in_record_month(a.date, start_date)
            daily_rate = monthly_sal / float(dim)
            base_hourly = daily_rate / 8.0

            st = (a.status or '').upper()
            if st in ('PRESENT', 'WEEKLY_OFF'):
                accrued_base += daily_rate
            elif st == 'HALF_DAY':
                accrued_base += 0.5 * daily_rate

            extras += _calc_attendance_extras(emp, a, base_hourly)

        for lv in leaves_by_emp.get(emp.id, []):
            dim = _days_in_record_month(lv.date, start_date)
            daily_rate = monthly_sal / float(dim)
            val = 0.5 if (lv.status or '').upper() == 'HALF_DAY' else 1.0
            accrued_base += val * daily_rate

        fixed_payroll += max(0.0, accrued_base + extras)

    variable_payroll = 0.0
    present_var_days = 0.0
    for emp in var_staff:
        daily_wage = float(getattr(emp, 'dailywage', 0.0) or 0.0)
        base_hourly = daily_wage / 8.0

        payable_days = 0.0
        extras = 0.0
        for a in att_by_emp.get(emp.id, []):
            st = (a.status or '').upper()
            if st == 'PRESENT':
                payable_days += 1.0
            elif st == 'HALF_DAY':
                payable_days += 0.5
            extras += _calc_attendance_extras(emp, a, base_hourly)

        for lv in leaves_by_emp.get(emp.id, []):
            payable_days += 0.5 if (lv.status or '').upper() == 'HALF_DAY' else 1.0
        present_var_days += payable_days

        variable_payroll += max(0.0, (payable_days * daily_wage) + extras)

    return {
        'fixed_payroll': round(fixed_payroll, 2),
        'variable_payroll': round(variable_payroll, 2),
        'total_payroll': round(fixed_payroll + variable_payroll, 2),
        'fixed_headcount': len(fixed_staff),
        'variable_headcount': len(var_staff),
        'present_variable_days': round(present_var_days, 1),
        'labour_by_user_id': labour_by_user_id,
        'labour_by_name': labour_by_name,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def director_boardroom_command_center(request):
    """
    Boardroom Command Center View for Company Directors & Superadmins.
    Aggregates verified P&L, Raw Material Consumption (COGS), Payroll,
    Market Collections, Live Receivables, and Factory/Field Operational Health.
    """
    now_ist = timezone.now().astimezone(IST)
    # 1. Privileged Role Check - Exclusively Super Admin
    user = getattr(request, 'user', None)
    user_role = (getattr(user, 'role', '') or '').upper()
    is_superadmin = (
        getattr(user, 'is_superuser', False) or
        user_role in ('SUPERADMIN', 'SUPER_ADMIN')
    )
    if not is_superadmin:
        return send_error(
            'Director Boardroom Command Center and P&L metrics are exclusively restricted to Super Admin.',
            status_code=status.HTTP_403_FORBIDDEN
        )

    company_id = _get_company_id(request)

    # 2. IST-Accurate Date Range
    start_dt, end_dt, start_date, end_date, prev_start_dt, prev_end_dt, period_name, period_days = _parse_director_date_range(request)

    # 3. Product Valuation Map & Fast In-Memory Product Map
    cost_map_by_id, cost_map_by_name = compute_product_warehouse_costs(company_id=company_id)

    prods_qs = Product.objects.select_related('unitid').filter(companyid_id=company_id) if company_id else Product.objects.select_related('unitid').all()
    prod_map = {}
    for p in prods_qs:
        if p.name:
            prod_map[p.name.strip().lower()] = p
            prod_map[p.name] = p
        if p.productcode:
            prod_map[p.productcode.strip().lower()] = p
            prod_map[p.productcode] = p

    # 3b. Pre-compute BOM Recipe RM Cost per unit/bag (with fast prod_map & empty sales_rates_by_id — zero N+1 queries)
    bom_qs = Bom.objects.filter(companyid_id=company_id) if company_id else Bom.objects.all()
    bom_by_id = {}
    bom_by_code = {}
    bom_by_name = {}
    bom_by_norm = {}

    for bom_obj in bom_qs.prefetch_related('bomitem_set', 'warehouseid'):
        bom_data = compute_bom_cost_breakdown(
            bom_obj,
            valuation_by_id=cost_map_by_id,
            valuation_by_name=cost_map_by_name,
            company_id=company_id,
            sales_rates_by_id={},
            prod_map=prod_map,
        )
        if bom_data:
            u_cost = float(bom_data.get('unitCost') or 0.0)
            p_id = bom_data.get('productId')
            p_code = (bom_data.get('productCode') or '').strip().lower()
            p_name = (bom_data.get('productName') or '').strip().lower()
            b_name = (bom_obj.name or '').strip().lower()

            if p_id:
                bom_by_id[p_id] = u_cost
            if p_code:
                bom_by_code[p_code] = u_cost
            if p_name:
                bom_by_name[p_name] = u_cost
                bom_by_norm[_normalize_sku_key(p_name)] = u_cost
            if b_name:
                bom_by_name[b_name] = u_cost
                bom_by_norm[_normalize_sku_key(b_name)] = u_cost

    def _lookup_unit_cogs(pid, prod):
        """
        Resolves true unit cost of goods sold:
          1. BOM Recipe RM Cost (exact ID, code, name, or normalized name)
          2. Real FIFO / Latest Purchase Cost (ONLY if backed by actual Purchaseitem records)
          3. Otherwise returns (0.0, 'UNCOSTED') — NEVER falls back to selling price!
        """
        p_code = (getattr(prod, 'productcode', '') or '').strip().lower()
        p_name = (getattr(prod, 'name', '') or '').strip().lower()
        p_norm = _normalize_sku_key(p_name)

        bom_unit_cost = (
            bom_by_id.get(pid) or
            bom_by_code.get(p_code) or
            bom_by_name.get(p_name) or
            bom_by_norm.get(p_norm)
        )
        if bom_unit_cost is not None and bom_unit_cost > 0:
            return float(bom_unit_cost), 'BOM_RECIPE'

        prod_cost_info = cost_map_by_id.get(pid, {})
        if prod_cost_info.get('costSource') in REAL_PURCHASE_COST_SOURCES:
            eff = float(prod_cost_info.get('effectiveCost') or 0.0)
            if eff > 0:
                return eff, 'PURCHASE_FIFO'

        return 0.0, 'UNCOSTED'

    # 4. Sales Orders & Material Consumption (COGS) in Selected Period
    # Strictly fulfilled/billed orders only (Completed, Dispatched, Partially Dispatched, Delivered, Partially Returned)
    billed_base_qs = Order.objects.filter(status__in=BILLED_ORDER_STATUSES)
    pending_base_qs = Order.objects.filter(status__in=PENDING_PIPELINE_STATUSES)
    if company_id:
        billed_base_qs = billed_base_qs.filter(companyid_id=company_id)
        pending_base_qs = pending_base_qs.filter(companyid_id=company_id)

    current_orders = billed_base_qs.filter(date__range=(start_dt, end_dt)).prefetch_related('orderitem_set__productid')
    prev_orders = billed_base_qs.filter(date__range=(prev_start_dt, prev_end_dt)).prefetch_related('orderitem_set__productid')

    # Track unfulfilled pipeline orders in the same period separately for transparency
    period_pending_orders = pending_base_qs.filter(date__range=(start_dt, end_dt))
    pending_orders_count = period_pending_orders.count()
    pending_orders_value = float(period_pending_orders.aggregate(s=Sum('grandtotal'))['s'] or 0.0)

    def _calc_sales_and_cogs(orders_qs):
        gross_rev = 0.0
        total_rm_cogs = 0.0
        uncosted_rev = 0.0
        uncosted_skus = set()
        order_count = 0
        total_items_sold = 0
        top_sku_map = {}

        for ord_obj in orders_qs:
            order_count += 1
            items = list(ord_obj.orderitem_set.all())
            if not items:
                gross_rev += float(ord_obj.grandtotal or 0.0)
                continue

            for item in items:
                raw_qty = float(item.qty or 0.0)
                sent_qty = float(item.sentqty or 0.0)
                ret_qty = float(item.returnedqty or 0.0)

                # Net billed quantity (respects partial dispatch and returns)
                if sent_qty > 0:
                    net_qty = max(0.0, sent_qty - ret_qty)
                else:
                    net_qty = max(0.0, raw_qty - ret_qty)

                if net_qty <= 0:
                    continue

                price = float(item.price or 0.0)
                if net_qty == raw_qty and item.total is not None:
                    line_revenue = float(item.total)
                else:
                    line_revenue = round(net_qty * price, 2)

                gross_rev += line_revenue
                total_items_sold += int(net_qty)

                pid = item.productid_id
                prod = getattr(item, 'productid', None)
                unit_cogs, cost_source = _lookup_unit_cogs(pid, prod)

                line_cogs = round(net_qty * unit_cogs, 2)
                total_rm_cogs += line_cogs

                if cost_source == 'UNCOSTED':
                    uncosted_rev += line_revenue
                    uncosted_skus.add((prod.name if prod else None) or str(pid))

                prod_name = (prod.name if prod else None) or cost_map_by_id.get(pid, {}).get('name') or f"SKU-{pid}"
                sku_code = (prod.productcode if prod else None) or cost_map_by_id.get(pid, {}).get('sku') or ''
                if pid not in top_sku_map:
                    top_sku_map[pid] = {
                        'id': pid,
                        'name': prod_name,
                        'code': sku_code,
                        'units_sold': 0,
                        'revenue': 0.0,
                        'cogs': 0.0,
                        'unit_rm_cost': round(unit_cogs, 2),
                        'cost_source': cost_source,
                    }
                top_sku_map[pid]['units_sold'] += int(net_qty)
                top_sku_map[pid]['revenue'] += line_revenue
                top_sku_map[pid]['cogs'] += line_cogs

        return gross_rev, total_rm_cogs, order_count, total_items_sold, list(top_sku_map.values()), uncosted_rev, len(uncosted_skus)

    gross_sales, rm_consumption, order_count, units_sold, sku_breakdown, uncosted_sales, uncosted_sku_count = _calc_sales_and_cogs(current_orders)
    prev_gross_sales, prev_rm_consumption, prev_order_count, _, _, _, _ = _calc_sales_and_cogs(prev_orders)

    def _pct_delta(curr, prev):
        if prev <= 0:
            return 100.0 if curr > 0 else 0.0
        return round(((curr - prev) / prev) * 100, 1)

    sales_growth_pct = _pct_delta(gross_sales, prev_gross_sales)

    # 5. Approved Credit Notes & Discounts
    cn_qs = CreditNoteDiscountRequest.objects.all()
    if company_id:
        cn_qs = cn_qs.filter(companyid_id=company_id)

    current_approved_cns = float(cn_qs.filter(
        status__iexact='APPROVED',
        reviewed_at__range=(start_dt, end_dt)
    ).aggregate(s=Sum('amount'))['s'] or 0.0)

    pending_cns_qs = cn_qs.filter(status__iexact='PENDING')
    pending_cns_count = pending_cns_qs.count()
    pending_cns_amount = float(pending_cns_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

    net_sales = max(0.0, gross_sales - current_approved_cns)

    # 6. Gross Profit & Margin %
    # Compute margin over costed revenue if some traded SKUs are uncosted, while showing true total profit
    gross_profit = gross_sales - rm_consumption
    costed_sales = max(0.0, gross_sales - uncosted_sales)
    gross_margin_pct = round(((costed_sales - rm_consumption) / max(1.0, costed_sales)) * 100, 1) if costed_sales > 0 else 0.0
    cogs_ratio_pct = round((rm_consumption / max(1.0, gross_sales)) * 100, 1) if gross_sales > 0 else 0.0

    # 7. Accurate Total Payroll Liabilities (Fixed + Variable Daily Wages + OT + Bag Incentives)
    payroll_info = _compute_accurate_payroll(company_id, start_date, end_date)
    fixed_payroll = payroll_info['fixed_payroll']
    variable_payroll = payroll_info['variable_payroll']
    total_payroll = payroll_info['total_payroll']
    fixed_staff_count = payroll_info['fixed_headcount']
    var_staff_count = payroll_info['variable_headcount']
    labour_by_user_id = payroll_info['labour_by_user_id']
    labour_by_name = payroll_info['labour_by_name']
    payroll_ratio_pct = round((total_payroll / max(1.0, gross_sales)) * 100, 1) if gross_sales > 0 else 0.0

    # 8. Field Travel & Operational Expenses (using actual per-employee KM rates & IST dates)
    exp_qs = Expense.objects.filter(status__iexact='APPROVED', date__range=(start_dt, end_dt))
    if company_id:
        exp_qs = exp_qs.filter(companyid_id=company_id)
    approved_expenses_amount = float(exp_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

    pending_exp_qs = Expense.objects.filter(status__iexact='PENDING')
    if company_id:
        pending_exp_qs = pending_exp_qs.filter(companyid_id=company_id)
    pending_exp_count = pending_exp_qs.count()
    pending_exp_amount = float(pending_exp_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

    travel_qs = DailyTravelLog.objects.filter(date__range=(start_date, end_date)).select_related('user')
    if company_id:
        travel_qs = travel_qs.filter(user__companyid_id=company_id)

    total_travel_km = 0.0
    travel_allowance_liability = 0.0
    for tlog in travel_qs:
        km = float(tlog.approved_km if (tlog.approved_km is not None and float(tlog.approved_km) > 0) else (tlog.total_km or 0.0))
        total_travel_km += km
        # Resolve exact per-KM allowance from Labour profile (fallback ₹3.00/km)
        emp = labour_by_user_id.get(tlog.user_id)
        if not emp and tlog.user and tlog.user.name:
            u_name = tlog.user.name.strip().lower()
            emp = labour_by_name.get(u_name)
            if not emp:
                first_tok = u_name.split()[0]
                for lname, lobj in labour_by_name.items():
                    if first_tok and first_tok in lname:
                        emp = lobj
                        break
        km_rate = float(getattr(emp, 'bike_allowance_per_km', 0.0) or 0.0) if emp else 0.0
        if km_rate <= 0:
            km_rate = 3.0
        travel_allowance_liability += (km * km_rate)

    travel_allowance_liability = round(travel_allowance_liability, 2)
    total_operational_overhead = round(approved_expenses_amount + travel_allowance_liability, 2)

    # 9. Net Director Operating Surplus (Realized Pre-Tax EBITDA)
    net_operating_surplus = round(
        gross_sales - (rm_consumption + total_payroll + total_operational_overhead + current_approved_cns),
        2
    )
    net_operating_margin_pct = round((net_operating_surplus / max(1.0, gross_sales)) * 100, 1) if gross_sales > 0 else 0.0

    # 10. Payment Collections & Live Market Receivables (DSO)
    receipt_base_qs = PaymentReceipt.objects.filter(status__iexact='VERIFIED')
    if company_id:
        receipt_base_qs = receipt_base_qs.filter(companyid_id=company_id)

    period_receipts = receipt_base_qs.filter(created_at__range=(start_dt, end_dt))
    total_collections = float(period_receipts.aggregate(s=Sum('amount'))['s'] or 0.0)
    collection_strike_pct = round((total_collections / max(1.0, gross_sales)) * 100, 1) if gross_sales > 0 else 0.0

    # Live Market Receivables = Opening Balances + All-Time Billed Sales + Manual Debits - All-Time Verified Receipts - Approved CNs - Manual Credits
    dealer_qs = Dealer.objects.filter(active=True)
    dist_qs = Distributor.objects.filter(active=True)
    manual_qs = PartyManualLedgerEntry.objects.all()
    if company_id:
        dealer_qs = dealer_qs.filter(companyid_id=company_id)
        dist_qs = dist_qs.filter(companyid_id=company_id)
        manual_qs = manual_qs.filter(companyid_id=company_id)

    total_opening_bal = (
        float(dealer_qs.aggregate(s=Sum('openingbalance'))['s'] or 0.0) +
        float(dist_qs.aggregate(s=Sum('openingbalance'))['s'] or 0.0)
    )
    all_time_billed_sales = float(billed_base_qs.aggregate(s=Sum('grandtotal'))['s'] or 0.0)
    all_time_collections = float(receipt_base_qs.aggregate(s=Sum('amount'))['s'] or 0.0)
    all_time_approved_cns = float(cn_qs.filter(status__iexact='APPROVED').aggregate(s=Sum('amount'))['s'] or 0.0)
    manual_aggs = manual_qs.aggregate(d=Sum('debit'), c=Sum('credit'))
    manual_debits = float(manual_aggs['d'] or 0.0)
    manual_credits = float(manual_aggs['c'] or 0.0)

    total_market_receivables = round(
        max(0.0, total_opening_bal + all_time_billed_sales + manual_debits - all_time_collections - all_time_approved_cns - manual_credits),
        2
    )

    # DSO using trailing 30-day average daily billed sales (so 1-day view doesn't distort DSO)
    t30_start_dt, t30_end_dt = _ist_day_bounds(end_date - datetime.timedelta(days=29), end_date)
    trailing_30d_sales = float(billed_base_qs.filter(date__range=(t30_start_dt, t30_end_dt)).aggregate(s=Sum('grandtotal'))['s'] or 0.0)
    avg_daily_sales = (trailing_30d_sales / 30.0) if trailing_30d_sales > 0 else (gross_sales / max(1, period_days))
    dso_days = round(total_market_receivables / avg_daily_sales, 1) if avg_daily_sales > 0 else 0.0

    # 11. Manufacturing Plant Operational Brief (Real Production + Real RM Consumed Valuation)
    prod_qs = Stocktransaction.objects.filter(
        transactiontype='PRODUCTION',
        is_deleted=False,
        createdat__range=(start_dt, end_dt)
    ).exclude(reason='REJECTED')
    if company_id:
        prod_qs = prod_qs.filter(productid__companyid_id=company_id)

    total_prod_units = float(prod_qs.aggregate(s=Sum('quantity'))['s'] or 0.0)
    total_prod_batches = prod_qs.count()
    avg_batch_units = round(total_prod_units / max(1, total_prod_batches), 1)

    # Real Factory RM Consumed Value in period (from actual CONSUMED stock transactions)
    cons_qs = Stocktransaction.objects.filter(
        transactiontype='CONSUMED',
        is_deleted=False,
        createdat__range=(start_dt, end_dt)
    ).exclude(reason='REJECTED')
    if company_id:
        cons_qs = cons_qs.filter(productid__companyid_id=company_id)

    plant_rm_consumed_val = 0.0
    plant_rm_consumed_kg = 0.0
    for cst in cons_qs:
        qty_abs = abs(float(cst.quantity or 0.0))
        plant_rm_consumed_kg += qty_abs
        uc_info = cost_map_by_id.get(cst.productid_id, {})
        uc = float(uc_info.get('effectiveCost') or 0.0)
        plant_rm_consumed_val += (qty_abs * uc)
    plant_rm_consumed_val = round(plant_rm_consumed_val, 2)

    prod_supervisors = set()
    for pt in prod_qs.select_related('created_by'):
        if pt.created_by:
            name = pt.created_by.name or pt.created_by.email.split('@')[0].upper()
            role = (getattr(pt.created_by, 'role', '') or '').upper()
            if role not in ('SUPERADMIN', 'ADMIN', 'SALES'):
                prod_supervisors.add(name)
    supervisor_list = sorted(list(prod_supervisors))

    # 12. Sales Force Field Operations Brief
    visit_qs = Visit.objects.filter(createdat__range=(start_dt, end_dt))
    if company_id:
        visit_qs = visit_qs.filter(companyid_id=company_id)

    total_visits = visit_qs.count()
    visit_conversion_pct = round((order_count / max(1, total_visits)) * 100, 1) if total_visits > 0 else 0.0
    revenue_per_km = round(gross_sales / max(1.0, total_travel_km), 2) if total_travel_km > 0 else 0.0

    # 13. Top 5 Margin-Generating Finished Goods
    for sku in sku_breakdown:
        rev = sku['revenue']
        cg = sku['cogs']
        if sku['cost_source'] == 'UNCOSTED':
            sku['gross_profit'] = 0.0
            sku['margin_pct'] = 0.0
        else:
            sku['gross_profit'] = round(rev - cg, 2)
            sku['margin_pct'] = round(((rev - cg) / max(1.0, rev)) * 100, 1) if rev > 0 else 0.0

    sku_breakdown.sort(key=lambda x: (x['cost_source'] != 'UNCOSTED', x['gross_profit'], x['revenue']), reverse=True)
    top_5_margin_skus = sku_breakdown[:5]

    # 14. Waterfall Profit Step-down
    waterfall_breakdown = [
        {'label': 'Gross Billed Sales (Fulfilled)', 'amount': round(gross_sales, 2), 'type': 'REVENUE', 'pct': 100.0 if gross_sales > 0 else 0.0},
        {'label': 'Raw Material Consumption (COGS)', 'amount': -round(rm_consumption, 2), 'type': 'EXPENSE', 'pct': -cogs_ratio_pct},
        {'label': 'Gross Production Profit', 'amount': round(gross_profit, 2), 'type': 'SUBTOTAL', 'pct': gross_margin_pct},
        {'label': f'Factory & Staff Payroll (Fix ₹{int(round(fixed_payroll)):,} + Var ₹{int(round(variable_payroll)):,})', 'amount': -round(total_payroll, 2), 'type': 'EXPENSE', 'pct': -payroll_ratio_pct},
        {'label': 'Field Travel & Approved Expenses', 'amount': -round(total_operational_overhead, 2), 'type': 'EXPENSE', 'pct': -round((total_operational_overhead / max(1.0, gross_sales)) * 100, 1) if gross_sales > 0 else 0.0},
        {'label': 'Approved CNs & Discounts', 'amount': -round(current_approved_cns, 2), 'type': 'EXPENSE', 'pct': -round((current_approved_cns / max(1.0, gross_sales)) * 100, 1) if gross_sales > 0 else 0.0},
        {'label': 'Net Director Surplus (EBITDA)', 'amount': round(net_operating_surplus, 2), 'type': 'TOTAL', 'pct': net_operating_margin_pct},
    ]

    # 15. Exact 6-Month Calendar Historical Trajectory (Real Monthly Billed Sales, Real BOM COGS, Real Collections)
    six_months_trend = []
    cur_y, cur_m = now_ist.year, now_ist.month
    months_list = []
    for offset in range(5, -1, -1):
        m = cur_m - offset
        y = cur_y
        while m <= 0:
            m += 12
            y -= 1
        months_list.append((y, m))

    for (y, m) in months_list:
        m_start_d = datetime.date(y, m, 1)
        m_end_d = datetime.date(y, m, calendar.monthrange(y, m)[1])
        m_start_dt, m_end_dt = _ist_day_bounds(m_start_d, m_end_d)

        m_orders_qs = billed_base_qs.filter(date__range=(m_start_dt, m_end_dt)).prefetch_related('orderitem_set__productid')
        m_sales, m_cogs, _, _, _, _, _ = _calc_sales_and_cogs(m_orders_qs)

        m_rcpts = receipt_base_qs.filter(created_at__range=(m_start_dt, m_end_dt))
        m_coll = float(m_rcpts.aggregate(s=Sum('amount'))['s'] or 0.0)

        six_months_trend.append({
            'month': m_start_d.strftime('%b %Y'),
            'sales': round(m_sales, 2),
            'collections': round(m_coll, 2),
            'cogs': round(m_cogs, 2),
            'surplus': round(m_sales - m_cogs, 2),
        })

    # 16. Today's Live Plant & Operations Pulse (Production, Consumption, Purchases, Other Expenses)
    today = timezone.now().astimezone(IST).date()
    today_start_dt, today_end_dt = _ist_day_bounds(today, today)

    # 16a. Today Production
    today_prod_qs = Stocktransaction.objects.filter(
        transactiontype='PRODUCTION',
        is_deleted=False,
        createdat__range=(today_start_dt, today_end_dt)
    ).exclude(reason='REJECTED')
    if company_id:
        today_prod_qs = today_prod_qs.filter(productid__companyid_id=company_id)

    today_prod_units = float(today_prod_qs.aggregate(s=Sum('quantity'))['s'] or 0.0)
    today_prod_batches = today_prod_qs.count()

    today_prod_by_prod = {}
    for st in today_prod_qs.select_related('productid'):
        p_id = st.productid_id
        if p_id not in today_prod_by_prod:
            today_prod_by_prod[p_id] = {
                'product_id': str(p_id),
                'name': st.productid.name if st.productid else 'Finished Product',
                'code': st.productid.productcode if (st.productid and st.productid.productcode) else '',
                'units': 0.0,
                'batches': 0.0,
            }
        today_prod_by_prod[p_id]['units'] += float(st.quantity or 0.0)
        today_prod_by_prod[p_id]['batches'] += float(st.batches or 1.0)

    today_prod_items = sorted(list(today_prod_by_prod.values()), key=lambda x: x['units'], reverse=True)

    # 16b. Today Consumption in Production
    today_cons_qs = Stocktransaction.objects.filter(
        transactiontype='CONSUMED',
        is_deleted=False,
        createdat__range=(today_start_dt, today_end_dt)
    ).exclude(reason='REJECTED')
    if company_id:
        today_cons_qs = today_cons_qs.filter(productid__companyid_id=company_id)

    today_cons_kg = 0.0
    today_cons_val = 0.0
    today_cons_by_prod = {}
    for cst in today_cons_qs.select_related('productid', 'productid__unitid'):
        p_id = cst.productid_id
        qty_abs = abs(float(cst.quantity or 0.0))
        today_cons_kg += qty_abs
        uc_info = cost_map_by_id.get(p_id, {})
        uc = float(uc_info.get('effectiveCost') or 0.0)
        item_val = qty_abs * uc
        today_cons_val += item_val

        if p_id not in today_cons_by_prod:
            unit_name = cst.productid.unitid.name if (cst.productid and getattr(cst.productid, 'unitid', None)) else 'KG'
            today_cons_by_prod[p_id] = {
                'product_id': str(p_id),
                'name': cst.productid.name if cst.productid else (uc_info.get('name') or 'Raw Material'),
                'code': cst.productid.productcode if (cst.productid and cst.productid.productcode) else '',
                'qty': 0.0,
                'unit': unit_name,
                'rate': round(uc, 2),
                'total_val': 0.0,
            }
        today_cons_by_prod[p_id]['qty'] += qty_abs
        today_cons_by_prod[p_id]['total_val'] += item_val

    today_cons_items = sorted(list(today_cons_by_prod.values()), key=lambda x: x['total_val'], reverse=True)
    for item in today_cons_items:
        item['qty'] = round(item['qty'], 2)
        item['total_val'] = round(item['total_val'], 2)

    # 16c. Today Purchases (Inward Goods & Raw Materials)
    today_purch_qs = Purchase.objects.filter(
        Q(date__range=(today_start_dt, today_end_dt)) | Q(createdat__range=(today_start_dt, today_end_dt))
    )
    if company_id:
        today_purch_qs = today_purch_qs.filter(companyid_id=company_id)

    today_purch_total = float(today_purch_qs.aggregate(s=Sum('grandtotal'))['s'] or 0.0)
    today_purch_count = today_purch_qs.count()

    today_purch_ids = list(today_purch_qs.values_list('id', flat=True))
    today_pitems = list(Purchaseitem.objects.filter(purchaseid_id__in=today_purch_ids).select_related('productid'))

    pitems_by_purch = {}
    top_purch_items = []
    for pi in today_pitems:
        pitems_by_purch.setdefault(pi.purchaseid_id, []).append(pi)
        top_purch_items.append({
            'product_name': pi.productname or (pi.productid.name if pi.productid else 'Material'),
            'qty': pi.qty,
            'rate': round(float(pi.rate or 0.0), 2),
            'total': round(float(pi.total or 0.0), 2),
        })

    today_purch_bills = []
    for p in today_purch_qs.select_related('supplierid')[:30]:
        items_list = pitems_by_purch.get(p.id, [])
        preview_parts = [f"{it.productname} ({it.qty})" for it in items_list[:3]]
        if len(items_list) > 3:
            preview_parts.append(f"+{len(items_list)-3} more")
        preview_str = ", ".join(preview_parts) if preview_parts else 'Inward Goods'

        today_purch_bills.append({
            'id': str(p.id),
            'purchase_id': p.purchaseid or p.challannumber or str(p.id)[:8],
            'vendor_name': p.vendorname or (p.supplierid.name if p.supplierid else 'Direct Supplier'),
            'challan_number': p.challannumber or '',
            'vehicle_number': p.vehiclenumber or '',
            'total': round(float(p.grandtotal or 0.0), 2),
            'status': p.status or 'RECEIVED',
            'items_count': len(items_list),
            'items_preview': preview_str,
        })

    top_purch_items = sorted(top_purch_items, key=lambda x: x['total'], reverse=True)

    # 16d. Today Other Expenses (Travel, Factory, Utilities, Miscellaneous)
    today_exp_qs = Expense.objects.filter(
        Q(date__range=(today_start_dt, today_end_dt)) | Q(createdat__range=(today_start_dt, today_end_dt))
    )
    if company_id:
        today_exp_qs = today_exp_qs.filter(companyid_id=company_id)

    today_exp_total = float(today_exp_qs.aggregate(s=Sum('amount'))['s'] or 0.0)
    today_exp_approved = float(today_exp_qs.filter(status__iexact='APPROVED').aggregate(s=Sum('amount'))['s'] or 0.0)
    today_exp_pending = float(today_exp_qs.filter(status__iexact='PENDING').aggregate(s=Sum('amount'))['s'] or 0.0)
    today_exp_count = today_exp_qs.count()

    today_exp_by_cat = {}
    for exp in today_exp_qs:
        raw_cat = (exp.category or 'General / Other').strip()
        cat_label = raw_cat.title() if not raw_cat.isupper() else raw_cat
        amt = float(exp.amount or 0.0)
        if cat_label not in today_exp_by_cat:
            today_exp_by_cat[cat_label] = {'category': cat_label, 'amount': 0.0, 'count': 0}
        today_exp_by_cat[cat_label]['amount'] += amt
        today_exp_by_cat[cat_label]['count'] += 1

    today_exp_categories = sorted(list(today_exp_by_cat.values()), key=lambda x: x['amount'], reverse=True)
    for cat in today_exp_categories:
        cat['amount'] = round(cat['amount'], 2)

    recent_expenses = []
    for exp in today_exp_qs.select_related('soemail')[:30]:
        user_display = (
            exp.soemail.name if exp.soemail and getattr(exp.soemail, 'name', None)
            else (exp.soemail.email.split('@')[0].upper() if exp.soemail and getattr(exp.soemail, 'email', None)
            else (str(exp.soemail_id) if exp.soemail_id else 'Staff'))
        )
        recent_expenses.append({
            'id': str(exp.id),
            'category': exp.category or 'General',
            'amount': round(float(exp.amount or 0.0), 2),
            'status': (exp.status or 'PENDING').upper(),
            'user_name': user_display,
            'remarks': exp.remarks or '',
        })

    today_pulse_data = {
        'date': today.strftime('%Y-%m-%d'),
        'date_display': today.strftime('%d %b %Y'),
        'production': {
            'units': round(today_prod_units, 1),
            'batches': today_prod_batches,
            'product_count': len(today_prod_by_prod),
            'items': today_prod_items[:15],
        },
        'consumption': {
            'total_kg': round(today_cons_kg, 1),
            'total_val': round(today_cons_val, 2),
            'materials_count': len(today_cons_by_prod),
            'items': today_cons_items[:15],
        },
        'purchases': {
            'total_val': round(today_purch_total, 2),
            'bills_count': today_purch_count,
            'items_count': len(top_purch_items),
            'bills': today_purch_bills,
            'top_items': top_purch_items[:15],
        },
        'other_expenses': {
            'total_val': round(today_exp_total, 2),
            'approved_val': round(today_exp_approved, 2),
            'pending_val': round(today_exp_pending, 2),
            'count': today_exp_count,
            'categories': today_exp_categories,
            'recent_expenses': recent_expenses,
        }
    }

    return send_success({
        'meta': {
            'period': request.query_params.get('period') or 'mtd',
            'period_label': period_name,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'days_in_period': period_days,
            'company_name': Company.objects.filter(id=company_id).first().name if company_id else 'Kamla Enterprises',
        },
        'ticker': {
            'gross_sales': round(gross_sales, 2),
            'sales_growth_pct': sales_growth_pct,
            'net_sales': round(net_sales, 2),
            'order_count': order_count,
            'units_sold': units_sold,
            'pending_orders_count': pending_orders_count,
            'pending_orders_value': round(pending_orders_value, 2),

            'rm_consumption': round(rm_consumption, 2),
            'cogs_ratio_pct': cogs_ratio_pct,
            'uncosted_sales': round(uncosted_sales, 2),
            'uncosted_sku_count': uncosted_sku_count,

            'gross_profit': round(gross_profit, 2),
            'gross_margin_pct': gross_margin_pct,

            'total_payroll': round(total_payroll, 2),
            'fixed_payroll': round(fixed_payroll, 2),
            'variable_payroll': round(variable_payroll, 2),
            'payroll_ratio_pct': payroll_ratio_pct,
            'fixed_headcount': fixed_staff_count,
            'variable_headcount': var_staff_count,

            'collections': round(total_collections, 2),
            'collection_strike_pct': collection_strike_pct,
            'receivables_outstanding': round(total_market_receivables, 2),
            'dso_days': dso_days,

            'operational_overhead': round(total_operational_overhead, 2),
            'approved_expenses': round(approved_expenses_amount, 2),
            'travel_allowance': round(travel_allowance_liability, 2),
            'approved_credit_notes': round(current_approved_cns, 2),

            'net_operating_surplus': round(net_operating_surplus, 2),
            'net_operating_margin_pct': net_operating_margin_pct,
        },
        'operations': {
            'plant': {
                'units_produced': round(total_prod_units, 1),
                'batches_completed': total_prod_batches,
                'avg_batch_units': avg_batch_units,
                'capacity_utilization_pct': round(min(100.0, (total_prod_units / max(1.0, 22000.0 * (period_days / 30.0))) * 100), 1),
                'plant_rm_consumed_value': plant_rm_consumed_val,
                'material_yield_pct': round((total_prod_units * 20.0 / plant_rm_consumed_kg) * 100, 1) if plant_rm_consumed_kg > 0 else 0.0,
                'supervisors': supervisor_list,
                'facility_name': 'Navsari Manufacturing Plant',
            },
            'field': {
                'total_visits': total_visits,
                'converted_orders': order_count,
                'strike_rate_pct': visit_conversion_pct,
                'travel_km': round(total_travel_km, 1),
                'revenue_per_km': revenue_per_km,
                'field_cost_ratio_pct': round((total_operational_overhead / max(1.0, gross_sales)) * 100, 2) if gross_sales > 0 else 0.0,
            },
            'pending_actions': {
                'pending_cns_count': pending_cns_count,
                'pending_cns_amount': pending_cns_amount,
                'pending_exp_count': pending_exp_count,
                'pending_exp_amount': pending_exp_amount,
            }
        },
        'top_margin_products': top_5_margin_skus,
        'waterfall': waterfall_breakdown,
        'trend': six_months_trend,
        'today_pulse': today_pulse_data,
    }, 'Director boardroom intelligence computed successfully')
