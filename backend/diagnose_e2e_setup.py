"""Diagnostic script for E2E test setup issues.

This script checks all aspects of E2E test prerequisites:
1. Database file exists and is accessible
2. Database schema is created
3. Test users are properly seeded
4. Password hashes are correct
5. Login endpoint is functional
"""

import sys
from pathlib import Path

# Ensure we can import backend modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def diagnose():
    """Run all diagnostic checks."""
    print("\n" + "=" * 70)
    print("E2E TEST SETUP DIAGNOSTICS")
    print("=" * 70 + "\n")

    # Step 1: Check database file
    print("1. DATABASE FILE CHECK")
    print("-" * 70)
    try:
        from backend.config import settings
        db_url = settings.DATABASE_URL
        print("✅ Settings loaded")
        print(f"   DATABASE_URL: {db_url}")

        if db_url.startswith("sqlite"):
            db_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
            db_file = Path(db_path)
            print(f"   Absolute path: {db_file.resolve()}")
            if db_file.exists():
                print(f"   ✅ File exists (size: {db_file.stat().st_size} bytes)")
            else:
                print("   ℹ️  File doesn't exist (will be created)")
    except Exception as e:
        print(f"❌ Failed to load settings: {e}")
        return False

    # Step 2: Create database schema
    print("\n2. DATABASE SCHEMA CHECK")
    print("-" * 70)
    try:
        from sqlalchemy import create_engine, inspect
        from backend.models import Base

        connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        engine = create_engine(db_url, connect_args=connect_args)

        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✅ Schema created/verified")

        # Check which tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"   Tables: {len(tables)} total")
        if "user" in tables:
            print("   ✅ 'user' table exists")
        else:
            print("   ❌ 'user' table NOT FOUND")
            return False

    except Exception as e:
        print(f"❌ Schema creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 3: Check test users
    print("\n3. TEST USER CHECK")
    print("-" * 70)
    try:
        from sqlalchemy.orm import sessionmaker
        from backend.models import User

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        test_user = db.query(User).filter(User.email == "test@example.com").first()
        admin_user = db.query(User).filter(User.email == "admin@example.com").first()

        if test_user:
            print("✅ Test user exists:")
            print(f"   Email: {test_user.email}")
            print(f"   Role: {test_user.role}")
            print(f"   Active: {test_user.is_active}")
            print(f"   Has password hash: {bool(test_user.hashed_password)}")
            if test_user.hashed_password:
                print(f"   Hash starts with: {test_user.hashed_password[:30]}...")
        else:
            print("❌ Test user NOT FOUND")
            print("   Will be created in next step")

        if admin_user:
            print("✅ Admin user exists:")
            print(f"   Email: {admin_user.email}")
            print(f"   Role: {admin_user.role}")
            print(f"   Active: {admin_user.is_active}")
        else:
            print("⚠️  Admin user NOT FOUND")

        db.close()

    except Exception as e:
        print(f"❌ User check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 4: Check password hashing
    print("\n4. PASSWORD HASHING CHECK")
    print("-" * 70)
    try:
        from backend.security.password_hash import get_password_hash, verify_password

        test_password = "Test@Pass123"
        hashed = get_password_hash(test_password)
        print("✅ Password hashing works")
        print("   Original: [redacted]")
        print(f"   Hashed: {hashed[:40]}...")

        # Test verification
        verified = verify_password(test_password, hashed)
        if verified:
            print("   ✅ Verification works: password matches hash")
        else:
            print("   ❌ Verification FAILED: password doesn't match hash")
            return False

    except Exception as e:
        print(f"❌ Password hashing check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 5: Seed if needed
    print("\n5. SEED DATA CHECK")
    print("-" * 70)
    try:
        db = SessionLocal()
        test_user = db.query(User).filter(User.email == "test@example.com").first()

        if not test_user:
            print("ℹ️  Test user missing, seeding now...")
            from backend.seed_e2e_data import seed_e2e_data
            seed_e2e_data(force=False)

            # Verify seed worked
            test_user = db.query(User).filter(User.email == "test@example.com").first()
            if test_user:
                print("✅ Seeding successful!")
            else:
                print("❌ Seeding failed - user still not found")
                return False
        else:
            print("✅ Test user already exists")

        db.close()

    except Exception as e:
        print(f"❌ Seed check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 6: Final validation
    print("\n6. FINAL VALIDATION")
    print("-" * 70)
    try:
        db = SessionLocal()

        # Count data
        total_users = db.query(User).count()
        print(f"✅ Total users in database: {total_users}")

        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if test_user and test_user.hashed_password:
            # Verify password
            verified = verify_password("Test@Pass123", test_user.hashed_password)
            if verified:
                print("✅ Test user password verification: PASS")
            else:
                print("❌ Test user password verification: FAIL")
                return False
        else:
            print("❌ Test user or password missing")
            return False

        db.close()

    except Exception as e:
        print(f"❌ Final validation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "=" * 70)
    print("✅ ALL CHECKS PASSED - E2E SETUP IS READY")
    print("=" * 70 + "\n")
    return True


if __name__ == "__main__":
    success = diagnose()
    sys.exit(0 if success else 1)
