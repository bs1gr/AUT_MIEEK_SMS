## What's New in v1.18.72

### 📊 What's Included in v1.18.72

- **Administrators are told when the daily backup fails.** A notice appears in the bell, with the reason, at most once a day while the backup keeps failing (the server tries again every hour). A click opens Maintenance, where Manage Backups shows the state. Until now a failed backup only left a line in the server's log.
- **A server can report to a monitoring service outside.** While it runs, its database answers and its backup is in order, it sends a signal at a fixed pace to a "dead man's switch" service (healthchecks.io or a similar one); when the signal stops, or a backup fails, that service tells you. It is the only way to hear that the server itself has stopped. Off unless you set `MONITOR_PING_URL`; the steps are in the [cloud runbook, "Watching the server"](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/deployment/CLOUD_HOST_ORACLE.md#watching-the-server). Only the signal leaves the server: no data and no error text.
- **Fixed: mail settings entered in the app did not last.** Updating a Docker install threw them away, and an installed SMS Lite could not save them at all ("Access is denied"). They are now kept on the data volume, and in the user's profile for SMS Lite. Settings saved by an earlier SMS Lite are carried over.
- **Fixed: on a freshly installed SMS Lite, Import/Export and the Email settings could be missing.** If the app's very first start was not made with administrator rights, that part of the app did not load and its pages showed errors. It loads now, and exports are written to a folder the app can use.
- **Fixed: the Backups list showed an error when the backups folder could not be used**, which is exactly when you need it to tell you why a backup failed.
- **If you build the Docker image yourself:** an image built from a folder that had been used carried its local databases, export files and saved settings. They are now left out. The published installer and the app on phones were never built that way.
- **Housekeeping:** five workflow files in the repository that could never run were removed.
- **Database:** no changes in this release.
- **Android app:** the new notice text; nothing else changes.
- **Checked before release:** the commit gate, CI, the full backend suite (1573 passed, 0 failed) and the browser end-to-end tests; and a smoke test of three editions, each as an administrator and as a teacher: the server from source, the packaged SMS Lite upgraded from v1.18.71 (with its data, its backup and its mail settings, and with a read-only program folder), and the Docker image on PostgreSQL 14. In each: 26 API checks, PDF and Excel exports with Greek text, an export job, a backup, a restore after the data had been changed, and a pass through ten pages in a browser. The alerts were tried on a scratch server with a stand-in for the monitoring service: the signal while all is well; and, with backups made to fail, the notice in the bell (in English and in Greek) and the failure report. Not checked: the installer was not installed, and the Android app was not run on a device.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.72.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

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


