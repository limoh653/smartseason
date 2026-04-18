"""
Root URL configuration.
All API routes are delegated to the api app's urls.py.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),        # Django built-in admin panel
    path('api/', include('api.urls')),       # All our custom API endpoints
]