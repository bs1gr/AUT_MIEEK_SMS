## What's New in v1.18.78

### 📊 What's Included in v1.18.78

- **Backups and restore need a signed-in administrator, also on the PC itself.** Until now the Control Panel's backup and restore actions trusted anyone sitting at the computer the server runs on, so a teacher at an SMS Lite PC could make, download, delete or restore a backup. They now need an administrator's sign-in, as do resetting the database, loading sample data, the sign-in settings, importing database credentials and installing an update. Checking for an update stays open to everyone. Teachers no longer see the System Operations and Database Management sections of Control Panel > Maintenance.
- **A backup is made right before an update changes the database.** When a new version has database changes to apply, it first makes an encrypted backup (`pre_migration_<date>.enc`, in the usual backups folder) of the database it is about to change. If that backup fails, the change is not applied, the server says so, and the administrators get a notice in the bell. These backups are listed and restored like any other and are never removed automatically.
- **The Database Management panel's backups are encrypted.** Control Panel > Maintenance > Database Management used to write its own backups unencrypted. It now makes the same encrypted backup as Manage Backups, and shows, downloads, deletes and restores those. Backups it made in the past are encrypted where they lie, checked byte for byte, and only then is the readable copy removed. A downloaded backup opens only with the installation's key.
- **Readable copies left by older versions are removed.** Versions up to v1.18.70 could leave a readable copy of the whole SQLite database beside each encrypted backup on Windows. Such a copy is now deleted automatically, but only when its encrypted twin is there.
- **Easier to read:** the Present and Late buttons of the Attendance page, the footer, and the small text of the Dashboard cards now have enough contrast in every theme and appearance.
- **Removed, because nothing used them:** a notification channel the pages never listened to, and five unused server addresses (one of them answered without a sign-in).
- **Database:** no change of structure. Records of students, courses, grades and attendance are not touched.
- **Android app:** no change of its own; the APK is a new build with the new version number.
- **Checked before release:** the commit gate, CI and the E2E tests on every change; the full backend suite (2,075 tests passed, 43 skipped, none failed) and the frontend suite; the test installer built on this PC and its checks (it is not the one published).

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.78.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Android:** Download `SMS_Android_1.18.78.apk` and open it on the phone; it updates the installed app and keeps its settings.

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
