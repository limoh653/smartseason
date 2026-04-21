"""
API Views for SmartSeason Field Monitoring System
Clean architecture: authentication handled in api/authentication.py
"""

from django.contrib.auth.models import User
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken

from .models import Field, FieldUpdate, UserProfile
from .serializers import (
    FieldSerializer,
    FieldListSerializer,
    FieldUpdateSerializer,
    UserSerializer,
    AgentSerializer
)
from .permissions import IsAdmin, IsAdminOrAssignedAgent
from .authentication import CookieJWTAuthentication  # ✅ FIXED IMPORT


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class AuthView(APIView):
    """
    POST /api/auth/login/
    Sets httpOnly cookies for JWT tokens.
    """
    permission_classes = []

    def post(self, request):
        from django.contrib.auth import authenticate

        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        UserProfile.objects.get_or_create(user=user, defaults={"role": "agent"})

        refresh = RefreshToken.for_user(user)

        response = Response({
            "user": UserSerializer(user).data
        })

        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            httponly=True,
            secure=True,
            samesite="None",
            max_age=60 * 60 * 8,
            path="/"
        )

        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=True,
            samesite="None",
            max_age=60 * 60 * 24 * 7,
            path="/"
        )

        return response


class LogoutView(APIView):
    permission_classes = []

    def post(self, request):
        response = Response({"detail": "Logged out"})

        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")

        return response


class MeView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ─────────────────────────────────────────────
# AGENTS
# ─────────────────────────────────────────────

class AgentListView(generics.ListAPIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = AgentSerializer

    queryset = User.objects.filter(profile__role="agent").select_related("profile")


# ─────────────────────────────────────────────
# FIELDS
# ─────────────────────────────────────────────

class FieldListCreateView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, "profile", None), "role", None)

        if role == "admin":
            fields = Field.objects.all()
        else:
            fields = Field.objects.filter(assigned_to=request.user)

        return Response(FieldListSerializer(fields, many=True).data)

    def post(self, request):
        role = getattr(getattr(request.user, "profile", None), "role", None)

        if role != "admin":
            return Response({"detail": "Only admins can create fields"},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = FieldSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FieldDetailView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdminOrAssignedAgent]

    def get_object(self, pk):
        return Field.objects.filter(pk=pk).first()

    def get(self, request, pk):
        field = self.get_object(pk)
        if not field:
            return Response({"detail": "Not found"}, status=404)

        return Response(FieldSerializer(field).data)


class FieldUpdateView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdminOrAssignedAgent]

    def post(self, request, pk):
        field = Field.objects.filter(pk=pk).first()

        if not field:
            return Response({"detail": "Not found"}, status=404)

        update = FieldUpdate.objects.create(
            field=field,
            agent=request.user,
            new_stage=request.data.get("new_stage"),
            notes=request.data.get("notes", "")
        )

        field.current_stage = request.data.get("new_stage")
        field.save()

        return Response(FieldUpdateSerializer(update).data, status=201)


class DashboardStatsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, "profile", None), "role", None)

        if role == "admin":
            fields = Field.objects.all()
        else:
            fields = Field.objects.filter(assigned_to=request.user)

        return Response({
            "total_fields": fields.count(),
        })