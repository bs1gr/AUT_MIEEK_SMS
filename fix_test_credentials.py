#!/usr/bin/env python3
"""Quick fix for E2E test credentials."""

import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config import settings
from backend.models import User
from backend.security.password_hash import get_password_hash

DATABASE_URL = settings.DATABASE_URL
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Fix test@example.com
    user1 = db.query(User).filter(User.email == "test@example.com").first()
    if user1:
        user1.hashed_password = get_password_hash("Test@Pass123")
        print(f"✅ Updated test@example.com password")
    else:
        print("❌ test@example.com not found")

    # Fix admin@example.com
    user2 = db.query(User).filter(User.email == "admin@example.com").first()
    if user2:
        user2.hashed_password = get_password_hash("YourSecurePassword123!")
        print(f"✅ Updated admin@example.com password")
    else:
        print("❌ admin@example.com not found")

    db.commit()
    print("✅ Credentials fixed!")
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
