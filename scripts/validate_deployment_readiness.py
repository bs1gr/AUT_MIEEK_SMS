#!/usr/bin/env python3
"""
Pre-commit hook: Validate deployment readiness checklist.

Ensures all required deployment files and configurations are present
before allowing commits to main branch during deployment phases.

Usage: python scripts/validate_deployment_readiness.py
"""

import sys
from pathlib import Path
from datetime import datetime


def check_deployment_files():
    """Check for essential deployment files and documentation."""
    checks = {
        "Deployment Guides": [
            (
                "docs/deployment/STAGING_DEPLOYMENT_VALIDATION_JAN8.md",
                "Staging validation guide",
            ),
            ("docs/deployment/CI_CD_MONITORING_JAN8.md", "CI/CD monitoring guide"),
            ("PHASE2_RBAC_DEPLOYMENT_READINESS.md", "Deployment readiness summary"),
        ],
        "RBAC Configuration": [
            ("backend/rbac.py", "RBAC decorator module"),
            ("backend/ops/seed_rbac_data.py", "RBAC seeding script"),
            ("docs/admin/PERMISSION_MATRIX.md", "Permission matrix documentation"),
        ],
        "Testing Infrastructure": [
            ("frontend/tests/", "E2E test directory"),
            ("backend/tests/", "Backend test directory"),
            ("load-testing/", "Load testing suite"),
        ],
        "Critical Configuration": [
            (".env.example", "Environment template"),
            ("docker/docker-compose.yml", "Docker compose file"),
            ("docker/docker-compose.prod.yml", "Production Docker config"),
        ],
    }

    results = {"passed": [], "missing": [], "warnings": []}

    for category, files in checks.items():
        print(f"\n📋 Checking {category}:")
        for check_path, description in files:
            path = Path(check_path)

            if path.exists():
                status = "✅"
                results["passed"].append((category, description))
                print(f"  {status} {description}")
            else:
                status = "❌"
                results["missing"].append((category, description, check_path))
                print(f"  {status} {description} (missing: {check_path})")

    # Print summary
    print("\n" + "=" * 60)
    print(
        f"Deployment Readiness Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    print("=" * 60)
    print(f"✅ Passed: {len(results['passed'])} checks")
    print(f"❌ Missing: {len(results['missing'])} files")

    if results["missing"]:
        print("\n🚨 Missing files required for deployment:")
        for category, description, path in results["missing"]:
            print(f"  • {description} ({path})")
        return 1

    print("\n✅ All deployment readiness checks passed!")
    return 0


def main():
    """Main entry point."""
    return check_deployment_files()


if __name__ == "__main__":
    sys.exit(main())
