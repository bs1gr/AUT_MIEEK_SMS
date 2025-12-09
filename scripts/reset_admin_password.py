import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.config import settings
from backend.scripts.admin.bootstrap import ensure_default_admin_account
from backend.db import SessionLocal

# Force reset flag
setattr(settings, 'DEFAULT_ADMIN_FORCE_RESET', True)
# Run bootstrap
ensure_default_admin_account(settings=settings, session_factory=SessionLocal)

# Verify
from backend import models
s = SessionLocal()
user = s.query(models.User).filter(models.User.email=='admin@example.com').first()
print('after reset: found=', bool(user))
if user:
    print('id', user.id, 'email', user.email, 'role', user.role)
    print('hashed pw len', len(getattr(user,'hashed_password','')))
s.close()
