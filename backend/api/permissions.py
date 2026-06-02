from rest_framework import permissions

class IsLeadOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to allow Sales officers to only view/modify their own leads,
    while Admins, Managers, and HR have full organization scope.
    """
    def has_object_permission(self, request, view, obj):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role in ('SUPERADMIN', 'ADMIN', 'MANAGER', 'HR'):
            return True
        return obj.assigned_to_id == request.user.userId
