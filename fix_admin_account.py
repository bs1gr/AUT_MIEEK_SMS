#!/usr/bin/env python
"""Fix admin account creation for lite versions."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

# Set QNAP credentials
os.environ['DATABASE_URL'] = 'postgresql+psycopg://sms_user:TestAdmin2026!@172.16.0.2:55433/student_management'
os.environ['DEFAULT_ADMIN_EMAIL'] = 'admin@sms-lite.app'
os.environ['DEFAULT_ADMIN_PASSWORD'] = 'AdminPassword123!'
os.environ['DEFAULT_ADMIN_FULL_NAME'] = 'System Administrator'

from backend.scripts.admin.bootstrap import ensure_default_admin_account
from backend.config import Settings
from backend.db import SessionLocal

print("=" * 60)
print("FIXING ADMIN ACCOUNT")
print("=" * 60)
print()

try:
    settings = Settings()
    print(f'✅ Settings loaded')
    print(f'   AUTH_ENABLED: {settings.AUTH_ENABLED}')
    print(f'   DEFAULT_ADMIN_EMAIL: admin@sms-lite.app')
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
    admin = db.query(User).filter(User.email == 'admin@sms-lite.app').first()
    if admin:
        print('✅ Account created/verified!')
        print(f'   Email: {admin.email}')
        print(f'   Role: {admin.role}')
        print(f'   Active: {admin.is_active}')
        print(f'   Password change required: {admin.password_change_required}')
        print()
        print('✅ Ready to test login')
    else:
        print('❌ Account not found after bootstrap')
        sys.exit(1)
finally:
    db.close()
