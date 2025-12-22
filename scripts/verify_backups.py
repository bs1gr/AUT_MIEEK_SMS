"""
Backup Verification Script
Scans all .db files in the backups/ directory and checks for SQLite integrity and required tables.
"""

import sqlite3
from pathlib import Path

REQUIRED_TABLES = ["students", "courses", "grades", "attendances"]

BACKUP_DIR = Path(__file__).resolve().parents[1] / "backups"


def verify_backup(db_path: Path) -> dict:
    result = {"file": str(db_path), "ok": False, "error": None, "missing_tables": []}
    try:
        con = sqlite3.connect(str(db_path))
        try:
            # Integrity check
            cur = con.execute("PRAGMA integrity_check;")
            integrity = cur.fetchone()[0]
            if integrity != "ok":
                result["error"] = f"Integrity check failed: {integrity}"
                return result
            # Table check
            cur = con.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = {row[0] for row in cur.fetchall()}
            missing = [t for t in REQUIRED_TABLES if t not in tables]
            result["missing_tables"] = missing
            result["ok"] = not missing
        finally:
            con.close()
    except Exception as e:
        result["error"] = str(e)
    return result


def main():
    print(f"Scanning backups in: {BACKUP_DIR}")
    db_files = list(BACKUP_DIR.glob("*.db"))
    if not db_files:
        print("No .db files found in backups directory.")
        return 1
    results = []
    for db_file in db_files:
        res = verify_backup(db_file)
        results.append(res)
        status = "OK" if res["ok"] else "FAIL"
        print(f"{db_file.name}: {status}")
        if res["error"]:
            print(f"  Error: {res['error']}")
        if res["missing_tables"]:
            print(f"  Missing tables: {res['missing_tables']}")
    # Summary
    ok_count = sum(1 for r in results if r["ok"])
    print(f"\nSummary: {ok_count}/{len(results)} backups passed verification.")
    return 0 if ok_count == len(results) else 2


if __name__ == "__main__":
    raise SystemExit(main())
