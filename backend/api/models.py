

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

# user profile model either admin or agent
class UserProfile(models.Model):
    """Extends the built-in User model with a role field."""

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('agent', 'Field Agent'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='agent')

    def __str__(self):
        return f"{self.user.username} ({self.role})"

# field model with crop type and lifecycle stage
class Field(models.Model):
    """Represents a single farm field being monitored."""

    STAGE_CHOICES = [
        ('planted',   'Planted'),
        ('growing',   'Growing'),
        ('ready',     'Ready'),
        ('harvested', 'Harvested'),
    ]

    name         = models.CharField(max_length=100)
    crop_type    = models.CharField(max_length=100)
    planting_date = models.DateField()
    current_stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='planted')
    location      = models.CharField(max_length=200, blank=True)  # optional free-text location
    assigned_to   = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_fields',
        limit_choices_to={'profile__role': 'agent'},  # only agents can be assigned
    )
    created_by  = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_fields',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    @property
    def status(self):
        """
        Computed field status:
        - 'completed' if the crop has been harvested
        - 'at_risk'   if planted >90 days ago and not yet ready/harvested
        - 'active'    otherwise (normal progress)
        """
        if self.current_stage == 'harvested':
            return 'completed'

        days_since_planting = (timezone.now().date() - self.planting_date).days
        if days_since_planting > 90 and self.current_stage not in ('ready', 'harvested'):
            return 'at_risk'

        return 'active'

    def __str__(self):
        return f"{self.name} — {self.crop_type} ({self.current_stage})"


class FieldUpdate(models.Model):
    """
    A timestamped log entry when an agent updates a field's stage or adds notes.
    Keeps full history of all changes.
    """

    field      = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='updates')
    agent      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='field_updates')
    new_stage  = models.CharField(max_length=20, choices=Field.STAGE_CHOICES)
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # newest first

    def __str__(self):
        return f"Update on {self.field.name} by {self.agent} → {self.new_stage}"