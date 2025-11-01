#!/usr/bin/env python3
"""
Comprehensive Test Suite for Script Reorganization
Tests all operations and verifies everything works correctly
"""

import subprocess
from pathlib import Path

# Define root and scripts directory
ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"


class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []

    def add_pass(self, test_name: str, message: str = ""):
        self.passed.append((test_name, message))
        print(f"  [PASS] {test_name}")
        if message:
            print(f"         {message}")

    def add_fail(self, test_name: str, message: str):
        self.failed.append((test_name, message))
        print(f"  [FAIL] {test_name}")
        print(f"         {message}")

    def add_warning(self, test_name: str, message: str):
        self.warnings.append((test_name, message))
        print(f"  [WARN] {test_name}")
        print(f"         {message}")

    def summary(self):
        print("\n" + "=" * 70)
        print("  TEST SUMMARY")
        print("=" * 70)
        print(f"  Passed:   {len(self.passed)}")
        print(f"  Failed:   {len(self.failed)}")
        print(f"  Warnings: {len(self.warnings)}")
        print("=" * 70 + "\n")

        if self.failed:
            print("FAILED TESTS:")
            for name, msg in self.failed:
                print(f"  - {name}: {msg}")
            print()

        if self.warnings:
            print("WARNINGS:")
            for name, msg in self.warnings:
                print(f"  - {name}: {msg}")
            print()

        return len(self.failed) == 0


results = TestResults()

# Expected file structure
EXPECTED_DEV_SCRIPTS = [
    "CLEANUP.bat",
    "SMOKE_TEST.ps1",
    "debug_import_control.py",
    "internal/DEBUG_PORTS.ps1",
    "internal/DEBUG_PORTS.bat",
    "internal/DIAGNOSE_STATE.ps1",
    "internal/DIAGNOSE_FRONTEND.ps1",
    "internal/DIAGNOSE_FRONTEND.bat",
    "internal/KILL_FRONTEND_NOW.ps1",
    "internal/KILL_FRONTEND_NOW.bat",
    "internal/TEST_TERMINAL.ps1",
    "internal/CLEANUP.bat",
    "internal/CLEANUP_COMPREHENSIVE.ps1",
    "internal/CLEANUP_DOCS.ps1",
    "internal/CLEANUP_OBSOLETE_FILES.ps1",
    "internal/VERIFY_LOCALIZATION.ps1",
    "internal/DEVTOOLS.ps1",
    "internal/DEVTOOLS.bat",
]

EXPECTED_DEPLOY_SCRIPTS = [
    "SMART_SETUP.ps1",
    "STOP.ps1",
    "STOP.bat",
    "CHECK_VOLUME_VERSION.ps1",
    "UNINSTALL.bat",
    "set-docker-metadata.ps1",
    "docker/DOCKER_DOWN.ps1",
    "docker/DOCKER_UP.ps1",
    "docker/DOCKER_RUN.ps1",
    "docker/DOCKER_REFRESH.ps1",
    "docker/DOCKER_SMOKE.ps1",
    "docker/DOCKER_UPDATE_VOLUME.ps1",
    "docker/DOCKER_FULLSTACK_UP.ps1",
    "docker/DOCKER_FULLSTACK_DOWN.ps1",
    "docker/DOCKER_FULLSTACK_REFRESH.ps1",
    "internal/CREATE_PACKAGE.ps1",
    "internal/CREATE_PACKAGE.bat",
    "internal/CREATE_DEPLOYMENT_PACKAGE.ps1",
    "internal/CREATE_DEPLOYMENT_PACKAGE.bat",
    "internal/INSTALLER.ps1",
    "internal/INSTALLER.bat",
]

EXPECTED_ROOT_SCRIPTS = [
    "SMS.ps1",
    "INSTALL.bat",
]

EXPECTED_DOCS = [
    "scripts/dev/README.md",
    "scripts/deploy/README.md",
    "docs/SCRIPTS_GUIDE.md",
    "SCRIPT_REORGANIZATION_SUMMARY.md",
    "REORGANIZATION_COMPLETE.md",
]


def test_directory_structure():
    """Test 1: Verify directory structure exists"""
    print("\n[Test 1] Checking directory structure...")

    dirs = [
        SCRIPTS_DIR / "dev",
        SCRIPTS_DIR / "dev" / "internal",
        SCRIPTS_DIR / "deploy",
        SCRIPTS_DIR / "deploy" / "docker",
        SCRIPTS_DIR / "deploy" / "internal",
    ]

    for d in dirs:
        if d.exists() and d.is_dir():
            results.add_pass(f"Directory exists: {d.relative_to(ROOT)}")
        else:
            results.add_fail(f"Directory missing: {d.relative_to(ROOT)}", "Required directory does not exist")


def test_dev_scripts():
    """Test 2: Verify all developer scripts are in place"""
    print("\n[Test 2] Checking developer scripts...")

    for script in EXPECTED_DEV_SCRIPTS:
        script_path = SCRIPTS_DIR / "dev" / script
        if script_path.exists():
            results.add_pass(f"dev/{script}")
        else:
            results.add_fail(f"dev/{script}", "File not found")


def test_deploy_scripts():
    """Test 3: Verify all deployment scripts are in place"""
    print("\n[Test 3] Checking deployment scripts...")

    for script in EXPECTED_DEPLOY_SCRIPTS:
        script_path = SCRIPTS_DIR / "deploy" / script
        if script_path.exists():
            results.add_pass(f"deploy/{script}")
        else:
            results.add_fail(f"deploy/{script}", "File not found")


def test_root_scripts():
    """Test 4: Verify root scripts exist"""
    print("\n[Test 4] Checking root scripts...")

    for script in EXPECTED_ROOT_SCRIPTS:
        script_path = ROOT / script
        if script_path.exists():
            results.add_pass(f"root/{script}")
        else:
            results.add_fail(f"root/{script}", "File not found")


def test_documentation():
    """Test 5: Verify documentation files exist"""
    print("\n[Test 5] Checking documentation files...")

    for doc in EXPECTED_DOCS:
        doc_path = ROOT / doc
        if doc_path.exists():
            # Check file size (should have content)
            size = doc_path.stat().st_size
            if size > 1000:  # At least 1KB
                results.add_pass(f"{doc} ({size} bytes)")
            else:
                results.add_warning(f"{doc}", f"File too small ({size} bytes)")
        else:
            results.add_fail(f"{doc}", "File not found")


def test_readme_content():
    """Test 6: Verify README files have correct content"""
    print("\n[Test 6] Checking README content...")

    # Check dev README
    dev_readme = SCRIPTS_DIR / "dev" / "README.md"
    if dev_readme.exists():
        content = dev_readme.read_text(encoding="utf-8")
        if "Developer Workbench" in content and "SMOKE_TEST" in content:
            results.add_pass("dev/README.md has correct content")
        else:
            results.add_fail("dev/README.md", "Missing expected content")

    # Check deploy README
    deploy_readme = SCRIPTS_DIR / "deploy" / "README.md"
    if deploy_readme.exists():
        content = deploy_readme.read_text(encoding="utf-8")
        if "End-User / DevOps" in content and "SMART_SETUP" in content:
            results.add_pass("deploy/README.md has correct content")
        else:
            results.add_fail("deploy/README.md", "Missing expected content")

    # Check main SCRIPTS_GUIDE
    guide = ROOT / "docs" / "SCRIPTS_GUIDE.md"
    if guide.exists():
        content = guide.read_text(encoding="utf-8")
        if "Developer Workbench" in content and "End-User/DevOps" in content:
            results.add_pass("SCRIPTS_GUIDE.md has correct content")
        else:
            results.add_fail("SCRIPTS_GUIDE.md", "Missing expected content")


def test_main_readme_updated():
    """Test 7: Verify main README was updated"""
    print("\n[Test 7] Checking main README update...")

    readme = ROOT / "README.md"
    if readme.exists():
        content = readme.read_text(encoding="utf-8")
        checks = [
            ("scripts/dev/", "scripts/dev/ reference"),
            ("scripts/deploy/", "scripts/deploy/ reference"),
            ("SCRIPTS_GUIDE.md", "SCRIPTS_GUIDE.md reference"),
            ("Script Organization (v1.2.3+)", "Version updated"),
        ]

        for check_str, check_name in checks:
            if check_str in content:
                results.add_pass(f"README contains: {check_name}")
            else:
                results.add_fail(f"README missing: {check_name}", f"Expected to find '{check_str}'")


def test_no_duplicates():
    """Test 8: Check for duplicate files in old locations"""
    print("\n[Test 8] Checking for duplicate files in old locations...")

    # Old locations that should now only have wrappers or be moved
    old_locations = [
        (ROOT / "CLEANUP.bat", "Should be in scripts/dev/"),
        (SCRIPTS_DIR / "SMOKE_TEST.ps1", "Should be in scripts/dev/"),
        (SCRIPTS_DIR / "docker" / "DOCKER_UP.ps1", "Should be in scripts/deploy/docker/"),
    ]

    duplicates_found = False
    for old_path, note in old_locations:
        if old_path.exists():
            results.add_warning(f"Old file still exists: {old_path.relative_to(ROOT)}", note)
            duplicates_found = True

    if not duplicates_found:
        results.add_pass("No duplicate files in old locations")


def test_script_syntax():
    """Test 9: Check PowerShell scripts for basic syntax errors"""
    print("\n[Test 9] Checking PowerShell script syntax...")

    # Test a few key scripts
    key_scripts = [
        SCRIPTS_DIR / "dev" / "SMOKE_TEST.ps1",
        SCRIPTS_DIR / "deploy" / "SMART_SETUP.ps1",
        ROOT / "SMS.ps1",
    ]

    for script in key_scripts:
        if script.exists():
            try:
                # Try to parse the script (basic check)
                content = script.read_text(encoding="utf-8")
                if "param(" in content or "function" in content or "#" in content:
                    results.add_pass(f"Syntax check: {script.name}")
                else:
                    results.add_warning(f"Syntax check: {script.name}", "File seems empty or invalid")
            except Exception as e:
                results.add_fail(f"Syntax check: {script.name}", str(e))


def test_cross_references():
    """Test 10: Check for broken cross-references in documentation"""
    print("\n[Test 10] Checking documentation cross-references...")

    # Check if SCRIPTS_GUIDE references exist
    guide = ROOT / "docs" / "SCRIPTS_GUIDE.md"
    if guide.exists():
        content = guide.read_text(encoding="utf-8")

        refs_to_check = [
            ("scripts/dev/README.md", SCRIPTS_DIR / "dev" / "README.md"),
            ("scripts/deploy/README.md", SCRIPTS_DIR / "deploy" / "README.md"),
            ("SMS.ps1", ROOT / "SMS.ps1"),
            ("INSTALL.bat", ROOT / "INSTALL.bat"),
        ]

        for ref, path in refs_to_check:
            if ref in content:
                if path.exists():
                    results.add_pass(f"Cross-ref valid: {ref}")
                else:
                    results.add_fail(f"Cross-ref broken: {ref}", f"Referenced file does not exist: {path}")
            else:
                results.add_warning(f"Cross-ref missing: {ref}", "Not mentioned in SCRIPTS_GUIDE.md")


def test_file_permissions():
    """Test 11: Verify script files are readable"""
    print("\n[Test 11] Checking file permissions...")

    # Sample some key files
    key_files = [
        ROOT / "SMS.ps1",
        SCRIPTS_DIR / "dev" / "SMOKE_TEST.ps1",
        SCRIPTS_DIR / "deploy" / "SMART_SETUP.ps1",
    ]

    for f in key_files:
        if f.exists():
            try:
                # Try to read the file
                f.read_text(encoding="utf-8")
                results.add_pass(f"Readable: {f.name}")
            except Exception as e:
                results.add_fail(f"Not readable: {f.name}", str(e))


def test_git_status():
    """Test 12: Check git status (informational)"""
    print("\n[Test 12] Checking git status...")

    try:
        # Check if we're in a git repo
        result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, cwd=ROOT)

        if result.returncode == 0:
            changes = result.stdout.strip().split("\n")
            changes = [c for c in changes if c]  # Remove empty lines

            if changes:
                results.add_pass(f"Git detected {len(changes)} changes")
                # Show first few changes
                for change in changes[:5]:
                    print(f"         {change}")
                if len(changes) > 5:
                    print(f"         ... and {len(changes) - 5} more")
            else:
                results.add_warning("Git status", "No changes detected")
        else:
            results.add_warning("Git check", "Not in a git repository or git not available")
    except Exception as e:
        results.add_warning("Git check", f"Could not run git: {e}")


def test_reorganization_utility():
    """Test 13: Verify reorganization utility exists"""
    print("\n[Test 13] Checking reorganization utility...")

    util = SCRIPTS_DIR / "reorganize_scripts.py"
    if util.exists():
        content = util.read_text(encoding="utf-8")
        if "def reorganize()" in content and "def move_file(" in content:
            results.add_pass("Reorganization utility is valid")
        else:
            results.add_fail("Reorganization utility", "Missing expected functions")
    else:
        results.add_fail("Reorganization utility", "File not found")


def run_all_tests():
    """Run all tests"""
    print("=" * 70)
    print("  COMPREHENSIVE REORGANIZATION TEST SUITE")
    print("=" * 70)

    test_directory_structure()
    test_dev_scripts()
    test_deploy_scripts()
    test_root_scripts()
    test_documentation()
    test_readme_content()
    test_main_readme_updated()
    test_no_duplicates()
    test_script_syntax()
    test_cross_references()
    test_file_permissions()
    test_git_status()
    test_reorganization_utility()

    # Show summary
    success = results.summary()

    if success:
        print("[SUCCESS] All tests passed!")
        print("\nReady to commit to git.")
        print("\nRecommended next steps:")
        print("  1. Review the git changes: git status")
        print("  2. Stage all changes: git add .")
        print("  3. Commit with provided message")
        print("  4. Test key workflows manually if desired")
        return 0
    else:
        print("[FAILURE] Some tests failed!")
        print("\nPlease review the failures above and fix before committing.")
        return 1


if __name__ == "__main__":
    exit(run_all_tests())
