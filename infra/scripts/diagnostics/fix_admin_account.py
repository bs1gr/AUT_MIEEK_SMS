#!/usr/bin/env python
"""Fix admin account creation for lite versions."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

# Default admin credentials, used only if not already set by the caller.
# These match the documented Native Lite default account. Using setdefault
# (not a direct assignment) means an operator who exports their own
# DEFAULT_ADMIN_* env vars - e.g. to repair a real, non-Lite admin account -
# is honored instead of silently overridden by this script.
os.environ.setdefault('DEFAULT_ADMIN_EMAIL', 'admin@sms-lite.app')
os.environ.setdefault('DEFAULT_ADMIN_PASSWORD', 'AdminPassword123!')
os.environ.setdefault('DEFAULT_ADMIN_FULL_NAME', 'System Administrator')
# Do not log credentials to avoid security vulnerability

# DATABASE_URL should be set via environment variable or .env file
# It is NOT hardcoded here for security reasons
if 'DATABASE_URL' not in os.environ:
    print("⚠️  Warning: DATABASE_URL environment variable not set")
    print("Please set DATABASE_URL before running this script")
    print("Example: postgresql+psycopg://user:pass@host:port/dbname")

from backend.scripts.admin.bootstrap import ensure_default_admin_account
from backend.config import Settings
from backend.db import SessionLocal

print("=" * 60)
print("FIXING ADMIN ACCOUNT")
print("=" * 60)
print()

try:
    settings = Settings()
    print('✅ Settings loaded')
    print(f'   AUTH_ENABLED: {settings.AUTH_ENABLED}')
    print(f"   DEFAULT_ADMIN_EMAIL: {os.environ['DEFAULT_ADMIN_EMAIL']}")
    print()

    print('Running bootstrap...')
    ensure_default_admin_account(
        settings=settings,
        session_factory=SessionLocal,
        logger=None,
        close_session=True,
    )
    print()
    print('✅ Bootstrap completed')

except Exception as e:
    import traceback
    print(f'❌ Bootstrap failed: {e}')
    traceback.print_exc()
    sys.exit(1)

print()
print("=" * 60)
print("VERIFYING ACCOUNT")
print("=" * 60)
print()

from backend.models import User

db = SessionLocal()
try:
    admin = db.query(User).filter(User.email == os.environ['DEFAULT_ADMIN_EMAIL']).first()
    if admin:
        print('✅ Account created/verified!')
        print(f'   Email: {admin.email}')
        print(f'   Role: {admin.role}')
        print(f'   Active: {admin.is_active}')
        print()
        print('✅ Ready to test login')
    else:
        print('❌ Account not found after bootstrap')
        sys.exit(1)
finally:
    db.close()
