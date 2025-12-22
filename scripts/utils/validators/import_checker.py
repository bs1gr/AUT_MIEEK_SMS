#!/usr/bin/env python3
"""
Unified Import Validator

Consolidates import validation functionality for the Student Management System.

Purpose:
    Validates Python imports across the project with multiple check modes:
    - requirements: Verify all imports are in requirements.txt
    - backend: Check backend.db module imports
    - package: Validate package import structure
    - all: Run all validation modes (default)

Usage:
    python scripts/utils/validators/import_checker.py
    python scripts/utils/validators/import_checker.py --mode requirements
    python scripts/utils/validators/import_checker.py --mode backend
    python scripts/utils/validators/import_checker.py --mode package
    python scripts/utils/validators/import_checker.py --mode all

Exit Codes:
    0: All validations passed
    1: Validation errors found
    2: Argument/runtime errors
"""

import sys
import importlib
import ast
import argparse
from pathlib import Path
from typing import Set, List


class ImportValidator:
    """Unified import validator with multiple check modes."""

    def __init__(self, root_path: str = "."):
        self.root = Path(root_path).resolve()
        self.backend_dir = self.root / "backend"
        self.requirements_file = self.backend_dir / "requirements.txt"
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_requirements(self) -> bool:
        """Validate all backend imports are in requirements.txt."""
        print("=" * 70)
        print("MODE: Requirements Validation")
        print("=" * 70)
        print(f"Checking: {self.backend_dir}")
        print(f"Requirements: {self.requirements_file}")
        print("")

        required_modules = self._parse_requirements()
        print(f"Found {len(required_modules)} modules in requirements.txt\n")

        # Find all imports in backend
        found_issues = False
        for py_file in sorted(self.backend_dir.rglob("*.py")):
            # Skip compiled/cache files and virtualenv or third-party site-packages
            if "__pycache__" in str(py_file):
                continue

            # Ignore files that live inside virtual environments or site-packages
            parts = {p.lower() for p in py_file.parts}
            if ".venv" in parts or "site-packages" in parts:
                continue

            imports = self._find_imports_in_file(py_file)
            external_imports = self._filter_external_imports(imports)

            missing = external_imports - required_modules
            if missing:
                found_issues = True
                rel_path = py_file.relative_to(self.root)
                msg = f"  X {rel_path}: Missing in requirements: {', '.join(sorted(missing))}"
                self.errors.append(msg)
                print(msg)

        if not found_issues:
            print("  [OK] All imports found in requirements.txt")
            return True

        return False

    def validate_backend_imports(self) -> bool:
        """Validate backend.db module imports work correctly."""
        print("\n" + "=" * 70)
        print("MODE: Backend Imports Validation")
        print("=" * 70)

        test_imports = [
            "backend.db",
            "backend.db_utils",
            "backend.models",
            "backend.app_factory",
            "backend.main",
        ]

        print(f"Testing {len(test_imports)} core imports...\n")

        all_passed = True
        for import_path in test_imports:
            try:
                importlib.import_module(import_path)
                print(f"  [OK] {import_path}")
            except ImportError as e:
                all_passed = False
                msg = f"  X {import_path}: {e}"
                self.errors.append(msg)
                print(msg)
            except Exception as e:
                all_passed = False
                msg = f"  X {import_path}: {type(e).__name__}: {e}"
                self.errors.append(msg)
                print(msg)

        return all_passed

    def validate_package_structure(self) -> bool:
        """Validate package import structure."""
        print("\n" + "=" * 70)
        print("MODE: Package Structure Validation")
        print("=" * 70)

        # Check __init__.py files exist where needed
        required_inits = [
            self.backend_dir / "__init__.py",
            self.backend_dir / "routers" / "__init__.py",
            self.backend_dir / "schemas" / "__init__.py",
            self.backend_dir / "services" / "__init__.py",
        ]

        print(f"Checking {len(required_inits)} required __init__.py files...\n")

        all_passed = True
        for init_file in required_inits:
            if init_file.exists():
                print(f"  [OK] {init_file.relative_to(self.root)}")
            else:
                all_passed = False
                msg = f"  X {init_file.relative_to(self.root)}: Missing"
                self.errors.append(msg)
                print(msg)

        return all_passed

    def _parse_requirements(self) -> Set[str]:
        """Parse requirements.txt and return set of module names."""
        names: Set[str] = set()
        if not self.requirements_file.exists():
            return names

        for line in self.requirements_file.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if not s or s.startswith("#"):
                continue

            # Remove extras and version specifiers
            for sep in ("==", ">=", "<=", ">", "<", "~=", "!=", " "):
                if sep in s:
                    s = s.split(sep, 1)[0]
            s = s.split("[", 1)[0].strip()
            if s:
                names.add(s.lower())

        return names

    def _find_imports_in_file(self, path: Path) -> Set[str]:
        """Parse Python file and extract top-level imports."""
        try:
            src = path.read_text(encoding="utf-8")
            tree = ast.parse(src)
        except (SyntaxError, UnicodeDecodeError):
            return set()

        mods: Set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    mods.add(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    mods.add(node.module.split(".")[0])

        return mods

    def _filter_external_imports(self, imports: Set[str]) -> Set[str]:
        """Filter out standard library and local backend imports."""
        stdlib_modules = {
            "sys",
            "os",
            "re",
            "json",
            "pathlib",
            "datetime",
            "time",
            "collections",
            "itertools",
            "functools",
            "typing",
            "abc",
            "asyncio",
            "logging",
            "argparse",
            "subprocess",
            "threading",
            "socket",
            "urllib",
            "http",
            "ssl",
            "email",
            "base64",
            "uuid",
            "hashlib",
            "pickle",
            "csv",
            "tempfile",
            "shutil",
            "glob",
            "fnmatch",
            "linecache",
            "traceback",
            "inspect",
            "dataclasses",
            "enum",
            "decimal",
            "fractions",
            "math",
            "random",
            "statistics",
            "array",
            "queue",
            "struct",
            "codecs",
            "string",
            "io",
            "warnings",
            "contextlib",
            "abc",
            "atexit",
            "tracemalloc",
        }

        # Whitelist for common tooling modules
        whitelist = {
            "pytest",
            "setuptools",
            "pip",
            "wheel",
            "build",
            "tox",
            "black",
            "isort",
            "flake8",
            "pylint",
            "mypy",
            "bandit",
        }

        external = set()
        for imp in imports:
            lower_imp = imp.lower()

            # Skip standard library, backend-local, and whitelisted
            if imp not in stdlib_modules and not imp.startswith("backend"):
                if lower_imp not in whitelist:
                    external.add(imp)

        return external

    def run(self, mode: str = "all") -> bool:
        """Run validation with specified mode."""
        print(f"\n[*] Import Validator - Mode: {mode.upper()}")
        print(f"Working Directory: {self.root}\n")

        results = {}

        if mode in ("all", "requirements"):
            results["requirements"] = self.validate_requirements()

        if mode in ("all", "backend"):
            results["backend"] = self.validate_backend_imports()

        if mode in ("all", "package"):
            results["package"] = self.validate_package_structure()

        # Summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)

        for check_name, passed in results.items():
            status = "[PASS]" if passed else "[FAIL]"
            print(f"{check_name.capitalize():20} {status}")

        if self.errors:
            print(f"\n[!] Found {len(self.errors)} error(s)")
            for error in self.errors:
                print(error)

        if self.warnings:
            print(f"\nWARNING: Found {len(self.warnings)} warning(s)")
            for warning in self.warnings:
                print(warning)

        all_passed = all(results.values())

        if all_passed:
            print("\n[OK] All validations PASSED")
            return True
        else:
            print("\n[!] Some validations FAILED")
            return False


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--mode",
        choices=["requirements", "backend", "package", "all"],
        default="all",
        help="Validation mode (default: all)",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root directory (default: current directory)",
    )

    args = parser.parse_args()

    validator = ImportValidator(args.root)
    success = validator.run(args.mode)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
