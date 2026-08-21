import sys

code = '''
from api.models import LeavePolicy, LeaveAllocationLog, HRDepartment, HRDesignation, Labour, EmployeeLeaveBalance, Company, LeaveType
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from api.utils import send_success, send_error, _get_company_id

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def hr_leave_policies(request):
    company_id = _get_company_id(request)
    if request.method == 'GET':
        policies = LeavePolicy.objects.all()
        if company_id:
            policies = policies.filter(companyid_id=company_id)
        
        data = []
        for p in policies:
            data.append({
                'id': p.id,
                'leave_type_id': p.leavetype.id,
                'leave_type_name': p.leavetype.name,
                'department_id': p.department.id if p.department else None,
                'department_name': p.department.name if p.department else 'All Departments',
                'designation_id': p.designation.id if p.designation else None,
                'designation_name': p.designation.name if p.designation else 'All Designations',
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
            employees = employees.filter(department_id=policy.department_id)
        if policy.designation_id:
            employees = employees.filter(designation_id=policy.designation_id)
            
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
'''

with open('d:/cost 2/simply-useful/simply-useful/simply-useful/backend/api/leave_views.py', 'a', encoding='utf-8') as f:
    f.write(code)
