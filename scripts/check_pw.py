import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.db import SessionLocal
from backend import models
from backend.routers.routers_auth import verify_password
from backend.config import settings

s = SessionLocal()
user = s.query(models.User).filter(models.User.email == "admin@example.com").first()
print("found=", bool(user))
if user:
    # nosec B101 - CWE-312 pragma: Development-only password verification script
    print("hashed", user.hashed_password)
    print("check admin123 ->", verify_password("admin123", user.hashed_password))
    print(
        "check YourSecurePassword123! ->",
        verify_password("YourSecurePassword123!", user.hashed_password),
    )
    print(
        "check settings.DEFAULT_ADMIN_PASSWORD ->",
        verify_password(settings.DEFAULT_ADMIN_PASSWORD or "", user.hashed_password),
    )
else:
    print("No user")
s.close()
