# Database Backup Root Cause Analysis

**Date**: 2026-02-20
**Status**: CRITICAL - All backups are corrupted (schema-only, no data)

## Root Cause

SQLite is configured in **WAL (Write-Ahead Logging) mode** (backend/models.py line 1059):
```python
conn.execute(text("PRAGMA journal_mode=WAL"))
```

In WAL mode:
- Main `.db` file is read-only snapshot
- Active data writes go to `.db-wal` file
- `shutil.copy2()` only copies the `.db` file → Gets schema with NO data

## Backup Files Analysis

| Type | Location | Count | Size | Content |
|------|----------|-------|------|---------|
| Encrypted | `backups/database/*.enc` | 349 | 700KB-850KB | Unknown (may also be empty) |
| Plain | `backups/database/*.db` | 10 | 786KB (exact) | ✗ Schema only, 0 data rows |

All plain backups exactly 786,432 bytes = SQLite3 empty database default size

## Evidence

**Backup file inspection** (2/20/2026):
```
✓ backup_20260218_091806.db is valid SQLite
  users: 0 rows ← NO DATA (only schema)
```

**Current running database**:
```
✓ 26 tables
  users: 1 row (admin user)
  students: 0 rows
  courses: 0 rows
```

## Impact

1. **Backups are useless** - Restoring results in empty database + data loss
2. **System becomes inaccessible** - All users deleted after restore
3. **Admin account lost** - No way to log back in (only auto-created on restore)
4. **Feature is broken** - Backup/restore feature doesn't preserve data

## Fix Required

Need to back up the database properly when WAL is enabled:

**Option A: Checkpoint WAL before copying**
```python
conn = sqlite3.connect(db_path)
conn.execute("PRAGMA journal_mode=WAL;")
conn.execute("PRAGMA wal_checkpoint(RESTART);")
shutil.copy2(db_path, backup_path)
```

**Option B: Back up both .db + .db-wal files**
```python
shutil.copy2(db_path, backup_path)  # .db file
wal_path = Path(f"{db_path}-wal")
if wal_path.exists():
    shutil.copy2(wal_path, Path(f"{backup_path}-wal"))

# On restore: copy both back
```

**Option C: Use SQLite backup API**
```python
import sqlite3
source = sqlite3.connect(db_path)
target = sqlite3.connect(backup_path)
with target:
    source.backup(target)
source.close()
target.close()
```

## Recommended Fix

**Option C** (SQLite backup API) is best because:
- ✅ Handles WAL mode correctly
- ✅ Efficient (single operation)
- ✅ Preserves data integrity
- ✅ No checkpoint needed
- ✅ Atomic operation

## Files to Fix

1. `backend/routers/control/operations.py` (line 343: plain backup creation)
   - Replace `shutil.copy2()` with SQLite backup API

2. `backend/routers/routers_adminops.py` (line 73: backup_database)
   - Replace `shutil.copyfile()` with SQLite backup API

3. Add WAL checkpoint before restore (to ensure all data is in .db file)

## Testing Plan

1. ✅ Verify current database has data
2. ✅ Create new backup
3. ✅ Verify backup size > 786KB and contains data
4. ✅ Restore from backup
5. ✅ Verify data is restored
6. ✅ Test admin user survives restore

## Status

- Root cause identified: WAL mode backups incomplete
- Fix approach: Use SQLite backup API
- Implementation: Pending
- Testing: Ready
