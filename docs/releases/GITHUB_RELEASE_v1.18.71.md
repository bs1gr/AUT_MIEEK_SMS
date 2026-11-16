## What's New in v1.18.71

### 📊 What's Included in v1.18.71

- **The system now backs itself up.** The help said "Automated backups happen daily", but nothing did that: a backup existed only when someone made one. Every running server now makes one encrypted backup of its database a day (first a minute after it starts) and keeps the newest 30. Backups you make yourself are never removed by this. **System → Control Panel → Maintenance → System Operations → Manage Backups** shows when the last one was made and, if it failed, why. Details: [Backups and restore](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/admin/BACKUP_AND_RESTORE.md).
- **Fixed: a backup of a PostgreSQL database could not be restored through the app.** On the Docker editions "Restore" answered "success", restored nothing and set the id counters back, so the next new record collided with an existing one. From the page, an encrypted PostgreSQL backup could not be restored at all. Backups are now written in the format the app restores itself, in one step: everything is restored or nothing is changed. Tested on PostgreSQL 14, also into a new, empty database.
- **Fixed: updating a Docker install made its earlier encrypted backups unreadable.** The key that encrypts backups was kept inside the container and was lost at every update ("Failed to decrypt backup:"). It is now kept on the data volume, and in the user's profile for SMS Lite, where an encrypted backup could fail because the program folder cannot be written to. **If a Docker install of yours has encrypted backups made with an earlier version, copy its key out before you update** (`scripts/recover_master_key_from_docker.ps1`).
- **Fixed: an encrypted backup of a local (SQLite) database left a readable copy beside it on Windows.** The temporary copy was still open when it should have been deleted. If your backups folder has a `backup_….db` file with the same name as a `backup_….enc`, delete the `.db` file.
- **Fixed on the same page:** the "Backup Database" button was greyed out after any health check (one runs after every restore), the list showed `utils.created:` instead of "Created", and backup times were shown hours early when the server's clock is on UTC.
- **Faster when several things load at once.** The permission check and the endpoints behind it no longer make every other request wait. With a database 65 ms away (the cloud host), 20 simultaneous requests went from 10.8 s to 0.65 s in a measurement, and a page's 8 parallel requests from 2.9 s to 0.8 s.
- **The unused live-notification channel is removed.** Every open page held connections to a channel that never carried a message. Notifications work as before (the bell refreshes when a page opens, comes back online or becomes visible).
- **Dependencies updated** (FastAPI 0.162.5, psycopg 3.3.9, Vite 8.3.8, Capacitor 8.6.2 and about 90 more minor and patch updates); two unused development packages removed.
- **Database:** no changes in this release.
- **Android app:** rebuilt with the updated packages and without the notification-channel client. Nothing changes in how it is used.
- **Checked before release:** the commit gate, CI, the full backend suite (1539 passed, 0 failed) and the browser end-to-end tests; and a smoke test of three editions, each as an administrator and as a teacher: the server from source, the packaged SMS Lite upgraded from v1.18.70 with its data and its backup key, and the Docker image on PostgreSQL 14. In each: 26 API checks, PDF and Excel exports with Greek text, a backup, a restore after the data had been changed, and a pass through ten pages in a browser. The restore was also run after the Docker container had been replaced, and into a new, empty database. Not checked: the installer was not installed, and the Android app was not run on a device.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.71.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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


