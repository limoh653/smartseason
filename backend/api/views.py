"""
API Views for SmartSeason.

CookieJWTAuthentication — reads JWT from httpOnly cookie instead of header
AuthView                — login: sets httpOnly cookies for access + refresh tokens
LogoutView              — clears the auth cookies server-side
MeView                  — returns current user info (reads from cookie)
AgentListView           — admin fetches list of all agents
FieldListCreateView     — GET all fields / POST create new field
FieldDetailView         — GET / PUT / DELETE a single field
FieldUpdateView         — POST a stage update + notes
DashboardStatsView      — aggregated summary stats
"""

from django.contrib.auth.models import User
from django.utils import timezone
from django.conf import settings as django_settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import Field, FieldUpdate, UserProfile
from .serializers import (
    FieldSerializer, FieldListSerializer,
    FieldUpdateSerializer, UserSerializer, AgentSerializer
)
from .permissions import IsAdmin, IsAdminOrAssignedAgent


# ── Cookie JWT Auth ────────────────────────────────────────────────────────────

class CookieJWTAuthentication(JWTAuthentication):
    """
    Overrides default header-based JWT auth to read the access token
    from the httpOnly 'access_token' cookie instead.
    Falls back gracefully to None if cookie is missing or invalid.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None  # No cookie — treat as unauthenticated

        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError):
            return None  # Expired or tampered token — treat as unauthenticated

        return self.get_user(validated_token), validated_token


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_cookie_settings():
    """
    Returns cookie security settings based on environment.
    Production (DEBUG=False): secure=True, samesite=None  — required for HTTPS cross-domain
    Development (DEBUG=True):  secure=False, samesite=Lax — works on localhost
    """
    is_production = not django_settings.DEBUG
    return {
        'secure':   is_production,
        'samesite': 'None' if is_production else 'Lax',
    }


# ── Auth ───────────────────────────────────────────────────────────────────────

class AuthView(APIView):
    """
    POST /api/auth/login/
    Authenticates username + password and sets two httpOnly cookies:
      - access_token  (8 hours)
      - refresh_token (7 days)
    Returns only the user object in the response body — no tokens exposed.
    """
    permission_classes = []  # Public endpoint

    def post(self, request):
        from django.contrib.auth import authenticate

        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {'detail': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Ensure every user has a profile — create with agent role if missing
        UserProfile.objects.get_or_create(user=user, defaults={'role': 'agent'})

        # Generate JWT tokens
        refresh       = RefreshToken.for_user(user)
        access_token  = str(refresh.access_token)
        refresh_token = str(refresh)

        cookie = get_cookie_settings()

        response = Response({'user': UserSerializer(user).data})

        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,           # JS cannot read this cookie
            secure=cookie['secure'],
            samesite=cookie['samesite'],
            max_age=60 * 60 * 8,     # 8 hours in seconds
            path='/',                # available on all API paths
        )
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=cookie['secure'],
            samesite=cookie['samesite'],
            max_age=60 * 60 * 24 * 7,  # 7 days in seconds
            path='/',
        )

        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Deletes both auth cookies server-side.
    Must use the same secure/samesite values as when the cookies were set,
    otherwise the browser won't match and won't delete them.
    """
    permission_classes = []

    def post(self, request):
        cookie = get_cookie_settings()

        response = Response({'detail': 'Logged out successfully.'})
        response.delete_cookie('access_token',  path='/', samesite=cookie['samesite'])
        response.delete_cookie('refresh_token', path='/', samesite=cookie['samesite'])
        return response


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns info about the currently authenticated user.
    Auth is handled automatically via the httpOnly cookie.
    Returns 401 if cookie is missing or expired — this is expected on page load
    when the user is not logged in (handled gracefully in AuthContext).
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ── Agents ─────────────────────────────────────────────────────────────────────

class AgentListView(generics.ListAPIView):
    """
    GET /api/agents/
    Admin only. Returns all users with role=agent.
    Used to populate the assignment dropdown when creating/editing a field.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = AgentSerializer
    queryset = User.objects.filter(profile__role='agent').select_related('profile')


# ── Fields ─────────────────────────────────────────────────────────────────────

class FieldListCreateView(APIView):
    """
    GET  /api/fields/ — returns all fields for admin, assigned fields for agent
    POST /api/fields/ — creates a new field (admin only)
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)

        if role == 'admin':
            fields = Field.objects.all().select_related('assigned_to', 'assigned_to__profile')
        else:
            # Agents only see fields assigned to them
            fields = Field.objects.filter(assigned_to=request.user).select_related('assigned_to')

        return Response(FieldListSerializer(fields, many=True).data)

    def post(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if role != 'admin':
            return Response(
                {'detail': 'Only admins can create fields.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FieldDetailView(APIView):
    """
    GET    /api/fields/<id>/ — field detail + recent updates
    PUT    /api/fields/<id>/ — update field metadata (admin only)
    DELETE /api/fields/<id>/ — delete field (admin only)
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdminOrAssignedAgent]

    def get_object(self, pk, request):
        try:
            field = Field.objects.select_related('assigned_to') \
                                 .prefetch_related('updates__agent') \
                                 .get(pk=pk)
            self.check_object_permissions(request, field)
            return field
        except Field.DoesNotExist:
            return None

    def get(self, request, pk):
        field = self.get_object(pk, request)
        if not field:
            return Response({'detail': 'Field not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FieldSerializer(field).data)

    def put(self, request, pk):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if role != 'admin':
            return Response({'detail': 'Only admins can edit fields.'}, status=status.HTTP_403_FORBIDDEN)

        field = self.get_object(pk, request)
        if not field:
            return Response({'detail': 'Field not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = FieldSerializer(field, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if role != 'admin':
            return Response({'detail': 'Only admins can delete fields.'}, status=status.HTTP_403_FORBIDDEN)

        field = self.get_object(pk, request)
        if not field:
            return Response({'detail': 'Field not found.'}, status=status.HTTP_404_NOT_FOUND)

        field.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Field Updates ──────────────────────────────────────────────────────────────

class FieldUpdateView(APIView):
    """
    POST /api/fields/<id>/updates/
    Creates a FieldUpdate log entry and advances the field's current_stage.
    Accessible by the assigned agent or any admin.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdminOrAssignedAgent]

    def post(self, request, pk):
        try:
            field = Field.objects.get(pk=pk)
        except Field.DoesNotExist:
            return Response({'detail': 'Field not found.'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, field)

        new_stage = request.data.get('new_stage')
        notes     = request.data.get('notes', '')

        valid_stages = [s[0] for s in Field.STAGE_CHOICES]
        if new_stage not in valid_stages:
            return Response(
                {'detail': f'Invalid stage. Choose from: {valid_stages}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Log the update
        update = FieldUpdate.objects.create(
            field=field,
            agent=request.user,
            new_stage=new_stage,
            notes=notes,
        )

        # Advance the field stage
        field.current_stage = new_stage
        field.save()

        return Response(FieldUpdateSerializer(update).data, status=status.HTTP_201_CREATED)


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """
    GET /api/dashboard/
    Returns aggregated stats tailored to the user's role.
    Admin: all fields + agent count + at-risk list
    Agent: only their assigned fields
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)

        if role == 'admin':
            fields = list(Field.objects.all().select_related('assigned_to'))
        else:
            fields = list(Field.objects.filter(assigned_to=request.user))

        # Compute status counts using the model's @property
        status_counts  = {'active': 0, 'at_risk': 0, 'completed': 0}
        stage_counts   = {'planted': 0, 'growing': 0, 'ready': 0, 'harvested': 0}
        at_risk_fields = []

        for f in fields:
            s = f.status
            status_counts[s]              = status_counts.get(s, 0) + 1
            stage_counts[f.current_stage] = stage_counts.get(f.current_stage, 0) + 1

            if s == 'at_risk':
                at_risk_fields.append({
                    'id':           f.id,
                    'name':         f.name,
                    'crop':         f.crop_type,
                    'days_planted': (timezone.now().date() - f.planting_date).days,
                })

        stats = {
            'total_fields':   len(fields),
            'status_counts':  status_counts,
            'stage_counts':   stage_counts,
            'at_risk_fields': at_risk_fields,
        }

        if role == 'admin':
            stats['total_agents'] = User.objects.filter(profile__role='agent').count()

        return Response(stats)