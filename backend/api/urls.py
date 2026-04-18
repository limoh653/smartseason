"""
URL patterns for the api app.
All prefixed with /api/ from the root urls.py.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ── Auth ──────────────────────────────────────
    path('auth/login/',   views.AuthView.as_view(),    name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(),  name='token_refresh'),
    path('auth/me/',      views.MeView.as_view(),      name='me'),

    # ── Agents ────────────────────────────────────
    path('agents/',       views.AgentListView.as_view(), name='agent_list'),

    # ── Fields ────────────────────────────────────
    path('fields/',       views.FieldListCreateView.as_view(), name='field_list_create'),
    path('fields/<int:pk>/',         views.FieldDetailView.as_view(),  name='field_detail'),
    path('fields/<int:pk>/updates/', views.FieldUpdateView.as_view(),  name='field_update'),

    # ── Dashboard ─────────────────────────────────
    path('dashboard/',    views.DashboardStatsView.as_view(), name='dashboard'),
]