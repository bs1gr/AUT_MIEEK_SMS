#!/usr/bin/env python3
"""Create admin user for login testing"""

from backend.models import User
from backend.db import SessionLocal
from backend.security.password_hash import get_password_hash


def create_admin_user():
    """Create a default admin user"""
    session = SessionLocal()

    # Check if admin already exists
    existing_admin = (
        session.query(User).filter(User.email == "admin@example.com").first()
    )
    if existing_admin:
        print(f"✓ Admin user already exists: {existing_admin.email}")
        return

    # Create admin user
    admin_user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("admin"),  # Using secure hashing
        role="admin",
        full_name="Administrator",
        is_active=True,
    )

    session.add(admin_user)
    session.commit()
    print("✅ Admin user created: admin@example.com / admin")
    session.close()


if __name__ == "__main__":
    create_admin_user()
