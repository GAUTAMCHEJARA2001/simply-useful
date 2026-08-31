import datetime
import calendar
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum

from api.models import (
    Labour, LeaveType, EmployeeLeaveBalance, LeaveRecord,
    SalaryAdvance, DailyAttendance, SalarySlip, Company,
    HRDepartment, HRDesignation, EmployeeLedger
)
from django.db.models import Sum, Case, When, FloatField
from api.views import send_success, send_error, _get_company_id, load_settings

# --- MASTERS ---
@api_view(['GET', 'POST'])
def hr_departments(request):
    company_id = _get_company_id(request)
    if not company_id: return send_error('No company ID', 400)
    
    if request.method == 'GET':
        qs = HRDepartment.objects.filter(companyid_id=company_id)
        return send_success([{'id': q.id, 'name': q.name} for q in qs], 'Departments fetched')
    
    elif request.method == 'POST':
        name = request.data.get('name')
        if not name: return send_error('Name required', 400)
        obj, created = HRDepartment.objects.get_or_create(companyid_id=company_id, name=name)
        return send_success({'id': obj.id, 'name': obj.name}, 'Department created')

@api_view(['DELETE'])
def hr_departments_detail(request, pk):
    try:
        HRDepartment.objects.get(id=pk).delete()
        return send_success(None, 'Department deleted')
    except Exception:
        return send_error('Not found', 404)

@api_view(['GET', 'POST'])
def hr_designations(request):
    company_id = _get_company_id(request)
    if not company_id: return send_error('No company ID', 400)
    
    if request.method == 'GET':
        qs = HRDesignation.objects.filter(companyid_id=company_id).select_related('department')
        return send_success([{'id': q.id, 'name': q.name, 'department_id': q.department_id, 'department_name': q.department.name if q.department else None} for q in qs], 'Designations fetched')
    
    elif request.method == 'POST':
        name = request.data.get('name')
        department_id = request.data.get('department_id')
        if not name: return send_error('Name required', 400)
        obj, created = HRDesignation.objects.get_or_create(companyid_id=company_id, name=name, department_id=department_id)
        return send_success({'id': obj.id, 'name': obj.name}, 'Designation created')

@api_view(['DELETE'])
def hr_designations_detail(request, pk):
    try:
        HRDesignation.objects.get(id=pk).delete()
        return send_success(None, 'Designation deleted')
    except Exception:
        return send_error('Not found', 404)

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
                'bike_allowance_per_km': l.bike_allowance_per_km,
                'car_allowance_per_km': l.car_allowance_per_km,
                'sales_incentive_pct': l.sales_incentive_pct,
                'bag_incentive_rate': l.bag_incentive_rate,
                'contactinfo': l.contactinfo,
                'warehouseid': l.warehouseid_id,
                'department': l.department,
                'designation': l.designation,
                'reports_to': l.reports_to_id,
                'is_ot_eligible': l.is_ot_eligible,
                'is_late_deduction_eligible': l.is_late_deduction_eligible,
                'is_km_eligible': l.is_km_eligible,
                'is_bag_eligible': l.is_bag_eligible,
                'user_id': l.user_id,
                'employee_id': l.employee_id,
                'doj': l.doj.isoformat() if l.doj else None,
                'aadhar_number': l.aadhar_number,
                'pan_number': l.pan_number,
                'bank_name': l.bank_name,
                'bank_account_number': l.bank_account_number,
                'bank_ifsc': l.bank_ifsc,
                'employee_photo': l.employee_photo.url if l.employee_photo else None,
                'aadhar_photo': l.aadhar_photo.url if l.aadhar_photo else None,
                'pan_photo': l.pan_photo.url if l.pan_photo else None,
                'bank_proof_photo': l.bank_proof_photo.url if l.bank_proof_photo else None
            })
        return send_success(employees, 'Employees fetched')

    elif request.method == 'POST':
        data = request.data
        if not company_id:
            company_id = 1 # fallback

        emp = Labour.objects.create(
            name=data.get('name', ''),
            employee_type=data.get('employee_type', 'VARIABLE'),
            companyid_id=company_id,
            base_salary_monthly=float(data.get('base_salary_monthly') or 0.0),
            dailywage=float(data.get('dailywage') or 0.0),
            overtime_hourly_rate=float(data.get('overtime_hourly_rate') or 0.0),
            late_deduction_rate=float(data.get('late_deduction_rate') or 0.0),
            bike_allowance_per_km=float(data.get('bike_allowance_per_km') or 0.0),
            car_allowance_per_km=float(data.get('car_allowance_per_km') or 0.0),
            sales_incentive_pct=float(data.get('sales_incentive_pct') or 0.0),
            bag_incentive_rate=float(data.get('bag_incentive_rate') or 0.0),
            contactinfo=data.get('contactinfo', ''),
            warehouseid_id=data.get('warehouseid'),
            department=data.get('department'),
            designation=data.get('designation'),
            reports_to_id=data.get('reports_to') or None,
            is_ot_eligible=bool(data.get('is_ot_eligible')),
            is_late_deduction_eligible=data.get('is_late_deduction_eligible') == 'true' or data.get('is_late_deduction_eligible') is True,
            is_km_eligible=data.get('is_km_eligible') == 'true' or data.get('is_km_eligible') is True,
            is_bag_eligible=data.get('is_bag_eligible') == 'true' or data.get('is_bag_eligible') is True,
            user_id=data.get('user_id') or None,
            doj=data.get('doj') or None,
            aadhar_number=data.get('aadhar_number', ''),
            pan_number=data.get('pan_number', ''),
            bank_name=data.get('bank_name', ''),
            bank_account_number=data.get('bank_account_number', ''),
            bank_ifsc=data.get('bank_ifsc', '')
        )
        
        # Handle file uploads
        if 'employee_photo' in request.FILES: emp.employee_photo = request.FILES['employee_photo']
        if 'aadhar_photo' in request.FILES: emp.aadhar_photo = request.FILES['aadhar_photo']
        if 'pan_photo' in request.FILES: emp.pan_photo = request.FILES['pan_photo']
        if 'bank_proof_photo' in request.FILES: emp.bank_proof_photo = request.FILES['bank_proof_photo']
        emp.save()
        
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
        emp.bike_allowance_per_km = float(data.get('bike_allowance_per_km') or emp.bike_allowance_per_km)
        emp.car_allowance_per_km = float(data.get('car_allowance_per_km') or emp.car_allowance_per_km)
        emp.sales_incentive_pct = float(data.get('sales_incentive_pct') or emp.sales_incentive_pct)
        emp.bag_incentive_rate = float(data.get('bag_incentive_rate') or emp.bag_incentive_rate)
        emp.contactinfo = data.get('contactinfo', emp.contactinfo)
        emp.department = data.get('department', emp.department)
        emp.designation = data.get('designation', emp.designation)
        
        reports_to_val = data.get('reports_to', emp.reports_to_id)
        emp.reports_to_id = None if reports_to_val == '' else reports_to_val
        
        if 'is_ot_eligible' in data: emp.is_ot_eligible = data.get('is_ot_eligible') == 'true' or data.get('is_ot_eligible') is True
        if 'is_late_deduction_eligible' in data: emp.is_late_deduction_eligible = data.get('is_late_deduction_eligible') == 'true' or data.get('is_late_deduction_eligible') is True
        if 'is_km_eligible' in data: emp.is_km_eligible = data.get('is_km_eligible') == 'true' or data.get('is_km_eligible') is True
        if 'is_bag_eligible' in data: emp.is_bag_eligible = data.get('is_bag_eligible') == 'true' or data.get('is_bag_eligible') is True
        
        if data.get('warehouseid'):
            emp.warehouseid_id = data.get('warehouseid')
            
        if 'user_id' in data:
            emp.user_id = data.get('user_id') or None
        if 'doj' in data:
            emp.doj = data.get('doj') or None
        if 'aadhar_number' in data: emp.aadhar_number = data.get('aadhar_number')
        if 'pan_number' in data: emp.pan_number = data.get('pan_number')
        if 'bank_name' in data: emp.bank_name = data.get('bank_name')
        if 'bank_account_number' in data: emp.bank_account_number = data.get('bank_account_number')
        if 'bank_ifsc' in data: emp.bank_ifsc = data.get('bank_ifsc')

        if 'employee_photo' in request.FILES: emp.employee_photo = request.FILES['employee_photo']
        if 'aadhar_photo' in request.FILES: emp.aadhar_photo = request.FILES['aadhar_photo']
        if 'pan_photo' in request.FILES: emp.pan_photo = request.FILES['pan_photo']
        if 'bank_proof_photo' in request.FILES: emp.bank_proof_photo = request.FILES['bank_proof_photo']

        emp.save()
        return send_success({'id': emp.id, **data}, 'Employee updated')

    elif request.method == 'DELETE':
        emp.active = False
        emp.save()
        return send_success(None, 'Employee deactivated')

@api_view(['POST'])
def hr_employee_change_status(request, pk):
    try:
        emp = Labour.objects.get(id=pk)
    except Labour.DoesNotExist:
        return send_error('Employee not found', status_code=404)
        
    data = request.data
    action = data.get('action') # 'Promotion' or 'Demotion'
    new_type = data.get('employee_type')
    new_salary = data.get('fixed_salary')
    new_wage = data.get('daily_wage')
    reason = data.get('reason', '')
    
    if new_type:
        emp.employee_type = new_type
    if new_salary is not None:
        emp.fixed_salary = new_salary
    if new_wage is not None:
        emp.daily_wage = new_wage
        
    emp.save()
    
    return send_success({
        'id': emp.id,
        'name': emp.name,
        'employee_type': emp.employee_type,
        'fixed_salary': emp.fixed_salary,
        'daily_wage': emp.daily_wage
    }, message=f"Employee {action} applied successfully")

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
                'late_hours': a.late_hours,
                'travel_vehicle': a.travel_vehicle,
                'km_travelled': a.km_travelled,
                'actual_travel_amount': a.actual_travel_amount,
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
                    'travel_vehicle': r.get('travel_vehicle') or '',
                    'km_travelled': float(r.get('km_travelled') or 0.0),
                    'actual_travel_amount': float(r.get('actual_travel_amount') or 0.0),
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
    
    try:
        y_str, m_str = month.split('-')
        days_in_month = calendar.monthrange(int(y_str), int(m_str))[1]
    except Exception:
        days_in_month = 30
    
    employees = Labour.objects.filter(active=True).exclude(employee_type='NONE')
    payroll_data = []
    # Load salary component settings
    settings_data = load_settings()
    hr_salary_components = settings_data.get('hr_salary_components', {})
    basic_pct = float(hr_salary_components.get('basic', 50)) / 100.0
    hra_pct = float(hr_salary_components.get('hra', 30)) / 100.0
    allowance_pct = float(hr_salary_components.get('allowances', 20)) / 100.0
    
    for emp in employees:
        # Check if already finalized and freeze past data
        slip = SalarySlip.objects.filter(labourid=emp, month=month).first()
        if slip and slip.is_finalized and slip.slip_data:
            # Reconstruct exact past payload to avoid dynamic recalculation
            stored_data = slip.slip_data.copy()
            # Ensure dynamic UI flags are updated
            stored_data['is_finalized'] = True
            stored_data['is_paid'] = slip.is_paid
            payroll_data.append(stored_data)
            continue
            
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
        
        # Add Paid Leaves
        paid_leave_count = LeaveRecord.objects.filter(
            labourid=emp, 
            date__startswith=month, 
            is_paid=True
        ).aggregate(
            total=Sum(
                Case(
                    When(status='FULL_DAY', then=1.0),
                    When(status='HALF_DAY', then=0.5),
                    default=1.0,
                    output_field=FloatField()
                )
            )
        )['total'] or 0.0
        payable_days += paid_leave_count

        if emp.employee_type == 'FIXED':
            payable_days += wo_count # Weekly offs are paid for Fixed

        # Base Pay
        basic_pay = 0.0
        basic_calc = ""
        daily_rate = 0.0
        if emp.employee_type == 'FIXED':
            # Indian Norm: Split Base Salary Monthly into Basic(50%) and HRA(30%) and Allowances(20%)
            daily_rate = emp.base_salary_monthly / days_in_month
            gross_base = daily_rate * payable_days
            basic_pay = gross_base * basic_pct
            hra = gross_base * hra_pct
            other_allowances = gross_base * allowance_pct
            basic_calc = f"(₹{emp.base_salary_monthly}/{days_in_month}) * {payable_days} days * {int(basic_pct * 100)}% = ₹{basic_pay:.2f}"
        else:
            # Variable / Daily
            daily_rate = emp.dailywage
            gross_base = emp.dailywage * payable_days
            basic_pay = gross_base
            hra = 0.0
            other_allowances = 0.0
            basic_calc = f"₹{emp.dailywage}/day * {payable_days} days = ₹{basic_pay:.2f}"
            
        
        # Additions
        if emp.employee_type == 'FIXED':
            base_hourly_rate = (emp.base_salary_monthly / days_in_month) / 8.0
        else:
            base_hourly_rate = emp.dailywage / 8.0

        ot_pay = total_ot_hours * (base_hourly_rate * emp.overtime_hourly_rate)
        ot_calc = f"{total_ot_hours} hrs * (₹{base_hourly_rate:.2f}/hr * {emp.overtime_hourly_rate}x) = ₹{ot_pay:.2f}" if total_ot_hours > 0 else ""
        
        # Calculate dynamic travel pay based on each day
        travel_pay = 0.0
        bike_km_total = 0.0
        car_km_total = 0.0
        other_travel_total = 0.0
        for att in attendance:
            if att.travel_vehicle == 'BIKE':
                travel_pay += (att.km_travelled * emp.bike_allowance_per_km)
                bike_km_total += att.km_travelled
            elif att.travel_vehicle == 'CAR':
                travel_pay += (att.km_travelled * emp.car_allowance_per_km)
                car_km_total += att.km_travelled
            elif att.travel_vehicle == 'OTHER':
                travel_pay += att.actual_travel_amount
                other_travel_total += att.actual_travel_amount
                
        travel_calc = ""
        if travel_pay > 0:
            parts = []
            if bike_km_total > 0: parts.append(f"{bike_km_total} km * ₹{emp.bike_allowance_per_km}/km (Bike)")
            if car_km_total > 0: parts.append(f"{car_km_total} km * ₹{emp.car_allowance_per_km}/km (Car)")
            if other_travel_total > 0: parts.append(f"₹{other_travel_total} (Other)")
            travel_calc = " + ".join(parts) + f" = ₹{travel_pay:.2f}"
                
        incentives = (total_bags * emp.bag_incentive_rate) + (total_sales * emp.sales_incentive_pct)
        incentive_calc = ""
        if incentives > 0:
            parts = []
            if total_bags > 0: parts.append(f"{total_bags} bags * ₹{emp.bag_incentive_rate}")
            if total_sales > 0: parts.append(f"₹{total_sales} sales * {emp.sales_incentive_pct * 100}%")
            incentive_calc = " + ".join(parts) + f" = ₹{incentives:.2f}"
        
        gross_pay = basic_pay + hra + other_allowances + ot_pay + travel_pay + incentives
        
        # Deductions
        late_deduction = total_late_hours * (base_hourly_rate * emp.late_deduction_rate)
        late_calc = f"{total_late_hours} hrs * (₹{base_hourly_rate:.2f}/hr * {emp.late_deduction_rate}x) = ₹{late_deduction:.2f}" if total_late_hours > 0 else ""
        
        # Salary Advance (Check for active advances)
        advances = SalaryAdvance.objects.filter(labourid=emp, remaining_balance__gt=0)
        advance_deduction = 0.0
        advance_calc_parts = []
        
        # Calculate maximum possible EMI deduction without going negative
        max_emi_possible = gross_pay - late_deduction - total_daily_advance
        if max_emi_possible < 0:
            max_emi_possible = 0.0
            
        for adv in advances:
            if advance_deduction >= max_emi_possible:
                break
            deduct = min(adv.deduction_per_month, adv.remaining_balance)
            # Cap the deduction to the remaining possible net pay
            if advance_deduction + deduct > max_emi_possible:
                deduct = max_emi_possible - advance_deduction
            if deduct > 0:
                advance_deduction += deduct
                advance_calc_parts.append(f"₹{deduct:.2f} (Monthly EMI)")
            
        if total_daily_advance > 0:
            advance_calc_parts.append(f"₹{total_daily_advance:.2f} (Daily Advances)")
            
        advance_calc = " + ".join(advance_calc_parts) + f" = ₹{advance_deduction + total_daily_advance:.2f}" if advance_calc_parts else ""
            
        net_pay = gross_pay - late_deduction - advance_deduction - total_daily_advance
        
        # Check if finalized
        slip = SalarySlip.objects.filter(labourid=emp, month=month).first()
        is_finalized = slip.is_finalized if slip else False
        is_paid = slip.is_paid if slip else False
        
        if slip and slip.manual_advance_override is not None:
            # Recompute net_pay based on override
            old_adv = advance_deduction + total_daily_advance
            advance_deduction = slip.manual_advance_override - total_daily_advance
            if advance_deduction < 0: advance_deduction = 0
            net_pay = gross_pay - late_deduction - slip.manual_advance_override
        
        payroll_data.append({
            'labour_id': emp.id,
            'labour_name': emp.name,
            'employee_type': emp.employee_type,
            'is_finalized': is_finalized,
            'is_paid': is_paid,
            'bank_details': {
                'bank_name': emp.bank_name,
                'account_no': emp.bank_account_number,
                'ifsc': emp.bank_ifsc
            },
            'stats': {
                'present': present_count,
                'half_day': half_day_count,
                'absent': absent_count,
                'wo': wo_count,
                'payable_days': payable_days,
                'paid_leave_count': paid_leave_count,
                'ot_hours': total_ot_hours,
                'late_hours': total_late_hours,
                'km_travelled': total_km,
                'bags': total_bags,
                'daily_rate': daily_rate
            },
            'earnings': {
                'basic': round(basic_pay, 2),
                'hra': round(hra, 2),
                'allowances': round(other_allowances, 2),
                'travel': round(travel_pay, 2),
                'ot_pay': round(ot_pay, 2),
                'incentives': round(incentives, 2),
                'gross': round(gross_pay, 2)
            },
            'deductions': {
                'late': round(late_deduction, 2),
                'advance': round(advance_deduction + total_daily_advance, 2),
                'total_deductions': round(late_deduction + advance_deduction + total_daily_advance, 2)
            },
            'net_pay': round(net_pay, 2),
            'breakdown': {
                'basic': basic_calc,
                'ot': ot_calc,
                'travel': travel_calc,
                'late': late_calc,
                'incentive': incentive_calc,
                'advance': advance_calc
            },
            'breakdown_data': {
                'bike_km': bike_km_total,
                'bike_rate': emp.bike_allowance_per_km,
                'car_km': car_km_total,
                'car_rate': emp.car_allowance_per_km,
                'ot_rate': base_hourly_rate * emp.overtime_hourly_rate,
                'late_rate': base_hourly_rate * emp.late_deduction_rate,
                'bag_rate': emp.bag_incentive_rate
            }
        })

    return send_success(payroll_data, 'Payroll generated successfully')
@api_view(['POST'])
def hr_finalize_payroll(request):
    data = request.data
    month = data.get('month')
    slips = data.get('slips', [])
    
    if not month or not slips:
        return send_error('Month and slips are required', 400)
        
    for slip_data in slips:
        labour_id = slip_data.get('labour_id')
        if not labour_id:
            continue
            
        # Check if already finalized
        slip = SalarySlip.objects.filter(labourid_id=labour_id, month=month).first()
        if slip and slip.is_finalized:
            continue
            
        if not slip:
            slip = SalarySlip(labourid_id=labour_id, month=month)
            
        # Freeze the exact payload
        slip.slip_data = slip_data
        slip.is_finalized = True
        slip.basic_pay = slip_data['earnings'].get('basic', 0.0)
        slip.hra = slip_data['earnings'].get('hra', 0.0)
        slip.allowances = slip_data['earnings'].get('allowances', 0.0)
        slip.ot_pay = slip_data['earnings'].get('ot_pay', 0.0)
        slip.incentives = slip_data['earnings'].get('incentives', 0.0)
        slip.gross_pay = slip_data['earnings'].get('gross', 0.0)
        
        slip.advance_deduction = slip_data['deductions'].get('advance', 0.0)
        slip.late_deduction = slip_data['deductions'].get('late', 0.0)
        slip.net_pay = slip_data.get('net_pay', 0.0)
        
        slip.manual_advance_override = slip_data.get('manual_advance_override')
        slip.is_finalized = True
        slip.save()
        
        # Post to ledger (Salary Payable)
        EmployeeLedger.objects.create(
            labourid_id=labour_id,
            transaction_type='SALARY',
            description=f'Salary for {month}',
            amount=slip.net_pay,
            reference_id=slip.id
        )
        
        # Reduce Advance Balance if advance was deducted
        if slip.advance_deduction > 0:
            # We deduct from active advances
            advances = SalaryAdvance.objects.filter(labourid_id=labour_id, remaining_balance__gt=0).order_by('createdat')
            remaining_to_deduct = slip.advance_deduction
            for adv in advances:
                if remaining_to_deduct <= 0: break
                deduct = min(adv.remaining_balance, remaining_to_deduct)
                adv.remaining_balance -= deduct
                adv.save()
                remaining_to_deduct -= deduct
                
    return send_success(None, 'Payroll finalized and posted to ledgers')

@api_view(['GET'])
def hr_employee_ledger(request, labour_id):
    ledger = EmployeeLedger.objects.filter(labourid_id=labour_id).order_by('date', 'created_at')
    data = []
    balance = 0.0
    for entry in ledger:
        balance += entry.amount
        data.append({
            'id': entry.id,
            'date': entry.date.strftime('%Y-%m-%d'),
            'type': entry.transaction_type,
            'description': entry.description,
            'amount': entry.amount,
            'balance': balance,
            'reference_id': entry.reference_id
        })
    return send_success({'ledger': data, 'current_balance': balance}, 'Ledger fetched')

@api_view(['POST'])
def hr_ledger_payment(request):
    data = request.data
    labour_id = data.get('labour_id')
    amount = float(data.get('amount') or 0.0)
    description = data.get('description', 'Salary Payment')
    date_str = data.get('date', timezone.now().date().strftime('%Y-%m-%d'))
    
    if not labour_id or amount <= 0:
        return send_error('Valid labour_id and amount > 0 required', 400)
        
    entry = EmployeeLedger.objects.create(
        labourid_id=labour_id,
        date=date_str,
        transaction_type='PAYMENT',
        description=description,
        amount=-amount # Payment reduces the company's debt to employee
    )
    
    return send_success({'id': entry.id}, 'Payment recorded successfully')



@api_view(['GET', 'POST'])
def hr_leave_types(request):
    company_id = _get_company_id(request)
    if request.method == 'GET':
        types = LeaveType.objects.filter(companyid_id=company_id).values()
        return send_success(list(types))
    else:
        name = request.data.get('name')
        if not name: return send_error('Name required')
        LeaveType.objects.create(name=name, companyid_id=company_id)
        return send_success({}, 'Leave Type created')

@api_view(['DELETE'])
def hr_leave_types_detail(request, pk):
    LeaveType.objects.filter(id=pk).delete()
    return send_success({}, 'Deleted')

@api_view(['GET', 'POST'])
def hr_leave_balances(request):
    if request.method == 'GET':
        balances = EmployeeLeaveBalance.objects.select_related('labourid', 'leavetypeid').all()
        data = []
        for b in balances:
            data.append({
                'id': b.id,
                'labour_id': b.labourid_id,
                'labour_name': b.labourid.name if b.labourid else '',
                'leave_type_id': b.leavetypeid_id,
                'leave_type_name': b.leavetypeid.name if b.leavetypeid else '',
                'allocated_days': b.allocated_days,
                'used_days': b.used_days
            })
        return send_success(data)
    else:
        # Update or create balance
        labour_id = request.data.get('labour_id')
        leave_type_id = request.data.get('leave_type_id')
        allocated = float(request.data.get('allocated_days', 0))
        
        balance, _ = EmployeeLeaveBalance.objects.get_or_create(
            labourid_id=labour_id,
            leavetypeid_id=leave_type_id,
            defaults={'allocated_days': allocated}
        )
        if not _:
            balance.allocated_days = allocated
            balance.save()
        return send_success({}, 'Balance updated')

@api_view(['GET', 'POST'])
def hr_leave_records(request):
    if request.method == 'GET':
        records = LeaveRecord.objects.select_related('labourid', 'leavetypeid').order_by('-date')[:100]
        data = []
        for r in records:
            data.append({
                'id': r.id,
                'labour_id': r.labourid_id,
                'labour_name': r.labourid.name if r.labourid else '',
                'leave_type_id': r.leavetypeid_id,
                'leave_type_name': r.leavetypeid.name if r.leavetypeid else 'Unpaid/Other',
                'date': r.date,
                'is_paid': r.is_paid,
                'status': r.status,
                'createdat': r.createdat
            })
        return send_success(data)
    else:
        labour_id = request.data.get('labour_id')
        leave_type_id = request.data.get('leave_type_id') or None
        date_str = request.data.get('date')
        is_paid = request.data.get('is_paid', False)
        status = request.data.get('status', 'FULL_DAY')
        
        if not labour_id or not date_str:
            return send_error('Labour ID and Date required')
            
        record = LeaveRecord.objects.create(
            labourid_id=labour_id,
            leavetypeid_id=leave_type_id,
            date=date_str,
            is_paid=is_paid,
            status=status
        )
        
        # Deduct from balance if paid
        if is_paid and leave_type_id:
            try:
                balance = EmployeeLeaveBalance.objects.get(labourid_id=labour_id, leavetypeid_id=leave_type_id)
                deduction = 1.0 if status == 'FULL_DAY' else 0.5
                balance.used_days += deduction
                balance.save()
            except EmployeeLeaveBalance.DoesNotExist:
                pass
                
        return send_success({}, 'Leave recorded')

@api_view(['POST'])
def hr_mark_slip_paid(request):
    data = request.data
    month = data.get('month')
    labour_id = data.get('labour_id')
    amount = data.get('amount')
    date_val = data.get('date', timezone.now().date().strftime('%Y-%m-%d'))
    payment_mode = data.get('payment_mode', 'CASH')
    payment_reference = data.get('payment_reference', '')
    remark = data.get('remark', f'Salary Payment for {month}')
    
    slip = SalarySlip.objects.filter(labourid_id=labour_id, month=month).first()
    if not slip:
        return send_error('Salary slip not found for this month', 404)
        
    if slip.is_paid:
        return send_success(None, 'Already marked as paid')
        
    # Mark paid
    slip.is_paid = True
    slip.save()
    
    # Record payment in ledger
    EmployeeLedger.objects.create(
        labourid_id=labour_id,
        date=date_val,
        transaction_type='PAYMENT',
        description=remark,
        amount=-float(amount),
        payment_mode=payment_mode,
        payment_reference=payment_reference
    )
    
    return send_success(None, 'Payment recorded and slip marked as paid')
