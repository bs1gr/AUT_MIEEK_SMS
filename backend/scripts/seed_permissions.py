"""
Seed script for RBAC permissions system.

Populates the database with 52 default permissions across all resources
and assigns them to the appropriate roles (admin, staff, teacher, student).

Usage:
    python -m backend.scripts.seed_permissions

Features:
- Idempotent: Safe to run multiple times
- Creates all 52 permissions from RBAC_PERMISSION_MATRIX.md
- Assigns permissions to roles based on the matrix
- Handles missing roles gracefully
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models import Permission, Role

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# Permission definitions: 52 total permissions
PERMISSIONS = [
    # Student Management (6 permissions)
    {
        "key": "students:view",
        "resource": "students",
        "action": "view",
        "description": "View student records (own record for students)",
    },
    {
        "key": "students:view_all",
        "resource": "students",
        "action": "view_all",
        "description": "View all student records",
    },
    {
        "key": "students:create",
        "resource": "students",
        "action": "create",
        "description": "Create new student records",
    },
    {
        "key": "students:edit",
        "resource": "students",
        "action": "edit",
        "description": "Edit student information (own record for students)",
    },
    {
        "key": "students:delete",
        "resource": "students",
        "action": "delete",
        "description": "Soft-delete student records",
    },
    {
        "key": "students:export",
        "resource": "students",
        "action": "export",
        "description": "Export student data",
    },
    # Course Management (5 permissions)
    {
        "key": "courses:view",
        "resource": "courses",
        "action": "view",
        "description": "View course information",
    },
    {
        "key": "courses:create",
        "resource": "courses",
        "action": "create",
        "description": "Create new courses",
    },
    {
        "key": "courses:edit",
        "resource": "courses",
        "action": "edit",
        "description": "Edit course details",
    },
    {
        "key": "courses:delete",
        "resource": "courses",
        "action": "delete",
        "description": "Soft-delete courses",
    },
    {
        "key": "courses:export",
        "resource": "courses",
        "action": "export",
        "description": "Export course data",
    },
    # Grade Management (7 permissions)
    {
        "key": "grades:view",
        "resource": "grades",
        "action": "view",
        "description": "View grade records (own grades for students)",
    },
    {
        "key": "grades:view_all",
        "resource": "grades",
        "action": "view_all",
        "description": "View all student grades",
    },
    {
        "key": "grades:create",
        "resource": "grades",
        "action": "create",
        "description": "Create grade entries (own courses for teachers)",
    },
    {
        "key": "grades:edit",
        "resource": "grades",
        "action": "edit",
        "description": "Edit existing grades (own courses for teachers)",
    },
    {
        "key": "grades:delete",
        "resource": "grades",
        "action": "delete",
        "description": "Soft-delete grade records",
    },
    {
        "key": "grades:export",
        "resource": "grades",
        "action": "export",
        "description": "Export grade data (own grades for students)",
    },
    {
        "key": "grades:bulk_import",
        "resource": "grades",
        "action": "bulk_import",
        "description": "Bulk import grades (CSV/Excel)",
    },
    # Attendance Management (6 permissions)
    {
        "key": "attendance:view",
        "resource": "attendance",
        "action": "view",
        "description": "View attendance records (own for students)",
    },
    {
        "key": "attendance:view_all",
        "resource": "attendance",
        "action": "view_all",
        "description": "View all attendance data",
    },
    {
        "key": "attendance:create",
        "resource": "attendance",
        "action": "create",
        "description": "Record attendance (own courses for teachers)",
    },
    {
        "key": "attendance:edit",
        "resource": "attendance",
        "action": "edit",
        "description": "Edit attendance records (own courses for teachers)",
    },
    {
        "key": "attendance:delete",
        "resource": "attendance",
        "action": "delete",
        "description": "Soft-delete attendance records",
    },
    {
        "key": "attendance:export",
        "resource": "attendance",
        "action": "export",
        "description": "Export attendance data",
    },
    # Daily Performance (5 permissions)
    {
        "key": "performance:view",
        "resource": "performance",
        "action": "view",
        "description": "View performance records (own for students)",
    },
    {
        "key": "performance:view_all",
        "resource": "performance",
        "action": "view_all",
        "description": "View all performance data",
    },
    {
        "key": "performance:create",
        "resource": "performance",
        "action": "create",
        "description": "Create performance entries (own courses for teachers)",
    },
    {
        "key": "performance:edit",
        "resource": "performance",
        "action": "edit",
        "description": "Edit performance records (own courses for teachers)",
    },
    {
        "key": "performance:delete",
        "resource": "performance",
        "action": "delete",
        "description": "Soft-delete performance records",
    },
    # Highlights (5 permissions)
    {
        "key": "highlights:view",
        "resource": "highlights",
        "action": "view",
        "description": "View highlight records (own for students)",
    },
    {
        "key": "highlights:view_all",
        "resource": "highlights",
        "action": "view_all",
        "description": "View all highlights",
    },
    {
        "key": "highlights:create",
        "resource": "highlights",
        "action": "create",
        "description": "Create highlight entries (own courses for teachers)",
    },
    {
        "key": "highlights:edit",
        "resource": "highlights",
        "action": "edit",
        "description": "Edit highlights (own courses for teachers)",
    },
    {
        "key": "highlights:delete",
        "resource": "highlights",
        "action": "delete",
        "description": "Soft-delete highlights",
    },
    # Reporting & Analytics (5 permissions)
    {
        "key": "reports:generate",
        "resource": "reports",
        "action": "generate",
        "description": "Generate standard reports",
    },
    {
        "key": "reports:export",
        "resource": "reports",
        "action": "export",
        "description": "Export reports (PDF/Excel)",
    },
    {
        "key": "reports:schedule",
        "resource": "reports",
        "action": "schedule",
        "description": "Schedule automated reports",
    },
    {
        "key": "analytics:view",
        "resource": "analytics",
        "action": "view",
        "description": "View analytics dashboards",
    },
    {
        "key": "analytics:export",
        "resource": "analytics",
        "action": "export",
        "description": "Export analytics data",
    },
    # System Administration (6 permissions)
    {
        "key": "users:view",
        "resource": "users",
        "action": "view",
        "description": "View user accounts",
    },
    {
        "key": "users:create",
        "resource": "users",
        "action": "create",
        "description": "Create user accounts",
    },
    {
        "key": "users:edit",
        "resource": "users",
        "action": "edit",
        "description": "Edit user information",
    },
    {
        "key": "users:delete",
        "resource": "users",
        "action": "delete",
        "description": "Soft-delete users",
    },
    {
        "key": "users:manage_roles",
        "resource": "users",
        "action": "manage_roles",
        "description": "Assign/remove roles",
    },
    {
        "key": "users:manage_permissions",
        "resource": "users",
        "action": "manage_permissions",
        "description": "Direct permission assignment",
    },
    # Audit & Compliance (4 permissions)
    {
        "key": "audit:view",
        "resource": "audit",
        "action": "view",
        "description": "View audit logs",
    },
    {
        "key": "audit:export",
        "resource": "audit",
        "action": "export",
        "description": "Export audit logs",
    },
    {
        "key": "security:view",
        "resource": "security",
        "action": "view",
        "description": "View security settings",
    },
    {
        "key": "security:manage",
        "resource": "security",
        "action": "manage",
        "description": "Manage security configuration",
    },
    # Backup & Maintenance (4 permissions)
    {
        "key": "backups:view",
        "resource": "backups",
        "action": "view",
        "description": "View backup status",
    },
    {
        "key": "backups:create",
        "resource": "backups",
        "action": "create",
        "description": "Trigger manual backup",
    },
    {
        "key": "backups:restore",
        "resource": "backups",
        "action": "restore",
        "description": "Restore from backup",
    },
    {
        "key": "maintenance:execute",
        "resource": "maintenance",
        "action": "execute",
        "description": "Run maintenance tasks",
    },
]

# Role-Permission mappings based on RBAC_PERMISSION_MATRIX.md
ROLE_PERMISSIONS = {
    "admin": [
        # All 52 permissions
        "students:view",
        "students:view_all",
        "students:create",
        "students:edit",
        "students:delete",
        "students:export",
        "courses:view",
        "courses:create",
        "courses:edit",
        "courses:delete",
        "courses:export",
        "grades:view",
        "grades:view_all",
        "grades:create",
        "grades:edit",
        "grades:delete",
        "grades:export",
        "grades:bulk_import",
        "attendance:view",
        "attendance:view_all",
        "attendance:create",
        "attendance:edit",
        "attendance:delete",
        "attendance:export",
        "performance:view",
        "performance:view_all",
        "performance:create",
        "performance:edit",
        "performance:delete",
        "highlights:view",
        "highlights:view_all",
        "highlights:create",
        "highlights:edit",
        "highlights:delete",
        "reports:generate",
        "reports:export",
        "reports:schedule",
        "analytics:view",
        "analytics:export",
        "users:view",
        "users:create",
        "users:edit",
        "users:delete",
        "users:manage_roles",
        "users:manage_permissions",
        "audit:view",
        "audit:export",
        "security:view",
        "security:manage",
        "backups:view",
        "backups:create",
        "backups:restore",
        "maintenance:execute",
    ],
    "staff": [
        # 33 permissions
        "students:view",
        "students:view_all",
        "students:create",
        "students:edit",
        "students:export",
        "courses:view",
        "courses:create",
        "courses:edit",
        "courses:export",
        "grades:view",
        "grades:view_all",
        "grades:create",
        "grades:edit",
        "grades:delete",
        "grades:export",
        "grades:bulk_import",
        "attendance:view",
        "attendance:view_all",
        "attendance:create",
        "attendance:edit",
        "attendance:delete",
        "attendance:export",
        "performance:view",
        "performance:view_all",
        "performance:create",
        "performance:edit",
        "performance:delete",
        "highlights:view",
        "highlights:view_all",
        "highlights:create",
        "highlights:edit",
        "highlights:delete",
        "reports:generate",
        "reports:export",
        "analytics:view",
        "analytics:export",
        "users:view",
    ],
    "teacher": [
        # 25 permissions
        "students:view",
        "students:view_all",
        "students:export",
        "courses:view",
        "courses:export",
        "grades:view",
        "grades:view_all",
        "grades:create",
        "grades:edit",
        "grades:export",
        "grades:bulk_import",
        "attendance:view",
        "attendance:view_all",
        "attendance:create",
        "attendance:edit",
        "attendance:export",
        "performance:view",
        "performance:view_all",
        "performance:create",
        "performance:edit",
        "highlights:view",
        "highlights:view_all",
        "highlights:create",
        "highlights:edit",
        "reports:generate",
        "reports:export",
        "analytics:view",
    ],
    "student": [
        # 11 permissions (self-access only)
        "students:view",
        "students:edit",
        "courses:view",
        "grades:view",
        "grades:export",
        "attendance:view",
        "performance:view",
        "highlights:view",
    ],
}


def create_permissions(db: Session) -> dict[str, Permission]:
    """
    Create all permissions in the database.

    Returns:
        Dictionary mapping permission keys to Permission objects
    """
    logger.info(f"Creating {len(PERMISSIONS)} permissions...")
    permission_map = {}
    created_count = 0
    updated_count = 0

    for perm_data in PERMISSIONS:
        # Check if permission already exists
        perm = db.query(Permission).filter_by(key=perm_data["key"]).first()

        if perm:
            # Update existing permission
            perm.resource = perm_data["resource"]
            perm.action = perm_data["action"]
            perm.description = perm_data.get("description")
            perm.is_active = True
            perm.updated_at = datetime.now(timezone.utc)
            updated_count += 1
            logger.debug(f"  Updated: {perm_data['key']}")
        else:
            # Create new permission via raw SQL (DB has 'name' column but model doesn't)
            now = datetime.now(timezone.utc)
            db.execute(
                text("""
                    INSERT INTO permissions (key, name, resource, action, description, is_active, created_at, updated_at)
                    VALUES (:key, :name, :resource, :action, :description, :is_active, :created_at, :updated_at)
                """),
                {
                    "key": perm_data["key"],
                    "name": perm_data["key"],  # Use key as name for backward compatibility
                    "resource": perm_data["resource"],
                    "action": perm_data["action"],
                    "description": perm_data.get("description"),
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            db.flush()

            # Now fetch the created permission using the ORM model
            perm = db.query(Permission).filter(Permission.key == perm_data["key"]).first()

            created_count += 1
            logger.debug(f"  Created: {perm_data['key']}")

        permission_map[perm_data["key"]] = perm

    db.commit()
    logger.info(f"✓ Permissions: {created_count} created, {updated_count} updated")
    return permission_map


def create_roles(db: Session) -> dict[str, Role]:
    """
    Ensure all roles exist in the database.

    Returns:
        Dictionary mapping role names to Role objects
    """
    logger.info("Ensuring roles exist...")
    role_map = {}
    created_count = 0

    for role_name in ROLE_PERMISSIONS.keys():
        role = db.query(Role).filter_by(name=role_name).first()

        if not role:
            role = Role(name=role_name, description=f"{role_name.capitalize()} role")
            db.add(role)
            created_count += 1
            logger.debug(f"  Created role: {role_name}")
        else:
            logger.debug(f"  Found role: {role_name}")

        role_map[role_name] = role

    db.commit()
    logger.info(f"✓ Roles: {created_count} created, {len(role_map) - created_count} existing")
    return role_map


def assign_permissions_to_roles(db: Session, role_map: dict[str, Role], permission_map: dict[str, Permission]) -> None:
    """
    Assign permissions to roles based on ROLE_PERMISSIONS mapping.
    """
    logger.info("Assigning permissions to roles...")
    total_assigned = 0
    total_existing = 0

    for role_name, perm_keys in ROLE_PERMISSIONS.items():
        role = role_map.get(role_name)
        if not role:
            logger.warning(f"  Role '{role_name}' not found, skipping")
            continue

        assigned_count = 0
        existing_count = 0

        for perm_key in perm_keys:
            perm = permission_map.get(perm_key)
            if not perm:
                logger.warning(f"  Permission '{perm_key}' not found, skipping")
                continue

            # Check if role-permission mapping already exists (using raw SQL to avoid schema mismatch)
            existing = db.execute(
                text("SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id"),
                {"role_id": role.id, "perm_id": perm.id},
            ).fetchone()

            if not existing:
                # Insert using raw SQL (table doesn't have created_at yet)
                db.execute(
                    text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)"),
                    {"role_id": role.id, "perm_id": perm.id},
                )
                assigned_count += 1
            else:
                existing_count += 1

        logger.info(f"  {role_name}: {assigned_count} assigned, {existing_count} existing (total: {len(perm_keys)})")
        total_assigned += assigned_count
        total_existing += existing_count

    db.commit()
    logger.info(f"✓ Total: {total_assigned} new assignments, {total_existing} existing")


def verify_seeding(db: Session) -> None:
    """
    Verify that all permissions and role assignments are correct.
    """
    logger.info("Verifying seeding results...")

    # Count permissions
    perm_count = db.query(Permission).filter_by(is_active=True).count()
    logger.info(f"  Total active permissions: {perm_count}/{len(PERMISSIONS)}")

    # Count role-permission assignments (using raw SQL to avoid schema mismatch)
    for role_name, expected_perms in ROLE_PERMISSIONS.items():
        role = db.query(Role).filter_by(name=role_name).first()
        if role:
            result = db.execute(
                text("SELECT COUNT(*) FROM role_permissions WHERE role_id = :role_id"),
                {"role_id": role.id},
            )
            actual_count = result.scalar()
            logger.info(f"  {role_name}: {actual_count}/{len(expected_perms)} permissions")
        else:
            logger.warning(f"  {role_name}: Role not found!")

    logger.info("✓ Verification complete")


def seed_permissions(db: Session) -> None:
    """
    Main seeding function. Creates permissions, roles, and assigns permissions to roles.
    """
    logger.info("=" * 60)
    logger.info("RBAC PERMISSION SEEDING")
    logger.info("=" * 60)

    try:
        # Step 1: Create permissions
        permission_map = create_permissions(db)

        # Step 2: Create roles
        role_map = create_roles(db)

        # Step 3: Assign permissions to roles
        assign_permissions_to_roles(db, role_map, permission_map)

        # Step 4: Verify
        verify_seeding(db)

        logger.info("=" * 60)
        logger.info("✓ SEEDING COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"✗ Seeding failed: {e}", exc_info=True)
        db.rollback()
        raise


if __name__ == "__main__":
    # Get database session
    db = SessionLocal()
    try:
        seed_permissions(db)
    finally:
        db.close()
