#!/usr/bin/env python3
"""Quick test runner to check specific failing test files."""

import subprocess

# Run specific failing test batches to verify fixes
failing_tests = [
    "backend/tests/test_control_maintenance.py::test_auth_settings_endpoint_exists_in_openapi",
    "backend/tests/test_edge_cases.py::test_access_admin_endpoint_without_auth",
    "backend/tests/test_edge_cases.py::test_access_admin_endpoint_with_invalid_token",
    "backend/tests/test_gzip_middleware.py::test_gzip_compression_enabled_for_large_payloads",
    "backend/tests/test_list_routes.py::test_list_routes",
    "backend/tests/test_rbac_router.py::test_assign_and_revoke_role_with_last_admin_protection",
    "backend/tests/test_rbac_router.py::test_bulk_grant_permission_and_permission_crud",
]

print("Testing fixes for previously failing tests...")
print("=" * 60)

for test in failing_tests:
    print(f"\n▶ Running: {test}")
    result = subprocess.run(
        ["python", "-m", "pytest", test, "-xvs"],
        cwd=".",
        env={"SMS_ALLOW_DIRECT_PYTEST": "1", **dict(subprocess.os.environ)},
    )
    status = "✓ PASSED" if result.returncode == 0 else "✗ FAILED"
    print(f"  {status}")
    if result.returncode != 0:
        print(f"  (Exit code: {result.returncode})")

print("\n" + "=" * 60)
print("Test verification complete!")
