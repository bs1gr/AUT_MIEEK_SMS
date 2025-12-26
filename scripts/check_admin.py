import sys
import os

# Ensure project root is on path so runtime imports find 'backend' package
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.db import SessionLocal
from backend import models

s = SessionLocal()
user = s.query(models.User).filter(models.User.email == "admin@example.com").first()
print("found=", bool(user))
if user:
    print("id=", getattr(user, "id", None))
    print("email=", getattr(user, "email", None))
    print("role=", getattr(user, "role", None))
    print("is_active=", getattr(user, "is_active", None))
    print("hashed_password length=", len(getattr(user, "hashed_password", "")))
else:
    print("No user")
s.close()
