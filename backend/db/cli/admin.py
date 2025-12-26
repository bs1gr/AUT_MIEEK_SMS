"""
Database administration utilities - create and manage admin users.

Usage:
  python -m backend.db.cli.admin --email admin@example.com

This module provides tools for managing database administrative users.
"""

import argparse
import getpass
import os
import sys

# Ensure repository root is on sys.path so `import backend` resolves correctly
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
)

from backend.db import SessionLocal
from backend.models import User
from backend.security.password_hash import get_password_hash


def create_admin(email: str, password: str | None = None) -> bool:
    """
    Create an admin user in the database.

    Args:
        email: Email address for the admin user
        password: Password (will prompt if not provided)

    Returns:
        True if admin was created, False if already exists
    """
    if not password:
        password = getpass.getpass("Password for admin user: ")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower().strip()).first()
        if existing:
            print(
                f"User {email} already exists (id={existing.id}, role={existing.role})"
            )
            return False

        user = User(
            email=email.lower().strip(),
            full_name=None,
            role="admin",
            hashed_password=get_password_hash(password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created admin user {email}")
        return True
    finally:
        db.close()


def main():
    """CLI entry point for admin creation."""
    parser = argparse.ArgumentParser(description="Create database admin user")
    parser.add_argument("--email", required=True, help="Email address for admin user")
    parser.add_argument(
        "--password", required=False, help="Password (will prompt if not provided)"
    )
    args = parser.parse_args()

    success = create_admin(args.email, args.password)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
