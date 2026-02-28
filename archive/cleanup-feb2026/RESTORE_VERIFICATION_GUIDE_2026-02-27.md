# Database Restore Verification Guide

**Date**: February 27, 2026  
**Status**: Code fixed and committed ✅  
**Commits Applied**:
- `4ad925f20` - fix(restore): pass backup_name without .enc to service (fixes encrypted backup decryption)
- `d9bc914fb` - fix(students): format historical record dates to Greek format (DD/MM/YYYY)  
- `7fbdf6a5f` - refactor(native): harden native mode stability and error handling

---

## ✅ What Was Fixed

### 1. **Encrypted Backup Restore** (Operations.py - Line 898)
**Problem**: Backup service adds `.enc` extension automatically, but code was passing filename that already included `.enc`, causing `.enc.enc` lookup failures.

**Solution**:
```python
# BEFORE (Bug):
restore_info = backup_service.restore_encrypted_backup(
    backup_name=backup_filename,  # ❌ "backup_20260227_232043.enc"
    ...
)

# AFTER (Fixed):
restore_info = backup_service.restore_encrypted_backup(
    backup_name=backup_name,  # ✅ "backup_20260227_232043" (no .enc)
    ...
)
```

**Impact**: Encrypted backups (`.enc` files) now decrypt and restore correctly.

---

## 🧪 Manual Verification Steps

### Step 1: Start Native Mode
```powershell
cd d:\SMS\student-management-system
.\NATIVE.ps1 -Start
```

**Wait 10-15 seconds for startup**, then verify:
- Backend: http://localhost:8000/health (should return 200)
- Frontend: http://localhost:5173 (should load UI)

---

### Step 2: Navigate to Operations Page
1. Open http://localhost:5173 in browser
2. Login if needed (admin credentials)
3. Click **Operations** in left sidebar
4. Find **RESTORE** section

---

### Step 3: Test Encrypted Backup Restore

**Latest Backup to Test**:
- File: `backup_20260227_232043.enc`
- Size: 967 KB
- Content: 3 users, 4 students, 2 courses
- Format: AES-256-GCM encrypted SQLite database

**Restore Process**:
1. Click RESTORE button in Operations page
2. Select `backup_20260227_232043.enc` from dropdown
3. Click **Restore Database**
4. Wait for success message

**Expected Result**:
✅ "Database restored successfully from backup_20260227_232043.enc (encrypted backup decrypted: 967 KB)"

**If Successful, Verify**:
- Check that database contains expected data
- Navigate to Students page - should see 4 students
- Navigate to Courses page - should see 2 courses
- Check Users in database - should be 3 users

---

### Step 4: Verify Date Formatting

While on Students page:
1. Expand any student card
2. View **Historical Records** section
3. Check **Past Grades** and **Past Attendance** dates

**Expected Format**: DD/MM/YYYY (Greek format)  
**Example**: `27/02/2026` instead of `2026-02-27`

✅ All dates should now display in Greek format consistently

---

## 🔍 Troubleshooting

### Backend Not Starting
```powershell
# Check status
.\NATIVE.ps1 -Status

# If not running, stop and restart
.\NATIVE.ps1 -Stop
.\NATIVE.ps1 -Start
```

### Port Already in Use
```powershell
# NATIVE.ps1 auto-recovers ports, but if it fails:
netstat -ano | findstr ":8000"
# Kill the process using: taskkill /PID <PID> /F
```

### Restore Fails
Check browser console (F12) for error messages:
- 404: Endpoint not found (backend not running)
- 400: Invalid backup file
- 500: Server error (check logs)

---

## 📝 Additional Changes in This Session

### Date Selector in Grade History (GradingView.tsx)
- Always shows date selector when editing grades
- Uses grade's date or today's date as default
- Updated labels: "History date" → "Date"
- Banner: "Viewing past date" → "Editing past date"

### Enhanced Error Handling (errorMessage.ts)
- Better nested error extraction
- RFC 7807 problem details support
- Improved null/empty value handling

### Native Mode Stability (NATIVE.ps1, config.py, admin_routes.py)
- Forces DATABASE_URL from `backend/.env` to prevent drift
- Ensures Node.js in PATH for all processes
- Optional psutil with graceful fallback
- More robust process management

---

## ✅ Success Criteria

**All Functionality Working When**:
1. ✅ Encrypted backups restore successfully
2. ✅ Database contains expected data after restore
3. ✅ All dates display in Greek format (DD/MM/YYYY)
4. ✅ Grade history edit shows date selector
5. ✅ No console errors in browser (F12)

---

## 📞 Next Steps

If restore verification is successful:
1. ✅ Mark "Verify restore works in UI" as complete in TODO list
2. ✅ Close restore functionality work
3. 🎉 All three initial issues resolved!

If issues remain:
- Check browser console for specific errors
- Verify backend logs in terminal
- Test with non-encrypted backup first
- Report specific error messages

---

**Status**: Ready for manual testing ✅  
**System**: Native mode prepared and configured  
**Code**: All fixes committed and pushed to origin/main
