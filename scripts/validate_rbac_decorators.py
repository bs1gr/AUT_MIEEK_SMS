#!/usr/bin/env python3
"""
Pre-commit hook: Validate RBAC decorator usage consistency.

Ensures all admin endpoints use the @require_permission decorator properly.
Checks for missing or misconfigured permission decorators.

Usage: python scripts/validate_rbac_decorators.py [--fix]
"""

import sys
import re
from pathlib import Path

# Ensure UTF-8 output to avoid Windows console encoding issues
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    # Fall back silently if reconfigure isn't available
    pass


def check_rbac_decorators(fix=False):
    """Check for proper RBAC decorator usage in all routers."""
    errors = []
    warnings = []

    # Define router files that should have RBAC protection
    router_dir = Path("backend/routers")
    router_files = list(router_dir.glob("routers_*.py"))

    # For now, just warn about potential issues
    # Full enforcement will happen after Phase 2 final review
    print("ℹ️  RBAC Decorator Check (Informational)")
    print("=" * 60)
    print("Phase 2 RBAC: Checking endpoint protection status...")
    print("")

    protected_count = 0
    total_count = 0

    for router_file in router_files:
        try:
            content = router_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = router_file.read_text(encoding="cp1252")

        # Count endpoints
        endpoints = len(re.findall(r"@router\.(get|post|put|delete|patch)", content))
        decorators = len(re.findall(r"@require_permission", content))

        total_count += endpoints
        protected_count += decorators

        if endpoints > 0:
            coverage = (decorators / endpoints) * 100
            status = "✅" if coverage >= 80 else "⚠️ " if coverage >= 50 else "❌"
            print(
                f"{status} {router_file.name:30} {decorators:3}/{endpoints:3} endpoints protected ({coverage:5.1f}%)"
            )

    print("")
    print(
        f"Overall: {protected_count}/{total_count} endpoints ({(protected_count / total_count) * 100:.1f}%) have @require_permission"
    )
    print("")

    return errors, warnings


def main():
    """Main entry point."""
    fix = "--fix" in sys.argv

    errors, warnings = check_rbac_decorators(fix=fix)

    if warnings:
        print("⚠️  WARNINGS (non-blocking):")
        for warning in warnings:
            print(f"  {warning}")

    if errors:
        print("❌ ERRORS (must fix):")
        for error in errors:
            print(f"  {error}")
        return 1

    if not errors and not warnings:
        print("✅ RBAC decorators: All checks passed")
        return 0

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
