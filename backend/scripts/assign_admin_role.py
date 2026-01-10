#!/usr/bin/env python3
"""Assign admin role to admin user in user_roles table."""

from backend.db import SessionLocal
from backend.models import User, Role, UserRole

db = SessionLocal()
try:
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    admin_role = db.query(Role).filter(Role.name == "admin").first()

    if not admin_user:
        print("❌ Admin user not found")
        exit(1)

    if not admin_role:
        print("❌ Admin role not found")
        exit(1)

    existing = db.query(UserRole).filter(UserRole.user_id == admin_user.id, UserRole.role_id == admin_role.id).first()

    if existing:
        print(f"⚠️  Role already assigned: {admin_user.email} → {admin_role.name}")
    else:
        ur = UserRole(user_id=admin_user.id, role_id=admin_role.id)
        db.add(ur)
        db.commit()
        print(f"✅ Admin role assigned: {admin_user.email} → {admin_role.name}")
finally:
    db.close()
