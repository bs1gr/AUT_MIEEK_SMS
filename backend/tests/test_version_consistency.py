"""
Test suite for version consistency across the codebase.

This test ensures that all version references remain synchronized
with the VERSION file after code changes.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

# Mark all tests in this file to skip fixtures that require app context.
pytestmark = pytest.mark.no_app_context


# ============================================================================
# Fixtures and Helpers
# ============================================================================


@pytest.fixture
def project_root() -> Path:
    """Get project root directory."""
    return Path(__file__).resolve().parents[2]


@pytest.fixture
def version_file(project_root: Path) -> str:
    """Read the canonical version from VERSION file."""
    version_path = project_root / "VERSION"
    assert version_path.exists(), "VERSION file not found"
    raw_version = version_path.read_text(encoding="utf-8").strip()
    assert re.match(r"^v?\d+\.\d+\.\d+$", raw_version), f"VERSION file must contain valid semver (got: {raw_version})"
    return normalize_version(raw_version)


def normalize_version(version: str | None) -> str | None:
    """Normalize versions by stripping a leading 'v'."""
    if version is None:
        return None
    return version.lstrip("v").strip()


def extract_version(content: str, pattern: str) -> str | None:
    """Extract version string using regex pattern."""
    match = re.search(pattern, content)
    return match.group(1) if match else None


# ============================================================================
# Core Version Files
# ============================================================================


def test_version_file_exists(project_root: Path):
    """Ensure VERSION file exists and is readable."""
    version_file = project_root / "VERSION"
    assert version_file.exists(), "VERSION file must exist"

    content = version_file.read_text(encoding="utf-8").strip()
    assert re.match(r"^v?\d+\.\d+\.\d+$", content), f"VERSION file must contain valid semver (got: {content})"


def test_frontend_package_json_version(project_root: Path, version_file: str):
    """Verify frontend/package.json version matches VERSION file."""
    pkg_path = project_root / "frontend" / "package.json"
    assert pkg_path.exists(), "frontend/package.json not found"

    pkg_data = json.loads(pkg_path.read_text(encoding="utf-8"))
    pkg_version = normalize_version(pkg_data.get("version"))

    assert pkg_version == version_file, f"package.json version ({pkg_version}) != VERSION ({version_file})"


def test_backend_main_docstring_version(project_root: Path, version_file: str):
    """Verify backend/main.py docstring version matches VERSION file."""
    main_path = project_root / "backend" / "main.py"
    assert main_path.exists(), "backend/main.py not found"

    content = main_path.read_text(encoding="utf-8")
    extracted_version = extract_version(content, r"Version:\s*v?(\d+\.\d+\.\d+)")

    assert extracted_version is not None, "Version not found in backend/main.py docstring"
    assert normalize_version(extracted_version) == version_file, (
        f"main.py version ({extracted_version}) != VERSION ({version_file})"
    )


# ============================================================================
# Documentation Files
# ============================================================================


def test_user_guide_version(project_root: Path, version_file: str):
    """Verify USER_GUIDE_COMPLETE.md version matches VERSION file."""
    guide_path = project_root / "docs" / "user" / "USER_GUIDE_COMPLETE.md"
    if not guide_path.exists():
        pytest.skip("USER_GUIDE_COMPLETE.md not found")

    content = guide_path.read_text(encoding="utf-8")
    extracted_version = extract_version(content, r"\*\*Version:\*\*\s*v?(\d+\.\d+\.\d+)")

    assert extracted_version is not None, "Version not found in USER_GUIDE_COMPLETE.md"
    assert normalize_version(extracted_version) == version_file, (
        f"User guide version ({extracted_version}) != VERSION ({version_file})"
    )


def test_developer_guide_version(project_root: Path, version_file: str):
    """Verify DEVELOPER_GUIDE_COMPLETE.md version matches VERSION file."""
    guide_path = project_root / "docs" / "development" / "DEVELOPER_GUIDE_COMPLETE.md"
    if not guide_path.exists():
        pytest.skip("DEVELOPER_GUIDE_COMPLETE.md not found")

    content = guide_path.read_text(encoding="utf-8")
    extracted_version = extract_version(content, r"\*\*Version:\*\*\s*v?(\d+\.\d+\.\d+)")

    assert extracted_version is not None, "Version not found in DEVELOPER_GUIDE_COMPLETE.md"
    assert normalize_version(extracted_version) == version_file, (
        f"Developer guide version ({extracted_version}) != VERSION ({version_file})"
    )


def test_documentation_index_version(project_root: Path, version_file: str):
    """Verify docs/DOCUMENTATION_INDEX.md version matches VERSION file."""
    index_path = project_root / "docs" / "DOCUMENTATION_INDEX.md"
    if not index_path.exists():
        pytest.skip("docs/DOCUMENTATION_INDEX.md not found")

    content = index_path.read_text(encoding="utf-8")
    extracted_version = extract_version(content, r"\*\*Version\*\*:\s*v?(\d+\.\d+\.\d+)")

    assert extracted_version is not None, "Version not found in docs/DOCUMENTATION_INDEX.md"
    assert normalize_version(extracted_version) == version_file, (
        f"Documentation index version ({extracted_version}) != VERSION ({version_file})"
    )


def test_root_documentation_index_version(project_root: Path, version_file: str):
    """Verify DOCUMENTATION_INDEX.md version matches VERSION file."""
    index_path = project_root / "DOCUMENTATION_INDEX.md"
    if not index_path.exists():
        pytest.skip("DOCUMENTATION_INDEX.md not found")

    content = index_path.read_text(encoding="utf-8")

    # Extract only header versions (first 20 lines) - matches "**Version:** X.X.X" or "(vX.X.X)"
    header_lines = "\n".join(content.split("\n")[:20])
    versions_found = re.findall(r"v?(\d+\.\d+\.\d+)", header_lines)

    assert len(versions_found) > 0, "No versions found in DOCUMENTATION_INDEX.md header"

    # All header versions should match
    for found_version in versions_found:
        assert normalize_version(found_version) == version_file, (
            f"Documentation index version ({found_version}) != VERSION ({version_file})"
        )


# ============================================================================
# Installer/Tools Files
# ============================================================================


def test_installer_wizard_version(project_root: Path, version_file: str):
    """Verify SMS_INSTALLER_WIZARD.ps1 version matches VERSION file."""
    wizard_path = project_root / "tools" / "installer" / "SMS_INSTALLER_WIZARD.ps1"
    if not wizard_path.exists():
        pytest.skip("SMS_INSTALLER_WIZARD.ps1 not found")

    content = wizard_path.read_text(encoding="utf-8")
    extracted_version = extract_version(content, r'Version\s*=\s*"v?(\d+\.\d+\.\d+)"')

    assert extracted_version is not None, "Version not found in SMS_INSTALLER_WIZARD.ps1"
    assert normalize_version(extracted_version) == version_file, (
        f"Installer wizard version ({extracted_version}) != VERSION ({version_file})"
    )


def test_uninstaller_wizard_version(project_root: Path, version_file: str):
    """Verify SMS_UNINSTALLER_WIZARD.ps1 version matches VERSION file."""
    wizard_path = project_root / "tools" / "installer" / "SMS_UNINSTALLER_WIZARD.ps1"
    if not wizard_path.exists():
        pytest.skip("SMS_UNINSTALLER_WIZARD.ps1 not found")

    content = wizard_path.read_text(encoding="utf-8")
    extracted_version = extract_version(content, r'Version\s*=\s*"v?(\d+\.\d+\.\d+)"')

    assert extracted_version is not None, "Version not found in SMS_UNINSTALLER_WIZARD.ps1"
    assert normalize_version(extracted_version) == version_file, (
        f"Uninstaller wizard version ({extracted_version}) != VERSION ({version_file})"
    )


# ============================================================================
# COMMIT_READY Script Version
# ============================================================================


def test_commit_ready_script_version(project_root: Path, version_file: str):
    """Verify COMMIT_READY.ps1 version matches VERSION file."""
    script_path = project_root / "COMMIT_READY.ps1"
    if not script_path.exists():
        pytest.skip("COMMIT_READY.ps1 not found")

    content = script_path.read_text(encoding="utf-8")
    # Look for "Version: X.X.X" in .NOTES section
    extracted_version = extract_version(content, r"Version:\s*v?(\d+\.\d+\.\d+)")

    if extracted_version:
        assert normalize_version(extracted_version) == version_file, (
            f"COMMIT_READY.ps1 version ({extracted_version}) != VERSION ({version_file})"
        )


# ============================================================================
# Comprehensive Version Consistency Test
# ============================================================================


def test_all_versions_consistent(project_root: Path, version_file: str):
    """
    Comprehensive test that checks all known version references.

    This test provides a summary of all version checks and ensures
    that the VERIFY_VERSION.ps1 script would pass.
    """
    version_files = {
        "VERSION": version_file,
        "package.json": None,
        "main.py": None,
        "USER_GUIDE": None,
        "DEVELOPER_GUIDE": None,
        "docs/INDEX": None,
        "root/INDEX": None,
        "INSTALLER_WIZARD": None,
        "UNINSTALLER_WIZARD": None,
    }

    # Collect all versions
    pkg_path = project_root / "frontend" / "package.json"
    if pkg_path.exists():
        pkg_data = json.loads(pkg_path.read_text(encoding="utf-8"))
        version_files["package.json"] = pkg_data.get("version")

    main_path = project_root / "backend" / "main.py"
    if main_path.exists():
        content = main_path.read_text(encoding="utf-8")
        version_files["main.py"] = normalize_version(extract_version(content, r"Version:\s*v?(\d+\.\d+\.\d+)") or None)

    # Documentation versions
    for doc_key, doc_path in [
        ("USER_GUIDE", project_root / "docs" / "user" / "USER_GUIDE_COMPLETE.md"),
        ("DEVELOPER_GUIDE", project_root / "docs" / "development" / "DEVELOPER_GUIDE_COMPLETE.md"),
        ("docs/INDEX", project_root / "docs" / "DOCUMENTATION_INDEX.md"),
        ("root/INDEX", project_root / "DOCUMENTATION_INDEX.md"),
    ]:
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            version_files[doc_key] = normalize_version(
                extract_version(content, r"\*\*?Version\*\*?:\s*v?(\d+\.\d+\.\d+)") or None
            )

    # Wizard versions
    for wizard_key, wizard_path in [
        ("INSTALLER_WIZARD", project_root / "tools" / "installer" / "SMS_INSTALLER_WIZARD.ps1"),
        ("UNINSTALLER_WIZARD", project_root / "tools" / "installer" / "SMS_UNINSTALLER_WIZARD.ps1"),
    ]:
        if wizard_path.exists():
            content = wizard_path.read_text(encoding="utf-8")
            version_files[wizard_key] = normalize_version(
                extract_version(content, r'Version\s*=\s*"v?(\d+\.\d+\.\d+)"') or None
            )

    # Report findings
    inconsistent = []
    for file_key, found_version in version_files.items():
        if found_version is not None and normalize_version(found_version) != version_file:
            inconsistent.append(f"{file_key}: {found_version} != {version_file}")

    if inconsistent:
        error_msg = "Version inconsistencies found:\n" + "\n".join(inconsistent)
        error_msg += "\n\nRun: .\\scripts\\VERIFY_VERSION.ps1 -Update"
        pytest.fail(error_msg)


# ============================================================================
# CI Integration Test
# ============================================================================


def test_verify_version_script_exists(project_root: Path):
    """Ensure VERIFY_VERSION.ps1 script exists for CI/CD."""
    script_path = project_root / "scripts" / "VERIFY_VERSION.ps1"
    assert script_path.exists(), "VERIFY_VERSION.ps1 script must exist for CI/CD version validation"

    # Verify script has proper execution permissions (on Windows, just check readability)
    content = script_path.read_text(encoding="utf-8")
    assert "param(" in content.lower(), "VERIFY_VERSION.ps1 must be a valid PowerShell script"
    assert "version" in content.lower(), "VERIFY_VERSION.ps1 must handle version checking"
