#!/usr/bin/env python
"""Diagnostic script to identify migration errors on the other PC.

Run this on the PC with the lite version to see detailed error messages.
Usage: python diagnose_migration.py
"""
import os
import sys
from pathlib import Path

# Set up environment for SQLite (same as lite_simple_entrypoint.py does)
appdata = Path.home() / 'AppData' / 'Local' / 'SMS_Native_Lite_Simple'
appdata.mkdir(parents=True, exist_ok=True)

os.environ['DATABASE_URL'] = f'sqlite:///{appdata / "sms_lite.db"}'
os.environ['SMS_ENV'] = 'development'
os.environ['DEFAULT_ADMIN_EMAIL'] = 'admin@sms-lite.app'
os.environ['DEFAULT_ADMIN_PASSWORD'] = 'AdminPassword123!'
os.environ['DEFAULT_ADMIN_FULL_NAME'] = 'System Administrator'

print("=" * 70)
print("SMS NATIVE LITE - MIGRATION DIAGNOSTIC")
print("=" * 70)
print()

print(f"AppData directory: {appdata}")
print(f"Database path: {appdata / 'sms_lite.db'}")
print(f"Database exists: {(appdata / 'sms_lite.db').exists()}")
print()

# Try to run migrations with verbose output
print("Running migrations with detailed error reporting...")
print("-" * 70)
try:
    from backend.scripts.migrate.runner import run_migrations
    result = run_migrations(verbose=True)
    print("-" * 70)
    if result:
        print("\n✅ Migrations succeeded!")

        # Try to create admin account
        print("\nCreating admin account...")
        from backend.scripts.admin.bootstrap import ensure_default_admin_account
        from backend.config import Settings
        from backend.db import SessionLocal

        settings = Settings()
        ensure_default_admin_account(
            settings=settings,
            session_factory=SessionLocal,
            logger=None,
            close_session=True,
        )
        print("✅ Admin account created!")
        print("\nYou can now login with:")
        print(f"  Email: admin@sms-lite.app")
        print(f"  Password: AdminPassword123!")
    else:
        print("\n❌ Migrations FAILED (returned False)")

        # Try to read the migrations log
        log_file = appdata / 'migrations.log'
        if log_file.exists():
            print("\nMigrations log content:")
            print("=" * 70)
            with open(log_file, 'r') as f:
                content = f.read()
                print(content if content else "(empty)")
            print("=" * 70)
        else:
            print(f"\nNo migrations log found at: {log_file}")

except Exception as e:
    import traceback
    print("-" * 70)
    print(f"\n❌ FATAL ERROR: {type(e).__name__}: {e}")
    print("\nFull traceback:")
    print(traceback.format_exc())
    sys.exit(1)
