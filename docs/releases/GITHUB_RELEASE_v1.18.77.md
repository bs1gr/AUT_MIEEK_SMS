## What's New in v1.18.77

### 📊 What's Included in v1.18.77

- **The health check no longer holds up the server.** Docker asks the server every 30 seconds whether it is healthy. That check did its database work in a way that made every other request wait until it was done: on the cloud server (where each database question takes about 65 ms) it was 96 per cent of all the server's request time, and each one held everything else up for about 0.7 s. It now runs beside the other requests. Measured on the cloud server, where this code has run since 20 November: with 15 health checks at once, the quick liveness check answered within 0.33 s instead of waiting up to 13 s, and the 15 checks finished in under 2 s instead of up to 13.6 s.
- **An unused developer tool is gone:** an import checker under `scripts/utils/validators/` that looked for a folder the project no longer has. Nothing in the application used it.
- **Database:** no change. Records of students, courses, grades and attendance are not touched.
- **Android app:** no change of its own; the APK is a new build with the new version number.
- **Checked before release:** the commit gate and CI on every change; the full backend suite (1,997 tests passed, 43 skipped, none failed) and the frontend suite; the changed health checks with a database stand-in that answers slowly (four of the six new tests fail on the previous code); and the same code on the cloud server against the real database since 20 November 2026, 07:54 UTC.
- **Known, and not new:** the copy the installer makes before an update does not include the database.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.77.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Android:** Download `SMS_Android_1.18.77.apk` and open it on the phone; it updates the installed app and keeps its settings.

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
