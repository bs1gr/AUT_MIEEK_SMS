# SMS Lite Edition - User & Administrator Guide

**Version:** vvv1.18.25  
**Updated:** June 3, 2026  
**Status:** Production Ready ✅

---

## 📋 Overview

**SMS_Lite** is a standalone desktop application for the Student Management System. It's designed for individual teachers or small institutions that need a lightweight, self-contained solution without Docker.

### Key Characteristics

- **Name:** SMS_Lite.exe
- **Type:** Standalone native Windows application
- **Database:** Local SQLite (default) or optional QNAP PostgreSQL
- **Installation:** Windows Installer (SMS_Installer_X.X.X.exe)
- **Dependencies:** None (fully self-contained, no Docker required)
- **Target Users:** Individual teachers, small schools, offline-first deployment

---

## 🚀 Installation

### From Installer (Recommended)

1. **Download** `SMS_Installer_1.18.24.exe` from [GitHub Releases](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest)

2. **Run as Administrator**
   - Right-click → "Run as Administrator"
   - Windows may show "Unknown Publisher" warning (ignore - it's a self-signed cert)

3. **Select Installation Type**
   - Choose **"Lite Edition"** (standalone app)
   - Next steps shown below depend on your database choice

### Installation Steps (Lite Edition)

**Step 1: Choose Edition**
```
[ ] Docker Edition (requires Docker Desktop)
[x] Lite Edition (standalone - recommended for individual teachers)
```

**Step 2: QNAP Configuration (Optional)**
```
SMS_Lite uses a local SQLite database by default.
If you have a QNAP NAS with PostgreSQL, you can optionally configure it here.

[x] No, use local SQLite database (default - recommended)
[ ] Yes, I want to use QNAP PostgreSQL
    └─ Option A: Select credentials file (.json or .env)
       └─ [Browse...] button to select file
    └─ OR
    └─ Option B: Enter credentials manually
       └─ Host, Port, Database, Username, Password fields
```

**Step 3: Installation Complete**
- SMS_Lite.exe will be installed to `C:\Program Files (x86)\SMS-UT\`
- Desktop shortcut created: "Student Management System"
- Ready to launch on first run

---

## 🎯 Using SMS_Lite

### Starting the Application

**Desktop Shortcut (Easiest)**
- Double-click "Student Management System" shortcut on desktop
- App launches and opens in browser at http://127.0.0.1:8000

**From File Explorer**
- Navigate to: `C:\Program Files (x86)\SMS-UT\`
- Double-click: `SMS_Lite.exe`

**From Command Line**
```powershell
cd "C:\Program Files (x86)\SMS-UT\"
.\SMS_Lite.exe
```

### Default Login Credentials

```
Username: admin@sms-lite.app
Password: AdminPassword123!
```

⚠️ **Important:** Change these credentials immediately after first login!

### First-Run Setup

1. SMS_Lite.exe starts the backend server on port 8000
2. Automatically opens browser to http://127.0.0.1:8000
3. Frontend React application loads
4. Default admin account automatically created
5. Log in with credentials above
6. Change password in Settings → Account

---

## 💾 Database Options

### Option 1: Local SQLite (Default)

**What it is:**
- Embedded database stored locally on your PC
- No external setup required
- File location: `C:\Users\{username}\AppData\Local\SMS_Native_Lite_Simple\sms_lite.db`

**Best for:**
- Individual teachers
- Small classes
- Offline-first usage
- Single-user scenarios

**Limitations:**
- Data NOT shared with other PCs
- No real-time sync across devices
- Cannot access from mobile or other computers

**Advantages:**
- ✅ Zero configuration
- ✅ Works offline
- ✅ Fast local access
- ✅ Private data on your PC only

### Option 2: QNAP PostgreSQL (Optional)

**What it is:**
- Centralized database on QNAP NAS
- Shared across multiple PCs and devices
- Requires QNAP with PostgreSQL installed
- Optional - only if you have a QNAP setup

**Best for:**
- School or institution with multiple teachers
- Sharing data across multiple computers
- Centralized data management
- Backup to NAS

**Requirements:**
- QNAP NAS on network
- PostgreSQL installed on QNAP
- Network connectivity to QNAP
- QNAP IP/DNS address
- Database credentials

**How to Configure:**

1. **During Installation - Option A: Using Credentials File (Recommended)**
   - At "QNAP Configuration" step, select "Yes, I want to use QNAP PostgreSQL"
   - Click "Browse..." button
   - Select your QNAP credentials file (`.json` or `.env`)
   - Credentials are automatically loaded and filled
   - Click Next to proceed

   **Supported File Formats:**
   
   **JSON Format (.qnap-credentials.json):**
   ```json
   {
     "host": "192.168.1.100",
     "port": 5432,
     "dbname": "student_management",
     "user": "postgres",
     "password": "your_password",
     "sslmode": "prefer"
   }
   ```
   
   **ENV Format (.env):**
   ```
   POSTGRES_HOST=192.168.1.100
   POSTGRES_PORT=5432
   POSTGRES_DB=student_management
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   ```

2. **During Installation - Option B: Manual Entry (Fallback)**
   - At "QNAP Configuration" step, select "Yes, I want to use QNAP PostgreSQL"
   - Or if no credentials file selected, manually enter:
     - **Host:** QNAP IP or DNS name (e.g., `192.168.1.100` or `qnap.local`)
     - **Port:** PostgreSQL port (default: `5432`)
     - **Database:** Database name (e.g., `student_management`)
     - **Username:** QNAP PostgreSQL user
     - **Password:** User password

2. **After Installation** (Manual Configuration)
   - If you skipped QNAP setup, you can add it later:
   - Edit file: `C:\Users\{username}\AppData\Local\SMS_Native_Lite_Simple\local-secrets\qnap-credentials.json`
   - Add your QNAP credentials:
     ```json
     {
       "host": "192.168.1.100",
       "port": 5432,
       "dbname": "student_management",
       "user": "your_qnap_user",
       "password": "your_qnap_password",
       "sslmode": "prefer"
     }
     ```
   - Restart SMS_Lite.exe

3. **Verify Connection**
   - After SMS_Lite.exe starts, check: `debug.log` in AppData
   - Should show: `DATABASE_URL=postgresql://...` (not sqlite)
   - If connection fails, falls back to SQLite automatically

---

## 📁 Data Storage Locations

### Application Files
```
C:\Program Files (x86)\SMS-UT\
├── SMS_Lite.exe (main application)
├── frontend/ (React web app)
├── backend/ (Python API)
└── docker/ (Docker config - for reference only)
```

### User Data & Configuration
```
C:\Users\{username}\AppData\Local\SMS_Native_Lite_Simple\
├── sms_lite.db (SQLite database - LOCAL MODE)
├── local-secrets/
│   └── qnap-credentials.json (QNAP config - if using QNAP mode)
├── logs/
│   ├── debug.log (startup & runtime logs)
│   └── sms.log (activity logs)
├── migrations.log (database migrations)
└── (other runtime data)
```

### Backup Location
```
C:\Program Files (x86)\SMS-UT\backups\
└── pre_upgrade_X.X.X/ (automatic pre-upgrade backups)
```

---

## 🔧 Troubleshooting

### Problem: SMS_Lite.exe shows version vvv1.18.25 instead of vvv1.18.25

**Solution:**
- Uninstall SMS_Lite completely
- Delete: `C:\Users\{username}\AppData\Local\SMS_Native_Lite_Simple\`
- Reinstall with latest installer (SMS_Installer_1.18.24.exe)

### Problem: "Cannot connect to QNAP"

**Check:**
1. QNAP is powered on and reachable on network
2. PostgreSQL is running on QNAP (verify via QNAP admin panel)
3. Credentials in `qnap-credentials.json` are correct
4. Network connectivity (ping QNAP host)

**Debug:**
- Open `C:\Users\{username}\AppData\Local\SMS_Native_Lite_Simple\debug.log`
- Look for error messages about database connection
- App will fall back to SQLite if QNAP fails

**Fix:**
- Correct credentials in `qnap-credentials.json`
- Restart SMS_Lite.exe
- Check logs again

### Problem: SMS_Lite.exe won't start

**Try:**
1. Check Windows Event Viewer for error details
2. Verify no other app is using port 8000
3. Reinstall from installer
4. Contact support with `debug.log` contents

### Problem: Data lost after uninstall

**Prevention:**
- Always use "Keep data" option in uninstaller
- Manual backup: Copy `sms_lite.db` from AppData before uninstalling

**If data is lost:**
- Check: `C:\Program Files (x86)\SMS-UT\backups/` for auto-backups
- Restore from manual backup if you created one
- Contact support for data recovery options

---

## 🔄 Updating SMS_Lite

### Automatic Update (When Available)

1. SMS_Lite checks for updates on startup
2. If newer version available, notification appears in app
3. Click "Update" to download and install
4. App restarts with new version

### Manual Update

1. **Download** latest installer from [GitHub Releases](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest)
2. **Run** SMS_Installer_X.X.X.exe as Administrator
3. **Choose** "Upgrade existing installation"
4. Data is automatically backed up before upgrade
5. SMS_Lite restarts with new version

### Update Behavior

- ✅ **Data Preserved:** SQLite database, QNAP credentials, user data
- ✅ **Configuration Preserved:** Custom settings, accounts
- ✅ **Automatic Backup:** Previous version backed up to `backups/`
- ✅ **Zero Downtime:** Seamless upgrade process

---

## 🆘 Getting Help

### Diagnostics

**Collect this information before contacting support:**

1. **Version Number**
   - In app: Settings → About (shows vvv1.18.25 or similar)

2. **Debug Log**
   - File: `C:\Users\{username}\AppData\Local\SMS_Native_Lite_Simple\debug.log`
   - Attach last 100 lines to support request

3. **System Info**
   - Windows version (Settings → System → About)
   - Available disk space
   - RAM available

4. **Database Mode**
   - SQLite or QNAP?
   - If QNAP: Can you ping the QNAP host?

### Support Channels

- **GitHub Issues:** https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- **Documentation:** [Full Project Docs](../../README.md)

---

## 🔐 Security & Privacy

### Data Location

- **SQLite Mode:** All data stored locally on your PC only
- **QNAP Mode:** Data sent to centralized QNAP server
- **No Cloud:** Data never leaves your premises

### Database Credentials

- **SQLite:** No credentials needed (local file)
- **QNAP:** Credentials stored in `local-secrets/qnap-credentials.json` (local file only)
- **Never Transmitted:** Credentials not sent to cloud or external services

### Password Management

- **Admin Account:** Change immediately after first login
- **Student Passwords:** Follow GDPR/local data protection regulations
- **Backups:** Encrypted if backed up to QNAP

---

## 📊 Comparing Installation Types

| Feature | Lite Edition | Docker Edition |
|---------|--------------|----------------|
| **Setup Time** | 2 minutes | 10-15 minutes (Docker build) |
| **Docker Required** | ❌ No | ✅ Yes |
| **Default Database** | SQLite (local) | QNAP PostgreSQL |
| **Optional QNAP** | ✅ Yes | Already required |
| **Offline Usage** | ✅ Full | ❌ No (needs Docker) |
| **Multiple Teachers** | Possible (share files) | ✅ Recommended |
| **File Size** | ~70 MB | ~25-30 MB installer |
| **Target User** | Individual teacher | School/Institution |
| **Data Sharing** | Manual | Central QNAP |

---

## 📝 Version History

### vvv1.18.25 (June 3, 2026)
- ✅ **Fixed:** Lite Edition QNAP Configuration page added
- ✅ **New:** Users can enter QNAP credentials during installation
- ✅ **Improved:** Proper version string in application
- ✅ **Enhanced:** Diagnostic logging for troubleshooting

### vvv1.18.25 (May 2026)
- Initial Lite Edition release
- SQLite and QNAP support

---

## 📚 Related Documentation

- **Main README:** [README.md](../../README.md)
- **Installer Guide:** [installer/README.md](../installer/README.md)
- **QNAP Setup:** [QNAP_POSTGRES_SINGLE_SOURCE.md](QNAP_POSTGRES_SINGLE_SOURCE.md)
- **Database Guide:** [QNAP_RECONCILE_RUNBOOK.md](QNAP_RECONCILE_RUNBOOK.md)
- **Deployment:** [Installation Guide](../../DEPLOY_ON_NEW_PC.md)

---

**Maintained by:** ΜΙΕΕΚ Development Team  
**Last Updated:** June 3, 2026  
**License:** See [LICENSE](../../LICENSE) file



