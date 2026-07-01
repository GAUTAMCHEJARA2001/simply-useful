from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .views import send_success, send_error
from .models import PushSubscription
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe(request):
    """
    Save the push subscription for the logged-in user.
    """
    subscription = request.data.get('subscription')
    if not subscription:
        return send_error('Subscription data is required.', 400)
        
    endpoint = subscription.get('endpoint')
    keys = subscription.get('keys', {})
    p256dh = keys.get('p256dh')
    auth = keys.get('auth')
    
    if not endpoint or not p256dh or not auth:
        return send_error('Invalid subscription format.', 400)
        
    sub, created = PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={
            'user': request.user,
            'p256dh': p256dh,
            'auth': auth
        }
    )
    
    return send_success(None, 'Subscribed to push notifications successfully.', 201 if created else 200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unsubscribe(request):
    """
    Remove a push subscription.
    """
    endpoint = request.data.get('endpoint')
    if not endpoint:
        return send_error('Endpoint is required to unsubscribe.', 400)
        
        deleted, _ = PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
    if deleted:
        return send_success(None, 'Unsubscribed successfully.', 200)
    else:
        return send_error('Subscription not found.', 404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vapid_public_key(request):
    """
    Return the VAPID public key.
    """
    return send_success({'publicKey': getattr(settings, 'VAPID_PUBLIC_KEY', '')}, 'VAPID public key fetched')
