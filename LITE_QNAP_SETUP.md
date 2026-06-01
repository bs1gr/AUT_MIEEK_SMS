# SMS Native Lite - QNAP PostgreSQL Setup Guide

## Overview

The SMS Native Lite edition can run in two modes:

1. **SQLite Mode** (default) - Local database on each PC, no connection to QNAP
2. **QNAP Mode** - Connects to your central QNAP PostgreSQL database

This guide shows how to configure **QNAP Mode** so the lite edition uses the same database as your main admin interface.

---

## Quick Setup (Local PC with Source Code)

If you're on the **development PC** where you have the source code:

```powershell
cd D:\SMS\student-management-system
.\setup_lite_qnap.ps1
```

This will:
- ✅ Read credentials from `local-secrets/qnap-credentials.json`
- ✅ Copy to `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\`
- ✅ Set secure file permissions (user-only access)
- ✅ Verify configuration

Then restart `SMS_Native_Lite_Simple.exe` and it will connect to QNAP.

---

## Setup on Remote PC (Without Source Code)

If you're installing on a **different PC** (like bs1gr) that doesn't have the source code:

### Option A: Interactive Setup (Recommended)

1. Copy `setup_lite_qnap_remote.ps1` to the remote PC
2. Run it:
   ```powershell
   .\setup_lite_qnap_remote.ps1
   ```
3. Enter your QNAP credentials when prompted:
   - Host: `172.16.0.2`
   - Port: `55433`
   - User: `sms_user`
   - Password: `TestAdmin2026!`
   - Database: `student_management`
   - SSL Mode: `disable`

### Option B: Pre-Made Credentials JSON

If you want to pre-configure credentials:

1. Create a JSON file on the remote PC with your QNAP credentials
2. Run the script with the JSON:
   ```powershell
   $json = Get-Content "path\to\qnap-credentials.json" -Raw
   .\setup_lite_qnap_remote.ps1 -CredentialsJson $json
   ```

---

## Manual Setup (No Scripts)

If you prefer to configure manually:

### Step 1: Create Credentials File

On your PC, create: `C:\Users\bs1gr\AppData\Local\SMS_Native_Lite_Simple\qnap-credentials.json`

**Content:**
```json
{
  "host": "172.16.0.2",
  "port": 55433,
  "dbname": "student_management",
  "user": "sms_user",
  "password": "TestAdmin2026!",
  "sslmode": "disable"
}
```

### Step 2: Set File Permissions

Right-click the file → Properties → Security → Edit:
- Remove all users except yourself
- Grant yourself "Read" and "Write" only
- Apply

### Step 3: Restart the Exe

Close and restart `SMS_Native_Lite_Simple.exe`. It will auto-detect the credentials file and connect to QNAP.

---

## Verify Connection

After restarting the exe, check the debug log:

**Log file:** `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\debug.log`

**Look for:**
```
[lite_simple_entrypoint] DATABASE_URL=postgresql+psycopg://sms_user:...@172.16.0.2:55433/student_management
```

If you see `sqlite:///` instead, the credentials file wasn't found.

---

## Login with QNAP Account

Once connected to QNAP:

1. **First login:** Use default admin
   - Email: `admin@sms-lite.app`
   - Password: `AdminPassword123!`

2. **Create QNAP users:** Go to Admin > Users > Create New User
   - Add: `bs1gr@yahoo.com` (or any other user)

3. **Login with new account:**
   - Email: `bs1gr@yahoo.com`
   - Password: (what you set when creating the user)

**All users and data are shared** with your main admin interface!

---

## Security Notes

### Credentials File Security

✅ **File is protected:**
- Located in `C:\Users\[YourName]\AppData\Local\` (Windows standard)
- Permissions set to user-only read/write (0600)
- Other users on this PC cannot read it
- Not transmitted or logged (kept in memory only during startup)

✅ **Database connection is encrypted:**
- Uses PostgreSQL with optional SSL/TLS support
- Password is only kept in memory during app lifetime

### Best Practices

1. **Don't share credentials files** - Each user should run setup individually
2. **Use strong database passwords** - The main database password should be strong
3. **Monitor access** - Only run the lite app on trusted PCs
4. **Backup credentials** - If you lose the credentials file, you can re-run the setup script

---

## Troubleshooting

### "Credentials file not found"
- Make sure the file is at: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\qnap-credentials.json`
- Check debug log for the expected path

### "Connection refused to QNAP"
- Verify host/port are correct: `172.16.0.2:55433`
- Check if QNAP is reachable: `ping 172.16.0.2`
- Verify database credentials with your admin

### "Database migrations failed"
- Check debug log for details
- Make sure the QNAP database exists and is accessible
- Try running migrations from the main admin interface first

### "File permissions error"
- Make sure you're running PowerShell as the **same user** who will run the exe
- Check file ACLs: Right-click → Properties → Security

---

## Scripts Available

### `setup_lite_qnap.ps1`
- Use on the **development PC** with source code
- Reads credentials from `local-secrets/qnap-credentials.json`
- Copies securely to AppData

### `setup_lite_qnap_remote.ps1`
- Use on **remote PCs** without source code
- Interactive credential entry
- Can be run standalone

---

## FAQ

**Q: Can I use SQLite and QNAP at the same time?**  
A: No, each PC uses either SQLite (local) or QNAP (remote). Choose one.

**Q: How do I switch back to SQLite?**  
A: Delete the credentials file and restart the exe:
```powershell
Remove-Item "$env:APPDATA\SMS_Native_Lite_Simple\qnap-credentials.json"
```

**Q: Will my lite version data sync with the main app?**  
A: Yes! Once connected to QNAP, both use the same database. All data is synchronized in real-time.

**Q: Can multiple people use the lite version on the same PC?**  
A: Each user should run `setup_lite_qnap_remote.ps1` individually with their own credentials file.

**Q: Is this secure?**  
A: Yes. Credentials are file-protected (0600), not logged, and kept in memory only during startup.

---

## Support

For issues, check:
1. Debug log: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\debug.log`
2. Migration log: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\logs\migrations.log`
3. Credentials file exists and is readable

Share the logs if you need help troubleshooting.
