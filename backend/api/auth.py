import jwt
import time
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from api.models import User

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

def generate_tokens(user_id, email, role, company_id=None):
    # Short-lived access token: 15 minutes (or 7 days for dev convenience)
    now = int(time.time())
    access_payload = {
        'userId': user_id,
        'email': email,
        'role': role,
        'companyId': company_id,
        'exp': now + 7 * 24 * 60 * 60  # Make it long lived for developer convenience (7d) like express fallback
    }
    
    refresh_payload = {
        'userId': user_id,
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
        
        # If it's a mock admin login
        if user_id == 'superadmin-1' or email in ['admin@alpha.com', 'admin@simplyuseful.com']:
            jwt_user = JWTUser(
                user_id='superadmin-1',
                email=email or 'admin@simplyuseful.com',
                role='SUPERADMIN',
                company_id=company_id or 'cmo75yliq0000wesurjpett1n',
                name='System Admin'
            )
            return (jwt_user, token)
            
        try:
            # Query the user from the sqlite database
            user_model = User.objects.get(id=user_id)
            if not user_model.active:
                raise exceptions.AuthenticationFailed('User is inactive')
                
            jwt_user = JWTUser(
                user_id=user_model.id,
                email=user_model.email,
                role=user_model.role,
                company_id=user_model.companyid_id if hasattr(user_model, 'companyid') else user_model.companyid,
                name=user_model.name or ""
            )
            return (jwt_user, token)
        except User.DoesNotExist:
            # Recreate dynamic user fallback if user details were in payload
            if email and role:
                jwt_user = JWTUser(
                    user_id=user_id,
                    email=email,
                    role=role,
                    company_id=company_id
                )
                return (jwt_user, token)
            raise exceptions.AuthenticationFailed('User not found')
