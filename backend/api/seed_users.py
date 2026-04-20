from django.contrib.auth.models import User
from .models import UserProfile

def create_default_users():

    # SUPERUSER (REAL ADMIN)
    if not User.objects.filter(username="admin").exists():
        user = User.objects.create_superuser(
            username="admin",
            email="admin@gmail.com",
            password="admin123"
        )
    else:
        user = User.objects.get(username="admin")
        user.is_staff = True
        user.is_superuser = True
        user.set_password("admin123")
        user.save()

    UserProfile.objects.get_or_create(user=user, defaults={"role": "admin"})

    # NORMAL USERS
    if not User.objects.filter(username="user1").exists():
        u1 = User.objects.create_user(username="user1", password="user123")
        UserProfile.objects.create(user=u1, role="agent")

    if not User.objects.filter(username="user2").exists():
        u2 = User.objects.create_user(username="user2", password="user456")
        UserProfile.objects.create(user=u2, role="agent")