import json
from django.conf import settings
from .models import PushSubscription

def send_web_push(user, title, body, data=None):
    """
    Send a web push notification to all devices for a given user.
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return False
        
    vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
    vapid_admin_email = getattr(settings, 'VAPID_ADMIN_EMAIL', 'mailto:admin@example.com')
    
    if not vapid_private_key:
        return False
        
    payload = json.dumps({
        'title': title,
        'body': body,
        'data': data or {},
    })
    
    subscriptions = PushSubscription.objects.filter(user=user)
    success = False
    
    for sub in subscriptions:
        sub_info = {
            'endpoint': sub.endpoint,
            'keys': {
                'p256dh': sub.p256dh,
                'auth': sub.auth
            }
        }
        
        try:
            webpush(
                subscription_info=sub_info,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": vapid_admin_email}
            )
            success = True
        except WebPushException as ex:
            # If subscription is expired or invalid, delete it
            if ex.response and ex.response.status_code in [404, 410]:
                sub.delete()
            else:
                print(f"Web Push Error: {repr(ex)}")
                
    return success

def broadcast_push_to_role(role, title, body, data=None):
    """
    Send a push notification to all users with a specific role.
    """
    from core.models import User
    users = User.objects.filter(role=role, is_active=True)
    for u in users:
        send_web_push(u, title, body, data)
