#!/usr/bin/env python3
"""
normalize_ruff.py - Ruff Configuration Normalization Utility

Validates, normalizes, and maintains consistency of ruff configuration
across the SMS codebase. Ensures all Python files comply with standardized
linting rules without requiring manual fixes.

Usage:
    python scripts/normalize_ruff.py --check              # Validate config
    python scripts/normalize_ruff.py --fix                # Apply fixes
    python scripts/normalize_ruff.py --validate-file FILE # Check single file
    python scripts/normalize_ruff.py --report             # Generate report

Features:
    - Validates ruff.toml configuration syntax
    - Checks all Python files against rules
    - Auto-fixes common linting issues
    - Generates detailed violation reports
    - Ensures consistency with project standards
"""

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class RuffRule:
    """Represents a single Ruff linting rule."""

    code: str
    description: str
    category: str  # "error", "warning", "style"
    auto_fixable: bool = False


# Standard SMS Ruff Rules
STANDARD_RULES = {
    "E": RuffRule("E", "PEP 8 Errors", "error", auto_fixable=True),
    "F": RuffRule(
        "F", "Pyflakes (undefined names, unused imports)", "error", auto_fixable=True
    ),
    "W": RuffRule("W", "PEP 8 Warnings", "warning", auto_fixable=True),
    "I": RuffRule("I", "isort imports", "style", auto_fixable=True),
    "N": RuffRule("N", "pep8-naming", "style", auto_fixable=False),
}

IGNORED_RULES = {
    "E402": "Allow module-level imports after code (alembic/tests)",
    "E722": "Allow bare except (controlled places)",
    "E501": "Allow long lines (formatter handles)",
}


class RuffConfigValidator:
    """Validates ruff configuration files and Python code compliance."""

    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize validator.

        Args:
            project_root: Root of project (default: current directory)
        """
        self.project_root = project_root or Path.cwd()
        self.config_path = self.project_root / "config" / "ruff.toml"
        self.violations: Dict[Path, List[str]] = {}
        self.fixed_count = 0

    def validate_config_exists(self) -> bool:
        """Check if ruff.toml exists."""
        if not self.config_path.exists():
            print(f"❌ Configuration file not found: {self.config_path}")
            return False
        print(f"✅ Configuration file found: {self.config_path}")
        return True

    def validate_config_syntax(self) -> bool:
        """Validate ruff.toml syntax."""
        try:
            import toml

            with open(self.config_path) as f:
                config = toml.load(f)

            # Check required sections
            required_sections = ["lint"]
            for section in required_sections:
                if section not in config:
                    print(f"❌ Missing required section: [{section}]")
                    return False

            # Validate select rules
            if "select" not in config["lint"]:
                print("⚠️  No 'select' rules defined in [lint]")
                return False

            print("✅ Configuration syntax valid")
            print(f"   Rules selected: {config['lint']['select']}")
            if "ignore" in config["lint"]:
                print(f"   Rules ignored: {config['lint']['ignore']}")

            return True

        except Exception as e:
            print(f"❌ Configuration syntax error: {e}")
            return False

    def get_python_files(self) -> List[Path]:
        """Get all Python files to check."""
        # Exclude common directories
        exclude_dirs = {
            "__pycache__",
            ".venv",
            "venv",
            "node_modules",
            ".git",
            "build",
            "dist",
            ".pytest_cache",
            ".ruff_cache",
        }

        python_files = []
        for py_file in self.project_root.rglob("*.py"):
            # Skip if in excluded directory
            if any(excluded in py_file.parts for excluded in exclude_dirs):
                continue
            python_files.append(py_file)

        return sorted(python_files)

    def check_single_file(self, file_path: Path) -> bool:
        """
        Check single file against ruff rules.

        Args:
            file_path: Path to Python file

        Returns:
            True if file passes all checks
        """
        try:
            result = subprocess.run(
                ["ruff", "check", str(file_path), "--config", str(self.config_path)],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                return True
            else:
                violations = result.stdout.strip().split("\n")
                self.violations[file_path] = violations
                return False

        except subprocess.TimeoutExpired:
            print(f"⏱️  Timeout checking {file_path}")
            return False
        except Exception as e:
            print(f"⚠️  Error checking {file_path}: {e}")
            return False

    def check_all_files(self) -> Tuple[int, int]:
        """
        Check all Python files.

        Returns:
            Tuple of (passed_count, failed_count)
        """
        python_files = self.get_python_files()
        passed = 0
        failed = 0

        print(f"\n📋 Checking {len(python_files)} Python files...\n")

        for file_path in python_files:
            if self.check_single_file(file_path):
                passed += 1
                print(f"  ✅ {file_path.relative_to(self.project_root)}")
            else:
                failed += 1
                print(f"  ❌ {file_path.relative_to(self.project_root)}")

        return passed, failed

    def fix_files(self) -> int:
        """
        Auto-fix ruff violations using ruff format.

        Returns:
            Number of files fixed
        """
        python_files = self.get_python_files()
        fixed = 0

        print(f"\n🔧 Attempting to fix {len(python_files)} files...\n")

        for file_path in python_files:
            try:
                result = subprocess.run(
                    [
                        "ruff",
                        "format",
                        str(file_path),
                        "--config",
                        str(self.config_path),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )

                if result.returncode == 0:
                    fixed += 1
                    print(f"  🔧 Fixed: {file_path.relative_to(self.project_root)}")
                else:
                    print(
                        f"  ⚠️  Could not fix: {file_path.relative_to(self.project_root)}"
                    )

            except Exception as e:
                print(f"  ❌ Error fixing {file_path}: {e}")

        self.fixed_count = fixed
        return fixed

    def generate_report(self) -> str:
        """
        Generate detailed violation report.

        Returns:
            Formatted report string
        """
        if not self.violations:
            return "✅ No violations found!"

        report = ["📊 Ruff Violation Report", "=" * 50, ""]

        total_violations = 0
        for file_path, violations in sorted(self.violations.items()):
            report.append(f"File: {file_path.relative_to(self.project_root)}")
            report.append(f"Violations: {len(violations)}")
            for violation in violations:
                report.append(f"  - {violation}")
            report.append("")
            total_violations += len(violations)

        report.append("=" * 50)
        report.append(f"Total Violations: {total_violations}")

        return "\n".join(report)

    def validate_standard_rules(self) -> bool:
        """Validate that all standard rules are properly configured."""
        try:
            import toml

            with open(self.config_path) as f:
                config = toml.load(f)

            selected = set(config["lint"]["select"])

            # Check that E and F are selected (minimum standard)
            if "E" not in selected and "F" not in selected:
                print(
                    "⚠️  Warning: Standard rules E (errors) and/or F (pyflakes) not selected"
                )
                return False

            print("✅ Standard rules configured correctly")
            return True

        except Exception as e:
            print(f"❌ Error validating standard rules: {e}")
            return False


class RuffReportGenerator:
    """Generates detailed ruff violation reports."""

    def __init__(self, validator: RuffConfigValidator):
        """Initialize report generator."""
        self.validator = validator

    def generate_json_report(self) -> str:
        """Generate JSON report of violations."""
        report_data = {
            "summary": {
                "total_files_checked": len(self.validator.get_python_files()),
                "total_violations": sum(
                    len(v) for v in self.validator.violations.values()
                ),
                "files_with_violations": len(self.validator.violations),
            },
            "violations": {
                str(file_path): violations
                for file_path, violations in self.validator.violations.items()
            },
        }
        return json.dumps(report_data, indent=2)

    def get_violation_summary(self) -> Dict[str, int]:
        """Get count of each violation type."""
        summary = {}

        for violations in self.validator.violations.values():
            for violation in violations:
                # Extract rule code (e.g., "E302" from "file.py:1:1: E302 ...")
                parts = violation.split(":")
                if len(parts) >= 4:
                    code = parts[3].strip().split()[0]
                    summary[code] = summary.get(code, 0) + 1

        return summary


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Ruff configuration validation and auto-fix utility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/normalize_ruff.py --check              # Validate all files
  python scripts/normalize_ruff.py --fix                # Auto-fix violations
  python scripts/normalize_ruff.py --report             # Show violation report
  python scripts/normalize_ruff.py --validate-file FILE # Check single file
        """,
    )

    parser.add_argument(
        "--check",
        action="store_true",
        help="Check all files against ruff configuration",
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Auto-fix ruff violations using ruff format",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate detailed violation report",
    )
    parser.add_argument(
        "--json-report",
        action="store_true",
        help="Generate JSON-formatted report",
    )
    parser.add_argument(
        "--validate-file",
        type=str,
        help="Check single file against configuration",
    )
    parser.add_argument(
        "--root",
        type=str,
        default=".",
        help="Project root directory (default: current directory)",
    )

    args = parser.parse_args()

    # Initialize validator
    validator = RuffConfigValidator(project_root=Path(args.root).resolve())

    # Always validate config exists
    if not validator.validate_config_exists():
        return 1

    # Handle single file check
    if args.validate_file:
        file_path = Path(args.validate_file)
        if not file_path.is_absolute():
            file_path = validator.project_root / file_path

        print(f"\n📋 Checking: {file_path.relative_to(validator.project_root)}")
        if validator.check_single_file(file_path):
            print("✅ File passes all checks")
            return 0
        else:
            print("❌ File has violations")
            return 1

    # Validate configuration
    print("\n🔍 Validating ruff configuration...\n")
    if not validator.validate_config_syntax():
        return 1

    if not validator.validate_standard_rules():
        return 1

    # Check all files
    if args.check:
        print("\n🔍 Checking all files...")
        passed, failed = validator.check_all_files()
        print(f"\n📊 Results: {passed} passed, {failed} failed")
        return 1 if failed > 0 else 0

    # Fix violations
    if args.fix:
        print("\n🔧 Auto-fixing violations...")
        fixed = validator.fix_files()
        print(f"\n✅ Fixed {fixed} files")
        return 0

    # Generate report
    if args.report:
        print("\n📊 Generating report...")
        validator.check_all_files()
        print(validator.generate_report())
        return 0

    # Generate JSON report
    if args.json_report:
        print("\n📊 Generating JSON report...")
        validator.check_all_files()
        report_generator = RuffReportGenerator(validator)
        print(report_generator.generate_json_report())
        return 0

    # No action specified
    print("⚠️  No action specified. Use --check, --fix, --report, or --validate-file")
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
