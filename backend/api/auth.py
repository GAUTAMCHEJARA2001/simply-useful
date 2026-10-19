import jwt
import time
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from core.models import User, Company

JWT_SECRET = getattr(settings, 'JWT_SECRET', 'simply-useful-secret-key-123-super-secure-key-2026')

class JWTUser:
    def __init__(self, user_id, email, role, company_id, name=""):
        self.id = user_id
        self.userId = user_id
        self.email = email
        self.role = role
        self.companyId = company_id
        self.name = name
        self.is_authenticated = True

    @property
    def pk(self):
        return self.id

    @property
    def is_anonymous(self):
        return False

    @property
    def is_staff(self):
        return self.role in ['ADMIN', 'SUPERADMIN']

def generate_tokens(user_id, email, role, company_id=None, schema_name='public'):
    now = int(time.time())
    access_payload = {
        'userId': user_id,
        'email': email,
        'role': role,
        'companyId': company_id,
        'schemaName': schema_name or 'public',
        'exp': now + 7 * 24 * 60 * 60
    }
    
    refresh_payload = {
        'userId': user_id,
        'schemaName': schema_name or 'public',
        'exp': now + 7 * 24 * 60 * 60
    }
    
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm='HS256')
    
    return access_token, refresh_token

class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate_header(self, request):
        return 'Bearer'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
            
        if not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
            
        user_id = payload.get('userId')
        email = payload.get('email')
        role = payload.get('role')
        company_id = payload.get('companyId')
        schema_name = payload.get('schemaName') or 'public'

        # Switch PostgreSQL search path to the tenant schema for physical table isolation
        from api.tenant_manager import set_tenant_search_path
        set_tenant_search_path(schema_name)
        
        # Check company active and valid_until expiration in the public database
        try:
            from django.utils import timezone
            reset_comp = Company.objects.filter(id=company_id).first()
            if reset_comp:
                if not reset_comp.active:
                    raise exceptions.AuthenticationFailed('Your company account has been suspended by the platform administrator.')
                if reset_comp.valid_until and timezone.now() > reset_comp.valid_until:
                    exp_date = reset_comp.valid_until.strftime('%d-%b-%Y')
                    raise exceptions.AuthenticationFailed(f"Your company subscription expired on {exp_date}. Access has been blocked until renewed.")
        except exceptions.AuthenticationFailed:
            raise
        except Exception:
            pass
        
        try:
            # Query the user from the tenant-isolated User table
            user_model = User.objects.get(id=user_id)
            if not user_model.active:
                raise exceptions.AuthenticationFailed('User is inactive')
                
            user_model.tenant_schema = schema_name
            user_model.company = reset_comp
            # Return the authentic Django User instance so ORM foreign-key assignments succeed everywhere
            return (user_model, token)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found')
