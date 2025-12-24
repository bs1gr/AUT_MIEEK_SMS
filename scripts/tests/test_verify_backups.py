import sqlite3
from pathlib import Path
import sys

# Import the script as a module
import importlib.util

SCRIPT_PATH = Path(__file__).parents[1] / "verify_backups.py"
spec = importlib.util.spec_from_file_location("verify_backups", SCRIPT_PATH)
verify_backups = importlib.util.module_from_spec(spec)
sys.modules["verify_backups"] = verify_backups
spec.loader.exec_module(verify_backups)


def create_test_db(path: Path, tables=None, corrupt=False):
    if corrupt:
        with open(path, "wb") as f:
            f.write(b"not a real sqlite db")
        return
    con = sqlite3.connect(str(path))
    try:
        if tables:
            for t in tables:
                con.execute(f"CREATE TABLE {t} (id INTEGER PRIMARY KEY)")
        con.commit()
    finally:
        con.close()


def test_verify_backup_ok(tmp_path):
    db = tmp_path / "ok.db"
    create_test_db(db, tables=verify_backups.REQUIRED_TABLES)
    result = verify_backups.verify_backup(db)
    assert result["ok"]
    assert not result["missing_tables"]
    assert result["error"] is None


def test_verify_backup_missing_tables(tmp_path):
    db = tmp_path / "missing.db"
    create_test_db(db, tables=["students", "courses"])
    result = verify_backups.verify_backup(db)
    assert not result["ok"]
    assert set(result["missing_tables"]) == {"grades", "attendance"}
    assert result["error"] is None


def test_verify_backup_corrupt(tmp_path):
    db = tmp_path / "corrupt.db"
    create_test_db(db, corrupt=True)
    result = verify_backups.verify_backup(db)
    assert not result["ok"]
    assert result["error"] is not None


def test_main_summary(tmp_path, monkeypatch):
    # Create several DBs
    db1 = tmp_path / "ok.db"
    db2 = tmp_path / "bad.db"
    db3 = tmp_path / "partial.db"
    create_test_db(db1, tables=verify_backups.REQUIRED_TABLES)
    create_test_db(db2, corrupt=True)
    create_test_db(db3, tables=["students", "courses"])
    # Patch BACKUP_DIR
    monkeypatch.setattr(verify_backups, "BACKUP_DIR", tmp_path)
    # Capture output
    import io
    import contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = verify_backups.main()
    out = buf.getvalue()
    assert "ok.db: OK" in out
    assert "bad.db: FAIL" in out
    assert "partial.db: FAIL" in out
    assert "Summary: 1/3 backups passed verification." in out
    assert rc == 2
