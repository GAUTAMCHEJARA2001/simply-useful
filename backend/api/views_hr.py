import datetime
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum

from api.models import (
    Labour, LeaveType, EmployeeLeaveBalance, LeaveRecord,
    SalaryAdvance, DailyAttendance, SalarySlip, Company
)
from api.views import send_success, send_error, _get_company_id

# --- EMPLOYEES ---
@api_view(['GET', 'POST'])
def hr_employees(request):
    company_id = _get_company_id(request)
    if request.method == 'GET':
        qs = Labour.objects.filter(active=True)
        if company_id:
            qs = qs.filter(companyid_id=company_id)
        
        employees = []
        for l in qs:
            employees.append({
                'id': l.id,
                'name': l.name,
                'employee_type': l.employee_type,
                'base_salary_monthly': l.base_salary_monthly,
                'dailywage': l.dailywage,
                'overtime_hourly_rate': l.overtime_hourly_rate,
                'late_deduction_rate': l.late_deduction_rate,
                'travel_allowance_per_km': l.travel_allowance_per_km,
                'sales_incentive_pct': l.sales_incentive_pct,
                'bag_incentive_rate': l.bag_incentive_rate,
                'contactinfo': l.contactinfo,
                'warehouseid': l.warehouseid_id
            })
        return send_success(employees, 'Employees fetched')

    elif request.method == 'POST':
        data = request.data
        if not company_id:
            company_id = 1 # fallback

        emp = Labour.objects.create(
            name=data.get('name'),
            companyid_id=company_id,
            employee_type=data.get('employee_type', 'VARIABLE'),
            base_salary_monthly=float(data.get('base_salary_monthly') or 0.0),
            dailywage=float(data.get('dailywage') or 0.0),
            overtime_hourly_rate=float(data.get('overtime_hourly_rate') or 0.0),
            late_deduction_rate=float(data.get('late_deduction_rate') or 0.0),
            travel_allowance_per_km=float(data.get('travel_allowance_per_km') or 0.0),
            sales_incentive_pct=float(data.get('sales_incentive_pct') or 0.0),
            bag_incentive_rate=float(data.get('bag_incentive_rate') or 0.0),
            contactinfo=data.get('contactinfo', ''),
            warehouseid_id=data.get('warehouseid')
        )
        return send_success({'id': emp.id, **data}, 'Employee created')

@api_view(['PUT', 'DELETE'])
def hr_employees_detail(request, pk):
    try:
        emp = Labour.objects.get(id=pk)
    except Labour.DoesNotExist:
        return send_error('Employee not found', 404)

    if request.method == 'PUT':
        data = request.data
        emp.name = data.get('name', emp.name)
        emp.employee_type = data.get('employee_type', emp.employee_type)
        emp.base_salary_monthly = float(data.get('base_salary_monthly') or emp.base_salary_monthly)
        emp.dailywage = float(data.get('dailywage') or emp.dailywage)
        emp.overtime_hourly_rate = float(data.get('overtime_hourly_rate') or emp.overtime_hourly_rate)
        emp.late_deduction_rate = float(data.get('late_deduction_rate') or emp.late_deduction_rate)
        emp.travel_allowance_per_km = float(data.get('travel_allowance_per_km') or emp.travel_allowance_per_km)
        emp.sales_incentive_pct = float(data.get('sales_incentive_pct') or emp.sales_incentive_pct)
        emp.bag_incentive_rate = float(data.get('bag_incentive_rate') or emp.bag_incentive_rate)
        emp.contactinfo = data.get('contactinfo', emp.contactinfo)
        if data.get('warehouseid'):
            emp.warehouseid_id = data.get('warehouseid')
        emp.save()
        return send_success({'id': emp.id, **data}, 'Employee updated')

    elif request.method == 'DELETE':
        emp.active = False
        emp.save()
        return send_success(None, 'Employee deactivated')

# --- ATTENDANCE ---
@api_view(['GET', 'POST'])
def hr_attendance(request):
    if request.method == 'GET':
        month = request.GET.get('month') # YYYY-MM
        qs = DailyAttendance.objects.all().select_related('labourid')
        if month:
            qs = qs.filter(date__startswith=month)
            
        data = []
        for a in qs:
            data.append({
                'id': a.id,
                'labour_id': a.labourid_id,
                'labour_name': a.labourid.name,
                'date': a.date.strftime('%Y-%m-%d'),
                'status': a.status,
                'ot_hours': a.ot_hours,
                'late_hours': a.late_hours,
                'ot_hours': a.ot_hours,
                'late_hours': a.late_hours,
                'km_travelled': a.km_travelled,
                'bags_produced': a.bags_produced,
                'sales_achieved': a.sales_achieved,
                'daily_advance': a.daily_advance,
                'advance_slip_no': a.advance_slip_no,
                'advance_medium': a.advance_medium,
                'advance_note': a.advance_note
            })
        return send_success(data, 'Attendance fetched')

    elif request.method == 'POST':
        # Batch save
        records = request.data.get('records', [])
        for r in records:
            labour_id = r.get('labour_id')
            date_str = r.get('date')
            if not labour_id or not date_str:
                continue
            
            DailyAttendance.objects.update_or_create(
                labourid_id=labour_id,
                date=date_str,
                defaults={
                    'status': r.get('status', 'PRESENT'),
                    'ot_hours': float(r.get('ot_hours') or 0.0),
                    'late_hours': float(r.get('late_hours') or 0.0),
                    'km_travelled': float(r.get('km_travelled') or 0.0),
                    'bags_produced': float(r.get('bags_produced') or 0.0),
                    'sales_achieved': float(r.get('sales_achieved') or 0.0),
                    'daily_advance': float(r.get('daily_advance') or 0.0),
                    'advance_slip_no': r.get('advance_slip_no') or '',
                    'advance_medium': r.get('advance_medium') or '',
                    'advance_note': r.get('advance_note') or ''
                }
            )
        return send_success(None, 'Attendance records saved')

# --- PAYROLL ENGINE ---
@api_view(['GET'])
def hr_generate_payroll(request):
    month = request.GET.get('month') # YYYY-MM
    if not month:
        return send_error('Month parameter (YYYY-MM) is required', 400)
    
    employees = Labour.objects.filter(active=True)
    payroll_data = []

    for emp in employees:
        # Fetch attendance for this month
        attendance = DailyAttendance.objects.filter(labourid=emp, date__startswith=month)
        
        # Aggregations
        present_count = attendance.filter(status='PRESENT').count()
        half_day_count = attendance.filter(status='HALF_DAY').count()
        absent_count = attendance.filter(status='ABSENT').count()
        wo_count = attendance.filter(status='WEEKLY_OFF').count()
        
        total_ot_hours = attendance.aggregate(Sum('ot_hours'))['ot_hours__sum'] or 0.0
        total_late_hours = attendance.aggregate(Sum('late_hours'))['late_hours__sum'] or 0.0
        total_km = attendance.aggregate(Sum('km_travelled'))['km_travelled__sum'] or 0.0
        total_bags = attendance.aggregate(Sum('bags_produced'))['bags_produced__sum'] or 0.0
        total_sales = attendance.aggregate(Sum('sales_achieved'))['sales_achieved__sum'] or 0.0
        total_daily_advance = attendance.aggregate(Sum('daily_advance'))['daily_advance__sum'] or 0.0

        # Calculate Payable Days
        payable_days = present_count + (half_day_count * 0.5)
        if emp.employee_type == 'FIXED':
            payable_days += wo_count # Weekly offs are paid for Fixed

        # Base Pay
        basic_pay = 0.0
        if emp.employee_type == 'FIXED':
            # Indian Norm: Split Base Salary Monthly into Basic(50%) and HRA(30%) and Allowances(20%)
            daily_rate = emp.base_salary_monthly / 30.0 # Standardize to 30 days
            gross_base = daily_rate * payable_days
            basic_pay = gross_base * 0.50
            hra = gross_base * 0.30
            other_allowances = gross_base * 0.20
        else:
            # Variable / Daily
            gross_base = emp.dailywage * payable_days
            basic_pay = gross_base
            hra = 0.0
            other_allowances = 0.0
            
        # Additions
        ot_pay = total_ot_hours * emp.overtime_hourly_rate
        travel_pay = total_km * emp.travel_allowance_per_km
        incentives = (total_bags * emp.bag_incentive_rate) + (total_sales * emp.sales_incentive_pct)
        
        gross_pay = basic_pay + hra + other_allowances + ot_pay + travel_pay + incentives
        
        # Deductions
        late_deduction = total_late_hours * emp.late_deduction_rate
        
        # Salary Advance (Check for active advances)
        advances = SalaryAdvance.objects.filter(labourid=emp, remaining_balance__gt=0)
        advance_deduction = 0.0
        for adv in advances:
            deduct = min(adv.deduction_per_month, adv.remaining_balance)
            advance_deduction += deduct
            
        net_pay = gross_pay - late_deduction - advance_deduction - total_daily_advance
        
        payroll_data.append({
            'labour_id': emp.id,
            'labour_name': emp.name,
            'employee_type': emp.employee_type,
            'stats': {
                'present': present_count,
                'half_day': half_day_count,
                'absent': absent_count,
                'wo': wo_count,
                'payable_days': payable_days,
                'ot_hours': total_ot_hours,
                'late_hours': total_late_hours,
                'km_travelled': total_km,
                'bags': total_bags
            },
            'earnings': {
                'basic': round(basic_pay, 2),
                'hra': round(hra, 2),
                'allowances': round(other_allowances + travel_pay, 2),
                'ot_pay': round(ot_pay, 2),
                'incentives': round(incentives, 2),
                'gross': round(gross_pay, 2)
            },
            'deductions': {
                'late': round(late_deduction, 2),
                'advance': round(advance_deduction + total_daily_advance, 2),
                'total_deductions': round(late_deduction + advance_deduction + total_daily_advance, 2)
            },
            'net_pay': round(net_pay, 2)
        })

    return send_success(payroll_data, 'Payroll generated successfully')
