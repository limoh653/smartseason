from django.contrib.auth.models import User

def create_default_users():
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@gmail.com",
            password="admin123"
        )

    if not User.objects.filter(username="user1").exists():
        User.objects.create_user(
            username="user1",
            password="user123"
        )

    if not User.objects.filter(username="user2").exists():
        User.objects.create_user(
            username="user2",
            password="user456"
        )