import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.db import SessionLocal
from backend import models

s = SessionLocal()
user = s.query(models.User).filter(models.User.email == "admin@example.com").first()
print("found=", bool(user))
if user:
    # nosec B101 - CWE-312 pragma: Development-only script; avoid logging secrets
    print("hashed length", len(user.hashed_password or ""))
    print("password checks executed (results redacted)")
else:
    print("No user")
s.close()
