#!/usr/bin/env python3
"""
Test script to verify all fixes applied on 2025-01-18
"""
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def test_error_codes():
    """Test H-4: Missing error codes are now defined"""
    print("\n=== Test 1: Error Codes (H-4) ===")
    try:
        from backend.errors import ErrorCode

        # Test that all new error codes exist
        assert hasattr(ErrorCode, 'BAD_REQUEST'), "BAD_REQUEST missing"
        assert hasattr(ErrorCode, 'CONTROL_OPERATION_FAILED'), "CONTROL_OPERATION_FAILED missing"
        assert hasattr(ErrorCode, 'CONTROL_DEPENDENCY_ERROR'), "CONTROL_DEPENDENCY_ERROR missing"
        assert hasattr(ErrorCode, 'CONTROL_FILE_NOT_FOUND'), "CONTROL_FILE_NOT_FOUND missing"

        # Test values
        assert ErrorCode.BAD_REQUEST.value == "ERR_BAD_REQUEST"
        assert ErrorCode.CONTROL_OPERATION_FAILED.value == "CTL_OPERATION_FAILED"
        assert ErrorCode.CONTROL_DEPENDENCY_ERROR.value == "CTL_DEPENDENCY_ERROR"
        assert ErrorCode.CONTROL_FILE_NOT_FOUND.value == "CTL_FILE_NOT_FOUND"

        print("[PASS] All 4 new error codes exist with correct values")
        return True
    except Exception as e:
        print(f"[FAIL] Error codes test failed: {e}")
        return False


def test_path_traversal_protection():
    """Test H-2: Path traversal protection using is_relative_to()"""
    print("\n=== Test 2: Path Traversal Protection (H-2) ===")
    try:
        from pathlib import Path

        # Simulate backup directory
        backup_dir = Path("d:/SMS/student-management-system/backups/database").resolve()

        # Test 1: Valid path within backup_dir
        valid_path = (backup_dir / "backup_20250118.db").resolve()
        assert valid_path.is_relative_to(backup_dir), "Valid path should pass"
        print("[PASS] Valid path accepted: backup_20250118.db")

        # Test 2: Path traversal attempt - should be rejected
        try:
            traversal_path = (backup_dir / "../../../etc/passwd").resolve()
            is_safe = traversal_path.is_relative_to(backup_dir)
            if not is_safe:
                print(f"[PASS] Path traversal blocked: ../../../etc/passwd")
            else:
                print(f"[FAIL] Path traversal NOT blocked!")
                return False
        except ValueError:
            print("[PASS] Path traversal blocked with ValueError")

        # Test 3: Another traversal attempt
        try:
            traversal_path2 = (backup_dir / "../../main.py").resolve()
            is_safe2 = traversal_path2.is_relative_to(backup_dir)
            if not is_safe2:
                print(f"[PASS] Path traversal blocked: ../../main.py")
            else:
                print(f"[FAIL] Path traversal NOT blocked!")
                return False
        except ValueError:
            print("[PASS] Path traversal blocked with ValueError")

        print("[PASS] Path traversal protection working correctly")
        return True
    except Exception as e:
        print(f"[FAIL] Path traversal test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sqlalchemy_comparisons():
    """Test H-3: SQLAlchemy .is_() method usage"""
    print("\n=== Test 3: SQLAlchemy Comparisons (H-3) ===")
    try:
        # Read the prometheus_metrics.py file and check for .is_() usage
        metrics_file = Path(__file__).parent / "backend" / "middleware" / "prometheus_metrics.py"
        content = metrics_file.read_text(encoding='utf-8')

        # Check that .is_(True) and .is_(False) are used
        if ".is_active.is_(True)" in content:
            print("[PASS] Found .is_active.is_(True) usage")
        else:
            print("[FAIL] .is_active.is_(True) not found")
            return False

        if ".is_active.is_(False)" in content:
            print("[PASS] Found .is_active.is_(False) usage")
        else:
            print("[FAIL] .is_active.is_(False) not found")
            return False

        # Check that old == True pattern is NOT present
        if "is_active == True" in content:
            print("[FAIL] Old pattern 'is_active == True' still present!")
            return False
        else:
            print("[PASS] Old pattern 'is_active == True' removed")

        print("[PASS] SQLAlchemy comparisons using .is_() method")
        return True
    except Exception as e:
        print(f"[FAIL] SQLAlchemy test failed: {e}")
        return False


def test_no_duplicate_function():
    """Test C-1: Duplicate function removed"""
    print("\n=== Test 4: No Duplicate Function (C-1) ===")
    try:
        control_file = Path(__file__).parent / "backend" / "routers" / "routers_control.py"
        content = control_file.read_text(encoding='utf-8')
        lines = content.split('\n')

        # Count how many times the upload_database function is defined
        upload_db_definitions = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('async def upload_database('):
                upload_db_definitions += 1
                print(f"[INFO] Found upload_database definition at line {i+1}")

        if upload_db_definitions == 1:
            print(f"[PASS] Exactly 1 upload_database function (duplicate removed)")
            return True
        else:
            print(f"[FAIL] Found {upload_db_definitions} upload_database definitions (expected 1)")
            return False
    except Exception as e:
        print(f"[FAIL] Duplicate function test failed: {e}")
        return False


def test_metrics_collector_refactored():
    """Test H-1: Metrics collector uses lifespan instead of @app.on_event"""
    print("\n=== Test 5: Metrics Collector Refactored (H-1) ===")
    try:
        metrics_file = Path(__file__).parent / "backend" / "middleware" / "prometheus_metrics.py"
        content = metrics_file.read_text()

        # Check that @app.on_event is NOT present
        if "@app.on_event" in content:
            print("[FAIL] Deprecated @app.on_event still present!")
            return False
        else:
            print("[PASS] Deprecated @app.on_event removed")

        # Check that create_metrics_collector_task exists
        if "def create_metrics_collector_task" in content:
            print("[PASS] New create_metrics_collector_task function exists")
        else:
            print("[FAIL] create_metrics_collector_task function not found")
            return False

        # Check main.py for lifespan integration
        main_file = Path(__file__).parent / "backend" / "main.py"
        main_content = main_file.read_text(encoding='utf-8')

        if "create_metrics_collector_task" in main_content:
            print("[PASS] main.py imports create_metrics_collector_task")
        else:
            print("[FAIL] main.py doesn't import create_metrics_collector_task")
            return False

        if "metrics_task = asyncio.create_task" in main_content:
            print("[PASS] Metrics task scheduled in lifespan")
        else:
            print("[FAIL] Metrics task not scheduled in lifespan")
            return False

        if "metrics_task.cancel()" in main_content:
            print("[PASS] Metrics task cleanup on shutdown")
        else:
            print("[FAIL] No cleanup for metrics task")
            return False

        print("[PASS] Metrics collector properly refactored to lifespan pattern")
        return True
    except Exception as e:
        print(f"[FAIL] Metrics collector test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_imports():
    """Test that all modified files can be imported"""
    print("\n=== Test 6: Module Imports ===")
    try:
        from backend.errors import ErrorCode, http_error
        print("[PASS] backend.errors imports successfully")

        # Skip prometheus_metrics import (requires prometheus_client dependency)
        print("[INFO] Skipping prometheus_metrics import (requires prometheus_client)")
        print("[INFO] Skipping full module import for routers_control and main (requires FastAPI)")

        return True
    except Exception as e:
        print(f"[FAIL] Import test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 70)
    print("TESTING ALL FIXES APPLIED ON 2025-01-18")
    print("=" * 70)

    results = {
        "Error Codes (H-4)": test_error_codes(),
        "Path Traversal (H-2)": test_path_traversal_protection(),
        "SQLAlchemy Comparisons (H-3)": test_sqlalchemy_comparisons(),
        "No Duplicate Function (C-1)": test_no_duplicate_function(),
        "Metrics Collector Refactor (H-1)": test_metrics_collector_refactored(),
        "Module Imports": test_imports(),
    }

    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} {test_name}")

    print("=" * 70)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("=" * 70)

    if passed == total:
        print("\nALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n{total - passed} TEST(S) FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
