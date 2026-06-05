# Lite Edition QNAP Configuration - File Selection UI

**Version:** v1.18.24  
**Date:** June 3, 2026  
**Installer:** SMS_Installer_1.18.24.exe

---

## Installation Page: "QNAP Database Configuration (Optional)"

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  QNAP Database Configuration (Optional)                          │
│                                                                  │
│  Configure connection to QNAP PostgreSQL database               │
│                                                                  │
│  SMS Lite Edition uses a local SQLite database by default.      │
│  If you have a QNAP NAS with PostgreSQL, you can optionally    │
│  configure it here.                                             │
│                                                                  │
│  ○ Yes, I want to use QNAP PostgreSQL                           │
│  ◉ No, use local SQLite database                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### When "Yes, I want to use QNAP PostgreSQL" is Selected

```
┌─────────────────────────────────────────────────────────────────┐
│  QNAP Database Configuration (Optional)                          │
│                                                                  │
│  ◉ Yes, I want to use QNAP PostgreSQL                           │
│  ○ No, use local SQLite database                                │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                  │
│  Select credentials file (.json or .env):                       │
│                                                                  │
│  ┌─────────────────────────────────────────┐  ┌──────────┐     │
│  │ C:\path\to\qnap-credentials.json      │  │ Browse.. │     │
│  └─────────────────────────────────────────┘  └──────────┘     │
│                                                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│           — OR —                                                │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                  │
│  Or enter credentials manually:                                 │
│                                                                  │
│  QNAP IP or DNS name:              Port:                        │
│  ┌──────────────────────────┐     ┌──────────┐                 │
│  │ qnap.local               │     │ 5432     │                 │
│  └──────────────────────────┘     └──────────┘                 │
│                                                                  │
│  Database name:                                                 │
│  ┌──────────────────────────────────────────┐                 │
│  │ student_management                      │                 │
│  └──────────────────────────────────────────┘                 │
│                                                                  │
│  Username:                        Password:                     │
│  ┌──────────────────────────┐     ┌──────────────────┐         │
│  │                          │     │ ••••••••••••••  │         │
│  └──────────────────────────┘     └──────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                    [Πίσω]  [Επόμενο]  [Άκυρο]
                    [Back]  [Next]    [Cancel]
```

---

## File Browse Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  Select QNAP Credentials File          [_][□][x]           │
├─────────────────────────────────────────────────────────────┤
│ Look in: [C:\Users\Vasilis\Documents ▼]                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ qnap-credentials.json                 JSON  1 KB  ..   │ │
│  │ qnap.env                              ENV   2 KB  ..   │ │
│  │ backup-postgres.json                  JSON 15 KB  ..   │ │
│  │ .                                                       │ │
│  │ ..                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│ File name: [qnap-credentials.json      ▼]                  │
│ File type: [JSON Files (*.json)|ENV Files (*.env)|All (*.)]│
│                                                              │
│                       ┌─────────────┐  ┌────────┐          │
│                       │    Open     │  │ Cancel │          │
│                       └─────────────┘  └────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Supported File Formats

### JSON Format

**File Name:** `qnap-credentials.json`

```json
{
  "host": "192.168.1.100",
  "port": 5432,
  "dbname": "student_management",
  "user": "postgres",
  "password": "your_secure_password",
  "sslmode": "prefer"
}
```

**What Happens:**
- Browse button opens file dialog
- User selects `qnap-credentials.json`
- Installer detects JSON format (looks for `"host"` key)
- Extracts values: host, port, dbname, user, password
- Auto-fills fields with extracted values
- User sees "Credentials loaded from file" confirmation
- Can verify and edit if needed before clicking Next

### ENV Format

**File Name:** `.env` or `qnap.env`

```
POSTGRES_HOST=192.168.1.100
POSTGRES_PORT=5432
POSTGRES_DB=student_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SSLMODE=prefer
```

**What Happens:**
- Browse button opens file dialog
- User selects `.env` file
- Installer detects ENV format (looks for `POSTGRES_*` keys)
- Extracts values from KEY=VALUE pairs
- Auto-fills fields with extracted values
- User sees "Credentials loaded from file" confirmation
- Can verify and edit if needed before clicking Next

---

## User Workflows

### Workflow 1: Using Credentials File (Recommended)

**Precondition:** User has credentials saved to `qnap-credentials.json` or `.env`

1. Run `SMS_Installer_1.18.24.exe`
2. Select **"Lite Edition"**
3. On QNAP Configuration page, select **"Yes, I want to use QNAP PostgreSQL"**
4. Click **"Browse..."** button
5. Navigate to and select `qnap-credentials.json` (or `.env`)
6. **Installer automatically:**
   - Detects file format (JSON or ENV)
   - Extracts all 5 credentials
   - Populates all fields
   - Shows "Credentials loaded from file" message
7. Click **"OK"** on confirmation dialog
8. Verify fields look correct (optional edit available)
9. Click **"Next >"** to continue
10. Installation completes
11. SMS_Lite.exe starts with QNAP configured ✅

**Result:** 30 seconds to setup, minimal typing, zero mistakes

---

### Workflow 2: Manual Entry (Fallback)

**Precondition:** User doesn't have credentials file available

1. Run `SMS_Installer_1.18.24.exe`
2. Select **"Lite Edition"**
3. On QNAP Configuration page, select **"Yes, I want to use QNAP PostgreSQL"**
4. **Skip** file selection (or leave blank)
5. Manually enter in the fields below:
   - **Host:** `192.168.1.100` (or DNS like `qnap.local`)
   - **Port:** `5432`
   - **Database:** `student_management`
   - **Username:** `postgres` or QNAP user
   - **Password:** Your QNAP password
6. Click **"Next >"** to continue
7. Installation completes
8. SMS_Lite.exe starts with QNAP configured ✅

**Result:** Manual typing, same as before, backward compatible

---

### Workflow 3: SQLite Default (No QNAP)

**Precondition:** User doesn't have QNAP or prefers local database

1. Run `SMS_Installer_1.18.24.exe`
2. Select **"Lite Edition"**
3. On QNAP Configuration page, **"No, use local SQLite"** is already selected
4. All file selection and credential fields are **hidden**
5. Click **"Next >"** to continue
6. Installation completes
7. SMS_Lite.exe starts with **local SQLite** ✅

**Result:** Default experience, zero configuration needed

---

## Error Handling

### If File Not Found
```
Error Message: "File not found: C:\path\to\file"
Action: Try browsing again or use manual entry
```

### If File Format Invalid
```
Behavior: Installer tries JSON first, then ENV
If neither matches: Fields remain empty
Action: User can edit manually or select different file
```

### If Credentials Incomplete
```
Example: JSON has "host" but missing "port"
Behavior: Only filled fields are populated
Action: User completes remaining fields manually
```

### If Parsing Fails
```
Behavior: Shows confirmation anyway
Message: "Credentials loaded from file. Please verify the values before continuing."
Action: User can:
  a) Accept and continue if values correct
  b) Edit fields manually
  c) Go back and select different file
```

---

## Confirmation Dialog

When credentials are loaded from file, user sees:

```
┌───────────────────────────────────────────────┐
│  Confirmation                                 │
├───────────────────────────────────────────────┤
│                                               │
│  Credentials loaded from file.                │
│  Please verify the values before continuing. │
│                                               │
│                         [  OK  ]              │
│                                               │
└───────────────────────────────────────────────┘
```

This allows user to:
- Confirm loading was successful
- Review auto-filled fields
- Go back if needed to edit

---

## Field Validation

### Auto-Filled Fields (Read-Only During Load)
After file selection, fields show extracted values but remain editable:

| Field | Default | Validation |
|-------|---------|-----------|
| Host | `qnap.local` | Required if QNAP selected |
| Port | `5432` | Must be numeric |
| Database | `student_management` | Required if QNAP selected |
| Username | (empty) | Required if QNAP selected |
| Password | (empty) | Required if QNAP selected |

### Backward Compatibility
- All manual entry fields remain available
- Users can still type values directly
- File selection is completely optional
- Installer works exactly as before if file not used

---

## Benefits Summary

✅ **Time Saving:** One click instead of typing 7 values  
✅ **Error Prevention:** No typos in IP addresses or credentials  
✅ **Flexibility:** Supports both JSON and ENV formats  
✅ **User Control:** Can still edit after loading  
✅ **Fallback:** Manual entry still available  
✅ **Backward Compatible:** Existing installations unaffected  

---

## Testing Checklist

- [ ] JSON file loads correctly
- [ ] ENV file loads correctly
- [ ] All 5 fields auto-populate
- [ ] Fields are editable after loading
- [ ] Manual entry still works (no file selected)
- [ ] SQLite path shows when SQLite selected
- [ ] File dialog opens and closes properly
- [ ] Cancel on file dialog returns to installer
- [ ] Error handling for missing files
- [ ] Confirmation message appears after load

---

**Status:** ✅ Ready for Production  
**Version:** v1.18.24  
**Built:** June 3, 2026
