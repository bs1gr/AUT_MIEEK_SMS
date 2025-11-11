"""
One-off script to create an admin user in the database.

Usage:
  python backend/tools/create_admin.py --email admin@example.com

It will prompt for a password if not provided via --password. The script uses the
project's models and database session to create a user with role='admin'.
"""

import getpass
import argparse
import os
import sys

# Ensure repository root is on sys.path so `import backend` resolves correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.db import SessionLocal
from backend.models import User
from backend.routers.routers_auth import get_password_hash


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=False)
    args = parser.parse_args()

    password = args.password
    if not password:
        password = getpass.getpass("Password for admin user: ")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == args.email.lower().strip()).first()
        if existing:
            print(f"User {args.email} already exists (id={existing.id}, role={existing.role})")
            return

        user = User(
            email=args.email.lower().strip(),
            full_name=None,
            role="admin",
            hashed_password=get_password_hash(password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created admin user {args.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
