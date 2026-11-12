## What's New in v1.18.67

### 📊 What's Included in v1.18.67

- **New: Lesson log on the Attendance page.** For each teaching period you can write the material covered and, separately, your own teacher's notes. Both save by themselves, also when the connection drops (the text is kept on the device and sent when the server is back). A "Lesson log history" card lists a course's entries and lets you correct them. The notes are visible only to teachers and administrators.
- **Fixed: a teacher's Dashboard showed "Error loading analytics data"** and the Analytics page could not load. Teachers now have the report permissions they were always meant to have; existing databases get them automatically on the first start.
- **Fixed in SMS Lite:** some requests from the Attendance page and the admin Permissions page were answered with "Not found".
- **Database:** two additive changes are applied automatically on the first start (a new `lesson_logs` table and the teacher permissions). Older installs keep working against the same database.
- **Checked before release:** a smoke test of the source build, the packaged SMS Lite and the Docker image, each upgraded from a v1.18.66 database, on SQLite and PostgreSQL; the full backend suite (0 failed); and the packaged SMS Lite build starts, signs in, serves Greek data and PDFs, and loads the app.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.67.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes in this release
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation


