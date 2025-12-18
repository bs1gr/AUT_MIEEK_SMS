# Backup Verification Report

Date: 2025-12-18

## Summary
- Total backups checked: 279
- Backups passing verification: 0
- Backups failing verification: 279
- Most common issue: Missing table 'attendance' in all backups

## Details
All backups in `backups/` failed verification due to missing the required table `attendance`. No integrity errors or corruption were reported, but the schema is incomplete in every backup file.

### Next Steps
- Investigate why the `attendance` table is missing from all backups.
- Review backup creation and migration scripts to ensure all required tables are included.
- Consider restoring a backup and running migrations to bring it up to date, then re-verify.

---

_Automated by backup verification script on 2025-12-18._
