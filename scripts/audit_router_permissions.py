#!/usr/bin/env python3
"""Audit router endpoints for permission decorator coverage."""

import re
from pathlib import Path

routers_dir = Path("backend/routers")
results = []

for router_file in routers_dir.glob("routers_*.py"):
    content = router_file.read_text(encoding="utf-8")

    # Count endpoints
    endpoints = len(re.findall(r"@router\.(get|post|put|delete|patch)", content))

    # Count permission decorators
    require_perm = len(re.findall(r"@require_permission", content))
    optional_require_perm = len(re.findall(r"optional_require_permission", content))
    require_role = len(re.findall(r"require_role", content))

    # Check imports
    has_rbac_import = (
        "from backend.rbac import" in content
        or "from backend.security.permissions import" in content
    )

    results.append(
        {
            "file": router_file.name,
            "endpoints": endpoints,
            "require_permission": require_perm,
            "optional_require_permission": optional_require_perm,
            "require_role": require_role,
            "has_rbac_import": has_rbac_import,
        }
    )

# Print summary
print("ROUTER ENDPOINT AUDIT")
print("=" * 100)
print(
    f"{'Router':<30} {'Endpoints':<12} {'@require_perm':<15} {'optional_require':<18} {'require_role':<15} {'RBAC Import':<12}"
)
print("-" * 100)

total_endpoints = 0
total_protected = 0
total_legacy = 0

for r in sorted(results, key=lambda x: x["file"]):
    if r["endpoints"] > 0:  # Only show routers with endpoints
        protected = r["require_permission"] + r["optional_require_permission"]
        total_endpoints += r["endpoints"]
        total_protected += protected
        total_legacy += r["require_role"]

        status = (
            "✅"
            if protected >= r["endpoints"]
            else ("⚠️" if r["require_role"] > 0 else "❌")
        )

        has_import = "Yes" if r["has_rbac_import"] else "No"

        print(
            f"{status} {r['file']:<28} {r['endpoints']:<12} {r['require_permission']:<15} "
            f"{r['optional_require_permission']:<18} {r['require_role']:<15} {has_import:<12}"
        )

print("-" * 100)
print(
    f"TOTAL: {total_endpoints} endpoints | {total_protected} with @require_permission | {total_legacy} with legacy require_role"
)
if total_endpoints > 0:
    coverage_pct = 100 * total_protected // total_endpoints
    print(f"Coverage: {total_protected}/{total_endpoints} ({coverage_pct}%)")
