"""
WSGI config for smartseason project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartseason.settings')

application = get_wsgi_application()

try:
    from api.seed_users import create_default_users
    create_default_users()
except Exception as e:
    print("User seeding failed:", e)