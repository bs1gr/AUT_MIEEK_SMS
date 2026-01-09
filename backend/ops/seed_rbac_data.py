"""
RBAC Data Seeding Script

Seeds permissions, roles, and role-permission mappings for the Student Management System.
Based on PERMISSION_MATRIX.md (25 permissions across 8 domains).

Usage:
    python backend/ops/seed_rbac_data.py              # Seed all data
    python backend/ops/seed_rbac_data.py --dry-run    # Preview without writing
    python backend/ops/seed_rbac_data.py --verify     # Verify seeded data

Features:
- Idempotent: Safe to run multiple times (upserts by permission.key and role.name)
- Atomic: All-or-nothing transaction (rollback on error)
- Verbose: Clear logging of all operations
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend and project root to path for imports
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from models import Permission, Role, RolePermission


# === Permission Definitions (from PERMISSION_MATRIX.md) ===

PERMISSIONS = [
    # Student Management (4)
    {"key": "students:view", "resource": "students", "action": "view", "description": "View student list and details"},
    {"key": "students:create", "resource": "students", "action": "create", "description": "Create new students"},
    {"key": "students:edit", "resource": "students", "action": "edit", "description": "Update student information"},
    {"key": "students:delete", "resource": "students", "action": "delete", "description": "Soft-delete students"},
    # Course Management (4)
    {"key": "courses:view", "resource": "courses", "action": "view", "description": "View course list and details"},
    {"key": "courses:create", "resource": "courses", "action": "create", "description": "Create new courses"},
    {"key": "courses:edit", "resource": "courses", "action": "edit", "description": "Update course information"},
    {"key": "courses:delete", "resource": "courses", "action": "delete", "description": "Soft-delete courses"},
    # Grade Management (3)
    {"key": "grades:view", "resource": "grades", "action": "view", "description": "View grade records"},
    {"key": "grades:edit", "resource": "grades", "action": "edit", "description": "Submit and update grades"},
    {"key": "grades:delete", "resource": "grades", "action": "delete", "description": "Delete grade records"},
    # Attendance Management (3)
    {"key": "attendance:view", "resource": "attendance", "action": "view", "description": "View attendance records"},
    {"key": "attendance:edit", "resource": "attendance", "action": "edit", "description": "Log and update attendance"},
    {
        "key": "attendance:delete",
        "resource": "attendance",
        "action": "delete",
        "description": "Delete attendance records",
    },
    # Enrollment Management (2)
    {"key": "enrollments:view", "resource": "enrollments", "action": "view", "description": "View course enrollments"},
    {
        "key": "enrollments:manage",
        "resource": "enrollments",
        "action": "manage",
        "description": "Create/update/delete enrollments",
    },
    # Reports & Analytics (2)
    {"key": "reports:view", "resource": "reports", "action": "view", "description": "View and generate reports"},
    {"key": "analytics:view", "resource": "analytics", "action": "view", "description": "View analytics dashboards"},
    # User Management (2)
    {"key": "users:view", "resource": "users", "action": "view", "description": "View user list"},
    {
        "key": "users:manage",
        "resource": "users",
        "action": "manage",
        "description": "Create/update/delete users, manage roles",
    },
    # Permission Management (2)
    {
        "key": "permissions:view",
        "resource": "permissions",
        "action": "view",
        "description": "View permissions and roles",
    },
    {
        "key": "permissions:manage",
        "resource": "permissions",
        "action": "manage",
        "description": "Assign/revoke permissions",
    },
    # Audit & Monitoring (1)
    {
        "key": "audit:view",
        "resource": "audit",
        "action": "view",
        "description": "View audit logs and system diagnostics",
    },
    # System Administration (2)
    {"key": "system:import", "resource": "system", "action": "import", "description": "Import data from files"},
    {"key": "system:export", "resource": "system", "action": "export", "description": "Export data to files"},
    # Notifications (1)
    {
        "key": "notifications:manage",
        "resource": "notifications",
        "action": "manage",
        "description": "Send broadcast notifications",
    },
]


# === Role Definitions ===

ROLES = [
    {"name": "admin", "description": "Administrator with full system access"},
    {"name": "teacher", "description": "Teacher with teaching and grading capabilities"},
    {"name": "viewer", "description": "Read-only access to most resources"},
]


# === Role-Permission Mappings (from PERMISSION_MATRIX.md) ===

ROLE_PERMISSIONS = {
    "admin": [
        # All 25 permissions
        "students:view",
        "students:create",
        "students:edit",
        "students:delete",
        "courses:view",
        "courses:create",
        "courses:edit",
        "courses:delete",
        "grades:view",
        "grades:edit",
        "grades:delete",
        "attendance:view",
        "attendance:edit",
        "attendance:delete",
        "enrollments:view",
        "enrollments:manage",
        "reports:view",
        "analytics:view",
        "users:view",
        "users:manage",
        "permissions:view",
        "permissions:manage",
        "audit:view",
        "system:import",
        "system:export",
        "notifications:manage",
    ],
    "teacher": [
        # 11 teaching-focused permissions
        "students:view",
        "courses:view",
        "grades:view",
        "grades:edit",
        "attendance:view",
        "attendance:edit",
        "enrollments:view",
        "enrollments:manage",
        "reports:view",
        "analytics:view",
        "system:export",  # Limited export capability
    ],
    "viewer": [
        # 7 read-only permissions
        "students:view",
        "courses:view",
        "grades:view",
        "attendance:view",
        "enrollments:view",
        "reports:view",
        "analytics:view",
    ],
}


def get_database_url() -> str:
    """Get database URL from environment or default to SQLite."""
    import os

    # Use absolute path for SQLite database
    db_path = Path(__file__).parent.parent.parent / "data" / "student_management.db"
    return os.getenv("DATABASE_URL", f"sqlite:///{db_path}")


def seed_permissions(session: Session, dry_run: bool = False) -> dict:
    """Seed permissions table (idempotent upsert)."""
    stats = {"created": 0, "updated": 0, "unchanged": 0}
    now = datetime.now(timezone.utc)

    for perm_data in PERMISSIONS:
        existing = session.query(Permission).filter(Permission.key == perm_data["key"]).first()

        if existing:
            # Update if description changed
            if existing.description != perm_data["description"]:
                if not dry_run:
                    existing.description = perm_data["description"]
                    existing.updated_at = now
                stats["updated"] += 1
                print(f"  ✅ Updated permission: {perm_data['key']}")
            else:
                stats["unchanged"] += 1
                print(f"  ✓  Permission exists: {perm_data['key']}")
        else:
            # Create new permission
            if not dry_run:
                new_perm = Permission(
                    key=perm_data["key"],
                    resource=perm_data["resource"],
                    action=perm_data["action"],
                    description=perm_data["description"],
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
                session.add(new_perm)
            stats["created"] += 1
            print(f"  ➕ Created permission: {perm_data['key']}")

    return stats


def seed_roles(session: Session, dry_run: bool = False) -> dict:
    """Seed roles table (idempotent upsert)."""
    stats = {"created": 0, "updated": 0, "unchanged": 0}

    for role_data in ROLES:
        existing = session.query(Role).filter(Role.name == role_data["name"]).first()

        if existing:
            # Update if description changed
            if existing.description != role_data["description"]:
                if not dry_run:
                    existing.description = role_data["description"]
                stats["updated"] += 1
                print(f"  ✅ Updated role: {role_data['name']}")
            else:
                stats["unchanged"] += 1
                print(f"  ✓  Role exists: {role_data['name']}")
        else:
            # Create new role
            if not dry_run:
                new_role = Role(
                    name=role_data["name"],
                    description=role_data["description"],
                )
                session.add(new_role)
            stats["created"] += 1
            print(f"  ➕ Created role: {role_data['name']}")

    return stats


def seed_role_permissions(session: Session, dry_run: bool = False) -> dict:
    """Seed role_permissions table (idempotent upsert)."""
    stats = {"created": 0, "skipped": 0}
    now = datetime.now(timezone.utc)

    for role_name, perm_keys in ROLE_PERMISSIONS.items():
        role = session.query(Role).filter(Role.name == role_name).first()
        if not role:
            print(f"  ⚠️  Role not found: {role_name} (skipping permissions)")
            continue

        for perm_key in perm_keys:
            permission = session.query(Permission).filter(Permission.key == perm_key).first()
            if not permission:
                print(f"  ⚠️  Permission not found: {perm_key} (skipping)")
                continue

            # Check if mapping already exists
            existing = (
                session.query(RolePermission)
                .filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == permission.id,
                )
                .first()
            )

            if existing:
                stats["skipped"] += 1
            else:
                if not dry_run:
                    new_mapping = RolePermission(
                        role_id=role.id,
                        permission_id=permission.id,
                        created_at=now,
                    )
                    session.add(new_mapping)
                stats["created"] += 1
                print(f"  ➕ Mapped {role_name} → {perm_key}")

    return stats


def verify_seeded_data(session: Session) -> bool:
    """Verify that seeded data meets expectations."""
    print("\n🔍 Verifying seeded data...")

    # Check permissions count (allow extras but not fewer)
    perm_count = session.query(Permission).count()
    expected_perm_count = len(PERMISSIONS)
    if perm_count < expected_perm_count:
        print(f"  ❌ Permission count mismatch: {perm_count} (expected at least {expected_perm_count})")
        return False
    extras = perm_count - expected_perm_count
    if extras:
        print(f"  ⚠️  Permissions: {perm_count} total ({extras} extra beyond expected {expected_perm_count})")
    else:
        print(f"  ✅ Permissions: {perm_count}/{expected_perm_count}")

    # Check roles count
    role_count = session.query(Role).count()
    expected_roles = len(ROLES)
    if role_count < expected_roles:  # Allow extra roles beyond the 3 defaults
        print(f"  ❌ Role count mismatch: {role_count} (expected at least {expected_roles})")
        return False
    print(f"  ✅ Roles: {role_count} (minimum {expected_roles})")

    # Check role-permission mappings
    total_mappings = sum(len(perms) for perms in ROLE_PERMISSIONS.values())
    mapping_count = session.query(RolePermission).count()
    if mapping_count < total_mappings:
        print(f"  ❌ Role-permission mappings: {mapping_count} (expected at least {total_mappings})")
        return False
    print(f"  ✅ Role-Permission Mappings: {mapping_count} (minimum {total_mappings})")

    # Verify specific role permissions
    for role_name, expected_perms in ROLE_PERMISSIONS.items():
        role = session.query(Role).filter(Role.name == role_name).first()
        if not role:
            print(f"  ❌ Role '{role_name}' not found")
            return False

        actual_perms = (
            session.query(Permission.key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id == role.id)
            .all()
        )
        actual_keys = {p.key for p in actual_perms}
        expected_keys = set(expected_perms)

        if not expected_keys.issubset(actual_keys):
            missing = expected_keys - actual_keys
            print(f"  ❌ Role '{role_name}' missing permissions: {missing}")
            return False
        print(f"  ✅ Role '{role_name}': {len(actual_keys)} permissions (expected {len(expected_perms)})")

    print("\n✅ All verification checks passed!")
    return True


def main():
    parser = argparse.ArgumentParser(description="Seed RBAC data for Student Management System")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to database")
    parser.add_argument("--verify", action="store_true", help="Verify seeded data after completion")
    args = parser.parse_args()

    print("=" * 70)
    print("RBAC Data Seeding Script")
    print("=" * 70)

    if args.dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be written to database\n")

    # Get database connection
    db_url = get_database_url()
    print(f"\n📊 Database: {db_url}\n")

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        # Seed permissions
        print("1️⃣  Seeding Permissions...")
        perm_stats = seed_permissions(session, dry_run=args.dry_run)
        print(
            f"\n   Created: {perm_stats['created']}, Updated: {perm_stats['updated']}, Unchanged: {perm_stats['unchanged']}\n"
        )

        # Seed roles
        print("2️⃣  Seeding Roles...")
        role_stats = seed_roles(session, dry_run=args.dry_run)
        print(
            f"\n   Created: {role_stats['created']}, Updated: {role_stats['updated']}, Unchanged: {role_stats['unchanged']}\n"
        )

        # Seed role-permission mappings
        print("3️⃣  Seeding Role-Permission Mappings...")
        mapping_stats = seed_role_permissions(session, dry_run=args.dry_run)
        print(f"\n   Created: {mapping_stats['created']}, Skipped: {mapping_stats['skipped']}\n")

        # Commit changes (unless dry run)
        if not args.dry_run:
            session.commit()
            print("✅ All changes committed to database\n")
        else:
            session.rollback()
            print("🔍 Dry run complete - no changes committed\n")

        # Verify if requested
        if args.verify and not args.dry_run:
            if not verify_seeded_data(session):
                print("\n❌ Verification failed!")
                sys.exit(1)

        # Summary
        print("=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(
            f"Permissions: {perm_stats['created']} created, {perm_stats['updated']} updated, {perm_stats['unchanged']} unchanged"
        )
        print(
            f"Roles: {role_stats['created']} created, {role_stats['updated']} updated, {role_stats['unchanged']} unchanged"
        )
        print(f"Role-Permission Mappings: {mapping_stats['created']} created, {mapping_stats['skipped']} skipped")
        print("=" * 70)

        if args.dry_run:
            print("\n🔍 This was a dry run. Re-run without --dry-run to apply changes.")
        else:
            print("\n✅ Seeding complete!")

        sys.exit(0)

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error during seeding: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)

    finally:
        session.close()


if __name__ == "__main__":
    main()
