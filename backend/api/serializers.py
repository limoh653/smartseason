

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Field, FieldUpdate


class UserSerializer(serializers.ModelSerializer):
    """Serializes a User with their profile role included."""

    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']

    def get_role(self, obj):
        # Safely fetch role; return 'agent' as default if no profile exists
        try:
            return obj.profile.role
        except UserProfile.DoesNotExist:
            return 'agent'


class FieldUpdateSerializer(serializers.ModelSerializer):
    """Serializes a single field  and update the recent log entry."""

    agent_name = serializers.SerializerMethodField()

    class Meta:
        model = FieldUpdate
        fields = ['id', 'new_stage', 'notes', 'agent_name', 'created_at']

    def get_agent_name(self, obj):
        if obj.agent:
            return obj.agent.get_full_name() or obj.agent.username
        return 'Unknown'


class FieldSerializer(serializers.ModelSerializer):
    """
    Full field serializer.
    """

    status          = serializers.ReadOnlyField()              # from @property on model
    assigned_to     = UserSerializer(read_only=True)           # nested agent info
    assigned_to_id  = serializers.PrimaryKeyRelatedField(      # writable FK
        queryset=User.objects.filter(profile__role='agent'),
        source='assigned_to',
        write_only=True,
        required=False,
        allow_null=True,
    )
    recent_updates  = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = [
            'id', 'name', 'crop_type', 'planting_date', 'current_stage',
            'location', 'status', 'assigned_to', 'assigned_to_id',
            'recent_updates', 'created_at', 'updated_at',
        ]

    def get_recent_updates(self, obj):
        # Return only the 5 most recent updates for the detail view
        updates = obj.updates.all()[:5]
        return FieldUpdateSerializer(updates, many=True).data


class FieldListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing fields on dashboards.

    """

    status         = serializers.ReadOnlyField()
    assigned_to    = serializers.StringRelatedField()   # just "username (role)"

    class Meta:
        model = Field
        fields = [
            'id', 'name', 'crop_type', 'planting_date',
            'current_stage', 'status', 'assigned_to', 'location',
        ]


class AgentSerializer(serializers.ModelSerializer):
    """Used by admin when assigning agents to field i.e which agent to which field."""

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']