#!/usr/bin/env python3
"""
RBAC System Health Monitoring Script

Run daily via cron/Task Scheduler to monitor RBAC system health.

Usage:
    python scripts/rbac_monitor.py              # Run all checks
    python scripts/rbac_monitor.py --verbose    # Detailed output
    python scripts/rbac_monitor.py --check users_without_roles  # Single check

Exit codes:
    0 - All checks passed
    1 - One or more checks failed
    2 - Critical error (database unavailable, etc.)
"""

import argparse
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple

# Constants
DB_PATH = Path("data/student_management.db")
MAX_ADMINS = 5
EXPIRED_CLEANUP_THRESHOLD = 100
DIRECT_PERMISSIONS_WARNING = 20
DIRECT_PERMISSIONS_CRITICAL = 50


class Colors:
    """ANSI color codes for terminal output"""

    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def get_db_connection() -> sqlite3.Connection:
    """Get database connection with error handling"""
    if not DB_PATH.exists():
        print(f"{Colors.RED}✗ Database not found: {DB_PATH}{Colors.RESET}")
        sys.exit(2)

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"{Colors.RED}✗ Database connection failed: {e}{Colors.RESET}")
        sys.exit(2)


def check_users_without_roles(verbose: bool = False) -> Tuple[bool, str]:
    """
    Check for active users without role assignments

    Returns:
        Tuple of (passed, message)
    """
    conn = get_db_connection()
    cursor = conn.execute(
        "SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND role_id IS NULL"
    )
    count = cursor.fetchone()["count"]

    if verbose and count > 0:
        cursor = conn.execute(
            "SELECT id, email, created_at FROM users WHERE is_active = 1 AND role_id IS NULL"
        )
        users = cursor.fetchall()
        print("\n  Users without roles:")
        for user in users:
            print(
                f"    - {user['email']} (ID: {user['id']}, created: {user['created_at']})"
            )

    conn.close()

    if count == 0:
        return True, "All active users have roles"
    else:
        return False, f"{count} active users without roles"


def check_admin_count(verbose: bool = False) -> Tuple[bool, str]:
    """
    Check if admin user count is within acceptable range

    Returns:
        Tuple of (passed, message)
    """
    conn = get_db_connection()
    cursor = conn.execute(
        """SELECT COUNT(*) as count FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.is_active = 1 AND r.name = 'admin'"""
    )
    count = cursor.fetchone()["count"]

    if verbose and count > 0:
        cursor = conn.execute(
            """SELECT u.email, u.last_login FROM users u
               JOIN roles r ON u.role_id = r.id
               WHERE u.is_active = 1 AND r.name = 'admin'"""
        )
        admins = cursor.fetchall()
        print("\n  Admin users:")
        for admin in admins:
            last_login = admin["last_login"] or "Never"
            print(f"    - {admin['email']} (last login: {last_login})")

    conn.close()

    if count == 0:
        return False, "No admin users found (critical issue)"
    elif count <= MAX_ADMINS:
        return True, f"Admin count OK: {count}"
    else:
        return False, f"{count} admin users (expected ≤{MAX_ADMINS})"


def check_expired_cleanup(verbose: bool = False) -> Tuple[bool, str]:
    """
    Check if expired permissions have been cleaned up

    Returns:
        Tuple of (passed, message)
    """
    conn = get_db_connection()
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    cursor = conn.execute(
        f"SELECT COUNT(*) as count FROM user_permissions WHERE expires_at < '{cutoff}'"
    )
    count = cursor.fetchone()["count"]

    if verbose and count > 0:
        cursor = conn.execute(
            f"""SELECT u.email, p.key, up.expires_at
                FROM user_permissions up
                JOIN users u ON up.user_id = u.id
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.expires_at < '{cutoff}'
                LIMIT 10"""
        )
        expired = cursor.fetchall()
        print("\n  Sample expired permissions (showing up to 10):")
        for perm in expired:
            print(
                f"    - {perm['email']}: {perm['key']} (expired: {perm['expires_at']})"
            )

    conn.close()

    if count == 0:
        return True, "No expired permissions pending cleanup"
    elif count < EXPIRED_CLEANUP_THRESHOLD:
        return True, f"Expired permissions cleanup OK: {count} records"
    else:
        return (
            False,
            f"{count} expired permissions not cleaned (threshold: {EXPIRED_CLEANUP_THRESHOLD})",
        )


def check_direct_permissions(verbose: bool = False) -> Tuple[bool, str]:
    """
    Check for excessive direct user permissions (should use roles instead)

    Returns:
        Tuple of (passed, message)
    """
    conn = get_db_connection()
    cursor = conn.execute(
        """SELECT COUNT(*) as count FROM user_permissions
           WHERE expires_at IS NULL OR expires_at > datetime('now')"""
    )
    count = cursor.fetchone()["count"]

    if verbose and count > 0:
        cursor = conn.execute(
            """SELECT u.email, p.key, up.expires_at
               FROM user_permissions up
               JOIN users u ON up.user_id = u.id
               JOIN permissions p ON up.permission_id = p.id
               WHERE up.expires_at IS NULL OR up.expires_at > datetime('now')
               ORDER BY up.granted_at DESC
               LIMIT 10"""
        )
        perms = cursor.fetchall()
        print("\n  Recent direct permissions (showing up to 10):")
        for perm in perms:
            expires = perm["expires_at"] or "Never"
            print(f"    - {perm['email']}: {perm['key']} (expires: {expires})")

    conn.close()

    if count < DIRECT_PERMISSIONS_WARNING:
        return (
            True,
            f"Direct permissions OK: {count} (healthy: <{DIRECT_PERMISSIONS_WARNING})",
        )
    elif count < DIRECT_PERMISSIONS_CRITICAL:
        return True, f"Direct permissions growing: {count} (review recommended)"
    else:
        return (
            False,
            f"{count} direct permissions (should use roles, critical: >{DIRECT_PERMISSIONS_CRITICAL})",
        )


def check_permission_seeding(verbose: bool = False) -> Tuple[bool, str]:
    """
    Verify that core permissions exist

    Returns:
        Tuple of (passed, message)
    """
    conn = get_db_connection()

    # Check expected permission count (should be 26 in v1.15.1)
    cursor = conn.execute(
        "SELECT COUNT(*) as count FROM permissions WHERE is_active = 1"
    )
    perm_count = cursor.fetchone()["count"]

    # Check expected role count (should be 3: admin, teacher, viewer)
    cursor = conn.execute("SELECT COUNT(*) as count FROM roles WHERE is_active = 1")
    role_count = cursor.fetchone()["count"]

    # Check role-permission mappings
    cursor = conn.execute("SELECT COUNT(*) as count FROM role_permissions")
    mapping_count = cursor.fetchone()["count"]

    conn.close()

    expected_perms = 26
    expected_roles = 3
    expected_mappings = 44

    if verbose:
        print("\n  RBAC Configuration:")
        print(f"    Permissions: {perm_count}/{expected_perms}")
        print(f"    Roles: {role_count}/{expected_roles}")
        print(f"    Mappings: {mapping_count}/{expected_mappings}")

    if (
        perm_count >= expected_perms
        and role_count >= expected_roles
        and mapping_count >= expected_mappings
    ):
        return (
            True,
            f"RBAC seeding OK: {perm_count} perms, {role_count} roles, {mapping_count} mappings",
        )
    else:
        return (
            False,
            f"RBAC seeding incomplete: {perm_count}/{expected_perms} perms, {role_count}/{expected_roles} roles, {mapping_count}/{expected_mappings} mappings",
        )


def run_all_checks(verbose: bool = False) -> bool:
    """
    Run all health checks

    Returns:
        True if all checks passed, False otherwise
    """
    checks = [
        ("Users Without Roles", check_users_without_roles),
        ("Admin Count", check_admin_count),
        ("Expired Cleanup", check_expired_cleanup),
        ("Direct Permissions", check_direct_permissions),
        ("Permission Seeding", check_permission_seeding),
    ]

    results = []

    for check_name, check_func in checks:
        try:
            passed, message = check_func(verbose)
            results.append((check_name, passed, message))

            if passed:
                print(f"{Colors.GREEN}✓{Colors.RESET} {check_name}: {message}")
            else:
                print(f"{Colors.RED}✗{Colors.RESET} {check_name}: {message}")
        except Exception as e:
            print(f"{Colors.RED}✗{Colors.RESET} {check_name}: Error - {e}")
            results.append((check_name, False, str(e)))

    return all(passed for _, passed, _ in results)


def main():
    parser = argparse.ArgumentParser(description="RBAC System Health Monitor")
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show detailed output"
    )
    parser.add_argument(
        "--check",
        "-c",
        choices=[
            "users_without_roles",
            "admin_count",
            "expired_cleanup",
            "direct_permissions",
            "permission_seeding",
        ],
        help="Run specific check only",
    )

    args = parser.parse_args()

    print("=" * 60)
    print(f"{Colors.BOLD}RBAC System Health Check{Colors.RESET}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {DB_PATH}")
    print("=" * 60)
    print()

    if args.check:
        # Run single check
        check_map = {
            "users_without_roles": check_users_without_roles,
            "admin_count": check_admin_count,
            "expired_cleanup": check_expired_cleanup,
            "direct_permissions": check_direct_permissions,
            "permission_seeding": check_permission_seeding,
        }

        check_func = check_map[args.check]
        passed, message = check_func(args.verbose)

        if passed:
            print(f"{Colors.GREEN}✓{Colors.RESET} {message}")
            sys.exit(0)
        else:
            print(f"{Colors.RED}✗{Colors.RESET} {message}")
            sys.exit(1)
    else:
        # Run all checks
        all_passed = run_all_checks(args.verbose)

        print()
        print("=" * 60)
        if all_passed:
            print(f"{Colors.GREEN}{Colors.BOLD}✓ All checks passed{Colors.RESET}")
            sys.exit(0)
        else:
            print(
                f"{Colors.RED}{Colors.BOLD}✗ Some checks failed - review above{Colors.RESET}"
            )
            sys.exit(1)


if __name__ == "__main__":
    main()
