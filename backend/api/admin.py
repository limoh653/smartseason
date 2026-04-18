"""
Register models with Django's built-in admin panel.
Useful for quick data management during development.
"""

from django.contrib import admin
from .models import UserProfile, Field, FieldUpdate


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter  = ['role']


@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
    list_display  = ['name', 'crop_type', 'current_stage', 'assigned_to', 'planting_date']
    list_filter   = ['current_stage']
    search_fields = ['name', 'crop_type']


@admin.register(FieldUpdate)
class FieldUpdateAdmin(admin.ModelAdmin):
    list_display = ['field', 'agent', 'new_stage', 'created_at']
    list_filter  = ['new_stage']