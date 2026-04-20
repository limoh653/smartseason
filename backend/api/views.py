

from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Field, FieldUpdate, UserProfile
from .serializers import (
    FieldSerializer, FieldListSerializer,
    FieldUpdateSerializer, UserSerializer, AgentSerializer
)
from .permissions import IsAdmin, IsAgent, IsAdminOrAssignedAgent


#AuthView this is a login endpoint returning JWT tokens + user inf

class AuthView(APIView):
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

        # Ensure profile exists (DO NOT force role = agent blindly)
        profile, created = UserProfile.objects.get_or_create(user=user)

        # Assign role only if missing
        if created:
            profile.role = 'admin' if user.is_superuser else 'agent'
            profile.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })
class MeView(APIView):
    """GET /api/auth/me/ — returns info about the currently logged-in user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ─── Agents ──────────────────────────────────────────────────────────────────

class AgentListView(generics.ListAPIView):
    """
    GET /api/agents/
    Admin-only. Returns all users with the 'agent' role.
    Used to populate the assignment dropdown when creating/editing a field.
    """
    permission_classes = [IsAdmin]
    serializer_class = AgentSerializer
    queryset = User.objects.filter(profile__role='agent').select_related('profile')


# Fields view

class FieldListCreateView(APIView):
    """
    GET  /api/fields/ — list fields (all for admin, assigned only for agent)
    POST /api/fields/ — create a new field (admin only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)

        if role == 'admin':
            fields = Field.objects.all().select_related('assigned_to', 'assigned_to__profile')
        else:
            # Agents only see fields assigned to them
            fields = Field.objects.filter(assigned_to=request.user).select_related('assigned_to')

        serializer = FieldListSerializer(fields, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Only admins may create fields
        role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if role != 'admin':
            return Response({'detail': 'Only admins can create fields.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = FieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FieldDetailView(APIView):
    """
    GET    /api/fields/<id>/ — field detail + recent updates
    PUT    /api/fields/<id>/ — update field (admin only)
    DELETE /api/fields/<id>/ — delete field (admin only)
    """
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


# Field Updates view

class FieldUpdateView(APIView):
    """
    POST /api/fields/<id>/updates/
    Agents (and admins) post a stage update + optional notes for a field.
    Creates a FieldUpdate log entry and advances the field's current_stage.
    """
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

        # Create update log entry
        update = FieldUpdate.objects.create(
            field=field,
            agent=request.user,
            new_stage=new_stage,
            notes=notes,
        )

        # Advance the field's current stage
        field.current_stage = new_stage
        field.save()

        return Response(FieldUpdateSerializer(update).data, status=status.HTTP_201_CREATED)


# Dashboard Stats 
class DashboardStatsView(APIView):
    """
    GET /api/dashboard/
    Returns aggregated stats tailored to the requesting user's role.

    Admin receives:
      - total fields / agents
      - breakdown by status and stage
      - fields at risk
      - recent activity

    Agent receives:
      - their assigned field counts
      - status breakdown for their fields
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(getattr(request.user, 'profile', None), 'role', None)

        if role == 'admin':
            fields = Field.objects.all().select_related('assigned_to')
        else:
            fields = Field.objects.filter(assigned_to=request.user)

        # Compute status for each field (uses model @property)
        status_counts = {'active': 0, 'at_risk': 0, 'completed': 0}
        stage_counts  = {'planted': 0, 'growing': 0, 'ready': 0, 'harvested': 0}
        at_risk_fields = []

        for f in fields:
            s = f.status
            status_counts[s] = status_counts.get(s, 0) + 1
            stage_counts[f.current_stage] = stage_counts.get(f.current_stage, 0) + 1

            if s == 'at_risk':
                at_risk_fields.append({
                    'id':   f.id,
                    'name': f.name,
                    'crop': f.crop_type,
                    'days_planted': (timezone.now().date() - f.planting_date).days,
                })

        stats = {
            'total_fields':  len(fields) if not hasattr(fields, 'count') else fields.count(),
            'status_counts': status_counts,
            'stage_counts':  stage_counts,
            'at_risk_fields': at_risk_fields,
        }

        if role == 'admin':
            stats['total_agents'] = User.objects.filter(profile__role='agent').count()

        return Response(stats)