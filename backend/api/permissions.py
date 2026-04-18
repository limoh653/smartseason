

from rest_framework.permissions import BasePermission


def get_role(user):
    """to retrieve user type from the user profile"""
    try:
        return user.profile.role
    except Exception:
        return None


class IsAdmin(BasePermission):
    """allows only admin to access"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'admin'


class IsAgent(BasePermission):
    """Allows only field agent to access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and get_role(request.user) == 'agent'


class IsAdminOrAssignedAgent(BasePermission):
    """
   admins can aways assess but agents acess only the assigned field.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        role = get_role(request.user)
        if role == 'admin':
            return True
        if role == 'agent':
            return obj.assigned_to == request.user
        return False