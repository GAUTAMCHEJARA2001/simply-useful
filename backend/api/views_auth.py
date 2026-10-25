import uuid
import bcrypt
import jwt
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response

from api.models import User, Warehouse, Userwarehouseaccess, Userproductaccess, Product, Category
from api.serializers import UserSerializer
from api.auth import generate_tokens, JWT_SECRET


class LoginRateThrottle(AnonRateThrottle):
    """Specific rate limiter for authentication attempts: 15 per minute."""
    rate = '15/minute'


def send_success(data=None, message='Done', status_code=200):
    return Response({'success': True, 'data': data, 'message': message}, status=status_code)


def send_error(message='Internal Server Error', status_code=500):
    return Response({'success': False, 'data': None, 'message': message}, status=status_code)


def _get_company_id(request):
    """Helper to extract active tenant companyId from request header or user profile."""
    company_id = request.headers.get('X-Company-ID') or request.headers.get('X-Company-Id')
    if not company_id and hasattr(request, 'user') and request.user.is_authenticated:
        company_id = getattr(request.user, 'companyid_id', None) or getattr(request.user, 'companyid', None)
    return str(company_id) if company_id else None


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def auth_login(request):
    """
    Authenticate user with email and password with schema-per-tenant physical isolation.
    Protected by LoginRateThrottle against credential stuffing attacks.
    """
    from api.tenant_manager import get_tenant_schema_for_user, set_tenant_search_path, reset_search_path
    from core.models import Company as CoreCompany

    email = request.data.get('email')
    password = request.data.get('password')
    if not email:
        return send_error('Email is required', 400)
    if not password:
        return send_error('Password is required', 400)

    email = str(email).strip().lower()
    schema_name, company_id, role, mapping_active = get_tenant_schema_for_user(email)

    if not schema_name:
        return send_error('Invalid credentials', 401)

    # Enforce company subscription / active status and expiry period
    if company_id:
        try:
            reset_search_path()
            company = CoreCompany.objects.filter(id=company_id).first()
            if company:
                if not company.active:
                    return send_error('Your organization account is suspended, in approval, or inactive. Please contact administration.', 403)
                if company.valid_until and timezone.now() > company.valid_until:
                    exp_str = company.valid_until.strftime('%d-%b-%Y at %I:%M %p')
                    return send_error(f'Your company subscription expired on {exp_str}. Access has been blocked from backend. Please contact administration to renew.', 403)
        except Exception:
            pass

    try:
        # Switch search_path to the company's dedicated schema
        set_tenant_search_path(schema_name)

        user = User.objects.get(email=email)
        if not user.active:
            return send_error('Your account is in approval or has been deactivated. Please contact your company administrator.', 403)

        is_valid = False
        try:
            hashed = user.hashedpassword.encode('utf-8')
            is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed)
        except Exception:
            pass

        if not is_valid:
            return send_error('Invalid credentials', 401)

        comp_id = user.companyid_id if hasattr(user, 'companyid') else user.companyid or company_id
        access_token, refresh_token = generate_tokens(user.id, user.email, user.role, comp_id, schema_name=schema_name)
        user_data = UserSerializer(user).data

        if user.role == 'SUPERADMIN':
            wh_qs = Warehouse.objects.filter(active=True)
            if comp_id:
                wh_qs = wh_qs.filter(companyid_id=comp_id)
            warehouses = wh_qs
        else:
            uwa = Userwarehouseaccess.objects.filter(userid_id=user.id)
            wh_ids = uwa.values_list('warehouseid', flat=True)
            wh_qs = Warehouse.objects.filter(id__in=wh_ids, active=True)
            if comp_id:
                wh_qs = wh_qs.filter(companyid_id=comp_id)
            warehouses = wh_qs

        user_data['authorizedWarehouses'] = [{'id': str(w.id), 'name': w.name} for w in warehouses]
        user_data['schemaName'] = schema_name
        return send_success({'user': user_data, 'accessToken': access_token, 'refreshToken': refresh_token}, 'Success login. Session active.')
    except User.DoesNotExist:
        return send_error('Invalid credentials', 401)
    finally:
        reset_search_path()


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_create_company(request):
    """
    Onboard a brand-new Company / Organization (Tenant) with a physically isolated PostgreSQL schema.
    Creates:
    1. Company entity in public.Company with unique ID, name, SKU prefix, and schemaName
    2. Provisions dedicated PostgreSQL schema with complete independent set of tables
    3. Primary Warehouse in the dedicated tenant schema
    4. Superadmin User in the dedicated tenant schema
    5. Registers account in public.TenantUserMapping for secure routing
    6. Returns JWT tokens for immediate seamless login
    """
    import json
    from core.models import Company as CoreCompany, TenantUserMapping
    from api.tenant_manager import (
        generate_tenant_schema_name, provision_tenant_schema, 
        set_tenant_search_path, reset_search_path, seed_tenant_default_master_data
    )

    company_name = request.data.get('companyName') or request.data.get('company_name')
    if not company_name or not str(company_name).strip():
        return send_error('Company name is required', 400)
    company_name = str(company_name).strip()

    admin_email = request.data.get('adminEmail') or request.data.get('email')
    if not admin_email or not str(admin_email).strip():
        return send_error('Admin email is required', 400)
    admin_email = str(admin_email).strip().lower()

    admin_password = request.data.get('adminPassword') or request.data.get('password')
    if not admin_password or len(str(admin_password)) < 6:
        return send_error('Password must be at least 6 characters long', 400)

    admin_name = request.data.get('adminName') or request.data.get('name') or f"{company_name} Admin"
    admin_name = str(admin_name).strip()

    sku_prefix = request.data.get('skuPrefix') or request.data.get('sku_prefix')
    if not sku_prefix or not str(sku_prefix).strip():
        sku_prefix = ''.join(c for c in company_name.upper() if c.isalnum())[:4] or 'CO'
    else:
        sku_prefix = str(sku_prefix).strip().upper()

    warehouse_name = request.data.get('warehouseName') or request.data.get('warehouse_name') or 'MAIN WAREHOUSE'
    warehouse_name = str(warehouse_name).strip().upper()

    stock_method = request.data.get('stockMethod') or request.data.get('stock_method') or 'FIFO'
    phone = str(request.data.get('phone', '')).strip()
    gst = str(request.data.get('gst', '')).strip()
    address = str(request.data.get('address', '')).strip()

    # 1. Ensure email is not already taken across platform
    reset_search_path()
    if TenantUserMapping.objects.filter(email=admin_email).exists() or User.objects.filter(email=admin_email).exists():
        return send_error('An account with this email address already exists. Please sign in or use a different email.', 400)

    # 2. Ensure company name is unique
    if CoreCompany.objects.filter(name__iexact=company_name).exists():
        return send_error(f"A company with the name '{company_name}' already exists. Please choose a unique company name.", 400)

    try:
        company_id = f"cmp_{uuid.uuid4().hex[:16]}"
        schema_name = generate_tenant_schema_name(company_name, company_id)

        # 3. Provision dedicated schema with independent tables
        prov = provision_tenant_schema(schema_name)
        if not prov.get('success'):
            return send_error(f"Failed to provision tenant database workspace: {prov.get('message', 'Unknown error')}", 500)

        # 4. Create company record in public registry
        reset_search_path()
        settings_dict = {
            'company_name': company_name,
            'company_phone': phone,
            'company_gst': gst,
            'company_address': address,
        }

        from datetime import timedelta
        now = timezone.now()
        company = CoreCompany.objects.create(
            id=company_id,
            name=company_name,
            skuprefix=sku_prefix,
            stockmethod=stock_method,
            schemaname=schema_name,
            active=True,
            activated_at=now,
            valid_until=now + timedelta(days=30),
            settings_json=json.dumps(settings_dict)
        )

        # 5. Populate tenant schema with initial isolated warehouse and superadmin
        set_tenant_search_path(schema_name)

        next_wh_id = (Warehouse.objects.order_by('-id').values_list('id', flat=True).first() or 0) + 1
        warehouse = Warehouse.objects.create(
            id=next_wh_id,
            companyid_id=company.id,
            name=warehouse_name,
            location=f"{company_name} Primary Facility",
            active=True
        )

        hashed_pw = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        user_id = f"usr_{uuid.uuid4().hex[:16]}"
        user = User.objects.create(
            id=user_id,
            email=admin_email,
            name=admin_name,
            hashedpassword=hashed_pw,
            role='SUPERADMIN',
            companyid_id=company.id,
            active=True
        )

        Userwarehouseaccess.objects.create(
            userid=user,
            warehouseid=warehouse
        )

        # 5.5 Seed default master data (Units, Categories, Brand)
        seed_tenant_default_master_data(schema_name, company)

        # 6. Register in public TenantUserMapping
        reset_search_path()
        TenantUserMapping.objects.create(
            email=admin_email,
            companyid=company.id,
            schemaname=schema_name,
            role='SUPERADMIN',
            active=True
        )

        # 7. Generate authorized JWT tokens with schema_name
        access_token, refresh_token = generate_tokens(user.id, user.email, user.role, company.id, schema_name=schema_name)
        user_data = UserSerializer(user).data
        user_data['authorizedWarehouses'] = [{'id': str(warehouse.id), 'name': warehouse.name}]
        user_data['companyName'] = company.name
        user_data['schemaName'] = schema_name

        return send_success({
            'user': user_data,
            'company': {
                'id': company.id,
                'name': company.name,
                'skuPrefix': company.skuprefix,
                'stockMethod': company.stockmethod,
                'schemaName': schema_name,
                'activatedAt': company.activated_at.isoformat() if company.activated_at else None,
                'validUntil': company.valid_until.isoformat() if company.valid_until else None,
            },
            'accessToken': access_token,
            'refreshToken': refresh_token
        }, f"Organization '{company.name}' created successfully with dedicated schema-isolated database workspace.", 201)

    except Exception as e:
        reset_search_path()
        return send_error(f"Failed to create company: {str(e)}", 500)


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_register(request):
    """Public registration for staff members with privilege escalation prevention."""
    from api.tenant_manager import set_tenant_search_path, reset_search_path
    from core.models import Company as CoreCompany

    email = request.data.get('email')
    password = request.data.get('password')
    name = request.data.get('name')
    role = request.data.get('role', 'SALES')
    # Prevent unauthorized privilege escalation via public registration
    if role in ('SUPERADMIN', 'ADMIN'):
        role = 'SALES'
    company_id = request.data.get('companyId')
    if not email or not password:
        return send_error('Email and password are required', 400)

    try:
        schema_name = 'public'
        if company_id:
            company = CoreCompany.objects.filter(id=company_id).first()
            if company and company.schemaname:
                schema_name = company.schemaname

        set_tenant_search_path(schema_name)

        if User.objects.filter(email=email).exists():
            return send_error('User already exists', 400)
        hashed_password = password
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        except Exception:
            pass
        user_id = 'c' + uuid.uuid4().hex[:23]
        user = User.objects.create(id=user_id, email=email, name=name, hashedpassword=hashed_password, role=role, active=True, companyid_id=company_id)
        access_token, refresh_token = generate_tokens(user.id, user.email, user.role, company_id, schema_name=schema_name)
        user_data = UserSerializer(user).data
        return send_success({'user': user_data, 'accessToken': access_token, 'refreshToken': refresh_token}, 'User registered and signed in', 201)
    finally:
        reset_search_path()


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_refresh(request):
    """Exchange valid refresh token for fresh access token with tenant schema routing and subscription enforcement."""
    from api.tenant_manager import set_tenant_search_path, reset_search_path
    from core.models import Company as CoreCompany

    refresh_token = request.data.get('refreshToken') or request.data.get('refresh_token')
    if not refresh_token:
        return send_error('Refresh token is required', 400)
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('userId')
        schema_name = payload.get('schemaName') or 'public'

        # Switch search_path to the tenant schema
        set_tenant_search_path(schema_name)

        user = User.objects.get(id=user_id)
        if not user.active:
            return send_error('Account is disabled', 403)

        company_id = user.companyid_id if hasattr(user, 'companyid') else user.companyid

        # Enforce subscription active and expiry status
        if company_id:
            try:
                reset_search_path()
                company = CoreCompany.objects.filter(id=company_id).first()
                if company:
                    if not company.active:
                        return send_error('Your company subscription is suspended or inactive. Please contact platform support.', 403)
                    if company.valid_until and timezone.now() > company.valid_until:
                        exp_str = company.valid_until.strftime('%d-%b-%Y at %I:%M %p')
                        return send_error(f'Your company subscription expired on {exp_str}. Access has been blocked from backend. Please contact administration to renew.', 403)
            except Exception:
                pass
            finally:
                set_tenant_search_path(schema_name)

        access_token, new_refresh_token = generate_tokens(user.id, user.email, user.role, company_id, schema_name=schema_name)
        return send_success({
            'accessToken': access_token,
            'refreshToken': new_refresh_token
        }, 'Token refreshed successfully')
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
        return send_error('Invalid or expired refresh token', 401)
    finally:
        reset_search_path()


@api_view(['GET', 'PUT', 'PATCH'])
def auth_permissions(request, perm_id=None):
    """Retrieve permissible system roles or update permission status."""
    if request.method in ['PUT', 'PATCH']:
        is_enabled = request.data.get('isEnabled', True)
        return send_success({'id': perm_id, 'isEnabled': is_enabled}, 'Permission updated successfully')
    roles = ['SALES', 'ADMIN', 'HR', 'INVENTORY', 'PRODUCTION', 'SUPERADMIN']
    return send_success(roles, 'Roles/Permissions retrieved successfully')


class UserViewSet(viewsets.ModelViewSet):
    """Full lifecycle management for company staff and portal accounts."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        company_id = _get_company_id(self.request)
        if company_id:
            return User.objects.filter(companyid_id=company_id)
        return User.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = UserSerializer(queryset, many=True)
        return send_success(serializer.data, 'Users retrieved successfully')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserSerializer(instance)
        return send_success(serializer.data, 'User retrieved successfully')

    def create(self, request, *args, **kwargs):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ('SUPERADMIN', 'ADMIN'):
            return send_error('Unauthorized. Only Admins can create user accounts.', 403)
        data = request.data
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        role = data.get('role', 'SALES')
        active = data.get('active', True)
        company_id = _get_company_id(request) or data.get('companyId')
        if not email or not password:
            return send_error('Email and password are required', 400)
        if User.objects.filter(email=email).exists():
            return send_error('User already exists', 400)
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        except Exception as hash_err:
            return send_error(f'Password hashing failed: {str(hash_err)}', 500)
        user_id = 'c' + uuid.uuid4().hex[:23]
        now = timezone.now()
        user = User.objects.create(
            id=user_id, email=email, name=name, hashedpassword=hashed_password,
            role=role, active=active, territory=data.get('territory', ''),
            companyid_id=company_id, createdat=now, updatedat=now
        )
        # Synchronize with TenantUserMapping ONLY if SUPERADMIN main account
        if user.role == 'SUPERADMIN':
            try:
                from core.models import TenantUserMapping
                schema_name = getattr(request.user, 'tenant_schema', None) or 'public'
                TenantUserMapping.objects.update_or_create(
                    email=user.email,
                    defaults={
                        'companyid': company_id or 'cmpwp1h8v0000sscdshw8thbl',
                        'schemaname': schema_name,
                        'role': user.role,
                        'active': user.active
                    }
                )
            except Exception:
                pass

        serializer = UserSerializer(user)
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='User Management', action=f"Created Staff User {user.name or email} ({user.email} - Role: {user.role})", details=data)
        except Exception:
            pass
        return send_success(serializer.data, 'User created successfully', 201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_role = (getattr(request.user, 'role', '') or '').upper()
        is_self = str(getattr(request.user, 'id', '')) == str(instance.id)
        if user_role not in ('SUPERADMIN', 'ADMIN') and not is_self:
            return send_error('Unauthorized. Only Admins can modify other user accounts.', 403)
        partial = kwargs.pop('partial', True)

        # Non-admins can only update profile fields like name, not permissions or roles
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if user_role not in ('SUPERADMIN', 'ADMIN'):
            data.pop('role', None)
            data.pop('active', None)
            data.pop('companyid', None)
            data.pop('companyId', None)
            data.pop('monthlytarget', None)
            data.pop('monthlyTarget', None)
            data.pop('territory', None)
            data.pop('hashedpassword', None)

        serializer = UserSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Synchronize updated name with linked Employee Master (Labour) profile
        try:
            from api.models import Labour
            Labour.objects.filter(user_id=instance.id).update(name=instance.name)
        except Exception:
            pass

        try:
            from core.models import TenantUserMapping
            if instance.role == 'SUPERADMIN':
                schema_name = getattr(request.user, 'tenant_schema', None) or 'public'
                TenantUserMapping.objects.update_or_create(
                    email=instance.email,
                    defaults={
                        'companyid': getattr(instance, 'companyid_id', None) or getattr(instance, 'companyid', 'cmpwp1h8v0000sscdshw8thbl'),
                        'schemaname': schema_name,
                        'role': instance.role,
                        'active': instance.active
                    }
                )
            else:
                TenantUserMapping.objects.filter(email=instance.email).delete()
        except Exception:
            pass
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='User Management', action=f"Updated User {instance.name or instance.email} (Role: {instance.role})", details=request.data)
        except Exception:
            pass
        return send_success(serializer.data, 'User profile updated successfully')

    @action(detail=False, methods=['get'], url_path='profile-details')
    def profile_details(self, request):
        """
        Returns full profile information for the authenticated user,
        including all Employee Master details (KYC, bank, department, etc.) entered by company.
        """
        user = request.user
        if not user or not user.is_authenticated:
            return send_error('Authentication required', 401)

        user_data = UserSerializer(user).data
        company_id = _get_company_id(request)

        from api.models import Labour
        employee = Labour.objects.filter(user_id=user.id).first()
        if not employee and user.name:
            employee = Labour.objects.filter(name__iexact=user.name).first()
        if not employee and user.email:
            employee = Labour.objects.filter(contactinfo__icontains=user.email).first()

        emp_data = None
        if employee:
            def _get_full_url(file_field):
                if not file_field:
                    return None
                val_str = str(file_field)
                is_ssl = request.is_secure() or request.headers.get('x-forwarded-proto') == 'https'
                if val_str.startswith('http://') or val_str.startswith('https://'):
                    if is_ssl and val_str.startswith('http://') and not ('localhost' in val_str or '127.0.0.1' in val_str):
                        return val_str.replace('http://', 'https://', 1)
                    return val_str
                try:
                    url = file_field.url if hasattr(file_field, 'url') else val_str
                    if url.startswith('http://') or url.startswith('https://'):
                        if is_ssl and url.startswith('http://') and not ('localhost' in url or '127.0.0.1' in url):
                            return url.replace('http://', 'https://', 1)
                        return url
                    abs_url = request.build_absolute_uri(url)
                    if is_ssl and abs_url.startswith('http://') and not ('localhost' in abs_url or '127.0.0.1' in abs_url):
                        abs_url = abs_url.replace('http://', 'https://', 1)
                    return abs_url
                except Exception:
                    if val_str.startswith('http://') or val_str.startswith('https://'):
                        if is_ssl and val_str.startswith('http://') and not ('localhost' in val_str or '127.0.0.1' in val_str):
                            return val_str.replace('http://', 'https://', 1)
                        return val_str
                    return None

            if employee.employee_photo:
                user_data['employeePhoto'] = _get_full_url(employee.employee_photo)

            reports_to_name = None
            if employee.reports_to_id:
                mgr = Labour.objects.filter(id=employee.reports_to_id).first()
                if mgr:
                    reports_to_name = mgr.name

            emp_data = {
                'id': employee.id,
                'name': employee.name,
                'employee_id': employee.employee_id,
                'employee_type': employee.employee_type,
                'department': employee.department,
                'designation': employee.designation,
                'doj': employee.doj.isoformat() if employee.doj else None,
                'contactinfo': employee.contactinfo,
                'reports_to': employee.reports_to_id,
                'reports_to_name': reports_to_name,
                'base_salary_monthly': employee.base_salary_monthly,
                'dailywage': employee.dailywage,
                'overtime_hourly_rate': employee.overtime_hourly_rate,
                'late_deduction_rate': employee.late_deduction_rate,
                'bike_allowance_per_km': employee.bike_allowance_per_km,
                'car_allowance_per_km': employee.car_allowance_per_km,
                'sales_incentive_pct': employee.sales_incentive_pct,
                'bag_incentive_rate': employee.bag_incentive_rate,
                'is_ot_eligible': employee.is_ot_eligible,
                'is_late_deduction_eligible': employee.is_late_deduction_eligible,
                'is_km_eligible': employee.is_km_eligible,
                'is_bag_eligible': employee.is_bag_eligible,
                'aadhar_number': employee.aadhar_number,
                'pan_number': employee.pan_number,
                'bank_name': employee.bank_name,
                'bank_account_number': employee.bank_account_number,
                'bank_ifsc': employee.bank_ifsc,
                'employee_photo': _get_full_url(employee.employee_photo),
                'aadhar_photo': _get_full_url(employee.aadhar_photo),
                'pan_photo': _get_full_url(employee.pan_photo),
                'bank_proof_photo': _get_full_url(employee.bank_proof_photo),
            }

        return send_success({
            'user': user_data,
            'employee': emp_data
        }, 'Profile details retrieved successfully')

    def destroy(self, request, *args, **kwargs):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role != 'SUPERADMIN':
            return send_error('Unauthorized. Only Superadmin can delete user accounts.', 403)
        instance = self.get_object()
        try:
            from core.models import TenantUserMapping
            TenantUserMapping.objects.filter(email=instance.email).delete()
        except Exception:
            pass
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='User Management', action=f"Deleted Staff User {instance.name or instance.email}")
        except Exception:
            pass
        self.perform_destroy(instance)
        return send_success(None, 'User deleted successfully')

    @action(detail=True, methods=['put'], url_path='password')
    def reset_password(self, request, pk=None):
        instance = self.get_object()
        user_role = (getattr(request.user, 'role', '') or '').upper()
        is_self = getattr(request.user, 'id', None) == str(instance.id)
        if user_role not in ('SUPERADMIN', 'ADMIN') and not is_self:
            return send_error('Unauthorized. You can only change your own password.', 403)

        current_password = request.data.get('current_password') or request.data.get('currentPassword')
        password = request.data.get('password') or request.data.get('new_password') or request.data.get('newPassword')
        if not password:
            return send_error('Password is required', 400)
        if len(str(password)) < 6:
            return send_error('Password must be at least 6 characters long', 400)

        # If regular employee changing own password and current_password provided, verify it
        if is_self and current_password:
            try:
                hashed = instance.hashedpassword.encode('utf-8')
                if not bcrypt.checkpw(current_password.encode('utf-8'), hashed):
                    return send_error('Current password is incorrect', 400)
            except Exception:
                pass

        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        except Exception as hash_err:
            return send_error(f'Password hashing failed: {str(hash_err)}', 500)
        instance.hashedpassword = hashed_password
        instance.save()
        return send_success(None, 'Password updated successfully')

    @action(detail=True, methods=['put'], url_path='target')
    def update_target(self, request, pk=None):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ('SUPERADMIN', 'ADMIN'):
            return send_error('Unauthorized. Only Admins can modify sales targets.', 403)
        instance = self.get_object()
        target = request.data.get('target')
        if target is None:
            return send_error('Target is required', 400)
        instance.monthlytarget = target
        instance.save()
        return send_success(None, 'Target updated successfully')


@api_view(['GET', 'POST'])
def user_assignments(request, pk):
    """Retrieve or persist granular user warehouse, product, and brand access permissions."""
    try:
        user = User.objects.get(id=pk)
    except User.DoesNotExist:
        return send_error('User not found', 404)
    if request.method == 'GET':
        brand_ids = list(Userproductaccess.objects.filter(userid=user, brandid__isnull=False).values_list('brandid_id', flat=True))
        category_ids = list(Userproductaccess.objects.filter(userid=user, categoryid__isnull=False).values_list('categoryid_id', flat=True))
        product_ids = list(Userproductaccess.objects.filter(userid=user, productid__isnull=False).values_list('productid_id', flat=True))
        warehouse_ids = list(Userwarehouseaccess.objects.filter(userid=user).values_list('warehouseid_id', flat=True))
        data = {'brands': brand_ids, 'categories': category_ids, 'products': product_ids, 'warehouses': warehouse_ids}
        return send_success(data, 'User assignments retrieved successfully')
    elif request.method == 'POST':
        data = request.data
        req_brand_ids = data.get('brands', [])
        req_category_ids = data.get('categories', [])
        req_product_ids = data.get('products', [])
        req_warehouse_ids = data.get('warehouses', [])
        Userwarehouseaccess.objects.filter(userid=user).delete()
        for w_id in req_warehouse_ids:
            if w_id:
                Userwarehouseaccess.objects.create(userid=user, warehouseid_id=w_id)
        with transaction.atomic():
            Userproductaccess.objects.filter(userid=user).delete()
            for b_id in req_brand_ids:
                if b_id:
                    Userproductaccess.objects.create(userid=user, brandid_id=b_id)
            for c_id in req_category_ids:
                if c_id:
                    Userproductaccess.objects.create(userid=user, categoryid_id=c_id)
            for p_id in req_product_ids:
                if p_id:
                    Userproductaccess.objects.create(userid=user, productid_id=p_id)
        return send_success(None, 'User assignments updated successfully')


def get_allowed_product_ids_for_user(user_id):
    """Resolve set of allowed product IDs based on user's category, brand, and item permissions."""
    assignments = Userproductaccess.objects.filter(userid_id=user_id)
    if not assignments.exists():
        return None
    b_ids = list(assignments.filter(brandid__isnull=False).values_list('brandid_id', flat=True))
    c_ids = list(assignments.filter(categoryid__isnull=False).values_list('categoryid_id', flat=True))
    p_ids = list(assignments.filter(productid__isnull=False).values_list('productid_id', flat=True))
    all_cat_ids = set()
    if c_ids:
        all_cats = list(Category.objects.all())
        parent_map = {}
        for cat in all_cats:
            if cat.parentid_id:
                parent_map.setdefault(cat.parentid_id, []).append(cat.id)
        all_cat_ids.update(c_ids)
        queue = list(c_ids)
        while queue:
            curr = queue.pop(0)
            for child in parent_map.get(curr, []):
                if child not in all_cat_ids:
                    all_cat_ids.add(child)
                    queue.append(child)
    q_expr = Q()
    has_filter = False
    if b_ids and all_cat_ids:
        q_expr |= Q(brandid_id__in=b_ids, categoryid_id__in=all_cat_ids)
        has_filter = True
    elif b_ids:
        q_expr |= Q(brandid_id__in=b_ids)
        has_filter = True
    elif all_cat_ids:
        q_expr |= Q(categoryid_id__in=all_cat_ids)
        has_filter = True
    if p_ids:
        q_expr |= Q(id__in=p_ids)
        has_filter = True
    if not has_filter:
        return []
    return list(Product.objects.filter(q_expr).values_list('id', flat=True))
