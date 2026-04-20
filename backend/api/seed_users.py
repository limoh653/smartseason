from django.contrib.auth.models import User
from .models import UserProfile

def create_default_users():

    # ── Admin ────────────────────────────────────────
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

    # Force update the role — don't rely on defaults={}
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = "admin"   # ← always set it explicitly
    profile.save()

    # ── Agent 1 ──────────────────────────────────────
    if not User.objects.filter(username="user1").exists():
        u1 = User.objects.create_user(username="user1", password="user123")
        UserProfile.objects.create(user=u1, role="agent")
    else:
        # Fix role in case it was wrong
        u1 = User.objects.get(username="user1")
        profile1, _ = UserProfile.objects.get_or_create(user=u1)
        profile1.role = "agent"
        profile1.save()

    # ── Agent 2 ──────────────────────────────────────
    if not User.objects.filter(username="user2").exists():
        u2 = User.objects.create_user(username="user2", password="user456")
        UserProfile.objects.create(user=u2, role="agent")
    else:
        u2 = User.objects.get(username="user2")
        profile2, _ = UserProfile.objects.get_or_create(user=u2)
        profile2.role = "agent"
        profile2.save()

    print("✅ Users seeded: admin / user1 / user2")