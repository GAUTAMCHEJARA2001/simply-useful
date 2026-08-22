from api.models import LeaveType, LeaveRecord, EmployeeLeaveBalance
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from api.views import send_success, send_error, _get_company_id

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

from api.models import LeavePolicy, LeaveAllocationLog, HRDepartment, HRDesignation, Labour, Company
from django.utils import timezone

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def hr_leave_policies(request):
    company_id = _get_company_id(request)
    if request.method == 'GET':
        policies = LeavePolicy.objects.select_related('leavetype', 'department', 'designation')
        if company_id:
            policies = policies.filter(companyid_id=company_id)
        
        data = []
        for p in policies:
            try:
                dept_name = p.department.name if p.department else 'All Departments'
            except Exception:
                dept_name = 'All Departments'
                
            try:
                desig_name = p.designation.name if p.designation else 'All Designations'
            except Exception:
                desig_name = 'All Designations'

            data.append({
                'id': p.id,
                'leave_type_id': p.leavetype.id,
                'leave_type_name': p.leavetype.name,
                'department_id': p.department_id,
                'department_name': dept_name,
                'designation_id': p.designation_id,
                'designation_name': desig_name,
                'frequency': p.frequency,
                'days_to_allocate': p.days_to_allocate,
                'is_active': p.is_active,
            })
        return send_success(data)
        
    elif request.method == 'POST':
        data = request.data
        policy = LeavePolicy.objects.create(
            companyid_id=company_id,
            leavetype_id=data.get('leave_type_id'),
            department_id=data.get('department_id') or None,
            designation_id=data.get('designation_id') or None,
            frequency=data.get('frequency', 'YEARLY'),
            days_to_allocate=data.get('days_to_allocate', 0.0),
            is_active=data.get('is_active', True)
        )
        return send_success({'id': policy.id}, 'Leave Policy created')

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def hr_leave_policies_detail(request, pk):
    try:
        policy = LeavePolicy.objects.get(pk=pk)
    except LeavePolicy.DoesNotExist:
        return send_error('Policy not found', 404)
        
    if request.method == 'PUT':
        data = request.data
        if 'leave_type_id' in data: policy.leavetype_id = data['leave_type_id']
        if 'department_id' in data: policy.department_id = data['department_id'] or None
        if 'designation_id' in data: policy.designation_id = data['designation_id'] or None
        if 'frequency' in data: policy.frequency = data['frequency']
        if 'days_to_allocate' in data: policy.days_to_allocate = data['days_to_allocate']
        if 'is_active' in data: policy.is_active = data['is_active']
        policy.save()
        return send_success(None, 'Policy updated')
        
    elif request.method == 'DELETE':
        policy.delete()
        return send_success(None, 'Policy deleted')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hr_leave_allocate(request):
    company_id = _get_company_id(request)
    policies = LeavePolicy.objects.filter(is_active=True)
    if company_id:
        policies = policies.filter(companyid_id=company_id)
        
    now = timezone.now()
    allocations_made = 0
    
    for policy in policies:
        # Determine current period identifier based on frequency
        period_identifier = f"{now.year}"
        if policy.frequency == 'MONTHLY':
            period_identifier = f"{now.year}-{now.month:02d}"
        elif policy.frequency == 'BI_MONTHLY':
            period = ((now.month - 1) // 2) + 1
            period_identifier = f"{now.year}-B{period}"
        elif policy.frequency == 'QUARTERLY':
            q = ((now.month - 1) // 3) + 1
            period_identifier = f"{now.year}-Q{q}"
        elif policy.frequency == 'HALF_YEARLY':
            h = 1 if now.month <= 6 else 2
            period_identifier = f"{now.year}-H{h}"
            
        # Check if already allocated for this period
        if LeaveAllocationLog.objects.filter(policy=policy, period_identifier=period_identifier).exists():
            continue
            
        # Get target employees
        employees = Labour.objects.filter(active=True)
        if company_id:
            employees = employees.filter(companyid_id=company_id)
        if policy.department_id:
            try:
                dept_name = policy.department.name if policy.department else None
                if dept_name:
                    employees = employees.filter(department=dept_name)
            except Exception:
                pass
        if policy.designation_id:
            try:
                desig_name = policy.designation.name if policy.designation else None
                if desig_name:
                    employees = employees.filter(designation=desig_name)
            except Exception:
                pass
            
        # Allocate
        for emp in employees:
            bal, created = EmployeeLeaveBalance.objects.get_or_create(
                labourid=emp,
                leavetypeid=policy.leavetype,
                defaults={'allocated_days': 0.0, 'used_days': 0.0}
            )
            bal.allocated_days += policy.days_to_allocate
            bal.save()
            
        # Log it
        LeaveAllocationLog.objects.create(
            companyid_id=company_id,
            policy=policy,
            allocation_date=now.date(),
            period_identifier=period_identifier
        )
        allocations_made += 1
        
    return send_success({'allocations_made': allocations_made}, f'Successfully processed {allocations_made} policy rules')
