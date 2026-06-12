# SMS Native Lite - Installation & Distribution Guide

**For IT Administrators and Deployment Teams**

---

## 📋 Before You Start

### Check System Requirements
- Windows 7 or later (tested on Windows 11 Pro)
- Disk space: 100 MB (70 MB exe + 30 MB data/database)
- RAM: 512 MB recommended (256 MB minimum)
- Network: (optional) Access to QNAP at 172.16.0.2:55433 or 77.83.249.220:55433

### Prepare Information
- QNAP credentials (if using QNAP mode):
  - Host: `77.83.249.220` (external) or `172.16.0.2` (local LAN)
  - Port: `55433`
  - User: `sms_user`
  - Password: `TestAdmin2026!`
  - Database: `student_management`

---

## 🚀 Installation Methods

### Method 1: Single PC Installation (SQLite)

**Fastest way to get started - no QNAP needed**

1. **Copy the executable**
   ```
   SMS_Native_Lite_Edition\executable\SMS_Native_Lite_Simple.exe
   → C:\Users\[YourName]\Desktop\
   → or C:\Program Files\SMS\
   → or any convenient location
   ```

2. **Run the application**
   - Double-click `SMS_Native_Lite_Simple.exe`
   - Wait 3-5 seconds for startup
   - Browser will open automatically at `http://127.0.0.1:8000`

3. **Login**
   - Email: `admin@sms-lite.app`
   - Password: `AdminPassword123!`

4. **Create users**
   - Go to Admin → Users → Create New
   - Add staff/students as needed

**That's it!** Data is stored locally on the PC.

---

### Method 2: Team Deployment (QNAP PostgreSQL)

**For multiple PCs sharing one database**

#### Step 1: Run Setup Script on First PC

1. Copy to the PC:
   ```
   SMS_Native_Lite_Edition\setup\setup_lite_qnap_remote.ps1
   SMS_Native_Lite_Edition\executable\SMS_Native_Lite_Simple.exe
   ```

2. Open PowerShell (right-click → Run as Administrator)

3. Run the setup script:
   ```powershell
   .\setup_lite_qnap_remote.ps1
   ```

4. When prompted, enter QNAP credentials:
   ```
   Host: 77.83.249.220
   Port: 55433
   User: sms_user
   Password: TestAdmin2026!
   Database: student_management
   SSL Mode: prefer
   ```

5. The script will:
   - ✅ Create credentials file
   - ✅ Set secure permissions
   - ✅ Verify configuration

#### Step 2: Launch Application

1. Run `SMS_Native_Lite_Simple.exe`
2. It will auto-connect to QNAP
3. Login with your QNAP account
4. All data syncs with main SMS admin interface

#### Step 3: Repeat for Other PCs

Simply repeat Steps 1-2 on each additional PC. Each user should:
- Run setup script individually
- Use their own username (if different)
- All will connect to the same QNAP database

---

### Method 3: Group Policy / Automated Deployment

**For IT departments managing many PCs**

#### Via Group Policy (Windows Domain)

1. **Stage the files**
   ```
   \\[domain]\shares\software\SMS\
   ├── SMS_Native_Lite_Simple.exe
   ├── setup_lite_qnap_remote.ps1
   └── qnap-credentials.json
   ```

2. **Create Group Policy**
   - Deploy exe via GP Software Installation
   - Shortcut: `C:\Program Files\SMS\SMS_Native_Lite_Simple.exe`

3. **Pre-configure credentials** (optional)
   - Create `qnap-credentials.json` with your credentials
   - Deploy to AppData via GP Preferences
   - Users just run the exe, no setup needed

#### Via Batch/Script

```batch
@echo off
REM Deploy SMS Native Lite to local machines
REM Copy exe to Program Files
copy "\\[share]\SMS_Native_Lite_Simple.exe" "C:\Program Files\SMS\" /Y

REM Copy setup script
copy "\\[share]\setup_lite_qnap_remote.ps1" "C:\Program Files\SMS\" /Y

REM Create shortcut on Desktop
powershell -Command "
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut('%UserProfile%\Desktop\SMS Lite.lnk')
$shortcut.TargetPath = 'C:\Program Files\SMS\SMS_Native_Lite_Simple.exe'
$shortcut.Save()
"

echo Deployment complete!
```

---

## 🔧 Post-Installation Configuration

### For SQLite Mode (Single PC)

✅ Already configured, no additional steps needed.

Optional: Change data location
- Default: `C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\`
- (Data stays with user profile, syncs with roaming)

### For QNAP Mode (Team)

After setup script completes:

1. **Verify connection**
   - Check log file: `%APPDATA%\SMS_Native_Lite_Simple\debug.log`
   - Should show: `DATABASE_URL=postgresql+psycopg://...@77.83.249.220:55433`

2. **Create admin user** (if first time)
   - Login as default admin: `admin@sms-lite.app` / `AdminPassword123!`
   - Go to Admin → Users → Create New
   - Add your administrator account

3. **Test connectivity**
   - Try adding a student record
   - Check main SMS admin interface
   - Record should appear there too

4. **Set up sync schedule** (optional)
   - Data syncs in real-time
   - No manual sync needed

---

## 📊 Deployment Scenarios

### Scenario 1: School Lab (10 PCs)

```
Plan:
- All PCs use SQLite mode (independent databases)
- Each teacher can use their own PC
- OR: Setup QNAP on one PC as "server" (not typical for lite)

Deploy:
1. Copy exe to each PC
2. Users login with default admin credentials
3. Each teacher creates their own user account
4. Done!

Advantage: Offline-capable, simple
Limitation: Data not shared between PCs
```

### Scenario 2: District Office (20 PCs)

```
Plan:
- All PCs connect to QNAP (shared database)
- Real-time data sync
- Same users/data as main SMS

Deploy:
1. Copy exe and setup script to all PCs
2. Run setup script on each PC
3. All PCs connect to QNAP automatically
4. Done!

Advantage: Centralized management, real-time sync
Requirement: Network access to QNAP (172.16.0.2 or 77.83.249.220)
```

### Scenario 3: Remote Offices

```
Plan:
- Remote offices connect via VPN/public IP
- Use external QNAP IP: 77.83.249.220
- All data syncs to central database

Deploy:
1. VPN access: Ensure PCs can reach 77.83.249.220:55433
2. Copy exe and setup script
3. Run setup with external IP: 77.83.249.220
4. Done!

Requirement: VPN or direct internet access to QNAP
Note: Uses SSL/TLS for secure connection
```

---

## ⚙️ Configuration Files

### qnap-credentials.json

**Location:** `%APPDATA%\SMS_Native_Lite_Simple\qnap-credentials.json`

**Format:**
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

**Permissions:** User-read-only (0600) - only the current user can read

**For IT:** Can pre-populate this file via Group Policy to avoid per-user setup

### Database Location

**SQLite mode:**
```
C:\Users\[YourName]\AppData\Local\SMS_Native_Lite_Simple\sms_lite.db
```

**QNAP mode:**
```
Hosted on QNAP server at 172.16.0.2 or 77.83.249.220
Database name: student_management
```

---

## 🔐 Security Checklist

- ✅ Credentials file permissions verified (user-read-only)
- ✅ No hardcoded passwords in exe
- ✅ QNAP connection uses SSL/TLS
- ✅ JWT tokens used for session security
- ✅ Database has audit logging
- ✅ Credentials not logged to files
- ✅ Setup scripts handle credentials securely

**Additional recommendations:**
- Use strong QNAP password (rotate quarterly)
- Monitor QNAP for unauthorized access attempts
- Backup SQLite databases (if using SQLite mode)
- Enable audit logging on QNAP

---

## 🐛 Troubleshooting

### Issue: "Port 8000 already in use"

**Cause:** Another app is using port 8000

**Solution:**
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill it
taskkill /PID [PID] /F
```

### Issue: "Connection refused" (QNAP mode)

**Cause:** PC can't reach QNAP server

**Solutions:**
1. Verify IP is correct:
   - Local: `ping 172.16.0.2` (should respond)
   - External: `ping 77.83.249.220` (should respond)

2. Check firewall:
   ```powershell
   # Allow port 55433
   netsh advfirewall firewall add rule name="QNAP PostgreSQL" dir=out action=allow protocol=tcp remoteport=55433
   ```

3. Verify QNAP is running (ask your QNAP admin)

### Issue: "Database migrations failed"

**Solution:** Check log file
```
%APPDATA%\SMS_Native_Lite_Simple\logs\migrations.log
```

**Common causes:**
- Invalid database credentials
- QNAP database doesn't exist
- QNAP PostgreSQL not running

### Issue: "Can't create user account"

**Solution:** 
- Verify you're logged in as admin
- Go to: Admin → Users → Create New
- If not visible, check your role/permissions

---

## 📈 Monitoring & Maintenance

### What to Monitor

1. **Disk usage**
   - SQLite: Monitor `sms_lite.db` file size
   - QNAP: Monitor on QNAP side

2. **User activity**
   - Audit log in SMS admin interface
   - Check "System" → "Audit Log"

3. **Errors**
   - Check `debug.log` if users report issues
   - Forward to SMS support if needed

### Regular Maintenance

1. **Weekly**
   - Verify QNAP connection (if using QNAP mode)
   - Check for unusual error patterns

2. **Monthly**
   - Backup SQLite databases (if applicable)
   - Review audit log for anomalies

3. **Quarterly**
   - Rotate QNAP password
   - Update credentials in all installations
   - Check for new SMS versions

---

## 📞 Support & Documentation

- **User Guide:** See `QUICKSTART.md`
- **Full Guide:** See `README.md`
- **QNAP Setup:** See `LITE_QNAP_SETUP.md`
- **Status Report:** See `STATUS.md`
- **Source Code:** See `docs/lite_simple_entrypoint.py`

**For Issues:**
1. Check logs: `%APPDATA%\SMS_Native_Lite_Simple\`
2. Review documentation
3. Run diagnostic script: `diagnose_migration.py`
4. Contact SMS support with logs attached

---

## ✅ Deployment Checklist

Before rolling out to users:

- [ ] Test on 2-3 sample PCs
- [ ] Verify QNAP connectivity (if using QNAP)
- [ ] Create admin accounts
- [ ] Test user login
- [ ] Verify data appears in main SMS (if using QNAP)
- [ ] Create user documentation
- [ ] Train IT support staff
- [ ] Set up help desk process
- [ ] Plan rollout schedule
- [ ] Get user acknowledgment

---

**Ready to deploy!** This installation guide covers all common scenarios. Adjust as needed for your organization.

*Last Updated: 2026-06-01*
