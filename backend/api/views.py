"""
API Views for SmartSeason.

AuthView           — login: sets httpOnly cookies for access + refresh tokens
LogoutView         — clears the auth cookies
MeView             — returns current user info (reads from cookie automatically)
AgentListView      — admin fetches list of all agents
FieldListCreateView — GET all fields / POST create new field
FieldDetailView    — GET / PUT / DELETE a single field
FieldUpdateView    — POST a stage update + notes
DashboardStatsView — aggregated summary stats
"""

from django.contrib.auth.models import User
from django.utils import timezone
from django.middleware.csrf import get_token

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
from .permissions import IsAdmin, IsAgent, IsAdminOrAssignedAgent


# ── Custom JWT authentication that reads from cookies ──────────────────────────

class CookieJWTAuthentication(JWTAuthentication):
    """
    Overrides the default header-based JWT auth to instead
    read the access token from the httpOnly 'access_token' cookie.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None  # No cookie — unauthenticated

        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError):
            return None  # Invalid/expired token

        return self.get_user(validated_token), validated_token


# ── Auth ───────────────────────────────────────────────────────────────────────

from django.conf import settings as django_settings

class AuthView(APIView):
    """
    POST /api/auth/login/
    Authenticates the user and sets httpOnly cookies:
      - access_token  (8 hours)
      - refresh_token (7 days)
    Returns user info in the response body (no tokens in body).
    """
    permission_classes = []

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

        # Ensure profile exists
        UserProfile.objects.get_or_create(user=user, defaults={'role': 'agent'})

        # Generate tokens
        refresh      = RefreshToken.for_user(user)
        access_token  = str(refresh.access_token)
        refresh_token = str(refresh)

        # In production (Render) we're on HTTPS across different domains
        # so cookies need secure=True and samesite='None'
        # In development cookies are on same localhost so Lax + secure=False works
        is_production = not django_settings.DEBUG
        secure   = is_production
        samesite = 'None' if is_production else 'Lax'

        response = Response({'user': UserSerializer(user).data})

        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,
            secure=secure,
            samesite=samesite,
            max_age=60 * 60 * 8,        # 8 hours
        )
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=secure,
            samesite=samesite,
            max_age=60 * 60 * 24 * 7,   # 7 days
        )

        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Clears both auth cookies server-side.
    """
    permission_classes = []

    def post(self, request):
        is_production = not django_settings.DEBUG
        secure   = is_production
        samesite = 'None' if is_production else 'Lax'

        response = Response({'detail': 'Logged out successfully.'})

        # Must pass same secure/samesite as when setting
        # otherwise the browser won't match and delete the cookie
        response.delete_cookie(
            'access_token',
            samesite=samesite,
        )
        response.delete_cookie(
            'refresh_token',
            samesite=samesite,
        )
        return response


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns the currently logged-in user's info.
    Authentication is handled via the httpOnly cookie automatically.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ── Agents ─────────────────────────────────────────────────────────────────────

class AgentListView(generics.ListAPIView):
    """GET /api/agents/ — admin only, returns all agent users."""
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = AgentSerializer
    queryset = User.objects.filter(profile__role='agent').select_related('profile')


# ── Fields ─────────────────────────────────────────────────────────────────────

class FieldListCreateView(APIView):
    """
    GET  /api/fields/ — list fields (all for admin, assigned for agent)
    POST /api/fields/ — create a new field (admin only)
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if role == 'admin':
            fields = Field.objects.all().select_related('assigned_to', 'assigned_to__profile')
        else:
            fields = Field.objects.filter(assigned_to=request.user).select_related('assigned_to')

        return Response(FieldListSerializer(fields, many=True).data)

    def post(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if role != 'admin':
            return Response({'detail': 'Only admins can create fields.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FieldDetailView(APIView):
    """GET / PUT / DELETE a single field."""
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdminOrAssignedAgent]

    def get_object(self, pk, request):
        try:
            field = Field.objects.select_related('assigned_to').prefetch_related('updates__agent').get(pk=pk)
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
    """POST /api/fields/<id>/updates/ — post a stage update."""
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

        update = FieldUpdate.objects.create(
            field=field, agent=request.user,
            new_stage=new_stage, notes=notes,
        )
        field.current_stage = new_stage
        field.save()

        return Response(FieldUpdateSerializer(update).data, status=status.HTTP_201_CREATED)


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """GET /api/dashboard/ — aggregated stats for the dashboard."""
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)

        if role == 'admin':
            fields = list(Field.objects.all().select_related('assigned_to'))
        else:
            fields = list(Field.objects.filter(assigned_to=request.user))

        status_counts = {'active': 0, 'at_risk': 0, 'completed': 0}
        stage_counts  = {'planted': 0, 'growing': 0, 'ready': 0, 'harvested': 0}
        at_risk_fields = []

        for f in fields:
            s = f.status
            status_counts[s] = status_counts.get(s, 0) + 1
            stage_counts[f.current_stage] = stage_counts.get(f.current_stage, 0) + 1
            if s == 'at_risk':
                at_risk_fields.append({
                    'id': f.id, 'name': f.name, 'crop': f.crop_type,
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