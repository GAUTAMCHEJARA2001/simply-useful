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
    HRDepartment, HRDesignation, EmployeeLedger, Expense
)
from core.models import User
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
        def _get_full_url(file_field):
            if not file_field:
                return None
            try:
                url = file_field.url
                if url.startswith('http://') or url.startswith('https://'):
                    return url
                return request.build_absolute_uri(url)
            except Exception:
                return None

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
                'employee_photo': _get_full_url(l.employee_photo),
                'aadhar_photo': _get_full_url(l.aadhar_photo),
                'pan_photo': _get_full_url(l.pan_photo),
                'bank_proof_photo': _get_full_url(l.bank_proof_photo)
            })
        return send_success(employees, 'Employees fetched')

    elif request.method == 'POST':
        data = request.data
        if not company_id:
            first_comp = Company.objects.first()
            company_id = first_comp.id if first_comp else None

        name = str(data.get('name', '')).strip()
        if not name:
            return send_error('Employee name is required', 400)

        existing_emp = Labour.objects.filter(name__iexact=name, companyid_id=company_id).first()
        if existing_emp:
            return send_error(f'An employee with name "{name}" already exists', 400)

        def _to_float(v, default=0.0):
            try:
                return float(v) if v not in (None, '', 'null', 'undefined') else default
            except (ValueError, TypeError):
                return default

        wh_raw = data.get('warehouseid')
        warehouse_id = None
        if wh_raw not in (None, '', 'null', 'undefined', 'None'):
            try:
                warehouse_id = int(wh_raw)
            except (ValueError, TypeError):
                warehouse_id = None

        rep_raw = data.get('reports_to')
        reports_to_id = None
        if rep_raw not in (None, '', 'null', 'undefined', 'None'):
            try:
                reports_to_id = int(rep_raw)
            except (ValueError, TypeError):
                reports_to_id = None

        user_id_raw = data.get('user_id')
        user_id = str(user_id_raw).strip() if user_id_raw not in (None, '', 'null', 'undefined', 'None') else None
        if user_id:
            existing_user_emp = Labour.objects.filter(user_id=user_id).first()
            if existing_user_emp:
                return send_error(f'User account is already linked to employee {existing_user_emp.name}', 400)

        doj_raw = data.get('doj')
        doj_val = None
        if doj_raw not in (None, '', 'null', 'undefined', 'None'):
            try:
                doj_val = datetime.datetime.strptime(str(doj_raw).strip()[:10], '%Y-%m-%d').date()
            except ValueError:
                doj_val = None

        try:
            emp = Labour.objects.create(
                name=name,
                employee_type=data.get('employee_type', 'VARIABLE'),
                companyid_id=company_id,
                base_salary_monthly=_to_float(data.get('base_salary_monthly')),
                dailywage=_to_float(data.get('dailywage')),
                overtime_hourly_rate=_to_float(data.get('overtime_hourly_rate')),
                late_deduction_rate=_to_float(data.get('late_deduction_rate')),
                bike_allowance_per_km=_to_float(data.get('bike_allowance_per_km')),
                car_allowance_per_km=_to_float(data.get('car_allowance_per_km')),
                sales_incentive_pct=_to_float(data.get('sales_incentive_pct')),
                bag_incentive_rate=_to_float(data.get('bag_incentive_rate')),
                contactinfo=data.get('contactinfo', ''),
                warehouseid_id=warehouse_id,
                department=data.get('department') or None,
                designation=data.get('designation') or None,
                reports_to_id=reports_to_id,
                is_ot_eligible=bool(data.get('is_ot_eligible')),
                is_late_deduction_eligible=data.get('is_late_deduction_eligible') == 'true' or data.get('is_late_deduction_eligible') is True,
                is_km_eligible=data.get('is_km_eligible') == 'true' or data.get('is_km_eligible') is True,
                is_bag_eligible=data.get('is_bag_eligible') == 'true' or data.get('is_bag_eligible') is True,
                user_id=user_id,
                doj=doj_val,
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
            
            return send_success({
                'id': emp.id,
                'name': emp.name,
                'employee_photo': _get_full_url(emp.employee_photo),
                'aadhar_photo': _get_full_url(emp.aadhar_photo),
                'pan_photo': _get_full_url(emp.pan_photo),
                'bank_proof_photo': _get_full_url(emp.bank_proof_photo),
                **data
            }, 'Employee created')
        except Exception as e:
            return send_error(f'Failed to create employee: {str(e)}', 400)

@api_view(['PUT', 'DELETE'])
def hr_employees_detail(request, pk):
    try:
        emp = Labour.objects.get(id=pk)
    except Labour.DoesNotExist:
        return send_error('Employee not found', 404)

    if request.method == 'PUT':
        data = request.data
        def _to_float(v, default=0.0):
            try:
                return float(v) if v not in (None, '', 'null', 'undefined') else default
            except (ValueError, TypeError):
                return default

        try:
            name = str(data.get('name', emp.name)).strip()
            if not name:
                return send_error('Employee name is required', 400)
            existing_emp = Labour.objects.filter(name__iexact=name, companyid=emp.companyid).exclude(id=emp.id).first()
            if existing_emp:
                return send_error(f'Another employee with name "{name}" already exists', 400)
            emp.name = name

            emp.employee_type = data.get('employee_type', emp.employee_type)
            emp.base_salary_monthly = _to_float(data.get('base_salary_monthly'), emp.base_salary_monthly)
            emp.dailywage = _to_float(data.get('dailywage'), emp.dailywage)
            emp.overtime_hourly_rate = _to_float(data.get('overtime_hourly_rate'), emp.overtime_hourly_rate)
            emp.late_deduction_rate = _to_float(data.get('late_deduction_rate'), emp.late_deduction_rate)
            emp.bike_allowance_per_km = _to_float(data.get('bike_allowance_per_km'), emp.bike_allowance_per_km)
            emp.car_allowance_per_km = _to_float(data.get('car_allowance_per_km'), emp.car_allowance_per_km)
            emp.sales_incentive_pct = _to_float(data.get('sales_incentive_pct'), emp.sales_incentive_pct)
            emp.bag_incentive_rate = _to_float(data.get('bag_incentive_rate'), emp.bag_incentive_rate)
            emp.contactinfo = data.get('contactinfo', emp.contactinfo)
            emp.department = data.get('department', emp.department) or None
            emp.designation = data.get('designation', emp.designation) or None
            
            reports_to_val = data.get('reports_to', emp.reports_to_id)
            if reports_to_val in (None, '', 'null', 'undefined', 'None'):
                emp.reports_to_id = None
            else:
                try:
                    emp.reports_to_id = int(reports_to_val)
                except (ValueError, TypeError):
                    pass
            
            if 'is_ot_eligible' in data: emp.is_ot_eligible = data.get('is_ot_eligible') == 'true' or data.get('is_ot_eligible') is True
            if 'is_late_deduction_eligible' in data: emp.is_late_deduction_eligible = data.get('is_late_deduction_eligible') == 'true' or data.get('is_late_deduction_eligible') is True
            if 'is_km_eligible' in data: emp.is_km_eligible = data.get('is_km_eligible') == 'true' or data.get('is_km_eligible') is True
            if 'is_bag_eligible' in data: emp.is_bag_eligible = data.get('is_bag_eligible') == 'true' or data.get('is_bag_eligible') is True
            
            wh_val = data.get('warehouseid')
            if wh_val in (None, '', 'null', 'undefined', 'None'):
                emp.warehouseid_id = None
            elif wh_val:
                try:
                    emp.warehouseid_id = int(wh_val)
                except (ValueError, TypeError):
                    pass
                
            if 'user_id' in data:
                u_val = data.get('user_id')
                user_id = str(u_val).strip() if u_val not in (None, '', 'null', 'undefined', 'None') else None
                if user_id:
                    existing_user_emp = Labour.objects.filter(user_id=user_id).exclude(id=emp.id).first()
                    if existing_user_emp:
                        return send_error(f'User account is already linked to employee {existing_user_emp.name}', 400)
                emp.user_id = user_id

            if 'doj' in data:
                doj_val = data.get('doj')
                if doj_val not in (None, '', 'null', 'undefined', 'None'):
                    try:
                        emp.doj = datetime.datetime.strptime(str(doj_val).strip()[:10], '%Y-%m-%d').date()
                    except ValueError:
                        emp.doj = None
                else:
                    emp.doj = None

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
            def _get_full_url(file_field):
                if not file_field:
                    return None
                try:
                    url = file_field.url
                    if url.startswith('http://') or url.startswith('https://'):
                        return url
                    return request.build_absolute_uri(url)
                except Exception:
                    return None

            return send_success({
                'id': emp.id,
                'name': emp.name,
                'employee_photo': _get_full_url(emp.employee_photo),
                'aadhar_photo': _get_full_url(emp.aadhar_photo),
                'pan_photo': _get_full_url(emp.pan_photo),
                'bank_proof_photo': _get_full_url(emp.bank_proof_photo),
                **data
            }, 'Employee updated')
        except Exception as e:
            return send_error(f'Failed to update employee: {str(e)}', 400)

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
    # Load salary component settings and company branding
    settings_data = load_settings()
    company_info = {
        'name': settings_data.get('company_name') or settings_data.get('companyName') or 'Company Name',
        'address': settings_data.get('company_address') or '',
        'phone': settings_data.get('company_phone') or '',
        'email': settings_data.get('company_email') or '',
        'gst': settings_data.get('company_gst') or '',
        'logo': settings_data.get('company_logo') or '',
    }
    hr_salary_components = settings_data.get('hr_salary_components', {})
    basic_pct = float(hr_salary_components.get('basic', 50)) / 100.0
    hra_pct = float(hr_salary_components.get('hra', 30)) / 100.0
    allowance_pct = float(hr_salary_components.get('allowances', 20)) / 100.0
    
    for emp in employees:
        # Freeze past data ONLY if slip is already paid. If finalized but unpaid, calculate live so new loans/advances are reflected.
        slip = SalarySlip.objects.filter(labourid=emp, month=month).first()
        if slip and slip.is_finalized and slip.is_paid and slip.slip_data:
            # Reconstruct exact past payload to avoid dynamic recalculation
            stored_data = slip.slip_data.copy()
            stored_data['is_finalized'] = True
            stored_data['is_paid'] = True
            if 'company' not in stored_data or not stored_data.get('company'):
                stored_data['company'] = company_info
            if 'month' not in stored_data:
                stored_data['month'] = month
            if 'employee_id' not in stored_data:
                stored_data['employee_id'] = emp.employee_id
            if 'designation' not in stored_data:
                stored_data['designation'] = emp.designation
            if 'department' not in stored_data:
                stored_data['department'] = emp.department
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
        
        # Approved Expenses from Expense Entry (Only APPROVED expenses for the given month)
        emp_emails = []
        if emp.user and emp.user.email:
            emp_emails.append(emp.user.email.strip().lower())
        matching_users = User.objects.filter(name__iexact=emp.name)
        for mu in matching_users:
            if mu.email and mu.email.strip().lower() not in emp_emails:
                emp_emails.append(mu.email.strip().lower())
                
        approved_expenses_total = 0.0
        expense_calc_parts = []
        if emp_emails:
            approved_exp_qs = Expense.objects.filter(
                status='APPROVED',
                date__year=int(y_str),
                date__month=int(m_str)
            )
            exp_list = [e for e in approved_exp_qs if (getattr(e, 'soemail_id', '') or '').strip().lower() in emp_emails]
            for exp in exp_list:
                amt = float(exp.amount or 0.0)
                if amt > 0:
                    approved_expenses_total += amt
                    cat = exp.category or 'Expense'
                    expense_calc_parts.append(f"₹{amt:.2f} ({cat})")

        expense_calc = " + ".join(expense_calc_parts) + f" = ₹{approved_expenses_total:.2f}" if expense_calc_parts else ""

        gross_pay = basic_pay + hra + other_allowances + ot_pay + travel_pay + incentives + approved_expenses_total
        
        # Deductions
        late_deduction = total_late_hours * (base_hourly_rate * emp.late_deduction_rate)
        late_calc = f"{total_late_hours} hrs * (₹{base_hourly_rate:.2f}/hr * {emp.late_deduction_rate}x) = ₹{late_deduction:.2f}" if total_late_hours > 0 else ""
        
        # Salary Advance (Check for active advances)
        advances = SalaryAdvance.objects.filter(labourid=emp, remaining_balance__gt=0)
        advance_deduction = 0.0
        advance_calc_parts = []
        
        for adv in advances:
            emi = adv.deduction_per_month if (adv.deduction_per_month and adv.deduction_per_month > 0) else adv.remaining_balance
            deduct = min(emi, adv.remaining_balance)
            if deduct > 0:
                advance_deduction += deduct
                advance_calc_parts.append(f"₹{deduct:.2f} (Loan/Adv EMI)")
            
        if total_daily_advance > 0:
            advance_calc_parts.append(f"₹{total_daily_advance:.2f} (Daily Advances)")
            
        advance_calc = " + ".join(advance_calc_parts) + f" = ₹{advance_deduction + total_daily_advance:.2f}" if advance_calc_parts else ""
            
        net_pay = round(gross_pay - late_deduction - advance_deduction - total_daily_advance, 2)
        
        # Check if finalized
        slip = SalarySlip.objects.filter(labourid=emp, month=month).first()
        is_finalized = slip.is_finalized if slip else False
        is_paid = slip.is_paid if slip else False
        
        if slip and slip.manual_advance_override is not None:
            # Recompute net_pay based on override
            advance_deduction = max(0.0, slip.manual_advance_override - total_daily_advance)
            net_pay = max(0.0, round(gross_pay - late_deduction - slip.manual_advance_override, 2))
        
        payroll_data.append({
            'month': month,
            'labour_id': emp.id,
            'labour_name': emp.name,
            'employee_id': emp.employee_id or '',
            'designation': emp.designation or '',
            'department': emp.department or '',
            'doj': emp.doj.strftime('%Y-%m-%d') if emp.doj else '',
            'pan_number': emp.pan_number or '',
            'aadhar_number': emp.aadhar_number or '',
            'employee_type': emp.employee_type,
            'is_finalized': is_finalized,
            'is_paid': is_paid,
            'company': company_info,
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
                'expenses': round(approved_expenses_total, 2),
                'gross': round(gross_pay, 2)
            },
            'deductions': {
                'late': round(late_deduction, 2),
                'advance': round(advance_deduction + total_daily_advance, 2),
                'loan_emi': round(advance_deduction, 2),
                'daily_advance': round(total_daily_advance, 2),
                'total_deductions': round(late_deduction + advance_deduction + total_daily_advance, 2)
            },
            'net_pay': round(net_pay, 2),
            'breakdown': {
                'basic': basic_calc,
                'ot': ot_calc,
                'travel': travel_calc,
                'late': late_calc,
                'incentive': incentive_calc,
                'advance': advance_calc,
                'expenses': expense_calc
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
            
        # Check if already finalized and paid
        slip = SalarySlip.objects.filter(labourid_id=labour_id, month=month).first()
        if slip and slip.is_finalized and slip.is_paid:
            continue
            
        old_adv_deduction = float(slip.advance_deduction) if slip and slip.id else 0.0
            
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
        
        manual_override = slip_data.get('manual_advance_override')
        if manual_override is not None:
            slip.advance_deduction = float(manual_override)
        else:
            slip.advance_deduction = float(slip_data.get('deductions', {}).get('advance', 0.0))
            
        slip.late_deduction = float(slip_data.get('deductions', {}).get('late', 0.0))
        slip.net_pay = float(slip_data.get('net_pay', 0.0))
        
        slip.manual_advance_override = manual_override
        slip.is_finalized = True
        slip.save()
        
        # Post to ledger (Salary Payable)
        salary_credit = round(slip.net_pay + (slip.advance_deduction or 0.0), 2)
        ledger_entry = EmployeeLedger.objects.filter(labourid_id=labour_id, reference_id=slip.id, transaction_type='SALARY').first()
        if ledger_entry:
            ledger_entry.amount = salary_credit
            ledger_entry.description = f'Salary for {month}'
            ledger_entry.save()
        else:
            EmployeeLedger.objects.create(
                labourid_id=labour_id,
                transaction_type='SALARY',
                description=f'Salary for {month}',
                amount=salary_credit,
                reference_id=slip.id
            )
        
        # Adjust Advance/Loan Balance
        diff_adv = slip.advance_deduction - old_adv_deduction
        if diff_adv > 0:
            advances = SalaryAdvance.objects.filter(labourid_id=labour_id, remaining_balance__gt=0).order_by('createdat')
            rem = diff_adv
            for adv in advances:
                if rem <= 0: break
                deduct = min(adv.remaining_balance, rem)
                adv.remaining_balance = max(0.0, round(adv.remaining_balance - deduct, 2))
                adv.save()
                rem -= deduct
        elif diff_adv < 0:
            adv = SalaryAdvance.objects.filter(labourid_id=labour_id).order_by('-createdat').first()
            if adv:
                adv.remaining_balance = round(adv.remaining_balance + abs(diff_adv), 2)
                adv.save()
                
    return send_success(None, 'Payroll finalized and posted to ledgers')

@api_view(['GET'])
def hr_employee_ledger(request, labour_id):
    # 1. Manual and system EmployeeLedger entries
    ledger = list(EmployeeLedger.objects.filter(labourid_id=labour_id).order_by('date', 'created_at'))
    
    # 2. Daily Attendance advances
    attendance_advances = list(DailyAttendance.objects.filter(labourid_id=labour_id, daily_advance__gt=0).order_by('date'))
    
    raw_entries = []
    
    for entry in ledger:
        amt = entry.amount
        # If this is a SALARY entry linked to a SalarySlip that had advance_deduction,
        # adjust amount to gross earnings so the advance (debited separately) is not double deducted
        if entry.transaction_type == 'SALARY' and entry.reference_id:
            slip = SalarySlip.objects.filter(id=entry.reference_id).first()
            if slip and slip.advance_deduction > 0 and abs(amt - slip.net_pay) < 0.01:
                amt = round(slip.net_pay + slip.advance_deduction, 2)
        
        raw_entries.append({
            'id': entry.id,
            'date': entry.date,
            'type': entry.transaction_type,
            'description': entry.description,
            'amount': amt,
            'reference_id': entry.reference_id,
            'payment_mode': entry.payment_mode or '',
            'payment_reference': entry.payment_reference or '',
            'created_at': entry.created_at
        })
    
    for adv in attendance_advances:
        desc_parts = ['Daily Attendance Advance']
        if adv.advance_medium:
            desc_parts.append(f"via {adv.advance_medium}")
        if adv.advance_slip_no:
            desc_parts.append(f"Slip #{adv.advance_slip_no}")
        if adv.advance_note:
            desc_parts.append(f"Note: {adv.advance_note}")
        
        dt_val = datetime.datetime.combine(adv.date, datetime.time.min)
        if timezone.is_aware(timezone.now()):
            dt_val = timezone.make_aware(dt_val)
            
        raw_entries.append({
            'id': f"att_{adv.id}",
            'date': adv.date,
            'type': 'ADVANCE',
            'description': ' — '.join(desc_parts),
            'amount': -float(adv.daily_advance), # Debit (-)
            'reference_id': adv.id,
            'payment_mode': adv.advance_medium or 'CASH',
            'payment_reference': adv.advance_slip_no or '',
            'created_at': dt_val
        })
    
    # Sort chronologically by date and creation time
    raw_entries.sort(key=lambda x: (x['date'], x.get('created_at') or datetime.datetime.min))
    
    data = []
    balance = 0.0
    for e in raw_entries:
        balance = round(balance + e['amount'], 2)
        data.append({
            'id': e['id'],
            'date': e['date'].strftime('%Y-%m-%d') if hasattr(e['date'], 'strftime') else str(e['date']),
            'type': e['type'],
            'description': e['description'],
            'amount': e['amount'],
            'balance': balance,
            'reference_id': e['reference_id'],
            'payment_mode': e.get('payment_mode', ''),
            'payment_reference': e.get('payment_reference', '')
        })
    
    return send_success({'ledger': data, 'current_balance': balance}, 'Ledger fetched')

@api_view(['POST'])
def hr_ledger_payment(request):
    data = request.data
    labour_id = data.get('labour_id')
    amount = float(data.get('amount') or 0.0)
    description = data.get('description', 'Salary Payment')
    date_str = data.get('date') or timezone.now().date().strftime('%Y-%m-%d')
    payment_mode = data.get('payment_mode') or 'CASH'
    payment_reference = data.get('payment_reference') or ''
    
    if not labour_id or amount <= 0:
        return send_error('Valid labour_id and amount > 0 required', 400)
        
    entry = EmployeeLedger.objects.create(
        labourid_id=labour_id,
        date=date_str,
        transaction_type='PAYMENT',
        description=description,
        amount=-amount, # Payment reduces the company's debt to employee
        payment_mode=payment_mode,
        payment_reference=payment_reference
    )
    
    return send_success({'id': entry.id}, 'Payment recorded successfully')

@api_view(['GET', 'POST'])
def hr_loans(request):
    if request.method == 'GET':
        labour_id = request.GET.get('labour_id')
        qs = SalaryAdvance.objects.all().select_related('labourid').order_by('-date_issued', '-id')
        if labour_id:
            qs = qs.filter(labourid_id=labour_id)
        
        loans_data = []
        for adv in qs:
            emp = adv.labourid
            loans_data.append({
                'id': adv.id,
                'labour_id': adv.labourid_id,
                'employee_name': emp.name if emp else 'Unknown',
                'amount': adv.amount,
                'deduction_per_month': adv.deduction_per_month,
                'remaining_balance': adv.remaining_balance,
                'repaid_amount': round(adv.amount - adv.remaining_balance, 2),
                'repaid_pct': round(((adv.amount - adv.remaining_balance) / adv.amount * 100), 1) if adv.amount > 0 else 100.0,
                'date_issued': adv.date_issued.strftime('%Y-%m-%d'),
                'is_active': adv.remaining_balance > 0,
            })
        return send_success(loans_data, 'Loans fetched')

    elif request.method == 'POST':
        data = request.data
        labour_id = data.get('labour_id')
        amount = float(data.get('amount') or 0.0)
        deduction_per_month = float(data.get('deduction_per_month') or 0.0)
        date_issued = data.get('date_issued') or timezone.now().date().strftime('%Y-%m-%d')
        payment_mode = data.get('payment_mode') or 'BANK_TRANSFER'
        payment_reference = data.get('payment_reference') or ''
        reason = data.get('reason') or data.get('description') or 'Salary Advance / Loan'
        
        if not labour_id:
            return send_error('Labour ID is required', 400)
        if amount <= 0:
            return send_error('Loan amount must be greater than 0', 400)
        if deduction_per_month <= 0:
            deduction_per_month = amount
            
        adv = SalaryAdvance.objects.create(
            labourid_id=labour_id,
            amount=amount,
            deduction_per_month=deduction_per_month,
            remaining_balance=amount,
            date_issued=date_issued
        )
        
        # Post to EmployeeLedger as a Debit (-)
        EmployeeLedger.objects.create(
            labourid_id=labour_id,
            date=date_issued,
            transaction_type='ADVANCE',
            description=f"Loan Issued #{adv.id} — {reason}",
            amount=-amount, # Debit: Company gave money to employee
            reference_id=adv.id,
            payment_mode=payment_mode,
            payment_reference=payment_reference
        )
        
        return send_success({'id': adv.id}, 'Loan issued and posted to ledger successfully')

@api_view(['POST'])
def hr_loan_set_off(request):
    data = request.data
    advance_id = data.get('advance_id')
    set_off_amount = float(data.get('set_off_amount') or 0.0)
    set_off_date = data.get('date') or timezone.now().date().strftime('%Y-%m-%d')
    payment_mode = data.get('payment_mode') or 'CASH'
    payment_reference = data.get('payment_reference') or ''
    notes = data.get('notes') or 'Manual Loan Set-Off'
    
    if not advance_id:
        return send_error('Advance ID is required', 400)
    if set_off_amount <= 0:
        return send_error('Set-off amount must be greater than 0', 400)
        
    adv = SalaryAdvance.objects.filter(id=advance_id).first()
    if not adv:
        return send_error('Loan/Advance record not found', 404)
        
    if set_off_amount > adv.remaining_balance:
        set_off_amount = adv.remaining_balance
        
    adv.remaining_balance = max(0.0, round(adv.remaining_balance - set_off_amount, 2))
    adv.save()
    
    # Post adjustment to EmployeeLedger as Credit (+)
    entry = EmployeeLedger.objects.create(
        labourid_id=adv.labourid_id,
        date=set_off_date,
        transaction_type='ADJUSTMENT',
        description=f"Loan Repayment / Set-off #{adv.id} — {notes}",
        amount=set_off_amount, # Credit: Employee repaid loan / settled debt
        reference_id=adv.id,
        payment_mode=payment_mode,
        payment_reference=payment_reference
    )
    
    return send_success({
        'id': entry.id,
        'remaining_balance': adv.remaining_balance
    }, 'Loan set-off recorded successfully')



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

@api_view(['GET'])
def hr_salary_slips(request):
    """
    Get salary slips for an employee or all employees.
    Supports filtering by:
    - labour_id: specific employee
    - month: single month (YYYY-MM)
    - months: comma-separated list of months (YYYY-MM,YYYY-MM)
    - is_finalized: boolean (true/false)
    """
    labour_id = request.GET.get('labour_id')
    month = request.GET.get('month')
    months_param = request.GET.get('months')
    is_finalized = request.GET.get('is_finalized')
    
    qs = SalarySlip.objects.all().select_related('labourid').order_by('-month', 'labourid__name')
    
    if labour_id:
        qs = qs.filter(labourid_id=labour_id)
        
    if month:
        qs = qs.filter(month=month)
    elif months_param:
        months_list = [m.strip() for m in months_param.split(',') if m.strip()]
        if months_list:
            qs = qs.filter(month__in=months_list)
            
    if is_finalized is not None:
        qs = qs.filter(is_finalized=(is_finalized.lower() in ('true', '1')))
        
    settings_data = load_settings()
    company_info = {
        'name': settings_data.get('company_name') or settings_data.get('companyName') or 'Company Name',
        'address': settings_data.get('company_address') or '',
        'phone': settings_data.get('company_phone') or '',
        'email': settings_data.get('company_email') or '',
        'gst': settings_data.get('company_gst') or '',
        'logo': settings_data.get('company_logo') or '',
    }
    
    results = []
    for slip in qs:
        emp = slip.labourid
        slip_raw = slip.slip_data or {}
        earnings = slip_raw.get('earnings') or {
            'basic': slip.basic_pay,
            'hra': slip.hra,
            'allowances': slip.allowances,
            'travel': slip.travel_allowance,
            'ot_pay': slip.ot_pay,
            'incentives': slip.incentives,
            'gross': slip.gross_pay
        }
        deductions = slip_raw.get('deductions') or {
            'advance': slip.advance_deduction,
            'late': slip.late_deduction,
            'unpaid_leave': slip.unpaid_leave_deduction,
            'other': slip.other_deductions,
            'total_deductions': round(slip.advance_deduction + slip.late_deduction + slip.unpaid_leave_deduction + slip.other_deductions, 2)
        }
        stats = slip_raw.get('stats') or {
            'payable_days': 30,
            'present_days': 30,
            'absent': 0,
            'ot_hours': 0,
            'late_hours': 0
        }
        
        results.append({
            'id': slip.id,
            'month': slip.month,
            'labour_id': slip.labourid_id,
            'labour_name': emp.name if emp else 'Unknown',
            'employee_id': emp.employee_id if emp else '',
            'employee_type': emp.employee_type if emp else 'FIXED',
            'designation': emp.designation if emp else '',
            'department': emp.department if emp else '',
            'doj': emp.doj.strftime('%Y-%m-%d') if (emp and emp.doj) else '',
            'pan_number': emp.pan_number if emp else '',
            'aadhar_number': emp.aadhar_number if emp else '',
            'bank_details': {
                'bank_name': emp.bank_name if emp else '',
                'account_no': emp.bank_account_number if emp else '',
                'ifsc': emp.bank_ifsc if emp else '',
            },
            'stats': stats,
            'earnings': earnings,
            'deductions': deductions,
            'net_pay': slip.net_pay,
            'is_finalized': slip.is_finalized,
            'is_paid': slip.is_paid,
            'company': company_info
        })
        
    return send_success(results, 'Salary slips retrieved successfully')
