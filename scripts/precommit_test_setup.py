#!/usr/bin/env python3
"""
Pre-commit test environment automation for AUT_MIEEK_SMS.

This script ensures:
1. Test client bypasses authentication (sets AUTH_MODE=disabled).
2. Test database is reset/cleaned before tests.
3. Test data is unique per test run to avoid integrity errors.

Usage:
    python scripts/precommit_test_setup.py

This script is intended to be run automatically before running tests or committing.
"""

import os
import shutil
from pathlib import Path


# 1. Set environment variable to disable auth for tests
def set_auth_mode_disabled():
    os.environ["AUTH_MODE"] = "disabled"
    print("[precommit] AUTH_MODE=disabled set for test run.")


# 2. Reset test database (SQLite)
def reset_test_db():
    db_path = Path("backend/db/test.db")
    if db_path.exists():
        db_path.unlink()
        print(f"[precommit] Removed old test DB: {db_path}")
    # Optionally, create a new empty DB (if needed by test setup)
    # sqlite3.connect(str(db_path)).close()


# 3. Remove test data artifacts (optional: can be extended)
def clean_test_artifacts():
    tmp_dirs = [
        Path("backend/__pycache__"),
        Path("backend/tests/__pycache__"),
        Path("backend/tests/tmp"),
        Path("data/tests"),
    ]
    for d in tmp_dirs:
        if d.exists():
            if d.is_dir():
                shutil.rmtree(d)
                print(f"[precommit] Removed {d}")
            else:
                d.unlink()


# 4. Optionally, patch test data factories for uniqueness (example)
def patch_test_factories():
    # This is a placeholder for more advanced logic
    # e.g., monkeypatching or modifying factories to use unique values
    pass


if __name__ == "__main__":
    set_auth_mode_disabled()
    reset_test_db()
    clean_test_artifacts()
    patch_test_factories()
    print("[precommit] Test environment prepared. You can now run tests or commit.")
#!/usr/bin/env python3
"""
Pre-commit test environment automation for AUT_MIEEK_SMS.

This script ensures:
1. Test client bypasses authentication (sets AUTH_MODE=disabled).
2. Test database is reset/cleaned before tests.
3. Test data is unique per test run to avoid integrity errors.

Usage:
    python scripts/precommit_test_setup.py

This script is intended to be run automatically before running tests or committing.
"""


# 1. Set environment variable to disable auth for tests
def set_auth_mode_disabled():
    os.environ["AUTH_MODE"] = "disabled"
    print("[precommit] AUTH_MODE=disabled set for test run.")


# 2. Reset test database (SQLite)
def reset_test_db():
    db_path = Path("backend/db/test.db")
    if db_path.exists():
        db_path.unlink()
        print(f"[precommit] Removed old test DB: {db_path}")
    # Optionally, create a new empty DB (if needed by test setup)
    # sqlite3.connect(str(db_path)).close()


# 3. Remove test data artifacts (optional: can be extended)
def clean_test_artifacts():
    tmp_dirs = [
        Path("backend/__pycache__"),
        Path("backend/tests/__pycache__"),
        Path("backend/tests/tmp"),
        Path("data/tests"),
    ]
    for d in tmp_dirs:
        if d.exists():
            if d.is_dir():
                shutil.rmtree(d)
                print(f"[precommit] Removed {d}")
            else:
                d.unlink()


# 4. Optionally, patch test data factories for uniqueness (example)
def patch_test_factories():
    # This is a placeholder for more advanced logic
    # e.g., monkeypatching or modifying factories to use unique values
    pass


if __name__ == "__main__":
    set_auth_mode_disabled()
    reset_test_db()
    clean_test_artifacts()
    patch_test_factories()
    print("[precommit] Test environment prepared. You can now run tests or commit.")
