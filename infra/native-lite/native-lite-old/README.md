# SMS Native Lite Edition

**Headless standalone desktop app** - FastAPI backend + React frontend, no dependencies required.

## 📁 Folder Structure

```
SMS_Native_Lite_Edition/
├── README.md                           # This file
├── executable/
│   └── SMS_Native_Lite_Simple.exe     # Ready-to-run executable (68 MB)
├── setup/
│   ├── setup_lite_qnap.ps1            # Setup script (dev PC with source)
│   └── setup_lite_qnap_remote.ps1     # Setup script (remote PC, no source)
├── docs/
│   ├── LITE_QNAP_SETUP.md             # Complete setup guide
│   ├── lite_simple_entrypoint.py      # Source code (reference)
│   └── lite_simple_entrypoint.spec    # PyInstaller config (for rebuilding)
└── examples/
    └── qnap-credentials-example.env   # Example credentials file
```

## 🚀 Quick Start

### Option 1: SQLite Mode (Default - No Setup)
1. Download `executable/SMS_Native_Lite_Simple.exe`
2. Double-click to run
3. Wait for browser to open at `http://127.0.0.1:8000`
4. Login with:
   - **Email:** `admin@sms-lite.app`
   - **Password:** `AdminPassword123!`

**Data is stored locally** in `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\sms_lite.db`

---

### Option 2: QNAP PostgreSQL Mode (Shared Database)
For remote access or to share data with the main SMS admin interface.

#### On the Development PC:
```powershell
cd SMS_Native_Lite_Edition\setup
.\setup_lite_qnap.ps1
```

#### On a Remote PC (without source code):
1. Copy `setup_lite_qnap_remote.ps1` to the remote PC
2. Run it:
   ```powershell
   .\setup_lite_qnap_remote.ps1
   ```
3. Enter QNAP credentials when prompted (see **LITE_QNAP_SETUP.md**)

#### Then:
1. Restart `SMS_Native_Lite_Simple.exe`
2. It will auto-connect to QNAP PostgreSQL
3. Login with QNAP user account (same as main app)

---

## 📋 Features

✅ **Standalone** - No installation, no dependencies, just run the exe
✅ **Headless** - FastAPI + React, no PyWebView, no external services
✅ **Local** - SQLite mode stores all data locally on your PC
✅ **Remote** - QNAP mode connects to central database for team collaboration
✅ **Secure** - Credentials file protected with user-only access (0600)
✅ **Cross-Platform Compatible** - Same database as main SMS admin interface

---

## 🔐 Security

- **Standalone**: Data is local, encrypted by Windows
- **QNAP Mode**: Credentials stored securely in `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\qnap-credentials.json` (user-read-only)
- **Connection**: Uses SSL/TLS for QNAP remote access
- **No internet**: App runs locally, doesn't phone home

---

## 📖 Documentation

- **LITE_QNAP_SETUP.md** - Complete setup guide for QNAP mode
  - Local LAN access (`172.16.0.2:55433`)
  - External/Web access (`77.83.249.220:55433`)
  - Troubleshooting
  - Security notes

---

## 🛠️ Troubleshooting

### Login failed
- Check debug log: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\debug.log`
- Make sure app has access to QNAP (if using QNAP mode)

### Migrations failed
- Check migration log: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\logs\migrations.log`
- Fallback schema creation is enabled - should work even if migrations are partially broken

### Connection refused
- If using QNAP: Check host IP is correct (local: 172.16.0.2, external: 77.83.249.220)
- If using SQLite: Check disk space and permissions

### Performance issues
- SQLite mode: Suitable for small teams, single PC
- QNAP mode: Better for multiple PCs or large databases

---

## 📊 System Requirements

- **Windows 7+** (tested on Windows 11 Pro)
- **Disk Space:** 70 MB for exe + database
- **RAM:** 256 MB minimum, 512 MB recommended
- **Network:** (QNAP mode only) Access to QNAP at 172.16.0.2 or 77.83.249.220

---

## 🔄 Switching Databases

### Switch from SQLite to QNAP
1. Run setup script: `setup_lite_qnap_remote.ps1`
2. Restart the exe
3. Old SQLite data remains in `%APPDATA%\SMS_Native_Lite_Simple\sms_lite.db` (not deleted)

### Switch from QNAP to SQLite
1. Delete credentials file: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\qnap-credentials.json`
2. Restart the exe
3. It will fall back to SQLite

---

## 👥 Multi-User Setup

Each user on the PC should:
1. Run the setup script individually (as themselves)
2. Enter QNAP credentials when prompted
3. Their credentials file will be created in their own AppData folder

Each user's session will connect independently to QNAP.

---

## 🔧 Advanced: Rebuilding from Source

If you need to rebuild the exe:

1. Have Python 3.13+ and the source code
2. Copy `lite_simple_entrypoint.spec` to `backend/`
3. Copy `lite_simple_entrypoint.py` to `backend/`
4. Run:
   ```powershell
   python -m PyInstaller backend/lite_simple_entrypoint.spec --noconfirm
   ```
5. New exe will be in `dist/SMS_Native_Lite_Simple.exe`

---

## 📝 Version Info

- **Version:** 1.18.24 (v1.18.24)
- **Build Date:** 2026-06-01
- **Base:** FastAPI + SQLAlchemy + React
- **Database:** SQLite (local) or PostgreSQL (remote)

---

## 📞 Support

For issues:
1. Check logs in `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\`
2. Read **LITE_QNAP_SETUP.md** for setup issues
3. Review source code in `docs/` folder for implementation details

---

## 📜 License

Same as main SMS application.

---

**Ready to use!** Just run `executable/SMS_Native_Lite_Simple.exe` and get started.
