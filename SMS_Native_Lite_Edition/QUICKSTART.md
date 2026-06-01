# SMS Native Lite - Quick Start Guide

## 🚀 30-Second Start (SQLite Mode)

1. **Download/Copy** `executable/SMS_Native_Lite_Simple.exe`
2. **Double-click** it
3. **Wait** 3 seconds for startup message
4. **Browser opens** automatically at `http://127.0.0.1:8000`
5. **Login** with:
   - Email: `admin@sms-lite.app`
   - Password: `AdminPassword123!`

**Done!** Your lite SMS is running.

---

## 🌐 Setup for QNAP (Shared Database)

### Quick Setup (Windows PowerShell)

```powershell
# Download/copy setup script
.\setup\setup_lite_qnap_remote.ps1

# When prompted, enter:
# Host: 77.83.249.220 (or 172.16.0.2 if on local LAN)
# Port: 55433
# User: sms_user
# Password: TestAdmin2026!
# Database: student_management
# SSL Mode: prefer

# Restart SMS_Native_Lite_Simple.exe
# It will now use QNAP database
```

### Manual Setup (No Script)

1. Create file: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\qnap-credentials.json`

2. Copy this content (for web/external access):
```json
{
  "host": "77.83.249.220",
  "port": 55433,
  "dbname": "student_management",
  "user": "sms_user",
  "password": "TestAdmin2026!",
  "sslmode": "prefer"
}
```

3. Restart the exe

4. It will auto-connect to QNAP

---

## 👤 Create QNAP User Account

### Via Lite Admin UI (Easy)
1. Login as `admin@sms-lite.app`
2. Go to **Admin > Users > Create New**
3. Enter: `bs1gr@yahoo.com` (or any email)
4. Set password
5. Save
6. Logout and login as new user

### Via Main SMS Admin (if you have access)
1. Open main SMS admin interface
2. Go to **System > Control Panel > Maintenance > Database Management**
3. Create user there
4. It will sync to lite version automatically

---

## ❓ Common Questions

**Q: Where is my data stored?**
- SQLite mode: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\sms_lite.db`
- QNAP mode: On QNAP server at `77.83.249.220`

**Q: Can I switch from SQLite to QNAP later?**
- Yes! Just run the setup script. Your SQLite data stays but won't be used.

**Q: Is it safe?**
- Yes. Credentials are protected (only you can read them), connections use SSL/TLS, and no data is sent anywhere except to QNAP.

**Q: Can multiple people use it on the same PC?**
- Yes. Each user should run the setup script individually with their own credentials.

**Q: How do I uninstall?**
- Just delete the exe. AppData folder is optional (contains database if using SQLite).

---

## 🔗 More Help

- **Full Setup Guide:** See `docs/LITE_QNAP_SETUP.md`
- **Issues/Troubleshooting:** Check logs at `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\`
- **Rebuilding:** See `docs/lite_simple_entrypoint.py` and `.spec` file

---

## 📝 Your Credentials

### Default Admin (SQLite mode)
- Email: `admin@sms-lite.app`
- Password: `AdminPassword123!`

### QNAP Connection (when configured)
- Host: `77.83.249.220` (external) or `172.16.0.2` (local LAN)
- Port: `55433`
- Database: `student_management`
- User: `sms_user`

---

**Ready?** Just run the exe!
