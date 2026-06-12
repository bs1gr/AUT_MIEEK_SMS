#!/usr/bin/env python3
"""
One-time migration script to fix permissions table schema.
Removes the legacy 'name' column using SQLite's batch mode.
"""

import sqlite3
from pathlib import Path


def main():
    """Remove the 'name' column from permissions table."""
    db_path = Path(__file__).parent.parent.parent / "data" / "student_management.db"

    print(f"🔧 Migrating permissions table in: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get current schema
    cursor.execute("PRAGMA table_info(permissions)")
    columns = cursor.fetchall()
    print("\n📋 Current schema:")
    for col in columns:
        print(f"   {col}")

    # Check if 'name' column exists
    has_name = any(col[1] == "name" for col in columns)

    if not has_name:
        print("\n✅ No migration needed - 'name' column already removed")
        conn.close()
        return

    print("\n⚠️  Found legacy 'name' column - migrating...")

    # Create new table without 'name' column
    cursor.execute("""
        CREATE TABLE permissions_new (
            id INTEGER PRIMARY KEY,
            description TEXT,
            "key" VARCHAR(100) NOT NULL UNIQUE,
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # Copy data (use key as fallback for name)
    cursor.execute("""
        INSERT INTO permissions_new
        (id, description, "key", resource, action, is_active, created_at, updated_at)
        SELECT id, description, COALESCE("key", name), resource, action, is_active, created_at, updated_at
        FROM permissions
    """)

    # Drop old table and rename new one
    cursor.execute("DROP TABLE permissions")
    cursor.execute("ALTER TABLE permissions_new RENAME TO permissions")

    # Recreate indexes
    cursor.execute('CREATE UNIQUE INDEX idx_permissions_key ON permissions ("key")')
    cursor.execute("CREATE INDEX idx_permissions_resource ON permissions (resource)")
    cursor.execute("CREATE INDEX idx_permissions_is_active ON permissions (is_active)")
    cursor.execute("CREATE INDEX ix_permissions_id ON permissions (id)")
    cursor.execute("CREATE INDEX ix_permissions_is_active ON permissions (is_active)")
    cursor.execute('CREATE INDEX ix_permissions_key ON permissions ("key")')
    cursor.execute("CREATE INDEX ix_permissions_resource ON permissions (resource)")

    conn.commit()

    # Verify new schema
    cursor.execute("PRAGMA table_info(permissions)")
    new_columns = cursor.fetchall()
    print("\n✅ New schema:")
    for col in new_columns:
        print(f"   {col}")

    conn.close()
    print("\n🎉 Migration complete!")


if __name__ == "__main__":
    main()
