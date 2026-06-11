# SMS vvv1.18.25 Installer Real Test Results

**Date:** June 3, 2026  
**Tester:** User (Vasilis)  
**Test Type:** Real-world installation test

---

## ✅ PASSING TESTS

### Test 1: Installation Completes Successfully
- **Status:** ✅ PASSED
- **Result:** SMS_Installer_1.18.24.exe installed without errors
- **Location:** C:\Program Files (x86)\SMS-UT\

### Test 2: Correct Application Version
- **Status:** ✅ PASSED  
- **Result:** SMS_Lite.exe shows vvv1.18.25 (NOT vvv1.18.25)
- **Verified:** ✅ Version string is correct
- **Previous Issue:** FIXED - No longer shows vvv1.18.25

### Test 3: Application Launches
- **Status:** ✅ PASSED
- **Result:** SMS_Lite.exe launches successfully and opens web interface
- **URL:** http://127.0.0.1:8000

### Test 4: Database Initialization
- **Status:** ✅ PASSED
- **Result:** Local SQLite database created automatically
- **Location:** C:\Users\Vasilis\AppData\Local\SMS_Native_Lite_Simple\sms_lite.db
- **Size:** Database file exists and has content

### Test 5: Lite Edition Completion Page
- **Status:** ⚠️ ISSUE FOUND (Displays Docker information)
- **Expected:** Lite-specific completion page
- **Actual:** Shows Docker information during install
- **Root Cause:** Installer final message shows Docker info instead of Lite info
- **Note:** This is cosmetic; doesn't affect functionality

---

## ❌ FAILING TESTS

### Test 6: QNAP Credentials File Selection
- **Status:** ❌ FAILED
- **Expected:** Select JSON file → Auto-populate fields → Save to credentials file
- **Actual:** Selected JSON file but fields did NOT auto-populate
- **Result:** Credentials file not created
- **Location:** C:\Users\Vasilis\AppData\Local\SMS_Native_Lite_Simple\local-secrets\qnap-credentials.json
- **Problem:** File browse + auto-populate feature not working

### Test 7: QNAP Connection
- **Status:** ❌ FAILED (No credentials file)
- **Expected:** Connect to QNAP PostgreSQL database
- **Actual:** Using local SQLite (credentials not saved)
- **Reason:** See Test 6 - credentials file was not created

---

## 🔍 ROOT CAUSE ANALYSIS

### Why QNAP Credentials Weren't Saved

The installer code (SMS_Installer.iss, line 2533) shows:
```pascal
if LiteQnapYesRadio.Checked and (all fields filled) then
  SaveLiteEditionQnapCredentials(...)
```

**The problem:**
1. When you selected "Yes, I want QNAP"
2. You clicked "Browse..." to select the JSON file
3. The file browser opened, but the `LoadLiteQnapCredentialsFromFile()` callback didn't work properly
4. The UI fields remained empty
5. The post-install code checked if fields were filled
6. Since fields were empty, credentials were NOT saved

**What should have happened:**
1. Browse button clicked → file dialog
2. JSON file selected
3. Parser reads host, port, dbname, user, password from file
4. Fields auto-populate in the installer UI
5. Post-install code detects filled fields and saves to qnap-credentials.json

---

## 🛠️ WORKAROUND FOR NOW

Since the file selection feature has a bug, I've created a credentials file manually:

**Location:** C:\Users\Vasilis\AppData\Local\SMS_Native_Lite_Simple\local-secrets\qnap-credentials.json

**To enable QNAP:**
1. Open the credentials file above
2. Replace these placeholder values:
   - `host`: Your QNAP IP or hostname
   - `port`: Usually 5432
   - `dbname`: Your database name
   - `user`: Your PostgreSQL username
   - `password`: Your PostgreSQL password
3. Save the file
4. Restart SMS_Lite.exe
5. It should now connect to QNAP PostgreSQL

---

## 🐛 BUG REPORT

**Issue:** File selection in installer doesn't auto-populate credentials

**Files Involved:**
- `installer/SMS_Installer.iss` (lines 1459-1548 - `LoadLiteQnapCredentialsFromFile()`)
- `installer/SMS_Installer.iss` (lines 2533-2555 - post-install credential save)

**Root Cause:** The `LoadLiteQnapCredentialsFromFile()` function exists but:
1. May not be called properly when Browse button clicked
2. May not update the UI fields correctly
3. May have issues with JSON/ENV parsing

**Fix Needed:** Debug and fix the file browse + auto-populate mechanism

---

## 📊 TEST SUMMARY

| Test Case | Status | Notes |
|-----------|--------|-------|
| Installation | ✅ PASS | Successful |
| App Launch | ✅ PASS | Works correctly |
| Version | ✅ PASS | Correct vvv1.18.25 |
| SQLite DB | ✅ PASS | Auto-created |
| Completion Page | ⚠️ ISSUE | Shows Docker info |
| QNAP File Select | ❌ FAIL | Doesn't auto-populate |
| QNAP Connection | ❌ FAIL | No credentials file |

---

## ✅ NEXT STEPS

1. **Short term (manual workaround):**
   - Edit credentials file manually
   - Restart SMS_Lite.exe
   - Test QNAP connection

2. **Medium term (fix installer):**
   - Debug `LoadLiteQnapCredentialsFromFile()` function
   - Fix file browse + auto-populate mechanism
   - Test with real JSON/ENV files
   - Rebuild installer

3. **Long term:**
   - Add error handling for failed file selection
   - Add validation of credentials before saving
   - Improve user feedback in installer

---

**Test Completed By:** Claude Code + User Testing  
**Version Tested:** SMS_Installer_1.18.24.exe (92.95 MB, built 2026-06-03 15:29:03)


